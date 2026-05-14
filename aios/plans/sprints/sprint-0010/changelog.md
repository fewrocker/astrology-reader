# Sprint 0010 — Changelog

**Theme:** Depth over breadth — making existing readings feel like they know the user.

All 7 tasks delivered. 3 merge conflicts resolved (all work preserved). Final build: 1825 modules, 0 errors.

---

## Code Enhancements

### code-natal-house-context-utility
**Proposal:** code-natal-house-context-utility
**Problem:** Every component that needed a natal planet's house number performed its own independent lookup and inconsistently applied the `unknownTime` guard — creating silent `House 0` output or guard omissions across the codebase.
**Solution:** Created `src/data/interpretations/natalPlanetContext.ts` with a single exported `getNatalPlanetContext(planetName, chartData): { house: number | null; sign: string }` that enforces the `unknownTime` guard at the type level. Exported from the interpretations barrel.

---

### code-transit-aspect-natal-house-embedding
**Proposal:** code-transit-aspect-natal-house-embedding
**Problem:** `TransitAspect` carried the natal planet's name but not its house or sign. Every downstream surface that needed house data was forced to re-query `chartData.planets`, creating prop-drilling and inconsistent null handling across six surfaces.
**Solution:** Added `natalHouse: number | null` and `natalSign: string` to `TransitAspect` (populated in `calculateTransitAspects`). Added `natalHouse?: number | null` and `natalSign?: string` to `TimelineEvent` (populated in `findAspectPerfections`). All downstream consumers now receive house data without additional lookups.

---

## Features

### feat-transit-aspect-row-inline-briefs
**Proposal:** feat-transit-aspect-row-inline-briefs
**Problem:** Every transit aspect row was silent — it showed planet glyphs, an orb number, and an applying/separating badge, but said nothing about what the aspect meant for the specific life area the natal planet governs.
**Solution:** Extracted a shared `AspectRow` component (`src/components/results/AspectRow.tsx`) with an expand/collapse toggle. Each row reveals a one-to-two sentence brief from `computeTransitAspectBrief()` — house-aware, no GPT call. The same component replaced the duplicate row code in both `TransitReadingPage` and `AdvanceTab`.
**What it is:** Click any transit aspect row to expand a personalized interpretation: "Saturn pressing on your 7th house asks you to examine the emotional contracts you've outgrown."
**How to use it:** Open any Transit Reading → tap or click any aspect row → the brief expands below the row. Tap again to collapse.

---

### feat-timeline-house-aware-event-briefs
**Proposal:** feat-timeline-house-aware-event-briefs
**Problem:** `getAspectPerfectionBrief` returned the same text for every user with a given transit-planet/aspect-type pair, ignoring whether the natal planet was in the 2nd house (money) or the 7th house (partnership).
**Solution:** Added a 300-entry `HOUSE_BRIEF_BY_PLANET_ASPECT_HOUSE` table (5 planets × 5 aspect types × 12 houses) and `getPersonalizedEventBrief()` with a three-level fallback chain. TransitTimeline event cards now display house-specific text. `natalHouse` is embedded into `TimelineEvent` at build time.
**What it is:** Transit timeline event cards now describe what the aspect means for your specific life area — not generic planet-aspect language.
**How to use it:** Open Transit Reading → scroll to the Timeline section → each upcoming event shows a personalized brief for your natal house placement.

---

### feat-daily-snapshot-key-aspect-pill-sentence
**Proposal:** feat-daily-snapshot-key-aspect-pill-sentence
**Problem:** The key aspect pill — the most-seen surface in the app — rendered `Key: Mars ☍ natal Sun`. A symbol transcription, not an interpretation. A returning user checking the home screen at 8am gained zero guidance about what kind of day they were walking into.
**Solution:** Created `src/data/interpretations/aspectKeywords.ts` with `TRANSIT_PLANET_PHRASES` (11 planets × 3 natures) and `buildKeyAspectSentence()`. The pill now renders a one-line action sentence. Also extracted `ASPECT_KEYWORDS` from `TodayPage.tsx` to the shared file. Void-of-course days add "decisions may need revisiting" to the moon pill.
**What it is:** The home screen key aspect pill now reads "Mars opposing your natal Sun — a day for assertion, not accommodation" instead of bare symbols.
**How to use it:** Open the app — the daily snapshot card shows the sentence immediately, before the GPT reading loads.

---

### feat-advance-tab-power-day-banner
**Proposal:** feat-advance-tab-power-day-banner
**Problem:** When a user scrubbed the AdvanceTab slider to a date when Saturn was crossing their natal Midheaven, the tab looked identical to any quiet Tuesday. The user who uses AdvanceTab is explicitly planning ahead — yet the tab offered no signal about which dates were significant.
**Solution:** Created `computePowerDayBanner()` with two detection triggers: slow planet (Saturn/Uranus/Neptune/Pluto) contacting a natal angle within 1°, or 3+ applying aspects within 2°. A gold-accented callout banner renders between the quick-stats and the chart when triggered. Also replaced the synchronous `useMemo` pre-calculation with `useTransition` to keep the slider responsive during computation.
**What it is:** A contextual banner appears on future dates with notable configurations: "Saturn reaches your Midheaven on this date — a significant moment for career decisions and public commitments."
**How to use it:** Open Transit Reading → Advance tab → scrub the slider to future dates → notable dates show a gold banner above the chart.

---

### feat-gpt-prompt-hierarchy
**Proposal:** feat-gpt-prompt-hierarchy
**Problem:** `buildTransitPrompt` and `buildSynastryPrompt` sent complete, correct data to GPT but gave it no instruction about priority — GPT covered all topics with equal weight. Also, the transit prompt emitted `(House 0)` for every natal planet when the user had no birth time.
**Solution:** Added priority instruction headers to both prompts (lead with the tightest applying aspect, name its house). Added anti-cliché constraints ("write to the specific aspects and houses, not Sun-sign columns"). Added element profile blocks using `analyzeElements`. Sorted synastry aspects by orb before emitting. Fixed the `(House 0)` bug with a dual guard on `!unknownTime && p.house > 0`.
**What it is:** GPT transit and synastry readings now open by addressing the most active planetary influence by name, house, and orb — rather than covering all topics with equal weight.
**How to use it:** Run any Transit or Synastry reading — the GPT paragraph now leads with the tightest aspect and uses house-specific language throughout.

---

## Failed / Deferred Tasks
None. All 7 tasks delivered.

## Merge Notes
- `src/engine/transitTimeline.ts`: Tasks 0002 and 0004 both modified `findAspectPerfections` signature. Resolved by adopting task-0004's cleaner `natalChart: ChartData` parameter while preserving task-0002's `unknownTime` embedding logic.
- Post-merge fixes: unused import removed, apostrophe escaping in string literals corrected, operator precedence fix in `buildKeyAspectSentence`.
