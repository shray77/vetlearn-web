/**
 * Singleton wrapper around the z-ai-web-dev-sdk client.
 *
 * Previously every API route called `await ZAI.create()` on every request.
 * Whether or not the SDK caches the underlying HTTP client / connection
 * pool between calls is not guaranteed, so to be safe we memoize the
 * promise at module scope. Module-level singletons survive hot reloads
 * in dev and are reused across requests on a warm server in production.
 */

import ZAI from 'z-ai-web-dev-sdk';

type ZAIClient = Awaited<ReturnType<typeof ZAI.create>>;

let zaiPromise: Promise<ZAIClient> | null = null;

export async function getZAI(): Promise<ZAIClient> {
  if (!zaiPromise) {
    zaiPromise = ZAI.create();
  }
  return zaiPromise;
}
