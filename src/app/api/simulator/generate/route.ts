import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

const SYSTEM_PROMPT = `Ты — опытный ветеринарный врач, создающий сценарии для интерактивного симулятора ветеринарной практики. Студент будет виртуально осматривать животное, назначать анализы и ставить диагноз.

Ты создаёшь СКРЫТУЮ информацию — студент должен сам обнаружить находки, выбирая инструменты и области тела для осмотра.

КРИТИЧЕСКИ ВАЖНО: ВСЕ тексты в ответе ДОЛЖНЫ быть ТОЛЬКО на русском языке. ЗАПРЕЩЕНО использовать английские слова, даже медицинские термины. Пиши по-русски: не "CBC" — "ОАК", не "X-ray" — "рентгенография", не "ultrasound" — "УЗИ", не "CT" — "КТ", не "findings" — "результаты", не "reveals" — "показывает", не "treatment" — "лечение", не "diagnosis" — "диагноз", не "patient" — "пациент". Если напишешь хоть одно английское слово — это грубая ошибка.

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
13. НЕ используй babезиоз/пироплазмоз если вид — собаки (выбери другое заболевание). Каждый раз создавай УНИКАЛЬНЫЙ сценарий!

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

// --- Multiple Fallback Scenarios ---

const FALLBACK_SCENARIOS: (() => SimulatorScenario)[] = [
  // 1. Dog - Parvovirus enteritis
  () => ({
    id: `sim_${Date.now()}`,
    species: 'собаки',
    breed: 'Лабрадор-ретривер',
    age: '4 месяца',
    sex: 'самец',
    weight: '12 кг',
    difficulty: 'beginner',
    topic: 'Инфекционные заболевания',
    ownerComplaint: 'Барни перестал есть вчера, сегодня началась сильная рвота и понос с кровью. Он совсем слабый и не встаёт.',
    correctDiagnosis: 'Парвовирусный энтерит',
    diagnosisOptions: [
      'Парвовирусный энтерит',
      'Коронавирусный энтерит',
      'Панлейкопения',
      'Острый гастрит',
    ],
    treatmentPlan: 'Инфузионная терапия (коллоиды + кристаллоиды), противорвотные (ондансетрон, метоклопрамид), антибиотики широкого спектра (цефтриаксон), гипериммунная сыворотка, гастропротекторы. Диета NPO, затем постепенный перевод на легкоусвояемую пищу.',
    treatmentOptions: [
      'Инфузии + антибиотики + сыворотка + противорвотные',
      'Только антибиотики (цефтриаксон)',
      'Противодиарейные препараты + сорбенты',
      'Только инфузионная терапия',
    ],
    findings: [
      { region: 'head', toolId: 'inspection', finding: 'Слизистые оболочки сухие, бледные. Язык обложен густым белым налётом. Конъюнктивы бледные.', isNormal: false, relevance: 'important' },
      { region: 'head', toolId: 'ophthalmoscope', finding: 'Конъюнктивы бледные, увлажнённые в норме. Зрачки реагируют на свет.', isNormal: false, relevance: 'minor' },
      { region: 'thorax', toolId: 'stethoscope', finding: 'Тоны сердца приглушены, тахикардия (160 уд/мин). Дыхание ослабленное, хрипов нет.', isNormal: false, relevance: 'important' },
      { region: 'thorax', toolId: 'percussion', finding: 'Перкуторный звук ясный, коробочный в норме.', isNormal: true, relevance: 'minor' },
      { region: 'abdomen', toolId: 'thermometer', finding: 'Температура тела 39,8°C (повышена).', isNormal: false, relevance: 'critical' },
      { region: 'abdomen', toolId: 'palpation', finding: 'Живот болезненный при пальпации, особенно в области пупка. Пальпируются утолщённые петли кишечника. Урчание усилено.', isNormal: false, relevance: 'critical' },
      { region: 'abdomen', toolId: 'inspection', finding: 'Живот втянут. Видны сокращения брюшной стенки — периодическая рвотная поза.', isNormal: false, relevance: 'important' },
      { region: 'skin', toolId: 'inspection', finding: 'Тургор кожи значительно снижен. При сборе кожи в складку она расправляется медленно (>2 сек) — признак обезвоживания.', isNormal: false, relevance: 'critical' },
      { region: 'skin', toolId: 'palpation', finding: 'Кожа сухая, эластичность снижена. Подкожная клетчатка развита слабо.', isNormal: false, relevance: 'important' },
      { region: 'front_legs', toolId: 'inspection', finding: 'Видимых изменений нет. Суставы в норме.', isNormal: true, relevance: 'minor' },
      { region: 'front_legs', toolId: 'palpation', finding: 'Периферические лимфоузлы (подмышечные) увеличены до 1 см.', isNormal: false, relevance: 'minor' },
      { region: 'hind_legs', toolId: 'inspection', finding: 'Видимых изменений нет.', isNormal: true, relevance: 'minor' },
      { region: 'hind_legs', toolId: 'palpation', finding: 'Пальпация безболезненна.', isNormal: true, relevance: 'minor' },
      { region: 'tail', toolId: 'inspection', finding: 'Видимых изменений нет.', isNormal: true, relevance: 'minor' },
      { region: 'neck', toolId: 'inspection', finding: 'Шерсть тусклая. Видимых изменений нет.', isNormal: true, relevance: 'minor' },
      { region: 'neck', toolId: 'palpation', finding: 'Лимфоузлы (подчелюстные) увеличены до 1,2 см, безболезненны.', isNormal: false, relevance: 'minor' },
    ],
    availableTests: [
      { id: 'cbc', name: 'ОАК (общий анализ крови)', icon: '🩸', cost: 800, category: 'blood', result: 'Лейкоциты: 1,8×10⁹/л (тяжёлый лейкоцитоз). Эритроциты: 5,2×10¹²/л (в норме). Гематокрит: 48% (повышен из-за обезвоживания). Тромбоциты: 180×10⁹/л (норма).', isRevealed: false },
      { id: 'biochemistry', name: 'Биохимия крови', icon: '🧪', cost: 1500, category: 'blood', result: 'Общий белок: 52 г/л (снижен). АЛТ: 120 ЕД/л (повышен). АСТ: 140 ЕД/л (повышен). Мочевина: 22 ммоль/л (повышена). Креатинин: 130 мкмоль/л (повышен). Глюкоза: 3,2 ммоль/л (снижена).', isRevealed: false },
      { id: 'parvo_test', name: 'Экспресс-тест на парвовирус (антиген)', icon: '🔬', cost: 600, category: 'microscopy', result: 'ПОЛОЖИТЕЛЬНО. Обнаружен антиген парвовируса собак (CPV) в фекалиях. Тест-полоса ярко выражена — высокая вирусная нагрузка.', isRevealed: false },
      { id: 'urinalysis', name: 'Анализ мочи', icon: '🧫', cost: 500, category: 'other', result: 'Цвет: соломенно-жёлтый. Плотность: 1035 (повышена). Белок: следы. Кетоновые тела: положительно (голодание).', isRevealed: false },
      { id: 'corona_test', name: 'Экспресс-тест на коронавирус', icon: '🔬', cost: 600, category: 'microscopy', result: 'ОТРИЦАТЕЛЬНО. Антиген коронавируса не обнаружен.', isRevealed: false },
      { id: 'xray', name: 'Рентген брюшной полости', icon: '📸', cost: 2000, category: 'imaging', result: 'Газовые пузыри в тонком кишечнике. Стенки кишечника утолщены (5-7 мм). Складки слизистой рельефные. Признаки энтерита. Селезёнка в норме.', isRevealed: false },
    ],
    budget: 8000,
    xpReward: 60,
    anamnesisQuestions: [
      { question: 'Когда появились первые симптомы?', answer: 'Два дня назад Барни стал вялым, вчера перестал есть, а сегодня началась рвота.' },
      { question: 'Делали ли прививки?', answer: 'Нет, мы ещё не успели привить — взяли щенка неделю назад у знакомых.' },
      { question: 'Какой характер рвоты и поноса?', answer: 'Рвота жёлтая, пенистая, не приносит облегчения. Понос зловонный, с кровью — цвета "малинового желе".' },
      { question: 'Контактировал ли с другими собаками?', answer: 'Да, на прошлой неделе были на площадке, там было много собак.' },
      { question: 'Есть ли запах изо рта?', answer: 'Да, неприятный кислый запах.' },
      { question: 'Пил ли воду?', answer: 'Пьёт часто, но после воды сразу вырвало.' },
      { question: 'Была ли у него диарея раньше?', answer: 'Нет, до этого стул был нормальный.' },
    ],
  }),

  // 2. Cat - Urinary tract obstruction
  () => ({
    id: `sim_${Date.now()}`,
    species: 'кошки',
    breed: 'Британская короткошёрстная',
    age: '3 года',
    sex: 'самец',
    weight: '5,2 кг',
    difficulty: 'intermediate',
    topic: 'Урология',
    ownerComplaint: 'Мурзик уже сутки не может сходить в туалет по-маленькому. Он постоянно садится в лоток, тужится, но ничего не выходит. Сильно мяукает и лижет себя внизу.',
    correctDiagnosis: 'Обструкция мочевыводящих путей (уропатия) у кота',
    diagnosisOptions: [
      'Обструкция мочевыводящих путей (уропатия)',
      'Цистит (воспаление мочевого пузыря)',
      'Мочекаменная болезнь (уролитиаз)',
      'Почечная недостаточность',
    ],
    treatmentPlan: 'Экстренная катетеризация мочевого пузыря под седацией. Инфузионная терапия для коррекции азотемии. Спазмолитики и анальгетики. Антибиотикотерапия. Промывание мочевого пузыря. Диетическая терапия (профилактический корм). УЗИ-контроль.',
    treatmentOptions: [
      'Катетеризация + инфузии + спазмолитики + диета',
      'Антибиотики и противовоспалительные',
      'Оперативное удаление камней',
      'Только обезболивание и диета',
    ],
    findings: [
      { region: 'head', toolId: 'inspection', finding: 'Слизистые оболочки бледные, слегка желтушные. Язык влажный. Выражение мордочки страдальческое.', isNormal: false, relevance: 'important' },
      { region: 'head', toolId: 'ophthalmoscope', finding: 'Конъюнктивы бледные. Зрачки равномерные, реакция на свет сохранена.', isNormal: true, relevance: 'minor' },
      { region: 'thorax', toolId: 'stethoscope', finding: 'Тоны сердца приглушены, ритм правильный, ЧСС 180 уд/мин (тахикардия). Дыхание везикулярное, хрипов нет.', isNormal: false, relevance: 'important' },
      { region: 'abdomen', toolId: 'thermometer', finding: 'Температура 38,3°C (в пределах нормы).', isNormal: true, relevance: 'minor' },
      { region: 'abdomen', toolId: 'palpation', finding: 'Мочевой пузырь значительно увеличен, плотный, напряжённый, болезненный при пальпации. Размером с крупный мандарин. Животное реагирует резким напряжением брюшной стенки.', isNormal: false, relevance: 'critical' },
      { region: 'abdomen', toolId: 'inspection', finding: 'Живот напряжён. Кот периодически принимает позу для мочеиспускания без результата.', isNormal: false, relevance: 'important' },
      { region: 'skin', toolId: 'inspection', finding: 'В области гениталий — покраснение и отёк препуция. Шерсть вокруг ануса влажная от вылизывания.', isNormal: false, relevance: 'important' },
      { region: 'skin', toolId: 'palpation', finding: 'Кожный тургор в норме. Подкожная клетчатка развита умеренно.', isNormal: true, relevance: 'minor' },
      { region: 'front_legs', toolId: 'inspection', finding: 'Видимых изменений нет.', isNormal: true, relevance: 'minor' },
      { region: 'front_legs', toolId: 'palpation', finding: 'Периферические пульс ослаблен, частый.', isNormal: false, relevance: 'important' },
      { region: 'hind_legs', toolId: 'inspection', finding: 'Кот часто принимает позу, присаживаясь на задние лапы, вылизывает область гениталий.', isNormal: false, relevance: 'minor' },
      { region: 'hind_legs', toolId: 'palpation', finding: 'Пальпация задних лап безболезненна.', isNormal: true, relevance: 'minor' },
      { region: 'tail', toolId: 'inspection', finding: 'Хвост опущен, кончик подёргивается — признак боли.', isNormal: false, relevance: 'minor' },
      { region: 'neck', toolId: 'inspection', finding: 'Видимых изменений нет.', isNormal: true, relevance: 'minor' },
      { region: 'neck', toolId: 'palpation', finding: 'Лимфоузлы не увеличены.', isNormal: true, relevance: 'minor' },
    ],
    availableTests: [
      { id: 'cbc', name: 'ОАК', icon: '🩸', cost: 800, category: 'blood', result: 'Лейкоциты: 16×10⁹/л (лейкоцитоз). Эритроциты: 7,8×10¹²/л (норма). Гематокрит: 42% (норма). Тромбоциты: 250×10⁹/л (норма).', isRevealed: false },
      { id: 'biochemistry', name: 'Биохимия крови', icon: '🧪', cost: 1500, category: 'blood', result: 'Мочевина: 28 ммоль/л (значительно повышена). Креатинин: 280 мкмоль/л (повышен). Калий: 6,2 ммоль/л (гиперкалиемия — опасно!). Фосфор: 3,0 ммоль/л (повышен).', isRevealed: false },
      { id: 'urinalysis', name: 'Анализ мочи (цистоцентез)', icon: '🧫', cost: 600, category: 'other', result: 'Цвет: красноватый (гематурия). pH: 6,5. Белок: 1,2 г/л. Эритроциты: сплошь в поле зрения. Кристаллы: струвиты (+). Бактерии: не обнаружены.', isRevealed: false },
      { id: 'ultrasound', name: 'УЗИ брюшной полости', icon: '📡', cost: 1800, category: 'imaging', result: 'Мочевой пузырь переполнен, стенки утолщены до 5 мм. В просвете — эхогенные включения (кристаллы/песок). Уретра в области пениса не визуализируется. Почки: левая — повышенная эхогенность коры, правая — в пределах нормы. ЧЛС не расширена.', isRevealed: false },
      { id: 'xray', name: 'Рентген брюшной полости', icon: '📸', cost: 2000, category: 'imaging', result: 'Мочевой пузырь значительно увеличен, занимает большую часть брюшной полости. В области уретры — questionable радиоплотные образования. Почечные тени не увеличены.', isRevealed: false },
      { id: 'coagulation', name: 'Коагулограмма', icon: '💧', cost: 1200, category: 'blood', result: 'Показатели в пределах нормы. ПТВ: 11 сек. АЧТВ: 25 сек.', isRevealed: false },
    ],
    budget: 6000,
    xpReward: 75,
    anamnesisQuestions: [
      { question: 'Когда начали быть проблемы с туалетом?', answer: 'Вчера утром заметила, что он долго сидит в лотке. За ночь пытался несколько раз — безуспешно.' },
      { question: 'Какой корм получает кот?', answer: 'Сухой корм Whiskas, иногда даём колбаску и рыбу.' },
      { question: 'Много ли пьёт воды?', answer: 'Пьёт больше обычного — постоянно стоит у миски.' },
      { question: 'Были ли раньше проблемы с мочеиспусканием?', answer: 'Да, месяц назад тоже долго тужился в лоток, но тогда всё прошло само.' },
      { question: 'Рвота есть?', answer: 'Сегодня утром один раз вырвало прозрачной слизью.' },
      { question: 'Изменилось ли поведение?', answer: 'Да, он стал нервным, прячется под кроватью, не даётся на руки, постоянно вылизывается.' },
      { question: 'Аппетит сохранён?', answer: 'С утра не ел, хотя к корму подходил и нюхал.' },
    ],
  }),

  // 3. Dog - Gastric dilatation-volvulus
  () => ({
    id: `sim_${Date.now()}`,
    species: 'собаки',
    breed: 'Немецкая дог',
    age: '7 лет',
    sex: 'самец',
    weight: '58 кг',
    difficulty: 'advanced',
    topic: 'Хирургия',
    ownerComplaint: 'Атос после вечерней кормёжки стал беспокойным, пытается вырваться, у него раздулся живот. Он скулит и пытается рвать, но ничего не выходит.',
    correctDiagnosis: 'Острое расширение и заворот желудка',
    diagnosisOptions: [
      'Острое расширение и заворот желудка',
      'Острый панкреатит',
      'Кишечная непроходимость',
      'Острый гастрит',
    ],
    treatmentPlan: 'Экстренное хирургическое вмешательство! Декомпрессия желудка (гастротомия/гастропексия). Инфузионная терапия для шока. Антибиотики. Кардиопротекторы. После стабилизации — гастропексия для предотвращения рецидивов.',
    treatmentOptions: [
      'Экстренная операция (гастропексия) + инфузии + антибиотики',
      'Консервативное лечение (инфузии, обезболивание)',
      'Промывание желудка через зонд',
      'Спазмолитики и антибиотики',
    ],
    findings: [
      { region: 'head', toolId: 'inspection', finding: 'Слизистые оболочки бледные, сероватые. Язык сухой. Выражение лица страдальческое, глазное яблоко впалое.', isNormal: false, relevance: 'critical' },
      { region: 'head', toolId: 'ophthalmoscope', finding: 'Конъюнктивы бледные с сероватым оттенком. Слизистая сухая. Зрачки расширены, реакция вялая.', isNormal: false, relevance: 'important' },
      { region: 'thorax', toolId: 'stethoscope', finding: 'Тоны сердца глухие, аритмия (ЧСС 160 уд/мин). Дыхание ослабленное, поверхностное, частое (40 в мин). Хрипов нет.', isNormal: false, relevance: 'critical' },
      { region: 'thorax', toolId: 'percussion', finding: 'При перкуссии — притупленный звук в каудальной трети грудной клетки из-за сдавления диафрагмы.', isNormal: false, relevance: 'important' },
      { region: 'abdomen', toolId: 'thermometer', finding: 'Температура 37,4°C (ниже нормы — шок).', isNormal: false, relevance: 'critical' },
      { region: 'abdomen', toolId: 'palpation', finding: 'Живот сильно напряжён, твёрдый, барабанный при пальпации. Желудок значительно увеличен, занимает более 2/3 брюшной полости. Пальпация крайне болезненна.', isNormal: false, relevance: 'critical' },
      { region: 'abdomen', toolId: 'inspection', finding: 'Живот асимметрично увеличен с левой стороны. Видна outlines вздутого желудка через брюшную стенку. Патологическое дыхание брюшного типа.', isNormal: false, relevance: 'critical' },
      { region: 'abdomen', toolId: 'percussion', finding: 'Тимпанический (барабанный) звук при перкуссии живота — скопление газа в желудке.', isNormal: false, relevance: 'critical' },
      { region: 'skin', toolId: 'inspection', finding: 'Тургор кожи снижен. Видимые слизистые бледные. Время наполнения капилляров >3 сек.', isNormal: false, relevance: 'critical' },
      { region: 'skin', toolId: 'palpation', finding: 'Кожа холодная на ощупь, особенно конечности. Подкожные вены спавшиеся.', isNormal: false, relevance: 'important' },
      { region: 'front_legs', toolId: 'palpation', finding: 'Периферический пульс на артерии предплечья нитевидный, едва прощупывается.', isNormal: false, relevance: 'important' },
      { region: 'front_legs', toolId: 'inspection', finding: 'Конечности холодные.', isNormal: false, relevance: 'minor' },
      { region: 'hind_legs', toolId: 'palpation', finding: 'Слизистые оболочки бледные, пульс на бедренной артерии ослаблен.', isNormal: false, relevance: 'important' },
      { region: 'hind_legs', toolId: 'inspection', finding: 'Стояние неустойчивое, животное переступает.', isNormal: false, relevance: 'minor' },
      { region: 'neck', toolId: 'inspection', finding: 'Яремная вена не наполнена — гиповолемия. Поверхностные вены спавшиеся.', isNormal: false, relevance: 'important' },
      { region: 'neck', toolId: 'palpation', finding: 'Лимфоузлы не увеличены. Пальпация безболезненна.', isNormal: true, relevance: 'minor' },
    ],
    availableTests: [
      { id: 'cbc', name: 'ОАК', icon: '🩸', cost: 800, category: 'blood', result: 'Лейкоциты: 22×10⁹/л (выраженный лейкоцитоз). Гематокрит: 62% (сгущение крови). Эритроциты: 10,5×10¹²/л (повышены). Тромбоциты: 120×10⁹/л (снижены).', isRevealed: false },
      { id: 'biochemistry', name: 'Биохимия крови', icon: '🧪', cost: 1500, category: 'blood', result: 'ЛДГ: 1800 ЕД/л (критически повышен). АЛТ: 300 ЕД/л. АСТ: 500 ЕД/л. Мочевина: 25 ммоль/л. Лактат: 8,5 ммоль/л (критически повышен!).', isRevealed: false },
      { id: 'blood_gas', name: 'Газовый состав крови', icon: '🧪', cost: 1000, category: 'blood', result: 'pH: 7,18 (метаболический ацидоз). pCO2: 28 мм рт.ст. HCO3: 12 ммоль/л. Лактат: 8,5 ммоль/л.', isRevealed: false },
      { id: 'xray', name: 'Рентген брюшной полости (экстренный)', icon: '📸', cost: 2000, category: 'imaging', result: 'КРИТИЧЕСКИ: Желудок значительно увеличен, занимает большую часть брюшной полости. Газовый пузырь с горизонтальным уровнем жидкости. Пилоральный отдел смещён каудально и вправо — признак заворота на 180-270°. Селезёнка смещена.', isRevealed: false },
      { id: 'ecg', name: 'ЭКГ', icon: '📡', cost: 800, category: 'other', result: 'Синусовая тахикардия. Смещение сегмента ST вниз. Экстрасистолия. Признаки ишемии миокарда на фоне гиповолемии.', isRevealed: false },
    ],
    budget: 4000,
    xpReward: 100,
    anamnesisQuestions: [
      { question: 'Когда это началось?', answer: 'Примерно час назад, после ужина. Атос съел большую порцию сухого корма и сразу стал беспокойным.' },
      { question: 'Какую еду получает собака?', answer: 'Сухой корм Pedigree, даём один раз в день вечером, большую миску.' },
      { question: 'Была ли физическая активность после еды?', answer: 'Да, после ужина он бегал по двору минут 20, играл с мячиком.' },
      { question: 'Были ли раньше подобные эпизоды?', answer: 'Нет, никогда такого не было.' },
      { question: 'Рвота есть?', answer: 'Он пытается вырвать — напрягается, но ничего не выходит. Только пена изо рта.' },
      { question: 'Изменилось ли поведение?', answer: 'Да! Он не находит себе места, ходит кругами, скулит, пытается лечь, но встаёт снова.' },
      { question: 'Сколько ему лет и были ли болезни?', answer: '7 лет, в целом здоровый. Прививки по графику.' },
    ],
  }),

  // 4. Dog - Atopic dermatitis
  () => ({
    id: `sim_${Date.now()}`,
    species: 'собаки',
    breed: 'Френцузский бульдог',
    age: '2 года',
    sex: 'самка',
    weight: '11 кг',
    difficulty: 'beginner',
    topic: 'Дерматология',
    ownerComplaint: 'Изи постоянно чешется и вылизывает лапы, особенно уже несколько недель. На животе появились красные пятна, шерсть местами выпадает. Спим плохо из-за того, что она скребётся всю ночь.',
    correctDiagnosis: 'Атопический дерматит',
    diagnosisOptions: [
      'Атопический дерматит',
      'Блохи (инфекция + аллергия)',
      'Пищевая аллергия',
      'Демодекоз',
    ],
    treatmentPlan: 'Глюкокортикоиды местно (в виде мази) или системно (преднизолон 0,5 мг/кг). Циклоспорин А. Жирные кислоты Омега-3. Антигистаминные (гидроксизин). Топические шампуни с хлоргексидином. Элиминационная диета для исключения пищевой аллергии. Апоквель (оклацитиниб) при отсутствии эффекта.',
    treatmentOptions: [
      'Апоквель + Омега-3 + лечебный шампунь + диета',
      'Антибиотики и противогрибковые',
      'Обработка от блох + витамины',
      'Гормональная мазь и успокоительное',
    ],
    findings: [
      { region: 'head', toolId: 'inspection', finding: 'Эритема и лёгкий отёк вокруг глаз. Корочки на наружных краях ушных раковин. Выделения из глаз скудные.', isNormal: false, relevance: 'important' },
      { region: 'head', toolId: 'otoscope', finding: 'В слуховых проходах — покраснение, отёк, умеренное количество тёмного секрета. Барабанная перепонка визуализируется, цела.', isNormal: false, relevance: 'important' },
      { region: 'head', toolId: 'ophthalmoscope', finding: 'Конъюнктивы слегка гиперемированы. Роговица прозрачная.', isNormal: false, relevance: 'minor' },
      { region: 'thorax', toolId: 'stethoscope', finding: 'Тоны сердца ясные, ритмичные, ЧСС 100 уд/мин. Дыхание везикулярное.', isNormal: true, relevance: 'minor' },
      { region: 'abdomen', toolId: 'thermometer', finding: 'Температура 38,8°C (в пределах нормы).', isNormal: true, relevance: 'minor' },
      { region: 'abdomen', toolId: 'inspection', finding: 'На коже живота — множественные участки эритемы, папулезная сыпь. Волосистый покров разрежен.', isNormal: false, relevance: 'critical' },
      { region: 'abdomen', toolId: 'palpation', finding: 'Кожа живота горячая на ощупь, утолщена (лихенификация). Подкожные лимфоузлы не увеличены.', isNormal: false, relevance: 'important' },
      { region: 'skin', toolId: 'inspection', finding: 'Генерализованная сухость кожи. Эритема в складках кожи (межпальцевые, паховые, подмышечные). Множественные экскориации от расчёсов.', isNormal: false, relevance: 'critical' },
      { region: 'skin', toolId: 'palpation', finding: 'Кожа утолщена, сухая, шелушащаяся. При пальпации — горячая в областях воспаления. Обострение в межпальцевых складках.', isNormal: false, relevance: 'critical' },
      { region: 'skin', toolId: 'skin_scrape', finding: 'При микроскопии соскоба: кожные клещи не обнаружены. Дрожжевые грибы Malassezia в умеренном количестве.', isNormal: false, relevance: 'important' },
      { region: 'front_legs', toolId: 'inspection', finding: 'Межпальцевые пространства покрасневшие, отёчные. Собака постоянно вылизывает передние лапы — шерсть на лапах обесцвечена от слюны (коричневый налёт).', isNormal: false, relevance: 'critical' },
      { region: 'front_legs', toolId: 'palpation', finding: 'Межпальцевые складки утолщены, болезненные. Увлажнены от вылизывания.', isNormal: false, relevance: 'important' },
      { region: 'hind_legs', toolId: 'inspection', finding: 'Аналогичные изменения — покраснение и коричневый налёт от вылизывания на плюсневых областях.', isNormal: false, relevance: 'important' },
      { region: 'hind_legs', toolId: 'palpation', finding: 'Кожа на задних лапах утолщена, волосы выпадают.', isNormal: false, relevance: 'minor' },
      { region: 'tail', toolId: 'inspection', finding: 'Видимых изменений нет.', isNormal: true, relevance: 'minor' },
      { region: 'neck', toolId: 'inspection', finding: 'На шее — сухость кожи и лёгкое шелушение.', isNormal: false, relevance: 'minor' },
    ],
    availableTests: [
      { id: 'cbc', name: 'ОАК', icon: '🩸', cost: 800, category: 'blood', result: 'Лейкоциты: 12×10⁹/л (незначительный лейкоцитоз). Эозинофилы: 8% (повышены — аллергия). Остальное в норме.', isRevealed: false },
      { id: 'biochemistry', name: 'Биохимия крови', icon: '🧪', cost: 1500, category: 'blood', result: 'Все показатели в пределах нормы. Общий белок: 68 г/л. АЛТ, АСТ, мочевина, креатинин — норма.', isRevealed: false },
      { id: 'skin_scrape', name: 'Глубокий соскоб кожи', icon: '🔬', cost: 500, category: 'microscopy', result: 'Живых клещей Demodex не обнаружено. Найдены единичные фрагменты чешуй и спор грибов Malassezia pachydermatis.', isRevealed: false },
      { id: 'flea_comb', name: 'Исследование на блох', icon: '🔬', cost: 300, category: 'microscopy', result: 'При вычёсывании — блохи и власоеды не обнаружены. Нет блошиного помёта.', isRevealed: false },
      { id: 'cytology', name: 'Цитология кожи', icon: '🔬', cost: 600, category: 'microscopy', result: 'Мазок-отпечаток: нейтрофилы в умеренном количестве, кокковая флора, дрожжевые клетки Malassezia. Признаки вторичного пиодермита.', isRevealed: false },
      { id: 'allergy_test', name: 'Аллерготест (сывороточный IgE)', icon: '🧪', cost: 3500, category: 'blood', result: 'Повышенный уровень специфических IgE к аллергенам клещей Dermatophagoides farinae и пыльце амброзии. К пищевым аллергенам — отрицательно.', isRevealed: false },
      { id: 'food_trial_info', name: 'Консультация по элиминационной диете', icon: '📋', cost: 500, category: 'other', result: 'Рекомендована элиминационная диета на 8-12 недель (гидролизатный корм или новелльный белок). Запрещены лакомства и стол.', isRevealed: false },
    ],
    budget: 8000,
    xpReward: 55,
    anamnesisQuestions: [
      { question: 'Когда начался зуд?', answer: 'Где-то месяц назад, постепенно усиливался. Сначала просто иногда чесалась, а сейчас постоянно.' },
      { question: 'Обрабатываете ли от блох и клещей?', answer: 'Да, каждый месяц капаем Фронтлайн. Блох вроде бы нет.' },
      { question: 'Меняли ли корм?', answer: 'Нет, кормим одним и тем же — Брит, курица с рисом.' },
      { question: 'В какой сезон началось?', answer: 'Появилось весной, когда начали цвести цветы. Но сейчас в апреле стало ещё хуже.' },
      { question: 'Есть ли уши поражены?', answer: 'Да, она постоянно трясёт головой и чешет уши.' },
      { question: 'Плохо ли спит?', answer: 'Очень плохо! Ночью постоянно скребётся и вылизывает лапы. Мы уже не высыпаемся.' },
      { question: 'Есть ли похожие проблемы у родственников?', answer: 'Мама Изи тоже страдала аллергией, как сказал заводчик.' },
    ],
  }),

  // 5. Cat - Vomiting / Gastrointestinal foreign body
  () => ({
    id: `sim_${Date.now()}`,
    species: 'кошки',
    breed: 'Мейн-кун',
    age: '1,5 года',
    sex: 'самец',
    weight: '6,8 кг',
    difficulty: 'intermediate',
    topic: 'Хирургия',
    ownerComplaint: 'Барсик两天前 перестал есть. Сегодня его вырвало два раза — жёлтой пеной, потом с примесью чего-то коричневого. Он вялый и прячется.',
    correctDiagnosis: 'Инородное тело желудочно-кишечного тракта',
    diagnosisOptions: [
      'Инородное тело ЖКТ',
      'Панкреатит',
      'Инфекционный перитонит',
      'Липидоз печени',
    ],
    treatmentPlan: 'Экстренная операция — лапаротомия, удаление инородного тела из кишечника (энтеротомия). Инфузионная терапия. Антибиотики. Гастропротекторы. Послеоперационное наблюдение.',
    treatmentOptions: [
      'Лапаротомия + удаление инородного тела + инфузии',
      'Консервативно: инфузии + антибиотики + наблюдение',
      'Провокация рвоты + сорбенты',
      'Спазмолитики и противорвотные',
    ],
    findings: [
      { region: 'head', toolId: 'inspection', finding: 'Слизистые бледные, суховатые. Язык обложен сероватым налётом. Третья веко слегка выступает.', isNormal: false, relevance: 'important' },
      { region: 'head', toolId: 'ophthalmoscope', finding: 'Конъюнктивы бледные. Зрачки реагируют на свет. Признаков желтухи нет.', isNormal: true, relevance: 'minor' },
      { region: 'thorax', toolId: 'stethoscope', finding: 'Тоны сердца ритмичные, ЧСС 150 уд/мин (умеренная тахикардия). Дыхание везикулярное, несколько ослабленное.', isNormal: false, relevance: 'minor' },
      { region: 'abdomen', toolId: 'thermometer', finding: 'Температура 38,1°C (незначительно снижена).', isNormal: false, relevance: 'minor' },
      { region: 'abdomen', toolId: 'palpation', finding: 'Живот болезненный, особенно в средней трети. Пальпируется плотное линейное образование в области тонкого кишечника (~3 см). Кишечник выше obstruction расширен. Животное резко реагирует на глубокую пальпацию.', isNormal: false, relevance: 'critical' },
      { region: 'abdomen', toolId: 'inspection', finding: 'Живот втянут. При дыхании — преимущественно грудной тип, живот почти не участвует.', isNormal: false, relevance: 'important' },
      { region: 'abdomen', toolId: 'percussion', finding: 'В области кишечника — притуплённый звук (скопление жидкости выше препятствия).', isNormal: false, relevance: 'minor' },
      { region: 'skin', toolId: 'inspection', finding: 'Тургор кожи несколько снижен. Шерсть тусклая.', isNormal: false, relevance: 'minor' },
      { region: 'skin', toolId: 'palpation', finding: 'Кожный тургор умеренно снижен. Подкожная клетчатка в норме.', isNormal: true, relevance: 'minor' },
      { region: 'front_legs', toolId: 'inspection', finding: 'Видимых изменений нет.', isNormal: true, relevance: 'minor' },
      { region: 'front_legs', toolId: 'palpation', finding: 'Периферические лимфоузлы не увеличены.', isNormal: true, relevance: 'minor' },
      { region: 'hind_legs', toolId: 'inspection', finding: 'Видимых изменений нет.', isNormal: true, relevance: 'minor' },
      { region: 'hind_legs', toolId: 'palpation', finding: 'Пальпация безболезненна.', isNormal: true, relevance: 'minor' },
      { region: 'tail', toolId: 'inspection', finding: 'Видимых изменений нет.', isNormal: true, relevance: 'minor' },
      { region: 'neck', toolId: 'inspection', finding: 'Видимых изменений нет.', isNormal: true, relevance: 'minor' },
      { region: 'neck', toolId: 'palpation', finding: 'Лимфоузлы в норме.', isNormal: true, relevance: 'minor' },
    ],
    availableTests: [
      { id: 'cbc', name: 'ОАК', icon: '🩸', cost: 800, category: 'blood', result: 'Лейкоциты: 18×10⁹/л (лейкоцитоз, сдвиг формулы влево). Эритроциты: 8,0×10¹²/л. Гематокрит: 38% (снижен из-за обезвоживания).', isRevealed: false },
      { id: 'biochemistry', name: 'Биохимия крови', icon: '🧪', cost: 1500, category: 'blood', result: 'АЛТ: 180 ЕД/л (повышена). АСТ: 200 ЕД/л (повышена). Мочевина: 15 ммоль/л (повышена). ЛДГ: 600 ЕД/л (повышена).', isRevealed: false },
      { id: 'xray', name: 'Рентген брюшной полости', icon: '📸', cost: 2000, category: 'imaging', result: 'В проекции тонкого кишечника — инородное тело линейной формы, сопровождающееся признаками кишечной непроходимости. Выше уровня обтурации — газ и жидкость (уровни жидкости). Петли кишечника расширены.', isRevealed: false },
      { id: 'ultrasound', name: 'УЗИ брюшной полости', icon: '📡', cost: 1800, category: 'imaging', result: 'В просвете тонкого кишечника (на 30-40 см от илеоцекального клапана) определяется линейное эхогенное образование с акустической тенью. Стенка кишечника в месте обтурации утолщена до 4 мм. Выше обтурации — расширение петель до 2,5 см.', isRevealed: false },
      { id: 'urinalysis', name: 'Анализ мочи', icon: '🧫', cost: 500, category: 'other', result: 'Плотность: 1040 (повышена). Остальные показатели в пределах нормы.', isRevealed: false },
    ],
    budget: 6000,
    xpReward: 80,
    anamnesisQuestions: [
      { question: 'Когда начались симптомы?', answer: 'Два дня назад стал меньше есть, а сегодня совсем отказался. Рвота началась сегодня утром.' },
      { question: 'Мог ли кот что-то проглотить?', answer: 'Хмм... Он любит играть с лесками и шнурками. А три дня назад я нашла порванную леску на полу — может он её съел?' },
      { question: 'Какая рвота?', answer: 'Сначала была просто жёлтая пена, а второй раз — с чем-то коричневым и неприятно пахнущим.' },
      { question: 'Был ли стул за последние 2 дня?', answer: 'Нет, в лотке ничего не было.' },
      { question: 'Меняли ли корм?', answer: 'Нет, кормим обычным Роял Канином.' },
      { question: 'Прячется ли кот?', answer: 'Да, он забрался под шкаф и оттуда не выходит. Не даётся на руки.' },
      { question: 'Есть ли рвота после воды?', answer: 'Да, когда пытался напиться — вырвало сразу.' },
    ],
  }),

  // 6. Dog - Otitis externa (otitis)
  () => ({
    id: `sim_${Date.now()}`,
    species: 'собаки',
    breed: 'Спаниель (Кокер)',
    age: '4 года',
    sex: 'самка',
    weight: '14 кг',
    difficulty: 'beginner',
    topic: 'Отология',
    ownerComplaint: 'Лесси постоянно трясёт головой и чешет уши. Из правого уха неприятно пахнет и выходит тёмная жидкость. Она стала нервной и плохо спит.',
    correctDiagnosis: 'Отит наружного уха (смешанная инфекция: бактерии + дрожжи)',
    diagnosisOptions: [
      'Отит наружного уха (смешанная инфекция)',
      'Ушной клещ (Otodectes cynotis)',
      'Гематома уха',
      'Аллергический отит',
    ],
    treatmentPlan: 'Тщательная чистка слухового прохода раствором хлоргексидина. Местные капли с антибиотиком (гентамицин) + противогрибковым (клотримазол) + противовоспалительным (преднизолон). Системная терапия при тяжёлом течении. Повторный осмотр через 7 дней.',
    treatmentOptions: [
      'Чистка + ушные капли (антибиотик + противогрибковое + НПВС) + осмотр через 7 дней',
      'Только чистка ушей',
      'Таблетки от клещей',
      'Народные средства (ромашка, масло)',
    ],
    findings: [
      { region: 'head', toolId: 'inspection', finding: 'Правая ушная раковина: покраснение, отёк, обильные тёмно-коричневые выделения с кисло-неприятным запахом. Левое ухо: лёгкая гиперемия, минимальные выделения. Собака постоянно трясёт головой.', isNormal: false, relevance: 'critical' },
      { region: 'head', toolId: 'otoscope', finding: 'ПРАВОЕ УХО: Слуховой проход отёчен, гиперемирован, заполнен тёмным экссудатом. Кожа изъязвлена. Барабанная перепонка не визуализируется из-за экссудата. ЛЕВОЕ УХО: Слуховой проход слегка гиперемирован, скудные выделения. Барабанная перепонка целая.', isNormal: false, relevance: 'critical' },
      { region: 'head', toolId: 'ophthalmoscope', finding: 'Глаза в норме. Конъюнктивы бледно-розовые.', isNormal: true, relevance: 'minor' },
      { region: 'thorax', toolId: 'stethoscope', finding: 'Тоны сердца ясные, ритмичные. Дыхание везикулярное, без хрипов.', isNormal: true, relevance: 'minor' },
      { region: 'abdomen', toolId: 'thermometer', finding: 'Температура 38,9°C (незначительно повышена).', isNormal: false, relevance: 'minor' },
      { region: 'abdomen', toolId: 'palpation', finding: 'Живот мягкий, безболезненный. Печень, селезёнка не увеличены. Подчелюстные и околоушные лимфоузлы увеличены до 1,5 см, безболезненны.', isNormal: false, relevance: 'important' },
      { region: 'skin', toolId: 'inspection', finding: 'На коже вокруг основания ушей — покраснение и экскориации от расчёсов. Общая кожа в норме.', isNormal: false, relevance: 'important' },
      { region: 'skin', toolId: 'palpation', finding: 'Кожа тёплая, влажная. В области основания ушей — болезненность.', isNormal: false, relevance: 'minor' },
      { region: 'front_legs', toolId: 'inspection', finding: 'Видимых изменений нет.', isNormal: true, relevance: 'minor' },
      { region: 'front_legs', toolId: 'palpation', finding: 'Пальпация безболезненна.', isNormal: true, relevance: 'minor' },
      { region: 'hind_legs', toolId: 'inspection', finding: 'Видимых изменений нет.', isNormal: true, relevance: 'minor' },
      { region: 'hind_legs', toolId: 'palpation', finding: 'Пальпация безболезненна.', isNormal: true, relevance: 'minor' },
      { region: 'tail', toolId: 'inspection', finding: 'Видимых изменений нет.', isNormal: true, relevance: 'minor' },
      { region: 'neck', toolId: 'inspection', finding: 'Видимых изменений нет.', isNormal: true, relevance: 'minor' },
      { region: 'neck', toolId: 'palpation', finding: 'Околоушные лимфоузлы увеличены с обеих сторон, справа больше.', isNormal: false, relevance: 'important' },
    ],
    availableTests: [
      { id: 'ear_cytology', name: 'Цитология уха', icon: '🔬', cost: 500, category: 'microscopy', result: 'Обнаружены кокки (Staphylococcus spp.) в большом количестве и дрожжевые клетки Malassezia pachydermatis (+++). Нейтрофилы — единичные. Клещи Otodectes не обнаружены.', isRevealed: false },
      { id: 'ear_culture', name: 'Посев из уха на флору', icon: '🧫', cost: 1200, category: 'microscopy', result: 'Вырос Staphylococcus pseudintermedius, чувствительный к гентамицину, энрофлоксацину. Устойчив к пенициллину.', isRevealed: false },
      { id: 'cbc', name: 'ОАК', icon: '🩸', cost: 800, category: 'blood', result: 'Лейкоциты: 11×10⁹/л (незначительно повышены). Остальные показатели в норме.', isRevealed: false },
      { id: 'biochemistry', name: 'Биохимия крови', icon: '🧪', cost: 1500, category: 'blood', result: 'Все показатели в пределах нормы. Почки и печень в норме.', isRevealed: false },
    ],
    budget: 8000,
    xpReward: 50,
    anamnesisQuestions: [
      { question: 'Когда появились проблемы с ушами?', answer: 'Примерно неделю назад. Сначала просто трясла головой, а потом появилось выделение и запах.' },
      { question: 'Купаете ли собаку? Как ухаживаете за ушами?', answer: 'Купаем раз в 2 недели, но уши не чистим специально. Висячие уши, в них влажно.' },
      { question: 'Были ли раньше проблемы с ушами?', answer: 'Да, полгода назад тоже было, тогда прошло само после чистки.' },
      { question: 'Обрабатываете ли от клещей и блох?', answer: 'Да, регулярно капаем на холку.' },
      { question: 'Меняли ли корм?', answer: 'Нет, кормим Проспером для спаниелей.' },
      { question: 'Есть ли аллергии?', answer: 'Не знаю, но весной она иногда чешется.' },
    ],
  }),

  // 7. Cow - Ketosis (original babesiosis kept but modified to be less common)
  // Keep original babesiosis as last resort
  () => ({
    id: `sim_${Date.now()}`,
    species: 'КРС',
    breed: 'Чёрно-пёстрая голштинская',
    age: '5 лет',
    sex: 'самка',
    weight: '580 кг',
    difficulty: 'intermediate',
    topic: 'Терапия / Обмен веществ',
    ownerComplaint: 'Корова Зорька после отёла резко снизила удой, почти не ест силос и концентраты. Выглядит вялой, много лежит. Запах ацетона изо рта.',
    correctDiagnosis: 'Кетоз (ацидоз) коровы',
    diagnosisOptions: [
      'Кетоз (ацидоз) коровы',
      'Гипокальциемия (послеродовая парезия)',
      'Травматический ретикулит',
      'Мастит',
    ],
    treatmentPlan: 'Внутривенное введение глюкозы 40% (500 мл). Глицерол перорально (300-400 г/день). Пропиленгликоль (250 мл/день). Улучшение рациона (снижение концентратов, добавление сена). Инъекции витамина B12 и никотиновой кислоты. Анионные соли в рацион.',
    treatmentOptions: [
      'Глюкоза 40% в/в + пропиленгликоль + коррекция рациона + витамины',
      'Только кальций глюконат (от парезии)',
      'Антибиотики',
      'Увеличить концентраты в рационе',
    ],
    findings: [
      { region: 'head', toolId: 'inspection', finding: 'Слизистые оболочки бледные, сухие. Видимые слизистые с желтушным оттенком. Язык обложен белым налётом. Изо рта запах ацетона.', isNormal: false, relevance: 'critical' },
      { region: 'head', toolId: 'ophthalmoscope', finding: 'Конъюнктивы бледные, с желтушным оттенком. Слизистая глаза суховата.', isNormal: false, relevance: 'important' },
      { region: 'thorax', toolId: 'stethoscope', finding: 'Тоны сердца приглушены, ритмичные. ЧСС 80 уд/мин (в норме). Дыхание везикулярное, не учащено.', isNormal: true, relevance: 'minor' },
      { region: 'thorax', toolId: 'percussion', finding: 'Перкуторный звук ясный, без отклонений.', isNormal: true, relevance: 'minor' },
      { region: 'abdomen', toolId: 'thermometer', finding: 'Температура 37,8°C (в пределах нормы или незначительно снижена).', isNormal: true, relevance: 'minor' },
      { region: 'abdomen', toolId: 'palpation', finding: 'Румен сокращается слабо (1-2 сокращения за 5 мин вместо 2-4). Наполнение рубца снижено, жвачка отсутствует.', isNormal: false, relevance: 'critical' },
      { region: 'abdomen', toolId: 'inspection', finding: 'Живот втянут. Вымя мягкое, умеренно наполнено. Из вымени выделяется молоко с горьковатым привкусом, сниженная жирность.', isNormal: false, relevance: 'important' },
      { region: 'skin', toolId: 'inspection', finding: 'Шерсть тусклая. Тургор кожи снижен.', isNormal: false, relevance: 'minor' },
      { region: 'skin', toolId: 'palpation', finding: 'Кожа эластичность снижена. Подкожная клетчатка развита слабо — потеря упитанности.', isNormal: false, relevance: 'important' },
      { region: 'front_legs', toolId: 'inspection', finding: 'Видимых изменений нет. Стоит неуверенно, много лежит.', isNormal: false, relevance: 'minor' },
      { region: 'front_legs', toolId: 'palpation', finding: 'Суставы безболезненны. Подкожные вены в норме.', isNormal: true, relevance: 'minor' },
      { region: 'hind_legs', toolId: 'inspection', finding: 'Видимых изменений нет.', isNormal: true, relevance: 'minor' },
      { region: 'hind_legs', toolId: 'palpation', finding: 'Пальпация безболезненна.', isNormal: true, relevance: 'minor' },
      { region: 'tail', toolId: 'inspection', finding: 'Видимых изменений нет.', isNormal: true, relevance: 'minor' },
      { region: 'neck', toolId: 'inspection', finding: 'Шея чистая, без припухлостей. Иммобилизация трахеи при отеке желудка (сетки) не наблюдается.', isNormal: true, relevance: 'minor' },
      { region: 'neck', toolId: 'palpation', finding: 'Шейные лимфоузлы не увеличены. При пальпации безболезненны.', isNormal: true, relevance: 'minor' },
    ],
    availableTests: [
      { id: 'cbc', name: 'ОАК', icon: '🩸', cost: 800, category: 'blood', result: 'Лейкоциты: 6,5×10⁹/л (в норме, лейкопения при тяжёлом кетозе). Эритроциты: 6,0×10¹²/л. Гематокрит: 30% (снижен).', isRevealed: false },
      { id: 'biochemistry', name: 'Биохимия крови', icon: '🧪', cost: 1500, category: 'blood', result: 'Глюкоза: 1,8 ммоль/л (критически снижена, норма 2,5-4,5). Кетоновые тела крови: 3,5 ммоль/л (значительно повышены). Билирубин: 25 мкмоль/л (повышен). Общий белок: 62 г/л (снижен). АЛТ: 45 ЕД/л (незначительно повышена).', isRevealed: false },
      { id: 'ketone_test', name: 'Тест на кетоновые тела в моче', icon: '🧫', cost: 300, category: 'other', result: 'Кетоновые тела: +++++ (критически повышены). рН мочи: 5,5 (кислая).', isRevealed: false },
      { id: 'milk_test', name: 'Анализ молока', icon: '🥛', cost: 400, category: 'other', result: 'Жирность: 2,8% (снижена, норма 3,5-4,0). Белок: 2,9% (снижен). Положительная реакция на ацетон (тест с нитропруссидом натрия). Соматические клетки: 150 тыс/мл (в норме).', isRevealed: false },
      { id: 'rumen_pH', name: 'рН рубца', icon: '🧪', cost: 500, category: 'other', result: 'рН рубца: 5,5 (снижен, норма 6,0-7,0). Признаки субклинического ацидоза рубца.', isRevealed: false },
    ],
    budget: 6000,
    xpReward: 75,
    anamnesisQuestions: [
      { question: 'Когда отелилась корова?', answer: 'Три недели назад. Отёл нормальный, без осложнений.' },
      { question: 'Как изменился удой?', answer: 'После отёла удой был 28 литров, а сейчас упал до 14 литров.' },
      { question: 'Какой рацион?', answer: 'Много концентратов (8 кг/день) и силоса. Сена даём мало — 2 кг. После отёла увеличили концентраты для повышения удоя.' },
      { question: 'Жуёт ли жвачку?', answer: 'Нет, жвачка отсутствует уже несколько дней.' },
      { question: 'Много ли лежит?', answer: 'Да, почти всё время лежит, встаёт неохотно.' },
      { question: 'Какой стул?', answer: 'Кал сухой, оформленный, тёмный. Стула стало меньше обычного.' },
    ],
  }),
];

function getFallbackScenario(species?: string): SimulatorScenario {
  // Try to match species, or pick random
  const speciesMatch = FALLBACK_SCENARIOS.filter((fn) => fn().species === species);
  if (speciesMatch.length > 0) {
    return speciesMatch[Math.floor(Math.random() * speciesMatch.length)]();
  }
  // Random from all
  const idx = Math.floor(Math.random() * FALLBACK_SCENARIOS.length);
  return FALLBACK_SCENARIOS[idx]();
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

    // Generate a random "salt" to force diversity
    const randomSalt = Math.floor(Math.random() * 10000);
    const diversityHint = `УНИКАЛЬНЫЙ_КЛЮЧ: ${randomSalt}. Создай абсолютно новый сценарий, отличный от любых предыдущих.`;

    const userPrompt = `${diversityHint}

Создай уникальный сценарий для интерактивного симулятора ветеринарной практики:
- Вид животного: ${species}
- Уровень сложности: ${difficulty} (${difficultyDescriptions[difficulty]})
${topic ? `- Тема: ${topic}` : ''}

ВАЖНО: НЕ используй следующие диагнозы: бабезиоз, пироплазмоз, парвовирусный энтерит, чума плотоядных.
Выбери РЕДКОЕ ИЛИ МАЛОИЗВЕСТНОЕ заболевание для данного вида!

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
        temperature: 0.9,
      });
      responseText = completion.choices[0]?.message?.content || '';
    } catch (formatError) {
      console.warn('[simulator/generate] response_format not supported, retrying without it:', formatError);
      try {
        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          thinking: { type: 'disabled' },
          temperature: 0.9,
        });
        responseText = completion.choices[0]?.message?.content || '';
      } catch (retryError) {
        console.error('[simulator/generate] Both AI call attempts failed:', retryError);
        const fallback = getFallbackScenario(species);
        return NextResponse.json({ success: true, scenario: fallback, isFallback: true });
      }
    }

    // --- Multi-strategy JSON extraction ---
    let parsed: unknown = extractJSON(responseText);

    if (parsed === null) {
      console.error('[simulator/generate] All JSON parsing strategies failed. Using fallback.');
      console.error('[simulator/generate] RAW RESPONSE TEXT:', responseText.substring(0, 500));
      const fallback = getFallbackScenario(species);
      return NextResponse.json({ success: true, scenario: fallback, isFallback: true });
    }

    // --- Validate structure ---
    const validated = validateAndFixScenario(parsed);
    if (validated === null) {
      console.error('[simulator/generate] Structure validation failed. Using fallback.');
      const fallback = getFallbackScenario(species);
      return NextResponse.json({ success: true, scenario: fallback, isFallback: true });
    }

    return NextResponse.json({
      success: true,
      scenario: validated,
    });
  } catch (error) {
    console.error('[simulator/generate] Unexpected error:', error);
    const fallback = getFallbackScenario();
    return NextResponse.json({ success: true, scenario: fallback, isFallback: true });
  }
}
