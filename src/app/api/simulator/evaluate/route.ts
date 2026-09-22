import { NextRequest, NextResponse } from 'next/server';
import { getZAI } from '@/lib/zai';
import { extractJSON } from '@/lib/json-utils';
import { getCanonicalScenario } from '@/lib/simulator-session-store';
import type { SimulatorScenario } from '@/lib/fallback-scenarios';

// Скоринг ПОЛНОСТЬЮ детерминированный на сервере (анти-чит): клиент больше не
// может поднять балл подстановкой «правильного диагноза» в payload. Роль AI —
// только обучающие тексты, причём AI получает фактические цифры и пишет feedback,
// согласованный с ними. Если AI недоступен — тексты генерируются локально.

const FEEDBACK_SYSTEM_PROMPT = `Ты — профессор ветеринарной медицины, дающий обратную связь студенту после симуляции клинического приёма.

Система уже рассчитала баллы по строгим критериям:
1. ПРАВИЛЬНОСТЬ ДИАГНОЗА (0-40): точный диагноз — 40, иначе 0.
2. ПРАВИЛЬНОСТЬ ЛЕЧЕНИЯ (0-25): верное — 25, иначе 0.
3. ПОЛНОТА ОБСЛЕДОВАНИЯ (0-20): 5 баллов за каждую найденную критическую находку, 2 — за важную.
4. ЭКОНОМНОСТЬ (0-15): 15 — минимум затрат при полном обследовании, 10 — умеренно, 5 — избыточно.

Тебе будут переданы ФАКТИЧЕСКИЕ баллы студента и детали работы. Пиши обратную связь, согласованную с этими цифрами. НЕ выдумывай другие баллы и НЕ пересчитывай их.

ФОРМАТ ОТВЕТА — строго JSON:
{
  "feedback": "Общая обратная связь в 2-3 предложениях...",
  "diagnosisFeedback": "Подробная обратная связь по диагнозу...",
  "treatmentFeedback": "Подробная обратная связь по лечению...",
  "examinationFeedback": "Подробная обратная связь по полноте обследования...",
  "keyTakeaways": ["Главный вывод 1", "Главный вывод 2", "Главный вывод 3"]
}

Все тексты ТОЛЬКО на русском языке. Верни ТОЛЬКО JSON.

ЗАПРЕЩЕНО использовать английские слова, даже медицинские термины. Пиши по-русски: не "CBC" — "ОАК", не "X-ray" — "рентгенография", не "ultrasound" — "УЗИ", не "CT" — "КТ". Если напишешь хоть одно английское слово — это грубая ошибка.`;

// --- Types ---

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

interface VerifiedInput {
  base: SimulatorScenario;
  verifiedFindings: { region: string; toolId: string; finding: string; isNormal?: boolean; relevance?: string }[];
  verifiedSpent: number;
  diagnosisVerifiable: boolean;
  treatmentVerifiable: boolean;
}

const norm = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

// --- Deterministic scoring ---

function computeDeterministicEvaluation(session: any, input: VerifiedInput): SimulatorEvaluation {
  const { base, verifiedFindings, verifiedSpent } = input;
  const scenario = session?.scenario || {};

  // 1. Diagnosis — сверка с каноном, если канон доступен
  let diagnosisCorrect: boolean;
  if (input.diagnosisVerifiable) {
    diagnosisCorrect = norm(session?.diagnosisSubmitted) === norm(base.correctDiagnosis);
  } else {
    // Канон недоступен (рестарт сервера / чужой сценарий) — доверяем AI-булеву,
    // но он будет перекрыт потолком баллов ниже.
    diagnosisCorrect = !!scenario?.diagnosisCorrect;
  }

  // 2. Treatment — канонический correctTreatment (строка, зафиксированная до шаффла)
  let treatmentCorrect: boolean;
  if (input.treatmentVerifiable) {
    const correctTreatment = norm(base.correctTreatment) || norm(base.treatmentOptions?.[0]) || norm(base.treatmentPlan);
    treatmentCorrect = norm(session?.treatmentSubmitted) === correctTreatment && correctTreatment.length > 0;
  } else {
    treatmentCorrect = !!scenario?.treatmentCorrect;
  }

  // 3. Examination — только верифицированные находки против канонических
  const allFindings = Array.isArray(base.findings) ? base.findings : [];
  const criticalFindings = allFindings.filter((f) => f.relevance === 'critical' && !f.isNormal);
  const importantFindings = allFindings.filter((f) => f.relevance === 'important' && !f.isNormal);

  let examinationScore = 0;
  for (const cf of criticalFindings) {
    if (verifiedFindings.some((f) => f.region === cf.region && f.toolId === cf.toolId)) examinationScore += 5;
  }
  for (const imf of importantFindings) {
    if (verifiedFindings.some((f) => f.region === imf.region && f.toolId === imf.toolId)) examinationScore += 2;
  }
  examinationScore = Math.min(20, examinationScore);

  // 4. Economy — по верифицированным тратам (кламп по сумме реально открытых тестов)
  const budget = typeof base.budget === 'number' && base.budget > 0 ? base.budget : 6000;
  const spentRatio = verifiedSpent / budget;
  let economyScore = 15;
  if (spentRatio > 0.8) economyScore = 5;
  else if (spentRatio > 0.5) economyScore = 10;

  // Итог: непроверяемые критерии — 0 (потолок), верифицируемые — из сравнения строк
  const totalScore = Math.min(
    100,
    (diagnosisCorrect ? 40 : 0) + (treatmentCorrect ? 25 : 0) + examinationScore + economyScore
  );

  let grade: SimulatorEvaluation['grade'] = 'unsatisfactory';
  if (totalScore >= 90) grade = 'excellent';
  else if (totalScore >= 70) grade = 'good';
  else if (totalScore >= 50) grade = 'satisfactory';

  const xpEarned = Math.max(5, Math.min(120, Math.round(totalScore * 0.8)));

  // Локальные тексты (используются, если AI недоступен)
  const diagnosis = norm(base.correctDiagnosis) || norm(session?.diagnosisSubmitted) || 'не указан';
  const treatment = norm(base.correctTreatment) || norm(base.treatmentOptions?.[0]) || norm(base.treatmentPlan) || 'не указано';
  const texts = {
    feedback: `Итого: ${totalScore} баллов из 100. ${diagnosisCorrect ? 'Диагноз поставлен верно.' : 'Диагноз неверный.'} ${treatmentCorrect ? 'Лечение подобрано корректно.' : 'Лечение требует коррекции.'}`,
    diagnosisFeedback: diagnosisCorrect
      ? `Верно! Правильный диагноз: ${diagnosis}.`
      : `Неверно. Правильный диагноз: ${diagnosis}. Ваш диагноз: ${norm(session?.diagnosisSubmitted) || 'не указан'}.`,
    treatmentFeedback: treatmentCorrect
      ? 'Лечение подобрано корректно и соответствует стандартам ветеринарии.'
      : `Рекомендуемое лечение: ${treatment}.`,
    examinationFeedback: `Обнаружено ${verifiedFindings.length} находок из ${allFindings.length}. Критических: ${criticalFindings.length}, важных: ${importantFindings.length}.`,
    keyTakeaways: [
      `Правильный диагноз: ${diagnosis}`,
      diagnosisCorrect ? 'Диагноз подтверждён.' : 'Внимательно изучите дифференциальную диагностику.',
    ],
  };

  return {
    score: totalScore,
    diagnosisCorrect,
    treatmentCorrect,
    examinationScore,
    economyScore,
    ...texts,
    xpEarned,
    grade,
  };
}

// --- Verification of client-claimed data ---

function verifyInput(session: any, base: SimulatorScenario): VerifiedInput {
  const claimedFindings = Array.isArray(session?.discoveredFindings) ? session.discoveredFindings : [];
  const canonicalFindings = Array.isArray(base.findings) ? base.findings : [];

  // Находка засчитывается, только если она существует в сценарии (region+toolId+текст)
  const verifiedFindings = claimedFindings
    .filter((f: any) =>
      f &&
      typeof f.region === 'string' &&
      typeof f.toolId === 'string' &&
      canonicalFindings.some(
        (cf) => cf.region === f.region && cf.toolId === f.toolId && norm(cf.finding) === norm(f.finding)
      )
    )
    .slice(0, 50);

  // Траты: кламп по сумме стоимостей открытых тестов, реально существующих в сценарии.
  // isRevealed клиент переключает сам, поэтому доверяем только существованию теста в каноне.
  const claimedScenarioTests = Array.isArray(session?.scenario?.availableTests) ? session.scenario.availableTests : [];
  const canonicalTests = Array.isArray(base.availableTests) ? base.availableTests : [];
  const revealedIds = new Set(
    claimedScenarioTests.filter((t: any) => t && t.isRevealed && typeof t.id === 'string').map((t: any) => t.id)
  );
  const maxJustifiedSpend = canonicalTests
    .filter((t) => revealedIds.has(t.id) && typeof t.cost === 'number')
    .reduce((sum, t) => sum + t.cost, 0);
  const claimedSpent = typeof session?.budgetSpent === 'number' && session.budgetSpent > 0 ? session.budgetSpent : 0;
  const verifiedSpent = Math.min(claimedSpent, maxJustifiedSpend);

  // Верифицируемость ответов: канонический сценарий содержит правильные ответы.
  // Если сцена пришла от нас sanitized (нормальный путь через rememberScenario) —
  // ответы есть только в каноне из памяти сервера.
  const diagnosisVerifiable = norm(base.correctDiagnosis).length > 0;
  const treatmentVerifiable =
    norm(base.correctTreatment).length > 0 || norm(base.treatmentOptions?.[0]).length > 0 || norm(base.treatmentPlan).length > 0;

  return { base, verifiedFindings, verifiedSpent, diagnosisVerifiable, treatmentVerifiable };
}

// --- AI feedback texts ---

async function fetchAIFeedback(base: SimulatorScenario, session: any, det: SimulatorEvaluation): Promise<Partial<SimulatorEvaluation> | null> {
  try {
    const zai = await getZAI();
    const findings = session.discoveredFindings || [];
    const allFindings = Array.isArray(base.findings) ? base.findings : [];

    const userPrompt = `Дай обратную связь студенту симулятора ветеринарной практики.

ПАЦИЕНТ:
- Вид: ${base.species}, Порода: ${base.breed}
- Возраст: ${base.age}, Пол: ${base.sex}, Вес: ${base.weight}
- Жалоба владельца: "${base.ownerComplaint}"

ФАКТИЧЕСКИЙ РЕЗУЛЬТАТ (рассчитан системой, согласуй текст с этими цифрами):
- Итоговый балл: ${det.score}/100 (оценка: ${det.grade})
- Диагноз студента: "${norm(session.diagnosisSubmitted) || 'Не указан'}" — ${det.diagnosisCorrect ? 'ВЕРНО' : 'НЕВЕРНО'} (правильный: "${norm(base.correctDiagnosis)}")
- Лечение студента: "${norm(session.treatmentSubmitted) || 'Не указано'}" — ${det.treatmentCorrect ? 'ВЕРНО' : 'НЕВЕРНО'}
- Полнота обследования: ${det.examinationScore}/20 (найдено находок: ${findings.length} из ${allFindings.length})
- Экономность: ${det.economyScore}/15 (потрачено: ${session.budgetSpent || 0}₽ из ${base.budget}₽)

Дай обучающую обратную связь по четырём критериям. Верни ТОЛЬКО JSON по формату.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: FEEDBACK_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    });
    const responseText = completion.choices[0]?.message?.content || '';
    if (!responseText) return null;

    const parsed: unknown = extractJSON(responseText);
    if (parsed === null || typeof parsed !== 'object') return null;

    const e = parsed as Record<string, unknown>;
    const asString = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
    const feedback = asString(e.feedback);
    if (!feedback) return null; // без главного текста считаем ответ AI непригодным

    const keyTakeaways = Array.isArray(e.keyTakeaways)
      ? e.keyTakeaways.filter((t): t is string => typeof t === 'string' && t.trim().length > 0).slice(0, 5)
      : [];

    return {
      feedback,
      diagnosisFeedback: asString(e.diagnosisFeedback) ?? undefined,
      treatmentFeedback: asString(e.treatmentFeedback) ?? undefined,
      examinationFeedback: asString(e.examinationFeedback) ?? undefined,
      keyTakeaways: keyTakeaways.length ? keyTakeaways : undefined,
    } as Partial<SimulatorEvaluation>;
  } catch (error) {
    console.error('[simulator/evaluate] AI feedback failed, using deterministic texts:', error);
    return null;
  }
}

// --- Main handler ---

export async function POST(req: NextRequest) {
  try {
    const { session } = await req.json();

    if (!session || !session.scenario) {
      return NextResponse.json({ error: 'Укажите сессию симулятора' }, { status: 400 });
    }

    // --- Payload size validation ---
    const MAX_SESSION_SIZE = 100 * 1024; // 100 KB
    if (JSON.stringify(session).length > MAX_SESSION_SIZE) {
      return NextResponse.json({ error: 'Данные сессии слишком большие (максимум 100 КБ)' }, { status: 413 });
    }

    // --- Канонический сценарий: сервер помнит то, что сам сгенерировал ---
    const canonical = getCanonicalScenario(session.scenario?.id);
    // Fallback: если канон потерян (рестарт сервера), используем сценарий из сессии —
    // но ответы в нём отсутствуют (sanitized), поэтому скоринг деградирует безопасно:
    // непроверяемые критерии дают 0, находки всё равно верифицируются против сценария.
    const base: SimulatorScenario = canonical ?? (session.scenario as SimulatorScenario);

    const verified = verifyInput(session, base);
    const evaluation = computeDeterministicEvaluation(session, verified);

    // --- AI-тексты поверх детерминированной оценки ---
    const aiTexts = await fetchAIFeedback(base, session, evaluation);
    if (aiTexts) {
      if (aiTexts.feedback) evaluation.feedback = aiTexts.feedback;
      if (aiTexts.diagnosisFeedback) evaluation.diagnosisFeedback = aiTexts.diagnosisFeedback;
      if (aiTexts.treatmentFeedback) evaluation.treatmentFeedback = aiTexts.treatmentFeedback;
      if (aiTexts.examinationFeedback) evaluation.examinationFeedback = aiTexts.examinationFeedback;
      if (aiTexts.keyTakeaways?.length) evaluation.keyTakeaways = aiTexts.keyTakeaways;
    }

    return NextResponse.json({
      success: true,
      ...evaluation,
    });
  } catch (error) {
    console.error('[simulator/evaluate] Unexpected error:', error);
    return NextResponse.json({ error: 'Ошибка при оценке симуляции' }, { status: 500 });
  }
}
