import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getZAI } from '@/lib/zai';
import { extractJSON } from '@/lib/json-utils';
import { getOSCEStationById } from '@/lib/osce-bank';
import { getOSCEReferences } from '@/lib/osce-references';
import { parseBody } from '@/lib/api-validation';

/**
 * POST /api/osce/evaluate
 *
 * LLM-grades the student's free-text answers against reference answers and
 * keywords. Returns per-question score (0-10), feedback, total score.
 *
 * Request body:
 *   { stationId: string, answers: string[] }
 *
 * Response:
 *   { success: true, scores: number[], feedback: string[], totalScore: number }
 */

export async function POST(req: NextRequest) {
  try {
    // Zod-валидация входа (P2): stationId — короткая строка, ответы — строки с жёстким лимитом
    const Body = z.object({
      stationId: z.string().min(1).max(100),
      answers: z.array(z.string().max(20 * 1024)).min(1).max(10),
    });
    const validated = await parseBody(req, Body);
    if (!validated.ok) return validated.response;
    const { stationId, answers } = validated.data;

    const station = getOSCEStationById(stationId);
    if (!station) {
      return NextResponse.json(
        { error: 'Станция не найдена' },
        { status: 404 }
      );
    }

    if (answers.length !== station.questions.length) {
      return NextResponse.json(
        { error: `Ожидается ${station.questions.length} ответов, получено ${answers.length}` },
        { status: 400 }
      );
    }

    // Basic length validation
    for (let i = 0; i < answers.length; i++) {
      const a = (answers[i] || '').trim();
      const q = station.questions[i];
      if (a.length < q.minLength) {
        return NextResponse.json(
          { error: `Ответ ${i + 1} слишком короткий (минимум ${q.minLength} символов)` },
          { status: 400 }
        );
      }
      if (a.length > q.maxLength) {
        return NextResponse.json(
          { error: `Ответ ${i + 1} слишком длинный (максимум ${q.maxLength} символов)` },
          { status: 413 }
        );
      }
    }

    // Эталоны читаются с сервера (в клиентский бандл они больше не попадают)
    const referenceAnswers = getOSCEReferences(stationId) || [];

    // Build evaluation prompt
    const evalPrompt = `Ты — экзаменатор ветеринарной медицины. Оцени ответы студента на станции OSCE строго по критериям.

СТАНЦИЯ: ${station.imageCaption}
ПРЕЗЕНТАЦИЯ: ${station.presenterText}

${station.questions.map((q, i) => `
ВОПРОС ${i + 1} (${q.type}):
${q.prompt}
Ключевые слова/концепты: ${q.keywords.join(', ')}
ЭТАЛОННЫЙ ОТВЕТ: ${referenceAnswers[i] || 'Эталон недоступен — оцени по ключевым словам.'}

ОТВЕТ СТУДЕНТА:
${answers[i]}
`).join('\n---\n')}

Оцени каждый ответ от 0 до 10:
- 0-3: ответ неверный или отсутствует ключевой диагноз/план
- 4-6: частично верный, упущены важные детали
- 7-8: хороший ответ, упомянуты не все ключевые слова
- 9-10: полный и точный ответ, все ключевые концепции

Верни СТРОГО JSON:
{
  "scores": [7, 5, 8],
  "feedback": [
    "Хорошее описание, но упущен термин 'воздушная бронхограмма'.",
    "Диагноз указан, но без дифференциального.",
    "Полный план, упоминает все исследования."
  ]
}

Verdict должен быть конкретным, что студент упустил или назвал верно. На русском.`;

    const zai = await getZAI();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'Ты — строгий, но справедливый экзаменатор ветеринарной медицины. Оцениваешь ответы в формате OSCE.' },
        { role: 'user', content: evalPrompt },
      ],
    });

    const responseText = completion.choices[0]?.message?.content || '';
    const parsed = extractJSON(responseText) as { scores?: number[]; feedback?: string[] } | null;

    if (!parsed || !Array.isArray(parsed.scores) || !Array.isArray(parsed.feedback)) {
      // Fallback — simple keyword-based scoring
      const scores = station.questions.map((q, i) => {
        const a = (answers[i] || '').toLowerCase();
        // Guard от деления на ноль: пустой keywords иначе даёт NaN в totalScore
        const denom = q.keywords.length > 0 ? q.keywords.length : 1;
        const hits = q.keywords.filter((k) => a.includes(k.toLowerCase())).length;
        return Math.min(10, Math.round((hits / denom) * 10));
      });
      const feedback = station.questions.map((_, i) =>
        `Автоматическая оценка: ${scores[i]}/10 (на основе совпадения ключевых слов).`
      );
      const totalScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      return NextResponse.json({ success: true, scores, feedback, totalScore, referenceAnswers, fallback: true });
    }

    const scores = parsed.scores.map((s) => Math.max(0, Math.min(10, Math.round(Number(s) || 0))));
    const feedback = parsed.feedback.map((f) => String(f).slice(0, 500));

    // Task 204 (fix 204-a#12): LLM может вернуть укороченные массивы — хвостовые
    // вопросы показывались со скором 0 (клиентский ?? 0), а totalScore делился на
    // чужую длину и расходился с показанным. Мисматч длины → честный fallback.
    if (scores.length !== station.questions.length || feedback.length !== station.questions.length) {
      const fbScores = station.questions.map((q, i) => {
        const a = (answers[i] || '').toLowerCase();
        const denom = q.keywords.length > 0 ? q.keywords.length : 1;
        const hits = q.keywords.filter((k) => a.includes(k.toLowerCase())).length;
        return Math.min(10, Math.round((hits / denom) * 10));
      });
      const fbFeedback = station.questions.map((_, i) =>
        `Автоматическая оценка: ${fbScores[i]}/10 (на основе совпадения ключевых слов).`
      );
      const fbTotal = Math.round(fbScores.reduce((a, b) => a + b, 0) / fbScores.length);
      return NextResponse.json({ success: true, scores: fbScores, feedback: fbFeedback, totalScore: fbTotal, referenceAnswers, fallback: true });
    }

    const totalScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    return NextResponse.json({
      success: true,
      scores,
      feedback,
      totalScore,
      // Эталоны отдаём только после проверки — на них ранер смотрит в экране результатов
      referenceAnswers,
    });
  } catch (error: unknown) {
    console.error('[osce/evaluate] error:', (error as Error)?.message ?? error);
    return NextResponse.json(
      { error: 'Ошибка при оценке ответов' },
      { status: 500 }
    );
  }
}
