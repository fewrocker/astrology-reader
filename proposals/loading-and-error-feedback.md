# Proposal: Loading Animation & Error Feedback

## Problem / Opportunity

Two UX gaps compound each other:

1. **No loading animation**: The original spec called for a "celestial animation (stars aligning or chart drawing itself)" during calculation. Currently users see a blank screen or abrupt transition while the chart computes. This feels broken on slower devices.

2. **Silent error handling**: GPT API failures, invalid inputs, city search failures, and calculation edge cases all fail silently. Users get no feedback when something goes wrong — the app just appears stuck or shows incomplete data.

## Proposed Solution

**Loading**: Add a full-screen celestial loading overlay with:
- Animated zodiac wheel slowly rotating
- Stars fading in/out
- "Calculating your celestial blueprint..." text
- Smooth transition to results when ready

**Errors**: Add a toast notification system for non-blocking errors and a modal for blocking errors:
- Toast: "GPT interpretation unavailable — showing static reading" (dismissible)
- Toast: "City search failed — check your connection" 
- Modal: "Could not calculate chart — invalid date/time combination"
- Confirmation dialog on destructive actions (Clear Cache, Enter New Data)

## Impact & Effort

- **Impact**: HIGH — Loading animation adds perceived quality; error feedback prevents confusion
- **Effort**: Low (2–3 hours total)
- **Dependencies**: None — touches App.tsx and form components

## Implementation Summary

- Create `src/components/ui/LoadingOverlay.tsx` with CSS animation (zodiac wheel spin + starfield)
- Create `src/components/ui/Toast.tsx` — simple notification component with auto-dismiss
- Add loading state transitions in `App.tsx` between form submit and results display
- Wrap GPT calls with try/catch that triggers toast on failure
- Add confirmation dialog to cache-clearing actions
