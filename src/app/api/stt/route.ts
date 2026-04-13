import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(req: NextRequest) {
  try {
    const { audio } = await req.json();

    if (!audio) {
      return NextResponse.json(
        { error: 'Укажите аудио данные' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    const response = await zai.audio.asr.create({
      file_base64: audio,
    });

    const text = response.text || '';

    return NextResponse.json({
      success: true,
      text,
    });
  } catch (error) {
    console.error('STT error:', error);
    return NextResponse.json(
      { error: 'Ошибка распознавания речи' },
      { status: 500 }
    );
  }
}
