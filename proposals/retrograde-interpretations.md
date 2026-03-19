# Proposal: Retrograde Interpretation & Awareness

## Problem / Opportunity

The app detects retrograde planets and displays the ℞ symbol in tables, but never explains what retrograde *means* for the user. For astrology lovers, retrograde is one of the most discussed and emotionally resonant concepts — Mercury retrograde alone dominates astrology social media for weeks. Showing "℞" without context is like showing a warning light on a dashboard with no label.

Both natal retrogrades (planets retrograde at birth) and transit retrogrades (current retrograde periods) deserve dedicated interpretation and visual treatment.

## Proposed Solution

1. **Natal retrograde interpretations**: For each planet found retrograde in the birth chart, add a dedicated "Retrograde" interpretation block explaining how that planet's energy is internalized, delayed, or expressed differently. (e.g., "Mercury Retrograde Natal: You process information deeply and may revisit ideas others move past quickly.")
2. **Retrograde highlight on chart wheel**: Add the ℞ symbol next to retrograde planet glyphs on the SVG chart, with a subtle visual distinction (dimmed glow or different outline).
3. **Retrograde summary card**: A dedicated card in the reading that lists all natal retrogrades together, explaining the overall pattern (e.g., "You have 3 retrograde planets — your inner world is rich and you often need to revisit lessons before they click.").
4. **Transit retrograde awareness**: In transit readings, highlight which planets are currently retrograde and what that means for the user's chart specifically (e.g., "Mercury retrograde is transiting your 7th house — communication in partnerships may need extra care").
5. **Retrograde periods calendar**: Show approximate retrograde start/end dates for slow-moving planets in the transit view.

## Impact & Effort

- **Impact**: HIGH — Retrograde is the #1 astrology concept casual users know about. Explaining it makes the app feel relevant and educational.
- **Effort**: LOW — Retrograde status is already calculated. This is interpretation content + minor UI additions.
- **Dependencies**: Existing retrograde detection in astronomy engine, ReadingDisplay, TransitReadingPage.

## Implementation Summary

- New file: `src/data/interpretations/retrogrades.ts` — natal retrograde interpretations per planet + transit retrograde context
- Modify: `src/components/reading/ReadingDisplay.tsx` — add Retrograde Summary card, retrograde badges on planet cards
- Modify: `src/components/chart/ChartWheel.tsx` — add ℞ glyph next to retrograde planets on wheel
- Modify: `src/components/results/TransitReadingPage.tsx` — highlight retrograde transits with context
