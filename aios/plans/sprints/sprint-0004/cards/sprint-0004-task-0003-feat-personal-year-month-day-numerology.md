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

1. **Add `personalDay` to `calculateNumerology()` return value** — compute Personal Day using the standard convention: `reduce(birthMonth + birthDay + universalDay)` where `universalDay = reduce(currentYear_digits + currentMonth + currentDay)`. Handle master numbers (11, 22, 33) correctly throughout the chain.

2. **Add interpretation entries** for Personal Year (1–9, 11, 22, 33), Personal Month (1–9, 11, 22, 33), and Personal Day (1–9, 11, 22, 33) to `numerologyInterpretations.ts`. Each needs:
   - A brief archetype label ("The Pioneer," "The Peacemaker," etc.)
   - 2–3 sentences of brief interpretation
   - 4–6 sentences of detailed/expanded interpretation (for card expansion)

3. **Add a "Living Numbers" section to NumerologyPage** — after the core number cards and before the Sky Chart, render a visually distinct group labeled "Your Cycles · Today" containing three cards: Personal Year, Personal Month, Personal Day. Personal Day gets most visual prominence since it's the most time-sensitive.

4. **Visual treatment** — same card design as existing number cards (large golden number, glyph treatment for master numbers, expandable interpretation). Add subtle time context badge: "This year" on Personal Year card, "This month" on Personal Month card, "Today" on Personal Day card. These badges communicate the temporal nature of the numbers.

5. **Consistency sync** — update `buildNumerologyContext()` in `NumerologyPage.tsx` to use the same `calculatePersonalDay` function (instead of the duplicated `calculatePersonalMonth` logic currently in that file), ensuring GPT context and displayed values always match.

6. **Export `calculatePersonalDay`** from the numerology engine so `DailySnapshotCard.tsx` (the `code-daily-snapshot-numerology` sprint task) can import and use it.

---

## Why this is a Feature, not a Code Enhancement

This adds new, user-visible, daily-updating content that changes the fundamental value proposition of the numerology section. The calculation existed only as an implementation detail; the user experience is entirely new.

---

## Impact / Effort

- **Impact:** High — turns numerology from a static reading into a daily practice; gives users a daily reason to return
- **Effort:** Low–Medium — calculations mostly exist, main work is interpretation copy and UI cards

---

## Dependencies

- `src/engine/numerology.ts` — add `personalDay` field and expose `calculatePersonalDay` / `calculatePersonalMonth` as standalone exports
- `src/data/numerologyInterpretations.ts` — add `'personal-year'`, `'personal-month'`, `'personal-day'` interpretation categories
- `src/components/results/NumerologyPage.tsx` — add "Living Numbers / Your Cycles" card group

---

## Implementation Summary

Key files to modify:
- `src/engine/numerology.ts`:
  - Extract `calculatePersonalMonth` out of `NumerologyPage.tsx` into the engine
  - Add `calculatePersonalDay(birthDate: string): number` — standard convention: `reduce(birthMonth + birthDay + universalDay)` where `universalDay = reduce(year + month + day of current date)`
  - Add both to `calculateNumerology()` return value: `{ ..., personalYear, personalMonth, personalDay }`
  - Export as standalone named functions for use by DailySnapshotCard
  - Handle master numbers (11, 22, 33) — never reduce below these

- `src/data/numerologyInterpretations.ts`:
  - Add three new categories: `'personal-year'`, `'personal-month'`, `'personal-day'`
  - Each: entries for 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33
  - Each entry: `{ brief: string, archetype: string, detail: string }` (matching existing format)

- `src/components/results/NumerologyPage.tsx`:
  - Add "Your Cycles · Today" section between core numbers and sky chart
  - Render PersonalYear, PersonalMonth, PersonalDay as NumberCard components (or styled similarly)
  - Add time-context badge to each card
  - Remove duplicated `calculatePersonalMonth` function (now in engine)
  - Update `buildNumerologyContext()` to use engine functions

**Taleb's concern to address:** Document the personal day convention in a comment in `numerology.ts`. Test edge cases: birthday on Feb 29, months summing to 11/22, years where personalYear is a master number.
