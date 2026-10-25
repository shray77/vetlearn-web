/**
 * Daily challenges — "morning rounds" engagement loop.
 *
 * Generates a deterministic daily challenge based on the date seed. The same
 * day → same challenge for all users (so students can compare progress).
 *
 * Challenge types:
 *   - 'flashcards'   — review N due cards
 *   - 'case'         — complete 1 clinical case
 *   - 'simulator'    — complete 1 simulator session
 *   - 'assessment'   — take a 5-question quick test
 *   - 'tutor'        — ask the AI tutor 3 questions
 *
 * Stored per-day; once completed the user gets +20 XP bonus.
 */

import { VET_TOPICS } from './vet-topics';
import { getTrackDefinition } from './tracks';
import type { SpecializationTrack } from './types';

export type ChallengeType = 'flashcards' | 'case' | 'simulator' | 'assessment' | 'tutor' | 'osce';

export interface DailyChallenge {
  date: string; // YYYY-MM-DD
  type: ChallengeType;
  title: string;
  description: string;
  target: number;
  xpReward: number;
  icon: string;
  topicId?: string;
  tabToOpen: string;
}

const TYPE_INFO: Record<ChallengeType, { icon: string; title: (t: string) => string; desc: (t: string, n: number) => string; tab: string; xp: number; target: number }> = {
  flashcards: {
    icon: '',
    title: (t) => `Повтори ${t ? `карточки по теме «${t}»` : 'карточки'}`,
    desc: (_, n) => `Изучи ${n} карточек с интервальным повторением`,
    tab: 'flashcards',
    xp: 20,
    target: 10,
  },
  case: {
    icon: '',
    title: (t) => `Разбери клинический кейс${t ? ` по теме «${t}»` : ''}`,
    desc: () => `Заверши 1 клинический случай до конца`,
    tab: 'cases',
    xp: 30,
    target: 1,
  },
  simulator: {
    icon: '',
    title: (t) => `Проведи приём в симуляторе${t ? `: ${t}` : ''}`,
    desc: () => `Заверши 1 сессию в симуляторе пациента`,
    tab: 'simulator',
    xp: 35,
    target: 1,
  },
  assessment: {
    icon: '',
    title: (t) => `Пройди мини-тест${t ? ` по теме «${t}»` : ''}`,
    desc: (_, n) => `Ответь на ${n} тестовых вопросов`,
    tab: 'learning',
    xp: 25,
    target: 5,
  },
  tutor: {
    icon: '',
    title: (t) => `Поговори с AI-репетитором${t ? ` о теме «${t}»` : ''}`,
    desc: (_, n) => `Задай ${n} вопроса репетитору`,
    tab: 'tutor',
    xp: 15,
    target: 3,
  },
  osce: {
    icon: '',
    title: () => `Пройди OSCE-станцию`,
    desc: () => `Заверши 1 станцию визуальной диагностики`,
    tab: 'osce',
    xp: 40,
    target: 1,
  },
};

function seedFromDate(date: Date): number {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  // FNV-1a-ish hash
  return ((y * 100 + m) * 100 + d) * 2654435761 % 2147483647;
}

function pickFrom<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length]!;
}

// Локальная дата YYYY-MM-DD (не UTC — иначе после 21:00 UTC+3 «сегодня» разъезжается с seed)
function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Generate today's challenge. Optionally biased by the user's track (emphasized topics).
 */
export function getTodayChallenge(now: Date = new Date(), track?: SpecializationTrack): DailyChallenge {
  const dateStr = localDateKey(now);
  const seed = seedFromDate(now);

  const trackDef = getTrackDefinition(track);
  const emphasizedTopics = trackDef.emphasizedTopics;
  const topicId = pickFrom(emphasizedTopics.length > 0 ? emphasizedTopics : VET_TOPICS.map((t) => t.id), seed);
  const topicName = VET_TOPICS.find((t) => t.id === topicId)?.name || topicId;

  // Cycle challenge types across the week
  const types: ChallengeType[] = ['flashcards', 'case', 'tutor', 'assessment', 'simulator', 'osce'];
  const type = types[seed % types.length]!;
  const info = TYPE_INFO[type];

  return {
    date: dateStr,
    type,
    title: info.title(topicName),
    description: info.desc(topicName, info.target),
    target: info.target,
    xpReward: info.xp,
    icon: info.icon,
    topicId,
    tabToOpen: info.tab,
  };
}

/**
 * Generate challenges for the past N days (for streak display).
 */
export function getPastChallenges(days: number, track?: SpecializationTrack): DailyChallenge[] {
  const result: DailyChallenge[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    result.push(getTodayChallenge(date, track));
  }
  return result;
}
