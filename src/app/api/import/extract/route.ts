import { NextRequest, NextResponse } from 'next/server';
import { getZAI } from '@/lib/zai';

/**
 * POST /api/import/extract
 *
 * Extracts text from an uploaded document (txt/md/pdf/image-as-base64).
 * Returns { text, fileType } for downstream flashcard/question generation.
 *
 * PDF parsing uses pdf-parse (server-side). For scanned PDFs without a text
 * layer, the client should fall back to per-page image OCR via VLM (not
 * implemented here — would require rendering pages via pdf.js client-side).
 *
 * Request body:
 *   { content: string, fileType: 'txt' | 'md' | 'pdf' | 'image', filename?: string }
 *   - txt/md: content is raw text
 *   - pdf:    content is base64-encoded PDF (with or without data: prefix)
 *   - image:  content is base64 string (with or without data: prefix)
 *
 * Response:
 *   { success: true, text: string, fileType: string, preview: string }
 */

const MAX_TEXT_SIZE = 500 * 1024;
const MAX_IMAGE_BASE64 = 10 * 1024 * 1024 * 1.37;
const MAX_PDF_BASE64 = 10 * 1024 * 1024 * 1.37;
const MAX_PDF_EXTRACTED_TEXT = 500 * 1024;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, fileType, filename } = body as {
      content?: string;
      fileType?: 'txt' | 'md' | 'pdf' | 'image';
      filename?: string;
    };

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Укажите content (текст или base64)' },
        { status: 400 }
      );
    }

    if (!fileType || !['txt', 'md', 'pdf', 'image'].includes(fileType)) {
      return NextResponse.json(
        { error: 'Укажите корректный fileType (txt | md | pdf | image)' },
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

    // --- PDF path ---
    if (fileType === 'pdf') {
      if (content.length > MAX_PDF_BASE64) {
        return NextResponse.json(
          { error: 'PDF слишком большой (максимум 10 МБ)' },
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

      try {
        // Dynamic import — pdf-parse is a CJS module with a known quirk:
        // requiring it at module load triggers fs access on import. Lazy
        // require via eval keeps it out of the hot path.
        const pdfParseModule = await import('pdf-parse');
        const pdfParse = (pdfParseModule as any).default || (pdfParseModule as any);
        const buffer = Buffer.from(base64Data, 'base64');
        const data = await pdfParse(buffer);
        let text = (data?.text || '').trim();
        if (text.length > MAX_PDF_EXTRACTED_TEXT) {
          text = text.slice(0, MAX_PDF_EXTRACTED_TEXT);
        }
        if (text.length < 50) {
          return NextResponse.json(
            { error: 'PDF не содержит текстового слоя (возможно, скан). Используйте OCR по изображениям.' },
            { status: 422 }
          );
        }
        return NextResponse.json({
          success: true,
          text,
          fileType: 'pdf',
          preview: text.slice(0, 500),
          filename: filename || 'document.pdf',
        });
      } catch (err) {
        console.error('[import/extract] pdf error:', (err as Error)?.message);
        return NextResponse.json(
          { error: 'Не удалось разобрать PDF. Возможно, файл повреждён или защищён.' },
          { status: 422 }
        );
      }
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
