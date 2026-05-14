# Code Review — sprint-0012-task-0002-code-server-astrocore-module

**Reviewer:** subagent (automated)
**Date:** 2026-05-14
**Branch:** sprint-0012-task-0002-code-server-astrocore-module

---

## Summary

Task: extract shared primitives from `chartEngine.ts` into a new `astroCore.ts` module, and update `gpt.ts` to use `ServerChartData` instead of redundant local interfaces.

**Verdict: PASS — no blocking issues.**

---

## Checklist

### 1. All 8 symbols properly extracted from chartEngine.ts

- [x] `ZODIAC_SIGNS` — exported from astroCore.ts, removed from chartEngine.ts
- [x] `ZodiacSign` — exported type from astroCore.ts, removed from chartEngine.ts
- [x] `PLANET_NAMES` — exported from astroCore.ts, removed from chartEngine.ts
- [x] `PlanetName` — exported type from astroCore.ts (via `typeof PLANET_NAMES[number]`), removed from chartEngine.ts
- [x] `ZodiacPosition` — exported interface from astroCore.ts, removed from chartEngine.ts
- [x] `BODY_MAP` — exported from astroCore.ts, removed from chartEngine.ts
- [x] `normalizeAngle` — exported from astroCore.ts, removed from chartEngine.ts
- [x] `longitudeToZodiac` — exported from astroCore.ts, removed from chartEngine.ts
- [x] `getPlanetLongitude` — exported from astroCore.ts, removed from chartEngine.ts
- [x] `getMeanNodeLongitude` — exported from astroCore.ts, removed from chartEngine.ts
- [x] `getHouseForLongitude` — exported from astroCore.ts, removed from chartEngine.ts

chartEngine.ts now imports all of the above from `./astroCore.js`.

### 2. ASPECT_DEFINITIONS has 7 entries matching src/engine/aspects.ts exactly

Verified against `src/engine/aspects.ts`:

| Name         | Angle | Orb | Symbol | Nature       |
|--------------|-------|-----|--------|--------------|
| conjunction  | 0     | 8   | ☌     | neutral      |
| sextile      | 60    | 6   | ⚹     | harmonious   |
| square       | 90    | 8   | □     | challenging  |
| trine        | 120   | 8   | △     | harmonious   |
| opposition   | 180   | 8   | ☍     | challenging  |
| semi-sextile | 30    | 2   | ⚺     | neutral      |
| quincunx     | 150   | 3   | ⚻     | challenging  |

[x] All 7 entries present and match src/engine/aspects.ts exactly.

### 3. analyzeElements comment is present

[x] Line 99 in astroCore.ts: `// ported from src/data/interpretations/index.ts — keep in sync with frontend`

### 4. getDailyMotion is present

[x] `getDailyMotion(body, time)` exported from astroCore.ts — computes forward difference over 1 day with wraparound handling.

### 5. SIGN_ELEMENTS matches src/engine/types.ts

[x] All 12 signs with correct element assignments match the frontend source.

### 6. ELEMENT_INTERPRETATIONS inlined

[x] ELEMENT_INTERPRETATIONS inlined in astroCore.ts as a module-private const. Strings verified against `src/data/interpretations/types.ts` — exact match.

### 7. ASPECT_DEFS (private tight-orb table) kept in chartEngine.ts

[x] The 5-entry `ASPECT_DEFS` (0.3x orbs for transit calculations) remains private in chartEngine.ts and is NOT exported from astroCore.ts.

### 8. chartEngine.ts public API unchanged

Exported symbols before and after:
- [x] `ServerChartData` — still exported
- [x] `MoonInfo` — still exported
- [x] `TransitAspectBrief` — still exported
- [x] `resolveToUTC` — still exported
- [x] `calculateChart` — still exported
- [x] `getMoonInfo` — still exported
- [x] `getActiveTransitAspects` — still exported

No public API regressions.

### 9. gpt.ts updated to use ServerChartData

[x] Removed: `Planet`, `Angles`, `ChartData` local interfaces (3 redundant type definitions).
[x] `buildDreamscapeContext` signature updated to `ServerChartData`.
[x] `handleDreamInterpretation` payload type `chartData: ChartData | null` → `chartData: ServerChartData | null`.
[x] `handleAstroNumerologyCross` payload `chartData: ChartData` → `chartData: ServerChartData`.
[x] `handleJournalAnnotation` payload `chartData: { planets: Planet[]; angles: ... }` → `chartData: ServerChartData`.
[x] `handleCosmicPatternReading` payload `chartData: ChartData` → `chartData: ServerChartData`.
[x] `import type { ServerChartData }` was already present and is the single type source.

### 10. TypeScript compilation

Running `npx tsc --project tsconfig.server.json --noEmit`:

- Files in scope (astroCore.ts, chartEngine.ts, gpt.ts): **0 errors**
- Pre-existing errors in `server/middleware/gptRateLimit.ts` (3 errors about `Statement.get/run` argument counts): **pre-existing in master branch, not introduced by this task**

**Overall TypeScript result: PASS (no new errors introduced)**

---

## Notes

- astroCore.ts imports only `astronomy-engine` — no `src/` imports as required.
- The `analyzeElements` function in astroCore.ts accepts `ZodiacPosition[]` (matching the server's type system) rather than the frontend's `PlanetPosition[]`, which is a correct adaptation.
- `getDailyMotion` is a new addition not present in the original chartEngine.ts; it mirrors the `isRetrograde` daily-diff pattern with proper wraparound.
