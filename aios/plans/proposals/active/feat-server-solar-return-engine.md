# feat-server-solar-return-engine

**Type:** Feature
**Originated by:** Jobs, Carmack, Miyazaki, Taleb
**User guidance:** (none — sprint vision overrides)

---

## Problem / Opportunity

The solar return reading is entirely client-owned. Every step — finding the SR moment, computing the SR chart, assembling the prompt — happens in the browser before the server is involved. By the time `handleSolarReturnInterpretation` is called, the server receives only a pre-built `systemPrompt` string routed through the generic `transit-interpretation` handler (`getGptInterpretation` in `src/services/gptInterpretation.ts` line 97–105), which forwards it verbatim to GPT.

Specifically:

- `findSolarReturn` lives in `src/engine/astronomy.ts` (line 335). It uses bisection search over the Sun's longitude to find the exact UTC moment the Sun returns to its natal position. It has no server equivalent.
- `calculateSolarReturn` lives in `src/engine/solarReturn.ts` (line 16). It calls `findSolarReturn`, formats the SR moment into UTC date/time strings, then calls `calculateChart` from `astronomy.ts` to compute the SR chart at the birth location. The server's `calculateChart` in `server/engine/chartEngine.ts` is the direct equivalent but is never called for this purpose.
- `buildSolarReturnPrompt` lives in `src/engine/solarReturn.ts` (line 57). It is a 70-line prompt assembler that includes natal positions, element profile (`analyzeElements`), SR Ascendant/MC/Sun/Moon, all SR planet positions with house and retrograde markers, and tight SR-internal aspects (orb ≤ 3°). The server has never assembled or verified this prompt.
- `SolarReturnPage.tsx` calls `getGptInterpretation(prompt)` on retry (line 151), routing the pre-built client prompt through the `transit-interpretation` endpoint — a handler that accepts any opaque string and blindly executes it.

The server has no path to compute a solar return independently. If the client's calculation is stale, has a timezone-resolution edge case, or sends an incorrect SR moment, the GPT reading reflects that error with no possibility of server-side correction.

---

## Vision

When `handleSolarReturnInterpretation` receives a request for an authenticated user, the server:

1. Reads `birth_date`, `birth_time`, `birth_place` (lat, lng, tz) from the DB using a validated birth context resolver.
2. Computes the natal chart via `calculateChart` from `server/engine/chartEngine.ts`.
3. Calls `findSolarReturn` (ported to `server/engine/solarReturnEngine.ts`) to locate the exact SR moment for the requested year.
4. Computes the SR chart by passing the SR moment into `calculateChart` with the birth coordinates and `'UTC'` timezone.
5. Calls `buildSolarReturnPrompt` (ported to `server/engine/solarReturnEngine.ts`) to assemble the full GPT prompt — identical in structure and information density to what the frontend assembles.
6. Sends the prompt to GPT and streams the result back.

The client continues to compute and display the solar return chart immediately on load (`calculateSolarReturn` in `src/App.tsx` is not removed). The server computation runs independently, from stored data, without depending on anything the client chose to send beyond a `targetYear` integer and the user's auth token.

---

## Specifications

1. **`server/engine/solarReturnEngine.ts` exports three functions:**

   - `findSolarReturn(natalSunLongitude: number, targetYear: number): Date` — Port from `src/engine/astronomy.ts` (line 335–406). The function performs a daily scan across the target year (365 iterations, each a single `Astronomy.SunPosition` call) to find the zero-crossing window, then bisects to ~1 arcminute accuracy. The `_birthLat` and `_birthLng` parameters present in the frontend signature are unused (the function computes ecliptic longitude, not topocentric position) and may be omitted in the server port to keep the signature minimal. The bisection logic is 50 lines and imports only `astronomy-engine`.

   - `calculateSolarReturn(natalChart: ServerChartData, birthLat: number, birthLng: number, targetYear?: number): SolarReturnResult` — Port from `src/engine/solarReturn.ts` (line 16–52). Extracts the natal Sun's longitude, calls `findSolarReturn` for the target year (defaulting to current year or next year if the current year's SR has already passed), formats the SR moment into UTC date/time strings (as `calculateSolarReturn` already does in the frontend at line 44–46), then calls `calculateChart` from `server/engine/chartEngine.ts` with `timezone: 'UTC'` and `unknownTime: false`. Returns `{ srMoment: Date, srChart: ServerChartData, natalChart: ServerChartData, targetYear: number }`.

   - `buildSolarReturnPrompt(natalChart: ServerChartData, srChart: ServerChartData, srMoment: Date, birthDate: string): string` — Port from `src/engine/solarReturn.ts` (line 57–131). This function calls `analyzeElements(natalChart.planets)` to include the natal element profile. `analyzeElements` must be available in `server/engine/` — either imported from `server/engine/astroCore.ts` (if that module is created in a preceding task) or duplicated with an explicit comment noting it must be kept in sync with `src/data/interpretations/index.ts`. The function is 15 lines of pure logic with no external dependencies. The SR-internal aspect section (lines 96–112) uses hardcoded orb ≤ 3° and is safe to port verbatim.

2. **Handler API change — `handleSolarReturnInterpretation` in `server/services/gpt.ts`:**

   The current solar return GPT path routes through `transit-interpretation` via the generic `getGptInterpretation` client function. The new handler replaces this with a dedicated endpoint accepting:
   ```
   { targetYear: number }
   ```
   for authenticated users. The handler reads birth data from DB, computes natal chart, calls `calculateSolarReturn`, calls `buildSolarReturnPrompt`, and sends the assembled prompt to GPT. No `systemPrompt` string is accepted from the client. The client provides only the target year.

3. **`calculateChart` from `chartEngine.ts` is reused directly for the SR chart moment.** The existing `resolveToUTC` function in `chartEngine.ts` handles timezone conversion. For the SR chart, `timezone` is always `'UTC'` and `unknownTime` is always `false` — the SR moment is known to the second. No modifications to `chartEngine.ts` are required.

4. **Birth-location assumption:** Both `findSolarReturn` and `calculateSolarReturn` use birth coordinates (lat, lng) for the SR chart computation. This matches the frontend's behavior (`calculateSolarReturn` in `solarReturn.ts` passes `birthLat, birthLng` explicitly at line 49). The server port preserves this assumption without change. Relocation solar return charts — computed for the user's current location rather than birth location — are out of scope. The server does not store current location. This assumption is explicit and documented in the engine file.

5. **What the client still provides:** Only `targetYear: number`. The year selector in `SolarReturnPage.tsx` (current year / current year + 1) sends this value. All astrological data — natal chart, SR moment, SR chart, prompt — is computed server-side from stored birth data. The client's locally-computed `solarReturnData` is used for instantaneous UI rendering (bi-wheel chart, planet table, key placements) but is not sent to the server as part of the GPT request.

---

## Out of Scope

- **Relocation SR charts.** Computing the SR chart for the user's current geographic location rather than birth location requires storing or accepting current location data. Neither the DB schema nor the client payload currently supports this. Out of scope for this sprint per the "no schema change" constraint.
- **Database schema changes.** No new columns, no new tables. The handler reads from the existing `birth_date`, `birth_time`, `birth_place` fields.
- **GPT prompt redesign.** The ported `buildSolarReturnPrompt` must produce output identical in structure and information density to the frontend version. Improvements to prompt quality, instruction phrasing, or section ordering are deferred to a future sprint.
- **Frontend calculation removal.** `calculateSolarReturn` in `src/App.tsx` and the client-side bi-wheel rendering in `SolarReturnPage.tsx` are not modified. The client continues to compute the SR chart for instantaneous display.
- **`SolarReturnBiWheel` rendering.** The chart visualization component remains fully client-side. The server has no rendering concerns.

---

## Open Questions

1. **`analyzeElements` availability.** `buildSolarReturnPrompt` calls `analyzeElements`. If `server/engine/astroCore.ts` is written in a preceding sprint task (Draft 2 — code-server-astrocore-module), `solarReturnEngine.ts` imports it from there. If not, the function must be duplicated inline with a sync comment. The proposal does not resolve which task executes first — that is a sprint ordering decision. The port of `buildSolarReturnPrompt` must not proceed until `analyzeElements` has a resolved server-side location.

2. **`resolveUserBirthContext` shared helper.** Taleb's voice (fragility #1) identifies that every handler that reads `birth_place` from the DB replicates the same `JSON.parse` + type guard pattern. `handleDreamInterpretation` already has its own inline version (lines 218–239 of `gpt.ts`). If Draft 1 (issue-birth-place-silent-failure) is implemented first and produces a validated `resolveUserBirthContext(userId)` function, `handleSolarReturnInterpretation` should call it rather than repeating the pattern. If Draft 1 is not implemented first, the handler must include inline validation with type guards and explicit logging for missing or malformed fields.

3. **Year-defaulting logic on the server.** The frontend's `calculateSolarReturn` auto-selects the target year by checking whether the current year's SR has already passed (`if (srThisYear < now)`, line 33–37 of `solarReturn.ts`). The server handler receives `targetYear` explicitly from the client. The question is whether the server should also implement the auto-select path for cases where the client sends `targetYear: 0` or omits the field. Recommended: require `targetYear` as a non-optional integer in the handler payload; the client's year selector always sends an explicit value and the ambiguity is already resolved client-side.

4. **`ServerChartData` vs frontend `ChartData` type compatibility in `buildSolarReturnPrompt`.** The ported prompt builder accesses `p.longitude`, `p.degree`, `p.minute`, `p.house`, `p.retrograde`, `p.sign`, `p.name`, and `srChart.angles.ascendant`/`midheaven` with their `degree`, `minute`, `sign` fields. `ServerChartData` in `chartEngine.ts` includes all of these fields (the full `ZodiacPosition` type has `longitude`, `sign`, `degree`, `minute`). The stripped `ChartData` interface currently defined inline in `gpt.ts` (lines 10–28) omits `longitude` and `minute` — it must not be used for the solar return prompt builder. The handler must work with `ServerChartData` throughout.
