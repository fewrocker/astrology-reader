# Code Enhancement: Extract PeriodSelectPanel Component

**Type:** Code Enhancement
**Originated by:** Carmack

---

## Problem

`TransitSelectScreen` and `SynastryTransitSelectScreen` in `src/App.tsx` share approximately 70% identical code:
- The same three period buttons (Today / This Week / This Month) with icons and descriptions
- The same custom month picker (month + year dropdowns + "Read" button)
- The same API key input with "Change API Key" toggle
- The same error display
- The same "Back" button at the bottom

Any bug fix or visual improvement must be applied twice. Any new period option (e.g., "This Year") must be added twice. This is a maintenance trap.

## Why This is a Code Enhancement

This is a structural improvement to code clarity and maintainability, not a visible product change. It makes the codebase easier to extend (adding solar return or new period types in the future), reduces the risk of the two versions diverging, and demonstrates correct React component design.

## Proposed Solution

Extract a reusable `PeriodSelectPanel` component to `src/components/form/PeriodSelectPanel.tsx` with props:
- `title: string` — e.g., "Transit Reading for"
- `subtitle: string` — the person/city label
- `description?: string` — explanatory paragraph
- `periods: PeriodOption[]` — array of `{ id, label, icon, description }`
- `onSelect: (period: TransitPeriod) => void`
- `onCustomMonth: (month: string) => void`
- `onBack: () => void`
- `error?: string | null`
- `accentColor?: 'gold' | 'pink'` — to support the couple variant's pink theme
- `disabled?: boolean`

Both `TransitSelectScreen` and `SynastryTransitSelectScreen` are rewritten to use `PeriodSelectPanel`.

## Impact

**Medium** — cleaner codebase, easier to extend with solar return or future period types
**Effort** — Low-Medium (~1-2 hours of careful component extraction)

## Dependencies

None — pure refactor, no behavior change.

## Implementation Summary

- New file: `src/components/form/PeriodSelectPanel.tsx`
- Modified file: `src/App.tsx` — both TransitSelectScreen and SynastryTransitSelectScreen simplified to use PeriodSelectPanel
- All behavior and styling preserved identically; only structure changes
