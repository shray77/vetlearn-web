/**
 * Achievements + Weekly Leagues.
 *
 * Achievements: badge-style milestones unlocked by user actions. Pure
 * compute from the persisted state — no server, no LLM.
 *
 * Weekly Leagues: Bronze / Silver / Gold / Platinum based on XP earned
 * during the current ISO week (Mon-Sun). Resets every Monday 00:00.
 */

import type {
  StudentProfile,
  AssessmentResult,
  ClinicalCase,
} from './types';
import type { SimulatorHistoryEntry } from './store';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  unlocked: boolean;
  progress: number; // 0-100
  progressText?: string; // e.g. "3/5"
}

export interface League {
  id: 'bronze' | 'silver' | 'gold' | 'platinum';
  name: string;
  icon: string;
  color: string;
  minXpThisWeek: number;
  maxXpThisWeek: number;
}

export const LEAGUES: League[] = [
  { id: 'bronze',   name: 'Бронза',    icon: 'bronze', color: '#CD7F32', minXpThisWeek: 0,    maxXpThisWeek: 100 },
  { id: 'silver',   name: 'Серебро',   icon: 'silver', color: '#C0C0C0', minXpThisWeek: 100,  maxXpThisWeek: 250 },
  { id: 'gold',     name: 'Золото',    icon: 'gold', color: '#D9A24A', minXpThisWeek: 250,  maxXpThisWeek: 500 },
  { id: 'platinum', name: 'Платина',   icon: 'platinum', color: '#E5E4E2', minXpThisWeek: 500,  maxXpThisWeek: Infinity },
];

export function getLeagueForXp(weekXp: number): League {
  for (let i = LEAGUES.length - 1; i >= 0; i--) {
    if (weekXp >= LEAGUES[i]!.minXpThisWeek) return LEAGUES[i]!;
  }
  return LEAGUES[0]!;
}

export function getNextLeague(weekXp: number): League | null {
  for (const l of LEAGUES) {
    if (weekXp < l.minXpThisWeek) return l;
  }
  return null;
}

/**
 * Returns the ISO week start (Monday 00:00 local time) as a Date.
 */
function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  return d;
}

// Локальная дата YYYY-MM-DD (не UTC: toISOString у local Monday 00:00 давал воскресенье для UTC+)
function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Compute XP earned this week from assessment + case + simulator history.
 * The XP values here are estimates — the actual XP award happens in store
 * actions (addXP). For accuracy, the store would need to log XP events
 * with timestamps. As a fallback, we approximate from activity counts.
 */
export function computeWeekXp(
  assessmentHistory: AssessmentResult[],
  caseHistory: ClinicalCase[],
  simulatorHistory: SimulatorHistoryEntry[],
  completedChallenges: Record<string, string>
): number {
  const weekStartStr = localDateKey(getWeekStart());

  let xp = 0;

  for (const a of assessmentHistory) {
    if (localDateKey(new Date(a.completedAt)) >= weekStartStr) {
      xp += 10 + Math.round((a.score ?? 0) / 10);
    }
  }
  for (const c of caseHistory) {
    // Task 204 (fix 204-a#11): невалидный/отсутствующий createdAt давал
    // localDateKey(NaN) = "NaN-NaN-NaN", который строково >= weekStart —
    // и накидывал +15 XP в лигу за каждый битый кейс КАЖДУЮ неделю.
    const t = Date.parse(c.createdAt);
    if (Number.isFinite(t) && localDateKey(new Date(t)) >= weekStartStr) {
      xp += 15;
    }
  }
  for (const s of simulatorHistory) {
    if (s.completedAt && localDateKey(new Date(s.completedAt)) >= weekStartStr) {
      xp += 20 + Math.round((s.score ?? 0) / 10);
    }
  }
  for (const date of Object.keys(completedChallenges)) {
    if (date >= weekStartStr) {
      xp += 20; // average daily challenge reward
    }
  }

  return xp;
}

/**
 * Compute all achievements from current state.
 */
export function computeAchievements(
  profile: StudentProfile,
  assessmentHistory: AssessmentResult[],
  caseHistory: ClinicalCase[],
  simulatorHistory: SimulatorHistoryEntry[],
  completedChallenges: Record<string, string>
): Achievement[] {
  const totalAnswers = profile.totalAnswers;
  const correctAnswers = profile.correctAnswers;
  const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
  const streak = profile.streak;
  const assessmentsCount = assessmentHistory.length;
  const casesCount = caseHistory.length;
  const simCount = simulatorHistory.length;
  const challengesCount = Object.keys(completedChallenges).length;
  const level = profile.level;
  const skillMap = profile.skillMap;
  const masteredTopics = Object.values(skillMap).filter((v) => v >= 80).length;

  const list: Achievement[] = [
    // Streak achievements
    {
      id: 'streak-3',
      title: '3 дня подряд',
      description: 'Занимайтесь 3 дня подряд',
      icon: 'streak-3',
      color: '#E87963',
      unlocked: streak >= 3,
      progress: Math.min(100, (streak / 3) * 100),
      progressText: `${streak}/3`,
    },
    {
      id: 'streak-7',
      title: 'Неделя огня',
      description: 'Занимайтесь 7 дней подряд',
      icon: 'streak-7',
      color: '#B4531C',
      unlocked: streak >= 7,
      progress: Math.min(100, (streak / 7) * 100),
      progressText: `${streak}/7`,
    },
    {
      id: 'streak-30',
      title: 'Месяц дисциплины',
      description: 'Занимайтесь 30 дней подряд',
      icon: 'streak-30',
      color: '#6D4FC4',
      unlocked: streak >= 30,
      progress: Math.min(100, (streak / 30) * 100),
      progressText: `${streak}/30`,
    },

    // Answer count achievements
    {
      id: 'answers-50',
      title: 'Первые шаги',
      description: 'Ответьте на 50 вопросов',
      icon: 'answers-50',
      color: '#4C7A3F',
      unlocked: totalAnswers >= 50,
      progress: Math.min(100, (totalAnswers / 50) * 100),
      progressText: `${totalAnswers}/50`,
    },
    {
      id: 'answers-200',
      title: 'Активный студент',
      description: 'Ответьте на 200 вопросов',
      icon: 'answers-200',
      color: '#33608C',
      unlocked: totalAnswers >= 200,
      progress: Math.min(100, (totalAnswers / 200) * 100),
      progressText: `${totalAnswers}/200`,
    },
    {
      id: 'answers-500',
      title: 'Эрудит',
      description: 'Ответьте на 500 вопросов',
      icon: 'answers-500',
      color: '#6D4FC4',
      unlocked: totalAnswers >= 500,
      progress: Math.min(100, (totalAnswers / 500) * 100),
      progressText: `${totalAnswers}/500`,
    },

    // Accuracy achievements
    {
      id: 'accuracy-70',
      title: 'Хорошая точность',
      description: 'Достигните 70% точности (мин. 30 ответов)',
      icon: 'accuracy-70',
      color: '#4C7A3F',
      unlocked: totalAnswers >= 30 && accuracy >= 70,
      progress: Math.min(100, accuracy >= 70 ? 100 : (accuracy / 70) * 100),
      progressText: `${accuracy}%`,
    },
    {
      id: 'accuracy-90',
      title: 'Снайпер',
      description: 'Достигните 90% точности (мин. 50 ответов)',
      icon: 'accuracy-90',
      color: '#B4531C',
      unlocked: totalAnswers >= 50 && accuracy >= 90,
      progress: Math.min(100, accuracy >= 90 ? 100 : (accuracy / 90) * 100),
      progressText: `${accuracy}%`,
    },

    // Level achievements
    {
      id: 'level-5',
      title: '5 уровень',
      description: 'Достигните 5 уровня',
      icon: 'level-5',
      color: '#B4531C',
      unlocked: level >= 5,
      progress: Math.min(100, (level / 5) * 100),
      progressText: `${level}/5`,
    },
    {
      id: 'level-10',
      title: '10 уровень',
      description: 'Достигните 10 уровня',
      icon: 'level-10',
      color: '#6D4FC4',
      unlocked: level >= 10,
      progress: Math.min(100, (level / 10) * 100),
      progressText: `${level}/10`,
    },

    // Cases / Simulator
    {
      id: 'cases-10',
      title: 'Клиницист',
      description: 'Разберите 10 клинических кейсов',
      icon: 'cases-10',
      color: '#33608C',
      unlocked: casesCount >= 10,
      progress: Math.min(100, (casesCount / 10) * 100),
      progressText: `${casesCount}/10`,
    },
    {
      id: 'sim-5',
      title: 'Практик',
      description: 'Завершите 5 сессий в симуляторе',
      icon: 'sim-5',
      color: '#6D4FC4',
      unlocked: simCount >= 5,
      progress: Math.min(100, (simCount / 5) * 100),
      progressText: `${simCount}/5`,
    },

    // Challenges
    {
      id: 'challenges-7',
      title: 'Неделя челленджей',
      description: 'Выполните 7 ежедневных челленджей',
      icon: 'challenges-7',
      color: '#4C7A3F',
      unlocked: challengesCount >= 7,
      progress: Math.min(100, (challengesCount / 7) * 100),
      progressText: `${challengesCount}/7`,
    },

    // Mastery
    {
      id: 'mastery-3',
      title: 'Специалист',
      description: 'Достигните 80%+ по 3 темам',
      icon: 'mastery-3',
      color: '#D9A24A',
      unlocked: masteredTopics >= 3,
      progress: Math.min(100, (masteredTopics / 3) * 100),
      progressText: `${masteredTopics}/3`,
    },
    {
      id: 'mastery-all',
      title: 'Мастер ветеринарии',
      description: 'Достигните 80%+ по всем темам',
      icon: 'mastery-all',
      color: '#D9A24A',
      unlocked: masteredTopics >= 12,
      progress: Math.min(100, (masteredTopics / 12) * 100),
      progressText: `${masteredTopics}/12`,
    },
  ];

  return list;
}

export interface LeagueStanding {
  currentLeague: League;
  nextLeague: League | null;
  weekXp: number;
  xpToNext: number; // XP needed to reach next league; Infinity if platinum
  progressPct: number; // 0-100 within current league
  weekStart: string;
}
