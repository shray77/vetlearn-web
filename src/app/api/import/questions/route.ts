import { NextRequest, NextResponse } from 'next/server';
import { getZAI } from '@/lib/zai';
import { extractJSON } from '@/lib/json-utils';

/**
 * POST /api/import/questions
 *
 * Generate AssessmentQuestion[] from extracted text (for "test by my materials").
 *
 * Request body:
 *   { text: string, topicId?: string, count?: number }
 *
 * Response:
 *   { success: true, questions: AssessmentQuestion[] }
 */

const MAX_TEXT_SIZE = 500 * 1024;

export async function POST(req: NextRequest) {
  try {
    const { text, topicId, count = 10 } = await req.json() as {
      text?: string;
      topicId?: string;
      count?: number;
    };

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Укажите text' }, { status: 400 });
    }
    if (text.length > MAX_TEXT_SIZE) {
      return NextResponse.json(
        { error: `Текст слишком длинный (максимум ${MAX_TEXT_SIZE} символов)` },
        { status: 413 }
      );
    }
    if (text.trim().length < 100) {
      return NextResponse.json(
        { error: 'Слишком мало текста для генерации вопросов (минимум 100 символов)' },
        { status: 400 }
      );
    }

    const clampedCount = Math.max(5, Math.min(15, count));

    const systemPrompt = `Ты — профессор ветеринарной медицины. На основе предоставленного текста создай тестовые вопросы для проверки знаний студента.

ПРАВИЛА:
- Все тексты — ТОЛЬКО на русском языке
- Каждый вопрос должен иметь 4 варианта ответа (только один правильный)
- Вопросы должны проверять понимание материала из текста, а не просто факты
- Включай объяснения со ссылкой на текст
- Сложность: intermediate

ФОРМАТ ОТВЕТА — строго JSON массив:
[
  {
    "id": "q1",
    "topicId": "${topicId || 'imported'}",
    "topicName": "Импортированный материал",
    "question": "Текст вопроса на русском",
    "options": ["Вариант А", "Вариант Б", "Вариант В", "Вариант Г"],
    "correctIndex": 0,
    "explanation": "Объяснение на русском",
    "difficulty": "intermediate"
  }
]

Верни ТОЛЬКО JSON массив.`;

    const userPrompt = `Создай ${clampedCount} тестовых вопросов на основе следующего текста:\n\n${text}`;

    const zai = await getZAI();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const responseText = completion.choices[0]?.message?.content || '';
    const parsed = extractJSON(responseText);

    if (!Array.isArray(parsed)) {
      return NextResponse.json(
        { error: 'Не удалось извлечь вопросы из текста' },
        { status: 500 }
      );
    }

    const validQuestions = parsed
      .filter((q: any) => q && typeof q === 'object' && typeof q.question === 'string' && Array.isArray(q.options) && q.options.length === 4)
      .map((q: any, i: number) => ({
        id: typeof q.id === 'string' ? q.id : `q${i + 1}`,
        topicId: topicId || 'imported',
        topicName: 'Импортированный материал',
        question: q.question.trim(),
        options: q.options.map((o: any) => String(o).trim()),
        correctIndex: Math.max(0, Math.min(3, Number(q.correctIndex) || 0)),
        explanation: typeof q.explanation === 'string' ? q.explanation.trim() : '',
        difficulty: 'intermediate',
      }))
      .slice(0, clampedCount);

    return NextResponse.json({
      success: true,
      questions: validQuestions,
    });
  } catch (error: unknown) {
    console.error('[import/questions] error:', (error as Error)?.message ?? error);
    return NextResponse.json(
      { error: 'Ошибка при генерации вопросов' },
      { status: 500 }
    );
  }
}
