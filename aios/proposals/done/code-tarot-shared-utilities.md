# Proposal: code-tarot-shared-utilities

**Type:** Code Enhancement

**Originated by:** Carmack, Taleb

---

## Problem / Opportunity

Three locations in the tarot module define `shuffleTarotDeck` as a standalone function: `TarotPage.tsx` at line 25 and `CelticCrossReading.tsx` at line 49. Both perform an identical Fisher-Yates shuffle over `ALL_TAROT_CARDS` using `Math.random()` directly. `TarotPage.tsx` also defines `computeCardReversal` at line 36, and `CelticCrossReading.tsx` defines its own `computeCardReversal` at line 58 — both return `Math.random() < 0.3` with no additional logic. These four definitions are pure copy-paste: they produce identical behavior and share no common source.

`TarotPage.tsx` further defines `buildEngineCtx` at line 117 — a helper that wraps `buildTarotAstroContext` with a fixed `null` for transit data — and each of the three reading flow containers (`SingleReadingFlow`, `ThreeReadingFlow`, `CelticReadingFlow`) independently calls `calculateTransits(chartData, 'daily')` and `calculateTransits(chartData, 'weekly')` via separate `useMemo` hooks before building their engine context. The transit calculation setup pattern is structurally identical across all three flows but is spelled out in each one without a shared abstraction.

The maintenance risk is concrete. Today both `shuffleTarotDeck` implementations are identical, but they have no enforcement relationship — a bug fix or deliberate behavior change applied to one will not propagate to the other. The same applies to `computeCardReversal`: if the reversal probability were adjusted to 0.25 or made configurable, the change would have to be applied in two files, and any discrepancy between them would be silent. Because these functions are module-level definitions inside component files, static analysis will not flag the divergence; tests written against one implementation will not cover the other. The duplication is invisible to the toolchain.

`engine/tarot.ts` already exports `drawCards` and `assignReversals`, which cover deterministic variants of the same operations. The ad-hoc shuffle and reversal functions in the component files bypass these and reimplement the same logic with `Math.random()` directly. This creates two parallel code paths for what is conceptually the same operation — randomized deck preparation — with no documented distinction between them.

The `formatTransitSummary` function adds a further layer: it is defined at `TarotPage.tsx` line 78 and again, identically, in `server/services/gptTarot.ts` at line 380. These two instances maintain an implicit format contract between the client and server layers. There is no enforcement that the strings they produce match; if the client-side version changes its output format, the server-side version drifts silently, and the GPT prompt that consumes the formatted string receives inconsistent input depending on which code path ran.

---

## Desired State

All shuffle, reversal, and transit formatting logic lives in a single shared utility module within the tarot subsystem. `SingleReadingFlow`, `ThreeReadingFlow`, and `CelticReadingFlow` import from that module rather than defining their own copies. `CelticCrossReading.tsx` imports from the same location rather than defining module-level helpers. There is one canonical implementation of each function; a fix or change in behavior applies everywhere by definition.

The shared module is the single source of truth for what "shuffle the tarot deck" and "compute whether a card is reversed" mean in this application. Downstream components are consumers, not re-implementors. When a developer modifies shuffle behavior — for example, to make it seedable for testing, or to adjust reversal probability — they edit one file and the change is complete.

The transit calculation pattern is similarly consolidated so that each reading flow receives pre-computed transit data through a consistent interface rather than each independently reproducing the same `useMemo` structure. Divergence between flows in how transits are prepared becomes structurally impossible rather than merely unlikely.

The result is that the tarot module's randomization and transit setup behavior is auditable in one place, testable from one location, and consistent across all reading modes without requiring coordination between files.
