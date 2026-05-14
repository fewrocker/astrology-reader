**Type:** Feature
**Originated by:** Jobs, Carmack, Miyazaki, Taleb
**User guidance:** (none — sprint vision overrides)

## Problem / Opportunity

Synastry interpretation is the only major reading type with no corresponding server-side handler at all. Transit readings, daily snapshots, and journal annotations all have handlers in `server/services/gpt.ts` — however incomplete — but synastry GPT calls still route through `getGptInterpretation` in `src/services/gptInterpretation.ts` (line 97–105), which dispatches to the `transit-interpretation` type handler. The server never sees a dedicated synastry call; it receives a pre-built prompt string tagged as a transit interpretation and executes it blindly.

The current client-side path: `src/App.tsx` computes both natal charts, calls `calculateSynastry` from `src/engine/synastry.ts`, assembles a `SynastryData` object, then calls `buildSynastryPrompt` (also in `synastry.ts`). `SynastryPage.tsx` passes the resulting string directly to `getGptInterpretation`. The server receives the string, wraps it in OpenAI messages, and returns a result. The server has no visibility into what was computed, whether the orbs are correct, whether the house overlay was skipped because one person had unknown birth time, or whether the composite angles were properly derived.

The couple transit path is equally raw: `buildCoupleTransitPrompt` in `synastry.ts` (lines 553–638) accepts a `TransitData` argument, assembles a prompt, and the client again calls `getGptInterpretation` with the resulting string. No dedicated handler exists for couple transit interpretation.

Five specific weaknesses follow from this architecture:

1. **No server handler for synastry.** `server/services/gpt.ts` has no `handleSynastryInterpretation` function. There is no `synastry-interpretation` route type. The call goes through `transit-interpretation` with a synastry-shaped prompt string — an accidental dispatch that works only because both handlers blindly forward to OpenAI.

2. **No server handler for couple transits.** Same situation: `handleCoupleTransitInterpretation` does not exist. Couple transit calls route through `transit-interpretation`.

3. **Partner birth data is never validated or re-computed server-side.** The current request payload sends pre-computed `partnerChartData` objects (assembled by `calculateChart` in the browser). If the partner's birth time was entered incorrectly, if the city lookup returned a wrong timezone, or if the calculation crashed silently on a specific DST boundary, the server has no way to detect or correct it.

4. **The prompt is opaque.** `handleTransitInterpretation` at `server/services/gpt.ts` line 179 accepts `{ systemPrompt: string }`. When synastry routes through this handler, the server treats the synastry prompt as just another opaque string. It cannot verify that the house overlay section is present, that cross-chart aspects are sorted by orb, or that the compatibility scores reflect the same algorithm the user sees in the UI.

5. **`buildCoupleTransitPrompt` depends on `transitEngine`-level data (`TransitData`) that the server cannot currently produce.** When this function is ported to the server, `synastryEngine.ts` must import from `transitEngine.ts` — a dependency that makes the port order non-trivial.

## Vision

`server/engine/synastryEngine.ts` exists as a complete, self-contained port of `src/engine/synastry.ts`. It exports every calculation function and both prompt builders. The module imports shared primitives from `server/engine/astroCore.ts` (the shared utility layer established earlier in the sprint) rather than re-copying `normalizeAngle`, `longitudeToZodiac`, and `ASPECT_DEFINITIONS` again.

Two dedicated handlers exist in `server/services/gpt.ts`:
- `handleSynastryInterpretation` — accepts raw birth data for both people, computes both charts server-side, runs the full synastry calculation stack, assembles the GPT prompt, and calls OpenAI
- `handleCoupleTransitInterpretation` — accepts raw birth data for both people plus a transit period and optional target month, computes both charts and the current transit positions server-side, runs synastry and couple transit calculations, assembles the prompt, and calls OpenAI

The architecture constraint is absolute: neither handler accepts pre-computed chart objects or pre-built prompt strings. Both accept raw birth data — date, time, lat, lng, tz — for both individuals. The server computes everything from those inputs.

Partner birth data is never stored in the database (no schema change in this sprint), so the client continues to send the partner's raw birth fields as part of the request payload. This is the correct scoping: the client sends data the server cannot otherwise access; the server does the computation. This is categorically different from accepting pre-computed objects — the server controls the calculation, not the client.

The client side is unchanged in behavior: `SynastryPage.tsx` still calls its existing client-side code path for instantaneous UI display, and the new handler is wired to two new route types (`synastry-interpretation` and `couple-transit-interpretation`) so existing code calling `getGptInterpretation` can be updated to call properly-typed client functions that pass raw birth fields.

When both people have known birth times, house overlays are computed and included in the prompt. When one or both have unknown birth time, the overlay is correctly omitted — the same guard from `src/engine/synastry.ts` lines 141–165 is ported exactly.

## Specifications

### 1. Module: `server/engine/synastryEngine.ts`

Port the following functions from `src/engine/synastry.ts` verbatim, adjusting only imports:

- `getHouseForLongitude` (private helper — already exists in `astroCore.ts`; import from there, do not copy again)
- `calculateSynastryAspects(chart1, chart2): SynastryAspect[]`
- `calculateHouseOverlays(chart1, chart2): HouseOverlay` — port the `unknownTime` guard at lines 141–165 exactly; do not simplify
- `midpointLongitude` and `midpointPosition` (private helpers)
- `calculateCompositeChart(chart1, chart2): CompositeChart`
- `calculateCompatibility(chart1, chart2, synastryAspects): CompatibilityScore` — includes element and modality compatibility strings and `identifyKeyThemes`
- `calculateSynastry(chart1, chart2): SynastryData` — orchestrator
- `buildSynastryPrompt(chart1, chart2, synastryData, person1Date, person2Date): string`
- `buildCoupleTransitPrompt(chart1, chart2, synastryData, transitData, period, person1Date, person2Date, targetMonth?): string`

Imports:
- `normalizeAngle`, `longitudeToZodiac`, `ASPECT_DEFINITIONS`, `getHouseForLongitude` from `./astroCore.js`
- `ServerChartData` (used as the `ChartData` equivalent) from `./chartEngine.js` — all function signatures use `ServerChartData` in place of the frontend's `ChartData`
- `TransitData`, `TransitPeriod` from `./transitEngine.js` — required by `buildCoupleTransitPrompt`
- `analyzeElements` from `./astroCore.js` — required by both prompt builders; `astroCore.ts` must expose this function before `synastryEngine.ts` is written

Type aliases exported from `synastryEngine.ts`: `SynastryAspect`, `HouseOverlayEntry`, `HouseOverlay`, `CompositeChart`, `CompatibilityScore`, `SynastryData`.

### 2. `analyzeElements` in `astroCore.ts`

`buildSynastryPrompt` and `buildCoupleTransitPrompt` both call `analyzeElements(chart.planets)`. This function lives in `src/data/interpretations/index.ts` (a frontend file). The correct resolution for this sprint: add `analyzeElements` to `server/engine/astroCore.ts` as a ~60-line duplicate. The function is pure (no side effects, no external dependencies beyond `SIGN_ELEMENTS` and four short element interpretation strings). Document the duplication explicitly with a comment: `// analyzeElements ported from src/data/interpretations/index.ts — keep in sync with frontend`.

The element interpretation strings (`ELEMENT_INTERPRETATIONS`) and `SIGN_ELEMENTS` must be confirmed by reading `src/data/interpretations/types.ts` and `src/data/interpretations/index.ts` before porting. Do not guess their values — read the source.

### 3. Handler: `handleSynastryInterpretation`

Add to `server/services/gpt.ts`:

```typescript
async function handleSynastryInterpretation(payload: {
  person1: { date: string; time: string | null; lat: number; lng: number; tz: string }
  person2: { date: string; time: string | null; lat: number; lng: number; tz: string }
}): Promise<string>
```

Implementation steps inside the handler:
1. Call `calculateChart` (from `chartEngine.ts`) with `person1` fields to produce `chart1: ServerChartData`. `unknownTime` is `!payload.person1.time`.
2. Call `calculateChart` with `person2` fields to produce `chart2: ServerChartData`.
3. Call `calculateSynastry(chart1, chart2)` from `synastryEngine.ts` to produce `synastryData`.
4. Call `buildSynastryPrompt(chart1, chart2, synastryData, person1.date, person2.date)` to produce the prompt string.
5. Call OpenAI via `retryWithBackoff` and `callOpenAI` with the assembled prompt.

The handler is not DB-dependent for Person 2 — it receives Person 2's raw birth data from the client payload. Person 1's data also comes from the client payload in this handler (not from the DB) because synastry is an explicit, interactive session where the user has both datasets in hand. This differs from the dream handler pattern, where the user's own birth data is fetched from the DB; here, both datasets arrive together.

### 4. Handler: `handleCoupleTransitInterpretation`

Add to `server/services/gpt.ts`:

```typescript
async function handleCoupleTransitInterpretation(payload: {
  person1: { date: string; time: string | null; lat: number; lng: number; tz: string }
  person2: { date: string; time: string | null; lat: number; lng: number; tz: string }
  period: TransitPeriod
  targetMonth?: string
}): Promise<string>
```

Implementation steps:
1. Compute `chart1` and `chart2` via `calculateChart`.
2. Compute `synastryData` via `calculateSynastry(chart1, chart2)`.
3. Compute transit positions and aspects against the composite chart via `transitEngine.ts`. Specifically: call `calculateCurrentPositions` for the current date, then compute transit aspects against `synastryData.compositeChart.planets` using `calculateTransitAspects` with the `period` orb scaling. Assemble these into the `TransitData` shape that `buildCoupleTransitPrompt` expects.
4. Call `buildCoupleTransitPrompt(chart1, chart2, synastryData, transitData, period, person1.date, person2.date, targetMonth)`.
5. Call OpenAI.

The `TransitData` object passed to `buildCoupleTransitPrompt` must match the shape the function expects (see `synastry.ts` lines 553–638): `currentPlanets`, `dateRange`, and `transitAspects` (aspects to the composite). The `transitAspects` array is the result of computing transits against composite planets — not against either person's natal chart.

### 5. Route dispatch in `server/routes/gpt.ts` (or equivalent router)

Add two new route type cases to the request dispatcher:
- `'synastry-interpretation'` → `handleSynastryInterpretation(payload)`
- `'couple-transit-interpretation'` → `handleCoupleTransitInterpretation(payload)`

### 6. Changes to `server/services/gpt.ts`

- The stripped `ChartData` interface at lines 22–29 (which drops `longitude` and `minute`) must not be used by the new synastry handler. The handler uses `ServerChartData` from `chartEngine.ts` directly. If the stripped interface is still needed by other handlers that have not yet been upgraded, do not remove it yet — but document it with a `// TODO: retire when all handlers use ServerChartData` comment.
- Import `calculateSynastry`, `buildSynastryPrompt`, `buildCoupleTransitPrompt`, `SynastryData` from `./engine/synastryEngine.js`.
- Import `calculateCurrentPositions`, `calculateTransitAspects`, `TransitData`, `TransitPeriod` from `./engine/transitEngine.js`.

### 7. What the client sends vs. what the server now computes

**Client sends (per person):**
- `date: string` — birth date in `YYYY-MM-DD` format
- `time: string | null` — birth time in `HH:MM` format, or `null` if unknown
- `lat: number` — birth latitude (float)
- `lng: number` — birth longitude (float)
- `tz: string` — IANA timezone string

**Server computes:**
- Both `ServerChartData` objects via `calculateChart`
- Cross-chart aspect list via `calculateSynastryAspects`
- House overlay (gated on `unknownTime` for each person) via `calculateHouseOverlays`
- Composite chart via `calculateCompositeChart`
- Compatibility scores and key themes via `calculateCompatibility`
- Element profiles for both charts via `analyzeElements`
- The complete GPT prompt via `buildSynastryPrompt` or `buildCoupleTransitPrompt`

**Client does not send:**
- Pre-computed `ChartData` objects for either person
- Pre-computed `SynastryData`
- Pre-built prompt strings
- Pre-computed `TransitData` for couple transits

### 8. House overlay handling when `unknownTime = true`

The guard from `src/engine/synastry.ts` lines 141–165 must be ported exactly:

```typescript
if (!chart1.unknownTime && chart2.houses.length > 0) {
  // compute person1InPerson2Houses
}
if (!chart2.unknownTime && chart1.houses.length > 0) {
  // compute person2InPerson1Houses
}
```

When both people have unknown birth time, `houseOverlay` will be `{ person1InPerson2Houses: [], person2InPerson1Houses: [] }`. `buildSynastryPrompt` already gates house overlay output on `synastryData.houseOverlay.person1InPerson2Houses.length > 0` (lines 493–503 of `synastry.ts`). No additional guard is needed in the handler; the prompt builder handles the empty case correctly.

### 9. Port order dependency

`synastryEngine.ts` imports from `transitEngine.ts` (for `TransitData` and `TransitPeriod` types, required by `buildCoupleTransitPrompt`). `transitEngine.ts` must therefore be complete and compiling before `synastryEngine.ts` is written. This port should not begin until the transit engine task is done. If the transit engine is not yet available, `buildCoupleTransitPrompt` can be left for a second pass — but `buildSynastryPrompt` and all calculation functions can be ported independently.

### 10. Orb table verification

`calculateSynastryAspects` in `synastry.ts` applies `orbScale = 0.75` to the natal `ASPECT_DEFINITIONS` orbs (line 77). The base orbs in `src/engine/aspects.ts` are: conjunction 8°, sextile 6°, square 8°, trine 8°, opposition 8°, semi-sextile 2°, quincunx 3°. Scaled at 0.75, the effective synastry orbs are: conjunction 6°, sextile 4.5°, square 6°, trine 6°, opposition 6°. The `ASPECT_DEFINITIONS` in `astroCore.ts` must use the full natal orbs (same as `src/engine/aspects.ts`), and `synastryEngine.ts` must apply the 0.75 scale at calculation time — not inherit the tight transit orbs from `chartEngine.ts`'s private `ASPECT_DEFS` (which are 0.3× natal and designed for snapshot use only).

### 11. New client-side service functions

Two new functions should be added to `src/services/gptInterpretation.ts` to replace the `getGptInterpretation` call in `SynastryPage.tsx`:

```typescript
export async function getSynastryInterpretation(
  person1: { date: string; time: string | null; lat: number; lng: number; tz: string },
  person2: { date: string; time: string | null; lat: number; lng: number; tz: string },
): Promise<string>

export async function getCoupleTransitInterpretation(
  person1: { date: string; time: string | null; lat: number; lng: number; tz: string },
  person2: { date: string; time: string | null; lat: number; lng: number; tz: string },
  period: string,
  targetMonth?: string,
): Promise<string>
```

Each calls `callProxy` with the appropriate type (`'synastry-interpretation'` and `'couple-transit-interpretation'`). The existing client-side calls in `SynastryPage.tsx` (the `handleRetryGpt` function at line 334, and the App-level GPT trigger) should be updated to call these typed functions, passing the raw birth fields from `birthData` and `partnerBirthData` state rather than building a prompt first.

The client-side `buildSynastryPrompt` / `buildCoupleTransitPrompt` calls remain in place for instantaneous UI rendering. What changes is only the GPT call: instead of sending a pre-built string, the client sends raw birth fields, and the server assembles the prompt.

## Out of Scope

- **Partner data persistence.** Storing the partner's birth data in the database requires a schema change. No new tables or columns. The partner's birth data continues to exist only in client session state for the duration of the synastry session, and is sent to the server as raw fields per request.

- **Composite house calculation.** `calculateCompositeChart` (ported verbatim) sets every composite planet to `house: 0`. Computing Placidus house cusps from the composite Ascendant requires an additional engine step that was explicitly deferred in sprint 0011. This sprint does not resolve that gap.

- **Database sovereignty for Person 1.** Unlike the dream handler (which fetches the authenticated user's birth data from the DB when the client doesn't provide it), the synastry handler receives Person 1's birth data from the client alongside Person 2's. This is correct for synastry: it is an interactive, intentional session where the user is actively entering both datasets. A future enhancement could fetch Person 1's data from the DB for authenticated users, but this is not a requirement for this sprint.

- **`computeEnergyRating` port.** This function from `src/engine/transits.ts` returns Tailwind class strings (`dotColor: 'bg-emerald-400'`). It has no server-side use and must not be ported to `synastryEngine.ts` or any server module.

- **Prompt improvements.** The ported `buildSynastryPrompt` and `buildCoupleTransitPrompt` must produce output identical in information density to the frontend versions. No new sections, no reordered sections, no updated language. Parity is the goal; improvements are deferred to a future sprint dedicated to prompt quality.

- **Transit timeline.** `src/engine/transitTimeline.ts` is not referenced by synastry and is explicitly excluded from the sprint.

- **Composite aspect rows.** The `house: 0` gap in composite planets affects `computeTransitAspectBrief` output quality, but that is a UI concern addressed by the `feat-couple-transit-aspect-rows` proposal (sprint 0011, done). This sprint does not change aspect row behavior.

## Open Questions

1. **`TransitData` shape for couple transit.** `buildCoupleTransitPrompt` expects a `TransitData` object with `currentPlanets`, `dateRange`, and `transitAspects`. The `transitAspects` field in the couple transit context is aspects between *transiting planets* and the *composite chart planets* — not either person's natal chart. `transitEngine.ts`'s `calculateTransitAspects` function takes `(transitPlanets, natalPlanets, period, unknownTime)`. For couple transit, the second argument should be `synastryData.compositeChart.planets`. Confirm that `synastryData.compositeChart.planets` has the same shape as `PlanetPosition[]` expected by `calculateTransitAspects` — specifically that `longitude` and `house` fields are present. The composite planets have `house: 0` (known gap), which means `unknownTime` should be treated as `true` for the composite to suppress house-based filtering in the aspect calculation.

2. **`resolveUserBirthContext` vs. inline payload parsing.** The `issue-birth-place-silent-failure` proposal recommends a `resolveUserBirthContext(userId)` function that validates the DB-stored birth data with proper type checks and logging. The synastry handler does not read from the DB (it receives birth data from the client), so `resolveUserBirthContext` is not directly applicable here. However, the same validation pattern — `typeof lat === 'number'`, not just truthy — should be applied to the incoming payload fields. Should there be a shared `validateBirthPayload(raw)` helper that both the DB-path and the client-payload-path use, or is a simple inline guard sufficient for the synastry handler given that the client is trusted (authenticated JWT)?

3. **`dateRange` in `TransitData` for couple transit.** `buildCoupleTransitPrompt` accesses `transitData.dateRange.start` to label the "Current Transits" section of the prompt. This field is a date string set by `calculateTransits` in `transits.ts` during the period scan. For the couple transit server handler, the date range start should be the server's current date — confirm what format `buildCoupleTransitPrompt` expects (`transitData.dateRange.start` at line 608 of `synastry.ts` is used directly in a template string, so the format must match what the frontend generates — likely `YYYY-MM-DD`).

4. **Client call site in `SynastryPage.tsx`.** The `handleRetryGpt` function at line 334 calls `buildSynastryPrompt` client-side and passes the result to `getGptInterpretation`. The App-level synastry GPT trigger (in `src/App.tsx`) does the same. After this port, both call sites should call `getSynastryInterpretation` with raw birth fields. Confirm that `partnerBirthData` in the App state always contains `lat`, `lng`, and `tz` at the time the GPT call is made — or whether these fields are populated only after city lookup resolves. If the partner birth data is incomplete (city lookup pending), the client should not dispatch the GPT call until the fields are available, same as the current behavior.

5. **`NorthNode` in composite chart midpoint.** `calculateCompositeChart` iterates `[...PLANET_NAMES, 'NorthNode']` and computes midpoint positions for all planets including NorthNode (lines 195–210 of `synastry.ts`). `PLANET_NAMES` in `server/engine/astroCore.ts` should include the same set as the frontend. Confirm that `astroCore.ts`'s `PLANET_NAMES` constant includes the 10 standard planets and that NorthNode is handled separately (as in `chartEngine.ts`), so the iteration in the ported `calculateCompositeChart` works correctly without a type error on `'NorthNode'`.
