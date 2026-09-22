import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getZAI } from '@/lib/zai';
import { extractJSON } from '@/lib/json-utils';
import { getTrackPromptContext } from '@/lib/tracks';
import { parseBody, safeEnum, clampedInt, optionalLimitedString } from '@/lib/api-validation';
import type { SpecializationTrack } from '@/lib/types';

const SYSTEM_PROMPT = `Ты — профессор ветеринарной медицины с 30-летним опытом преподавания. Ты создаёшь адаптивные тестовые вопросы для студентов ветеринарных вузов.

КРИТИЧЕСКИ ВАЖНЫЕ ПРАВИЛА:
- ВСЕ тексты ДОЛЖНЫ быть ТОЛЬКО на русском языке — вопросы, варианты ответов, объяснения, названия тем
- НЕ используй английский язык нигде в ответе, даже в терминах где есть русский эквивалент
- Вопросы должны быть клинически точными и соответствовать современной ветеринарной практике
- Каждый вопрос должен иметь 4 варианта ответа (А, Б, В, Г)
- Варианты должны быть правдоподобными, только один правильный
- Уровень сложности: beginner (базовые знания), intermediate (клиническое мышление), advanced (сложные случаи)

ФОРМАТ ОТВЕТА — строго JSON массив:
[
  {
    "id": "q1",
    "topicId": "pharmacology",
    "topicName": "Фармакология",
    "question": "Текст вопроса на русском...",
    "options": ["Вариант А", "Вариант Б", "Вариант В", "Вариант Г"],
    "correctIndex": 0,
    "explanation": "Подробное объяснение на русском...",
    "difficulty": "beginner"
  }
]

Не добавляй markdown обрамление. Возвращай чистый JSON. Весь контент — ТОЛЬКО на русском языке.`;

export async function POST(req: NextRequest) {
  try {
    // Zod-валидация (P2): count клампится 1..50 (раньше любой number/string уходил в промпт),
    // темы — строго {id, name} с лимитами, difficulty — whitelist.
    const Body = z.object({
      topics: z.array(z.object({
        id: z.string().max(100),
        name: z.string().max(200),
      })).min(1).max(20),
      difficulty: safeEnum(['beginner', 'intermediate', 'advanced', 'expert'] as const, 'intermediate'),
      count: clampedInt(1, 50, 10),
      track: optionalLimitedString(50),
    });
    const parsed = await parseBody(req, Body);
    if (!parsed.ok) return parsed.response;
    const { topics: validTopics, difficulty, count, track } = parsed.data;
    const trackContext = getTrackPromptContext(track as SpecializationTrack | undefined);

    const zai = await getZAI();

    const topicList = validTopics
      .map((t) => `${t.name} (${t.id})`)
      .join(', ');

    const difficultyMap: Record<string, string> = {
      beginner: 'начинающий — базовые теоретические знания',
      intermediate: 'средний — клиническое мышление и применение знаний',
      advanced: 'продвинутый — сложные клинические ситуации, дифференциальная диагностика',
      expert: 'экспертный — нестандартные случаи, междисциплинарные связи, научные аспекты',
    };

    const userPrompt = `Сгенерируй ${count} тестовых вопросов по темам: ${topicList}.
Уровень сложности: ${difficultyMap[difficulty] || difficultyMap.intermediate}.
Распредели вопросы равномерно по указанным темам.

Для каждого вопроса укажи:
- Уникальный id (q1, q2, ...)
- topicId (из списка тем)
- topicName (название темы на русском)
- question (текст вопроса на русском языке)
- options (массив из 4 вариантов ответа на русском языке)
- correctIndex (индекс правильного ответа, 0-3)
- explanation (объяснение на русском языке)
- difficulty (уровень: beginner/intermediate/advanced)

ПРАВИЛО: Весь текст в ответе должен быть ТОЛЬКО на русском языке. Никаких английских слов в вопросах, вариантах и объяснениях.
Верни ТОЛЬКО JSON массив, без markdown.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT + (trackContext ? '\n\nКОНТЕКСТ СПЕЦИАЛИЗАЦИИ СТУДЕНТА:\n' + trackContext : '') },
        { role: 'user', content: userPrompt },
      ],
    });

    let responseText = completion.choices[0]?.message?.content || '';
    // Clean markdown code blocks if present
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Use the shared multi-strategy JSON extractor — never throws.
    const questions = extractJSON(responseText);
    if (!Array.isArray(questions)) {
      return NextResponse.json(
        { error: 'Не удалось обработать ответ AI. Попробуйте ещё раз.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      questions,
      totalQuestions: questions.length,
    });
  } catch (error) {
    console.error('Assessment generation error:', error);
    return NextResponse.json(
      { error: 'Ошибка при генерации теста. Попробуйте ещё раз.' },
      { status: 500 }
    );
  }
}
