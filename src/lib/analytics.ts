/**
 * D.5 — Deep analytics: pattern detection on user's answer history.
 *
 * Computes:
 *   - Per-topic trends over time (last 14 days)
 *   - Per-question-type weakness (diagnosis/treatment/differential/lab/prognosis)
 *   - Per-species weakness
 *   - Best/worst time-of-day for the user
 *   - Streak of correct answers (longest run)
 *   - Topic that needs urgent attention (lowest mastery + most attempts)
 *
 * All compute is pure (no LLM call). Caller passes the persisted state,
 * gets back a structured insight object the UI can render directly.
 */

import type {
  AssessmentResult,
  ClinicalCase,
  StudentProfile,
} from './types';
import type { SimulatorHistoryEntry } from './store';
import type { OSCEResult } from './types';

export interface TopicTrendPoint {
  date: string; // YYYY-MM-DD
  topicId: string;
  accuracy: number; // 0-100
  attempts: number;
}

export interface TopicTrend {
  topicId: string;
  topicName: string;
  currentLevel: number;
  trend: 'up' | 'down' | 'stable' | 'insufficient_data';
  delta: number; // change over window
  points: TopicTrendPoint[];
}

export interface QuestionTypeStat {
  type: string;
  total: number;
  correct: number;
  accuracy: number;
  weakness: 'high' | 'medium' | 'low' | 'none';
}

export interface SpeciesStat {
  species: string;
  total: number;
  correct: number;
  accuracy: number;
}

export interface TimeOfDayStat {
  hourBucket: 'morning' | 'afternoon' | 'evening' | 'night';
  total: number;
  accuracy: number;
  label: string;
}

export interface AnalyticsInsight {
  topicTrends: TopicTrend[];
  questionTypeStats: QuestionTypeStat[];
  speciesStats: SpeciesStat[];
  timeOfDayStats: TimeOfDayStat[];
  longestCorrectStreak: number;
  currentCorrectStreak: number;
  urgentTopic: { topicId: string; topicName: string; reason: string } | null;
  totalQuestionsAnswered: number;
  overallAccuracy: number;
  // Plain-text insight for the dashboard card
  summary: string;
  // Pattern flags
  patterns: Array<{ type: 'warning' | 'success' | 'info'; text: string }>;
}

function dateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateKey(d);
}

// Локальная дата YYYY-MM-DD (UTC через toISOString сдвигал день для UTC+)
function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function bucketHour(hour: number): TimeOfDayStat['hourBucket'] {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 23) return 'evening';
  return 'night';
}

const HOUR_LABELS: Record<TimeOfDayStat['hourBucket'], string> = {
  morning: 'Утро (6-12)',
  afternoon: 'День (12-18)',
  evening: 'Вечер (18-23)',
  night: 'Ночь (23-6)',
};

/**
 * Build per-topic trend over the last N days from assessment history.
 */
function buildTopicTrends(
  assessmentHistory: AssessmentResult[],
  skillMap: Record<string, number>,
  days: number = 14
): TopicTrend[] {
  const cutoff = dateNDaysAgo(days);
  const topicNames: Record<string, string> = {};

  // Aggregate per (date, topicId)
  const dailyStats: Record<string, Record<string, { correct: number; total: number }>> = {};

  for (const a of assessmentHistory) {
    const entryDate = localDateKey(new Date(a.completedAt));
    if (entryDate < cutoff) continue;
    const date = entryDate;
    if (!dailyStats[date]) dailyStats[date] = {};
    for (let i = 0; i < a.questions.length; i++) {
      const q = a.questions[i]!;
      topicNames[q.topicId] = q.topicName;
      if (!dailyStats[date]![q.topicId]) {
        dailyStats[date]![q.topicId] = { correct: 0, total: 0 };
      }
      dailyStats[date]![q.topicId]!.total++;
      if (a.answers[i] === q.correctIndex) {
        dailyStats[date]![q.topicId]!.correct++;
      }
    }
  }

  // Кейсы НЕ включаем: в slim-истории нет ответов студента — только количество
  // вопросов. Учёт их в total без correct занижал точность до фиктивных 0%.

  // Build trend per topic
  const topicsWithDates = new Set<string>();
  for (const date of Object.keys(dailyStats)) {
    for (const t of Object.keys(dailyStats[date]!)) {
      topicsWithDates.add(t);
    }
  }

  const trends: TopicTrend[] = [];
  for (const topicId of topicsWithDates) {
    const points: TopicTrendPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = dateNDaysAgo(i);
      const s = dailyStats[date]?.[topicId];
      if (s && s.total > 0) {
        points.push({
          date,
          topicId,
          accuracy: Math.round((s.correct / s.total) * 100),
          attempts: s.total,
        });
      }
    }
    if (points.length < 2) {
      trends.push({
        topicId,
        topicName: topicNames[topicId] || topicId,
        currentLevel: skillMap[topicId] ?? 0,
        trend: 'insufficient_data',
        delta: 0,
        points,
      });
      continue;
    }
    const first = points[0]!.accuracy;
    const last = points[points.length - 1]!.accuracy;
    const delta = last - first;
    let trend: TopicTrend['trend'];
    if (delta > 10) trend = 'up';
    else if (delta < -10) trend = 'down';
    else trend = 'stable';

    trends.push({
      topicId,
      topicName: topicNames[topicId] || topicId,
      currentLevel: skillMap[topicId] ?? 0,
      trend,
      delta,
      points,
    });
  }

  // Sort by lowest currentLevel first (most urgent)
  trends.sort((a, b) => a.currentLevel - b.currentLevel);
  return trends.slice(0, 8); // top 8 most relevant
}

/**
 * Aggregate stats by question type from assessment history.
 * Кейсы не включаем: в slim-истории нет ответов — иначе все типы показывали
 * фиктивные 0% и генерировали ложные «слабые места».
 */
function buildQuestionTypeStats(
  assessmentHistory: AssessmentResult[]
): QuestionTypeStat[] {
  const map: Record<string, { total: number; correct: number }> = {};

  for (const a of assessmentHistory) {
    for (let i = 0; i < a.questions.length; i++) {
      const q = a.questions[i]!;
      const type = 'assessment';
      if (!map[type]) map[type] = { total: 0, correct: 0 };
      map[type]!.total++;
      if (a.answers[i] === q.correctIndex) map[type]!.correct++;
    }
  }

  return Object.entries(map).map(([type, s]) => {
    const accuracy = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
    let weakness: QuestionTypeStat['weakness'];
    if (s.total < 5) weakness = 'none';
    else if (accuracy < 50) weakness = 'high';
    else if (accuracy < 70) weakness = 'medium';
    else weakness = 'low';
    return { type, total: s.total, correct: s.correct, accuracy, weakness };
  }).sort((a, b) => a.accuracy - b.accuracy);
}

/**
 * Species stats из истории симулятора (там есть и вид, и итоговый балл).
 * Старый вариант считал по кейсам, где correct всегда 0 → фиктивные 0%.
 */
function buildSpeciesStats(
  caseHistory: ClinicalCase[],
  simulatorHistory: SimulatorHistoryEntry[]
): SpeciesStat[] {
  const map: Record<string, { total: number; correct: number }> = {};
  for (const s of simulatorHistory) {
    if (!s.species) continue;
    if (!map[s.species]) map[s.species] = { total: 0, correct: 0 };
    map[s.species]!.total++;
    if ((s.score ?? 0) >= 60) map[s.species]!.correct++;
  }
  // Кейсы добавляем только в total (без correct), если по ним вообще нет данных из симулятора
  if (Object.keys(map).length === 0) {
    for (const c of caseHistory) {
      if (!map[c.species]) map[c.species] = { total: 0, correct: 0 };
      map[c.species]!.total++;
    }
    return Object.entries(map).map(([species, s]) => ({
      species,
      total: s.total,
      correct: -1, // -1 = нет данных о правильности — UI покажет только количество
      accuracy: -1,
    })).sort((a, b) => b.total - a.total);
  }
  return Object.entries(map).map(([species, s]) => ({
    species,
    total: s.total,
    correct: s.correct,
    accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
  })).sort((a, b) => b.total - a.total);
}

function buildTimeOfDayStats(
  assessmentHistory: AssessmentResult[],
  osceHistory: OSCEResult[]
): TimeOfDayStat[] {
  const map: Record<TimeOfDayStat['hourBucket'], { total: number; correct: number }> = {
    morning: { total: 0, correct: 0 },
    afternoon: { total: 0, correct: 0 },
    evening: { total: 0, correct: 0 },
    night: { total: 0, correct: 0 },
  };

  for (const a of assessmentHistory) {
    const hour = new Date(a.completedAt).getHours();
    const bucket = bucketHour(hour);
    map[bucket]!.total += a.answers.length;
    let correct = 0;
    for (let i = 0; i < a.questions.length; i++) {
      if (a.answers[i] === a.questions[i]!.correctIndex) correct++;
    }
    map[bucket]!.correct += correct;
  }

  // Кейсы не учитываем: в slim-истории нет ответов — они бы разбавляли accuracy нулями

  for (const o of osceHistory) {
    const hour = new Date(o.completedAt).getHours();
    map[bucketHour(hour)]!.total += 1;
    map[bucketHour(hour)]!.correct += o.totalScore >= 6 ? 1 : 0;
  }

  return (Object.keys(map) as Array<TimeOfDayStat['hourBucket']>).map((bucket) => ({
    hourBucket: bucket,
    total: map[bucket]!.total,
    accuracy: map[bucket]!.total > 0 ? Math.round((map[bucket]!.correct / map[bucket]!.total) * 100) : 0,
    label: HOUR_LABELS[bucket],
  }));
}

function computeStreaks(assessmentHistory: AssessmentResult[]): { longest: number; current: number } {
  // Sort by date ascending
  const sorted = [...assessmentHistory].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  let longest = 0;
  let current = 0;
  let running = 0;
  for (const a of sorted) {
    const score = a.score ?? 0;
    if (score >= 60) {
      running++;
      current = running;
      if (running > longest) longest = running;
    } else {
      running = 0;
      current = 0;
    }
  }
  return { longest, current };
}

export function computeAnalytics(
  profile: StudentProfile,
  assessmentHistory: AssessmentResult[],
  caseHistory: ClinicalCase[],
  osceHistory: OSCEResult[],
  simulatorHistory: SimulatorHistoryEntry[]
): AnalyticsInsight {
  const topicTrends = buildTopicTrends(assessmentHistory, profile.skillMap);
  const questionTypeStats = buildQuestionTypeStats(assessmentHistory);
  const speciesStats = buildSpeciesStats(caseHistory, simulatorHistory);
  const timeOfDayStats = buildTimeOfDayStats(assessmentHistory, osceHistory);
  const { longest: longestCorrectStreak, current: currentCorrectStreak } = computeStreaks(assessmentHistory);

  // Urgent topic: lowest mastery + at least 3 attempts
  let urgentTopic: AnalyticsInsight['urgentTopic'] = null;
  const sortedByMastery = [...topicTrends].sort((a, b) => a.currentLevel - b.currentLevel);
  for (const t of sortedByMastery) {
    const totalAttempts = t.points.reduce((sum, p) => sum + p.attempts, 0);
    if (totalAttempts >= 3 && t.currentLevel < 50) {
      urgentTopic = {
        topicId: t.topicId,
        topicName: t.topicName,
        reason: `Уровень ${t.currentLevel}% при ${totalAttempts} попытках — требует внимания`,
      };
      break;
    }
  }

  // Patterns
  const patterns: AnalyticsInsight['patterns'] = [];
  if (urgentTopic) {
    patterns.push({
      type: 'warning',
      text: `Слабая тема: «${urgentTopic.topicName}» — ${urgentTopic.reason}`,
    });
  }
  const weakestQType = questionTypeStats.find((s) => s.weakness === 'high');
  if (weakestQType) {
    patterns.push({
      type: 'warning',
      text: `Систематически низкий результат по типу вопросов: ${weakestQType.type} (${weakestQType.accuracy}%)`,
    });
  }
  if (longestCorrectStreak >= 5) {
    patterns.push({
      type: 'success',
      text: `Лучшая серия успешных тестов: ${longestCorrectStreak} подряд!`,
    });
  }
  // Best time of day
  const bestTime = [...timeOfDayStats].filter((t) => t.total >= 3).sort((a, b) => b.accuracy - a.accuracy)[0];
  if (bestTime) {
    patterns.push({
      type: 'info',
      text: `Лучшее время для занятий: ${bestTime.label} (${bestTime.accuracy}% верных)`,
    });
  }

  // Summary text
  const totalAnswered = profile.totalAnswers;
  const overallAccuracy = totalAnswered > 0
    ? Math.round((profile.correctAnswers / totalAnswered) * 100)
    : 0;
  let summary: string;
  if (totalAnswered < 10) {
    summary = 'Недостаточно данных для глубокой аналитики. Ответьте минимум на 10 вопросов.';
  } else if (urgentTopic) {
    summary = `Фокус на «${urgentTopic.topicName}» — ${urgentTopic.reason}.`;
  } else if (overallAccuracy >= 75) {
    summary = `Отличный прогресс! Общая точность ${overallAccuracy}%. Поддерживайте регулярное повторение.`;
  } else {
    summary = `Общая точность ${overallAccuracy}%. Проходите больше тестов для роста.`;
  }

  return {
    topicTrends,
    questionTypeStats,
    speciesStats,
    timeOfDayStats,
    longestCorrectStreak,
    currentCorrectStreak,
    urgentTopic,
    totalQuestionsAnswered: totalAnswered,
    overallAccuracy,
    summary,
    patterns,
  };
}
