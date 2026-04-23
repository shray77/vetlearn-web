// ===== SM-2 Spaced Repetition Algorithm =====
// Based on the SuperMemo-2 algorithm with Anki-style 4-button rating system.
// References: Piotr Wozniak, "SuperMemo 2" (1987); Anki documentation.

import type { SRCardData, SRRating } from './types';

/** Default ease factor for new cards */
const DEFAULT_EASE_FACTOR = 2.5;

/** Minimum ease factor — prevents intervals from collapsing */
const MIN_EASE_FACTOR = 1.3;

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
      // HARD: No rep increment, slightly longer interval
      newReps = card.repetitions;
      if (card.repetitions === 0) {
        newInterval = 1;
      } else {
        // Use 1.2× multiplier instead of full ease factor
        newInterval = Math.max(1, Math.round(card.interval * 1.2));
      }
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
        newInterval = Math.round(card.interval * newEF);
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
        newInterval = Math.round(card.interval * newEF * 1.3);
      }
      newInterval = Math.max(newInterval, 4);
      break;
    }
  }

  // Safety: interval should never be negative or zero after review
  newInterval = Math.max(1, newInterval);

  // --- 3. Calculate next review date ---
  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + newInterval);

  return {
    ...card,
    interval: newInterval,
    easeFactor: newEF,
    repetitions: newReps,
    nextReview: getLocalDateString(nextReview),
    lastReview: today,
  };
}

/**
 * Get an array of card IDs that are due for review (nextReview <= today).
 */
export function getDueCardIds(
  srCards: Record<string, SRCardData>,
  allCardIds: string[]
): string[] {
  const today = getLocalDateString(new Date());
  return allCardIds.filter((id) => {
    const card = srCards[id];
    return card && card.nextReview <= today;
  });
}

/**
 * Get human-readable status for a card's SR state.
 */
export function getSRStatusLabel(card: SRCardData): string {
  const today = getLocalDateString(new Date());
  const daysUntil = daysBetween(today, card.nextReview);

  if (card.repetitions === 0 && card.interval === 0) {
    return 'Новое';
  }
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

    if (card.nextReview <= today) {
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

function daysBetween(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  const diffMs = d2.getTime() - d1.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
