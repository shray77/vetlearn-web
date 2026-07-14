import { NextRequest, NextResponse } from 'next/server';
import { TRACKS, getTrackDefinition } from '@/lib/tracks';
import { VET_TOPICS } from '@/lib/vet-topics';
import type { SpecializationTrack } from '@/lib/types';

/**
 * POST /api/track/recommend
 *
 * Returns a prioritized list of topics for the student's current track,
 * based on:
 *   - the track's emphasized topics
 *   - the student's current skillMap (gaps get higher priority)
 *
 * Request body:
 *   { track: SpecializationTrack, skillMap: Record<string, number> }
 *
 * Response:
 *   { success: true, recommendations: Array<{ topicId, topicName, priority, reason, currentLevel }> }
 *
 * NOTE: This is a pure compute route (no LLM call) — keeps it cheap and
 * deterministic. The client can ask /api/tutor/chat for richer advice.
 */
export async function POST(req: NextRequest) {
  try {
    const { track, skillMap = {} } = await req.json() as {
      track?: SpecializationTrack;
      skillMap?: Record<string, number>;
    };

    if (!track || !TRACKS.some((t) => t.id === track)) {
      return NextResponse.json(
        { error: 'Укажите корректный track (small_animal | large_animal | equine | exotic | mixed)' },
        { status: 400 }
      );
    }

    const trackDef = getTrackDefinition(track);
    const emphasized = trackDef.emphasizedTopics;

    const recommendations = emphasized.map((topicId) => {
      const topic = VET_TOPICS.find((t) => t.id === topicId);
      const currentLevel = skillMap[topicId] ?? 0;
      let priority: 'high' | 'medium' | 'low';
      let reason: string;
      if (currentLevel < 40) {
        priority = 'high';
        reason = `Низкий уровень (${currentLevel}%) по ключевой теме трека "${trackDef.label}"`;
      } else if (currentLevel < 70) {
        priority = 'medium';
        reason = `Средний уровень (${currentLevel}%) — есть пространство для роста`;
      } else {
        priority = 'low';
        reason = `Хороший уровень (${currentLevel}%) — поддерживайте регулярным повторением`;
      }
      return {
        topicId,
        topicName: topic?.name ?? topicId,
        priority,
        reason,
        currentLevel,
      };
    });

    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return NextResponse.json({
      success: true,
      track: trackDef.label,
      recommendations,
    });
  } catch (error: unknown) {
    console.error('[track/recommend] error:', (error as Error)?.message ?? error);
    return NextResponse.json(
      { error: 'Ошибка при формировании рекомендаций' },
      { status: 500 }
    );
  }
}
