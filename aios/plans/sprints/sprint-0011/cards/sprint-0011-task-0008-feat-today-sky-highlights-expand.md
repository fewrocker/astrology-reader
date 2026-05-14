**Type:** Feature
**Originated by:** Jobs, Carmack, Miyazaki, Taleb
**User guidance:** (none — sprint vision overrides)

## Problem / Opportunity

`TodayPage.tsx` (lines 162–192) renders the "Sky Highlights" card as 3 static rows. Each row is a `<div className="flex items-center justify-between">` pair: glyph + symbol + glyph on the left, a single keyword from `getAspectKeyword()` on the right. There is no expand/collapse, no house-aware brief, no orb readout, and no applying/separating badge.

This is the pre-sprint-0010 state of transit aspect rows. Sprint 0010 built the exact tooling to fix it: `AspectRow` at `src/components/reading/AspectRow.tsx` handles expand/collapse, brief reveal, orb display, applying badge, and nature coloring. `computeTransitAspectBrief` at `src/data/interpretations/transitAspectBriefs.ts` generates a house-aware one-to-two sentence interpretation from `TransitAspect` fields. `TransitAspect` now carries `natalHouse` directly (sprint 0010, embedded in `getTopActiveTransits` via `calculateTransitAspects`). `chartData` is already a prop on `TodayPage` (line 35).

Everything required is in place. The gap is the wiring. The current row loop is approximately 10 lines of JSX. The replacement is approximately the same size. No new files, no new data, no new GPT calls.

One constraint raised by Taleb is structural: `getTopActiveTransits(chartData, 3, 8)` uses an 8-degree orb cutoff to ensure Sky Highlights always has something to show. At 8 degrees, a slow-moving transit like Saturn square Moon may be "applying" for 3–4 months. The `TransitAspect.applying` flag is computed from daily planetary motion direction and is technically correct, but the `AspectRow` "applying" badge reads as "happening now" to users. An 8-degree applying badge creates false urgency. This must be addressed explicitly in the implementation — either by reducing the orb cutoff or by making the orb visible enough to calibrate urgency before the brief draws the user's attention away from it.

## Vision

A user opens the TodayPage. The Sky Highlights card shows 3 transit aspect rows. Each row shows the glyph pair, the orb, and an applying/separating badge — the same compact header pattern used in the transit reading page. Tapping any row reveals a one-to-two sentence brief that names the natal planet's house and the life area being activated by this transit today. The user learns not just that "Saturn is doing something to their Moon" but that Saturn is pressing on their House of Emotional Foundation, and what that means right now.

For users without birth time (`chartData.unknownTime === true`), the brief falls back to the generic `ASPECT_BRIEFS` path inside `computeTransitAspectBrief` — a planet-pair sentence without house reference — which is still more informative than the current keyword label.

The Sky Highlights card should feel like a pocket transit reading: three taps, three sentences, one clear picture of what the sky is doing to this chart today.

## Specifications

1. **Import `AspectRow` and `computeTransitAspectBrief` into `TodayPage.tsx`.** Add `import AspectRow from '../reading/AspectRow'` and `import { computeTransitAspectBrief } from '../../data/interpretations/transitAspectBriefs'`. Remove the `getAspectKeyword` import and the `ASPECT_KEYWORDS` import if they are no longer used after the Sky Highlights section is replaced. Remove the `PlanetName` import from `engine/types` if it was only used in the old row loop glyphs.

2. **Replace the Sky Highlights render loop.** The current `transits.map((a, i) => { ... <div className="flex items-center justify-between"> ... })` block (lines 167–186) is replaced with a `transits.map((a, i) => <AspectRow ... />)` block. The outer `<div className="space-y-3">` wrapper is removed; `AspectRow` manages its own `border-b border-mystic-gold/5` separator via `last:border-0`.

3. **Map `TransitAspect` fields to `AspectRow` props.** The mapping is 1:1:
   - `transitPlanet={a.transitPlanet}`
   - `natalPlanet={a.natalPlanet}`
   - `aspectType={a.type}`
   - `nature={a.nature}`
   - `symbol={a.symbol}`
   - `orb={a.orb}`
   - `applying={a.applying}`
   - `brief={computeTransitAspectBrief(a.transitPlanet, a.type, a.natalPlanet, a.natalHouse, a.nature, a.applying)}`

4. **Brief generation.** `computeTransitAspectBrief` already handles all cases:
   - When `natalHouse` is 1–12 and the transit planet has an entry in `TRANSIT_PLANET_PHRASES`, it produces a house-aware sentence: `"Saturn pressing on your House of Emotional Foundation — [house brief]."` This is the primary path and meets the sprint's quality bar.
   - When `natalHouse` is `null` (user has no birth time, `chartData.unknownTime === true`), it falls back to `getAspectPerfectionBrief(aspectType, natalPlanet)` from `transitEvents.ts`.
   - NorthNode as transit planet has no `TRANSIT_PLANET_PHRASES` entry and falls through to the generic fallback. That is acceptable.

5. **Orb and applying badge: the Taleb constraint.** The "applying" badge on an 8-degree transit creates false urgency because "applying" at wide orb means the aspect is weeks or months from exact. Two options are acceptable; both are documented here so the implementer chooses one:
   - **Option A (preferred): Cap `getTopActiveTransits` to 4–5 degrees on TodayPage.** Change the call from `getTopActiveTransits(chartData, 3, 8)` to `getTopActiveTransits(chartData, 3, 5)`. This limits Sky Highlights to transits within 5 degrees, which represent genuine near-term activations (inner planets within days, Saturn/Jupiter within a few weeks at most). The "applying" badge at ≤5 degrees is accurate enough that urgency framing is not misleading. If fewer than 3 transits exist within 5 degrees, Sky Highlights simply shows fewer rows (1 or 2 is fine). The "No tight transit aspects active right now" fallback already exists and handles 0 results.
   - **Option B: Display the orb prominently and qualify applying text.** Keep the 8-degree cutoff but render the orb with more visual weight (currently `text-xs text-mystic-muted` — move to `text-sm` or change color to `text-mystic-text/60`). Do not change the badge label; the orb number itself provides the calibration a user needs if it is visible. This preserves coverage on quiet transit days at the cost of slightly more visual noise.
   - The proposal recommends Option A. The 8-degree cutoff was chosen to ensure the block always has content. But `AspectRow` with briefs is a richer presentation — a single well-chosen 3-degree transit with a meaningful brief is worth more than three wide-orb transits with "applying" badges that read as urgent.

6. **Key for `transits.map`.** The `<AspectRow>` should use `key={`${a.transitPlanet}-${a.natalPlanet}-${a.type}`}` rather than the array index `i`, consistent with React best practice and the pattern used in `TransitReadingPage`.

7. **Unknown birth time state.** When `chartData.unknownTime === true`, `a.natalHouse` is `null` for every aspect (set by `calculateTransitAspects` when `unknownTime` is passed). `computeTransitAspectBrief` handles this via its fallback guard at line 112 of `transitAspectBriefs.ts`. No special handling needed in `TodayPage`. The Sky Highlights block renders normally; briefs will be generic but present.

8. **No-chart state.** The `chartData` null guard at line 165 of `TodayPage.tsx` remains unchanged. When `chartData` is null, the card still renders "Enter birth data to see your transit highlights." The `AspectRow` import does not affect this path.

9. **Brief height / `maxHeight` constraint.** `AspectRow`'s expanded panel uses `maxHeight: '6rem'` (approximately 6 lines at `text-xs`). `computeTransitAspectBrief` enforces a 200-character limit via `truncateToLimit`. At standard `text-xs` line height and a card width of `max-w-2xl`, 200 characters fit comfortably within 6 lines. No change to `AspectRow` is needed. However, if an implementer bypasses the truncation or extends brief length for any reason, the overflow will be silently clipped. The existing `truncateToLimit` call at line 133 of `transitAspectBriefs.ts` is the guardrail — do not remove it.

10. **Visual: three expandable rows inside the Sky Highlights card.** When all three rows are expanded simultaneously, the card height grows to accommodate them. The surrounding card has `p-6` padding and no fixed height — it stretches naturally. This is expected behavior. No CSS changes are needed to handle the expanded state. The card will push down the Transit Energy card below it.

11. **No change to `getTopActiveTransits` or any engine file.** If Option A (orb cap) is chosen, only the call site in `TodayPage.tsx` changes — the `maxOrbDegrees` argument passed to `getTopActiveTransits`. The function signature already accepts this parameter. No engine logic is modified.

12. **Remove now-unused helpers.** After replacing the static row loop, the `getAspectKeyword` function (lines 28–30) and the `ASPECT_KEYWORDS` import (line 13) become unused in `TodayPage.tsx`. Remove them to keep the file clean. Verify no other code in the file calls `getAspectKeyword` before removing.

13. **Test the `TransitAspect.type` field name.** `AspectRow` accepts `aspectType: AspectType`. `TransitAspect` carries this field as `type: AspectType`. The mapping is `aspectType={a.type}` — note the prop rename. This is the only non-obvious field name difference.

## Out of Scope

- No changes to `getTopActiveTransits` function signature or its logic (only the call-site argument changes).
- No changes to `computeTransitAspectBrief`, `transitAspectBriefs.ts`, or the `TRANSIT_PLANET_PHRASES` table. That function is complete and correct as of sprint 0010.
- No changes to `AspectRow`. The component handles all visual states needed here.
- No new GPT call for Sky Highlights. The brief is computed entirely client-side from existing data tables.
- No changes to `calculateTransitAspects` or any calculation engine file.
- No changes to the Moon card, Transit Energy card, Personal Day card, or Morning Synthesis card on `TodayPage`.
- No redesign of the Sky Highlights card border, color scheme, padding, or header. The outer `<div className="border border-mystic-border rounded-xl ...">` wrapper stays unchanged.
- No handling for more or fewer than 3 transit rows. `getTopActiveTransits` already returns at most `maxCount` rows; the map renders whatever is returned.
- No applying/separating calculation changes in `transits.ts`. The `applying` field on `TransitAspect` is computed correctly from planetary motion direction. Taleb's concern is about orb magnitude communicating urgency, not about the applying calculation being wrong for transits.

## Outcome

**Status:** done — commit 47400b3 on branch `sprint-0011-task-0008-feat-today-sky-highlights-expand`

All 13 specs implemented and verified. Option A (orb cap to 5°) was chosen per recommendation. All unused imports (`ASPECT_KEYWORDS`, `PLANET_GLYPHS`, `PlanetName`, `getAspectKeyword`) removed. `computeTransitAspectBrief` wired as the `brief` prop. Stable key `${a.transitPlanet}-${a.natalPlanet}-${a.type}` used. TypeScript clean. Spec reviewer: all 13 items ✅. Code quality reviewer: APPROVED (no blocking issues).

Open questions resolved: Option A (5°) chosen; collapsed-by-default kept; `ASPECT_KEYWORDS` confirmed unused in other sections before removal.

## Open Questions

1. **Option A vs Option B for the orb cutoff.** The proposal recommends Option A (cap to 5 degrees). If the product owner wants to ensure Sky Highlights always shows 3 rows even on quiet transit days, Option B (keep 8 degrees, improve orb readability) is the fallback. This should be decided before implementation begins.

2. **What orb value to use in Option A.** The proposal suggests 5 degrees as the cap. Astrologically, 4–5 degrees for daily transits is reasonable for personal planets; slow planets (Saturn, Uranus) can be meaningful at slightly wider orbs. A fixed cap of 5 degrees is a pragmatic choice that does not require per-planet logic. An alternative is 4 degrees, which is tighter and more defensible as "today-relevant" but may produce 0 or 1 results more frequently on days with no active personal-planet transits.

3. **Should the expanded brief be visible by default for the tightest transit?** Currently `AspectRow` starts collapsed. The tightest transit (first in the sorted list) is always the most immediately relevant. Auto-expanding the first row on page load would give users immediate interpretive context without requiring a tap — but this diverges from the `AspectRow` default and may feel visually heavy if the user is just glancing at the page. Recommendation: keep collapsed-by-default for now; auto-expand is a future refinement.

4. **`ASPECT_KEYWORDS` usage elsewhere.** Before removing the `ASPECT_KEYWORDS` import, confirm it is not used by any other section of `TodayPage.tsx`. A search for `getAspectKeyword` and `ASPECT_KEYWORDS` in the file confirms they are currently only in the Sky Highlights render loop, but this should be verified at implementation time.
