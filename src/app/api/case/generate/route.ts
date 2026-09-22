import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getZAI } from '@/lib/zai';
import { extractJSON } from '@/lib/json-utils';
import { getTrackPromptContext } from '@/lib/tracks';
import { parseBody, safeEnum, optionalLimitedString } from '@/lib/api-validation';
import type { SpecializationTrack } from '@/lib/types';

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

// --- Structure validation ---

interface CaseQuestion {
  id: string;
  question: string;
  type: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty?: string;
}

interface ClinicalCase {
  id: string;
  title: string;
  species: string;
  difficulty: string;
  topic: string;
  presentation: string;
  history: string;
  examination: string;
  labResults?: string;
  questions: CaseQuestion[];
  createdAt?: string;
}

function validateAndFixCase(data: any): ClinicalCase | null {
  try {
    const c = data as any;

    // Ensure required top-level fields exist
    if (!c.title || typeof c.title !== 'string') c.title = 'Клинический случай';
    if (!c.species || typeof c.species !== 'string') c.species = 'неизвестно';
    if (!c.difficulty || typeof c.difficulty !== 'string') c.difficulty = 'intermediate';
    if (!c.topic || typeof c.topic !== 'string') c.topic = 'Общая практика';
    if (!c.presentation || typeof c.presentation !== 'string') c.presentation = 'Описание недоступно.';
    if (!c.history || typeof c.history !== 'string') c.history = 'Анамнез недоступен.';
    if (!c.examination || typeof c.examination !== 'string') c.examination = 'Данные осмотра недоступны.';

    // Validate questions
    if (!Array.isArray(c.questions) || c.questions.length === 0) {
      console.error('[case/generate] Validation failed: questions is empty or not an array');
      return null;
    }

    const validQuestions: CaseQuestion[] = [];
    for (let i = 0; i < c.questions.length; i++) {
      const q = c.questions[i];
      if (!q || typeof q.question !== 'string') continue;

      // P2: финальный массив опций считается заранее — с капом длины строк
      // и количества вариантов (объект-опции приводятся к строке).
      const finalOptions: string[] = (Array.isArray(q.options) && q.options.length >= 2
        ? q.options.map((opt: unknown) => {
            if (typeof opt === 'string') return opt;
            if (opt && typeof opt === 'object') {
              const obj = opt as Record<string, unknown>;
              if (typeof obj.text === 'string') return obj.text;
              if (typeof obj.value === 'string') return obj.value;
              if (typeof obj.label === 'string') return obj.label;
              if (typeof obj.answer === 'string') return obj.answer;
              const jsonStr = JSON.stringify(opt);
              return jsonStr.length > 100 ? `Вариант ${String.fromCharCode(1040 + validQuestions.length)}` : jsonStr;
            }
            return String(opt);
          })
        : ['Вариант А', 'Вариант Б', 'Вариант В', 'Вариант Г']
      ).slice(0, 6).map((s: string) => s.slice(0, 300));

      const validQ: CaseQuestion = {
        id: q.id || `cq${i + 1}`,
        question: q.question,
        type: q.type || 'diagnosis',
        options: finalOptions,
        // P2-фикс: раньше correctIndex валидировался против ИСХОДНОГО q.options,
        // а финальный массив мог быть дефолтным (4 шт.) — индекс оставался
        // за пределами и вопрос терял верный ответ. Теперь считаем
        // финальный массив ПЕРЕД проверкой индекса.
        correctIndex: typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < finalOptions.length
          ? q.correctIndex
          : 0,
        explanation: typeof q.explanation === 'string' ? q.explanation : 'Объяснение недоступно.',
        difficulty: q.difficulty || c.difficulty,
      };
      validQuestions.push(validQ);
    }

    if (validQuestions.length === 0) {
      console.error('[case/generate] Validation failed: no valid questions after filtering');
      return null;
    }

    c.questions = validQuestions;
    if (!c.id) c.id = `case_${Date.now()}`;
    c.createdAt = new Date().toISOString();

    return c as ClinicalCase;
  } catch (error) {
    console.error('[case/generate] Structure validation threw:', error);
    return null;
  }
}

// --- Static fallback case ---

function getFallbackCase(): ClinicalCase {
  return {
    id: `case_${Date.now()}`,
    title: "Хронический дерматит у собаки",
    species: "собаки",
    difficulty: "intermediate",
    topic: "Дерматология",
    presentation: "Собака породы немецкая овчарка, 5 лет, владельцы отмечают зуд и покраснение кожи в области живота и паховых складок в течение 2 месяцев",
    history: "Зуд прогрессирует, собака постоянно чешется. Ранее лечили антигистаминными препаратами без эффекта. Корм не меняли. Проводили обработку от блох 1 месяц назад.",
    examination: "Эритема и папулёзная сыпь в области живота, паховых складок, подмышечных впадин. Корки на локтях. Лимфоузлы увеличены. Температура 38.8°C.",
    labResults: "ОАК: эозинофилия 2800/мкл (норма до 1200). Соскоб кожи: обнаружены клещи Sarcoptes scabiei. Бакпосев: рост Staphylococcus pseudintermedius.",
    questions: [
      {
        id: "cq1",
        question: "Какой диагноз наиболее вероятен на основании анамнеза и результатов обследования?",
        type: "diagnosis",
        options: ["Саркоптоз с вторичной пиодермией", "Атопический дерматит", "Пищевая аллергия", "Дерматофития"],
        correctIndex: 0,
        explanation: "Обнаружение клещей Sarcoptes scabiei в соскобе кожи подтверждает диагноз саркоптоза. Эозинофилия и рост Staphylococcus pseudintermedius указывают на вторичную пиодермию.",
        difficulty: "intermediate"
      },
      {
        id: "cq2",
        question: "Какой препарат выбора для лечения саркоптоза у собак?",
        type: "treatment",
        options: ["Амитраз (препарат для обработки кожи)", "Ивермектин (подкожно или перорально)", "Гризеофульвин (перорально)", "Кетоконазол (перорально)"],
        correctIndex: 1,
        explanation: "Ивермектин — препарат выбора при саркоптозе. Применяется подкожно или перорально в дозе 0.2-0.3 мг/кг с интервалом 10-14 дней, курс 3-4 инъекции. Амитраз менее эффективен при генерализованной форме.",
        difficulty: "intermediate"
      },
      {
        id: "cq3",
        question: "Какое дополнительное лечение необходимо для вторичной бактериальной пиодермии?",
        type: "treatment",
        options: ["Противогрибковые препараты", "Антибиотики чувствительного штамма на 3-4 недели", "Глюкокортикоиды системно", "Иммуносупрессоры"],
        correctIndex: 1,
        explanation: "При вторичной пиодермии необходимы антибиотики, к которым чувствителен выделенный штамм Staphylococcus pseudintermedius. Курс длительный — 3-4 недели, продолжают ещё 7-10 дней после клинического выздоровления.",
        difficulty: "intermediate"
      },
      {
        id: "cq4",
        question: "Какое осложнение может возникнуть при назначении ивермектина собакам некоторых пород?",
        type: "lab",
        options: ["Гепатотоксичность", "Нейротоксичность (MLR-мутация)", "Нефротоксичность", "Кардиотоксичность"],
        correctIndex: 1,
        explanation: "У собак с мутацией гена MDR1 (породы колли, бобтейл, шелти и др.) ивермектин может вызвать тяжёлую нейротоксичность — депрессию, атаксию, миоклонус, кому. Поэтому перед назначением рекомендуется тест на MDR1 или использование альтернативных препаратов.",
        difficulty: "advanced"
      }
    ],
    createdAt: new Date().toISOString(),
  };
}

// --- Main handler ---

export async function POST(req: NextRequest) {
  try {
    // Zod-валидация (P2): species раньше не проверялся ни на тип, ни на размер —
    // мегабайтная строка свободно уезжала в промпт.
    const Body = z.object({
      species: z.string().trim().min(1).max(100),
      difficulty: safeEnum(['beginner', 'intermediate', 'advanced'] as const, 'intermediate'),
      topic: optionalLimitedString(2000),
      track: optionalLimitedString(50),
      history: z.array(z.record(z.string(), z.unknown())).max(40).catch([]),
    });
    const parsedInput = await parseBody(req, Body);
    if (!parsedInput.ok) return parsedInput.response;
    const { species, difficulty, topic, track } = parsedInput.data;
    const trackContext = getTrackPromptContext(track as SpecializationTrack | undefined);

    const zai = await getZAI();

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

    // --- AI call ---
    let responseText = '';
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT + (trackContext ? '\n\nКОНТЕКСТ СПЕЦИАЛИЗАЦИИ СТУДЕНТА:\n' + trackContext : '') },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 8192,
    });
    responseText = completion.choices[0]?.message?.content || '';

    // --- Multi-strategy JSON extraction ---
    let parsed: unknown = extractJSON(responseText);

    if (parsed === null) {
      console.error('[case/generate] All JSON parsing strategies failed. Raw response:');
      console.error('[case/generate] RAW RESPONSE TEXT:', responseText.substring(0, 1000));
      // Return fallback case instead of error
      const fallback = getFallbackCase();
      return NextResponse.json({ success: true, case: fallback, isFallback: true });
    }

    // --- Validate structure ---
    const validated = validateAndFixCase(parsed);
    if (validated === null) {
      console.error('[case/generate] Structure validation failed for parsed JSON. Using fallback.');
      console.error('[case/generate] PARSED (first 500 chars):', JSON.stringify(parsed).substring(0, 500));
      const fallback = getFallbackCase();
      return NextResponse.json({ success: true, case: fallback, isFallback: true });
    }

    return NextResponse.json({
      success: true,
      case: validated,
    });
  } catch (error) {
    console.error('[case/generate] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Ошибка при генерации кейса' },
      { status: 500 }
    );
  }
}
