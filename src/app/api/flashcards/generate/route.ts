import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
<<<<<<< HEAD
import { extractJSON } from '@/lib/json-utils';
=======
>>>>>>> de0ab19abee698d2801e84c865af020ca3e2ac23

const SYSTEM_PROMPT = `Ты — опытный профессор ветеринарной медицины, создающий обучающие карточки для студентов. ALL text in your response MUST be in Russian only.

Создавай карточки формата «термин ↔ определение» по ветеринарной медицине.

ПРАВИЛА:
- Все тексты — ТОЛЬКО на русском языке
- Термины должны быть точными ветеринарными терминами
- Определения должны быть чёткими, краткими и информативными (2-3 предложения)
- Примеры использования должны иллюстрировать практическое применение
- Карточки должны покрывать ключевые концепции темы
- Разный уровень сложности: от базовых понятий до продвинутых

ФОРМАТ ОТВЕТА — строго JSON:
{
  "flashcards": [
    {
      "id": "fc1",
      "term": "Термин на русском",
      "definition": "Определение термина...",
      "example": "Пример использования в клинической практике..."
    }
  ]
}

Верни ТОЛЬКО JSON без дополнительных комментариев.`;

<<<<<<< HEAD

=======
// --- Multi-strategy JSON extraction ---

function tryDirectParse(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function tryStripMarkdownFences(text: string): unknown | null {
  try {
    let cleaned = text
      .replace(/^```(?:json|JSON)?\s*\n?/gm, '')
      .replace(/\n?```\s*$/gm, '')
      .replace(/^```\s*/gm, '')
      .trim();
    if (cleaned !== text) {
      return JSON.parse(cleaned);
    }
  } catch {
    // fall through
  }
  return null;
}

function tryRegexExtract(text: string): unknown | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      // fall through
    }
  }
  return null;
}

function tryFixCommonIssues(text: string): unknown | null {
  try {
    let jsonStr = text;
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      jsonStr = match[0];
    }

    let fixed = jsonStr;
    fixed = fixed.replace(/,\s*([}\]])/g, '$1');
    fixed = fixed.replace(/(?<![\\])'/g, '"');

    return JSON.parse(fixed);
  } catch {
    return null;
  }
}

function extractJSON(text: string): unknown | null {
  const strategies = [
    tryDirectParse,
    tryStripMarkdownFences,
    tryRegexExtract,
    tryFixCommonIssues,
  ];

  for (const strategy of strategies) {
    const result = strategy(text);
    if (result !== null) return result;
  }
  return null;
}
>>>>>>> de0ab19abee698d2801e84c865af020ca3e2ac23

// --- Structure validation ---

interface Flashcard {
  id: string;
  term: string;
  definition: string;
  example?: string;
}

function validateAndFixFlashcards(data: any): Flashcard[] | null {
  try {
    if (!data || typeof data !== 'object') return null;

    let cards = data.flashcards;
    if (!Array.isArray(cards)) {
      // Maybe the whole object is an array
      if (Array.isArray(data)) {
        cards = data;
      } else {
        return null;
      }
    }

    if (cards.length === 0) return null;

    const validCards: Flashcard[] = [];
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      if (!c || typeof c !== 'object') continue;

      const validCard: Flashcard = {
        id: c.id || `fc${i + 1}`,
        term: typeof c.term === 'string' && c.term.trim() ? c.term.trim() : `Термин ${i + 1}`,
        definition: typeof c.definition === 'string' && c.definition.trim() ? c.definition.trim() : 'Определение недоступно.',
        example: typeof c.example === 'string' && c.example.trim() ? c.example.trim() : undefined,
      };
      validCards.push(validCard);
    }

    if (validCards.length === 0) return null;
    return validCards;
  } catch (error) {
    console.error('[flashcards/generate] Structure validation threw:', error);
    return null;
  }
}

// --- Static fallback flashcards ---

function getFallbackFlashcards(topic: string): Flashcard[] {
  return [
    { id: 'fc1', term: 'Саркоптоз', definition: 'Контагиозное паразитарное заболевание, вызываемое клещом Sarcoptes scabiei, характеризующееся сильным зудом и дерматитом.', example: 'У собаки наблюдается зуд и корки на локтях — подозрение на саркоптоз.' },
    { id: 'fc2', term: 'Дифференциальная диагностика', definition: 'Метод диагностики, основанный на последовательном исключении заболеваний со сходными клиническими признаками для определения истинной болезни.', example: 'При хромоте у собаки проводится дифференциальная диагностика между травмой, остеохондрозом и дисплазией.' },
    { id: 'fc3', term: 'Эозинофилия', definition: 'Увеличение количества эозинофилов в периферической крови выше нормы, часто свидетельствующее об аллергической реакции или паразитарной инвазии.', example: 'ОАК собаки показал эозинофилию 2800/мкл — это указывает на возможный паразитоз.' },
    { id: 'fc4', term: 'Пиодермия', definition: 'Бактериальная инфекция кожи, наиболее часто вызываемая Staphylococcus pseudintermedius у собак, проявляющаяся пустулами, папулами и корками.', example: 'У собаки обнаружены пустулы на животе — диагностирована поверхностная пиодермия.' },
    { id: 'fc5', term: 'MDR1-мутация', definition: 'Генетическая мутация гена MDR1, приводящая к повышенной чувствительности к ивермектину и другим препаратам. Встречается у колли, шелти, бобтейлов.', example: 'Перед назначением ивермектина колли необходимо проверить наличие MDR1-мутации.' },
    { id: 'fc6', term: 'МДР-1', definition: 'Белок множественной лекарственной устойчивости (P-glycoprotein), обеспечивающий защиту головного мозга от токсичных веществ. Мутация гена MDR1 приводит к нейротоксичности.', example: 'У собак с мутацией MDR1 ивермектин проникает через гематоэнцефалический барьер, вызывая нейротоксичность.' },
    { id: 'fc7', term: 'Атропин', definition: 'М-холинолитик, применяемый в ветеринарии для купирования бронхоспазма, уменьшения секреции слюнных желез и как антидот при отравлении фосфорорганическими веществами.', example: 'При отравлении собаки ФОС введён атропин в дозе 0.05 мг/кг.' },
    { id: 'fc8', term: 'Лапаротомия', definition: 'Хирургическая операция — вскрытие брюшной полости через разрез передней брюшной стенки для доступа к органам брюшной полости.', example: 'Проведена срединная лапаротомия для удаления инородного тела из кишечника собаки.' },
    { id: 'fc9', term: 'Копрология', definition: 'Метод лабораторной диагностики, заключающийся в исследовании фекалий на наличие яиц гельминтов, цист простейших и их личинок.', example: 'Копрологическое исследование выявило яйца токсокар у щенка.' },
    { id: 'fc10', term: 'Иммунопрофилактика', definition: 'Комплекс мероприятий по созданию искусственного иммунитета у животных с помощью вакцин и сывороток для профилактики инфекционных заболеваний.', example: 'По плану иммунопрофилактики щенку введена комплексная вакцина от чумы, парвовирусного энтерита и аденовироза.' },
  ];
}

// --- Main handler ---

export async function POST(req: NextRequest) {
  try {
    const { topic, subtopic, count = 10 } = await req.json();

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json(
        { error: 'Укажите тему для генерации карточек' },
        { status: 400 }
      );
    }

    const cardCount = Math.min(Math.max(count, 3), 20);

    const zai = await ZAI.create();

    const userPrompt = `Создай ${cardCount} обучающих карточек по ветеринарной медицине:
- Тема: ${topic}${subtopic ? `\n- Раздел: ${subtopic}` : ''}

Для каждой карточки укажи:
1. Термин — точный ветеринарный термин
2. Определение — чёткое и информативное (2-3 предложения)
3. Пример — пример использования в клинической практике

Карточки должны быть разнообразными по сложности. ПРАВИЛО: Весь текст — ТОЛЬКО на русском языке. Верни ТОЛЬКО JSON.`;

    // --- AI call with response_format attempt ---
    let responseText = '';

    try {
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        thinking: { type: 'disabled' },
        response_format: { type: 'json_object' } as any,
      });
      responseText = completion.choices[0]?.message?.content || '';
    } catch (formatError) {
      console.warn('[flashcards/generate] response_format not supported, retrying without it:', formatError);
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        thinking: { type: 'disabled' },
      });
      responseText = completion.choices[0]?.message?.content || '';
    }

    // --- Multi-strategy JSON extraction ---
    let parsed: unknown = extractJSON(responseText);

    if (parsed === null) {
      console.error('[flashcards/generate] All JSON parsing strategies failed. Raw response:');
      console.error('[flashcards/generate] RAW RESPONSE TEXT:', responseText.substring(0, 1000));
      const fallback = getFallbackFlashcards(topic);
      return NextResponse.json({ success: true, flashcards: fallback, isFallback: true });
    }

    // --- Validate structure ---
    const validated = validateAndFixFlashcards(parsed);
    if (validated === null) {
      console.error('[flashcards/generate] Structure validation failed for parsed JSON. Using fallback.');
      console.error('[flashcards/generate] PARSED (first 500 chars):', JSON.stringify(parsed).substring(0, 500));
      const fallback = getFallbackFlashcards(topic);
      return NextResponse.json({ success: true, flashcards: fallback, isFallback: true });
    }

    return NextResponse.json({
      success: true,
      flashcards: validated.slice(0, cardCount),
    });
  } catch (error) {
    console.error('[flashcards/generate] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Ошибка при генерации карточек' },
      { status: 500 }
    );
  }
}
