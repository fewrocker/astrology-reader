# Proposal: Houses Overview Section

## Problem / Opportunity

The product spec (F7) explicitly calls for a "Houses Overview" section showing key houses and their rulers. Currently, house information is embedded in planet-in-house cards, but there's no dedicated section explaining what each house represents, which sign rules it (cusp sign), and which planets occupy it. This was flagged in `review/known-issues.md` and `review/test-results.md` as a gap.

For astrology enthusiasts, house rulerships are fundamental — the ruling planet of each house adds a layer of interpretation that's currently missing.

## Proposed Solution

Add a new collapsible "Houses Overview" section to the reading display showing:
- All 12 houses in a grid or list layout
- Each house card shows: house number, cusp sign, natural ruling planet, theme/life area
- Planets currently in each house listed with glyphs
- Brief interpretation of the house cusp sign placement
- Empty houses noted with their ruler's position as the interpretive focus

## Impact & Effort

- **Impact**: Medium — Completes the spec; valuable for astrology-literate users
- **Effort**: Low (2 hours — UI work + ~12 house theme descriptions)
- **Dependencies**: F3 (Calculation Engine — houses already computed), F7 (Reading Display)

## Implementation Summary

- Add house theme/ruler data to `src/data/interpretations/` (12 house descriptions + 12×12 sign-on-cusp interpretations, or simplified set)
- Add `HousesOverview` section to `ReadingDisplay.tsx` 
- Map computed house cusps to sign placements
- Display which planets occupy each house (already available in chart data)
- Style consistently with existing collapsible sections
