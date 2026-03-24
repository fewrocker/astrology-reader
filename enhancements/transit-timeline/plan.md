> Imported from proposals/transit-timeline.md

# Transit Timeline & Aspect Calendar

## What Exists Today
- Transit reading system calculates current positions, aspects to natal, ingresses, retrogrades (`src/engine/transits.ts`)
- TransitReadingPage displays snapshot view with GPT narrative, aspect list, ingresses, retrogrades, positions table (`src/components/results/TransitReadingPage.tsx`)
- Supports daily/weekly/monthly/custom-month periods
- astronomy-engine library available for multi-date calculations

## What the User Wants
- A timeline view showing **when** transit events happen across the selected period
- Exact perfection dates for transit aspects (via binary search)
- Sign ingresses, retrograde stations, lunar phases plotted on timeline
- "Power Day" highlights when multiple events cluster
- Tab alongside existing narrative reading

## Implementation Checklist

- [ ] 1. Create `src/engine/transitTimeline.ts` — timeline event calculation engine
  - Calculate transit aspect perfection dates via binary search across date range
  - Detect retrograde stations (when planets station retrograde or direct)
  - Calculate lunar phases (new/full moon, quarters)
  - Detect Moon sign changes
  - Aggregate and sort all events by date
  - Identify "power days" (3+ events on same date)
- [ ] 2. Create `src/data/interpretations/transitEvents.ts` — brief event interpretations
  - Perfecting aspect snippets
  - Sign ingress snippets
  - Station interpretations
  - Lunar phase meanings
- [ ] 3. Create `src/components/reading/TransitTimeline.tsx` — timeline UI component
  - Vertical timeline with date markers
  - Event cards with planet glyphs, type icons, dates, brief interpretations
  - Power Day highlight badges
  - Expandable event detail
  - Responsive mobile layout
- [ ] 4. Integrate timeline tab into `TransitReadingPage.tsx`
  - Add Reading / Timeline tab toggle below the chart
  - Compute timeline events from natal chart + date range
  - Pass events to TransitTimeline component
- [ ] 5. Build verification — ensure zero TypeScript/build errors
- [ ] 6. Write result.md, update define-product.md and state.md
