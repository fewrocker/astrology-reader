---
**Type:** Feature
**Originated by:** Jobs, Carmack, Miyazaki, Taleb (all four voices)
---

## Problem / Opportunity

Every transit aspect row in `TransitAspectsSection` (`src/components/results/TransitReadingPage.tsx`, lines 63–95) renders a glyph pair, an aspect symbol, planet names, an orb value, and an applying/separating badge — and stops there. The row for `Transit Saturn □ Natal Moon (2.3° orb, challenging, applying)` is identical in information density for every user who has this transit, regardless of whether their Moon is in the 4th house (home, emotional foundation) or the 7th (committed partnerships) or the 10th (career and public role). The natal house — the data point that personalizes the transit from a geometric fact into a life-area statement — is computed and available on `chartData.planets` but is never surfaced in the row render.

The silence is not neutral. A user who opens the transit reading sees seven to twelve rows they cannot interpret without prior astrological knowledge, then scrolls past them to the GPT paragraph — which they use as a decoder ring for the table they just read. The data and the interpretation are two separate documents placed on the same page. A skilled astrologer would never separate them: they would say "Do you see this Saturn square Mercury? That's the one pressing on your 3rd-house communication patterns — let me tell you what that means in practice." The row needs to be able to say that, without a GPT call.

The same rendering failure exists independently in `AdvanceTab.tsx` (lines 193–222). The Advance tab renders an identical inline aspect table from `snapshot.transitAspects`, using exactly the same `div` + glyph + text + badge structure as `TransitAspectsSection` — but it is a separate, copied implementation. When inline briefs are added to one surface, they will not automatically appear on the other. Carmack flagged this explicitly: the two surfaces must converge on a shared `AspectRow` component, or the brief logic will be duplicated and maintained independently, which means they will diverge.

The data to fix this already exists:
- `chartData.planets` carries `.house` and `.sign` for every natal planet (when `chartData.unknownTime` is false)
- `HOUSE_THEMES` in `src/data/interpretations/houseThemes.ts` has a `.brief` and `.name` for every house number 1–12
- `getPlanetInHouseInterpretation` in `src/data/interpretations/index.ts` returns a full `InterpretationEntry` (`.brief` + `.detail`) for every planet-in-house combination via `PLANET_IN_HOUSE` (120 entries)
- `ASPECT_BRIEFS` in `src/data/interpretations/transitEvents.ts` covers every aspect type × natal planet for fallback text
- `getHouseTheme(house)` in `src/data/interpretations/houseThemes.ts` (line 112) takes a house number and returns the theme struct — already exported, never called from `TransitReadingPage`

The gap is purely in render logic. `TransitAspectsSection` receives `transitData` but not `chartData`. The natal planet's house number is three steps up the call stack in `state.chartData.planets` and never flows down. The interpretation functions exist and are correct — they are simply never called from this component.

`TransitAspectsSection` is rendered at `TransitReadingPage.tsx` line 325. `chartData` is destructured from `state` at line 188 of the same component. The prop is available at the call site and not passed.


## Vision

A user opens their weekly transit reading. The GPT paragraph is loading. They look at the transit aspects table while they wait. They see `Saturn □ Moon — applying`. They tap the row.

Below the row, a sentence appears: "Saturn pressing on your 4th-house Moon asks whether the home and family structures you've built are truly yours — something this week may make that question unavoidable."

They close the row. They tap `Mars △ Venus — harmonious, separating`. Another sentence: "Mars flowing through your 7th house energizes your partnership — a good week to take initiative in a close relationship, or to begin a collaboration you've been considering."

By the time they reach the third row, they understand the pattern. They can read the table. When the GPT paragraph finishes loading, it doesn't repeat what the rows said — it synthesizes across all the active transits, weaving them into a single narrative. The rows handled the mechanical layer. The GPT paragraph handles the meaning layer. For the first time, both are doing their actual jobs.

The user goes to the Advance tab and scrubs to a date two weeks out. The aspect table on that date has the same rows — the same glyphs, the same orbs — and the same expand/collapse behavior, because both tables are rendered by the same `AspectRow` component. The briefs are there too, because the component is shared. There is no inconsistency between the reading tab and the advance tab.

The experience is not one of "I tapped a button and a tooltip appeared." It is the experience of a table that has depth — rows that hold more information than they initially show, in exactly the way a printed document holds more when you read the footnotes. The expand/collapse is quiet. The brief is one to two sentences. It does not overwhelm the row. It answers the question the row creates.


## Specifications

### Component Architecture

1. **Extract a shared `AspectRow` component** from the duplicated row render logic in `TransitAspectsSection` (`TransitReadingPage.tsx` lines 72–90) and `AdvanceTab.tsx` (lines 200–218). The new component lives at `src/components/reading/AspectRow.tsx`. Both `TransitAspectsSection` and the `AdvanceTab` aspect list are updated to use it. No regression in existing visual behavior is acceptable — pixel-level parity with the current row layout is required before any new brief functionality is added.

2. **`AspectRow` component props interface** must accept at minimum: `transitPlanet: PlanetName | 'NorthNode'`, `natalPlanet: PlanetName | 'NorthNode'`, `aspectType: AspectType`, `nature: 'harmonious' | 'challenging' | 'neutral'`, `symbol: string`, `orb: number`, `applying: boolean`, and `brief: string | null`. The `brief` prop is the computed interpretation string. The component is responsible only for rendering — it receives the brief as a pre-computed prop, it does not compute it internally. This keeps the component pure and testable.

3. **`TransitAspectsSection` receives `chartData` as a prop.** The call site at `TransitReadingPage.tsx` line 325 must pass `chartData` down. The prop is already destructured from `state` at line 188 in the same component. The section's current signature is `({ transitData }: { transitData: TransitData })` — it must become `({ transitData, chartData }: { transitData: TransitData; chartData: ChartData })`.

4. **`AdvanceTab`'s aspect table receives natal context** via the snapshot data. `AdvanceTab` already has `chartData` as a prop (line 83). The brief computation for each `snapshot.transitAspects[i]` uses the same lookup function as `TransitAspectsSection`. No additional prop threading is required for `AdvanceTab`.

### Brief Computation Function

5. **A `computeTransitAspectBrief` function** must be written and exported from a new file `src/data/interpretations/transitAspectBriefs.ts` (or co-located in `src/data/interpretations/index.ts` if the maintainer prefers). Its signature is:

   ```ts
   function computeTransitAspectBrief(
     transitPlanet: PlanetName | 'NorthNode',
     aspectType: AspectType,
     natalPlanet: PlanetName | 'NorthNode',
     natalHouse: number | null,
     nature: 'harmonious' | 'challenging' | 'neutral'
   ): string
   ```

   The function must never throw and must always return a non-empty string.

6. **Brief composition strategy — primary path (house known):** When `natalHouse` is a number between 1 and 12, the function calls `getPlanetInHouseInterpretation(natalPlanet, natalHouse)` and uses the `.brief` field of the result as the life-area context. It then combines this with the aspect nature and the transit planet's archetype to produce a sentence in the form: `"[Transit planet archetype] [aspect-nature verb phrase] your [house name] — [abbreviated house brief]."` Example: `"Saturn challenging your House of Partnership — this week asks for accountability in your closest one-on-one relationships."` If `getPlanetInHouseInterpretation` returns null for the combination (which should not happen for the 120 covered entries, but could in edge cases), fall through to the fallback path.

7. **Brief composition strategy — fallback path (house unknown or null):** When `natalHouse` is null (i.e., `chartData.unknownTime` is true, or the natal planet was not found in `chartData.planets`), the function falls back to `getAspectPerfectionBrief(aspectType, natalPlanet)` from `src/data/interpretations/transitEvents.ts`. This returns the existing generic text — for example, `"Emotional stress, internal conflict"` for `square × Moon`. The fallback result is returned as-is. The row still shows a brief; it is simply less personalized.

8. **Transit planet archetype map:** The function requires a small lookup table mapping transit planets to their archetypal verb phrases for use in brief construction. This table is defined within `transitAspectBriefs.ts` (not exported — internal to the function). Minimum required entries: Sun (identity and vitality), Moon (emotional currents), Mercury (thought and communication), Venus (attraction and values), Mars (drive and assertion), Jupiter (expansion and opportunity), Saturn (structure and accountability), Uranus (disruption and awakening), Neptune (dissolution and inspiration), Pluto (transformation and power). The verb phrase varies by nature: `"Saturn [nature=harmonious: 'steadying']"`, `"Saturn [nature=challenging: 'pressing on']"`, `"Saturn [nature=neutral: 'transiting through']"`.

9. **`unknownTime` guard is mandatory.** The natal planet house lookup must check `chartData.unknownTime` before attempting to read `.house` from the planet object. When `unknownTime` is true, `natalHouse` must be passed as `null` to `computeTransitAspectBrief`. The guard must be implemented at the `TransitAspectsSection` level (where the lookup is performed), not inside `AspectRow` (which only renders). This mirrors the guard pattern already used in `assembleReading` in `src/data/interpretations/index.ts` line 133: `chart.unknownTime ? null : getPlanetInHouseInterpretation(...)`.

10. **Natal planet lookup from `chartData`:** Within `TransitAspectsSection` (and the equivalent path in `AdvanceTab`), the natal planet's house is resolved by: `chartData.planets.find(p => p.name === a.natalPlanet)?.house ?? null`. If the planet is not found (which should not happen for valid transit data but must be handled defensively), `natalHouse` is null and the fallback path is used.

### Expand/Collapse Interaction

11. **Each `AspectRow` has independent expand/collapse state.** Expanding one row does not collapse others. The default state is collapsed — briefs are hidden on initial render. This matches the existing pattern used in the `Section` component (`TransitReadingPage.tsx` lines 33–47) and avoids overwhelming the user with all briefs visible at once when the section opens.

12. **Expand/collapse trigger:** The entire row is clickable, not just a chevron button. `cursor-pointer` is applied to the row's outer `div`. The clickable area must meet minimum touch target size (44×44px effective area) for mobile. An accessible `aria-expanded` attribute reflects the open/closed state. The `role="button"` or a `<button>` wrapper must be used so keyboard navigation (`Enter`/`Space`) works.

13. **Brief reveal animation:** The brief text appears with a CSS transition — `transition-all duration-200 overflow-hidden`. When collapsed, `max-height: 0` and `opacity: 0`. When expanded, `max-height: 4rem` (or sufficient for two lines) and `opacity: 1`. No JavaScript animation library is required. This matches the pattern in the existing `Section` component.

14. **Visual design of the expanded brief:** The brief text renders below the existing row content, indented to align with the planet names (not the glyphs). Font: `text-mystic-text/80 text-xs leading-relaxed italic`. No border, no background block — the brief is typographically subordinate to the row label. A subtle left border in the aspect nature color (`border-l-2 border-green-400/30` for harmonious, `border-l-2 border-red-400/30` for challenging, `border-l-2 border-mystic-gold/30` for neutral) distinguishes it as interpretive content. The expand indicator (chevron or `▾`) is placed at the right edge of the row, rotates 180° when expanded, matching the `Section` component pattern.

15. **Row layout must not shift on expand.** The existing row elements (glyphs, label, orb, badge) must remain in place when the brief expands below them. The expanded content uses `block` layout below the flex row, not inline. No reflow of sibling rows should occur beyond the natural height expansion.

### Data Integrity and Edge Cases

16. **`NorthNode` as natal planet:** `NorthNode` may appear as a natal planet in transit aspects. `PLANET_IN_HOUSE` does contain `NorthNode_H*` entries (not shown in the sample read but the key format is the same). If `getPlanetInHouseInterpretation('NorthNode', house)` returns null, the fallback path is used. The transit planet archetype map does not need a `NorthNode` entry — `NorthNode` appears only on the natal side in transit aspects.

17. **House 0 must not produce broken output.** If `chartData.unknownTime` is false but a natal planet carries `house: 0` (which can occur if `assignTransitHouses` ran against an empty `chartData.houses` array), the house lookup must treat 0 as null and use the fallback path. A guard `natalHouse > 0 ? natalHouse : null` is sufficient. `getHouseTheme(0)` would return `HOUSE_THEMES[-1]` which is `undefined` — this must not reach the render.

18. **Brief length constraint:** `computeTransitAspectBrief` must return a string no longer than 200 characters for the primary path. The brief must be one to two sentences. If the composition of transit archetype + house name + house brief exceeds this limit, the house brief is truncated at the nearest sentence boundary. The fallback path returns the `getAspectPerfectionBrief` result as-is, which is already short.

19. **Aspect type coverage:** `ASPECT_BRIEFS` in `transitEvents.ts` covers all `AspectType` values including `semi-sextile` and `quincunx`. The fallback path handles all types without special casing. The primary path also works for all types because the aspect-nature language in the transit archetype verb phrases covers `harmonious`, `challenging`, and `neutral`.

20. **Performance:** `computeTransitAspectBrief` is called once per aspect row per render. Transit aspect lists are bounded at roughly 20 rows (the number of meaningful transit aspects to natal planets for any given period). The function is synchronous, performs only dictionary lookups (no string parsing, no regex, no network), and must complete in under 1ms per call. No memoization is required; the per-render cost is negligible.

21. **The `AdvanceTab` aspect table must not recompute briefs on every slider move.** When the slider changes, `snapshot` changes, which means the aspect list changes. Briefs are computed within the render of the `AspectRow` component using the snapshot's aspect data. The `useMemo` in `AdvanceTab` already caches all snapshots; the brief computation is O(aspects per snapshot) and runs at render time, not at pre-calculation time. This is acceptable. Do not move brief computation into `preCalculateSnapshots` — that function runs synchronously on mount and adding string computation to it worsens the existing blocking issue Taleb identified.

### Accessibility and Responsive Behavior

22. **Keyboard accessibility:** Each aspect row that contains an expand/collapse toggle must be focusable and operable via keyboard. The outer `<button>` (or element with `role="button"`) must receive focus via `Tab`. `Enter` and `Space` must trigger the toggle. Focus style must be visible: `focus-visible:ring-1 focus-visible:ring-mystic-gold/50`.

23. **Screen reader announcement:** The `aria-expanded` attribute on the toggle element must be `"true"` when expanded and `"false"` when collapsed. The brief text, when revealed, must be in the DOM (not `display:none`) so screen readers can read it. `max-height: 0` with `overflow: hidden` is preferred over conditional rendering for the animation; however the `aria-expanded` attribute must still be correct regardless of animation approach.

24. **Mobile touch targets:** The row's clickable area must be at least 44px tall on mobile. The current row has `py-2` padding — this produces approximately 36px total height with the text. Adding `py-3` to the outer row `div` (or ensuring `min-h-[44px]`) addresses this requirement. Verify against the existing mobile layout in the `TransitAspectsSection` Section container.

### Acceptance Criteria

25. **Visual regression:** The collapsed state of every aspect row in `TransitAspectsSection` and `AdvanceTab` must be visually identical to the pre-feature state. No element shifts, no size changes, no color changes. Screenshot comparison (manual) against the current state before committing.

26. **Brief quality gate (manual):** Before shipping, verify the following three combinations produce sensible, non-generic output:
    - `Saturn square Natal Moon (house 4)` — must mention home, family, emotional foundation, or "4th house"
    - `Jupiter trine Natal Venus (house 7)` — must mention partnership, relationship, or "7th house"
    - `Mars conjunction Natal Mercury (house 3, unknownTime: true)` — must produce the fallback from `ASPECT_BRIEFS` (sharp/assertive/mental pressure), not a house reference, not an empty string

27. **Fallback coverage:** Every aspect type in `AspectType` (`conjunction`, `sextile`, `square`, `trine`, `opposition`, `semi-sextile`, `quincunx`) must produce a non-empty string from `computeTransitAspectBrief` when called with any valid `natalPlanet` and `natalHouse: null`. The fallback path through `getAspectPerfectionBrief` covers all types; confirm no type returns an empty string.

28. **No GPT calls introduced.** The implementation must not add any call to `getGptInterpretation`, `fetch('/api/gpt/*')`, or any equivalent. The inline brief is entirely static lookup. Verify by checking network requests in browser devtools while expanding aspect rows.

29. **Shared `AspectRow` component is the single source of truth.** After the refactor, search the codebase for the inline aspect row pattern (`flex items-center gap-2 py-2 border-b border-mystic-gold/5`). It must appear only inside `AspectRow.tsx`, not in any other file. Both `TransitReadingPage.tsx` and `AdvanceTab.tsx` must import and use `AspectRow`.


## Out of Scope

- **Synastry aspect rows.** `SynastryAspectsSection` in `SynastryPage.tsx` renders a similar row format. Synastry briefs require relational text (cross-chart voice) that does not exist in `ASPECT_INTERPRETATIONS`, which contains natal self-aspect entries. Adding synastry briefs in this feature would require new interpretation entries, which the sprint prohibits. Synastry briefs are a separate proposal for a future sprint.

- **New static interpretation database entries.** Sprint-0010 prohibits adding new entries to `src/data/interpretations/`. The brief function must work with existing `PLANET_IN_HOUSE`, `HOUSE_THEMES`, and `ASPECT_BRIEFS` data only.

- **GPT-generated row briefs.** The inline brief is a static lookup only. No streaming, no loading state, no GPT call per row.

- **TransitTimeline event cards.** The `TransitTimeline` component's house-aware brief enhancement is a separate proposal (`feat-timeline-house-aware-event-briefs`) with its own dependency chain (`TimelineEvent` interface changes). It is not part of this proposal.

- **The `unknownTime` timezone bug.** Taleb identified a pre-existing bug where journal entries use birth timezone rather than entry-time timezone. This is out of scope and unrelated to transit aspect rows.

- **AdvanceTab power-day banner.** The banner above the aspect list in `AdvanceTab` is a separate proposal. This proposal adds inline briefs to the aspect rows in `AdvanceTab` via the shared `AspectRow` component; the banner detection and render are not included here.

- **Sorting or reordering of the aspect list.** The existing sort order (by orb, ascending) must be preserved. This proposal does not change which aspects are shown or in what order.

- **`preCalculateSnapshots` performance refactor.** Taleb identified the synchronous `useMemo` blocking issue. Moving snapshot pre-calculation to `useTransition` or a Web Worker is a separate task.

- **Visual redesign of the aspect section.** The dark-mystic palette, Cormorant Garamond headings, and gold accents are unchanged. This proposal adds text content and a toggle interaction — no container redesign, no color palette changes.


## Open Questions

1. **Where should `computeTransitAspectBrief` live?** Two options: (a) new file `src/data/interpretations/transitAspectBriefs.ts`, or (b) added to `src/data/interpretations/index.ts` alongside the existing lookup helpers. Option (a) keeps the file focused; option (b) avoids adding a new file. Decide at implementation time based on the maintainer's preference for file granularity.

2. **Transit planet archetype verb phrase table — how many entries are needed for quality output?** The minimum viable set is 10 transit planets × 3 natures (harmonious, challenging, neutral) = 30 entries. A richer version might also branch on `applying` vs. `separating` (applying = building, separating = releasing), doubling the table to 60 entries. The richer version produces more accurate language ("Saturn building its grip on" vs. "Saturn releasing its hold on") but costs more authoring time. Decide based on sprint capacity.

3. **Should the expand/collapse state persist across tab switches?** If the user opens a brief in the Reading tab and then switches to the Advance tab and back, should the Reading tab's row still be expanded? The simplest implementation is ephemeral state (collapses on unmount). Persistent state would require lifting state or using a context. Given that the Advance tab is a separate component mount, this is likely not worth engineering — default to ephemeral.

4. **How should `NorthNode` appear in the transit planet archetype map?** `NorthNode` can appear as a transit planet (when the transiting North Node aspects a natal planet). It does not have a conventional archetypal verb phrase in the same way as classical planets. Options: (a) use a generic "The North Node activating your…" construction, (b) fall through to the fallback path for any row where `transitPlanet === 'NorthNode'`, or (c) add a specific entry. Taleb would favor option (b) — silent fallback is safer than a potentially misleading hardcoded phrase. Decide at implementation time.

5. **Maximum brief length in practice:** The spec sets a 200-character limit. Some `PLANET_IN_HOUSE` `.brief` fields are long (e.g., `Sun_H8`: "Your Sun in the 8th house drives you toward deep transformation and exploration of life's mysteries. You grow through crisis, intimacy, and confronting what lies beneath the surface. Shared resources and power dynamics are key themes." — 234 characters). The brief will need to be trimmed or replaced by a shorter template phrase for overflow cases. Decide whether to use the `.brief` field directly (and trim) or to write shorter archetype phrases for use in the composed brief (and use `.brief` only as a reference source for tone).

6. **Aspect rows with `NorthNode` as natal planet — does `PLANET_IN_HOUSE` cover `NorthNode_H*`?** The file was read through line 80 of 120 total entries — the NorthNode section was not confirmed in the sample. If `NorthNode_H*` entries do not exist, the fallback path must trigger for any row where `natalPlanet === 'NorthNode'`. Verify coverage at implementation time by reading `planetInHouse.ts` in full.
