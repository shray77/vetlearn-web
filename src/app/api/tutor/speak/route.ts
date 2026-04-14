import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Укажите текст для озвучивания' },
        { status: 400 }
      );
    }

    const truncatedText = text.slice(0, 1024);
    const zai = await ZAI.create();

    const response = await zai.audio.tts.create({
      input: truncatedText,
      voice: 'tongtong',
      speed: 0.9,
      response_format: 'mp3',
      stream: false,
    });

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json(
      { error: 'Ошибка при генерации речи' },
      { status: 500 }
    );
  }
}
