# Sprint 0004 Changelog

**Theme:** Daily Practice & Cross-Integration
**Branch:** sprint-0004
**Merged:** master
**Tasks:** 3 delivered / 3 planned

---

## feat: Personal Year, Month, and Day number cards in Numerology

_commit 1ff89b2 — branch sprint-0004-task-0003-feat-personal-year-month-day-numerology_

The numerology engine already computed Personal Year and Personal Month internally but never exposed them in the UI. Personal Day was missing entirely. This release makes all three first-class number cards visible to the user.

**Engine (`src/engine/numerology.ts`)**
- Added `calculatePersonalDay(birthDate: string): number` — standard formula: `reduce(birthMonth + birthDay + universalDay)` where `universalDay = reduce(sum of all YYYYMMDD digits)`. Master numbers 11/22/33 preserved throughout.
- Added `personalDay` to `NumerologyReading` interface and `calculateNumerology()` return value.
- Convention documented in a comment for future maintainers.
- `calculatePersonalMonth` was already exported from the engine; the duplicate local function in `NumerologyPage.tsx` removed.

**Interpretations (`src/data/numerologyInterpretations.ts`)**
- Added `'personalDay'` to `NumerologyCategory` type.
- Added `personalDayInterpretations` with entries for 1–9, 11, 22, 33 — each with archetype label (The Pioneer, The Peacemaker, The Communicator, The Builder, The Explorer, The Nurturer, The Seeker, The Powerhouse, The Sage, The Illuminator, The Master Builder, The Master Healer), 2–3 sentence daily-focused `essence`, a `shadow` caution line, and action-oriented `keywords`.

**UI (`src/components/results/NumerologyPage.tsx`)**
- Personal Year and Personal Month cards moved out of the core numbers section into a new "✦ Your Cycles · Today" section with its own gold divider header.
- Personal Day card added with `accentBadge` prop for gold-tinted "Today" badge.
- `buildNumerologyContext` updated to use `reading.personalMonth` and `reading.personalDay` directly — GPT now receives Personal Day in the context string.
- `personalMonthBadge` useMemo removed (no longer needed).

---

## feat: Sky context on dream journal entries

_commit e542898 — branch sprint-0004-task-0002-feat-dream-sky-context_

The dream journal recorded what a user dreamed but not what the sky looked like at that moment. This release captures the Moon's sign, phase, and top active transits at dream-record time, stores them with the entry, and surfaces them in both the chat display and the GPT interpretation prompt.

**Engine additions**
- `src/engine/astronomy.ts` — added `getMoonSignAndPhase(date: Date)` using `EclipticGeoMoon` + `SunPosition` to derive the Moon's ecliptic sign and 8-phase label from the Sun–Moon elongation angle. Raw elongation stored for future-proofing.
- `src/engine/transits.ts` — added `getTopActiveTransits(chartData, maxCount, maxOrbDegrees)` returning the tightest daily transit aspects at the current moment (uses existing transit engine, filtered by orb ≤ 2° by default).

**GPT enhancement**
- `src/services/gptInterpretation.ts` — extended `getDreamInterpretation` with optional `skyContext` parameter; when present, appended as a "Sky Context at Time of Recording" section to the prompt.

**Dream modal (`src/components/dream/DreamModal.tsx`)**
- Added `SkyContext` interface and `PLANET_GLYPHS` map.
- `DreamSession` gains optional `skyContext` field (fully backward-compatible — old entries render identically).
- On interpret: sky context computed in a try/catch (fail-open — if computation throws, entry saves without skyContext rather than blocking).
- Chat display shows a subtle footer row on the first assistant message when `skyContext` is present, formatted as `☽ {sign} · {phase} · {planet} {aspect} {natal planet}`.
- Session restoration and reset both handle `skyContext` correctly.

---

## code: Personal Day number on Daily Snapshot card

_commit 299d482 — branch sprint-0004-task-0001-code-daily-snapshot-numerology_

The landing page's DailySnapshotCard showed Moon position, transits, and a GPT reading — but nothing numerological. A returning user who wanted their Personal Day had to navigate to the Numerology section separately.

**Changes**
- `src/components/reading/DailySnapshotCard.tsx` — added `birthDate?: string` prop; computes Personal Day locally using `reduceToSingleDigit` from the engine; renders one subtle line `Personal Day N · Archetype` in `text-mystic-gold/70 text-xs` between the pill row and the GPT reading. If `birthDate` is absent the card renders exactly as before.
- `src/App.tsx` — both `<DailySnapshotCard>` invocations (mobile + desktop) now pass `birthData.date`.

---

## Build

All three task branches built with zero TypeScript errors. Final merged `sprint-0004` branch: ✓ built in 8.05s, zero errors.
