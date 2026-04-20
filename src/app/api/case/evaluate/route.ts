import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

const SYSTEM_PROMPT = `Ты — профессор ветеринарной медицины, проверяющий ответы студента на клинический случай. Ты даёшь конструктивную обратную связь.

КРИТИЧЕСКИ ВАЖНО: ВСЕ тексты в ответе должны быть ТОЛЬКО на русском языке. ЗАПРЕЩЕНО использовать английские слова, даже медицинские термины. Пиши по-русски: не "CBC" — "ОАК", не "X-ray" — "рентгенография", не "ultrasound" — "УЗИ", не "findings" — "результаты", не "reveals" — "показывает", не "treatment" — "лечение", не "diagnosis" — "диагноз", не "patient" — "пациент". Если напишешь хоть одно английское слово — это ошибка.

Для каждого вопроса:
1. Укажи, правильный ли ответ
2. Если нет — объясни, почему выбранный ответ неверный
3. Объясни, почему правильный ответ является лучшим
4. Приведи дополнительную информацию по теме

ФОРМАТ ОТВЕТА — строго JSON:
{
  "score": 75,
  "totalQuestions": 5,
  "correctAnswers": 3,
  "feedback": [
    {
      "questionIndex": 0,
      "correct": true,
      "studentAnswer": "Ответ студента на русском",
      "correctAnswer": "Правильный ответ на русском",
      "explanation": "Подробное объяснение на русском..."
    }
  ],
  "overallFeedback": "Общая оценка и рекомендации на русском...",
  "keyTakeaways": ["Главный вывод 1 на русском", "Главный вывод 2 на русском"],
  "xpEarned": 50
}

Верни ТОЛЬКО JSON, без markdown. Весь текст — ТОЛЬКО на русском языке.`;

// --- Multi-strategy JSON extraction (same as generate) ---

function tryDirectParse(text: string): unknown | null {
  try { return JSON.parse(text); } catch { return null; }
}

function tryStripMarkdownFences(text: string): unknown | null {
  try {
    let cleaned = text
      .replace(/^```(?:json|JSON)?\s*\n?/gm, '')
      .replace(/\n?```\s*$/gm, '')
      .replace(/^```\s*/gm, '')
      .trim();
    if (cleaned !== text) return JSON.parse(cleaned);
  } catch { /* fall through */ }
  return null;
}

function tryRegexExtract(text: string): unknown | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* fall through */ }
  }
  return null;
}

function tryFixCommonIssues(text: string): unknown | null {
  try {
    let jsonStr = text;
    const match = text.match(/\{[\s\S]*\}/);
    if (match) jsonStr = match[0];
    let fixed = jsonStr.replace(/,\s*([}\]])/g, '$1').replace(/(?<![\\])'/g, '"');
    return JSON.parse(fixed);
  } catch { return null; }
}

function extractJSON(text: string): unknown | null {
  const strategies = [tryDirectParse, tryStripMarkdownFences, tryRegexExtract, tryFixCommonIssues];
  for (const strategy of strategies) {
    const result = strategy(text);
    if (result !== null) return result;
  }
  return null;
}

// --- Evaluation structure validation ---

interface FeedbackItem {
  questionIndex: number;
  correct: boolean;
  studentAnswer: string;
  correctAnswer: string;
  explanation: string;
}

interface Evaluation {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  feedback: FeedbackItem[];
  overallFeedback: string;
  keyTakeaways: string[];
  xpEarned: number;
}

function buildFallbackEvaluation(
  clinicalCase: any,
  answers: (number | null)[]
): Evaluation {
  const questions = Array.isArray(clinicalCase?.questions) ? clinicalCase.questions : [];
  const safeAnswers = Array.isArray(answers) ? answers : [];

  const correctCount = safeAnswers.filter(
    (a: number | null, i: number) => a !== null && a === questions[i]?.correctIndex
  ).length;

  const feedback: FeedbackItem[] = questions.map(
    (q: any, i: number) => ({
      questionIndex: i,
      correct: safeAnswers[i] === q?.correctIndex,
      studentAnswer: q?.options?.[safeAnswers[i]] ?? 'Не ответил',
      correctAnswer: q?.options?.[q?.correctIndex] ?? 'Не указан',
      explanation: q?.explanation || 'Объяснение недоступно.',
    })
  );

  return {
    score: questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0,
    totalQuestions: questions.length,
    correctAnswers: correctCount,
    feedback,
    overallFeedback: `Правильных ответов: ${correctCount} из ${questions.length}`,
    keyTakeaways: [],
    xpEarned: correctCount * 20,
  };
}

function validateEvaluation(data: any, clinicalCase: any, answers: (number | null)[]): Evaluation {
  const e = data as any;

  // Ensure feedback is a valid array
  if (!Array.isArray(e.feedback) || e.feedback.length === 0) {
    console.error('[case/evaluate] Validation: feedback is not a valid array, using fallback evaluation');
    return buildFallbackEvaluation(clinicalCase, answers);
  }

  // Ensure numeric fields
  if (typeof e.score !== 'number') e.score = 0;
  if (typeof e.totalQuestions !== 'number') e.totalQuestions = e.feedback.length;
  if (typeof e.correctAnswers !== 'number') e.correctAnswers = e.feedback.filter((f: any) => f.correct).length;
  if (typeof e.xpEarned !== 'number') e.xpEarned = e.correctAnswers * 20;
  if (!e.overallFeedback || typeof e.overallFeedback !== 'string') {
    e.overallFeedback = `Правильных ответов: ${e.correctAnswers} из ${e.totalQuestions}`;
  }
  if (!Array.isArray(e.keyTakeaways)) e.keyTakeaways = [];

  // Validate each feedback item
  e.feedback = e.feedback.map((fb: any, i: number) => ({
    questionIndex: typeof fb.questionIndex === 'number' ? fb.questionIndex : i,
    correct: !!fb.correct,
    studentAnswer: typeof fb.studentAnswer === 'string' ? fb.studentAnswer : 'Не ответил',
    correctAnswer: typeof fb.correctAnswer === 'string' ? fb.correctAnswer : 'Не указан',
    explanation: typeof fb.explanation === 'string' ? fb.explanation : 'Объяснение недоступно.',
  }));

  return e as Evaluation;
}

// --- Main handler ---

export async function POST(req: NextRequest) {
  try {
    const { case: clinicalCase, answers } = await req.json();

    if (!clinicalCase || !answers) {
      return NextResponse.json(
        { error: 'Укажите кейс и ответы' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    const userPrompt = `Проверь ответы студента на клинический случай.

Клинический случай: "${clinicalCase.title}"
Вид: ${clinicalCase.species}
Описание: ${clinicalCase.presentation}
Анамнез: ${clinicalCase.history}
Осмотр: ${clinicalCase.examination}

Ответы студента:
${clinicalCase.questions
  .map(
    (q: { question: string; options: string[]; correctIndex: number }, i: number) =>
      `Вопрос ${i + 1}: "${q.question}"
Варианты: ${q.options.map((o: string, j: number) => `${['А', 'Б', 'В', 'Г'][j]}) ${o}`).join('; ')}
Ответ студента: ${['А', 'Б', 'В', 'Г'][answers[i]]} - "${q.options[answers[i]] || 'Не ответил'}"
Правильный ответ: ${['А', 'Б', 'В', 'Г'][q.correctIndex]} - "${q.options[q.correctIndex]}"
Объяснение из кейса: "${q.explanation}"`
  )
  .join('\n\n---\n\n')}

Дай детальную обратную связь по каждому ответу. Будь конструктивным и обучающим.`;

    // --- AI call with response_format attempt ---
    let responseText = '';

    try {
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        thinking: { type: 'disabled' },
        response_format: { type: 'json_object' } as any,
      });
      responseText = completion.choices[0]?.message?.content || '';
    } catch (formatError) {
      // response_format might not be supported, retry without it
      console.warn('[case/evaluate] response_format not supported, retrying without it:', formatError);
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        thinking: { type: 'disabled' },
      });
      responseText = completion.choices[0]?.message?.content || '';
    }

    // --- Multi-strategy JSON extraction ---
    let parsed: unknown = extractJSON(responseText);

    let evaluation: Evaluation;

    if (parsed === null) {
      console.error('[case/evaluate] All JSON parsing strategies failed. Using fallback evaluation.');
      console.error('[case/evaluate] RAW RESPONSE TEXT:', responseText.substring(0, 1000));
      evaluation = buildFallbackEvaluation(clinicalCase, answers);
    } else {
      evaluation = validateEvaluation(parsed, clinicalCase, answers);
    }

    return NextResponse.json({
      success: true,
      ...evaluation,
    });
  } catch (error) {
    console.error('[case/evaluate] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Ошибка при проверке ответов' },
      { status: 500 }
    );
  }
}
