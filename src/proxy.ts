import { NextRequest, NextResponse } from 'next/server';

/**
 * In-memory per-IP rate limiter for AI routes.
 *
 * Strategy: token bucket per IP, refilled at a fixed rate.
 * - AI routes (calling z-ai SDK): 10 req/min burst, refill 1 token / 6s
 * - All other routes: no rate limit (just passes through)
 *
 * Notes:
 * - In-memory state is per-server-instance. In a multi-instance deployment
 *   (e.g. behind a load balancer), use a shared store (Redis, Upstash, etc.).
 * - We DO NOT rate-limit /api/version and /api (root) — they're cheap.
 */

const AI_ROUTE_PREFIXES = [
  '/api/stt',
  '/api/tutor/chat',
  '/api/tutor/speak',
  '/api/assessment',
  '/api/exam',
  '/api/flashcards',
  '/api/mindmap',
  '/api/case',
  '/api/simulator',
  '/api/resources/recommend',
];

const BUCKET_CAPACITY = 10;
const REFILL_INTERVAL_MS = 6_000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1_000;
const IDLE_TTL_MS = 30 * 60 * 1_000;

type Bucket = { tokens: number; lastRefill: number; lastSeen: number };

const buckets = new Map<string, Bucket>();
let lastCleanup = Date.now();

function getIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

function refill(bucket: Bucket, now: number): void {
  const elapsed = now - bucket.lastRefill;
  const tokensToAdd = Math.floor(elapsed / REFILL_INTERVAL_MS);
  if (tokensToAdd > 0) {
    bucket.tokens = Math.min(BUCKET_CAPACITY, bucket.tokens + tokensToAdd);
    bucket.lastRefill += tokensToAdd * REFILL_INTERVAL_MS;
  }
  bucket.lastSeen = now;
}

function maybeCleanup(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [ip, bucket] of buckets) {
    if (now - bucket.lastSeen > IDLE_TTL_MS) {
      buckets.delete(ip);
    }
  }
}

function isAIRoute(pathname: string): boolean {
  return AI_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!isAIRoute(pathname)) {
    return NextResponse.next();
  }

  const now = Date.now();
  maybeCleanup(now);

  const ip = getIp(req);
  let bucket = buckets.get(ip);
  if (!bucket) {
    bucket = { tokens: BUCKET_CAPACITY, lastRefill: now, lastSeen: now };
    buckets.set(ip, bucket);
  } else {
    refill(bucket, now);
  }

  if (bucket.tokens <= 0) {
    const retryAfterSec = Math.ceil(REFILL_INTERVAL_MS / 1000);
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(BUCKET_CAPACITY),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  bucket.tokens -= 1;

  const res = NextResponse.next();
  res.headers.set('X-RateLimit-Limit', String(BUCKET_CAPACITY));
  res.headers.set('X-RateLimit-Remaining', String(bucket.tokens));
  return res;
}

export const config = {
  matcher: ['/api/:path*'],
};
