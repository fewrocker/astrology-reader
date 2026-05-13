# Sprint 0006 Vision

## Sprint Focus

This sprint builds **Cosmic Journal** — a personal life-event log that maps every moment you mark as meaningful against your natal chart, the sky at that instant, and your active numerological cycle, then over time surfaces the personal cosmic patterns that actually govern *your* life. This is the ONE revolutionary feature: instead of the app telling you what the sky means and trusting you to apply it, you bring your lived data and the app learns which planetary signatures, lunar phases, and numerological windows correlate with your breakthroughs, low points, and turning points — producing an astrology that is calibrated to you, not to the archetype.

## Why Now

The app has completed its foundational cross-discipline suite. Natal chart, transits, solar return, synastry, numerology (with sky chart), and dream journal are all live. The "Today" page established a daily ritual anchor. What the product now lacks is continuity across time — each session is isolated, and nothing accumulates. A returning user who has used the app for six months knows no more about how *their* chart actually operates than they did on day one. Cosmic Journal is the feature that transforms the app from a reading generator into a living personal almanac. It also naturally unifies all three pillars (astrology, numerology, dreams) into a single artifact: every journal entry carries its sky snapshot, its numerological day, and optionally its dream resonance. The infrastructure to compute all three is fully built — this sprint is about creating the surface that makes that infrastructure permanent and accumulating.

## Where to Look

### Pages and views to create
- `src/components/journal/CosmicJournalPage.tsx` — main journal page: entry list, entry composer, pattern analysis panel
- `src/components/journal/JournalEntryCard.tsx` — individual entry with cosmic annotation (date, event type, sky glyph row, numerological day, brief GPT tag)
- `src/components/journal/PatternPanel.tsx` — the "what the cosmos reveals" section: which planet/aspect combos correlate with the user's tagged event types across all entries

### Data and storage
- `src/context/appState.ts` — extend to persist `journalEntries[]` in localStorage alongside `chartData` and `dreamSessions`
- A new `JournalEntry` interface: `{ id, date, time?, title, body, tags, skySnapshot, numerologicalDay, dreamRef? }`

### Engine connections to wire up
- `src/engine/astronomy.ts` — already has `calculateChart`; the sky snapshot at entry date needs `calculateCurrentPositions` (from `src/engine/transits.ts`) and `getMoonSignAndPhase`
- `src/engine/numerology.ts` — `calculatePersonalDay(birthDate)` called with the entry's date, not today
- `src/engine/transits.ts` — `calculateTransitAspects` against natal chart at the entry's datetime

### GPT service additions
- `src/services/gptInterpretation.ts` — add `generateJournalEntryAnnotation()` (a 1-sentence cosmic tag per entry, generated once on save) and `generateCosmicPatternReading()` (takes the full journal as context, surfaces recurring themes across entries — which planet keeps showing up during the user's wins, which numerological days recur at crossroads)

### Navigation
- `src/App.tsx` — add "Journal ✦" button to `CachedDataLanding` alongside Today, Transits, Synastry, Dream, Numerology

## Quality Bar

"Deep, not shallow" for this sprint means:

1. **Real retroactive sky computation** — When the user logs an event with a past date and time, the app runs actual astronomical calculations for that moment (not today's sky). The transit aspects, moon phase, and planet positions shown on the entry card must be genuinely accurate for the recorded moment. The engine already supports arbitrary datetime — the entry composer must pass a `Date` constructed from the entry's date/time fields.

2. **Meaningful pattern detection** — The Pattern Panel must not be a list of entries with a generic message. It must aggregate actual data: across all entries tagged "breakthrough" (or "decision", "grief", "love", "dream"), count which transit aspects were active, which numerological day predominated, which moon phase repeated. The output is a ranked list of cosmic signatures with their frequency and a GPT synthesis that names the pattern plainly ("Your breakthroughs tend to cluster under Jupiter transits and Personal Day 1 or 3 — a pattern of expansion-seeking openings").

3. **Dream cross-reference** — If the user has a dream journal entry from the same date as a life event, the journal entry should optionally show a link: "See also: dream recorded this night." This requires checking the dream session key (`dream-session-YYYY-MM-DD` in localStorage) against the entry date.

4. **Design parity** — Entry cards must follow the exact same surface treatment as `DailySnapshotCard` and `NumberCard`: `bg-mystic-surface/50`, `border border-mystic-border`, `rounded-xl`, gold accents at `#c9a84c`, purple at `#7c5cbf`. The entry composer must feel as intentional as the Form Wizard — not a bare textarea drop-in.

5. **Offline-first, no mandatory GPT** — The journal must be fully functional without an API key. Sky snapshots compute locally. GPT annotations are optional enhancements that appear when a key is present, with the same shimmer skeleton pattern used throughout the app.

## What This Sprint Is NOT

- **Not a transit forecasting tool.** The timeline tab on TransitReadingPage already forecasts future events. Cosmic Journal is retrospective and reflective — it records what happened and annotates it cosmically.
- **Not a diary feature.** The entry body is optional context. The primary value is the cosmic annotation, not the prose journaling. Do not over-engineer rich text, markdown rendering, or export.
- **Not a social or sharing feature.** No sharing, no public profiles, no export to PDF in this sprint. Entries are private, local, localStorage-only.
- **Not a replacement for the Dream Journal.** Dream Journal remains its own modal with its own GPT persona and sky-context flow. Cosmic Journal links to dream entries by date reference but does not absorb them.
- **Not a new chart wheel.** The entry card shows a compact glyph row (planet symbol · aspect symbol · natal planet, top 3 active transits at entry time) — not a full SVG chart render. Chart rendering lives on ResultsPage and SolarReturnPage.
- **Not a numerology deep-dive.** The numerological day shown on each entry is a single number with its archetype label (from `getInterpretation('personalDay', n)`). The full numerology suite remains on NumerologyPage.
