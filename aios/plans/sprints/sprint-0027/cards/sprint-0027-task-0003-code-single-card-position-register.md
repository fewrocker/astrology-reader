---
**Type:** Code Enhancement
**Originated by:** Jobs, Carmack, Miyazaki
---

## Problem / Opportunity

Single-card draws are the most common draw type in the app, and they are routed through a code path that is weaker than every multi-card draw — not by design, but by an implicit null convention that was never revisited.

`computeInstantInterpretation` in `src/engine/tarot.ts` accepts `position: SpreadPosition | null`. For single-card draws, `TarotPage.tsx` passes `null` at both call sites (lines 61 and 189). That null flows into `buildTransitInfluence`, where `getPositionRegister(null)` returns `null`, and the guard at line 720 — `if (register !== null)` — blocks the call to `buildPositionAwareAffinityLine`. The position-aware Level 2 path is skipped entirely.

The code then falls through to the generic affinity lines at lines 724–732: text that is structurally identical regardless of whether the card is a daily draw or a spread position, and which carries no positional grounding. Meanwhile, every three-card position and every Celtic Cross position — even `present`, which carries the same temporal valence as a single-card daily draw — routes through `buildPositionAwareAffinityLine` and receives the warmer `'present-active'` register output.

The fix already exists in the data. `SPREAD_POSITIONS` in `src/data/tarot/spreadPositions.ts` defines a `'single'` position (id: `'single'`, label: `'The Card'`, spreadType: `'single'`, positionIndex: `0`) that is already used to populate `positionLabel` and `positionMeaning` in the returned `InstantInterpretation`. But this same position is not passed to `buildTransitInfluence`. `getPositionRegister` would resolve the `'single'` id to `'present-active'` (it falls into neither `PAST_ROOT_POSITION_IDS` nor `FUTURE_EMERGING_POSITION_IDS`), which would unlock `buildPositionAwareAffinityLine` with the present-active register — the same register that the `'present'` position in a three-card spread already uses.

The special-case branch at lines 724–732 exists solely because `position` is null for single draws. It is not a deliberate architectural choice; it is an accidental gap from before the single position entry existed.

## Desired State

Single-card draws flow through the same Level 2 code path as every spread position. The `buildPositionAwareAffinityLine` function is called for all draws when a dominant transit planet and card element are present, including daily single draws. The generic affinity lines at lines 724–732 become unreachable dead code once the caller passes the `'single'` position instead of null.

The transit influence text for a single draw under a present-active register is slightly warmer and more grounded: instead of "The current Saturn transit amplifies this card's Earth nature — patience and long game are heightened now," the text names the energy as immediately alive rather than abstractly active. For court cards in particular, the present-active branch of `buildPositionAwareAffinityLine` explicitly frames the card as something being embodied or encountered — a meaningful distinction for a daily draw.

The code becomes easier to reason about. The `if (register !== null)` guard no longer carries a hidden assumption about single draws. Any future register logic or addition to `buildPositionAwareAffinityLine` automatically applies to single draws without a separate code path to maintain.
---
## Outcome
Status: done
Implementation: Added SPREAD_POSITIONS import to TarotPage.tsx, defined module-level SINGLE_POSITION const, passed it instead of null at both computeInstantInterpretation call sites. Single draws now receive present-active register in buildTransitInfluence, enabling buildPositionAwareAffinityLine for Level 2 transit text. positionLabel and positionMeaning are now populated for single draws.
