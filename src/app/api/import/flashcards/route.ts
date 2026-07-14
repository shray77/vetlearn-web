import { NextRequest, NextResponse } from 'next/server';
import { getZAI } from '@/lib/zai';
import { extractJSON } from '@/lib/json-utils';

/**
 * POST /api/import/flashcards
 *
 * Generate Flashcard[] from extracted text.
 *
 * Request body:
 *   { text: string, topicId?: string, count?: number }
 *
 * Response:
 *   { success: true, flashcards: Flashcard[] }
 */

const MAX_TEXT_SIZE = 500 * 1024;

export async function POST(req: NextRequest) {
  try {
    const { text, topicId, count = 12 } = await req.json() as {
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
    if (text.trim().length < 50) {
      return NextResponse.json(
        { error: 'Слишком мало текста для генерации карточек (минимум 50 символов)' },
        { status: 400 }
      );
    }

    const clampedCount = Math.max(5, Math.min(20, count));

    const systemPrompt = `Ты — опытный преподаватель ветеринарной медицины. Извлекаешь учебную информацию из текста и создаёшь обучающие карточки «термин ↔ определение».

ПРАВИЛА:
- Все тексты — ТОЛЬКО на русском языке
- Минимум 5, максимум ${clampedCount} карточек
- Термины должны быть точными и важными для изучения
- Определения краткие и информативные (1-3 предложения)
- Добавляй примеры из текста где возможно
- Если текст не по ветеринарии — создай карточки по общим биологическим/медицинским терминам

ФОРМАТ ОТВЕТА — строго JSON:
{
  "flashcards": [
    { "id": "fc1", "term": "Термин", "definition": "Определение", "example": "Пример" }
  ]
}

Верни ТОЛЬКО JSON.`;

    const userPrompt = `Создай до ${clampedCount} обучающих карточек из следующего текста${topicId ? ` (тема: ${topicId})` : ''}:\n\n${text}`;

    const zai = await getZAI();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const responseText = completion.choices[0]?.message?.content || '';
    const parsed = extractJSON(responseText) as { flashcards?: unknown } | null;

    if (!parsed || !Array.isArray(parsed.flashcards)) {
      return NextResponse.json(
        { error: 'Не удалось извлечь карточки из текста. Попробуйте другой материал.' },
        { status: 500 }
      );
    }

    // Validate and sanitize
    const validCards = parsed.flashcards
      .filter((c: any) => c && typeof c === 'object' && typeof c.term === 'string' && typeof c.definition === 'string' && c.term.trim() && c.definition.trim())
      .map((c: any, i: number) => ({
        id: typeof c.id === 'string' ? c.id : `fc${i + 1}`,
        term: c.term.trim(),
        definition: c.definition.trim(),
        example: typeof c.example === 'string' && c.example.trim() ? c.example.trim() : undefined,
      }))
      .slice(0, clampedCount);

    return NextResponse.json({
      success: true,
      flashcards: validCards,
    });
  } catch (error: unknown) {
    console.error('[import/flashcards] error:', (error as Error)?.message ?? error);
    return NextResponse.json(
      { error: 'Ошибка при генерации карточек' },
      { status: 500 }
    );
  }
}
