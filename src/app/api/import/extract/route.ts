import { NextRequest, NextResponse } from 'next/server';
import { getZAI } from '@/lib/zai';

/**
 * POST /api/import/extract
 *
 * Extracts text from an uploaded document (txt/md/image-as-base64).
 * Returns { text, fileType } for downstream flashcard/question generation.
 *
 * NOTE: PDF parsing is intentionally NOT supported server-side to avoid
 * heavy native deps in the standalone build. For PDFs the client should
 * use pdf.js (client-side) or the user can paste raw text directly.
 *
 * Request body:
 *   { content: string, fileType: 'txt' | 'md' | 'image', filename?: string }
 *   - for txt/md: content is the raw text
 *   - for image: content is base64 string (with or without data: prefix)
 *
 * Response:
 *   { success: true, text: string, fileType: string, preview: string }
 */

const MAX_TEXT_SIZE = 500 * 1024; // 500 KB raw text
const MAX_IMAGE_BASE64 = 10 * 1024 * 1024 * 1.37; // 10 MB decoded

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, fileType, filename } = body as {
      content?: string;
      fileType?: 'txt' | 'md' | 'image';
      filename?: string;
    };

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Укажите content (текст или base64)' },
        { status: 400 }
      );
    }

    if (!fileType || !['txt', 'md', 'image'].includes(fileType)) {
      return NextResponse.json(
        { error: 'Укажите корректный fileType (txt | md | image)' },
        { status: 400 }
      );
    }

    // --- Text path ---
    if (fileType === 'txt' || fileType === 'md') {
      if (content.length > MAX_TEXT_SIZE) {
        return NextResponse.json(
          { error: `Текст слишком длинный (максимум ${MAX_TEXT_SIZE} символов)` },
          { status: 413 }
        );
      }
      return NextResponse.json({
        success: true,
        text: content,
        fileType,
        preview: content.slice(0, 500),
        filename: filename || 'document.txt',
      });
    }

    // --- Image OCR path (VLM) ---
    if (content.length > MAX_IMAGE_BASE64) {
      return NextResponse.json(
        { error: 'Изображение слишком большое (максимум 10 МБ)' },
        { status: 413 }
      );
    }

    const base64Data = content.includes(',') ? content.split(',')[1] : content;
    if (!/^[A-Za-z0-9+/=]+$/.test(base64Data.slice(0, 1000))) {
      return NextResponse.json(
        { error: 'Неверный формат base64' },
        { status: 400 }
      );
    }

    const zai = await getZAI();
    const dataUrl = content.startsWith('data:')
      ? content
      : `data:image/jpeg;base64,${base64Data}`;

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Ты — система OCR для ветеринарных конспектов. Извлеки ВЕСЬ текст с изображения и верни его как чистый текст, без комментариев, без markdown. Сохрани структуру (заголовки, списки). Если текст не читаем — верни пустую строку. Текст на русском языке.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Извлеки текст с этого изображения.' },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ] as any,
    });

    const text = completion.choices[0]?.message?.content || '';

    return NextResponse.json({
      success: true,
      text,
      fileType: 'image',
      preview: text.slice(0, 500),
      filename: filename || 'scanned-image.jpg',
    });
  } catch (error: unknown) {
    console.error('[import/extract] error:', (error as Error)?.message ?? error);
    return NextResponse.json(
      { error: 'Ошибка при извлечении текста' },
      { status: 500 }
    );
  }
}
