# feat-server-transit-engine

**Type:** Feature
**Originated by:** Jobs, Carmack, Miyazaki, Taleb
**User guidance:** (none — sprint vision overrides)

---

## Problem / Opportunity

The server is an envelope-opener for transit readings. `handleTransitInterpretation` in `server/services/gpt.ts` line 179 accepts `{ systemPrompt: string }` and blindly forwards it to GPT:

```typescript
async function handleTransitInterpretation(payload: { systemPrompt: string }): Promise<string>
```

The prompt is assembled in the browser at `src/App.tsx` line 317:

```typescript
const prompt = buildTransitPrompt(chart, transitData, birthData.date, state.transitPeriod!, state.transitTargetMonth ?? undefined)
const interpretation = await getGptInterpretation(prompt)
```

And `getGptInterpretation` in `src/services/gptInterpretation.ts` line 97-104 sends the pre-built string:

```typescript
export async function getGptInterpretation(systemPrompt: string): Promise<string> {
  const result = await callProxy('transit-interpretation', { systemPrompt })
  ...
}
```

The server has no visibility into whether the transit calculation was correct, whether the orbs are consistent with the requested period, whether the aspects are sorted by tightness, whether the `detectIngresses` scan ran, or whether the `buildTransitPrompt` function ran at all. If the browser crashed mid-calculation, computed transits for the wrong period, or had a stale natal chart, the GPT interpretation was generated from a lie — and the server never had a chance to know.

The transit calculation stack — `calculateTransits`, `calculateCurrentPositions`, `calculateTransitAspects`, `detectIngresses`, `getRetrogradeStatus`, `assignTransitHouses`, `buildTransitPrompt`, `getTopActiveTransits` — lives entirely in `src/engine/transits.ts`. The server has no equivalent. It cannot compute a transit reading for any user from stored birth data.

This breaks more than just transit readings. The journal annotation handler (`handleJournalAnnotation`, `gpt.ts` line 535) receives `topTransits: TransitAspect[]` pre-filtered by the client. For historical journal entries, the client calls `getTopActiveTransits` with the entry's date. If the browser computed the wrong three aspects for that date, the annotation is permanently wrong — stored to the journal, re-read for years — and the server had no way to verify or correct it.

The `handleDailySnapshot` handler (line 351) receives `{ prompt: string }` — the complete prompt string built in `DailySnapshotCard.tsx`. The server is a post office.

The dream handler is the one exception: after `fe51ab02`, `handleDreamInterpretation` falls back to server-computed chart context and sky snapshot when the client sends nothing. But even that fallback is limited: it can compute natal positions and tonight's moon, but it cannot compute transits for a period, cannot detect ingresses, cannot build the full transit narrative that `buildTransitPrompt` produces. The dream interpretation knows *what* is in the natal chart but not *what the planets are doing to it this month*.

The root cause: `buildTransitPrompt` in `src/engine/transits.ts` line 292 calls `analyzeElements` from `src/data/interpretations/index.ts`, which is a frontend module. The server has no access to it. This import dependency is what has prevented a clean server-side port.

The secondary structural problem: `normalizeAngle`, `longitudeToZodiac`, `getMeanNodeLongitude`, `getPlanetLongitude`, and `BODY_MAP` are already duplicated between `src/engine/transits.ts` and `server/engine/chartEngine.ts` (as private functions). Porting `transitEngine.ts` as a standalone file would produce a third copy of each. This duplication problem is addressed by the prerequisite `code-server-astrocore-module` proposal, which must be complete before this feature is implemented.

---

## Vision

The server computes the complete transit picture from stored birth data, assembles the GPT prompt using the same logic and information density as the frontend, and calls GPT — with no dependency on what the client chose to compute or send.

`handleTransitInterpretation` accepts `{ transitPeriod, targetMonth? }` for authenticated users and performs the entire computation server-side: natal chart from `birth_date`, `birth_time`, `birth_place` in the DB, transit positions via `calculateCurrentPositions`, transit aspects via `calculateTransitAspects` with correct period-scaled orbs, ingresses via `detectIngresses`, retrograde statuses via `getRetrogradeStatus`, element profile via `analyzeElements`, and final prompt assembly via `buildTransitPrompt`. The GPT call is backed by a calculation the server performed itself.

The client continues computing transits independently for instantaneous UI. Nothing changes in `src/App.tsx`'s loading-view pattern. When the server finishes its own computation and calls GPT, the frontend displays the result as it does today. The frontend stays fast; the backend becomes sovereign.

Journal annotations stop trusting the client's transit slice. When `handleJournalAnnotation` receives an entry with a date, it can compute `getTopActiveTransits` for that date from the user's stored birth data — and either verify what the client sent or compute independently. Historical annotations are permanently stored; they deserve permanently correct sky data.

Server-side transit computation also unblocks experiences that are structurally impossible today: a daily transit briefing assembled by the server before the user opens the app; a scheduled weekly reading sent to users; a richer dream context that includes not just tonight's moon but the full transit narrative for the period. These features are not part of this proposal, but none of them can exist until the transit engine is on the server.

---

## Specifications

### Prerequisite

**1. `code-server-astrocore-module` must be complete before this feature is implemented.**

`buildTransitPrompt` calls `analyzeElements(natalChart.planets)` at `src/engine/transits.ts` line 361. `analyzeElements` is defined in `src/data/interpretations/index.ts`, a frontend file. The server cannot import it. `server/engine/astroCore.ts` — proposed in `code-server-astrocore-module` — will contain a documented copy of `analyzeElements` along with the shared astronomical primitives (`normalizeAngle`, `longitudeToZodiac`, `BODY_MAP`, etc.) that `transitEngine.ts` depends on. Until `astroCore.ts` exists, `transitEngine.ts` cannot be written without re-duplicating those utilities for the third time.

---

### What `server/engine/transitEngine.ts` exports

**2. `calculateCurrentPositions(date: Date): TransitPosition[]`**

Port of `src/engine/transits.ts` `calculateCurrentPositions`. Computes geocentric ecliptic longitudes for all 10 planets plus the North Node at the given date using `astronomy-engine`. Includes daily motion calculation via `getDailyMotion` (imported from `astroCore.ts`). Returns `TransitPosition[]` with `name`, `longitude`, `sign`, `signIndex`, `degree`, `minute`, `retrograde`, `house` (0 until assigned), and `dailyMotion` fields. The `NorthNode` entry always has `dailyMotion: -0.053` and `retrograde: true`, matching the frontend.

**3. `calculateTransitAspects(transitPlanets: TransitPosition[], natalPlanets: ServerPlanetPosition[], period: TransitPeriod, unknownTime: boolean): TransitAspect[]`**

Port of `src/engine/transits.ts` `calculateTransitAspects`. Applies period-scaled orbs to the base `ASPECT_DEFINITIONS` from `astroCore.ts`:
- `daily`: orb multiplier `0.3` → conjunction/square/trine/opposition max `2.4°`, sextile `1.8°`
- `weekly`: orb multiplier `0.5` → conjunction/square/trine/opposition max `4.0°`, sextile `3.0°`
- `monthly`: orb multiplier `0.7` → conjunction/square/trine/opposition max `5.6°`, sextile `4.2°`

The base orbs from `ASPECT_DEFINITIONS` (conjunction `8°`, sextile `6°`, square `8°`, trine `8°`, opposition `8°`) must match the frontend's `src/engine/aspects.ts` exactly. The server's existing `ASPECT_DEFS` in `chartEngine.ts` lines 78–84 uses hardcoded tight orbs (2.4°, 1.8°) intended for snapshot use only — those are the `daily` scaled values by coincidence, not a canonical definition. The monthly transit period produces `5.6°` for major aspects; `chartEngine.ts`'s hardcoded 2.4° would silently miss aspects the frontend shows. The orb table in `astroCore.ts` must be derived from the full 8°/6° base, not from `chartEngine.ts`'s snapshot definitions.

Sets `natalHouse` to `null` when `unknownTime` is true, matching line 152 of the frontend. Sorts resulting aspects by orb ascending before returning.

Includes `semi-sextile` (30°, orb 2°) and `quincunx` (150°, orb 3°) from `ASPECT_DEFINITIONS` — these minor aspects are in the frontend's `ASPECT_DEFINITIONS` and must be included in the server port for identical information density.

**4. `detectIngresses(startDate: Date, endDate: Date): SignIngress[]`**

Port of the private `detectIngresses` function in `src/engine/transits.ts` lines 176–213. Scans each day in the date range for each planet, checking sign crossings. Moon is checked every 6 hours (4× per day). Do not alter the algorithm — the sign-change boundary detection has subtle correctness requirements. Port verbatim.

**5. `getRetrogradeStatus(date: Date): { planet: PlanetName; isRetro: boolean; status: string }[]`**

Port of `src/engine/transits.ts` `getRetrogradeStatus`. Skips Sun and Moon. Uses `getDailyMotion` from `astroCore.ts`. Detects stationing when `Math.abs(motion) < 0.02`. Returns all non-luminary planets with their retrograde/direct/stationing status.

**6. `assignTransitHouses(transitPlanets: TransitPosition[], natalHouses: ServerHouseCusp[]): TransitPosition[]`**

Port of `src/engine/transits.ts` `assignTransitHouses`. Assigns natal house numbers to transit planet positions using natal house cusps via `getHouseForLongitude` from `astroCore.ts`. Returns a new array with `house` fields populated.

**7. `calculateTransits(natalChart: ServerChartData, period: TransitPeriod, targetMonth?: string): TransitData`**

Port of `src/engine/transits.ts` `calculateTransits`. Orchestrator that calls `getDateRange` (private, ported from the frontend), `calculateCurrentPositions`, `calculateTransitAspects`, `detectIngresses`, and `getRetrogradeStatus`. Returns the full `TransitData` object with `period`, `dateRange`, `currentPlanets`, `transitAspects`, `ingresses`, and `retrogrades`.

On the server, `getDateRange`'s use of `new Date()` returns the server's current time — which is always correct. The server never has a stale browser tab. This is a correctness improvement over the client, not a divergence.

**8. `buildTransitPrompt(natalChart: ServerChartData, transitData: TransitData, birthDate: string, period: TransitPeriod, targetMonth?: string): string`**

Port of `src/engine/transits.ts` `buildTransitPrompt` lines 292–424. This is the complete prompt assembler. It must produce identical output structure to the frontend function, including:

- Natal planet positions with degree/minute/sign/house (house suppressed when `unknownTime` is true)
- Ascendant and Midheaven lines with degree/minute/sign
- Current transit positions with retrograde markers (NorthNode excluded from this section, matching line 329)
- Transit aspects list sorted by orb ascending, with applying/separating distinction, nature, and symbol
- Sign ingresses section (when ingresses detected)
- Retrograde activity section (only retrograde or stationing planets)
- Natal element profile via `analyzeElements` from `astroCore.ts` — this section must be present; it provides GPT calibration context
- Tightest applying aspect priority instruction (the "Priority: Lead with..." header)
- Period-specific focus instructions (daily: 3–4 paragraphs; weekly: 4–5 paragraphs; monthly: 5–6 paragraphs)
- House-naming instruction when `!unknownTime`; sign-only instruction when `unknownTime`
- Anti-cliché constraint closing paragraph

The server-side `buildTransitPrompt` must not be a simplified or stripped version. The quality bar from the sprint vision applies: "server-assembled prompts must be identical in information density to frontend-assembled prompts."

`buildTransitPrompt` uses `ServerChartData` (from `astroCore.ts`) rather than the frontend's `ChartData`. The structural equivalence between the two types means the prompt logic is a direct port — `p.degree`, `p.minute`, `p.sign`, `p.house`, `p.retrograde` all exist on both types.

**9. `getTopActiveTransits(chartData: ServerChartData, maxCount: number, maxOrbDegrees: number, date?: Date): TransitAspect[]`**

Port of `src/engine/transits.ts` `getTopActiveTransits`. Computes current positions at `date ?? new Date()`, runs `calculateTransitAspects` at `daily` period scaling, filters by `maxOrbDegrees`, and returns the top `maxCount` aspects sorted by orb ascending. Used by `handleJournalAnnotation` for historical date transit lookup and by the dream handler's fallback sky context to enrich it with period narrative.

---

### How `handleTransitInterpretation` changes

**10. New payload shape for authenticated users**

`handleTransitInterpretation` is upgraded to compute from stored birth data when called from an authenticated session:

```typescript
async function handleTransitInterpretation(
  payload: { transitPeriod: TransitPeriod; targetMonth?: string },
  userId: number,
): Promise<string>
```

The handler calls `resolveUserBirthContext(userId)` (defined in `code-server-astrocore-module`), computes the natal chart via `calculateChart`, runs `calculateTransits`, then calls `buildTransitPrompt` to assemble the GPT prompt. The prompt is never accepted from the client for authenticated users.

The main dispatcher in `handleGptRequest` passes `userId` to `handleTransitInterpretation` for authenticated requests, consistent with how `handleDreamInterpretation` already receives `userId` at line 212.

**11. Client-side call site change**

`getGptInterpretation` in `src/services/gptInterpretation.ts` is updated to send the transit period and target month instead of the pre-built prompt string:

```typescript
export async function getGptInterpretation(
  period: TransitPeriod,
  targetMonth?: string,
): Promise<string>
```

Callers in `src/App.tsx` line 318 change from:
```typescript
const interpretation = await getGptInterpretation(prompt)
```
to:
```typescript
const interpretation = await getGptInterpretation(state.transitPeriod!, state.transitTargetMonth ?? undefined)
```

The locally-assembled `prompt` variable (line 317) is retained for display purposes if needed but is no longer sent to the server.

**12. Fallback for unauthenticated users**

When `userId` is absent (unauthenticated call), `handleTransitInterpretation` cannot access stored birth data. In this case the handler must receive the pre-built prompt as a fallback: `{ systemPrompt: string }`. The dispatcher detects authentication and routes accordingly. Unauthenticated users retain the existing behavior.

---

### Period-scaled orb parity

**13. Orb verification requirement**

Before any transit aspect comparison is considered complete, a test must verify that for each period (`daily`, `weekly`, `monthly`), the server-computed transit aspect list for a fixed natal chart and date matches the frontend-computed list — same aspects, same orbs, same applying/separating flags. The three base multipliers (`0.3`, `0.5`, `0.7`) are applied identically on both sides.

The orb discrepancy risk is real: `chartEngine.ts`'s existing `ASPECT_DEFS` has hardcoded values that match the `daily` scaled orbs by coincidence, not by design. If a porter imports from `chartEngine.ts`'s `ASPECT_DEFS` instead of from `astroCore.ts`'s full `ASPECT_DEFINITIONS`, the `weekly` and `monthly` periods will silently miss aspects the frontend shows. This must be caught before merging.

---

### Journal annotation upgrade

**14. `handleJournalAnnotation` gains server-side transit computation**

When the handler receives an `entry.date` and a `userId`, it calls `getTopActiveTransits(natalChart, 5, 3, new Date(entry.date))` to compute the active transits for that historical date independently. If the client sent `topTransits` and the server-computed list is non-empty, the server uses its own computation. The client's `topTransits` field becomes an optional hint, not the authoritative source.

The entry date is used as the `date` parameter to `calculateCurrentPositions`, consistent with `getTopActiveTransits`'s optional `date` parameter (already implemented in the frontend at `transits.ts` line 436).

**15. Journal annotation does not recompute for unauthenticated users**

For sessions without `userId`, the handler falls back to the client-provided `topTransits` unchanged. The journal feature requires authentication for data persistence; this fallback is only reachable for edge cases.

---

### `resolveUserBirthContext` integration

**16. Every handler that computes from stored birth data calls `resolveUserBirthContext`**

`resolveUserBirthContext(userId: number)` is defined in `server/engine/astroCore.ts` (or a shared location exported by it). It reads `birth_date`, `birth_time`, `birth_place` from the DB, validates that `lat` and `lng` are of type `number` (not strings), validates that `tz` is a non-empty string, and returns a typed `BirthContext` object or `null`. It handles the case where `birth_place` contains string-encoded coordinates gracefully (parsing and coercing to number). It logs a structured warning when fields are missing or malformed — not an error, not a silent fallthrough.

`handleTransitInterpretation` calls this function first. If it returns `null`, the handler falls back to the unauthenticated path (requires `systemPrompt` from the client) rather than proceeding with an empty natal context.

---

### What `computeEnergyRating` must NOT be ported

**17. `computeEnergyRating` is excluded from the server port**

`computeEnergyRating` in `src/engine/transits.ts` lines 454–467 returns `{ label: string; score: number; dotColor: string; textColor: string }` where `dotColor` and `textColor` are Tailwind CSS class strings (`'bg-emerald-400'`, `'text-emerald-400'`). The server has no use for CSS class strings. This function is UI logic embedded in the engine file. Do not port it. If any future server-side feature needs to communicate energy level, have it return the raw `score` integer and let the client map to display classes.

---

### Testing requirements

**18. Reference test: server vs. frontend transit calculation parity**

Before the transit engine is merged, at minimum one automated test must verify:

For a fixed natal chart input (e.g., a known birth date/time/location) and a fixed computation date:
- `calculateCurrentPositions` produces planet longitudes within 0.1° of the frontend's equivalent for the same inputs
- `calculateTransitAspects` for `daily`, `weekly`, and `monthly` periods produces the same aspect list (same planet pairs, same aspect types, same orb values within 0.01°) as the frontend
- `buildTransitPrompt` produces a string with the same structural sections as the frontend (natal positions, transit positions, aspects list, element profile section, instructions section)

This test catches orb table mismatches and `resolveToUTC` timezone divergence before they reach production. Five representative birth dates across different timezone regions cover the main risk surface.

**19. `buildTransitPrompt` completeness test**

A dedicated test verifies that the server's `buildTransitPrompt` output contains all required sections: `## Birth Chart (Natal)`, `## Current Transit Positions`, `## Transit Aspects to Natal Chart`, `## Natal Element Profile`, `## Instructions`. The element profile section must not be empty — `analyzeElements` must have run with actual planet positions.

**20. `handleJournalAnnotation` integration test**

Verifies that for a journal entry with a historical date and a valid `userId` with stored birth data, the handler computes `topTransits` independently and uses them in the annotation prompt rather than the client-provided list.

---

## Out of Scope

- **`computeEnergyRating`** — UI-display function returning Tailwind class strings; server has no use case.
- **`buildCoupleTransitPrompt`** — lives in `src/engine/synastry.ts`, depends on `SynastryData`, and is part of the synastry engine port (a separate proposal). It imports `TransitData` from this engine, so `transitEngine.ts` must exist first, but the couple transit prompt builder is not part of this proposal.
- **`transitTimeline.ts` / `buildTransitTimeline`** — 477 lines of binary-search logic for aspect perfection dates, retrograde stations, and lunar phase events. No current server-side consumer. Computationally expensive. Excluded by the sprint vision explicitly.
- **Changing any prompt text, system messages, temperature, or `max_tokens` values** — the goal is parity with what the frontend currently produces. Prompt quality improvements are deferred to a future sprint.
- **Frontend calculation removal** — `calculateTransits` and `buildTransitPrompt` calls in `src/App.tsx` lines 311–317 remain in place. The client-side calculation path is not touched.
- **New UI surfaces** — no new pages, no new reading types, no new components.
- **Database schema changes** — the sprint reads only from existing `birth_date`, `birth_time`, `birth_place` columns.
- **Synastry, solar return, numerology engine ports** — separate proposals.
- **`astroCore.ts` extraction** — prerequisite, separate proposal (`code-server-astrocore-module`).

---

## Open Questions

**1. Whether `getGptInterpretation` should be renamed at the call site**

The function name `getGptInterpretation` in `gptInterpretation.ts` historically referred to the transit reading specifically (it was the only handler that accepted an opaque prompt string). After this change its signature is `(period, targetMonth?)`. Renaming it to `getTransitInterpretation` would clarify intent, but it is a pure rename across one caller (`App.tsx` line 318) and one definition. Worth doing for clarity but not a functional requirement.

**2. How the `handleDailySnapshot` handler relates to this proposal**

Miyazaki's voice proposes upgrading `handleDailySnapshot` to compute its own snapshot server-side for authenticated users (Proposal 2 in the voices file). That upgrade depends on transit computation being available on the server — specifically `calculateCurrentPositions` and `calculateTransitAspects`. It is not included in this proposal, which focuses on the transit reading handler only. Once `transitEngine.ts` ships, `handleDailySnapshot` is a natural follow-on upgrade.

**3. Whether the fallback for unauthenticated users (`{ systemPrompt: string }`) should be kept indefinitely**

The unauthenticated path preserves the pre-built prompt fallback so non-registered users continue to receive transit readings. At some point this dual-signature creates maintenance surface: two code paths, two payload shapes, one handler. If transit readings are eventually gated on authentication (for subscription reasons), the opaque-prompt fallback can be removed entirely. For now, keeping it is the correct scope-respecting decision.

**4. `resolveToUTC` divergence between Node.js and browser IANA timezone databases**

Taleb's voice identifies a real risk: a user born during a DST transition in a jurisdiction with complex historical timezone rules (Brazil 1970–1995, parts of Eastern Europe, etc.) may get a different chart from the server than from the client if their IANA database versions diverge. The contract test in spec 18 will catch any divergence for the test cases chosen. The open question is whether the five representative test cases cover the actual risk surface for the current user base. For production confidence, the test suite should include at least one historically complex timezone (e.g., a 1985 São Paulo birth time during a Brazilian DST transition period). If a divergence is found, the correct fix is to pin a specific IANA database version on the server — not to change the `resolveToUTC` algorithm.

**5. `analyzeElements` interpretation strings: where they live in `astroCore.ts`**

`analyzeElements` needs `SIGN_ELEMENTS` (a 12-entry record mapping sign names to elements) and `ELEMENT_INTERPRETATIONS` (4 short strings, one per element). These are currently in `src/data/interpretations/index.ts` and `src/data/interpretations/types.ts`. When porting to `astroCore.ts`, the implementation note should be explicit: "ported from src/data/interpretations/index.ts — if the interpretation strings change in the frontend, update here." Four sentences of interpretation text are low-maintenance duplication; they should not live in a separate file from `analyzeElements` itself.
