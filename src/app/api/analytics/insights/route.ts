import { NextRequest, NextResponse } from 'next/server';
import { computeAnalytics } from '@/lib/analytics';
import type {
  AssessmentResult,
  ClinicalCase,
  StudentProfile,
  OSCEResult,
} from '@/lib/types';
import type { SimulatorHistoryEntry } from '@/lib/store';

/**
 * POST /api/analytics/insights
 *
 * Pure compute (no LLM call) — accepts the user's persisted state and
 * returns structured analytics: topic trends, question-type stats,
 * species stats, time-of-day stats, streaks, urgent topic, patterns.
 *
 * NOTE: This route exists for symmetry with other API endpoints, but the
 * client can also call computeAnalytics() directly (no network round-trip).
 *
 * Request body:
 *   { profile, assessmentHistory, caseHistory, osceHistory, simulatorHistory }
 *
 * Response:
 *   { success: true, insights: AnalyticsInsight }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      profile?: StudentProfile;
      assessmentHistory?: AssessmentResult[];
      caseHistory?: ClinicalCase[];
      osceHistory?: OSCEResult[];
      simulatorHistory?: SimulatorHistoryEntry[];
    };

    if (!body.profile) {
      return NextResponse.json(
        { error: 'profile required' },
        { status: 400 }
      );
    }

    const insights = computeAnalytics(
      body.profile,
      body.assessmentHistory ?? [],
      body.caseHistory ?? [],
      body.osceHistory ?? [],
      body.simulatorHistory ?? []
    );

    return NextResponse.json({ success: true, insights });
  } catch (error: unknown) {
    console.error('[analytics/insights] error:', (error as Error)?.message ?? error);
    return NextResponse.json(
      { error: 'Ошибка при расчёте аналитики' },
      { status: 500 }
    );
  }
}
