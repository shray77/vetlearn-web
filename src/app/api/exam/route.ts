import { NextRequest, NextResponse } from 'next/server';
import { getZAI } from '@/lib/zai';
import { extractJSON } from '@/lib/json-utils';

// ==================== System prompts ====================

const EXAM_START_PROMPT = `Ты — строгий, но справедливый экзаменатор по ветеринарной медицине. Ты проводишь устный экзамен у студента ветеринарного вуза.

КРИТИЧЕСКИ ВАЖНО: Все тексты в ответе должны быть ТОЛЬКО на русском языке.

Твой стиль:
- Профессиональный и уважительный
- Задаёшь развёрнутые вопросы, требующие развёрнутых ответов
- Не задаёшь вопросы с вариантами ответов — студент отвечает свободным текстом
- Вопросы должны быть практическими и clinically-oriented
- Включаешь вопросы разного типа: диагностика, лечение, анатомия, фармакология, патология

ФОРМАТ ОТВЕТА — строго JSON:
{
  "firstQuestion": {
    "id": "q1",
    "text": "Текст первого вопроса на русском языке",
    "hints": ["Подсказка 1", "Подсказка 2"]
  },
  "examPlan": "Краткое описание плана экзамена на русском"
}

Верни ТОЛЬКО JSON, без markdown.`;

const EXAM_ANSWER_PROMPT = `Ты — строгий, но справедливый экзаменатор по ветеринарной медицине. Ты проверяешь ответ студента на экзамене.

КРИТИЧЕСКИ ВАЖНО: Все тексты в ответе должны быть ТОЛЬКО на русском языке.

Критерии оценивания:
- Оценивай содержательность ответа (наличие ключевых понятий)
- 10 баллов — полный и точный ответ с деталями
- 7-9 баллов — правильный ответ, но не хватает деталей
- 4-6 баллов — частично правильный ответ, есть существенные пробелы
- 1-3 балла — ответ в целом неверный, но есть зачатки понимания
- 0 баллов — ответ отсутствует или полностью неверный

После оценки:
- Дай краткое объяснение, что было верно, а что нет
- Если ответ частично правильный (score 4-6), задай дополнительный вопрос в followUp
- Иначе followUp = null

ФОРМАТ ОТВЕТА — строго JSON:
{
  "feedback": {
    "correct": true,
    "score": 8,
    "explanation": "Объяснение проверки на русском...",
    "followUp": "Дополнительный вопрос (null если не нужен)"
  },
  "nextQuestion": {
    "id": "q2",
    "text": "Текст следующего вопроса",
    "hints": ["Подсказка 1", "Подсказка 2"]
  }
}

Верни ТОЛЬКО JSON, без markdown.`;

const EXAM_FINAL_PROMPT = `Ты — строгий, но справедливый экзаменатор по ветеринарной медицине. Экзамен завершён. Подведи итоги.

КРИТИЧЕСКИ ВАЖНО: Все тексты в ответе должны быть ТОЛЬКО на русском языке.

ФОРМАТ ОТВЕТА — строго JSON:
{
  "feedback": {
    "correct": true,
    "score": 8,
    "explanation": "Объяснение проверки последнего ответа...",
    "followUp": null
  },
  "results": {
    "overallScore": 75,
    "grade": "Хорошо",
    "summary": "Общая характеристика ответов студента...",
    "strengths": ["Сила 1", "Сила 2"],
    "weaknesses": ["Слабость 1", "Слабость 2"],
    "recommendations": ["Рекомендация 1", "Рекомендация 2"]
  }
}

Оценки:
- "Отлично" при overallScore >= 90
- "Хорошо" при overallScore >= 75
- "Удовлетворительно" при overallScore >= 60
- "Неудовлетворительно" при overallScore < 60

Верни ТОЛЬКО JSON, без markdown.`;

// ==================== Difficulty labels ====================

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'начинающий',
  intermediate: 'средний',
  advanced: 'продвинутый',
};

// ==================== Main handler ====================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (!action || !['start', 'answer'].includes(action)) {
      return NextResponse.json(
        { error: 'Укажите действие: start или answer' },
        { status: 400 }
      );
    }

    if (action === 'start') {
      return handleStart(body);
    } else {
      return handleAnswer(body);
    }
  } catch (error) {
    console.error('[exam] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Ошибка при проведении экзамена' },
      { status: 500 }
    );
  }
}

// ==================== Start exam ====================

async function handleStart(body: {
  topics?: string[];
  difficulty?: string;
  questionCount?: number;
}) {
  const { topics = [], difficulty = 'intermediate', questionCount = 10 } = body;

  if (topics.length === 0) {
    return NextResponse.json(
      { error: 'Выберите хотя бы одну тему' },
      { status: 400 }
    );
  }

  const zai = await getZAI();
  const difficultyLabel = DIFFICULTY_LABELS[difficulty] || difficulty;

  const userPrompt = `Начни экзамен.

Темы: ${topics.join(', ')}
Сложность: ${difficultyLabel}
Количество вопросов: ${questionCount}

Задай первый вопрос. Вопрос должен требовать развёрнутого ответа (не тестовый). Выбери тему для первого вопроса из списка тем.`;

  let responseText = '';
  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: EXAM_START_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 4096,
  });
  responseText = completion.choices[0]?.message?.content || '';

  const parsed = extractJSON(responseText);
  if (!parsed || typeof parsed !== 'object') {
    console.error('[exam/start] JSON parse failed. RAW:', responseText.substring(0, 500));
    return NextResponse.json(
      { error: 'Не удалось сгенерировать вопрос' },
      { status: 500 }
    );
  }

  const data = parsed as any;
  const examId = `exam_${Date.now()}`;

  // Validate and provide fallback
  const firstQuestion = {
    id: data?.firstQuestion?.id || 'q1',
    text: data?.firstQuestion?.text || `Расскажите об основных принципах лечения в тематике ${topics[0]}. Какие препараты и методы вы бы использовали?`,
    hints: Array.isArray(data?.firstQuestion?.hints) ? data.firstQuestion.hints : ['Подумайте о механизме действия препаратов', 'Учтите вид животного'],
  };

  return NextResponse.json({
    success: true,
    examId,
    firstQuestion,
    examPlan: data?.examPlan || `Экзамен по темам: ${topics.join(', ')}. Количество вопросов: ${questionCount}.`,
  });
}

// ==================== Answer question ====================

async function handleAnswer(body: {
  examId?: string;
  questionId?: string;
  answer?: string;
  questionHistory?: Array<{ question: string; answer: string }>;
  questionCount?: number;
  currentQuestionIndex?: number;
  topics?: string[];
  difficulty?: string;
  isLastQuestion?: boolean;
}) {
  const {
    examId,
    questionId = '',
    answer = '',
    questionHistory = [],
    questionCount = 10,
    currentQuestionIndex = 0,
    topics = [],
    difficulty = 'intermediate',
    isLastQuestion = false,
  } = body;

  // --- Payload size validation ---
  const MAX_ANSWER_SIZE = 50 * 1024; // 50 KB
  if (answer.length > MAX_ANSWER_SIZE) {
    return NextResponse.json(
      { error: 'Ответ слишком длинный (максимум 50 КБ)' },
      { status: 413 }
    );
  }

  if (JSON.stringify(questionHistory).length > 500 * 1024) {
    return NextResponse.json(
      { error: 'История вопросов слишком большая (максимум 500 КБ)' },
      { status: 413 }
    );
  }
  if (!answer.trim()) {
    return NextResponse.json(
      { error: 'Ответ не может быть пустым' },
      { status: 400 }
    );
  }

  const zai = await getZAI();
  const difficultyLabel = DIFFICULTY_LABELS[difficulty] || difficulty;
  const isLast = isLastQuestion || currentQuestionIndex >= questionCount - 1;

  // Build context of previous Q&A
  const historyContext = questionHistory
    .map((h, i) => `Вопрос ${i + 1}: ${h.question}\nОтвет студента: ${h.answer}`)
    .join('\n\n');

  const systemPrompt = isLast ? EXAM_FINAL_PROMPT : EXAM_ANSWER_PROMPT;

  const userPrompt = `Проверь ответ студента.

Темы экзамена: ${topics.join(', ')}
Сложность: ${difficultyLabel}
Текущий вопрос: ${questionId}
Общий прогресс: вопрос ${currentQuestionIndex + 1} из ${questionCount}

${historyContext ? `Предыдущие вопросы и ответы:\n${historyContext}\n\n---\n` : ''}Текущий вопрос: "${questionHistory[questionHistory.length - 1]?.question || 'Не указан'}"
Ответ студента: "${answer}"

${isLast ? 'Это ПОСЛЕДНИЙ вопрос экзамена. Подведи итоги по всем ответам.' : 'Задай следующий вопрос по другой теме из списка.'}`;

  let responseText = '';
  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 4096,
  });
  responseText = completion.choices[0]?.message?.content || '';

  const parsed = extractJSON(responseText);

  if (!parsed || typeof parsed !== 'object') {
    console.error('[exam/answer] JSON parse failed. RAW:', responseText.substring(0, 500));
    // Fallback
    return NextResponse.json({
      success: true,
      feedback: {
        correct: true,
        score: 5,
        explanation: 'Ваш ответ засчитан. К сожалению, не удалось получить детальную обратную связь от AI.',
        followUp: null,
      },
      nextQuestion: null,
      examComplete: isLast,
      results: isLast ? {
        overallScore: 50,
        grade: 'Удовлетворительно',
        summary: 'Экзамен завершён. Рекомендуется пройти повторно.',
        strengths: [],
        weaknesses: [],
        recommendations: ['Повторить материал по выбранным темам'],
      } : null,
    });
  }

  const data = parsed as any;

  // Build feedback
  const feedback = {
    correct: !!data?.feedback?.correct,
    score: typeof data?.feedback?.score === 'number' ? Math.min(10, Math.max(0, data.feedback.score)) : 5,
    explanation: typeof data?.feedback?.explanation === 'string'
      ? data.feedback.explanation
      : 'Обратная связь недоступна.',
    followUp: typeof data?.feedback?.followUp === 'string' ? data.feedback.followUp : null,
  };

  if (isLast) {
    // Exam complete — extract results
    const results = data?.results || {};
    const overallScore = typeof results.overallScore === 'number' ? results.overallScore : 50;

    let grade = 'Неудовлетворительно';
    if (overallScore >= 90) grade = 'Отлично';
    else if (overallScore >= 75) grade = 'Хорошо';
    else if (overallScore >= 60) grade = 'Удовлетворительно';

    return NextResponse.json({
      success: true,
      feedback,
      nextQuestion: null,
      examComplete: true,
      results: {
        overallScore,
        grade,
        summary: results.summary || `Экзамен завершён. Результат: ${overallScore}%.`,
        strengths: Array.isArray(results.strengths) ? results.strengths : [],
        weaknesses: Array.isArray(results.weaknesses) ? results.weaknesses : [],
        recommendations: Array.isArray(results.recommendations) ? results.recommendations : [],
      },
    });
  }

  // Not last — return next question
  const nextQuestion = data?.nextQuestion
    ? {
        id: data.nextQuestion.id || `q${currentQuestionIndex + 2}`,
        text: data.nextQuestion.text || 'Расскажите о методах диагностики в ветеринарной практике.',
        hints: Array.isArray(data.nextQuestion.hints) ? data.nextQuestion.hints : [],
      }
    : null;

  return NextResponse.json({
    success: true,
    feedback,
    nextQuestion,
    examComplete: false,
    results: null,
  });
}
