**Type:** Feature
**Originated by:** Jobs, Carmack, Miyazaki, Taleb
**User guidance:** (none — sprint vision overrides)
**Status:** done

## Outcome

Implemented `SRStaticBriefs` as a local function component in `SolarReturnPage.tsx`. It renders two cards — SR Sun house and SR Moon house — above the GPT block in the Reading tab, always visible once `solarReturnData` is non-null. Each card shows the planet, house number, an eyebrow label (Primary Focus / Emotional Climate), and the `PLANET_IN_HOUSE` brief prefixed with "This year: ". Guards for house 0, out-of-range values, and missing planets are in place. Layout uses `grid-cols-1 sm:grid-cols-2` (stacked mobile, side-by-side desktop). Visual style is lighter than the GPT block (`bg-amber-900/5 border border-amber-500/10`).

Also added `analyzeElements` injection into `buildSolarReturnPrompt` in `solarReturn.ts` — inserts a `## Natal Element Profile` block between the natal chart positions and SR chart sections, matching the format used in `buildTransitPrompt`.

TypeScript check passed clean. Committed as `a5dc561`.

## Spec Checklist

- [x] 1. Location in layout — above GptSkeleton/SRReading, unconditionally visible in all GPT states
- [x] 2. Data source for SR Sun house — `srData.srChart.planets.find(p => p.name === 'Sun')`, `PLANET_IN_HOUSE[\`Sun_H${srSun.house}\`]?.brief`
- [x] 3. Data source for SR Moon house — same pattern for Moon
- [x] 4. Guard against house 0 or out-of-range — house must be 1–12 inclusive before lookup
- [x] 5. Guard against missing planet — card suppressed if planet is undefined
- [x] 6. Visual treatment — `bg-amber-900/5 border border-amber-500/10`, lighter than GPT `bg-mystic-gold/5 border-mystic-gold/20`
- [x] 7. Label text — "Primary Focus" and "Emotional Climate" matching KeyPlacements descriptors
- [x] 8. Brief text framing — prefixed with "This year: ", no modification to `planetInHouse.ts`
- [x] 9. No new shared component — implemented as local function within `SolarReturnPage.tsx`
- [x] 10. Element profile in `buildSolarReturnPrompt` — `analyzeElements` imported and injected
- [x] 11. Year-change behavior — static cards derive from `solarReturnData.srChart`, update automatically on year toggle
- [x] 12. Unknown birth time edge case — reads exclusively from `srData.srChart`, which always has valid houses

## Problem / Opportunity

The Reading tab on `SolarReturnPage.tsx` has two states: a `GptSkeleton` labeled "Tracking the Sun's return..." and the GPT paragraph once it loads. Nothing exists in between. A user who opens the Reading tab before the network call returns sees animation and no information.

The SR Sun house and SR Moon house are the two most important static facts on the page — they answer, respectively, "What will this year focus on?" and "What will the emotional climate be?" Both are already displayed in the `KeyPlacements` grid component (lines 64–90 of `SolarReturnPage.tsx`) as data labels — "Sun: Gemini H3 — Primary focus" — but with no interpretation text. The user sees the number and must supply the meaning themselves.

`src/data/interpretations/planetInHouse.ts` already contains `Sun_H1` through `Sun_H12` and `Moon_H1` through `Moon_H12`, each with a `brief` field (5–10 words) and a `detail` field (a full paragraph). This interpretation data is loaded at build time, costs nothing to read, and requires no network round-trip. It is not being used on the Solar Return page.

Additionally, `buildSolarReturnPrompt` in `src/engine/solarReturn.ts` does not include the dominant element profile for the natal chart. The transit prompt (`buildTransitPrompt`) gained `analyzeElements` output in sprint 0010. The SR prompt sends complete planetary position data but never gives GPT the synthesized element summary — Fire dominant, Air deficient — that helps it frame the year's character accurately and consistently. The omission means GPT must infer element emphasis from raw sign data, which it does inconsistently.

## Vision

A user opens the Solar Return reading for the upcoming year. Before GPT responds — potentially before the skeleton even finishes its first pulse — two labeled cards appear on the Reading tab: one for SR Sun in House N, one for SR Moon in House N. Each card names the house, shows a one-line brief drawn from `PLANET_IN_HOUSE`, and carries a clear label — "Primary Focus" and "Emotional Climate" — that matches the labels already on the `KeyPlacements` grid above. The user immediately holds two accurate, specific facts about their year. When the GPT paragraph arrives, it adds synthesis and nuance but does not need to explain what the SR Sun house is, because the user already knows. For users who hit their GPT quota or experience network errors, the static layer is the reading — two short sentences that are accurate, chart-specific, and immediately useful.

The static cards should read as distinct from the GPT block: lighter styling, a label that signals client-computed origin, not the same gold-heavy border used for the GPT reading. The distinction is honest: this is a lookup, not synthesis.

## Specifications

1. **Location in layout.** Render the static brief block inside the Reading tab (`activeTab === 'reading'`), above the `GptSkeleton` or the `SRReading` component — unconditionally visible regardless of GPT state. The block should appear in all three GPT states: loading (alongside the skeleton), error (alongside the retry button), and loaded (above the `SRReading` div). It is always present once `solarReturnData` is non-null.

2. **Data source for SR Sun house.** Look up `srData.srChart.planets.find(p => p.name === 'Sun')` for the house number. Use `PLANET_IN_HOUSE[`Sun_H${srSun.house}`]?.brief` as the display text. The SR chart is always calculated from a precise UTC moment via `findSolarReturn`, so `srChart` planet houses are always valid. Do not use `natalChart.planets` for this lookup — natal planets have `house: 0` when the user has no birth time (`unknownTime: true`), and `PLANET_IN_HOUSE['Sun_H0']` returns `undefined`.

3. **Data source for SR Moon house.** Same pattern: `PLANET_IN_HOUSE[`Moon_H${srMoon.house}`]?.brief`. Same guard: SR chart only, not natal.

4. **Guard against house 0 or out-of-range.** Before rendering each card, check that the house value is a number between 1 and 12 inclusive. If the check fails for either planet (value is 0, undefined, or out of range), suppress that card silently. Do not render a broken or empty brief card. The `PLANET_IN_HOUSE` key schema uses `Sun_H1` through `Sun_H12`; anything outside that range has no entry.

5. **Guard against missing planet.** If `srChart.planets.find(p => p.name === 'Sun')` returns undefined (should not occur in practice given how `calculateChart` works, but must be handled), suppress the Sun card. Same for Moon.

6. **Visual treatment — static vs. GPT distinction.** The static cards should use a muted amber style that differs clearly from the `SRReading` component's `bg-mystic-gold/5 rounded-lg p-6 border border-mystic-gold/20` container. Suggested: a two-column (or stacked on mobile) card pair using `bg-amber-900/5 border border-amber-500/10 rounded-lg px-4 py-3`, with a small label in muted text above the brief. The visual weight should be lighter than the GPT block — the static brief is a preview, not the headline. No new color tokens; use existing `amber-*` and `mystic-*` classes already present on the page.

7. **Label text.** Each card carries a small eyebrow label: "Primary Focus" for the Sun card, "Emotional Climate" for the Moon card. These match the descriptor strings already used in `KeyPlacements` for the Sun and Moon tiles. Consistency here reinforces that the two views are showing the same facts at different depths: the tile above shows the house number, the card below explains what it means.

8. **Brief text framing.** The `PLANET_IN_HOUSE` brief entries are written in natal voice ("Your Sun in the 5th house makes creative self-expression central to who you are"). On the Solar Return page, these entries appear in a year-ahead context, not a birth chart context. Adapt the framing with a compact prefix that recontextualizes without rewriting the data: prefix the brief text with "This year: " before the `PLANET_IN_HOUSE` brief string. This is a render-layer adaptation — do not modify `planetInHouse.ts`. The sprint vision explicitly prohibits modification of that file.

9. **No new component required.** The two cards can be implemented as an inline block or a small local component within `SolarReturnPage.tsx`. A new shared component is not needed and would constitute over-engineering for two named cards.

10. **Element profile in `buildSolarReturnPrompt`.** In `src/engine/solarReturn.ts`, import `analyzeElements` from `src/data/interpretations/index.ts` (already exported there; already imported in `transits.ts` for reference). Call `analyzeElements(natalChart.planets)` at the start of `buildSolarReturnPrompt`. Inject the dominant element summary into the prompt body between the natal chart positions block and the SR chart block, using the same format applied in `buildTransitPrompt` post-sprint-0010. This is two lines in the engine file: one call, one prompt string interpolation. No type changes. No new exports. No logic changes.

11. **Year-change behavior.** When the user clicks the year toggle buttons (current year / current year + 1), a new `START_SOLAR_RETURN` action is dispatched and `solarReturnData` updates. The static cards are derived from `solarReturnData.srChart`, so they update automatically when a new SR calculation completes. No additional state or effect is needed.

12. **Unknown birth time edge case.** When `birthData.unknownTime` is true, the natal chart's planets have `house: 0`, but the SR chart's planets always have valid house assignments (the SR calculation uses `calculateChart` with a precise UTC time and the user's birth coordinates, not the user's birth time). The static SR Sun/Moon house cards are safe to render for users without birth time because they read exclusively from `srData.srChart`. The absence of birth time does not affect SR chart house assignments.

## Out of Scope

- Modifying `planetInHouse.ts` entries. The data is correct for this use case; the framing adaptation ("This year: ...") is a render-layer prefix only.
- Adding interpretation for SR Ascendant or SR MC in the static layer. The `KeyPlacements` grid already surfaces these. SR Sun and SR Moon house are the highest-value facts; the others are secondary.
- Adding a `detail` paragraph from `PLANET_IN_HOUSE` to the static cards. The `brief` field (5–10 words) is the correct resolution for a pre-GPT static layer. The `detail` paragraph is full-reading length and competes with the GPT block. `brief` only.
- Expand/collapse interaction on the static cards. These are static display elements, not interactive rows. No expand toggle, no animation.
- Per-year static interpretation differences. The same `PLANET_IN_HOUSE` data applies regardless of which year is selected, because it describes the planet-in-house pattern, not year-specific conditions. Year selection already triggers a new SR calculation; the static brief updates automatically via `srData`.
- Changing the `buildSolarReturnPrompt` instructions section or its planet listing format. Only the element profile block is added; all existing prompt structure is preserved.
- New GPT calls, new reading types, new screens.
- Engine calculation changes (other than the two-line `analyzeElements` insertion in the prompt builder).

## Open Questions

1. **Prefix phrasing.** "This year: [brief]" is proposed above as the natal-to-SR recontextualization. An alternative is "For this solar year, [brief lowercased]." The exact phrasing should be decided during implementation; either works provided the prefix is consistent across both cards.

2. **Card arrangement on mobile.** The `KeyPlacements` grid above uses `grid-cols-2 sm:grid-cols-4`. For the static brief cards, a vertical stack (one card per row, full width) may read better than a two-column side-by-side, since each card contains a sentence rather than a single value. The implementer should test both on a narrow viewport and choose the layout that keeps the brief text comfortably readable without wrapping at awkward breakpoints.

3. **Visibility when both GPT error and static cards are shown simultaneously.** When GPT fails and the retry button appears, the static cards are still rendered above it. This is the intended behavior (the static layer is the fallback when GPT is unavailable), but the visual composition — two brief cards followed immediately by an error message and retry button — should be reviewed in context to ensure the error state reads clearly and does not look like the brief cards caused the failure.

4. **`analyzeElements` import path in `solarReturn.ts`.** Confirm that `analyzeElements` is exported from `src/data/interpretations/index.ts` before writing the import. It is referenced there in the voices analysis and used in `transits.ts`; verify the export exists at the index before the implementation step.
