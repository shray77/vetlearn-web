import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { extractJSON } from '@/lib/json-utils';
import { FALLBACK_SCENARIOS, getFallbackScenario, type SimulatorScenario } from '@/lib/fallback-scenarios';

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

Верни ТОЛЬКО JSON.

ЗАПРЕЩЕНО использовать английские слова, даже медицинские термины. Пиши по-русски: не "CBC" — "ОАК", не "X-ray" — "рентгенография", не "ultrasound" — "УЗИ", не "CT" — "КТ", не "findings" — "результаты", не "reveals" — "показывает", не "treatment" — "лечение", не "diagnosis" — "диагноз". Если напишешь хоть одно английское слово — это грубая ошибка.

ВАЖНО: НЕ делай бабезиоз. Выбери любое другое заболевание, кроме бабезиоза, пироплазмоза и подобных клещевых инфекций. Есть сотни других болезней — пиши про них.`;

// --- Structure validation ---

// Types imported from @/lib/fallback-scenarios (ExaminationFinding, LabTest, SimulatorScenario)

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
    const VALID_TOOL_IDS = ['inspection', 'stethoscope', 'thermometer', 'palpation', 'otoscope', 'ophthalmoscope', 'percussion', 'skin_scrape'];
    const VALID_REGIONS = ['head', 'neck', 'thorax', 'abdomen', 'skin', 'front_legs', 'hind_legs', 'tail'];
    s.findings = s.findings.map((f: any, i: number) => ({
      region: typeof f.region === 'string' && VALID_REGIONS.includes(f.region) ? f.region : 'skin',
      toolId: typeof f.toolId === 'string' && VALID_TOOL_IDS.includes(f.toolId) ? f.toolId : 'inspection',
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

// Fallback scenarios extracted to @/lib/fallback-scenarios.ts for faster cold start

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { species, difficulty = 'intermediate', topic } = body;

    // --- Payload size validation ---
    if (body.history && JSON.stringify(body.history).length > 500 * 1024) {
      return NextResponse.json(
        { error: 'История слишком большая (максимум 500 КБ)' },
        { status: 413 }
      );
    }

    if (Array.isArray(body.messages)) {
      const MAX_MESSAGE_SIZE = 10 * 1024; // 10 KB per message
      for (const msg of body.messages) {
        const msgSize = typeof msg === 'string' ? msg.length : JSON.stringify(msg).length;
        if (msgSize > MAX_MESSAGE_SIZE) {
          return NextResponse.json(
            { error: 'Сообщение слишком длинное (максимум 10 КБ)' },
            { status: 413 }
          );
        }
      }
    }

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

Все тексты — ТОЛЬКО на русском языке. Ни одного английского слова.

НЕ делай бабезиоз/пироплазмоз. Выбери другое заболевание.
Верни ТОЛЬКО JSON.`;

    // --- AI call (single attempt, no double-call overhead) ---
    let responseText = '';

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.9,
    });
    responseText = completion.choices[0]?.message?.content || '';

    if (!responseText) {
      console.error('[simulator/generate] Empty response from AI');
      const fallback = getFallbackScenario();
      return NextResponse.json({ success: true, scenario: fallback, isFallback: true });
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
