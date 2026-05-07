import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { extractJSON } from '@/lib/json-utils';

const SYSTEM_PROMPT = `Ты — профессор ветеринарной медицины, проверяющий ответы студента на клинический случай. Ты даёшь конструктивную обратную связь.

КРИТИЧЕСКИ ВАЖНО: ВСЕ тексты в ответе должны быть ТОЛЬКО на русском языке.

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
    (q: any, i: number) => {
      const ansIdx = safeAnswers[i];
      return {
        questionIndex: i,
        correct: ansIdx !== null && ansIdx === q?.correctIndex,
        studentAnswer: ansIdx !== null && q?.options?.[ansIdx] ? q.options[ansIdx] : 'Не ответил',
        correctAnswer: q?.options?.[q?.correctIndex] ?? 'Не указан',
        explanation: q?.explanation || 'Объяснение недоступно.',
      };
    }
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

    // --- Payload size validation ---
    const MAX_RESPONSE_SIZE = 100 * 1024; // 100 KB
    if (JSON.stringify({ clinicalCase, answers }).length > MAX_RESPONSE_SIZE) {
      return NextResponse.json(
        { error: 'Данные ответа слишком большие (максимум 100 КБ)' },
        { status: 413 }
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
    (q: { question: string; options: string[]; correctIndex: number; explanation?: string }, i: number) =>
      `Вопрос ${i + 1}: "${q.question}"
Варианты: ${q.options.map((o: string, j: number) => `${['А', 'Б', 'В', 'Г'][j]}) ${o}`).join('; ')}
Ответ студента: ${['А', 'Б', 'В', 'Г'][answers[i]]} - "${q.options[answers[i]] || 'Не ответил'}"
Правильный ответ: ${['А', 'Б', 'В', 'Г'][q.correctIndex]} - "${q.options[q.correctIndex]}"
${q.explanation ? `Объяснение из кейса: "${q.explanation}"` : ''}`
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
