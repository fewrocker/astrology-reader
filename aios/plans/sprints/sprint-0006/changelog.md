# Sprint 0006 Changelog

Delivered 2026-05-13. Six tasks, all completed.

---

## feat-cosmic-journal

**Task:** sprint-0006-task-0006  
**Proposal:** feat-cosmic-journal  

**Problem:** Every session in the app generated a reading and forgot you existed. After six months of use, the app knew no more about which planetary signatures actually move a specific person than on day one. Nothing accumulated.

**Solution:** Built the Cosmic Journal — a personal life-event log that maps every moment the user marks as meaningful against the real sky at that instant, their numerological cycle, and dream journal entries from the same date. A Pattern Panel surfaces recurring cosmic signatures calibrated specifically to the user after sufficient data accumulates (minimum 5 entries to activate, 8 per tag before patterns surface). The app now transforms from a reading generator into a living personal almanac.

**What it is:** A full journal page ("Journal ✦") with: a composer that opens textarea-first and shows a live sky preview as you adjust the entry date; entry cards organized in three visual registers (human text largest, tags + GPT annotation middle, cosmic glyphs + moon + numerological day smallest); and a Pattern Panel at the top that names the recurring planetary signatures behind your documented life moments. GPT annotations are one-sentence cosmic tags assigned at save time, stored permanently, never regenerated. Dream cross-references appear as "☽ A dream lives in this night." for entries whose date matches a dream session.

**How to use it:** Tap "Journal ✦" from the main landing menu after entering your chart. Click "Record a moment" to open the composer, write what happened, adjust the date if it was in the past, and tap "Record This Moment." The sky assembles around your entry automatically — correct for the historical moment you recorded, not for today.

**Files:** `src/components/journal/CosmicJournalPage.tsx` (new), `src/components/journal/JournalEntryCard.tsx` (new), `src/components/journal/PatternPanel.tsx` (new), `src/components/journal/types.ts` (new), `src/services/gptInterpretation.ts` (+`generateJournalEntryAnnotation`, `generateCosmicPatternReading`), `src/context/appState.ts` (+`'journal'` view, `DREAM_SESSION_KEY_PREFIX`), `src/App.tsx` (+Journal nav button)

---

## issue-localstorage-quota-guard

**Task:** sprint-0006-task-0001  
**Proposal:** issue-localstorage-quota-guard  

**Problem:** All 7 localStorage write sites in the app (5 in appState.ts, 1 in DreamModal.tsx, 1 in DailySnapshotCard.tsx) swallowed `QuotaExceededError` silently — users lost saved data without any indication.

**Solution:** Created `src/utils/storage.ts` with `isQuotaError()`, `estimateStorageUsage()`, and `exportAllLocalStorage()`. All 5 save functions in appState.ts now fire an `onQuotaError` callback when quota is exceeded, dispatching `SET_STORAGE_WARNING` through the reducer. A gold/dark themed `StorageWarningBanner` component mounts at the top of the page with a "Export my data" JSON download button and a dismiss action. Dream modal surfaces quota errors in its existing error display. Daily snapshot cache downgrades to a `console.warn`.

**Files:** `src/utils/storage.ts` (new), `src/components/StorageWarningBanner.tsx` (new), `src/context/appState.ts`, `src/App.tsx`, `src/components/dream/DreamModal.tsx`, `src/components/reading/DailySnapshotCard.tsx`

---

## issue-numerology-engine-historical-date

**Task:** sprint-0006-task-0002  
**Proposal:** issue-numerology-engine-historical-date  

**Problem:** `calculatePersonalDay()`, `calculatePersonalMonth()`, `calculatePersonalYear()`, and `calculateNumerology()` all hardcoded `new Date()` internally — any call intended to compute a historical date returned today's personal cycle numbers instead.

**Solution:** Added `targetDate?: Date` optional parameter (default: `new Date()`) to all four functions. Zero breaking changes to existing callers. The Cosmic Journal composer now passes the entry's resolved date to get the correct numerological day for that specific moment in the user's past.

**Files:** `src/engine/numerology.ts` (10 lines changed)

---

## issue-placidus-polar-latitude-failure

**Task:** sprint-0006-task-0003  
**Proposal:** issue-placidus-polar-latitude-failure  

**Problem:** `placidusCusp()` in `astronomy.ts` silently failed for users born above ~60°N latitude (Helsinki, Oslo, Stockholm, Anchorage). When `Math.asin()` returned `NaN`, the function broke its iteration and returned an unconverged equal-arc guess — silently wrong house assignments for all 8 intermediate cusps, with no indication of degradation.

**Solution:** `placidusCusp()` now returns `number | null` on iteration failure. `calculatePlacidusHouses()` detects null returns and falls back to Whole Sign houses. `ChartData` now carries `houseSystem: 'placidus' | 'whole-sign'`. When Whole Sign is active, a muted italic note appears in the Houses section: "House cusps use Whole Sign system (birth latitude above 60°N — Placidus undefined at this latitude)."

**Files:** `src/engine/astronomy.ts`, `src/engine/types.ts` (+`houseSystem`), `src/App.tsx`, `src/components/reading/ReadingDisplay.tsx`

---

## issue-transit-historical-date-parameter

**Task:** sprint-0006-task-0004  
**Proposal:** issue-transit-historical-date-parameter  

**Problem:** `getTopActiveTransits()` called `calculateCurrentPositions(new Date())` unconditionally — any code calling it for a historical datetime silently received today's transit aspects instead of the aspects at the target moment.

**Solution:** Added `date?: Date` optional fourth parameter, defaulting to `new Date()`. Internal call now uses `calculateCurrentPositions(date ?? new Date())`. All existing callers are unaffected. The Cosmic Journal's entry card now passes the entry's datetime to get the correct historical transit aspects.

**Files:** `src/engine/transits.ts` (2 lines changed)

---

## code-energy-rating-deduplication

**Task:** sprint-0006-task-0005  
**Proposal:** code-energy-rating-deduplication  

**Problem:** The `EnergyRating` interface and `computeEnergyRating` function were duplicated verbatim between `DailySnapshotCard.tsx` and `TodayPage.tsx`. The Cosmic Journal entry card would have made it a third copy.

**Solution:** Moved `EnergyRating` and `computeEnergyRating` to `src/engine/transits.ts` (exported). Removed both local definitions and updated both component imports. Zero logic changes.

**Files:** `src/engine/transits.ts` (+exports), `src/components/reading/DailySnapshotCard.tsx` (-local definition), `src/components/reading/TodayPage.tsx` (-local definition)
