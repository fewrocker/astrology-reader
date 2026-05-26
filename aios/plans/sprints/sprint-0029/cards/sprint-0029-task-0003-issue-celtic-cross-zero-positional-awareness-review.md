# Review: sprint-0029-task-0003 — Celtic Cross Zero Positional Awareness

**Status:** Done  
**Build:** Pass (vite build, 0 errors)  
**Tests:** 71/71 pass (2 new tests added)

## What was done

### Layer 1 — Wired position name/description into the interpretation pipeline

In `src/components/tarot/CelticCrossReading.tsx`, the `handleActualDeckSelect` callback previously passed `celticPosition` (a `CelticCrossPosition`) directly to `computeInstantInterpretation`. Because `CelticCrossPosition` uses `name`/`description` fields and `SpreadPosition` expects `label`/`meaning`, the engine received undefined for both, producing `null` in `positionLabel` and `positionMeaning` for all 10 Celtic Cross interpretations.

Fixed by creating an adapter at the call site:

```typescript
const spreadPosition: SpreadPosition | null = celticPosition
  ? {
      id: celticPosition.id,
      label: celticPosition.name,
      meaning: celticPosition.description,
      spreadType: 'celtic-cross',
      positionIndex: celticPosition.number - 1,
    }
  : null
```

`getThreeCardSpreadProfile` and `adaptInterpretationToPosition` are unchanged — the celtic-cross exclusion there is correct because the three-card frame system does not apply. The wiring simply ensures `positionLabel` and `positionMeaning` are now non-null for all 10 positions.

### Layer 2 — Added 10 static positional demand strings

Added `cardDemand: string` field to the `CelticCrossPosition` interface in `src/data/tarot/spreadPositions.ts`. Each entry in `CELTIC_CROSS_POSITIONS` now carries a demand string written at the register the sprint card specifies — naming the specific pressure the position exerts on the card sitting in it, not a summary of the position category.

The 10 strings:
1. **Present Situation** — names the card as weather, not direction; the atmosphere the querent is breathing
2. **Challenge** — names what the card becomes when laid physically across card 1, complicating it
3. **Unconscious Influence** — names the discomfort of what has been steering without permission
4. **Recent Past** — names what residue the energy left as it moved out of the foreground
5. **Conscious Goal** — names the surface wish and asks whether it aligns with position 3
6. **Near Future** — names what the card looks like when still becoming rather than arrived
7. **Inner State** — names the private self the querent carries alone into the situation
8. **External Environment** — names what the world is offering/withholding and its dialogue with position 7
9. **Hopes and Fears** — names the ambivalence of wanting something badly enough to fear it
10. **Outcome** — names the card as the direction all nine other energies converge toward

### Surfaced cardDemand in the InterpretationPanel

The `InterpretationPanel` component now receives `positionIndex` (the 0-based index into `CELTIC_CROSS_POSITIONS`). It derives `cardDemand` from `CELTIC_CROSS_POSITIONS[positionIndex]` and renders it between `positionMeaning` (position description) and `coreMeaning` (card's generic meaning). The rendering order is:

1. Position name (uppercase header)
2. Card name + reversed indicator
3. Position description (`positionMeaning`) — the general meaning of this position
4. Positional demand (`cardDemand`) — what this position asks of the card (new)
5. Core meaning (`coreMeaning`) — the card's interpretation in this context
6. Emotional meaning
7. Astro headline

### Tests

- Fixed `mockPositions` in `tarot.test.ts`: the three mock `SpreadPosition` objects were missing the required `id` field (the type was silently accepted before because the `id` field in the type is required but TypeScript may have inferred the mock as a subset type in certain paths). Added `id` to all three.
- Added test: `populates positionLabel and positionMeaning for a Celtic Cross adapted SpreadPosition` — asserts that passing a `SpreadPosition` with `spreadType: 'celtic-cross'` and explicit `label`/`meaning` produces non-null `positionLabel` and `positionMeaning`.
- Added test: `populates positionLabel for all 10 Celtic Cross positions when adapted correctly` — asserts the adapter pattern works for all 10 positions.

## Files changed

- `src/data/tarot/spreadPositions.ts` — added `cardDemand` field to `CelticCrossPosition` interface; added 10 demand strings to `CELTIC_CROSS_POSITIONS`
- `src/components/tarot/CelticCrossReading.tsx` — adapter at call site; `positionIndex` prop on `InterpretationPanel`; demand string rendered in panel
- `src/engine/__tests__/tarot.test.ts` — fixed `mockPositions` missing `id`; 2 new Celtic Cross regression tests

## What was not changed

- `src/engine/tarot.ts` — `getThreeCardSpreadProfile` and `adaptInterpretationToPosition` unchanged. The celtic-cross exclusion in `getThreeCardSpreadProfile` is correct and intentional.
- `SPREAD_POSITIONS` in `spreadPositions.ts` — unchanged. The Celtic Cross entries there already had `label`/`meaning`; they are used by `computeThreeCardSynthesis` context but not by the `CelticCrossReading` component directly.
