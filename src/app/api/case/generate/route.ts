import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

const SYSTEM_PROMPT = `Ты — опытный ветеринарный врач и преподаватель клинических дисциплин. Ты создаёшь реалистичные клинические случаи для обучения студентов ветеринарной медицины.

КРИТИЧЕСКИ ВАЖНО: ВСЕ тексты в ответе ДОЛЖНЫ быть ТОЛЬКО на русском языке. Никаких английских слов в вопросах, вариантах, объяснениях, описаниях.

Каждый клинический случай должен быть:
- Реалистичным и основанным на реальной практике
- Содержать достаточно информации для дифференциальной диагностики
- Включать лабораторные и инструментальные данные
- Иметь несколько вопросов разного типа

ФОРМАТ ОТВЕТА — строго JSON:
{
  "id": "case_${Date.now()}",
  "title": "Название кейса на русском",
  "species": "Вид животного на русском",
  "difficulty": "intermediate",
  "topic": "Тема на русском",
  "presentation": "Жалобы владельца и первичное обращение...",
  "history": "Анамнез заболевания...",
  "examination": "Результаты клинического осмотра...",
  "labResults": "Результаты лабораторных исследований...",
  "questions": [
    {
      "id": "cq1",
      "question": "Вопрос на русском...",
      "type": "diagnosis",
      "options": ["Вариант А", "Вариант Б", "Вариант В", "Вариант Г"],
      "correctIndex": 0,
      "explanation": "Подробное объяснение на русском..."
    }
  ]
}

Типы вопросов: diagnosis (диагноз), treatment (лечение), differential (дифференциальный диагноз), lab (лабораторные данные), prognosis (прогноз)

Уровни сложности:
- beginner: простые случаи, очевидная диагностика
- intermediate: требует дифференциальной диагностики
- advanced: сложные редкие случаи, множественные патологии

Все тексты — ТОЛЬКО на русском языке. Верни ТОЛЬКО JSON.`;

export async function POST(req: NextRequest) {
  try {
    const { species, difficulty = 'intermediate', topic } = await req.json();

    if (!species) {
      return NextResponse.json(
        { error: 'Укажите вид животного' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    const difficultyDescriptions: Record<string, string> = {
      beginner: 'простой клинический случай с очевидной диагностикой, подходящий для начинающих студентов',
      intermediate: 'клинический случай средней сложности, требующий дифференциальной диагностики и клинического мышления',
      advanced: 'сложный редкий клинический случай с множественными патологиями и нетипичным течением',
    };

    const userPrompt = `Создай уникальный клинический случай:
- Вид животного: ${species}
- Уровень сложности: ${difficulty} (${difficultyDescriptions[difficulty]})
${topic ? `- Тема: ${topic}` : ''}

Включи:
1. Подробное описание поступления (жалобы, история, осмотр)
2. Результаты лабораторных исследований
3. 4-5 вопросов разного типа (diagnosis, treatment, differential, lab, prognosis)
4. Для каждого вопроса — 4 варианта ответа и подробное объяснение

Кейс должен быть клинически достоверным и обучающим. ПРАВИЛО: Весь текст — ТОЛЬКО на русском языке. Верни ТОЛЬКО JSON.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    });

    let responseText = completion.choices[0]?.message?.content || '';
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let clinicalCase;
    try {
      clinicalCase = JSON.parse(responseText);
      // Ensure id exists
      if (!clinicalCase.id) {
        clinicalCase.id = `case_${Date.now()}`;
      }
      clinicalCase.createdAt = new Date().toISOString();
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        clinicalCase = JSON.parse(jsonMatch[0]);
        if (!clinicalCase.id) clinicalCase.id = `case_${Date.now()}`;
        clinicalCase.createdAt = new Date().toISOString();
      } else {
        return NextResponse.json(
          { error: 'Не удалось создать клинический случай. Попробуйте ещё раз.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      case: clinicalCase,
    });
  } catch (error) {
    console.error('Case generation error:', error);
    return NextResponse.json(
      { error: 'Ошибка при генерации кейса' },
      { status: 500 }
    );
  }
}
