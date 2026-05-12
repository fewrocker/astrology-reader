# Sprint 0005 Changelog

Delivered 2026-05-12. Three tasks, all completed.

---

## feat-today-immersive-view

**Task:** sprint-0005-task-0003
**Proposal:** feat-today-immersive-view
**Commits:** 12d4ad5

**Problem:** The returning user's landing screen was a menu of navigation buttons. Every piece of insight the app could offer required the user to make a choice before receiving anything — the opposite of a daily ritual.

**Solution:** Added a dedicated "Today ✦" page as a first-class view. It presents the personal day number (large, gold, centered), the moon phase with emoji and sign, the top 3 active transit aspects with planet glyphs and keywords, a transit energy rating, and an optional GPT morning synthesis that weaves all elements into a 2-3 sentence personalized reading.

**What it is:** A morning ritual destination that summarizes the user's cosmic landscape for today in one beautiful, unhurried screen.

**How to use it:** Tap "Today ✦" from the main landing menu. The page renders immediately with offline data (numerology + moon + transits); the GPT synthesis loads asynchronously if an API key is set.

**Files:** `src/components/reading/TodayPage.tsx` (new, 264 lines), `src/context/appState.ts`, `src/App.tsx`, `src/services/gptInterpretation.ts`

---

## feat-natal-dream-resonance

**Task:** sprint-0005-task-0002
**Proposal:** feat-natal-dream-resonance
**Commits:** 7082c74

**Problem:** Dream journal readings provided generic astrological commentary — all 10 natal planets were sent to GPT as a flat list, with no differentiation between which placements are cosmically relevant to dream life. The AI produced broad readings rather than specifically dreamscape-attentive ones.

**Solution:** Added a "Dreamscape Blueprint" to the dream modal's sky context section. It extracts and surfaces the dreamer's natal placements most relevant to the dream realm: Neptune (sign + house), Moon (sign + house), any 12th house planets, and Pisces Rising. These placements are also prepended to the GPT context with an explicit instruction to foreground them in the interpretation.

**What it is:** A personalized dream nature profile shown in the dream journal, letting users understand why they dream the way they do and making GPT readings specifically attentive to their unconscious blueprint.

**How to use it:** Record a dream in the Dream Journal — after the sky context loads, a "Your dream nature" section appears below the transit aspects showing Neptune placement, Moon sign/house, any 12th house planets, and Pisces Rising if applicable. The GPT interpretation will reference these specific placements.

**Files:** `src/components/dream/DreamModal.tsx` (+95 lines: `DreamscapeBlueprintDisplay` component, `NEPTUNE_HOUSE_NOTES` + `MOON_SIGN_NOTES` lookup tables), `src/services/gptInterpretation.ts` (+38 lines: `buildDreamscapeContext()` helper)

---

## code-personal-day-engine-unification

**Task:** sprint-0005-task-0001
**Proposal:** code-personal-day-engine-unification
**Commits:** 8f5a0cf

**Problem:** `DailySnapshotCard.tsx` contained a local `calculatePersonalDay` function (12 lines) that reimplemented the same logic already exported from `engine/numerology.ts`. Two implementations of the same calculation created a silent maintenance risk.

**Solution:** Removed the local duplicate and replaced the `reduceToSingleDigit` import with `calculatePersonalDay` from `../../engine/numerology`. The call site was unchanged.

**Files:** `src/components/reading/DailySnapshotCard.tsx` (1 insertion, 12 deletions)
