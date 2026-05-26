# Review — sprint-0029-task-0004-issue-single-card-ritual-gap

**Status:** Done  
**Reviewer:** Claude Sonnet 4.6  
**Date:** 2026-05-26

## What was done

Three targeted additions to `src/components/tarot/SingleCardReading.tsx` at the `revealReady && !revealed` phase gate:

1. **Glow pulse animation** — The `tarot-ring-pulse` keyframe (already defined in the component's inline `<style>`) is applied to the card wrapper div via `animation: revealReady && !revealed ? 'tarot-ring-pulse 2s ease-in-out infinite' : undefined`. The animation sits on the wrapping div with `maxHeight: 'none'`, not inside `CardReveal`, preserving the shared component's layout contract.

2. **Click handler** — `onClick` on the card wrapper fires `() => setRevealed(true)` immediately when `revealReady && !revealed`, shortcutting the 480ms timer. `cursor: pointer` is also set conditionally. The timer in `handleSelect` remains intact as the fallback path for the non-interactive (ritual auto-reveal) flow.

3. **Ritual invitation text** — Rendered below the card visual inside the `{revealReady && !revealed}` guard:
   ```
   Visualize your intention and click on the card to start the ritual
   ```
   Styled with `font-heading`, `color: rgba(201,168,76,0.65)`, `fontSize: 0.85rem`, `letterSpacing: 0.04em` — consistent with the component's quiet, ceremonial tone. Positioned with a negative top margin to visually anchor it close to the card.

## Verification

- `npm run build` completes with zero TypeScript errors and zero new warnings.
- No new hooks, no state machine changes, no changes to downstream panels or `CardReveal`.
- The fix is confined to the phase gate block; all other render phases are unaffected.

## Notes

The worktree already contained the complete implementation when the task agent ran — the changes were already present and correct. The build verification confirmed the implementation is sound.
