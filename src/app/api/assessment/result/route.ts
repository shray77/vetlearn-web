import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

const SYSTEM_PROMPT = `Ты — профессор ветеринарной медицины. Ты анализируешь результаты тестирования студентов и создаёшь персонализированный план обучения.

КРИТИЧЕСКИ ВАЖНО: ВСЕ тексты в ответе должны быть ТОЛЬКО на русском языке.

Твоя задача:
1. Проанализировать правильные и неправильные ответы
2. Определить пробелы в знаниях по темам
3. Определить сильные стороны
4. Создать приоритизированный план обучения
5. Рекомендовать конкретные действия

ФОРМАТ ОТВЕТА — строго JSON:
{
  "score": 75,
  "skillMap": {
    "pharmacology": 60,
    "surgery": 80
  },
  "gaps": [
    {
      "topicId": "pharmacology",
      "topicName": "Фармакология",
      "currentLevel": 40,
      "targetLevel": 70,
      "priority": "high",
      "reason": "Низкий процент правильных ответов по антибиотикам"
    }
  ],
  "strengths": ["Хорошее знание хирургических техник"],
  "learningPath": [
    {
      "topicId": "pharmacology",
      "topicName": "Фармакология",
      "priority": "high",
      "reason": "Требует срочного повторения",
      "mastery": 40,
      "resources": [
        {
          "type": "book",
          "title": "Краткий справочник по ветеринарной фармакологии",
          "description": "Рекомендуется для повторения основных групп препаратов"
        }
      ]
    }
  ],
  "summary": "Общий анализ и рекомендации на русском языке..."
}

Верни ТОЛЬКО JSON, без markdown. Весь текст — ТОЛЬКО на русском языке.`;

export async function POST(req: NextRequest) {
  try {
    const { questions, answers, previousSkillMap = {} } = await req.json();

    if (!questions || !answers) {
      return NextResponse.json(
        { error: 'Укажите вопросы и ответы' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    // Calculate initial stats
    const correctCount = answers.filter(
      (a: number, i: number) => a === questions[i]?.correctIndex
    ).length;
    const totalCount = questions.length;
    const score = Math.round((correctCount / totalCount) * 100);

    // Build analysis context
    const topicStats: Record<string, { correct: number; total: number; topicName: string }> = {};
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const topic = q.topicId || 'unknown';
      if (!topicStats[topic]) {
        topicStats[topic] = { correct: 0, total: 0, topicName: q.topicName || topic };
      }
      topicStats[topic].total++;
      if (answers[i] === q.correctIndex) {
        topicStats[topic].correct++;
      }
    }

    const userPrompt = `Проанализируй результаты тестирования студента.

Общий результат: ${correctCount} из ${totalCount} (${score}%)

Статистика по темам:
${Object.entries(topicStats)
  .map(([topic, stats]) => {
    const pct = Math.round((stats.correct / stats.total) * 100);
    return `- ${stats.topicName} (${topic}): ${stats.correct}/${stats.total} = ${pct}%`;
  })
  .join('\n')}

Детали неправильных ответов:
${questions
  .map((q: { question: string; options: string[]; correctIndex: number; explanation?: string }, i: number) => {
    if (answers[i] !== q.correctIndex) {
      return `Вопрос: "${q.question}"
Студент ответил: "${q.options[answers[i]] || 'Не ответил'}"
Правильный ответ: "${q.options[q.correctIndex]}"
${q.explanation ? `Объяснение: "${q.explanation}"` : ''}`;
    }
    return null;
  })
  .filter(Boolean)
  .join('\n---\n')}

Предыдущий уровень навыков: ${JSON.stringify(previousSkillMap)}

Создай детальный анализ и план обучения НА РУССКОМ ЯЗЫКЕ. Определи:
1. Точный процент владения каждой темой (0-100)
2. Пробелы в знаниях с приоритетом (high/medium/low)
3. Сильные стороны студента
4. Конкретный план обучения с рекомендуемыми ресурсами

ПРАВИЛО: Весь текст в ответе — ТОЛЬКО на русском языке. Никаких английских слов.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    });

    let responseText = completion.choices[0]?.message?.content || '';
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let analysis;
    try {
      analysis = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: generate basic analysis from our stats
        const skillMap: Record<string, number> = {};
        const gaps: Array<{ topicId: string; topicName: string; currentLevel: number; targetLevel: number; priority: string }> = [];
        for (const [topic, stats] of Object.entries(topicStats)) {
          const mastery = Math.round((stats.correct / stats.total) * 100);
          skillMap[topic] = mastery;
          if (mastery < 70) {
            gaps.push({
              topicId: topic,
              topicName: stats.topicName,
              currentLevel: mastery,
              targetLevel: 80,
              priority: mastery < 40 ? 'high' : 'medium',
            });
          }
        }
        analysis = { score, skillMap, gaps, strengths: [], learningPath: [], summary: `Результат: ${score}%` };
      }
    }

    return NextResponse.json({
      success: true,
      ...analysis,
    });
  } catch (error) {
    console.error('Assessment analysis error:', error);
    return NextResponse.json(
      { error: 'Ошибка при анализе результатов' },
      { status: 500 }
    );
  }
}
