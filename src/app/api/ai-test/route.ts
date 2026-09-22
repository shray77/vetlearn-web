import { NextResponse } from 'next/server';
import { getZAI } from '@/lib/zai';

// Диагностика ИИ: живой пинг LLM с замером задержки.
// Используется карточкой «Статус ИИ» на дашборде, чтобы отличать
// реальную генерацию от резервного контента (фоллбеков).
export const dynamic = 'force-dynamic';

const PING_PROMPT = 'Ответь одним словом: как называется воспаление вымени у коровы?';

export async function GET() {
  const startedAt = Date.now();
  try {
    const zai = await getZAI();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: 'Ты ветеринарный ассистент. Отвечай предельно кратко.' },
        { role: 'user', content: PING_PROMPT },
      ],
      thinking: { type: 'disabled' },
    });

    const reply = completion.choices[0]?.message?.content?.trim() ?? '';
    const latencyMs = Date.now() - startedAt;

    if (!reply) {
      return NextResponse.json(
        { ok: false, error: 'Модель вернула пустой ответ', latencyMs },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, reply, latencyMs });
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка SDK';
    console.error('[ai-test] LLM ping failed:', message);
    return NextResponse.json(
      { ok: false, error: message, latencyMs },
      { status: 502 }
    );
  }
}
