# Proposal: Chart Wheel Accessibility & Keyboard Navigation

## Problem / Opportunity

The interactive chart wheel (F5) is entirely mouse-dependent:
- Planet tooltips only appear on hover — invisible to keyboard and screen reader users
- No keyboard navigation to cycle through planets or aspects
- No ARIA labels on SVG elements
- Focus area selection buttons in StepFocus lack proper `aria-label` attributes

These gaps make the app unusable for visually impaired users and difficult for keyboard-only users.

## Proposed Solution

1. **Keyboard navigation for chart wheel**:
   - Tab into the chart, then use arrow keys to cycle through planets
   - Enter/Space to "select" a planet (shows persistent tooltip panel)
   - Escape to deselect

2. **Screen reader support**:
   - Add `role="img"` and `aria-label` to the SVG chart
   - Add `<title>` and `<desc>` to SVG groups for each planet
   - Add `aria-live="polite"` region that announces the selected planet's details

3. **Form accessibility**:
   - Add `aria-label` to focus area buttons in StepFocus
   - Add `<fieldset>` + `<legend>` around focus area group
   - Ensure all form steps have proper label associations

## Impact & Effort

- **Impact**: Medium — Required for inclusivity; minor user base but important for compliance
- **Effort**: Low (2 hours)
- **Dependencies**: F5 (Chart Wheel), F1 (Form)

## Implementation Summary

- Update `ChartWheel.tsx`: add `tabIndex`, `onKeyDown` handler, ARIA attributes to SVG elements
- Add a `selectedPlanet` state with keyboard cycling logic
- Add persistent tooltip panel (below chart) showing selected planet details
- Update `StepFocus.tsx`: wrap in `<fieldset>`, add `aria-label` to buttons
- Add `aria-live` region to `App.tsx` for dynamic content announcements
