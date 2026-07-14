import { NextResponse } from 'next/server';
import { OSCE_BANK, getOSCEStationsByType } from '@/lib/osce-bank';

/**
 * GET /api/osce/bank
 * Query params: ?type=radiology&species=собаки&difficulty=intermediate
 *
 * Returns the curated OSCE station bank, optionally filtered.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get('type') || undefined;
  const species = url.searchParams.get('species') || undefined;
  const difficulty = url.searchParams.get('difficulty') || undefined;

  let stations = getOSCEStationsByType(type);
  if (species) {
    stations = stations.filter((s) => s.species === species);
  }
  if (difficulty) {
    stations = stations.filter((s) => s.difficulty === difficulty);
  }

  // Strip referenceAnswers from public listing — they're secret
  const safeStations = stations.map((s) => ({
    id: s.id,
    type: s.type,
    species: s.species,
    difficulty: s.difficulty,
    imageUrl: s.imageUrl,
    imageCaption: s.imageCaption,
    presenterText: s.presenterText,
    questions: s.questions,
    timeLimitSec: s.timeLimitSec,
    topicId: s.topicId,
    attribution: s.attribution,
  }));

  return NextResponse.json({
    success: true,
    total: OSCE_BANK.length,
    filtered: safeStations.length,
    stations: safeStations,
  });
}
