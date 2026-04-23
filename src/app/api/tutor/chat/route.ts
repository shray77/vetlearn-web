import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

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

Отвечай кратко и по существу (2-4 предложения), чтобы текст можно было озвучить.

ЗАПРЕЩЕНО использовать английские слова, даже медицинские термины. Пиши по-русски: не "CBC" — "ОАК", не "X-ray" — "рентгенография", не "ultrasound" — "УЗИ", не "CT" — "КТ", не "findings" — "результаты", не "reveals" — "показывает", не "treatment" — "лечение", не "diagnosis" — "диагноз". Если напишешь хоть одно английское слово — это грубая ошибка.`;

export async function POST(req: NextRequest) {
  try {
    const { message, topic, context, history = [] } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Укажите сообщение' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    const contextInfo = [
      topic ? `Тема: ${topic}` : '',
      context ? `Контекст: ${context}` : '',
    ]
      .filter(Boolean)
      .join('. ');

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(contextInfo ? [{ role: 'user' as const, content: `Контекст для следующих сообщений: ${contextInfo}` }, { role: 'assistant' as const, content: 'Понял, я учту этот контекст.' }] : []),
      ...history.slice(-10).map((h: { role: string; content: string }) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user' as const, content: message },
    ];

    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
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
