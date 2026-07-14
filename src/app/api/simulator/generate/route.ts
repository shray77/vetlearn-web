import { NextRequest, NextResponse } from 'next/server';
import { getZAI } from '@/lib/zai';
import { extractJSON } from '@/lib/json-utils';
import { FALLBACK_SCENARIOS, getFallbackScenario, type SimulatorScenario } from '@/lib/fallback-scenarios';

const SYSTEM_PROMPT = `Ты — ветеринарный врач, создаёшь сценарии для симулятора. Студент осматривает животное, назначает анализы, ставит диагноз.

Верни СТРОГО JSON (без markdown, без комментариев):
{
  "id": "sim_1", "species": "вид", "breed": "порода", "age": "возраст", "sex": "пол", "weight": "вес",
  "difficulty": "beginner|intermediate|advanced", "topic": "тема",
  "ownerComplaint": "жалоба от первого лица (1-2 предложения)",
  "correctDiagnosis": "диагноз", "diagnosisOptions": [4 варианта, первый — правильный],
  "treatmentPlan": "план лечения", "treatmentOptions": [4 варианта, первый — правильный],
  "findings": [{"region":"head|neck|thorax|abdomen|skin|front_legs|hind_legs|tail","toolId":"inspection|stethoscope|thermometer|palpation|otoscope|ophthalmoscope|percussion|skin_scrape","finding":"описание","isNormal":false,"relevance":"critical|important|minor"}],
  "availableTests": [{"id":"test1","name":"название","icon":"🔬","cost":800,"category":"blood|imaging|microscopy|other","result":"результат","isRevealed":false}],
  "budget": 6000, "xpReward": 75,
  "anamnesisQuestions": [{"question":"вопрос","answer":"ответ владельца"}]
}

ПРАВИЛА:
- 10-14 находок: 5-6 ненормальных (2-3 critical), остальные норма
- 4-6 тестов с результатами, 1-2 лишних (для экономности)
- 5-6 вопросов анамнеза
- Бюджет: beginner=8000, intermediate=6000, advanced=4000
- ВСЁ на русском языке, никаких английских слов
- НЕ делай бабезиоз/пироплазмоз
- Диагноз и лечение клинически достоверны
- Варианты диагноза правдоподобны`;

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

    const zai = await getZAI();

    const difficultyDescriptions: Record<string, string> = {
      beginner: 'простой клинический случай с очевидной диагностикой, подходящий для начинающих студентов',
      intermediate: 'клинический случай средней сложности, требующий дифференциальной диагностики',
      advanced: 'сложный клинический случай с нетипичным течением и множественными патологиями',
    };

    const userPrompt = `Вид: ${species}. Сложность: ${difficulty} (${difficultyDescriptions[difficulty]}).${topic ? ` Тема: ${topic}.` : ''}

Создай клинический сценарий. Жалоба от первого лица. Всё на русском. НЕ бабезиоз.
Верни ТОЛЬКО JSON.`;

    // --- AI call (single attempt, no double-call overhead) ---
    let responseText = '';

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.9,
      max_tokens: 8192,
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
