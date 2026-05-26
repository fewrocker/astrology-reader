# Review: feat-three-card-constellation-preview

**Task:** sprint-0028-task-0006
**Branch:** sprint-0028-task-0006-feat-three-card-constellation-preview
**Status:** Complete

---

## What Was Done

### New component: `src/components/tarot/ThreeCardConstellationPreview.tsx`

A small, focused component that receives a `ThreeCardSynthesisInput` and renders a minimal constellation note section. It extracts the following signals:

- `astroResonanceNote` — the primary note (always shown if non-empty)
- `suitPattern.noMinorArcana` — for the all-Major-Arcana conditional line
- `elementDistribution.fireWaterTension` — for the Fire/Water tension line
- `polarityProfile.allReversed` / `polarityProfile.centerReversed` — for polarity lines
- `archetypeFraming.hasFool` / `archetypeFraming.hasWorld` — for archetype significance lines

Visual treatment: a thin gold divider at 18% opacity with a centered star glyph, followed by the constellation notes in small italic text at `rgba(180,160,120,0.72)` and `rgba(180,160,120,0.58)` — understated, clearly secondary to the card panels above and the synthesis below.

### Modified: `src/components/tarot/ThreeCardReading.tsx`

- Added imports: `useMemo` (added to existing React import), `computeThreeCardSynthesis` from `../../engine/tarot`, and `ThreeCardConstellationPreview`
- Added `constellationSynthesis` via `useMemo` — computed once when `drawnCards.length === 3`, using the same `drawnCards`, `spreadPositions`, and `astroContext` that are already in scope
- Added `showConstellationPreview` boolean: `phase === 'all-revealed' && constellationSynthesis !== null`
- Renders `<ThreeCardConstellationPreview>` in a `tarot-fade-in` wrapper between the interpretation panels block and the synthesis zone

---

## Design Decisions

**Placement:** The preview appears only when `phase === 'all-revealed'` — the same trigger as the synthesis zone. This means it appears with the GPT skeleton, not before it, which keeps the reading flow coherent: the user reveals cards one by one, and once all three are face-up the constellation picture and GPT loading begin together.

**useMemo vs useState:** The synthesis is a pure deterministic computation from props, so `useMemo` is appropriate — no extra effect, no double-fire risk, and it stays reactive to prop changes without ceremony.

**allMajorArcana:** Uses `suitPattern.noMinorArcana` from the synthesis output directly, which is `cards.every(dc => dc.card.arcana === 'major')` — the canonical source.

**No new engine changes:** `computeThreeCardSynthesis` was already fully implemented and exported. The only new work is the rendering path.

---

## Build and Tests

- `npm run build`: clean, no TypeScript errors
- `npx vitest run`: 55/56 tests pass; the 1 failure (`SPREAD_POSITIONS is not defined`) is pre-existing on the base branch, not introduced by this task
