# Enhancement: Sky Today Landing Page

## What exists today
- `CachedDataLanding` in `src/App.tsx` — centered card (max-w-lg) with welcome back message, birth details, and 4 action buttons
- `ChartWheel` component at `src/components/chart/ChartWheel.tsx` — SVG natal chart wheel, takes `ChartData` and `Aspect[]`
- `calculateChart` in `src/engine/astronomy.ts` — calculates chart for any date/time/location
- `calculateAspects` in `src/engine/aspects.ts` — calculates aspects between planets
- Landing page layout: single column centered, with starfield background

## What the user wants
- Full-page layout on the landing screen: **left 40%** = existing menu, **right 60%** = today's sky chart
- The right side shows a live chart wheel of the **current sky** (not anyone's birth chart — just planetary positions right now)
- The chart is **read-only** (no hover interactions needed, decorative) but rendered beautifully
- The chart should fill the space, be circular, and serve as a visual centerpiece
- Beautiful, polished aesthetic

## What needs to change

### 1. Create a `SkyTodayChart` component
- Calculate chart for current date/time using `calculateChart` with UTC/Greenwich (lat=0, lng=0) or user's cached city coords
- Use `calculateAspects` to get aspects
- Render using `ChartWheel` (or a simplified read-only variant)
- Decorative: muted opacity, no hover tooltips needed
- Auto-refreshes on mount

### 2. Update `CachedDataLanding` layout
- Split into a two-column layout: left 40%, right 60%
- Left: existing menu card (welcome back, buttons)
- Right: `SkyTodayChart` filling the space
- Responsive: on mobile, stack vertically (chart on top, smaller, menu below)

### 3. Add CSS for the decorative chart
- Slightly muted/translucent to serve as backdrop feel
- Subtle glow effects

## Checklist
- [ ] Create `SkyTodayChart` component that calculates and renders today's sky
- [ ] Update `CachedDataLanding` to split layout (40/60)
- [ ] Add responsive mobile fallback (stacked)
- [ ] Add decorative styling for the read-only chart
- [ ] Verify build passes with zero errors
