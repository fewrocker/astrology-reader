# feat-personal-year-month-day-numerology

**Type:** Feature
**Originated by:** Jobs + Carmack + Miyazaki + Taleb (unanimous — all four voices flagged this)

---

## Problem or Opportunity

The numerology engine already computes Personal Year and Personal Month (inside `calculateNumerology()` and `calculatePersonalMonth()` in `NumerologyPage.tsx`), but these values are only passed to GPT as invisible context — they are never shown to the user in the UI. A Personal Day calculation is equally straightforward but currently missing entirely.

These three time-based numbers are the numerology features that create a *daily reason to return to the app*. Life Path, Expression Number, Soul Urge — these never change. Personal Year changes annually, Personal Month monthly, Personal Day daily. They transform numerology from a static self-portrait into a living daily oracle.

Right now users receive GPT interpretations that reference their Personal Year without ever seeing what that number actually is. This is a fundamental gap between what the system knows and what the user can see.

---

## Proposed Solution

1. **Add `personalDay` to `calculateNumerology()` return value** — compute Personal Day using the standard convention: `reduce(birthMonth + birthDay + universalDay)` where `universalDay = reduce(currentYear + currentMonth + currentDay)`. Handle master numbers (11, 22, 33) correctly.

2. **Add interpretation entries** for Personal Year (1–9, 11, 22, 33), Personal Month (1–9, 11, 22, 33), and Personal Day (1–9, 11, 22, 33) to `numerologyInterpretations.ts`. Each needs a brief archetype label ("The Pioneer," "The Builder," etc.) and 2–3 sentences of interpretation.

3. **Add a "Cycles" section to NumerologyPage** — after the core number cards and before the Sky Chart, render a visually distinct group labeled "Your Cycles Today" (or "Living Numbers") containing three cards: Personal Year, Personal Month, Personal Day. Personal Day gets the most visual prominence since it changes daily and creates urgency.

4. **Visual treatment** — same card design as existing number cards (golden number, glyph treatment for master numbers, expandable interpretation). Add a subtle "resets in X days" or "current month" badge on the Personal Month and Personal Year cards to communicate their temporal nature.

5. **Consistency check** — ensure the Personal Month calculation in `buildNumerologyContext()` (GPT context) matches the new displayed value exactly. Currently the two could diverge if the calculation convention changes.

---

## Why this is a Feature, not a Code Enhancement

This adds new, user-visible, daily-updating content that changes the fundamental value proposition of the numerology section. The calculation existed only as an implementation detail; the user experience is entirely new.

---

## Impact / Effort

- **Impact:** High — turns numerology from a static reading into a daily practice
- **Effort:** Low–Medium — calculations mostly exist, main work is interpretation copy and UI cards

---

## Dependencies

- `src/engine/numerology.ts` — add `personalDay` field
- `src/data/numerologyInterpretations.ts` — add personal year/month/day interpretation sets
- `src/components/results/NumerologyPage.tsx` — add new card group

---

## Implementation Summary

Key files to modify:
- `src/engine/numerology.ts` — add `calculatePersonalDay(birthDate: string): number`, update return type
- `src/data/numerologyInterpretations.ts` — add `'personal-year'`, `'personal-month'`, `'personal-day'` categories with 1–9 + master number entries
- `src/components/results/NumerologyPage.tsx` — add "Living Numbers" section with Personal Year, Month, Day cards; sync `buildNumerologyContext()` to use shared calculation

**Taleb's concern to address:** Store personal day convention explicitly (in a comment in the engine) so future changes don't silently break consistency. Test edge cases: birthdays on 29–31, months/days summing to master numbers.
