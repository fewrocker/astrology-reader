# Proposal: Rename `retrogradeplanets` → `retrogradePlanets` in `TarotAstroContext`

**Type:** Code Enhancement
**Originated by:** Carmack, Taleb

---

## Problem / Opportunity

The `TarotAstroContext` interface in `src/engine/tarot.ts` (line 53) declares the field as `retrogradeplanets` — lowercase 'p' — which violates TypeScript camelCase conventions. Because TypeScript enforces structural consistency at the type level, the typo propagates faithfully to every site that reads or writes the field: there are no call sites using the correct spelling because any correct-spelling attempt would be a compile-time error.

**Locations of the typo:**

- `src/engine/tarot.ts` — 8 occurrences
  - Line 53: interface field declaration in `TarotAstroContext`
  - Line 524: local variable declaration in `buildTarotAstroContext`
  - Line 533: assignment inside `buildTarotAstroContext`
  - Line 573: object literal shorthand when constructing the context return value
  - Lines 690, 696, 704: three `astroContext.retrogradeplanets` access calls inside `buildTransitInfluence`
  - Line 764: one `astroContext.retrogradeplanets` access call in the retrograde inline note generator

- `src/engine/__tests__/tarot.test.ts` — 3 occurrences
  - Line 102: mock context object literal
  - Line 236: `expect(ctx.retrogradeplanets)`
  - Line 243: `expect(ctx.retrogradeplanets)`

Total: **11 occurrences across 2 files.**

No component files reference `retrogradeplanets` directly — component files use their own local `retrogradePlanets` variables derived from reading data, not from `TarotAstroContext`.

**Why now rather than later:** Sprint 0027 adds transit adaptation entries that extend the code paths which read `astroContext.retrogradeplanets` inside `buildTransitInfluence`. Each sprint that modifies `tarot.ts` or adds tests for `TarotAstroContext` is a sprint that can add another wrong-named access site. The current count is 11 — the lowest it will ever be. The Carmack analysis for sprint 0027 explicitly flags this typo and recommends fixing it as a standalone commit before the sprint's data additions begin, precisely to hold the occurrence count low.

---

## Desired State

The field is named `retrogradePlanets` everywhere: in the `TarotAstroContext` interface definition, in the local variable inside `buildTarotAstroContext`, at the object construction site, at all four engine access call sites, and in all three test file references. The rename is mechanical and complete — no logic changes, no behavioral changes, no new files. After the rename, every access site is consistent with TypeScript camelCase conventions and consistent with how the rest of the codebase names multi-word variables (e.g., `dominantTransitPlanet`, `natalMoonSign`, `chartRulerPlanet`).

The fix touches 2 files and 11 occurrences. It introduces no functional change.

---
## Outcome
Status: done
Implementation: Global find-replace of retrogradeplanets → retrogradePlanets in src/engine/tarot.ts (8 occurrences) and src/engine/__tests__/tarot.test.ts (3 occurrences). TypeScript confirms zero remaining type errors. No logic changes.
