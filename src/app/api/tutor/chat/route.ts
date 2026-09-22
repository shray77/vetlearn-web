import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getZAI } from '@/lib/zai';
import { getTrackPromptContext } from '@/lib/tracks';
import { parseBody, optionalLimitedString } from '@/lib/api-validation';
import type { SpecializationTrack } from '@/lib/types';

const SYSTEM_PROMPT = `Ты — AI-репетитор по ветеринарной медицине. Ты помогаешь студентам ветеринарных вузов понять сложные темы.

КРИТИЧЕСКИ ВАЖНО: Ты отвечаешь ТОЛЬКО на русском языке. Любой ответ на английском — ошибка.

Твой стиль:
- Дружелюбный и поддерживающий
- Объясняешь сложные концепции простым языком
- Используешь примеры из реальной практики
- Поощряешь студента и мотивируешь учиться
- Когда студент ошибается — объясняешь ошибку без осуждения

Если указана конкретная тема (например "Фармакология"), ты ДОЛЖЕН отвечать ТОЛЬКО по этой теме.
Если студент задаёт вопрос не по выбранной теме, кратко ответь: "Этот вопрос не по теме {тема}. Давайте вернёмся к {тема}." и задай наводящий вопрос по теме.

Отвечай кратко и по существу (2-4 предложения), чтобы текст можно было озвучить.`;

export async function POST(req: NextRequest) {
  try {
    // Zod-валидация (P2): раньше context и history не имели лимитов —
    // мегабайты свободно уезжали в промпт. Теперь всё лимитировано.
    const Body = z.object({
      message: z.string().trim().min(1).max(50 * 1024),
      topic: optionalLimitedString(200),
      context: optionalLimitedString(20 * 1024),
      track: optionalLimitedString(50),
      history: z.array(z.object({
        role: z.string().max(20).catch('user'),
        content: z.string().max(10 * 1024).catch(''),
      })).max(30).catch([]),
    });
    const parsed = await parseBody(req, Body);
    if (!parsed.ok) return parsed.response;
    const { message, topic, context, history, track } = parsed.data;
    const trackContext = getTrackPromptContext(track as SpecializationTrack | undefined);

    const zai = await getZAI();

    const contextInfo = [
      topic ? `Тема: ${topic}` : '',
      context ? `Контекст: ${context}` : '',
    ]
      .filter(Boolean)
      .join('. ');

    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT + (trackContext ? '\n\nКОНТЕКСТ СПЕЦИАЛИЗАЦИИ СТУДЕНТА:\n' + trackContext : '') },
      ...(contextInfo ? [{ role: 'user' as const, content: `Контекст для следующих сообщений: ${contextInfo}` }, { role: 'assistant' as const, content: 'Понял, я учту этот контекст.' }] : []),
      ...history.slice(-10).map((h) => ({
        // Anti-injection: клиент не может прокинуть role:'system' поверх системного промпта
        role: h.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: h.content,
      })),
      { role: 'user' as const, content: message },
    ];

    const completion = await zai.chat.completions.create({
      messages,
    });

    const responseText = completion.choices[0]?.message?.content || 'Извините, не удалось получить ответ.';

    return NextResponse.json({
      success: true,
      response: responseText,
    });
  } catch (error) {
    console.error('Tutor chat error:', error);
    return NextResponse.json(
      { error: 'Ошибка при обращении к репетитору' },
      { status: 500 }
    );
  }
}
