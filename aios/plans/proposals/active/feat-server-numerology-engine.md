# feat-server-numerology-engine

**Type:** Feature  
**Originated by:** Carmack, Taleb  
**User guidance:** (none — sprint vision overrides)

---

## Problem / Opportunity

`src/engine/numerology.ts` has no server equivalent. Every handler that uses numerology data — `handleAstroNumerologyCross`, `handleNumerologyNarrative`, `handleTodaySynthesis` — receives all numbers from the client and cannot verify or recompute any of them.

The sprint vision lists numerology explicitly in its gap table: "`src/engine/numerology.ts` — Missing entirely." The five numbers currently accepted by `handleAstroNumerologyCross` at `server/services/gpt.ts` line 300 (`lifePath`, `birthdayNumber`, `personalYear`, `expressionNumber`) are entirely client-computed. The `handleTodaySynthesis` handler at line 460 accepts `personalDay` from the client, embeds it verbatim into the GPT prompt, and has no way to confirm the client sent the right value for today's date against the stored `birth_date`.

However, the sovereignty achievable without a schema change is partial and that boundary must be drawn precisely. The relevant functions in `src/engine/numerology.ts`:

- **Date-only (portablein full):** `calculateLifePath`, `calculateBirthdayNumber`, `calculatePersonalYear`, `calculatePersonalMonth`, `calculatePersonalDay`, `calculateNumerology` (when called without `name`), `reduceToSingleDigit`, `reduceWithIntermediate`, `detectKarmicDebt`. All require only `birth_date` (`YYYY-MM-DD`), which already lives in the `users` table.

- **Name-dependent (not portable without schema change):** `calculateExpressionNumber`, `calculateSoulUrge`. Both require the user's birth name as entered for Pythagorean letter reduction. The `full_name` column in the DB is the display name or OAuth-registered name — it is not reliably the birth name used for traditional numerology. For OAuth users especially, these values will frequently diverge. The `NumerologyReading` interface marks `expressionNumber` and `soulUrge` as optional for exactly this reason.

Carmack's analysis confirms this scoping is pragmatically correct: the port of `numerology.ts` is verbatim because it has zero external imports, and the delivery is `calculateNumerology(birthDate)` which produces all five date-derived numbers. Taleb sharpens the constraint: a port that presents 3-of-5 numbers as server-computed without labeling data provenance is worse than the current all-client approach, because it blurs the trust boundary invisibly.

---

## Vision

With `server/engine/numerologyEngine.ts` in place, the server can compute `lifePath`, `birthdayNumber`, `personalYear`, `personalMonth`, and `personalDay` for any authenticated user whose `birth_date` is stored — independently of whatever the client sends.

The immediate operational gain is in `handleTodaySynthesis`: the handler currently accepts `personalDay` from the client without validation. With the server engine available, the handler can compute `personalDay` server-side from the stored `birth_date` and compare it against the client-provided value. When they match, the reading proceeds as before. When they diverge, the server-computed value is authoritative and the discrepancy is logged.

For `handleAstroNumerologyCross` and `handleNumerologyNarrative`, partial sovereignty means the server can verify the three date-only numbers and label them as server-computed in the GPT prompt context, while explicitly marking `expressionNumber` and `soulUrge` as client-provided. This makes the data provenance visible inside the prompt, so a future addition of `birth_name` to the schema would upgrade those fields to server-verified automatically without requiring a prompt redesign.

The broader sprint value: `numerologyEngine.ts` is the simplest engine port in sprint-0012 — zero imports, pure arithmetic — and it completes the set of all six server engine files described in Carmack's target module structure. Even if it delivers modest immediate handler impact relative to transits or synastry, its absence is the one gap the server cannot fill at all from stored data for birth-date-derived numbers.

---

## Specifications

1. **Create `server/engine/numerologyEngine.ts` as a verbatim port of `src/engine/numerology.ts`.** The source file has zero imports — it is self-contained arithmetic and string manipulation. The port copies all exported functions and constants without modification: `PYTHAGOREAN`, `VOWELS`, `reduceToSingleDigit`, `reduceWithIntermediate`, `calculateLifePath`, `calculateBirthdayNumber`, `calculatePersonalYear`, `calculatePersonalMonth`, `calculatePersonalDay`, `calculateExpressionNumber`, `calculateSoulUrge`, `detectKarmicDebt`, `calculateNumerology`, and the `NumerologyReading` interface. A file-level comment reads: `// Verbatim port of src/engine/numerology.ts — keep in sync with frontend.`

2. **Date-only functions ported and server-authoritative:** `calculateLifePath(birthDate)`, `calculateBirthdayNumber(birthDate)`, `calculatePersonalYear(birthDate, targetDate?)`, `calculatePersonalMonth(personalYear, targetDate?)`, `calculatePersonalDay(birthDate, targetDate?)`. These require only `birth_date` from the DB and produce deterministic results. `calculateNumerology(birthDate)` — called without the optional `name` argument — returns all five date-derived fields and leaves `expressionNumber` and `soulUrge` as `undefined`.

3. **Name-dependent functions ported but explicitly not called server-side:** `calculateExpressionNumber` and `calculateSoulUrge` are present in `numerologyEngine.ts` as exported functions (the port is verbatim). They are not called by any server handler. A comment above each reads: `// Requires birth name — not reliably available in DB. Client-provided only.` This makes the boundary explicit in the code, not just in documentation.

4. **`handleTodaySynthesis` cross-checks client-provided `personalDay` against server-computed value.** After obtaining `userId` and calling `resolveUserBirthContext` (defined in the `issue-birth-place-silent-failure` proposal), the handler computes `serverPersonalDay = calculatePersonalDay(birthCtx.birthDate)`. If `serverPersonalDay !== payload.personalDay`, it logs: `[handleTodaySynthesis] personalDay mismatch: client=${payload.personalDay}, server=${serverPersonalDay}, userId=${userId}`. The handler uses `serverPersonalDay` as the authoritative value in the GPT prompt. If `resolveUserBirthContext` returns `null` (missing or invalid birth data), the handler falls back to `payload.personalDay` as before — no regression for users with incomplete birth data.

5. **`handleAstroNumerologyCross` labels numbers by data provenance in the GPT prompt.** The three date-only numbers (`lifePath`, `birthdayNumber`, `personalYear`) are labeled `(server-computed)` in the prompt text when the server has verified them from `birth_date`. `expressionNumber` retains its existing fallback label `not provided (no birth name given)` when absent, or appears as-is when the client provides it, with no server-verification claim. The structural change to the prompt is surgical — the existing `expressionLine` pattern is retained; a parallel `provenance` note is added to the three date-only number lines when server verification succeeds.

6. **`handleNumerologyNarrative` follows the same provenance labeling pattern** as `handleAstroNumerologyCross`. Life path, birthday number, and personal year are marked server-computed when verified; expression number and soul urge carry no server-computed label and retain their existing optional display logic.

7. **`numerologyEngine.ts` is listed in the `server/engine/` module structure alongside the other engine ports.** It does not import from `astroCore.ts` (no astronomical primitives needed). It has no dependencies beyond TypeScript builtins. It is the only engine file in the sprint that can be written, reviewed, and merged independently of `astroCore.ts` extraction.

---

## Out of Scope

- **`calculateExpressionNumber` and `calculateSoulUrge` called server-side.** These require birth name. The DB `full_name` column is not the birth name for many users, particularly OAuth registrants. Using it would produce silently wrong expression and soul urge numbers, which is worse than omitting them. This is deferred until a `birth_name` field is added to the schema.

- **Schema changes.** No new columns. No `birth_name` field. The sprint vision explicitly prohibits schema changes.

- **`handleNumerologySkyChart` handler upgrade.** This handler's payload (`birthData: { name?: string; date: string }`, `frequencyMap`) is assembled from the natal chart's planet longitudes reduced numerologically — it requires the chart computation pipeline, not just the numerology engine. Its upgrade belongs with the transit/aspect engine ports, not this proposal.

- **`handleNumerologyDiscuss` handler upgrade.** The discuss handler accepts a pre-built `numerologyContext` string from the client and continues a conversation. Server-side re-computation of the context is only meaningful once the full numerology reading surface has server-computed provenance — deferred.

- **New UI surfaces.** This proposal adds server capability. No new pages, tabs, or user-visible components.

---

## Open Questions

**Is `full_name` in the DB the birth name for numerology purposes?**

This is the critical unresolved question for expression number and soul urge. Traditional Pythagorean numerology uses the full birth name as it appears on the birth certificate, including middle names. The `full_name` column is populated from user registration — for OAuth registrations this is typically the social media display name. For email registrations it is whatever the user typed. Neither path has a reliable expectation of birth-name accuracy.

Before any server-side computation of expression number or soul urge is attempted, this question must be answered with a product decision: does the application intend to collect birth name separately, or does it treat `full_name` as a proxy? Until that decision is made, the correct behavior is the one specified here: `calculateExpressionNumber` and `calculateSoulUrge` are present in the engine file, not called by any handler, and their absence from server-computed outputs is explicitly labeled.

A related question: should the birth profile UI be updated to add a `birth_name` field alongside `birth_date`, `birth_time`, and `birth_place`? That is a product decision and a schema change — both out of scope for this sprint, but the numerology engine port makes the gap structurally visible in a way it was not before.
