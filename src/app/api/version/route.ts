import { NextResponse } from 'next/server';
import { version } from '../../../../package.json';

// Returns the current app version — always fetched from server (no SW cache for API calls)
// This ensures the version badge always shows the latest version after deploy.
// Version is sourced from package.json (single source of truth) so /api/version
// and the npm package version can never drift out of sync.
export async function GET() {
  return NextResponse.json({ version });
}
