import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

const SYSTEM_PROMPT = `Ты — профессор ветеринарной медицины, проверяющий ответы студента на клинический случай. Ты даёшь конструктивную обратную связь.

КРИТИЧЕСКИ ВАЖНО: ВСЕ тексты в ответе должны быть ТОЛЬКО на русском языке.

Для каждого вопроса:
1. Укажи, правильный ли ответ
2. Если нет — объясни, почему выбранный ответ неверный
3. Объясни, почему правильный ответ является лучшим
4. Приведи дополнительную информацию по теме

ФОРМАТ ОТВЕТА — строго JSON:
{
  "score": 75,
  "totalQuestions": 5,
  "correctAnswers": 3,
  "feedback": [
    {
      "questionIndex": 0,
      "correct": true,
      "studentAnswer": "Ответ студента на русском",
      "correctAnswer": "Правильный ответ на русском",
      "explanation": "Подробное объяснение на русском..."
    }
  ],
  "overallFeedback": "Общая оценка и рекомендации на русском...",
  "keyTakeaways": ["Главный вывод 1 на русском", "Главный вывод 2 на русском"],
  "xpEarned": 50
}

Верни ТОЛЬКО JSON, без markdown. Весь текст — ТОЛЬКО на русском языке.`;

export async function POST(req: NextRequest) {
  try {
    const { case: clinicalCase, answers } = await req.json();

    if (!clinicalCase || !answers) {
      return NextResponse.json(
        { error: 'Укажите кейс и ответы' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    const userPrompt = `Проверь ответы студента на клинический случай.

Клинический случай: "${clinicalCase.title}"
Вид: ${clinicalCase.species}
Описание: ${clinicalCase.presentation}
Анамнез: ${clinicalCase.history}
Осмотр: ${clinicalCase.examination}

Ответы студента:
${clinicalCase.questions
  .map(
    (q: { question: string; options: string[]; correctIndex: number }, i: number) =>
      `Вопрос ${i + 1}: "${q.question}"
Варианты: ${q.options.map((o: string, j: number) => `${['А', 'Б', 'В', 'Г'][j]}) ${o}`).join('; ')}
Ответ студента: ${['А', 'Б', 'В', 'Г'][answers[i]]} - "${q.options[answers[i]] || 'Не ответил'}"
Правильный ответ: ${['А', 'Б', 'В', 'Г'][q.correctIndex]} - "${q.options[q.correctIndex]}"
Объяснение из кейса: "${q.explanation}"`
  )
  .join('\n\n---\n\n')}

Дай детальную обратную связь по каждому ответу. Будь конструктивным и обучающим.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    });

    let responseText = completion.choices[0]?.message?.content || '';
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let evaluation;
    try {
      evaluation = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        evaluation = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback evaluation
        const correctCount = answers.filter(
          (a: number, i: number) => a === clinicalCase.questions[i]?.correctIndex
        ).length;
        evaluation = {
          score: Math.round((correctCount / clinicalCase.questions.length) * 100),
          totalQuestions: clinicalCase.questions.length,
          correctAnswers: correctCount,
          feedback: clinicalCase.questions.map(
            (q: { options: string[]; correctIndex: number; explanation: string }, i: number) => ({
              questionIndex: i,
              correct: answers[i] === q.correctIndex,
              studentAnswer: q.options[answers[i]] || 'Не ответил',
              correctAnswer: q.options[q.correctIndex],
              explanation: q.explanation,
            })
          ),
          overallFeedback: `Правильных ответов: ${correctCount} из ${clinicalCase.questions.length}`,
          keyTakeaways: [],
          xpEarned: correctCount * 20,
        };
      }
    }

    return NextResponse.json({
      success: true,
      ...evaluation,
    });
  } catch (error) {
    console.error('Case evaluation error:', error);
    return NextResponse.json(
      { error: 'Ошибка при проверке ответов' },
      { status: 500 }
    );
  }
}
