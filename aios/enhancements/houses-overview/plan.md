> Imported from proposals/houses-overview.md

# Enhancement: Houses Overview Section

## What exists today
- House cusps are computed by the calculation engine (`src/engine/types.ts` → `HouseCusp[]`)
- Planet-in-house interpretations exist in `src/data/interpretations/planetInHouse.ts`
- `ReadingDisplay.tsx` exports collapsible `Section` and all reading sections
- `ResultsPage.tsx` renders all sections but has no Houses Overview
- `DiscussModal.tsx` sends house cusps to GPT but only as raw positions, no thematic context

## What the user wants
- A dedicated "Houses Overview" collapsible section showing all 12 houses
- Each house shows: house number, cusp sign, theme/life area, natural ruler, planets in it
- Houses data included in GPT discuss context for richer conversations

## Implementation Checklist
- [x] Create `src/data/interpretations/houseThemes.ts` with 12 house themes, natural rulers, and cusp-sign brief descriptions
- [x] Create `HousesOverview` section component in `ReadingDisplay.tsx`
- [x] Add `HousesOverview` to `ResultsPage.tsx`
- [x] Enrich `buildBirthChartContext` in `DiscussModal.tsx` with house themes and occupants
- [x] Build and verify zero errors
