**Review of:** `sprint-0011-task-0003-code-gpt-prompt-element-profiles`
**Branch:** `sprint-0011-task-0003-code-gpt-prompt-element-profiles`
**Commit reviewed:** 79a2a8a
**Reviewer:** Claude (Sonnet 4.6)
**Date:** 2026-05-14

---

## Summary

The task injected `analyzeElements` element profile blocks into three prompt builder functions: `buildSynastryPrompt`, `buildCoupleTransitPrompt`, and `buildSolarReturnPrompt`. TypeScript check passes with zero errors. All three functions match the reference pattern from `buildTransitPrompt`.

---

## Findings

### Blocking

None.

---

### Warnings

**W1 — `buildCoupleTransitPrompt`: Priority block embeds a code variable name as literal prose sent to GPT**

File: `src/engine/synastry.ts`, lines 622–625

The Priority instruction emitted into the prompt reads:

```
Priority: Lead with the single most impactful transit aspect to the composite chart — the tightest-orb aspect in transitData.transitAspects. State what this transit means for the relationship during this period before covering the broader picture.
```

The string `transitData.transitAspects` is a TypeScript variable name, not natural English. GPT will receive it as prose and may interpret it literally or be confused by the camel-case identifier. The card spec's desired-state box (line 61) includes this exact text, so the implementation faithfully matches the spec — but the spec wording itself is questionable. The reference implementation in `buildTransitPrompt` avoids this by resolving the tightest aspect to actual planet names before constructing the priority string (e.g., `Transit ${tightestApplying.transitPlanet} ${tightestApplying.symbol} Natal ${tightestApplying.natalPlanet}`).

Recommendation: Replace the variable-name reference with a resolved description. Since `transitData.transitAspects` is already sorted by orb ascending (from `calculateTransitAspects`), and `tightestCoupleTransit` is already captured, the priority string can mirror the transits.ts pattern:

```ts
prompt += `\nPriority: Lead with the single most impactful transit aspect to the composite chart — Transit ${tightestCoupleTransit.transitPlanet} ${tightestCoupleTransit.symbol} Composite ${tightestCoupleTransit.natalPlanet} (${tightestCoupleTransit.orb.toFixed(1)}°). State what this transit means for the relationship during this period before covering the broader picture.\n`
```

This is not blocking because (a) the spec explicitly specifies the current text and (b) GPT will likely still infer the correct intent, but it is a prompt quality regression relative to the `buildTransitPrompt` reference.

**W2 — `buildCoupleTransitPrompt`: Priority block appears before `## Instructions` header rather than inside it**

File: `src/engine/synastry.ts`, lines 621–627

The output ordering is:
1. `## Transit Aspects to Composite Chart` (with aspect lines)
2. Bare `Priority: ...` text (no section header)
3. `## Instructions`
4. Instruction lines

In `buildSynastryPrompt`, the Priority block is emitted immediately after `## Instructions` (line 516 then line 521), making it the first item inside the instructions section. In `buildCoupleTransitPrompt`, the Priority block is emitted before `## Instructions`, making it a stray paragraph floating between data sections and the instructions block. This is a structural inconsistency between the two functions in the same file.

The card spec says "added immediately before the instructions section," which the implementation satisfies literally, but the `buildSynastryPrompt` sibling places Priority inside `## Instructions`. The inconsistency may affect how GPT weights the priority directive since it is not co-located with the other instructions.

Recommendation: Move the Priority block to appear as the first item inside `## Instructions`, matching `buildSynastryPrompt`:

```ts
prompt += `\n## Instructions\n`
const tightestCoupleTransit = transitData.transitAspects[0]
if (tightestCoupleTransit) {
  prompt += `Priority: ...\n\n`
}
prompt += `Provide a ${period} couple transit reading...`
```

---

### Suggestions

**S1 — Import could be consolidated with a named import style already used in the file**

`synastry.ts` uses `import { analyzeElements } from '../data/interpretations/index'` (line 6). The import path omits the `.ts` extension, which is consistent with every other import in the file. No change needed; this is just a confirmation that the style is correct.

**S2 — `buildCoupleTransitPrompt` could also emit the `lacking` element for completeness**

The reference `buildTransitPrompt` only emits `dominant`, not `lacking`. All three new implementations correctly match that reference by emitting only the dominant element. This is consistent. If a future iteration wants to surface elemental deficits (e.g., "no Water planets — detachment from emotional register"), the `elementAnalysis.lacking` field is already computed by `analyzeElements` and would require one additional line per person. Out of scope for this task but worth noting.

**S3 — `buildSynastryPrompt` could guard the house number in the element profile position**

Lines 460–468: the Person 1 natal positions block always emits `(House ${p.house})` without guarding on `chart1.unknownTime`. Looking at the diff, this pre-existing behavior is unchanged by this task — it is not introduced by this PR. However, since the task touched the surrounding area, it is worth flagging for a future fix. The pre-existing guard pattern is `${!chart1.unknownTime ? \` (House ${p.house})\` : ''}` and it appears to be missing from the base code at line 461. This is pre-existing and not attributable to this PR.

---

## Verification checklist

| Check | Result |
|---|---|
| Import path `'../data/interpretations/index'` correct in `synastry.ts` | Pass (line 6) |
| Import path `'../data/interpretations/index'` correct in `solarReturn.ts` | Pass (line 3) |
| `analyzeElements` signature: accepts `PlanetPosition[]`, returns `ElementBalance` | Confirmed (index.ts line 52) |
| `buildSynastryPrompt`: `analyzeElements(chart1.planets)` — full list | Pass (line 452) |
| `buildSynastryPrompt`: `analyzeElements(chart2.planets)` — full list | Pass (line 453) |
| `buildSynastryPrompt`: element profile blocks after each natal section | Pass (lines 467–468, 480–481) |
| `buildSynastryPrompt`: Priority instruction wording matches card spec | Pass (line 521, exact match) |
| `buildSynastryPrompt`: house-naming instruction extended per card spec | Pass (line 536, extended with life-area description example) |
| `buildCoupleTransitPrompt`: `analyzeElements(chart1.planets)` — full list, not filtered subset | Pass (line 561, called before the inner-planet filter on line 580) |
| `buildCoupleTransitPrompt`: `analyzeElements(chart2.planets)` — full list, not filtered subset | Pass (line 562, called before the inner-planet filter on line 587) |
| `buildCoupleTransitPrompt`: element profile blocks after each person's summary | Pass (lines 583–584, 590–591) |
| `buildCoupleTransitPrompt`: priority instruction added | Pass (lines 622–625), see W1 and W2 |
| `buildCoupleTransitPrompt`: relationship-dimension naming instruction added | Pass (line 632) |
| `buildSolarReturnPrompt`: `analyzeElements(natalChart.planets)` | Pass (line 78) |
| `buildSolarReturnPrompt`: `## Natal Element Profile` block between natal and SR sections | Pass (lines 79–80, inserted before `\n## Solar Return Chart\n` on line 82) |
| `buildSolarReturnPrompt`: matches `buildTransitPrompt` reference pattern | Pass (identical two-line pattern) |
| TypeScript: zero errors | Pass (`npx tsc --noEmit` produced no output) |

---

## Verdict

**Ready to merge with the two warnings noted.** W1 and W2 are prompt-quality concerns rather than correctness defects. W1 is spec-faithful but should be fed back to the spec author for the next iteration. W2 is a minor structural inconsistency within the same file. Neither blocks the core intent of the task, which is fully and correctly implemented.
