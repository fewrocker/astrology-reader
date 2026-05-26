# Review: feat-position-aware-instant-interpretation

**Task:** sprint-0026-task-0006
**Status:** Completed

---

## What Was Done

### Gap 1 — `positionLabel` / `positionMeaning` surfaced in `TarotInterpretationPanel.tsx`

Added a conditional "Position Frame" section (Section 0) that renders before "Core Meaning" when `interpretation.positionLabel` is non-null. The section displays:

- Position label: `text-xs uppercase tracking-widest font-heading` in `#c9a84c` gold — matching the canonical section header style.
- Position meaning: `text-mystic-muted/80 text-sm italic leading-relaxed` — deliberately more muted than body text to mark it as interpretive frame rather than card content.
- Container: uses the same `SECTION_CONTAINER` class as all other sections (`border border-mystic-gold/20 rounded-xl bg-mystic-surface/50 p-6 mb-4`).
- Single-card draws: the section is entirely absent (`positionLabel` is null for single draws). No regression, no empty space.

### Gap 2 — Position-aware Level 2 fallback in `buildTransitInfluence`

**New helpers added to `src/engine/tarot.ts`:**

- `PAST_ROOT_POSITION_IDS` — Set of position IDs with past/root temporal valence: `past`, `recent-past`, `celtic-3-unconscious`, `celtic-4-recent-past`, `shadow`, `theme`.
- `FUTURE_EMERGING_POSITION_IDS` — Set of position IDs with forward/aspirational valence: `future`, `advice`, `action`, `bridge`, `gift`, `celtic-5-conscious-goal`, `celtic-6-near-future`, `celtic-10-outcome`.
- `getPositionRegister(position)` — Returns `'past-root' | 'present-active' | 'future-emerging' | null`. Returns `null` for single-card draws (no position). All named spread positions map to one of the three registers; unrecognised IDs (possible future spreads) default to `'present-active'`.
- `isCourtCard(card)` — `arcana === 'minor' && number >= 11 && number <= 14`.
- `getCourtRankLabel(card)` — Returns 'Page', 'Knight', 'Queen', or 'King' from the card number.
- `buildPositionAwareAffinityLine(card, planet, cardElement, transitElement, register)` — Produces position-and-rank-aware affinity sentences for all three registers × same/cross element × court/non-court combinations.

**`buildTransitInfluence` signature** changed to `(card, astroContext, position)`. Level 1 is unchanged (returns verbatim when a transit adaptation exists). Level 2 calls `buildPositionAwareAffinityLine` when `register !== null` (multi-card spread); falls through to the original generic sentences when `register === null` (single-card draw). Level 3 is unchanged.

**`computeInstantInterpretation`** updated to forward `position` into `buildTransitInfluence(card, astroContext, position)`.

### `ThreeCardReading.tsx` visual alignment

Updated the local panel's position header from `tracking-[0.2em]` to `tracking-widest` and the meaning text from `text-mystic-muted text-xs` to `text-mystic-muted/80 text-sm` — matching the canonical panel's label typography and meaning text style per spec item 9.

---

## Spec Compliance

| Item | Status |
|------|--------|
| 1. Position header section above Core Meaning | Done |
| 2. Single-card draw renders no position section | Done — conditional on `positionLabel` |
| 3. Position section is first interpretive content | Done — Section 0 before all card sections |
| 4. Data from `interpretation.positionLabel/positionMeaning` only | Done — no new props |
| 5. `buildTransitInfluence` receives `position` parameter | Done |
| 6. Three positional registers: past/root, present/active, future/emerging | Done |
| 7. No position-aware modification for single-card draw or Level 1 hit | Done |
| 8. Court card rank-awareness in Level 2 output | Done — Page/Knight/Queen/King named with relational framing |
| 9. Visual consistency between canonical and ThreeCardReading local panels | Done — label and meaning styles aligned |
| 10. "In Your Sky Now" section unchanged as rendering point | Done |
| 11. Single-card court card output unchanged | Done — `register === null` path |
| 12. Visual treatment matches existing design language | Done — same SECTION_CONTAINER, same header class pattern |
| 13. Position section visually distinct from Core Meaning | Done — muted/80 italic vs. text/90 body |
| 14. Celtic Cross edge case | Done — all 10 position IDs map through PAST_ROOT / FUTURE_EMERGING / present-active via general logic |

---

## Out of Scope (confirmed not touched)

- `SavedReadingsPage.tsx` position detail display (open question, not in proposal scope)
- Transit adaptations for court cards (separate task-0002)
- GPT prompt changes
- `SPREAD_POSITIONS` data modifications
- ThreeCardReading structural refactor beyond style alignment

---

## Build

`npm run build` passes with zero TypeScript errors.
