import { NextRequest, NextResponse } from 'next/server';
import { getZAI } from '@/lib/zai';

// 10 MB decoded audio is roughly 13.7 MB of base64 text (1.37x overhead).
const MAX_AUDIO_BASE64_LEN = 10 * 1024 * 1024 * 1.37;
const STT_TIMEOUT_MS = 30_000;

export async function POST(req: NextRequest) {
  try {
    const { audio } = await req.json();

    if (!audio || typeof audio !== 'string') {
      return NextResponse.json(
        { error: 'Укажите аудио данные' },
        { status: 400 }
      );
    }

    if (audio.length > MAX_AUDIO_BASE64_LEN) {
      return NextResponse.json(
        { error: 'Аудио слишком длинное (максимум 10 МБ)' },
        { status: 413 }
      );
    }

    // Cheap sanity check — first 1000 chars must be valid base64 alphabet.
    if (!/^[A-Za-z0-9+/=]+$/.test(audio.slice(0, 1000))) {
      return NextResponse.json(
        { error: 'Неверный формат base64' },
        { status: 400 }
      );
    }

    // The z-ai SDK's `audio.asr.create` does not accept an AbortSignal in
    // the current version, so we use Promise.race against a timeout. The
    // underlying SDK call will eventually settle in the background and be
    // garbage-collected; we just stop waiting for it.
    const zai = await getZAI();
    const asrPromise = zai.audio.asr.create({ file_base64: audio });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('STT_TIMEOUT')), STT_TIMEOUT_MS);
    });

    const response = await Promise.race([asrPromise, timeoutPromise]);
    const text = response.text || '';

    return NextResponse.json({
      success: true,
      text,
    });
  } catch (error: unknown) {
    const msg = (error as Error)?.message ?? '';
    if (msg === 'STT_TIMEOUT') {
      return NextResponse.json(
        { error: 'Таймаут распознавания речи' },
        { status: 504 }
      );
    }

    // Log only the error message, never the full SDK error object — SDK
    // errors may carry auth headers / retry hints we don't want in logs.
    console.error('[stt] error:', msg || error);
    return NextResponse.json(
      { error: 'Ошибка распознавания речи' },
      { status: 500 }
    );
  }
}
