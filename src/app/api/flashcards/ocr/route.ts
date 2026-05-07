import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

interface Flashcard {
  id: string;
  term: string;
  definition: string;
  example?: string;
}

const SYSTEM_PROMPT = `Ты — опытный профессор ветеринарной медицины. Извлекаешь учебную информацию из текста конспектов и создаёшь обучающие карточки. ALL text in your response MUST be in Russian only.

Твоя задача:
1. Проанализировать текст с изображения (конспект, учебник, лекция)
2. Выделить ключевые ветеринарные термины, понятия, факты
3. Создать обучающие карточки «термин ↔ определение»

ПРАВИЛА:
- Все тексты — ТОЛЬКО на русском языке
- Если текст на фото не по ветеринарии — создай карточки по общим биологическим/медицинским терминам, которые найдёшь
- Минимум 5, максимум 15 карточек
- Термины должны быть точными
- Определения краткие и информативные (1-3 предложения)
- Добавляй примеры из текста где возможно

ФОРМАТ ОТВЕТА — строго JSON:
{
  "extractedText": "Краткое описание содержимого (что удалось прочитать)",
  "flashcards": [
    {
      "id": "ocr1",
      "term": "Термин",
      "definition": "Определение",
      "example": "Пример из текста"
    }
  ]
}

Если на изображении нет читаемого текста или он не связан с учебой, верни:
{
  "extractedText": "Не удалось распознать текст",
  "flashcards": []
}

Верни ТОЛЬКО JSON.`;

function extractJSON(text: string): unknown | null {
  try { return JSON.parse(text); } catch {}
  try {
    const cleaned = text.replace(/^```(?:json|JSON)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();
    return JSON.parse(cleaned);
  } catch {}
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
    try {
      let fixed = match[0].replace(/,\s*([}\]])/g, '$1').replace(/(?<![\\])'/g, '"');
      return JSON.parse(fixed);
    } catch {}
  }
  return null;
}

function validateOCRResult(data: any): { extractedText: string; flashcards: Flashcard[] } | null {
  if (!data || typeof data !== 'object') return null;

  const cards = data.flashcards;
  if (!Array.isArray(cards)) return null;

  const validCards: Flashcard[] = [];
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    if (!c || typeof c !== 'object') continue;
    if (!c.term || typeof c.term !== 'string' || !c.term.trim()) continue;
    if (!c.definition || typeof c.definition !== 'string' || !c.definition.trim()) continue;

    validCards.push({
      id: c.id || `ocr${i + 1}`,
      term: c.term.trim(),
      definition: c.definition.trim(),
      example: typeof c.example === 'string' && c.example.trim() ? c.example.trim() : undefined,
    });
  }

  return {
    extractedText: typeof data.extractedText === 'string' ? data.extractedText : '',
    flashcards: validCards,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();

    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        { error: 'Укажите изображение (base64)' },
        { status: 400 }
      );
    }

    // Validate base64 image
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    if (base64Data.length < 100) {
      return NextResponse.json(
        { error: 'Изображение слишком маленькое' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    const userPrompt = `Проанализируй текст на этом изображении и создай обучающие карточки по ветеринарной медицине. Текст может быть с конспекта лекции, страницы учебника или рукописных заметок. Извлеки ключевые термины и создай карточки. Верни ТОЛЬКО JSON.`;

    // Use VLM (vision model) via chat completions with image content
    let responseText = '';

    try {
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: base64Data.startsWith('data:') ? image : `data:image/jpeg;base64,${base64Data}`,
                },
              },
            ],
          },
        ] as any,
        thinking: { type: 'disabled' },
        response_format: { type: 'json_object' } as any,
      });
      responseText = completion.choices[0]?.message?.content || '';
    } catch (visionError) {
      console.warn('[ocr] Vision with format failed, retrying:', visionError);
      try {
        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                { type: 'text', text: userPrompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: base64Data.startsWith('data:') ? image : `data:image/jpeg;base64,${base64Data}`,
                  },
                },
              ],
            },
          ] as any,
          thinking: { type: 'disabled' },
        });
        responseText = completion.choices[0]?.message?.content || '';
      } catch (fallbackError) {
        console.error('[ocr] Vision failed:', fallbackError);
        return NextResponse.json(
          { error: 'Не удалось обработать изображение. Попробуйте фото с более чётким текстом.' },
          { status: 500 }
        );
      }
    }

    const parsed = extractJSON(responseText);
    if (!parsed) {
      return NextResponse.json(
        { error: 'Не удалось извлечь данные. Попробуйте другое изображение.' },
        { status: 500 }
      );
    }

    const result = validateOCRResult(parsed);
    if (!result || result.flashcards.length === 0) {
      return NextResponse.json({
        success: true,
        extractedText: result?.extractedText || 'Не удалось распознать текст',
        flashcards: [],
      });
    }

    return NextResponse.json({
      success: true,
      extractedText: result.extractedText,
      flashcards: result.flashcards.slice(0, 15),
    });
  } catch (error) {
    console.error('[ocr] Error:', error);
    return NextResponse.json(
      { error: 'Ошибка при обработке изображения' },
      { status: 500 }
    );
  }
}
