**Type:** Feature
**Originated by:** Jobs, Carmack, Miyazaki
**User guidance:** (none — sprint vision overrides)

## Problem / Opportunity

`TransitAspectsToComposite` in `src/components/results/SynastryTransitPage.tsx` (lines 33–66) renders composite transit aspect rows as bare static divs — the exact state that `TransitReadingPage`'s transit rows were in before sprint 0010. Each row shows three glyphs, the aspect label ("Transit Saturn square Composite Moon"), an orb number, and an applying/separating badge. No expand toggle. No brief. No sentence.

This is the most visible silence on the Couple Transit page. The GPT paragraph above addresses the relationship as a unit; the aspect rows beneath it give no individual interpretation at all. A user checking how this week's sky affects their relationship sees orb numbers and labels that require outside astrological knowledge to interpret.

The `AspectRow` component at `src/components/reading/AspectRow.tsx` was extracted precisely to be the shared abstraction for every aspect row in the app. As of sprint 0010 it is used in `TransitReadingPage.tsx` and `AdvanceTab.tsx`. `SynastryTransitPage.tsx` does not import it. The pattern, the component, and the brief generation function all exist. They are not wired here.

The secondary problem is voice. `computeTransitAspectBrief` in `src/data/interpretations/transitAspectBriefs.ts` produces sentences addressed to a single person: "Saturn pressing on your House of Communication." Composite planets belong to the relationship, not to either person. Passing the composite `natalPlanet` and `house: 0` through `computeTransitAspectBrief` will produce a grammatically correct but ontologically misframed brief when a house is available — and a generic `ASPECT_BRIEFS` fallback when it is not.

The house-unavailability is structural: `calculateCompositeChart` in `src/engine/synastry.ts` (line 206) sets every composite planet to `house: 0` with the comment "Will be calculated from composite angles if available." That follow-through was deferred. Computing composite house cusps from midpoint angles requires a Placidus derivation step that is an engine change; the sprint vision explicitly prohibits engine changes. As a result, `computeTransitAspectBrief`'s guard at line 112 of `transitAspectBriefs.ts` (`if (!natalHouse || natalHouse < 1 || natalHouse > 12 ...)`) will always trigger, and every composite transit brief will fall through to the generic `getAspectPerfectionBrief` / `ASPECT_BRIEFS` fallback.

This is acceptable for the sprint. A generic brief with correct relational subject framing is strictly better than no brief.

## Vision

When a user opens the Couple Transit reading and scrolls to the "Transit Aspects to Composite" section, each row should look and behave exactly like a transit aspect row on the individual reading page: glyphs, label, orb, applying/separating badge, and a chevron. Tapping any row reveals a two-sentence interpretation that speaks about the relationship as a unit — "the relationship's" rather than "your." The expand/collapse animation, the nature-colored border, and the indented brief panel match the established `AspectRow` pattern throughout the app.

Because composite planets have `house: 0` in this sprint, the brief will be the generic fallback — not house-aware — but it will be voiced correctly for a composite chart: "the relationship" as subject, not "you." The user receives something specific and accurate before GPT text loads, and the expanded rows communicate more than bare symbols.

The `house: 0` limitation is documented as a known gap, not masked. When composite house calculation is eventually implemented, the briefs will automatically become house-specific with no changes to this component — the fallback chain in `computeTransitAspectBrief` already upgrades when `natalHouse` is valid.

## Specifications

1. **Replace the static loop.** In `TransitAspectsToComposite` (lines 43–60 of `SynastryTransitPage.tsx`), replace the `<div key={i} className="flex items-center ...">` render loop with a loop over `<AspectRow>` components. Import `AspectRow` from `../../components/reading/AspectRow`.

2. **Prop mapping.** `TransitAspect` fields map to `AspectRow` props as follows:
   - `a.transitPlanet` → `transitPlanet`
   - `a.natalPlanet` → `natalPlanet`
   - `a.type` → `aspectType`
   - `a.nature` → `nature`
   - `a.symbol` → `symbol`
   - `a.orb` → `orb`
   - `a.applying` → `applying`
   - computed brief string → `brief`

   The label inside `AspectRow` currently reads "Transit {transitPlanet} {aspectType} Natal {natalPlanet}". For composite rows this should read "Transit {transitPlanet} {aspectType} Composite {natalPlanet}". This requires either a `labelPrefix` prop on `AspectRow` or a local wrapper label. The simplest approach is an optional `natalLabel` prop (defaulting to `"Natal"`) passed as `natalLabel="Composite"` from `TransitAspectsToComposite`.

3. **Brief computation.** Call `computeTransitAspectBrief` from `src/data/interpretations/transitAspectBriefs.ts` to generate the `brief` prop for each row:
   ```ts
   computeTransitAspectBrief(a.transitPlanet, a.type, a.natalPlanet, a.natalHouse ?? 0, a.nature, a.applying)
   ```
   Because composite planets have `house: 0`, `a.natalHouse` will be `0` or absent, and the function will fall through to the generic `getAspectPerfectionBrief(aspectType, natalPlanet)` fallback. This is expected and acceptable behavior.

4. **Relational voice adapter.** The brief returned by `computeTransitAspectBrief` uses "your" as subject. Since `natalHouse` is always `0` for composite planets, the fallback sentence from `ASPECT_BRIEFS` / `getAspectPerfectionBrief` is already subject-neutral (it describes planet archetypes and aspect types without a personal pronoun). No text substitution is required at this time. When composite house calculation is implemented in a future sprint, the subject will need to be adapted — document this in an inline comment at the call site.

   If the fallback sentence does contain "your" or second-person language (e.g., the `fallbackSentence` helper in `transitAspectBriefs.ts` says "A harmonious connection supporting ease and flow" — which is already neutral), no substitution is needed. Verify that `getAspectPerfectionBrief` returns neutral phrasing before shipping; if it contains "your," prepend a thin subject-swap at the call site: `brief.replace(/\byour\b/gi, "the relationship's")`.

5. **Known gap documentation.** Add an inline comment in `calculateCompositeChart` in `src/engine/synastry.ts` at the `house: 0` line:
   ```ts
   house: 0, // Deferred: composite house cusps require Placidus derivation from composite Ascendant.
              // Until computed, computeTransitAspectBrief falls to generic ASPECT_BRIEFS fallback.
              // See feat-couple-transit-aspect-rows proposal — known gap, sprint 0011.
   ```
   This makes the deferral visible to future implementers without changing any logic.

6. **Relational voice in supplementary text.** The section subtitle "How current transits affect the relationship as a whole" (line 42 of `SynastryTransitPage.tsx`) should be preserved exactly as written. It already frames the section correctly. No change needed.

7. **Applying/separating badge.** Unlike synastry cross-chart aspects (which are natal-natal and have no meaningful applying state), composite transit aspects are genuine transits — a moving planet aspecting a composite midpoint. The `applying` field from `TransitData.transitAspects` reflects real planetary motion toward or away from the composite point. The badge should be displayed normally; it carries accurate meaning here.

8. **Expand/collapse behavior.** `AspectRow` suppresses the expand chevron and disables the click handler when `brief` is `null` (line 59 of `AspectRow.tsx`: `const hasBrief = brief !== null && brief.trim().length > 0`). Because `computeTransitAspectBrief` never returns `null` — it always returns a non-empty string — every row will have an expand toggle. This is correct behavior.

9. **Nature color.** The `natureColor` helper currently defined locally in `TransitAspectsToComposite` (line 36–38) is no longer needed once `AspectRow` handles coloring internally. Remove the local helper.

10. **Brief length guard.** `computeTransitAspectBrief` applies a 200-character truncation via `truncateToLimit`. The `AspectRow` brief panel uses `maxHeight: '6rem'`, which accommodates approximately 6 lines of `text-xs` text — sufficient for 200 characters at normal line width. No additional truncation is required.

11. **Empty state.** The guard `if (transitData.transitAspects.length === 0) return null` at line 34 of the current implementation should be preserved unchanged.

12. **`space-y-2` wrapper.** The wrapping `<div className="space-y-2">` around the row loop should be removed or changed to `<div>` with no spacing, because `AspectRow` manages its own bottom border (`border-b border-mystic-gold/5 last:border-0`). Using `space-y-2` alongside `AspectRow`'s borders will produce uneven spacing between rows. Replace with `<div>` (no spacing class).

13. **`AspectRow` label prop.** The current `AspectRow` hardcodes "Natal" in the label: `Transit {transitPlanet} {aspectType} Natal {natalPlanet}` (line 86 of `AspectRow.tsx`). This proposal requires "Composite" instead. Add an optional `natalLabel?: string` prop to `AspectRow` defaulting to `"Natal"`. Pass `natalLabel="Composite"` from `TransitAspectsToComposite`. This is a backward-compatible change; all existing `AspectRow` usages continue to display "Natal" without modification.

14. **No other files changed.** Do not touch `synastry.ts` calculation logic, `transitAspectBriefs.ts`, `transitEvents.ts`, or any existing interpretation database. The only engine-adjacent change is the inline comment addition at `house: 0` in `calculateCompositeChart` — a comment, not logic.

## Out of Scope

- **Composite house calculation.** Computing Placidus house cusps from the composite Ascendant and assigning real house numbers to composite planets is deferred. It requires engine changes (`synastry.ts`) that the sprint vision explicitly prohibits.
- **House-aware composite briefs.** Until composite planets have valid house numbers, briefs will always be the generic `ASPECT_BRIEFS` fallback. House-specific relational briefs ("the relationship's House of Partnership is being activated") are deferred to the sprint in which composite house calculation is implemented.
- **Synastry cross-chart aspect rows.** `SynastryAspectsSection` in `SynastryPage.tsx` is a separate proposal (`feat-synastry-aspect-rows`). It requires a new relational brief database and different handling of the applying/separating badge.
- **`buildCoupleTransitPrompt` element profiles.** Adding `analyzeElements` output to the GPT prompt in `synastry.ts` is a separate, narrowly scoped change addressed in the GPT prompt proposal.
- **`Section` component deduplication.** `SynastryTransitPage.tsx` and `SynastryPage.tsx` both define a local `Section` accordion component with identical code. Extracting a shared `CollapsibleSection` is legitimate refactoring but is not part of this proposal.
- **Orb filtering.** The composite transit aspects displayed are whatever `synastryTransitData.transitAspects` contains — no orb cap is added or removed by this proposal.
- **Compatibility score accuracy.** The `elementCompat` sort bug in `synastry.ts:261` is documented in Taleb's voice analysis. It is not addressed here.

## Open Questions

1. **`getAspectPerfectionBrief` subject language.** Before shipping, verify that `getAspectPerfectionBrief` in `transitEvents.ts` and the `fallbackSentence` helper in `transitAspectBriefs.ts` return subject-neutral text (no "your") when used for composite transit rows. If any fallback contains second-person language, is a blanket `.replace(/\byour\b/gi, "the relationship's")` at the call site the right fix, or should the brief generator accept an explicit `subject` parameter?

2. **`natalLabel` prop scope.** Adding `natalLabel?: string` to `AspectRow` is a small, backward-compatible change. Should this be "Composite" (descriptive of the chart type) or something more human-readable like "the relationship's" to improve the row label text quality?

3. **Future house-aware upgrade path.** When composite house calculation is eventually implemented in `synastry.ts`, the brief will automatically improve via the existing `computeTransitAspectBrief` fallback chain — no changes to `SynastryTransitPage.tsx` or `AspectRow.tsx` will be needed. Confirm this assumption holds by tracing the fallback path: `computeTransitAspectBrief` with a valid `natalHouse` (1–12) will produce a house-named brief using `houseTheme.name`. At that point, the subject will still read "your [house name]" — the composite-voice issue resurfaces. Consider whether `computeTransitAspectBrief` should accept an optional `subject` string argument now, defaulting to `"your"`, so the composite call site can pass `"the relationship's"` without a future code change.
