// ===== SM-2 Spaced Repetition Algorithm =====
// Based on the SuperMemo-2 algorithm with Anki-style 4-button rating system.
// References: Piotr Wozniak, "SuperMemo 2" (1987); Anki documentation.

import type { SRCardData, SRRating } from './types';

/** Default ease factor for new cards */
const DEFAULT_EASE_FACTOR = 2.5;

/** Minimum ease factor — prevents intervals from collapsing */
const MIN_EASE_FACTOR = 1.3;

/**
 * Maximum review interval, days — Anki deck option «Maximum Interval»
 * (default 100 years = 36500 days; Anki Docs, Deck Options → Advanced).
 * Без капа Easy-серия растёт экспоненциально и переполняет Date:
 * nextReview становится «NaN-NaN-NaN», карта молча теряется навсегда
 * (аудит SW-20, якорь 8). У потолка Hard/Good/Easy дают одинаковый интервал —
 * так ведёт себя и Anki.
 */
const MAX_INTERVAL_DAYS = 36500;

/**
 * Create initial SR data for a freshly generated card.
 * The card is due immediately (nextReview = today) so it appears in the review queue.
 */
export function createSRCard(cardId: string): SRCardData {
  return {
    cardId,
    interval: 0,
    easeFactor: DEFAULT_EASE_FACTOR,
    repetitions: 0,
    nextReview: getLocalDateString(new Date()),
    lastReview: undefined,
  };
}

/**
 * Process a review and return the updated card data.
 *
 * Rating meanings:
 *  0 — Again:    Forgot the card completely. Reset to day 1.
 *  1 — Hard:     Recognized with difficulty. Small interval increase.
 *  2 — Good:     Answered correctly with moderate effort. Standard SM-2 progression.
 *  3 — Easy:     Answered instantly. Bonus interval and ease boost.
 */
export function reviewSRCard(card: SRCardData, rating: SRRating): SRCardData {
  const now = new Date();
  const today = getLocalDateString(now);

  // --- 1. Update ease factor ---
  let newEF: number;
  switch (rating) {
    case 0: // Again — ease penalty
      newEF = card.easeFactor - 0.20;
      break;
    case 1: // Hard — small penalty
      newEF = card.easeFactor - 0.15;
      break;
    case 2: // Good — no change
      newEF = card.easeFactor;
      break;
    case 3: // Easy — ease bonus
      newEF = card.easeFactor + 0.15;
      break;
  }
  newEF = Math.max(MIN_EASE_FACTOR, Math.round(newEF * 100) / 100);

  // --- 2. Calculate new interval and repetitions ---
  let newInterval: number;
  let newReps: number;

  switch (rating) {
    case 0: {
      // AGAIN: Full reset — card goes back to learning
      newReps = 0;
      newInterval = 1;
      break;
    }
    case 1: {
      // HARD: успешное повторение (Anki-style) — reps растут, интервал умеренно увеличивается.
      // Раньше reps не инкрементировались: серия Hard "застревала" на reps=0,
      // и первый Good после неё сбрасывал интервал к 1.
      newReps = card.repetitions + 1;
      // Anki (rslib review.rs): hard = current × 1.2, минимум current + 1 день.
      // Без минимума +1 серия Hard застревала на 1 дне навсегда
      // («low interval hell», SW-20 якоря 5–6). Дробный интервал округляем
      // вверх — канон SM-2 («If interval is a fraction, round it up», Woźniak 1990).
      newInterval = Math.max(card.interval + 1, Math.ceil(card.interval * 1.2));
      break;
    }
    case 2: {
      // GOOD: Standard SM-2 progression
      newReps = card.repetitions + 1;
      if (newReps === 1) {
        newInterval = 1;
      } else if (newReps === 2) {
        newInterval = 6;
      } else {
        // Канон SM-2: дробный интервал округляется ВВЕРХ (ceil), не Math.round
        // (SW-20, якорь 10: I=6, EF=2.7 → 17, а не 16).
        // Инвариант Anki (review.rs): good ≥ hard + 1 — иначе при низком EF
        // интервал стагнирует (SW-20, якорь 5: I=1, EF=1.3 → good=3, а не 1).
        const hardInterval = Math.max(card.interval + 1, Math.ceil(card.interval * 1.2));
        newInterval = Math.max(hardInterval + 1, Math.ceil(card.interval * newEF));
      }
      break;
    }
    case 3: {
      // EASY: Bonus interval with extra multiplier
      newReps = card.repetitions + 1;
      if (newReps === 1) {
        newInterval = 4;
      } else if (newReps === 2) {
        newInterval = 10;
      } else {
        // Anki (rslib review.rs): интервал Easy считается по EF ДО ответа
        // (старому ease) — раньше умножали на обновлённый EF+0.15 (SW-20, якорь 7).
        // Округление ceil — канон SM-2; минимум good + 1 — инвариант Anki.
        const hardInterval = Math.max(card.interval + 1, Math.ceil(card.interval * 1.2));
        const goodInterval = Math.max(hardInterval + 1, Math.ceil(card.interval * card.easeFactor));
        newInterval = Math.max(
          goodInterval + 1,
          Math.ceil(card.interval * card.easeFactor * 1.3)
        );
      }
      newInterval = Math.max(newInterval, 4);
      break;
    }
  }

  // Safety: интервал — конечное положительное число с верхним потолком.
  // Кап лечит переполнение Date («NaN-NaN-NaN», SW-20 якорь 8);
  // isFinite-гвард защищает и от битых входных данных (NaN-интервал
  // из повреждённого localStorage).
  if (!Number.isFinite(newInterval) || newInterval < 1) {
    newInterval = 1;
  }
  newInterval = Math.min(newInterval, MAX_INTERVAL_DAYS);

  // --- 3. Calculate next review date ---
  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + newInterval);
  // Гвард на невалидную дату (defense in depth): если дата всё же не
  // вычислилась — честно возвращаем карту в оборот сегодня,
  // а не «NaN-NaN-NaN» навсегда.
  const nextReviewStr = Number.isNaN(nextReview.getTime())
    ? today
    : getLocalDateString(nextReview);

  return {
    ...card,
    interval: newInterval,
    easeFactor: newEF,
    repetitions: newReps,
    nextReview: nextReviewStr,
    lastReview: today,
  };
}

/**
 * Get an array of card IDs that are due for review (nextReview <= today).
 * Карты с невалидной датой (легаси-«NaN-NaN-NaN» до фикса SW-20) считаются
 * просроченными: возвращаются в очередь и лечатся при первом ревью,
 * а не теряются навсегда.
 */
export function getDueCardIds(
  srCards: Record<string, SRCardData>,
  allCardIds: string[]
): string[] {
  const today = getLocalDateString(new Date());
  return allCardIds.filter((id) => {
    const card = srCards[id];
    return Boolean(card && (card.nextReview <= today || !isValidDateString(card.nextReview)));
  });
}

/**
 * Get human-readable status for a card's SR state.
 */
export function getSRStatusLabel(card: SRCardData): string {
  const today = getLocalDateString(new Date());

  if (card.repetitions === 0 && card.interval === 0) {
    return 'Новое';
  }
  // Легаси-карточка с невалидной датой — честно «К повторению»,
  // а не «Через NaN мес.»
  if (!isValidDateString(card.nextReview)) {
    return 'К повторению';
  }
  const daysUntil = daysBetween(today, card.nextReview);
  if (card.nextReview > today) {
    if (daysUntil === 1) return 'Завтра';
    if (daysUntil <= 7) return `Через ${daysUntil} дн.`;
    if (daysUntil <= 30) return `Через ${Math.round(daysUntil / 7)} нед.`;
    return `Через ${Math.round(daysUntil / 30)} мес.`;
  }
  return 'К повторению';
}

/**
 * Get statistics about the SR system for a given set of cards.
 */
export function getSRStats(
  srCards: Record<string, SRCardData>,
  allCardIds: string[]
) {
  const today = getLocalDateString(new Date());
  let total = 0;
  let due = 0;
  let newCards = 0;
  let learning = 0;
  let mature = 0; // reps >= 3

  for (const id of allCardIds) {
    const card = srCards[id];
    if (!card) continue;
    total++;

    if (card.nextReview <= today || !isValidDateString(card.nextReview)) {
      due++;
    }

    if (card.repetitions === 0 && card.lastReview === undefined) {
      newCards++;
    } else if (card.repetitions < 3) {
      learning++;
    } else {
      mature++;
    }
  }

  return { total, due, newCards, learning, mature };
}

// ===== Helpers =====

function getLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Валидна ли строка даты карточки (YYYY-MM-DD) — отсекает «NaN-NaN-NaN» и мусор. */
function isValidDateString(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !Number.isNaN(new Date(dateStr).getTime());
}

function daysBetween(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  const diffMs = d2.getTime() - d1.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
