# Result: Simplify Results Buttons

## Changes Made
Simplified the bottom action buttons on the birth chart results page from 4 buttons to 2:

**Removed:**
- "Daily / Weekly / Monthly ☽" (transit-select navigation)
- "Couple Synastry ♡" (partner-form navigation)
- "Generate New Reading" (reset)

**Kept:**
- **Discuss ✦** — Opens the GPT discuss modal
- **Back to Menu** — Resets the app to the initial form (replaces "Generate New Reading")

## Files Modified
- `src/components/results/ResultsPage.tsx` — Replaced 4-button section with 2-button layout

## Regression Check
- TypeScript: zero errors
- Production build: success
- Transit and synastry features remain accessible via their own result pages; only the birth chart results page buttons were simplified
