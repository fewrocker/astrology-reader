# Review — sprint-0029-task-0002-issue-celtic-cross-no-scroll-on-reveal

## What was done

Added automatic scroll-into-view behavior in `CelticCrossReading.tsx` so that when a user taps a card to reveal it, the `InterpretationPanel` scrolls into view.

## Changes

**`src/components/tarot/CelticCrossReading.tsx`**

1. Added `RefObject` to the named React import.
2. Added `interpretationPanelRef = useRef<HTMLDivElement>(null)` in the main component.
3. Added a `useEffect` watching `[phase, activePosition]`:
   - Guards: only fires when `phase === 'holding'` and `activePosition > 2` (exempts the 1+2 initial reveal per spec).
   - Reads `window.matchMedia('(prefers-reduced-motion: reduce)')` to select `'instant'` vs `'smooth'`.
   - Calls `scrollIntoView({ behavior, block: 'start' })`.
4. Passed `panelRef={interpretationPanelRef}` to `<InterpretationPanel>`.
5. Updated `InterpretationPanel` props to accept `panelRef: RefObject<HTMLDivElement>` and attached it to the root `<div>`.

## Behavior after fix

- Positions 3–10: viewport scrolls to the top of `InterpretationPanel` on each reveal, using smooth scroll (or instant for reduced-motion users).
- Positions 1+2 (initial dual reveal): no scroll triggered — first panel may or may not be below fold depending on device, and the spec explicitly exempts it.
- `cross-staff-transition` → position 7: the `setTimeout` in the transition effect sets both `activePosition(7)` and `phase('holding')`, which triggers the scroll effect correctly.
- Synthesis, constellation overlay, and other non-reveal phase transitions: unaffected (guard on `phase !== 'holding'` prevents any scroll).

## Build

`npm run build` — clean, zero TypeScript errors.
