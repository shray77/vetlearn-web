import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

const SYSTEM_PROMPT = `Ты — опытный ветеринарный врач, создающий сценарии для интерактивного симулятора ветеринарной практики. Студент будет виртуально осматривать животное, назначать анализы и ставить диагноз.

Ты создаёшь СКРЫТУЮ информацию — студент должен сам обнаружить находки, выбирая инструменты и области тела для осмотра.

КРИТИЧЕСКИ ВАЖНО: ВСЕ тексты в ответе ДОЛЖНЫ быть ТОЛЬКО на русском языке. Никаких английских слов в текстах.

ФОРМАТ ОТВЕТА — строго JSON:
{
  "id": "sim_${Date.now()}",
  "species": "вид животного",
  "breed": "порода",
  "age": "возраст",
  "sex": "пол",
  "weight": "вес",
  "difficulty": "beginner|intermediate|advanced",
  "topic": "тема заболевания",
  "ownerComplaint": "жалоба владельца (1-2 предложения от первого лица)",
  "correctDiagnosis": "точный диагноз",
  "diagnosisOptions": ["правильный диагноз", "похожий диагноз 1", "похожий диагноз 2", "неправильный диагноз"],
  "treatmentPlan": "правильный план лечения (подробно)",
  "treatmentOptions": ["правильное лечение", "частично правильное 1", "неправильное 1", "неправильное 2"],
  "findings": [
    {
      "region": "head|neck|thorax|abdomen|skin|front_legs|hind_legs|tail",
      "toolId": "inspection|stethoscope|thermometer|palpation|otoscope|ophthalmoscope|percussion|skin_scrape",
      "finding": "что обнаруживает ветеринар при этом исследовании (подробно, 1-2 предложения)",
      "isNormal": false,
      "relevance": "critical|important|minor"
    }
  ],
  "availableTests": [
    {
      "id": "cbc",
      "name": "ОАК (общий анализ крови)",
      "icon": "🩸",
      "cost": 800,
      "category": "blood",
      "result": "результат анализа (подробно)",
      "isRevealed": false
    }
  ],
  "budget": 6000,
  "xpReward": 75,
  "anamnesisQuestions": [
    { "question": "Когда начались симптомы?", "answer": "Ответ владельца..." },
    { "question": "Изменился ли аппетит?", "answer": "Ответ владельца..." }
  ]
}

ВАЖНЫЕ ПРАВИЛА:
1. Создай 12-18 находок (findings) для разных комбинаций region + tool
2. Хотя бы 6-8 находок должны быть НЕНОРМАЛЬНЫМИ (isNormal: false)
3. Хотя бы 3-4 находки должны быть КРИТИЧЕСКИМИ (relevance: "critical") для постановки диагноза
4. Некоторые комбинации region + tool могут показать норму (isNormal: true) — это тоже полезно для дифференциальной диагностики
5. Создай 5-8 лабораторных тестов с реальными результатами (include the "result" field)
6. Стоимость тестов реалистичная (в рублях)
7. Бюджет: beginner=8000, intermediate=6000, advanced=4000
8. Включи хотя бы 1-2 теста, которые НЕ нужны для диагноза (чтобы проверить экономность)
9. Все тексты ТОЛЬКО на русском языке
10. Варианты диагноза должны быть правдоподобными (реальные заболевания данного вида)
11. Диагноз и лечение должны быть клинически достоверными
12. Создай 6-8 вопросов для анамнеза (anamnesisQuestions) — вопросы, которые студент может задать владельцу

Доступные инструменты: inspection (осмотр), stethoscope (стетоскоп), thermometer (термометр), palpation (пальпация), otoscope (отоскоп), ophthalmoscope (офтальмоскоп), percussion (перкуссия), skin_scrape (соскоб кожи)

Доступные области тела: head (голова), neck (шея), thorax (грудная клетка), abdomen (живот), skin (кожа/шерсть), front_legs (передние лапы), hind_legs (задние лапы), tail (хвост)

Верни ТОЛЬКО JSON.`;

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

// --- Structure validation ---

interface ExaminationFinding {
  region: string;
  toolId: string;
  finding: string;
  isNormal: boolean;
  relevance: 'critical' | 'important' | 'minor';
}

interface LabTest {
  id: string;
  name: string;
  icon: string;
  cost: number;
  category: string;
  result?: string;
  isRevealed: boolean;
}

interface SimulatorScenario {
  id: string;
  species: string;
  breed: string;
  age: string;
  sex: string;
  weight: string;
  difficulty: string;
  topic: string;
  ownerComplaint: string;
  correctDiagnosis: string;
  diagnosisOptions: string[];
  treatmentPlan: string;
  treatmentOptions: string[];
  findings: ExaminationFinding[];
  availableTests: LabTest[];
  budget: number;
  xpReward: number;
  anamnesisQuestions?: { question: string; answer: string }[];
}

function validateAndFixScenario(data: any): SimulatorScenario | null {
  try {
    const s = data as any;

    // Ensure required fields
    if (!s.species || typeof s.species !== 'string') s.species = 'собаки';
    if (!s.breed || typeof s.breed !== 'string') s.breed = 'Беспородная';
    if (!s.age || typeof s.age !== 'string') s.age = '3 года';
    if (!s.sex || typeof s.sex !== 'string') s.sex = 'самец';
    if (!s.weight || typeof s.weight !== 'string') s.weight = '15 кг';
    if (!s.difficulty || typeof s.difficulty !== 'string') s.difficulty = 'intermediate';
    if (!s.topic || typeof s.topic !== 'string') s.topic = 'Терапия';
    if (!s.ownerComplaint || typeof s.ownerComplaint !== 'string') s.ownerComplaint = 'Животное плохо себя чувствует.';
    if (!s.correctDiagnosis || typeof s.correctDiagnosis !== 'string') s.correctDiagnosis = 'Неопределённый диагноз';
    if (!s.treatmentPlan || typeof s.treatmentPlan !== 'string') s.treatmentPlan = 'Симптоматическая терапия';
    if (!s.id) s.id = `sim_${Date.now()}`;

    // Validate diagnosis options
    if (!Array.isArray(s.diagnosisOptions) || s.diagnosisOptions.length < 2) {
      s.diagnosisOptions = [s.correctDiagnosis, 'Неопределённый диагноз 1', 'Неопределённый диагноз 2', 'Неопределённый диагноз 3'];
    }
    // Ensure correct diagnosis is first
    if (s.diagnosisOptions[0] !== s.correctDiagnosis) {
      s.diagnosisOptions = [s.correctDiagnosis, ...s.diagnosisOptions.filter((d: string) => d !== s.correctDiagnosis)].slice(0, 4);
    }

    // Validate treatment options
    if (!Array.isArray(s.treatmentOptions) || s.treatmentOptions.length < 2) {
      s.treatmentOptions = [s.treatmentPlan, 'Симптоматическая терапия', 'Хирургическое вмешательство', 'Наблюдение'];
    }

    // Validate findings
    if (!Array.isArray(s.findings) || s.findings.length < 3) {
      console.error('[simulator/generate] Validation failed: not enough findings');
      return null;
    }
    s.findings = s.findings.map((f: any, i: number) => ({
      region: typeof f.region === 'string' ? f.region : 'thorax',
      toolId: typeof f.toolId === 'string' ? f.toolId : 'inspection',
      finding: typeof f.finding === 'string' ? f.finding : 'Нет данных',
      isNormal: typeof f.isNormal === 'boolean' ? f.isNormal : false,
      relevance: ['critical', 'important', 'minor'].includes(f.relevance) ? f.relevance : 'minor',
    }));

    // Validate lab tests
    if (!Array.isArray(s.availableTests) || s.availableTests.length < 2) {
      s.availableTests = [
        { id: 'cbc', name: 'ОАК', icon: '🩸', cost: 800, category: 'blood', result: 'В пределах нормы', isRevealed: false },
        { id: 'biochemistry', name: 'Биохимия крови', icon: '🧪', cost: 1500, category: 'blood', result: 'В пределах нормы', isRevealed: false },
      ];
    } else {
      s.availableTests = s.availableTests.map((t: any, i: number) => ({
        id: t.id || `test_${i}`,
        name: typeof t.name === 'string' ? t.name : `Тест ${i + 1}`,
        icon: typeof t.icon === 'string' ? t.icon : '🔬',
        cost: typeof t.cost === 'number' ? t.cost : 1000,
        category: ['blood', 'imaging', 'microscopy', 'other'].includes(t.category) ? t.category : 'other',
        result: typeof t.result === 'string' ? t.result : 'Результат недоступен',
        isRevealed: false,
      }));
    }

    // Budget and XP
    const budgetMap: Record<string, number> = { beginner: 8000, intermediate: 6000, advanced: 4000 };
    if (typeof s.budget !== 'number' || s.budget <= 0) s.budget = budgetMap[s.difficulty] || 6000;
    if (typeof s.xpReward !== 'number' || s.xpReward <= 0) s.xpReward = 75;

    // Anamnesis questions
    if (!Array.isArray(s.anamnesisQuestions) || s.anamnesisQuestions.length === 0) {
      s.anamnesisQuestions = [
        { question: 'Когда начались симптомы?', answer: 'Около 3 дней назад.' },
        { question: 'Изменился ли аппетит?', answer: 'Аппетит снижен.' },
        { question: 'Есть ли рвота или диарея?', answer: 'Нет.' },
        { question: 'Изменилась ли активность?', answer: 'Животное вялое, меньше двигается.' },
        { question: 'Были ли прививки?', answer: 'Прививки по графику.' },
        { question: 'Обрабатывали ли от паразитов?', answer: 'Обработка была 2 месяца назад.' },
      ];
    } else {
      s.anamnesisQuestions = s.anamnesisQuestions.slice(0, 10).map((q: any) => ({
        question: typeof q.question === 'string' ? q.question : 'Вопрос?',
        answer: typeof q.answer === 'string' ? q.answer : 'Ответ недоступен.',
      }));
    }

    return s as SimulatorScenario;
  } catch (error) {
    console.error('[simulator/generate] Structure validation threw:', error);
    return null;
  }
}

// --- Static fallback scenario ---

function getFallbackScenario(): SimulatorScenario {
  return {
    id: `sim_${Date.now()}`,
    species: 'собаки',
    breed: 'Немецкая овчарка',
    age: '5 лет',
    sex: 'самец',
    weight: '32 кг',
    difficulty: 'intermediate',
    topic: 'Паразитология',
    ownerComplaint: 'Рекс стал очень вялым, отказывается от еды, моча стала тёмного цвета. Это началось два дня назад после прогулки в лесу.',
    correctDiagnosis: 'Бабезиоз (пироплазмоз)',
    diagnosisOptions: [
      'Бабезиоз (пироплазмоз)',
      'Лептоспироз',
      'Инфекционный гепатит',
      'Острый гломерулонефрит',
    ],
    treatmentPlan: 'Показана специфическая терапия имидокарб дипропионатом (Имизол) в дозе 0,5 мл/10 кг двукратно с интервалом 24 часа. Симптоматическая терапия: инфузионная терапия (физраствор + глюкоза), гепатопротекторы, витамины группы B. При тяжёлой анемии — переливание крови.',
    treatmentOptions: [
      'Имизол + инфузионная терапия + гепатопротекторы',
      'Антибиотики широкого спектра (цефтриаксон)',
      'Преднизолон и антигистаминные препараты',
      'Только симптоматическая терапия (инфузии)',
    ],
    findings: [
      { region: 'head', toolId: 'inspection', finding: 'Слизистые оболочки бледные, с жёлтушным оттенком. Видимые слизистые анемичные.', isNormal: false, relevance: 'critical' },
      { region: 'head', toolId: 'ophthalmoscope', finding: 'Конъюнктивы бледные, желтушные. Зрачки реагируют на свет нормально.', isNormal: false, relevance: 'critical' },
      { region: 'thorax', toolId: 'stethoscope', finding: 'Тоны сердца приглушены, тахикардия (140 уд/мин). Дыхание жёсткое, хрипов нет.', isNormal: false, relevance: 'important' },
      { region: 'abdomen', toolId: 'thermometer', finding: 'Температура тела 40,2°C (повышена).', isNormal: false, relevance: 'critical' },
      { region: 'abdomen', toolId: 'palpation', finding: 'Печень увеличена, при пальпации животное реагирует болезненно. Селезёнка увеличена.', isNormal: false, relevance: 'important' },
      { region: 'abdomen', toolId: 'percussion', finding: 'Тупой звук в области проекции печени.', isNormal: false, relevance: 'minor' },
      { region: 'skin', toolId: 'inspection', finding: 'Кожный покров бледный. Обнаружен присосавшийся клещ в области шеи (Ixodes ricinus).', isNormal: false, relevance: 'critical' },
      { region: 'skin', toolId: 'palpation', finding: 'Лимфоузлы (подчелюстные, паховые) увеличены, безболезненны.', isNormal: false, relevance: 'important' },
      { region: 'front_legs', toolId: 'inspection', finding: 'Видимых изменений нет. Суставы в норме.', isNormal: true, relevance: 'minor' },
      { region: 'front_legs', toolId: 'palpation', finding: 'Пальпация безболезненна, сустав подвижен.', isNormal: true, relevance: 'minor' },
      { region: 'hind_legs', toolId: 'inspection', finding: 'Видимых изменений нет.', isNormal: true, relevance: 'minor' },
      { region: 'hind_legs', toolId: 'palpation', finding: 'При пальпации безболезненно.', isNormal: true, relevance: 'minor' },
      { region: 'tail', toolId: 'inspection', finding: 'Видимых изменений нет.', isNormal: true, relevance: 'minor' },
      { region: 'neck', toolId: 'inspection', finding: 'Обнаружен присосавшийся клещ в области шеи.', isNormal: false, relevance: 'critical' },
      { region: 'neck', toolId: 'palpation', finding: 'Лимфоузлы увеличены до 1,5 см, эластичные, безболезненные.', isNormal: false, relevance: 'important' },
    ],
    availableTests: [
      { id: 'cbc', name: 'ОАК (общий анализ крови)', icon: '🩸', cost: 800, category: 'blood', result: 'Эритроциты: 3,2×10¹²/л (норма 5,5-8,5). Гемоглобин: 72 г/л (норма 120-180). Гематокрит: 22% (норма 37-55). Лейкоциты: 18,5×10⁹/л (лейкоцитоз). Тромбоциты: 95×10⁹/л (снижены). Выявлены внутриэритроцитарные включения — пироплазмы.', isRevealed: false },
      { id: 'biochemistry', name: 'Биохимия крови', icon: '🧪', cost: 1500, category: 'blood', result: 'Общий билирубин: 48 мкмоль/л (норма до 15). Прямой билирубин: 32 мкмоль/л. АЛТ: 180 ЕД/л (норма до 40). АСТ: 210 ЕД/л (норма до 40). Мочевина: 18 ммоль/л (повышена). Креатинин: 145 мкмоль/л (повышен).', isRevealed: false },
      { id: 'blood_smear', name: 'Мазок крови (бабезиоз)', icon: '🔬', cost: 600, category: 'microscopy', result: 'В мазке крови обнаружены внутриэритроцитарные паразиты — Babesia canis. Поражено около 15% эритроцитов. Глыбки Шюффнера положительны.', isRevealed: false },
      { id: 'urinalysis', name: 'Анализ мочи', icon: '🧫', cost: 500, category: 'other', result: 'Цвет тёмно-коричневый. Прозрачность: мутная. Белок: 1,5 г/л (повышен). Билирубин: положительно. Уробилиноген: повышен. Осадок: единичные эритроциты, цилиндры.', isRevealed: false },
      { id: 'xray', name: 'Рентген грудной клетки', icon: '📸', cost: 2000, category: 'imaging', result: 'Сердце несколько увеличено. Сосудистый рисунок усилен. Лёгочные поля без инфильтративных изменений. Размеры печени и селезёнки увеличены.', isRevealed: false },
      { id: 'ultrasound', name: 'УЗИ брюшной полости', icon: '📡', cost: 1800, category: 'imaging', result: 'Печень увеличена, эхогенность снижена, структура неоднородная. Жёлчный пузырь увеличен, стенки утолщены. Селезёнка увеличена до 7,5 см. Почки: корковый слой диффузно изменён.', isRevealed: false },
      { id: 'coagulation', name: 'Коагулограмма', icon: '💧', cost: 1200, category: 'blood', result: 'Протромбиновое время: 14 сек (норма). АЧТВ: 28 сек (норма). Фибриноген: 1,2 г/л (снижен). D-димер: положительный.', isRevealed: false },
    ],
    budget: 6000,
    xpReward: 75,
    anamnesisQuestions: [
      { question: 'Когда появились первые симптомы?', answer: 'Два дня назад. До этого Рекс был абсолютно здоров.' },
      { question: 'Гуляли ли на природе недавно?', answer: 'Да, были на даче три дня назад. Гуляли по лесу, много кустарников.' },
      { question: 'Обрабатывали ли от клещей?', answer: 'Обрабатывали каплями на холку, но последний раз был месяц назад — уже заканчивалось действие.' },
      { question: 'Изменился ли цвет мочи?', answer: 'Да! Вчера заметил, что моча стала тёмная, почти коричневая.' },
      { question: 'Ест ли собака?', answer: 'Совсем отказывается от еды, пьёт только воду.' },
      { question: 'Есть ли рвота?', answer: 'Была один раз сегодня утром, жёлтая пенка.' },
      { question: 'Привит ли Рекс?', answer: 'Прививки делаем по графику — от чумы, парвовируса и т.д.' },
      { question: 'Были ли похожие эпизоды раньше?', answer: 'Нет, никогда такого не было.' },
    ],
  };
}

// --- Main handler ---

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
      intermediate: 'клинический случай средней сложности, требующий дифференциальной диагностики',
      advanced: 'сложный клинический случай с нетипичным течением и множественными патологиями',
    };

    const userPrompt = `Создай уникальный сценарий для интерактивного симулятора ветеринарной практики:
- Вид животного: ${species}
- Уровень сложности: ${difficulty} (${difficultyDescriptions[difficulty]})
${topic ? `- Тема: ${topic}` : ''}

Обязательно включи:
1. Подробную жалобу владельца (от первого лица)
2. 12-18 находок для комбинаций tool+region (хотя бы 6 ненормальных, 3 критических)
3. 5-8 лабораторных тестов с результатами и стоимостью
4. 4 варианта диагноза (первый — правильный)
5. 4 варианта лечения (первый — правильный)
6. 6-8 вопросов для анамнеза с ответами владельца
7. Бюджет: beginner=8000, intermediate=6000, advanced=4000

Все тексты — ТОЛЬКО на русском языке. Верни ТОЛЬКО JSON.`;

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
      console.warn('[simulator/generate] response_format not supported, retrying without it:', formatError);
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
      console.error('[simulator/generate] All JSON parsing strategies failed. Raw response:');
      console.error('[simulator/generate] RAW RESPONSE TEXT:', responseText.substring(0, 1000));
      const fallback = getFallbackScenario();
      return NextResponse.json({ success: true, scenario: fallback, isFallback: true });
    }

    // --- Validate structure ---
    const validated = validateAndFixScenario(parsed);
    if (validated === null) {
      console.error('[simulator/generate] Structure validation failed for parsed JSON. Using fallback.');
      const fallback = getFallbackScenario();
      return NextResponse.json({ success: true, scenario: fallback, isFallback: true });
    }

    return NextResponse.json({
      success: true,
      scenario: validated,
    });
  } catch (error) {
    console.error('[simulator/generate] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Ошибка при генерации сценария' },
      { status: 500 }
    );
  }
}
