import { NextResponse } from 'next/server';

/**
 * GET /api/export
 *
 * Returns the version of the export format. The actual export data is
 * generated client-side from zustand state — there's no server-side store.
 * (See src/lib/export-import.ts for client-side logic.)
 *
 * This endpoint exists so the client can verify the export format version
 * matches before applying an imported blob.
 */

export async function GET() {
  return NextResponse.json({
    success: true,
    formatVersion: 1,
    appVersion: '0.2.0',
    schema: {
      profile: 'StudentProfile',
      flashcards: 'Flashcard[]',
      flashcardHistory: 'FlashcardDeck[]',
      srCards: 'Record<string, SRCardData>',
      assessmentHistory: 'AssessmentResult[]',
      caseHistory: 'ClinicalCase[]',
      simulatorHistory: 'SimulatorHistoryEntry[]',
      osceHistory: 'OSCEResult[]',
      osceSkillMap: 'Record<OSCEStationType, number>',
      importedDocuments: 'ImportedDocument[]',
    },
  });
}
