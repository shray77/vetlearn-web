import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

const SYSTEM_PROMPT = `Ты — профессор ветеринарной медицины, оценивающий работу студента в интерактивном симуляторе ветеринарной практики.

АБСОЛЮТНОЕ ПРАВИЛО: Все тексты в ответе — ТОЛЬКО на русском языке. ЗАПРЕЩЕНО использовать английские слова, даже медицинские термины. Пиши по-русски: не "CBC" — "ОАК", не "X-ray" — "рентгенография", не "ultrasound" — "УЗИ", не "findings" — "результаты", не "reveals" — "показывает", не "treatment" — "лечение", не "diagnosis" — "диагноз". Если напишешь хоть одно английское слово — это ошибка.

Студент осматривал животное, назначал анализы и должен был поставить диагноз и назначить лечение.

Оцени по 4 критериям:
1. ПРАВИЛЬНОСТЬ ДИАГНОЗА (0-40 баллов): Совпадает ли с правильным диагнозом. Точный диагноз — 40, похожий — 20, неверный — 0.
2. ПРАВИЛЬНОСТЬ ЛЕЧЕНИЯ (0-25 баллов): Адекватно ли подобрано лечение. Полностью верное — 25, частично — 15, неверное — 0.
3. ПОЛНОТА ОБСЛЕДОВАНИЯ (0-20 баллов): Нашёл ли студент критические и важные находки. За каждую критическую находку — 5 баллов, за важную — 2 балла.
4. ЭКОНОМНОСТЬ (0-15 баллов): Не потратил ли лишние деньги на ненужные анализы. Минимальные затраты при обнаружении всего — 15, умеренные — 10, избыточные — 5.

ФОРМАТ ОТВЕТА — строго JSON:
{
  "score": 85,
  "diagnosisCorrect": true,
  "treatmentCorrect": true,
  "examinationScore": 18,
  "economyScore": 12,
  "feedback": "Общая обратная связь в 2-3 предложениях...",
  "diagnosisFeedback": "Подробная обратная связь по диагнозу...",
  "treatmentFeedback": "Подробная обратная связь по лечению...",
  "examinationFeedback": "Подробная обратная связь по полноте обследования...",
  "keyTakeaways": ["Главный вывод 1", "Главный вывод 2", "Главный вывод 3"],
  "xpEarned": 60,
  "grade": "good"
}

Оценки (grade):
- excellent: 90-100 (Отлично)
- good: 70-89 (Хорошо)
- satisfactory: 50-69 (Удовлетворительно)
- unsatisfactory: 0-49 (Неудовлетворительно)

XP: score × 0.8 (округлённо, минимум 5)

Все тексты ТОЛЬКО на русском языке. Верни ТОЛЬКО JSON.`;

// --- Multi-strategy JSON extraction ---

function tryDirectParse(text: string): unknown | null {
  try { return JSON.parse(text); } catch { return null; }
}

function tryStripMarkdownFences(text: string): unknown | null {
  try {
    let cleaned = text
      .replace(/^```(?:json|JSON)?\s*\n?/gm, '')
      .replace(/\n?```\s*$/gm, '')
      .replace(/^```\s*/gm, '')
      .trim();
    if (cleaned !== text) return JSON.parse(cleaned);
  } catch { /* fall through */ }
  return null;
}

function tryRegexExtract(text: string): unknown | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* fall through */ }
  }
  return null;
}

function tryFixCommonIssues(text: string): unknown | null {
  try {
    let jsonStr = text;
    const match = text.match(/\{[\s\S]*\}/);
    if (match) jsonStr = match[0];
    let fixed = jsonStr.replace(/,\s*([}\]])/g, '$1').replace(/(?<![\\])'/g, '"');
    return JSON.parse(fixed);
  } catch { return null; }
}

function extractJSON(text: string): unknown | null {
  const strategies = [tryDirectParse, tryStripMarkdownFences, tryRegexExtract, tryFixCommonIssues];
  for (const strategy of strategies) {
    const result = strategy(text);
    if (result !== null) return result;
  }
  return null;
}

// --- Evaluation structure validation ---

interface SimulatorEvaluation {
  score: number;
  diagnosisCorrect: boolean;
  treatmentCorrect: boolean;
  examinationScore: number;
  economyScore: number;
  feedback: string;
  diagnosisFeedback: string;
  treatmentFeedback: string;
  examinationFeedback: string;
  keyTakeaways: string[];
  xpEarned: number;
  grade: 'excellent' | 'good' | 'satisfactory' | 'unsatisfactory';
}

function buildFallbackEvaluation(session: any): SimulatorEvaluation {
  const scenario = session?.scenario || {};
  const findings = session?.discoveredFindings || [];
  const budgetSpent = session?.budgetSpent || 0;

  // Calculate scores
  let diagnosisScore = 0;
  const diagnosisCorrect = session?.diagnosisSubmitted === scenario?.correctDiagnosis;
  if (diagnosisCorrect) diagnosisScore = 40;

  let treatmentScore = 0;
  const treatmentCorrect = session?.treatmentSubmitted === scenario?.treatmentPlan ||
    (Array.isArray(scenario?.treatmentOptions) && session?.treatmentSubmitted === scenario?.treatmentOptions[0]);
  if (treatmentCorrect) treatmentScore = 25;

  // Examination score: count critical and important findings found
  const allFindings = Array.isArray(scenario?.findings) ? scenario.findings : [];
  const criticalFindings = allFindings.filter((f: any) => f.relevance === 'critical' && !f.isNormal);
  const importantFindings = allFindings.filter((f: any) => f.relevance === 'important' && !f.isNormal);

  let examinationScore = 0;
  for (const cf of criticalFindings) {
    const found = findings.some((f: any) => f.region === cf.region && f.toolId === cf.toolId);
    if (found) examinationScore += 5;
  }
  for (const imf of importantFindings) {
    const found = findings.some((f: any) => f.region === imf.region && f.toolId === imf.toolId);
    if (found) examinationScore += 2;
  }
  examinationScore = Math.min(20, examinationScore);

  // Economy score
  let economyScore = 15;
  const budget = scenario?.budget || 6000;
  const spentRatio = budgetSpent / budget;
  if (spentRatio > 0.8) economyScore = 5;
  else if (spentRatio > 0.5) economyScore = 10;

  const totalScore = Math.min(100, diagnosisScore + treatmentScore + examinationScore + economyScore);

  // Grade
  let grade: 'excellent' | 'good' | 'satisfactory' | 'unsatisfactory' = 'unsatisfactory';
  if (totalScore >= 90) grade = 'excellent';
  else if (totalScore >= 70) grade = 'good';
  else if (totalScore >= 50) grade = 'satisfactory';

  const xpEarned = Math.max(5, Math.round(totalScore * 0.8));

  return {
    score: totalScore,
    diagnosisCorrect,
    treatmentCorrect,
    examinationScore,
    economyScore,
    feedback: `Итого: ${totalScore} баллов из 100. ${diagnosisCorrect ? 'Диагноз поставлен верно.' : 'Диагноз неверный.'} ${treatmentCorrect ? 'Лечение подобрано корректно.' : 'Лечение требует коррекции.'}`,
    diagnosisFeedback: diagnosisCorrect
      ? `Верно! Правильный диагноз: ${scenario?.correctDiagnosis || 'не указан'}.`
      : `Неверно. Правильный диагноз: ${scenario?.correctDiagnosis || 'не указан'}. Ваш диагноз: ${session?.diagnosisSubmitted || 'не указан'}.`,
    treatmentFeedback: treatmentCorrect
      ? 'Лечение подобрано корректно и соответствует стандартам ветеринарии.'
      : `Рекомендуемое лечение: ${Array.isArray(scenario?.treatmentOptions) ? scenario?.treatmentOptions[0] : scenario?.treatmentPlan || 'не указано'}.`,
    examinationFeedback: `Обнаружено ${findings.length} находок из ${allFindings.length}. ${criticalFindings.length} критических находок.`,
    keyTakeaways: [
      `Правильный диагноз: ${scenario?.correctDiagnosis || '—'}`,
      diagnosisCorrect ? 'Диагноз подтверждён.' : 'Внимательно изучите дифференциальную диагностику.',
    ],
    xpEarned,
    grade,
  };
}

function validateEvaluation(data: any, session: any): SimulatorEvaluation {
  const e = data as any;

  // Ensure numeric fields
  if (typeof e.score !== 'number') e.score = 0;
  e.score = Math.max(0, Math.min(100, e.score));

  if (typeof e.examinationScore !== 'number') e.examinationScore = 0;
  e.examinationScore = Math.max(0, Math.min(20, e.examinationScore));

  if (typeof e.economyScore !== 'number') e.economyScore = 0;
  e.economyScore = Math.max(0, Math.min(15, e.economyScore));

  if (typeof e.xpEarned !== 'number') e.xpEarned = Math.max(5, Math.round(e.score * 0.8));
  e.xpEarned = Math.max(5, e.xpEarned);

  if (!e.feedback || typeof e.feedback !== 'string') {
    e.feedback = 'Обратная связь недоступна.';
  }
  if (!e.diagnosisFeedback || typeof e.diagnosisFeedback !== 'string') {
    e.diagnosisFeedback = e.diagnosisCorrect ? 'Диагноз верный.' : 'Диагноз неверный.';
  }
  if (!e.treatmentFeedback || typeof e.treatmentFeedback !== 'string') {
    e.treatmentFeedback = e.treatmentCorrect ? 'Лечение корректное.' : 'Лечение некорректное.';
  }
  if (!e.examinationFeedback || typeof e.examinationFeedback !== 'string') {
    e.examinationFeedback = 'Данные по обследованию недоступны.';
  }
  if (!Array.isArray(e.keyTakeaways)) e.keyTakeaways = [];

  // Ensure grade is valid
  if (!['excellent', 'good', 'satisfactory', 'unsatisfactory'].includes(e.grade)) {
    if (e.score >= 90) e.grade = 'excellent';
    else if (e.score >= 70) e.grade = 'good';
    else if (e.score >= 50) e.grade = 'satisfactory';
    else e.grade = 'unsatisfactory';
  }

  e.diagnosisCorrect = !!e.diagnosisCorrect;
  e.treatmentCorrect = !!e.treatmentCorrect;

  return e as SimulatorEvaluation;
}

// --- Main handler ---

export async function POST(req: NextRequest) {
  try {
    const { session } = await req.json();

    if (!session || !session.scenario) {
      return NextResponse.json(
        { error: 'Укажите сессию симулятора' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    const scenario = session.scenario;
    const findings = session.discoveredFindings || [];

    // Build summary of discovered vs total findings
    const allFindings = Array.isArray(scenario.findings) ? scenario.findings : [];
    const criticalFindings = allFindings.filter((f: any) => f.relevance === 'critical' && !f.isNormal);
    const importantFindings = allFindings.filter((f: any) => f.relevance === 'important' && !f.isNormal);
    const discoveredCritical = criticalFindings.filter((cf: any) =>
      findings.some((f: any) => f.region === cf.region && f.toolId === cf.toolId)
    );
    const discoveredImportant = importantFindings.filter((imf: any) =>
      findings.some((f: any) => f.region === imf.region && f.toolId === imf.toolId)
    );

    const testsOrdered = Array.isArray(scenario.availableTests)
      ? scenario.availableTests.filter((t: any) => t.isRevealed)
      : [];

    const userPrompt = `Оцени работу студента в симуляторе ветеринарной практики.

ПАЦИЕНТ:
- Вид: ${scenario.species}, Порода: ${scenario.breed}
- Возраст: ${scenario.age}, Пол: ${scenario.sex}, Вес: ${scenario.weight}
- Жалоба владельца: "${scenario.ownerComplaint}"

ПРАВИЛЬНЫЙ ДИАГНОЗ: ${scenario.correctDiagnosis}
ПРАВИЛЬНОЕ ЛЕЧЕНИЕ: ${scenario.treatmentPlan}

ДИАГНОЗ СТУДЕНТА: ${session.diagnosisSubmitted || 'Не указан'}
ЛЕЧЕНИЕ СТУДЕНТА: ${session.treatmentSubmitted || 'Не указано'}

ОБСЛЕДОВАНИЕ:
- Всего находок в сценарии: ${allFindings.length}
- Найдено студентом: ${findings.length}
- Критических (ненормальных): ${criticalFindings.length} всего, ${discoveredCritical.length} найдено
- Важных (ненормальных): ${importantFindings.length} всего, ${discoveredImportant.length} найдено

Найденные студентом находки:
${findings.map((f: any) => `- [${f.region}/${f.toolId}] ${f.isNormal ? '✅ Норма' : '⚠️ Патология'} (${f.relevance}): ${f.finding}`).join('\n')}

Пропущенные критические находки:
${criticalFindings.filter((cf: any) => !findings.some((f: any) => f.region === cf.region && f.toolId === cf.toolId))
  .map((f: any) => `- [${f.region}/${f.toolId}] ${f.finding}`).join('\n') || 'Нет (все найдены)'}

ЛАБОРАТОРНЫЕ ТЕСТЫ:
- Назначено тестов: ${testsOrdered.length} из ${scenario.availableTests?.length || 0}
- Потрачено из бюджета: ${session.budgetSpent}₽ из ${scenario.budget}₽

Дай детальную оценку. Будь конструктивным и обучающим.`;

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
      console.warn('[simulator/evaluate] response_format not supported, retrying without it:', formatError);
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

    let evaluation: SimulatorEvaluation;

    if (parsed === null) {
      console.error('[simulator/evaluate] All JSON parsing strategies failed. Using fallback evaluation.');
      console.error('[simulator/evaluate] RAW RESPONSE TEXT:', responseText.substring(0, 1000));
      evaluation = buildFallbackEvaluation(session);
    } else {
      evaluation = validateEvaluation(parsed, session);
    }

    return NextResponse.json({
      success: true,
      ...evaluation,
    });
  } catch (error) {
    console.error('[simulator/evaluate] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Ошибка при оценке симуляции' },
      { status: 500 }
    );
  }
}
