# Worklog — Bug Fixes (3 issues)

## Date: $(date)

## ISSUE 1: Simulator generate route — timeout & fallback extraction

### Problem
- The generate route had a 120s timeout (too long), and a massive inline FALLBACK_SCENARIOS array (~300 lines) causing slow cold starts.
- Client-side fetch in SimulatorTab.tsx had no timeout handling.

### Changes

**New file: `src/lib/fallback-scenarios.ts`**
- Extracted all 7 fallback scenarios (FALLBACK_SCENARIOS array) + interfaces (ExaminationFinding, LabTest, SimulatorScenario) + getFallbackScenario() helper into a separate module.
- This reduces the generate route from 636 lines to ~280 lines and avoids loading ~300 lines of static data on every cold start.

**Modified: `src/app/api/simulator/generate/route.ts`**
- Removed inline FALLBACK_SCENARIOS array and local interface declarations.
- Added import: `import { FALLBACK_SCENARIOS, getFallbackScenario, type SimulatorScenario } from '@/lib/fallback-scenarios'`
- Changed AbortController timeout from 120_000ms to 60_000ms.
- (Already had `thinking: { type: 'disabled' }` and `response_format` with try/catch fallback — confirmed these are present.)

**Modified: `src/components/simulator/SimulatorTab.tsx`**
- Added AbortController with 60s timeout to handleGenerate fetch call.
- Added `signal: controller.signal` to the fetch options.
- Catches AbortError specifically: shows "Сервер не отвечает. Попробуйте ещё раз." toast.
- Falls back to generic "Ошибка соединения" for other errors.
- Always calls `clearTimeout(timeoutId)` and `setIsSimulatorActive(false)` in error paths.

## ISSUE 2: BottomNav sheet tabs going off screen

**Modified: `src/components/BottomNav.tsx`**
- Changed Sheet `max-h-[70vh]` → `max-h-[75vh]` for more room.
- Changed Sheet `pb-8` → `pb-12` to account for safe area at bottom on iOS devices.

## ISSUE 3: Missing `.safe-area-bottom` CSS class

**Modified: `src/app/globals.css`**
- Added `.safe-area-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }` at the end of the file.
- The BottomNav nav element already uses the `safe-area-bottom` class — now it actually applies the CSS.

## Build
- ✅ `npx next build` passes successfully with no TypeScript errors.
