import { NextResponse } from 'next/server';

// Returns the current app version — always fetched from server (no SW cache for API calls)
// This ensures the version badge always shows the latest version after deploy
export async function GET() {
  return NextResponse.json({ version: '0.3.0' });
}
