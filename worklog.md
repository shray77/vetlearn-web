# Worklog — Bug Fixes (3 issues)

## Session 1: Initial audit & fixes
- Merged MR !1
- Fixed json-utils extraction, .gitignore, next.config
- Removed examples/, vetlearn-web/ nested copy, skills/ directories
- Fixed 6 TypeScript errors across files
- Removed two middleware files breaking Next.js 16
- Created HydrationGuard.tsx for Zustand persist SSR fix

## Session 2: Simulator + UI fixes

### ISSUE 1: Simulator not working — double-call overhead & timeouts

### Root cause
All 11 API routes used `thinking: { type: 'disabled' }` parameter which may not be supported by the AI SDK. Combined with `response_format: { type: 'json_object' }` in a try/catch pattern, every AI call attempted twice:
1. First attempt with `response_format` + `thinking` → fails
2. Retry without `response_format` but WITH `thinking` → could also fail

This doubled latency on every request. For the simulator's complex JSON generation (18 findings + 8 tests + 8 questions), the first call could take 30-40s, the retry another 30-40s, exceeding the client's 60s timeout.

### Changes

**Modified: `src/app/api/simulator/generate/route.ts`**
- Removed dead AbortController (created but signal never passed anywhere)
- Removed `thinking: { type: 'disabled' }` parameter
- Removed `response_format: { type: 'json_object' }` double-call pattern
- Single clean `zai.chat.completions.create()` call with just messages + temperature
- Added empty response check with fallback

**Modified: `src/app/api/simulator/evaluate/route.ts`**
- Same fixes: removed dead AbortController, thinking param, double-call pattern
- Single clean AI call with temperature: 0.7

**Modified: `src/components/simulator/SimulatorTab.tsx`**
- Increased client timeout from 60s to 120s for scenario generation
- Added AbortController with 90s timeout for evaluation request

**Modified: 6 more API route files (same pattern fix)**
- `src/app/api/flashcards/generate/route.ts`
- `src/app/api/flashcards/ocr/route.ts` (had triple-call: vision+format → vision only → no vision)
- `src/app/api/case/evaluate/route.ts`
- `src/app/api/case/generate/route.ts`
- `src/app/api/mindmap/generate/route.ts`
- `src/app/api/exam/route.ts` (2 instances)

**Modified: 4 single-call API routes (removed `thinking` param)**
- `src/app/api/resources/recommend/route.ts`
- `src/app/api/assessment/route.ts`
- `src/app/api/assessment/result/route.ts`
- `src/app/api/tutor/chat/route.ts`

### ISSUE 2: UI — tabs going off-screen

**Modified: `src/app/page.tsx`**
- Increased bottom padding from `pb-20` (80px) to `pb-24` (96px)
- Better coverage for fixed bottom nav (h-16 = 64px) + safe area on iOS

### Build
- ✅ `npx next build` passes — 0 TypeScript errors, 0 warnings
- Commit: `e339aff` pushed to main
