**Type:** Code Enhancement
**Originated by:** Jobs, Carmack
**User guidance:** (none — sprint vision overrides)
**Status:** done

## Outcome

Implemented in branch `sprint-0011-task-0003-code-gpt-prompt-element-profiles` (commit 79a2a8a). Changes across 2 files, 29 insertions:

- `src/engine/synastry.ts`: Added `analyzeElements` import. In `buildSynastryPrompt`, added `analyzeElements` calls for both charts and injected `## Person 1 Element Profile` / `## Person 2 Element Profile` blocks after each natal positions section. Updated priority instruction to require life-area naming for house contacts. Extended house-naming instruction to require full life-area names (not just house numbers). In `buildCoupleTransitPrompt`, added element analysis calls on full planet lists (not the inner-planet subset), injected element profile blocks after each person's summary, added priority instruction leading with the tightest composite transit, and extended instructions to require naming the relationship dimension activated by each transit.
- `src/engine/solarReturn.ts`: Added `analyzeElements` import and injected a `## Natal Element Profile` block between the natal chart section and the SR chart section, matching the `buildTransitPrompt` reference pattern exactly.

TypeScript check (`npx tsc --noEmit`) passed with zero errors.

## Problem / Opportunity

Three GPT prompt builders do not include natal element profiles, while `buildTransitPrompt` in `src/engine/transits.ts` does (added in sprint 0010). The gap is asymmetric: any reading built on `buildTransitPrompt` benefits from calibrated element framing; readings built on the other three functions do not.

**`buildSynastryPrompt` in `src/engine/synastry.ts` (lines 444–539)**
The function lists every planet position for both charts, including sign, house, and degree. It does not call `analyzeElements` for either chart. GPT receives raw planet positions but no statement of each person's dominant element. A Fire-dominant chart meeting an Earth-dominant chart produces a specific dynamic that every competent astrologer leads with; the prompt leaves that inference entirely to GPT, which will do it inconsistently. The `buildTransitPrompt` reference implementation shows exactly how this should look: `analyzeElements(natalChart.planets)` called once, then `Dominant element: ${elementAnalysis.dominant} — ${elementAnalysis.interpretation.dominant}` prepended to the prompt before the instructions section. `buildSynastryPrompt` takes both charts as arguments but calls `analyzeElements` for neither.

The function also has no instruction to name life areas alongside house numbers when interpreting cross-chart aspects in the house overlays section. The current house-naming instruction at lines 527–529 says "name the house that receives each planet placement and state what it governs" but does not say "name the life area (not just the house number)" for each cross-chart contact. The priority instruction (lines 511–513) leads with the tightest synastry aspect but does not ask GPT to anchor that aspect in a named life area when house data is available.

**`buildCoupleTransitPrompt` in `src/engine/synastry.ts` (lines 543–615)**
The function provides a brief chart summary for both persons (inner planets only), key synastry aspects, composite chart positions, and current transit aspects to composite. It calls no element analysis for either chart. It has no priority instruction naming the tightest applying transit aspect and no instruction to anchor transit interpretation in named life areas. The instructions section (lines 607–613) says "be specific about placements" but gives GPT no signal about the elemental register of either person.

**`buildSolarReturnPrompt` in `src/engine/solarReturn.ts` (lines 56–126)**
The function includes the full natal chart, the SR chart, and SR aspects. It does not call `analyzeElements` for the natal chart. `buildTransitPrompt` in `transits.ts` already imports `analyzeElements` from `src/data/interpretations/index.ts` (line 8 of `transits.ts`) and calls it at line 361. `solarReturn.ts` has no such import. The SR prompt goes directly from natal positions to the SR chart section with no element calibration for GPT.

`analyzeElements` is exported from `src/data/interpretations/index.ts` (lines 52–69). It takes `PlanetPosition[]` and returns an `ElementBalance` with `dominant`, `lacking`, and `interpretation.dominant`. It is already available; it simply needs to be called.

---

## Desired State

**`buildSynastryPrompt`**

After the Person 1 natal positions block and after the Person 2 natal positions block, each person gets an element profile section identical in structure to what `buildTransitPrompt` emits:

```
## Person 1 Element Profile
Dominant element: Fire — [interpretation.dominant text from analyzeElements]

## Person 2 Element Profile
Dominant element: Earth — [interpretation.dominant text from analyzeElements]
```

Both calls are made at the top of the function body or immediately before their respective sections. `analyzeElements` is imported from `'../data/interpretations/index'` — the same import path used in `transits.ts`.

The priority instruction is amended to require naming the life area when house data is available for either person. The updated instruction reads: "Priority: Lead with the single most significant contact in this synastry — the tightest orb aspect that involves personal planets. State what this contact means for the relationship and, where house data is available, name the life area it activates (e.g., 'Person 1's Venus in their 7th house — the partnership zone') before expanding to the broader picture."

The house-naming instruction at lines 527–529 is extended to make the life-area naming explicit: "Where house data is available for either person, name the house that receives each planet placement and state what life area it governs for that person — not just the house number, but what the house means (e.g., 'Person 1's 5th house, the zone of creative expression and romance')."

**`buildCoupleTransitPrompt`**

After the Person 1 summary block and after the Person 2 summary block, the same element profile lines are added. Because this function uses only inner planets for the chart summary, `analyzeElements` should be called on the full planet list (i.e., `chart1.planets` and `chart2.planets`) to produce an accurate dominant element — not on the filtered inner-planet subset.

A priority instruction is added immediately before the instructions section, leading with the tightest transit aspect to the composite by orb:

```
Priority: Lead with the single most impactful transit aspect to the composite chart — the tightest-orb aspect in transitData.transitAspects. State what this transit means for the relationship during this period before covering the broader picture.
```

The instructions section is extended with a life-area naming requirement: "For each transit aspect to the composite chart, name what dimension of the relationship is being activated (romance, communication, shared resources, public identity, etc.) rather than stating only the house number."

**`buildSolarReturnPrompt`**

`analyzeElements` is imported from `'../data/interpretations/index'` at the top of `solarReturn.ts`. Inside `buildSolarReturnPrompt`, after the natal chart section and before the SR chart section, a natal element profile block is injected:

```
## Natal Element Profile
Dominant element: [dominant] — [interpretation.dominant]
```

This follows the same pattern as `buildTransitPrompt` lines 361–363. No type changes, no signature changes, no logic changes — one import and four lines of prompt construction.

No other files are touched by this proposal. The sprint vision explicitly permits prompt text additions to `buildSolarReturnPrompt` and `buildSynastryPrompt` and treats them as the only permitted engine-adjacent changes.
