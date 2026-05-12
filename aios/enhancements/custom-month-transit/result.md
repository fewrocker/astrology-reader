# Enhancement Result: Custom Month Transit Selection

## Status: Complete

## What Changed

Users can now select **any month** for transit readings (individual and couples), in addition to the existing Today/This Week/This Month options.

### Files Modified

1. **`src/engine/transits.ts`**
   - `getDateRange()` accepts optional `targetMonth` (`"YYYY-MM"`) — when provided with `'monthly'` period, uses the 1st–last day of that month instead of the current month
   - `calculateTransits()` accepts and passes `targetMonth` through
   - `buildTransitPrompt()` accepts `targetMonth` and formats the month name (e.g., "July 2026") in the GPT prompt instead of "this month"

2. **`src/engine/synastry.ts`**
   - `buildCoupleTransitPrompt()` accepts optional `targetMonth` and uses proper month label

3. **`src/context/appState.ts`**
   - Added `transitTargetMonth: string | null` and `synastryTransitTargetMonth: string | null` to `AppState`
   - `START_TRANSIT` and `START_SYNASTRY_TRANSIT` actions accept optional `targetMonth`
   - Reducer stores `targetMonth` in state

4. **`src/App.tsx`**
   - `TransitSelectScreen`: added month picker input (`<input type="month">`) with "Read" submit button below the 3 period buttons
   - `SynastryTransitSelectScreen`: same month picker added
   - Both transit calculation effects pass `targetMonth` to `calculateTransits()` and prompt builders

### UI
- A new "Or pick any month" section appears below the Today/This Week/This Month buttons
- Uses native `<input type="month">` with `min` set to current month
- Pink-themed for couple screen, gold-themed for individual screen
- Submit button disabled until a month is selected and API key is present

### Regression Check
- TypeScript: zero errors
- Vite build: success
- Existing day/week/month buttons unchanged — still dispatch without `targetMonth` (defaults to `null`)
