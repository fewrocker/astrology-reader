# Code Review — feat-server-solar-return-engine

**Branch:** sprint-0012-task-0005-feat-server-solar-return-engine
**Reviewer:** Claude (automated review)
**Date:** 2026-05-14

---

## Summary

All sprint card specifications are met. The server now computes solar returns independently of the client.

---

## Files Changed

| File | Status |
|------|--------|
| `server/engine/solarReturnEngine.ts` | New — 261 lines |
| `server/services/gpt.ts` | Modified — added `handleSolarReturnInterpretation`, import of `calculateSolarReturn`/`buildSolarReturnPrompt` |
| `src/services/gptInterpretation.ts` | Modified — added `getSolarReturnInterpretation(targetYear)` |
| `src/App.tsx` | Modified — solar return GPT call now uses `getSolarReturnInterpretation(srData.targetYear)` |
| `src/components/results/SolarReturnPage.tsx` | Modified — retry uses `getSolarReturnInterpretation(targetYear)` |

---

## Spec Compliance

### 1. `findSolarReturn` ✅
- Daily scan + bisection to ~1 arcminute (`Math.abs(diff) < 0.0007`), 30 iterations max
- Imports only `astronomy-engine`
- Unused `_birthLat`/`_birthLng` params omitted (correctly documented)
- Fallback to summer solstice if no crossing found

### 2. `calculateSolarReturn` ✅
- Extracts natal Sun longitude from `natalChart.planets`
- Year-defaulting: if `targetYear` omitted, checks current year's SR against `now`; uses next year if already passed
- `calculateChart` called with `timezone: 'UTC'`, `unknownTime: false`
- Returns `{ srMoment, srChart, natalChart, targetYear }`
- Birth-location assumption documented with comment

### 3. `buildSolarReturnPrompt` ✅
- Identical structure and information density to `src/engine/solarReturn.ts`
- `analyzeElements` implemented inline with sync comment
- SR-internal aspects use orb ≤ 3°
- Uses `ServerChartData` fields: `longitude`, `degree`, `minute`, `sign`, `house`, `retrograde`

### 4. `handleSolarReturnInterpretation` ✅
- Requires `userId` (401 if missing)
- Reads `birth_date`, `birth_time`, `birth_place` from DB
- Validates JSON parse and type guards on `lat`, `lng`, `tz`
- Calls `calculateChart` → `calculateSolarReturn` → `buildSolarReturnPrompt` → `callOpenAI`
- Accepts only `{ targetYear: number }` from client — no systemPrompt from client

### 5. `getSolarReturnInterpretation` (client) ✅
- Sends only `{ targetYear }` to `solar-return` endpoint
- Re-throws `RateLimitError` for upstream handling
- Returns error string on other failures (consistent with other handlers)

### 6. Client callers updated ✅
- `App.tsx`: removed `buildSolarReturnPrompt` usage, now calls `getSolarReturnInterpretation(srData.targetYear)`
- `SolarReturnPage.tsx` retry: removed `buildSolarReturnPrompt` + `getGptInterpretation`, now calls `getSolarReturnInterpretation(targetYear)`

### 7. Out-of-scope items NOT touched ✅
- `calculateSolarReturn` in `src/engine/solarReturn.ts` — untouched
- `src/App.tsx` client-side SR calculation — kept
- `SolarReturnBiWheel` — untouched
- No schema changes

---

## TypeScript Compilation

- `tsconfig.app.json --noEmit`: **0 errors**
- `tsconfig.server.json --noEmit`: **3 errors in `gptRateLimit.ts`** — pre-existing in `master`, not introduced by this task

---

## Issues Found

None blocking. The implementation is complete and spec-compliant.

---

## Verdict

**PASS — ready to commit.**
