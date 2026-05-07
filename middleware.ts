import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ===== Simple In-Memory Rate Limiter =====
// Limits API calls per IP address. Designed for MVP/demo — not production-grade.
// Uses a sliding window of 60 seconds.

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = 30; // max requests per window
const WINDOW_MS = 60 * 1000; // 1 minute window

// Cleanup stale entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function middleware(request: NextRequest) {
  // Only rate limit API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Get client IP (forwarded header or fallback)
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  const now = Date.now();

  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    // New window
    rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return NextResponse.next();
  }

  entry.count++;

  // Add rate limit headers
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT));
  response.headers.set('X-RateLimit-Remaining', String(Math.max(0, RATE_LIMIT - entry.count)));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil((entry.resetTime - now) / 1000)));

  if (entry.count > RATE_LIMIT) {
    return new NextResponse(
      JSON.stringify({
        error: 'Слишком много запросов. Попробуйте через минуту.',
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((entry.resetTime - now) / 1000)),
        },
      }
    );
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
