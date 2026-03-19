# Enhancement: Simplify Results Buttons

## What Exists Today
In [src/components/results/ResultsPage.tsx](src/components/results/ResultsPage.tsx), the bottom of the results page has 4 buttons:
1. **Discuss ✦** — Opens the GPT discuss modal
2. **Daily / Weekly / Monthly ☽** — Navigates to transit-select view
3. **Couple Synastry ♡** — Navigates to partner-form view
4. **Generate New Reading** — Resets the app to the form

## What the User Wants
Simplify to just **2 buttons**:
1. **Discuss** — Keep the discuss modal button
2. **Back to Menu** — Return to the initial form (RESET action)

## What Needs to Change
- **File**: `src/components/results/ResultsPage.tsx`
  - Remove the "Daily / Weekly / Monthly" button
  - Remove the "Couple Synastry" button
  - Remove the "Generate New Reading" button
  - Add a "Back to Menu" button that dispatches RESET

## Tasks
- [x] Update ResultsPage.tsx button section
