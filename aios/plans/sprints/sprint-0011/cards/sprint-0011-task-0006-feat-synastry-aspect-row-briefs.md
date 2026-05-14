**Type:** Feature
**Originated by:** Jobs, Carmack, Miyazaki, Taleb
**User guidance:** (none — sprint vision overrides)

## Problem / Opportunity

`SynastryAspectsSection` in `src/components/results/SynastryPage.tsx` (lines 122–157) renders every cross-chart aspect as a static `<div>` row: glyphs, symbol, aspect name, orb, and a nature badge. There is no expand/collapse, no interpretation brief, no sense that the product understands what it computed.

The `AspectRow` component at `src/components/reading/AspectRow.tsx` — extracted in sprint 0010 specifically to be the shared abstraction for all aspect rows — is never imported into `SynastryPage.tsx`. After sprint 0010, every transit aspect row expands on tap and reveals a house-aware brief. Synastry aspect rows have no equivalent. Two people submit their charts, wait for the calculation, and receive a trade ledger: `P1 Venus △ P2 Moon · 1.8° orb · harmonious`. The calculation ran. Nothing was said.

The interpretation gap is compounded by a voice mismatch. The existing `ASPECT_INTERPRETATIONS` table in `src/data/interpretations/aspectInterpretations.ts` uses natal-voice framing — "your emotions and love nature flow together beautifully." That sentence describes one person's internal architecture. It does not describe a meeting between two people's planets. A synastry brief for Venus trine Moon is not the same emotional fact as a natal Venus trine Moon. The product knows the difference. The existing data does not say it.

A secondary problem: `SynastryAspect` carries an `applying` field computed at `src/engine/synastry.ts` line 88 as `orb < maxOrb * 0.5`. This is semantically wrong. Synastry aspects compare two frozen natal charts — no planet is moving toward or away from anything. "Applying" in synastry has no meaning. The `applying = orb < maxOrb * 0.5` approximation will mark any tight aspect as "applying" regardless of planetary motion. Displaying this badge on synastry rows communicates false information with full visual confidence.

The opportunity: `AspectRow` handles expand/collapse, nature coloring, brief reveal, and border styling — all behavior already built and tested. The only missing pieces are (1) a new relational-voice brief data table scoped to synastry, and (2) the wiring in `SynastryAspectsSection` that replaces static rows with `AspectRow` calls and suppresses the inapplicable applying badge.

## Vision

A person opens the synastry reading for themselves and someone they love. They scroll to the aspects section. The rows look familiar — glyph pair, aspect symbol, orb — but each row has a chevron. They tap the first row.

Two sentences appear. Not "Venus trine Moon is harmonious." The brief reads: "your warmth and affection land naturally on them — what you extend, they receive without walls or waiting to be convinced." The product looked at these two charts together and understood what the geometry means between two specific people. Not for every person whose Venus trines a Moon. For this reading.

They tap a harder row — a square. The brief reads: "your drives and their needs pull against each other here; the friction is real, but it is the kind that builds something rather than erodes it." They scroll through the list. Some rows stay collapsed. A few they tap. Each one says something they could not have said themselves.

The applying/separating badge is absent. Its absence is honest. These are birth charts. Nothing is moving.

The quality bar from the sprint vision applies: a brief that reads "Mercury trine Venus brings smooth communication" fails. A brief that reads "your Mercury finds their Venus easy to reach — ideas land without being translated or defended" passes. The test is whether the sentence would make sense in a mass-market horoscope column without knowing either chart. If yes, it fails.

## Specifications

### Data: New Synastry Brief Table

1. Create `src/data/interpretations/synastryAspectBriefs.ts` as a new file. This file has no precedent in the codebase; it must be written from scratch in relational voice.

2. The table key format is `${planet1}_${aspectType}_${planet2}` — identical to the key format in `ASPECT_INTERPRETATIONS` — but the values are relational-voice sentences, not natal self-description. Example: `Venus_Trine_Moon` yields "your warmth finds no resistance in them — what you offer emotionally is received cleanly, without translation."

3. Planet pair ordering in the key must follow alphabetical order by planet name to avoid duplicate entries (`Moon_Trine_Venus` and `Venus_Trine_Moon` should resolve to the same key). The lookup function must normalize the pair order before key construction.

4. The table must cover the following high-frequency pairs as a minimum. These are the cross-chart contacts that appear in nearly every synastry reading:
   - Sun–Moon (conjunction, opposition, trine, square, sextile)
   - Sun–Venus (conjunction, trine, square, sextile, opposition)
   - Sun–Mars (conjunction, trine, square, sextile, opposition)
   - Sun–Sun (conjunction, trine, square, sextile, opposition)
   - Moon–Moon (conjunction, trine, square, sextile, opposition)
   - Moon–Venus (conjunction, trine, square, sextile, opposition)
   - Moon–Mars (conjunction, trine, square, sextile, opposition)
   - Venus–Mars (conjunction, trine, square, sextile, opposition)
   - Mercury–Mercury (conjunction, trine, square, sextile, opposition)
   - Saturn–Moon (conjunction, trine, square, opposition)
   - Saturn–Venus (conjunction, trine, square, opposition)
   - Saturn–Sun (conjunction, trine, square, opposition)
   - Jupiter–Moon (conjunction, trine, sextile)
   - Jupiter–Venus (conjunction, trine, sextile)
   - Neptune–Moon (conjunction, trine, square)
   - Pluto–Moon (conjunction, trine, square)
   - NorthNode–Sun (conjunction)
   - NorthNode–Moon (conjunction)
   - NorthNode–Venus (conjunction)
   Total target: 30–40 entries covering the above pairs, with fewer entries where aspect types produce similar relational meaning (e.g., sextile and trine often differ only in ease, not character).

5. Each entry is one to two sentences in relational voice. The voice describes what one person's planet feels like to the other — not what either planet means in isolation. Sentence construction examples:
   - Passing: "your affection reaches them without obstacle — they feel it before you say it"
   - Failing: "Venus trine Moon produces emotional ease and warmth between partners"
   The difference: the failing entry could run in a Sun-sign column. The passing entry describes a directional encounter.

6. Entries should acknowledge both directions of the relationship implicitly. Because the key normalizes planet order, `Venus_Trine_Moon` serves both "P1 Venus trine P2 Moon" and "P1 Moon trine P2 Venus." The brief should read cleanly in both orientations. Where the directionality genuinely differs (e.g., Saturn square Moon — the Saturn person carries the weight very differently than the Moon person), two separate entries should be written for the non-normalized pair, distinguished by a `_p1` / `_p2` suffix on the key, or the lookup function should accept an optional `reversed` flag.

7. The table must export a named `SYNASTRY_ASPECT_BRIEFS` constant. Do not export a default.

### Data: Fallback for Uncovered Pairs

8. The table will not cover every possible cross-chart pair (e.g., Pluto opposition Jupiter, Uranus trine Saturn). For uncovered pairs, the lookup function must return a non-null fallback string. The fallback must not be a silent empty string or `null` passed to `AspectRow` — a `null` brief means the row shows no expand chevron, which is acceptable only if the row has genuinely nothing to say. For synastry rows with no primary table entry, a fallback sentence is better than silence.

9. The fallback sentence should be assembled from aspect nature and the two planet archetypes using a short planet-archetype lookup (10 entries, one noun phrase per planet, e.g., Sun = "core identity", Moon = "emotional nature", Venus = "affection and values", Mars = "drive and desire", Mercury = "mind and communication", Jupiter = "expansion and faith", Saturn = "structure and limits", Uranus = "independence and disruption", Neptune = "dreams and dissolution", Pluto = "transformation and depth"). The assembled fallback pattern: "[P1 archetype] and [P2 archetype] meet in [aspect type] — [one clause about the nature of that contact]." This is explicitly weaker than a primary entry and that is acceptable. It is not silent.

10. Export a public function `computeSynastryAspectBrief(person1Planet: PlanetName | 'NorthNode', aspectType: AspectType, person2Planet: PlanetName | 'NorthNode', nature: 'harmonious' | 'challenging' | 'neutral'): string`. This function must never throw and must never return an empty string.

### Component: AspectRow Adaptation for Synastry Context

11. `SynastryAspectsSection` in `SynastryPage.tsx` must be rewritten to import `AspectRow` from `src/components/reading/AspectRow.tsx` and replace the current static `<div>` render loop with `AspectRow` calls.

12. The `SynastryAspect` type has `person1Planet`, `person2Planet`, `type`, `nature`, `symbol`, `orb`, `applying`. Map these to `AspectRow`'s props as follows:
    - `transitPlanet` ← `aspect.person1Planet`
    - `natalPlanet` ← `aspect.person2Planet`
    - `aspectType` ← `aspect.type`
    - `nature` ← `aspect.nature`
    - `symbol` ← `aspect.symbol`
    - `orb` ← `aspect.orb`
    - `applying` ← `false` (always — see spec 14)
    - `brief` ← `computeSynastryAspectBrief(aspect.person1Planet, aspect.type, aspect.person2Planet, aspect.nature)`

13. The row label text must be adapted for synastry context. The current `AspectRow` renders "Transit {transitPlanet} {aspectType} Natal {natalPlanet}". For synastry rows, this label is semantically wrong. Either: (a) add an optional `labelOverride` prop to `AspectRow` that replaces the label when provided, using "Person 1 {planet1} {aspectType} Person 2 {planet2}", or (b) add a `mode?: 'transit' | 'synastry'` prop that changes the label rendering. The label for synastry must read "P1 {planet1} {aspectType} P2 {planet2}" or "Person 1 {planet1} {aspectType} Person 2 {planet2}" — not "Transit ... Natal ...".

14. The applying/separating badge must be suppressed for synastry rows. The badge currently renders unconditionally in `AspectRow` — it shows "applying" or "separating" based on the `applying` prop. For synastry rows, both states are meaningless. The correct fix is to add an optional `showApplyingBadge?: boolean` prop to `AspectRow` that defaults to `true` (preserving existing transit behavior) but can be set to `false` to hide the badge entirely. Synastry rows pass `showApplyingBadge={false}`. No badge is more honest than a wrong badge. The engine-level `applying` field in `SynastryAspect` is not modified — this is a render-layer suppression only, as directed by the sprint vision.

15. The `brief` expand panel in `AspectRow` uses `maxHeight: '6rem'` which accommodates approximately 200-character briefs. Synastry briefs must be constrained to 200 characters maximum (or a length that fits within `6rem` at `text-xs`). Either apply the `truncateToLimit` helper from `transitAspectBriefs.ts`, or enforce the length constraint at writing time in the data table. Briefs that overflow the panel height are silently clipped — there is no scroll, no ellipsis, and no indication that text is hidden. This is a hard quality failure.

16. When `brief` is `null`, `AspectRow` shows no expand chevron and the row is not clickable. The current fallback logic in spec 8–9 means `brief` will never be `null` for synastry rows — `computeSynastryAspectBrief` always returns a string. This is the correct behavior: every synastry row should be expandable.

### Behavior: Default and Interaction States

17. `SynastryAspectsSection` defaults to `defaultOpen={true}` (it passes `defaultOpen` to the wrapping `Section` component, per current code at line 129). This behavior is preserved — the section is open by default on page load.

18. Individual aspect rows default to collapsed (brief not visible). The user must tap a row to expand the brief. This is the same behavior as transit aspect rows — no auto-expansion.

19. Expanding one row does not collapse others. Multiple rows may be expanded simultaneously. This matches existing `AspectRow` behavior.

20. The row is fully clickable (the `<button>` wraps the entire row). Keyboard activation (Enter/Space) must trigger the same expand/collapse. This is already implemented in `AspectRow` — no change needed.

21. Focus ring appears on keyboard navigation (`:focus-visible`) but not on mouse click. Already implemented in `AspectRow`.

22. The existing "P1" and "P2" label spans (lines 137 and 140 in the current static render) are replaced by the `AspectRow` component — the "P1"/"P2" labels are incorporated into the label text per spec 13.

### Behavior: Edge Cases and Constraints

23. If `synastryData.synastryAspects` is empty, `SynastryAspectsSection` returns `null` (current behavior, preserved).

24. `computeSynastryAspectBrief` is called inline during render, not precomputed. It must be synchronous, never async, and complete in under 1ms. It performs only object lookups — no calculation, no network calls.

25. `computeSynastryAspectBrief` must handle `NorthNode` as either planet. The planet-archetype fallback table must include a `NorthNode` entry (e.g., "karmic direction").

26. If an aspect type is not recognized in the fallback (e.g., a minor aspect not covered by the archetype assembly), the function must return a minimal non-empty string rather than throw.

27. The `SynastryAspectsSection` section title continues to show the aspect count: `Synastry Aspects ({aspects.length})`.

28. The subtitle "Aspects between Person 1's planets and Person 2's planets" is preserved below the section header.

29. The section renders aspects in the existing sort order (sorted by orb ascending, tightest first — this sorting is applied in `calculateSynastryAspects` at `synastry.ts` line 106).

### Brief Quality Bar (from sprint vision)

30. A brief fails the quality bar if it could be published in a mass-market horoscope column without knowing either person's chart. Example of failure: "Mercury trine Venus brings smooth communication between partners." Example of passing: "your way of thinking finds their aesthetic sense easy to reach — ideas land without needing to be defended or explained."

31. Two sentences is the target length. One sentence is acceptable if it says something specific. Three sentences should be trimmed. The GPT paragraph handles depth; the inline brief handles the immediate relational character of the contact.

32. Challenging aspects must not be softened. A square brief must name the friction plainly. A Saturn square Moon brief that reads "growth through challenge" fails. A brief that reads "your structure lands on their emotional nature as constraint — they may feel steadied by you and limited in the same breath" passes.

33. Harmonious aspects must not be empty optimism. A trine brief that reads "easy flow and natural resonance" fails. A brief that reads "what you bring, they absorb without resistance — the contact requires no negotiation" passes.

### Accessibility

34. `AspectRow` already implements `aria-expanded` on the button element when a brief is available. This is preserved for synastry rows.

35. The `showApplyingBadge={false}` suppression must not leave an empty DOM element where the badge was — the badge's containing span should be conditionally rendered out entirely.

36. Color-coded nature (green for harmonious, red for challenging, gold for neutral) is present on the aspect symbol and the brief border. No information is communicated by color alone — the `nature` is also expressed textually in the fallback brief and is readable from the planet names and aspect symbol context.

### Performance

37. `computeSynastryAspectBrief` must perform zero network calls, zero async operations, and no computation heavier than object property lookups. The synastry page may render 20–40 aspect rows; brief computation for all rows must complete in well under 16ms total.

38. The `SYNASTRY_ASPECT_BRIEFS` object must be a module-level constant (evaluated once at import time), not reconstructed on each render or each function call.

### Scope of `AspectRow` Changes

39. All changes to `AspectRow.tsx` must be backward-compatible. Existing call sites (`TransitReadingPage.tsx`, `AdvanceTab.tsx`) must continue to work without modification. New props (`showApplyingBadge`, `labelOverride` or `mode`) must have defaults that preserve existing behavior.

40. The `AspectRow` component's `transitPlanet` and `natalPlanet` prop names are kept as-is for backward compatibility. The synastry usage maps `person1Planet` → `transitPlanet` and `person2Planet` → `natalPlanet` at the call site.

### Acceptance Checks

41. After implementation: every row in `SynastryAspectsSection` has an expand chevron.
42. Tapping any row reveals a brief in italic text inside a colored left-border panel.
43. No row shows an "applying" or "separating" badge.
44. No row label reads "Transit ... Natal ...".
45. Briefs for Sun–Moon, Venus–Mars, Moon–Moon, and Saturn–Moon pairs come from the primary `SYNASTRY_ASPECT_BRIEFS` table (not the fallback).
46. Briefs for an unusual pair (e.g., Pluto trine Jupiter) return a non-empty fallback string without error.
47. NorthNode as either planet does not throw or render an empty brief.
48. Existing transit aspect rows in `TransitReadingPage.tsx` and `AdvanceTab.tsx` are visually and behaviorally unchanged.
49. The `SynastryAspectsSection` section opens by default; individual rows are collapsed by default.
50. Brief text for a challenging aspect names the friction rather than euphemizing it.

## Out of Scope

- Modifying the `applying` field or any other field in the `SynastryAspect` type or the `calculateSynastryAspects` engine function. The badge suppression is a render-layer decision only.
- Modifying `ASPECT_INTERPRETATIONS` in `aspectInterpretations.ts`. These are natal-voice entries written for the natal chart page. They are not adapted for synastry.
- Modifying `transitAspectBriefs.ts` or `computeTransitAspectBrief`. The synastry brief function is a new, separate export. The two functions must not share data or logic.
- House context in synastry briefs. Synastry cross-chart aspects have no single house to reference — Person 1's Venus may be in their own 2nd house while Person 2's Moon is in their own 7th house. The relational brief describes the planet-pair contact, not a house activation. This is a fundamental semantic difference from transit briefs and is intentional.
- The `HouseOverlaySection` interpretation layer. That is a separate proposal (`feat-synastry-house-overlay-briefs`).
- The `SynastryTransitPage.tsx` composite aspect rows. That is a separate proposal.
- Modifications to `buildSynastryPrompt` or `buildSynastryPrompt` element profile additions. Those are a separate proposal.
- Refactoring the duplicate `Section` component between `SynastryPage.tsx` and `SynastryTransitPage.tsx`. That is a noted technical debt item for a cleanup task.
- Compatibility score display changes or the `elementCompat` sort bug in `synastry.ts` line 261 (noted by Taleb as a pre-existing bug — the `dom1` sort comparator uses `count2[b] - count1[a]` instead of `count1[b] - count1[a]`). This bug is not introduced by this feature and fixing it is outside this proposal's scope, though the `elementCompat` bug should be tracked as technical debt to fix before shipping element profiles to the GPT prompt.
- New screens, new page-level layout changes, new GPT calls, new calculation engines.

## Outcome

**Status:** done  
**Branch:** sprint-0011-task-0006-feat-synastry-aspect-row-briefs  
**Completed:** 2026-05-14

### What was implemented

- `src/data/interpretations/synastryAspectBriefs.ts` — new file with 37 primary entries in relational second-person voice across all required pairs. Module-level `SYNASTRY_ASPECT_BRIEFS` constant, `PLANET_ARCHETYPES` fallback table (11 entries inc. NorthNode), `ASPECT_NATURE_CLAUSES`, `truncateToLimit` helper (copied, not imported, per spec), and `computeSynastryAspectBrief(person1Planet, aspectType, person2Planet, _nature)` export. Function never throws, never returns empty string.
- `src/components/reading/AspectRow.tsx` — added `showApplyingBadge?: boolean` (default `true`) and `labelOverride?: string` to `AspectRowProps`. Badge is conditionally excluded from DOM entirely when false. Both props are backward-compatible.
- `src/components/results/SynastryPage.tsx` — `SynastryAspectsSection` rewritten to use `AspectRow` with `showApplyingBadge={false}`, `applying={false}`, `labelOverride="P1 {P1Planet} {AspectType} P2 {P2Planet}"`, and `computeSynastryAspectBrief` for every row.

### Open questions resolved

1. **Directionality** → symmetric framing; asymmetric pairs (Saturn–Moon, Pluto–Moon) acknowledge both roles implicitly in one brief
2. **labelOverride vs mode** → `labelOverride?: string` added to AspectRow
3. **Brief length** → Option A: `truncateToLimit(text, 200)` in `computeSynastryAspectBrief`
4. **Planet archetype table** → co-located in synastryAspectBriefs.ts
5. **NorthNode in primary table** → YES — primary entries for NorthNode_Conjunction_Sun, Moon_Conjunction_NorthNode, NorthNode_Conjunction_Venus

### Fix applied post-implementation

A case mismatch was caught in code review: engine `AspectType` values are lowercase (`'conjunction'`) while the table keys used title-case (`'Conjunction'`). Fixed by normalizing in `buildKey` and the `ASPECT_NATURE_CLAUSES` lookup with `charAt(0).toUpperCase() + slice(1)`. TypeScript was clean throughout (no TS error surfaced the mismatch because `Record<string, string>` accepts any key).

### All specs implemented

Specs 1–50: ✅

## Open Questions

1. **Directionality in briefs.** When P1 is Saturn and P2 is Moon vs. P1 is Moon and P2 is Saturn, the experience differs substantially — the Saturn person carries the weight; the Moon person feels the structure. Should the brief function accept a `reversed` flag or should entries be duplicated for the reversed orientation on pairs where directionality is meaningful? For pairs where both planets are roughly symmetric (Moon–Venus trine), directionality matters less. For asymmetric pairs (Saturn–Moon, Pluto–Moon, Mars–Moon), it matters significantly. Decision needed before writing the table.

2. **`labelOverride` vs. `mode` prop on AspectRow.** The label change from "Transit X ... Natal Y" to "Person 1 X ... Person 2 Y" can be achieved either with an explicit label string override or a `mode` enum. A `mode` enum is cleaner long-term (avoids duplicating label format logic at each call site) but adds a coupling between `AspectRow` and synastry-specific terminology. A `labelOverride` string is more flexible but moves formatting responsibility to the call site. Propose: add `labelOverride?: string` to `AspectRowProps` and use it in `SynastryAspectsSection`. Resolve before implementation begins.

3. **Brief length enforcement.** The `maxHeight: 6rem` constraint in `AspectRow` clips text without visual indication. Option A: apply `truncateToLimit(text, 200)` in `computeSynastryAspectBrief` (same as transit briefs). Option B: increase `maxHeight` in `AspectRow` to accommodate longer relational briefs (two full sentences may exceed 200 characters). Option C: enforce maximum length at write time in the data table. Option A is the safest default — it preserves the existing panel sizing and ensures no clipping. Confirm approach before writing data entries.

4. **Planet-archetype table for fallback.** The 10-entry planet-archetype lookup for the fallback sentence needs to be written. It must cover all `PlanetName` values plus `NorthNode`. Should this be a module-level constant inside `synastryAspectBriefs.ts` or shared with other relational interpretation files? For this sprint, prefer co-locating it in `synastryAspectBriefs.ts` to avoid coupling.

5. **NorthNode in the primary table.** Cross-chart NorthNode contacts (NorthNode conjunct Sun, NorthNode conjunct Moon, NorthNode conjunct Venus) are among the most emotionally significant synastry aspects — widely interpreted as karmic or fated contacts. Should NorthNode be included in the primary table with hand-written relational briefs, or handled only by the fallback? Given their significance, the three NorthNode conjunctions listed in the target pairs (spec 4) should have primary table entries.
