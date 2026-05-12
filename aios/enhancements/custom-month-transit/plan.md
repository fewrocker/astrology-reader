# Enhancement: Custom Month Transit Selection

## What Exists Today
- Transit readings support 3 periods: `'daily'` (today), `'weekly'` (this week), `'monthly'` (this month)
- `TransitPeriod` type is `'daily' | 'weekly' | 'monthly'` in `src/engine/transits.ts`
- `getDateRange()` function always uses `new Date()` (current date) as basis
- `calculateTransits()` only takes `natalChart` and `period` — no custom date parameter
- UI in `TransitSelectScreen` and `SynastryTransitSelectScreen` (in `src/App.tsx`) shows 3 buttons
- State tracks `transitPeriod` and `synastryTransitPeriod` as `TransitPeriod | null`
- `buildTransitPrompt()` uses `periodLabel` as "today", "this week", "this month"
- Prompts reference `transitData.dateRange.start` for current positioning

## What the User Wants
- Keep existing day/week/current month options
- Add ability to pick ANY month in the future by typing a month (e.g., "July 2025")
- A month input field + submit button
- Works for both individual transits AND couple transits

## What Needs to Change

### 1. `src/engine/transits.ts`
- Add optional `targetDate` parameter to `getDateRange()` — when provided and period is `'monthly'`, use that date's month instead of current month
- Add optional `targetDate` to `calculateTransits()` signature
- Update `buildTransitPrompt()` to use the actual month name in the prompt label instead of "this month" when a custom month is selected

### 2. `src/context/appState.ts`
- Add `transitTargetMonth: string | null` to `AppState` (format: `'YYYY-MM'`)
- Add `synastryTransitTargetMonth: string | null` to `AppState`
- Update `START_TRANSIT` action to accept optional `targetMonth`
- Update `START_SYNASTRY_TRANSIT` action to accept optional `targetMonth`

### 3. `src/App.tsx`
- In `TransitSelectScreen`: add a month input field (type="month") + Submit button below the 3 existing period buttons
- In `SynastryTransitSelectScreen`: same month input + Submit button
- Pass `targetMonth` through to `calculateTransits()` in the transit calculation effects

## Implementation Checklist
- [ ] Update `TransitPeriod` type and `getDateRange()` to accept optional target date
- [ ] Update `calculateTransits()` to accept and pass through target date
- [ ] Update `buildTransitPrompt()` to show correct month label
- [ ] Add target month fields to `AppState` and reducer actions
- [ ] Add month picker UI to `TransitSelectScreen`
- [ ] Add month picker UI to `SynastryTransitSelectScreen`
- [ ] Wire up calculation effects to pass target month
- [ ] Build and verify
