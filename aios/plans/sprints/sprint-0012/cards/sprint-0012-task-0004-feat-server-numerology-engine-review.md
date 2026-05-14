# Code Review — sprint-0012-task-0004-feat-server-numerology-engine

Reviewer: automated sub-agent review
Date: 2026-05-14

## Files Reviewed

- `server/engine/numerologyEngine.ts` (new file)
- `server/services/gpt.ts` (modified — three handler upgrades)

---

## 1. numerologyEngine.ts — Verbatim Port Fidelity

**Result: PASS**

All 14 exported symbols are present and match the source exactly:

| Symbol | Source present | Port present | Signature match |
|---|---|---|---|
| `PYTHAGOREAN` | yes | yes | yes |
| `VOWELS` | yes | yes | yes |
| `reduceToSingleDigit` | yes | yes | yes |
| `reduceWithIntermediate` | yes | yes | yes |
| `calculateLifePath` | yes | yes | yes |
| `calculateBirthdayNumber` | yes | yes | yes |
| `calculatePersonalYear` | yes | yes | yes |
| `calculateExpressionNumber` | yes | yes | yes |
| `calculateSoulUrge` | yes | yes | yes |
| `detectKarmicDebt` | yes | yes | yes |
| `calculatePersonalMonth` | yes | yes | yes |
| `calculatePersonalDay` | yes | yes | yes |
| `NumerologyReading` | yes | yes | yes |
| `calculateNumerology` | yes | yes | yes |

First-line comment: `// Verbatim port of src/engine/numerology.ts — keep in sync with frontend.` ✓

Comment above `calculateExpressionNumber` and `calculateSoulUrge`:
`// Requires birth name — not reliably available in DB. Client-provided only.` ✓

No logic changes from source — the port is faithful.

---

## 2. handleTodaySynthesis — Server Verification

**Result: PASS**

- `calculatePersonalDay` imported from `numerologyEngine.js` ✓
- Handler accepts `userId?: number` parameter ✓
- `resolveUserBirthContext(userId)` called when userId present ✓
- `serverPersonalDay` computed from `birthCtx.birthDate` ✓
- Mismatch logged with `[handleTodaySynthesis] personalDay mismatch: client=…, server=…, userId=…` ✓
- `authorizedPersonalDay` used in both the prompt data line and the closing instruction line ✓
- Fallback to `payload.personalDay` when birth context null ✓
- `userId` forwarded from dispatcher in `handleGptRequest` switch case ✓

---

## 3. handleAstroNumerologyCross — Provenance Labeling

**Result: PASS**

- Imports `calculateLifePath`, `calculateBirthdayNumber`, `calculatePersonalYear` ✓
- Handler accepts `userId?: number` parameter ✓
- `resolveUserBirthContext(userId)` called when userId present ✓
- `serverNumerology` object built from birth context ✓
- `provenanceSuffix = serverNumerology ? ' (server-computed)' : ''` ✓
- `lifePathValue`, `birthdayValue`, `personalYearValue` select server vs client values ✓
- Prompt lines: `Life Path: ${lifePathValue}${provenanceSuffix}` etc. ✓
- `expressionLine` uses `payload.numbers.expressionNumber` directly — no server-computed label ✓
- Fallback when birth context unavailable uses client values ✓
- `userId` forwarded in dispatcher ✓

---

## 4. handleNumerologyNarrative — Provenance Labeling

**Result: PASS**

- Same pattern as `handleAstroNumerologyCross` ✓
- `lifePath`, `birthdayNumber`, `personalYear` use server values when available with `(server-computed)` suffix ✓
- `expressionLine` and `soulUrgeLine` use `payload.numbers.*` without server-computed label ✓
- `hasMaster` array updated to use `lifePathValue`, `birthdayValue`, `personalYearValue` (server values) ✓
- Prompt lines include `masterLabel(value)` + `provenanceSuffix` in correct order ✓
- Fallback when birth context unavailable ✓
- `userId` forwarded in dispatcher ✓

---

## 5. TypeScript Compilation

**Result: PASS**

`npx tsc --noEmit` produces zero errors or warnings.

---

## 6. Blocking Issues

None.

---

## Summary

The implementation is correct and complete. The numerology engine is a faithful verbatim port with the required comments. All three handler upgrades correctly implement server-authoritative date-number verification with proper provenance labeling, mismatch logging, and client fallback when birth context is unavailable. TypeScript compiles cleanly.
