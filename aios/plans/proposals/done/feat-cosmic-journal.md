# feat-cosmic-journal

**Type:** Feature  
**Originated by:** Jobs, Carmack, Miyazaki, Taleb  
**User guidance:** Come up with ONE big life changing feature idea that is revolutionary for this app that is different from the feature we currently have, but connected to the same World.

---

## Problem / Opportunity

Every feature in the current app generates a reading and then forgets you existed. The natal chart (`src/components/results/ResultsPage.tsx`) computes once. The transit reading (`src/components/results/TransitReadingPage.tsx`) computes for a period. The dream modal (`src/components/dream/DreamModal.tsx`) opens, interprets, closes. The Today page (`src/components/reading/TodayPage.tsx`) resets every morning. After six months of use, the app knows no more about which planetary signatures actually move this specific person than it did on day one.

The product has built a complete cross-discipline foundation — natal chart, transits, solar return, synastry, numerology with sky chart, dream journal, and daily ritual. What it lacks entirely is memory. There is no surface that accumulates across sessions, no place where a user's lived experience and the astronomical record compound into something that grows more valuable over time.

The specific opportunity this creates: every astrology system on earth tells users what the sky means in the abstract. None of them can tell a user what the sky has historically meant for them specifically. The infrastructure to do this is already built — `calculateCurrentPositions(date: Date)` in `src/engine/transits.ts` accepts arbitrary datetimes, `calculateTransitAspects()` works against any natal chart, `calculatePersonalDay()` in `src/engine/numerology.ts` can be extended to accept a target date. What does not yet exist is a surface that makes this infrastructure accumulate — that turns individual readings into a longitudinal record, and that turns a longitudinal record into personal pattern detection.

The Cosmic Journal is that surface. It inverts the app's fundamental orientation: instead of the cosmos telling the user what their life means, the user's own documented life teaches the app which parts of the cosmos speak to them.

---

## Vision

A returning user — someone who has logged thirty or forty life events over three months — opens the Cosmic Journal. At the top of the page, the Pattern Panel speaks first. It reads: "Jupiter has been present at your thresholds. Four of your six breakthrough entries occurred with Jupiter transiting within 8 degrees of your natal Sun. Saturn appeared in five of your seven 'stuck' entries, always in hard aspect to your Moon. Your creative entries cluster under Personal Day 3 and 9." One GPT sentence below: "Your chart shows you expand precisely when expansion is cosmically invited — and you know friction when the sky demands precision from you." The user sits with this for a moment. They have never seen their life described this way. No generic horoscope produced this. Their own data did.

Below the Pattern Panel, the entry list descends in reverse chronology. Each card opens with the first line of what the user wrote — the human register, largest text. Below it, soft glowing tag pills show the event type: Breakthrough, Decision, Grief, Love, Dream, Turning Point, Creative Peak. Below those, in the smallest text, a glyph row reads the sky at that exact moment: ♃ △ ☉ · ☽ Waxing Gibbous · Day 3. Some cards carry a quiet line at the bottom: `☽ A dream lives in this night.`

When a new user opens the journal for the first time, the page is not empty. The center of the screen shows the current sky — moon phase, numerological day, the top active transit — and below it, an invitation: "The cosmos has been moving through your sky for a long time. You can start recording it now." Then, quietly: "Record your first entry."

When the user clicks that invitation or the composer button, something shifts. The background dims slightly. The composer opens full-panel. A single question — not a label, a question — appears above a focused textarea: "What happened?" The date and time fields sit below the textarea, pre-filled to now, editable for past events. As the user adjusts the date, the sky snapshot updates in real-time below the fields — showing the transit glyphs, moon phase, and numerological day for that specific moment. This is the engine already paying attention before the user has finished writing. The submit button says "Record This Moment." Tags are not filled by the user — they are assigned automatically by GPT upon saving, based on the entry's body and the astronomical context.

After saving, the cosmic annotation assembles piece by piece. The personal day number appears immediately — it is a pure synchronous function. Then the moon phase and sign. Then the transit glyphs. Finally, the GPT one-sentence annotation arrives: "Jupiter within 3° of your natal Venus — a day the heart opened." The user has just experienced the cosmos witnessing what they wrote.

This is the feature that makes the app a living personal almanac rather than a reading generator.

---

## Specifications

### 1. Navigation Integration

1.1. A "Journal ✦" button is added to `CachedDataLanding` in `src/App.tsx`, following the same visual pattern as the "Today ✦" button: `background: rgba(201,168,76,0.12)`, `border: 1px solid rgba(201,168,76,0.35)`, `color: '#c9a84c'`, with hover state `rgba(201,168,76,0.22)` / `rgba(201,168,76,0.55)`.

1.2. The Journal button is positioned after the "Today ✦" button and before "Daily / Weekly / Monthly Reading" in the navigation list.

1.3. `AppView` in `src/context/appState.ts` gains a `'journal'` value. The `AppContent` component in `src/App.tsx` renders `<CosmicJournalPage>` when `state.view === 'journal'`.

1.4. The Journal is accessible only from `CachedDataLanding` — it requires an existing chart. No entry point exists in the form wizard or on individual reading pages.

1.5. The Journal page includes a back button labeled "← Back" that dispatches `SET_VIEW: 'form'` to return to `CachedDataLanding`.

---

### 2. Data Model: `JournalEntry`

2.1. The canonical `JournalEntry` interface is defined in a new file `src/components/journal/types.ts`:

```ts
export interface JournalEntry {
  id: string                    // UUID v4, generated at save time
  date: string                  // YYYY-MM-DD (local date of the event)
  time: string                  // HH:MM (24h, local time; defaults to '12:00' if not specified)
  title?: string                // Optional one-line title (max 120 chars)
  body: string                  // Free-text body (optional, but must exist as empty string not null)
  tags: JournalTag[]            // Assigned by GPT; may be empty until annotation completes
  numerologicalDay: number      // Result of calculatePersonalDay(birthDate, entryDate) — stored at write time
  gptAnnotation: string | null  // One-sentence cosmic tag; null until GPT resolves; stored permanently on first generation
  dreamRef: string | null       // localStorage key of linked dream session, e.g. 'dream-session-2025-05-13'; null if none
  createdAt: string             // ISO 8601 UTC datetime of when the entry was created in the app
}

export type JournalTag =
  | 'breakthrough'
  | 'turning-point'
  | 'grief'
  | 'love'
  | 'decision'
  | 'creative-peak'
  | 'dream'
  | 'blocked'
```

2.2. `JournalEntry` does NOT contain a `skySnapshot` field. Per the antifragile storage principle: the astronomical record for a given date and time is fully recomputable from `date` + `time` using `calculateCurrentPositions()`, `calculateTransitAspects()`, and `getMoonSignAndPhase()` with `resolveToUTC(date, time, birthData.city.tz)`. Only irreproducible human content is persisted.

2.3. The `numerologicalDay` field is computed and stored at write time using a corrected `calculatePersonalDay(birthDate, targetDate)` that accepts a second parameter (see spec 11.1). It is not recomputed at read time.

2.4. The `gptAnnotation` field, once set to a non-null string, is never overwritten on subsequent reads or renders. It is a permanent record of the annotation at the moment of first generation.

2.5. The `dreamRef` field is populated at save time by checking `localStorage.getItem(getDreamSessionKey(entry.date))`. If a dream session exists for the entry's date, `dreamRef` is set to that key string. Otherwise it remains `null`. The `getDreamSessionKey(date: string): string` helper is defined in `src/context/appState.ts` (see spec 11.3) and used by both the journal and the dream modal.

2.6. `id` is generated using `crypto.randomUUID()` (available in all modern browsers without a dependency).

---

### 3. localStorage Storage Pattern

3.1. Journal entries are stored in localStorage directly by the journal component — not in `AppState` and not managed through the `appReducer`. This follows the same architectural pattern as dream sessions in `DreamModal.tsx`.

3.2. The localStorage key for the journal entries list is `'cosmic-journal-entries'`. This constant is defined in `src/components/journal/types.ts` as `export const JOURNAL_STORAGE_KEY = 'cosmic-journal-entries'`.

3.3. The stored value is a JSON-serialized `JournalEntry[]`, sorted by `createdAt` descending. The full array is read on component mount and written on every mutation (add, edit, delete).

3.4. Storage reads use `try/catch` with a fallback to `[]`. Writes use `try/catch` with explicit `QuotaExceededError` handling: if the write throws, the journal displays a persistent inline warning banner (not a toast, not dismissable): "Storage is full. Your entry could not be saved. Export your journal to free up space." The warning renders in `bg-red-900/30 border border-red-500/40 rounded-lg p-3` above the entry list.

3.5. On component mount, `navigator.storage.estimate()` is called (async, non-blocking). If `usage / quota > 0.70`, a soft inline warning is shown: "Your storage is over 70% full. Consider exporting your journal." This warning uses `bg-amber-900/20 border border-amber-500/30` and is dismissable per session via local React state.

3.6. A JSON export function is available via an "Export Journal" button in the journal's header area. It uses `URL.createObjectURL(new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' }))` and triggers a download named `cosmic-journal-YYYY-MM-DD.json`. This requires no server, no account, no external dependency.

---

### 4. Entry Composer Flow

4.1. The entry composer opens when the user clicks "Record This Moment" / "Record your first entry" / the compose button (a `+` icon with label in the journal header). On desktop, the entry list slides left and the composer takes the right half of the page. On mobile (`< lg`), the composer takes the full screen.

4.2. On open, the compositor background dims with `bg-mystic-bg/95 backdrop-blur-sm`, and the textarea receives `autoFocus`. No other element is focused on open.

4.3. The composer layout (top to bottom):
- A centered question in `text-mystic-muted/60 text-sm tracking-widest uppercase`: "What happened?"
- A textarea: full-width, `min-h-[120px]`, `bg-transparent border-0 border-b border-mystic-border/50 focus:border-mystic-gold/50 focus:ring-0 text-mystic-text text-base resize-none`, placeholder `"Write freely..."` in `placeholder-mystic-muted/30`.
- Below the textarea, in reduced opacity (`opacity-70`): a date field (`type="date"`, pre-filled to today's date in `YYYY-MM-DD`) and a time field (`type="time"`, pre-filled to the current time in `HH:MM`), on the same row.
- Below the date/time row: a real-time sky preview strip that shows the moon phase glyph, moon sign, numerological day number, and the top 2 active transit glyphs for the selected date/time. This strip updates on every `onChange` of the date or time field. It uses `calculateCurrentPositions` and `getMoonSignAndPhase` called with the resolved UTC datetime. If the user types a date that is invalid or outside a computable range, the strip shows `—` placeholders.
- Below the sky preview: a row of tag pills the user may optionally touch before saving. Tags: Breakthrough · Turning Point · Decision · Love · Grief · Creative Peak · Dream · Blocked. Tags are displayed as outlined pill buttons (`rounded-full border border-mystic-border/50 text-mystic-muted text-xs px-3 py-1`). Selected state: `border-mystic-gold/50 text-mystic-gold bg-mystic-gold/10`. Multiple tags may be selected. Default: none selected. These are the user's suggested tags; GPT may add or reassign after save.
- A "Record This Moment" submit button: full-width, `bg-mystic-gold text-mystic-bg font-heading rounded-lg px-6 py-3 hover:bg-mystic-gold/90 transition-colors`.
- A cancel link below the button: `text-mystic-muted/50 text-sm underline cursor-pointer hover:text-mystic-muted`.

4.4. The optional `title` field is not shown in the composer. If the user's body text contains a first sentence shorter than 80 characters ending in punctuation, it is used as a display title in the entry card; otherwise the first 80 characters of the body are used. This is a display-time computation, not stored.

4.5. On "Record This Moment" click:
- The datetime is resolved to UTC using `resolveToUTC(date, time, birthData.city.tz)` from `src/engine/astronomy.ts`. This uses the user's home timezone from `birthData.city.tz`, which is the known limitation for events during travel.
- `numerologicalDay` is computed synchronously via `calculatePersonalDay(birthData.date, resolvedDate)` using the corrected function signature.
- `dreamRef` is checked via `getDreamSessionKey(date)` against `localStorage`.
- A new `JournalEntry` object is constructed with `id: crypto.randomUUID()`, `createdAt: new Date().toISOString()`, `gptAnnotation: null` (not yet generated), and the user's inputs.
- The entry is prepended to the entries array and saved to localStorage.
- The composer closes. The new entry card appears at the top of the list in a loading state (shimmer skeleton for the glyph row and annotation).

4.6. Immediately after saving, the annotation sequence fires asynchronously:
- The personal day number appears in the card first (already stored synchronously).
- `getMoonSignAndPhase(resolvedDate)` from `src/engine/astronomy.ts` resolves (fast, synchronous-like); the moon phase and sign appear in the glyph row.
- `getTopActiveTransits(chartData, 3, 8, resolvedDate)` resolves (fast); the transit glyphs appear.
- `generateJournalEntryAnnotation()` is called with the GPT API key. When it resolves, `gptAnnotation` is set on the entry, the entry is re-saved to localStorage, and the annotation text appears in the card.

4.7. If no API key is present, steps 1-3 of the annotation sequence still complete (they are local computations). The `gptAnnotation` field remains `null` and the annotation slot in the card shows a quiet placeholder: `"✦ Add an API key to unlock cosmic annotations"` in `text-mystic-muted/40 text-xs`.

4.8. Validation: the submit button is disabled (and `opacity-50`) if `body.trim().length === 0` and `date` is empty. At minimum one of these must be present. An entry with only a date and no body is valid — it logs a moment in time.

4.9. The date field accepts dates from 1900-01-01 to today's date. Future dates are not permitted (`max={today}`). Past dates may be entered freely.

4.10. For retroactive entries (past dates), the sky preview strip updates in real-time as the user adjusts the date, showing the actual sky at that historical moment. This communicates retroactive computation as the app's core premise.

---

### 5. Entry Card Visual Hierarchy (`JournalEntryCard.tsx`)

5.1. The card uses the standard surface treatment: `bg-mystic-surface/50 border border-mystic-border rounded-xl p-5` with `transition-all duration-200`.

5.2. Significance scoring: at display time, compute a significance score from the stored `numerologicalDay` and the recomputed transit aspects for that entry's datetime. Score = count of transit aspects with orb < 2° at the entry's moment, with bonus weight (×2) if the transit involves Sun or Moon. If score > 2, apply `border-mystic-gold/50` instead of `border-mystic-border`. If score > 4, apply `glow-gold` (the existing Tailwind utility used in `CachedDataLanding`). The score computation is lightweight and runs at render time from stored date/time, not from a stored snapshot.

5.3. Three visual registers, top to bottom, with clear typographic separation:

**Register 1 — Human (largest text):**
- Date formatted as `"May 13, 2025"` in `text-mystic-muted/60 text-xs uppercase tracking-widest`.
- First sentence or first 80 characters of `body` in `text-mystic-text text-base leading-relaxed font-medium`. If body is empty, show the date and tags only; the human register shows the date in larger text as the primary identifier.

**Register 2 — Event (medium, accent color):**
- Tag pills rendered as `rounded-full text-xs px-2.5 py-0.5 font-medium`. Tag color behavior:
  - Expansive tags (breakthrough, love, creative-peak): `bg-mystic-gold/15 text-mystic-gold border border-mystic-gold/30`
  - Inward tags (grief, dream, turning-point): `bg-mystic-purple/15 text-mystic-purple border border-mystic-purple/30`
  - Neutral tags (decision, blocked): `bg-mystic-muted/10 text-mystic-muted border border-mystic-border`
- If `gptAnnotation` is non-null, it appears below the tag pills in `text-mystic-muted/80 text-sm italic`.
- If `gptAnnotation` is null and annotation is pending (entry was just created), show a shimmer placeholder `h-4 w-3/4 bg-mystic-surface rounded animate-pulse`.

**Register 3 — Cosmic (smallest text):**
- A glyph row: the top 2-3 active transit aspects at the entry's datetime, rendered as `[transit planet symbol] [aspect symbol] [natal planet symbol]` with orb in parentheses, e.g. `♃ △ ☉ (2.1°)`. This row is recomputed at render time from stored `date` + `time` + `chartData`. Use `getTopActiveTransits(chartData, 3, 8, resolvedDate)` with the corrected date parameter.
- Moon phase name and sign: `☽ Waxing Gibbous · Scorpio` in `text-mystic-muted/50 text-xs`.
- Numerological day: `Day ${numerologicalDay}` with its archetype label from `getInterpretation('personalDay', numerologicalDay)` — the same label used in `TodayPage.tsx`.
- All cosmic register text uses `text-mystic-muted/50 text-xs font-mono`.

5.4. Dream cross-reference: if `dreamRef` is non-null, a final line appears below the cosmic register: `☽ A dream lives in this night.` in `text-purple-400/55 text-xs italic cursor-pointer hover:text-purple-400/80 transition-colors`. Clicking this line triggers opening the dream modal with the `dreamRef` session pre-loaded. The implementation passes `dreamRef` as a prop to `<DreamModal open={true} initialSessionKey={dreamRef} ... />`, requiring `DreamModal` to accept an optional `initialSessionKey` prop that pre-loads a past session.

5.5. Cards are rendered in reverse chronological order by `createdAt`.

5.6. Cards are not expandable or collapsible in this sprint. The full three-register view is always shown. A "Delete" option appears on hover (`opacity-0 group-hover:opacity-100`) as a small `×` icon in the card's top-right corner, requiring a confirmation step (inline within the card, not a modal) before deletion.

5.7. On very small mobile screens (`< sm`), the cosmic register collapses to a single line: `[Moon phase glyph] [moon sign] · Day [N]` with the transit glyphs hidden to avoid overflow.

---

### 6. Entry List Behavior

6.1. The entry list renders below the Pattern Panel. When the Pattern Panel is expanded, the entry list scrolls independently below it.

6.2. The list renders all entries without pagination. Scrolling is the navigation model. If entries exceed 50, a soft virtual scroll strategy should be considered, but simple DOM rendering is acceptable for the initial sprint given the 5MB localStorage constraint that naturally limits entry count.

6.3. No search, filter, or sort UI is provided in this sprint. The list is always reverse-chronological.

6.4. GPT annotation loading is deferred for older entries. On initial journal open: the 5 most recent entries trigger annotation (if `gptAnnotation === null`). Entries below that threshold trigger annotation only when they scroll into the visible viewport. This is implemented via `IntersectionObserver` in `JournalEntryCard.tsx` watching each card's container ref.

6.5. Annotation requests are rate-limited: no more than 2 concurrent GPT annotation calls at any time. A simple in-module counter tracks active requests.

---

### 7. Empty State

7.1. When `entries.length === 0`, the page does not show an empty list container. Instead, the full page area shows a centered composition:
- The current moon phase glyph (large, `text-4xl text-mystic-purple/60`).
- Below it: `Moon in [moonSign] · [phaseName]` in `text-mystic-muted/50 text-sm`.
- Below it: `Personal Day [N]` in `text-mystic-gold/60 font-heading`.
- The top active transit glyph row (if a natal chart is available).
- A spacer, then: `"The cosmos has been moving through your sky for a long time."` in `text-mystic-text/70 text-base text-center max-w-sm mx-auto`.
- Below it: `"You can start recording it now."` in `text-mystic-muted/50 text-sm text-center`.
- A compose button styled as a quiet link-button: `"Record your first entry"` in `text-mystic-gold/70 text-sm underline cursor-pointer hover:text-mystic-gold`.

7.2. The empty state computes and displays the live sky data synchronously (no API key needed — these are local computations). If `chartData` is null (edge case where the user navigates to journal before chart is computed), the transit glyph row is omitted and only the moon phase and personal day are shown.

---

### 8. Pattern Panel (`PatternPanel.tsx`)

8.1. The Pattern Panel is positioned at the top of `CosmicJournalPage.tsx`, above the entry list. It is the first thing the user sees on every journal visit after the journal header.

8.2. Minimum sample gate: the Pattern Panel performs no analysis and shows only an invitation when `entries.length < 5`. The invitation reads: `"Your cosmic patterns will surface after a few more entries."` in `text-mystic-muted/60 text-sm text-center py-6`. No progress indicator, no count. Just the quiet statement.

8.3. Per-tag minimum gate: within the pattern analysis, a given tag group must have at least 8 entries before any pattern for that tag is surfaced. Tag groups with fewer than 8 entries are shown with an invitation: `"3 breakthrough entries logged — patterns emerge at 8."` These sub-threshold groups are shown in the collapsed state of the panel, not in the expanded pattern cards.

8.4. When `entries.length >= 5`, the Pattern Panel is shown. It renders in a card: `bg-mystic-surface/50 border border-mystic-border rounded-xl`.

8.5. Collapsed state (default): the panel shows a single evocative summary line — the strongest computed pattern across all tags, in one sentence. If no tag has reached the 8-entry threshold yet, it shows the most frequent planet-event correlation across all entries regardless of tag, phrased as a discovery rather than a claim: `"Jupiter appears in 4 of your 7 most significant entries."` An expand chevron `▾` is shown on the right.

8.6. Expanded state: shows the full pattern analysis. Each pattern group is rendered as a named pattern card within the panel. Pattern cards contain:
- A heading in `text-mystic-gold font-heading text-sm`: the pattern name, e.g. `"Jupiter at Your Thresholds"`.
- Below the heading: the entry dates where this pattern was present, shown as quiet text: `"May 3 · Aug 11 · Oct 7"` in `text-mystic-muted/60 text-xs`.
- Below the dates: the GPT synthesis sentence for this pattern (see spec 8.9), once loaded. During loading: shimmer placeholder.
- Cards are separated by a `border-b border-mystic-border/30` divider.

8.7. Pattern aggregation algorithm (pure local computation, no GPT):
- For each tag group with >= 8 entries:
  1. Collect all transit aspects for all entries in the group by recomputing `getTopActiveTransits(chartData, 20, 10, resolvedDate)` for each entry's datetime. This is O(n) astronomical computations running in the background after the panel mounts — not blocking the UI. Computations are queued and run sequentially, 1 per 16ms frame, using `requestAnimationFrame` batching.
  2. Count transit planet frequency: for each `TransitAspect`, increment a counter for `transitPlanet`. Result: `Map<PlanetName, number>`.
  3. Count lunar phase frequency: for each entry, compute `getMoonSignAndPhase(resolvedDate).phaseName` and count occurrences. Result: `Map<string, number>`.
  4. Count personal day frequency: use stored `numerologicalDay`. Result: `Map<number, number>`.
  5. A transit planet is considered "meaningful" for a tag if its count >= 40% of the entries in the tag group (threshold: `count / tagGroupSize >= 0.4`).
  6. A lunar phase is considered "meaningful" if its count >= 30% of the entries (threshold: 0.3).
  7. A personal day number is "meaningful" if it appears in >= 35% of entries (threshold: 0.35).
  8. Slow planets (Jupiter, Saturn, Uranus, Neptune, Pluto) that are simultaneously active for all users (i.e., part of a long-running transit affecting many charts) are weighted at 0.6× before the threshold check to reduce false positives. Fast planets (Sun, Moon, Mercury, Venus, Mars) are weighted at 1.0×. Planet speed classification uses `dailyMotion` magnitude available in `TransitPosition`.
  9. Patterns are ranked by (weighted frequency / threshold) descending.

8.8. The Pattern Panel's GPT call (`generateCosmicPatternReading()`) is made once per journal session, on demand, when the user expands the panel for the first time. It is not called on mount or on every visit. The synthesized reading is cached in React component state for the session (not persisted to localStorage — it should regenerate when the user adds new entries).

8.9. `generateCosmicPatternReading()` in `src/services/gptInterpretation.ts` receives as input: the aggregated pattern summary (which planets, which phases, which personal days correlate with which tag groups, with counts), the user's natal chart (for personalization context), and the total entry count. The system prompt instructs: "Do not speak in statistical terms. Speak as if you are reading a person's life, not analyzing their data. Use present tense. Name the pattern as a quality of this person, not as a frequency in their records. Do not use hedged language like 'may suggest' or 'could indicate' — state what the pattern shows." GPT temperature: 0.85. Max tokens: 800.

8.10. If no tag has reached the 8-entry threshold but `entries.length >= 5`, the Pattern Panel expanded view shows a transitional reading: the single most frequent planet across all entries (regardless of tag), rendered as one pattern card with softer language: `"Based on your [N] entries so far..."`.

8.11. The Pattern Panel does not use bar charts, progress bars, ranked numbered lists, or any dashboard-style visualization. It is exclusively prose and named pattern cards.

8.12. The Pattern Panel header uses `text-mystic-muted/60 text-xs uppercase tracking-widest` (not `font-heading`) to differentiate it from the assertive headers of other cards. Suggested header text: `"what the cosmos reveals"`.

---

### 9. GPT Integration

#### 9.1. `generateJournalEntryAnnotation()`

**Purpose:** Produce a single-sentence cosmic annotation for a newly saved journal entry.

**Inputs:**
- `entry.body` (the user's text, may be empty)
- `entry.date` and `entry.time` (for context)
- `entry.numerologicalDay` (already stored)
- The top 3 transit aspects recomputed for the entry datetime (planet-aspect-planet-orb format)
- The moon phase and sign at the entry datetime
- `chartData` natal context (Sun sign, Moon sign, Ascendant)
- `apiKey: string`

**Output:** A single sentence (~20-30 words) naming the most significant cosmic coincidence at the moment of the entry. Example: `"Jupiter within 3° of your natal Venus — a day the heart opened."` The sentence should name a planet, an aspect or proximity, a natal placement, and a human interpretation.

**System prompt instruction:** "Write one sentence (20-30 words) that names the most significant planetary event active at this moment for this person. Reference one transit planet, its relationship to one natal placement, and what that means in plain language. Be specific, not generic. Do not mention astrology as a system. State the fact as if the cosmos simply arranged it."

**Behavior:** Called once, result stored permanently in `entry.gptAnnotation`. Never regenerated for the same entry. Temperature: 0.8. Max tokens: 80.

**Offline behavior:** If no API key, this function is not called. `gptAnnotation` remains `null`. The entry is fully functional without it.

#### 9.2. `generateCosmicPatternReading()`

**Purpose:** Synthesize the aggregated pattern data into named pattern cards with human-voiced text.

**Inputs:**
- An array of pattern summaries: `{ tagGroup: JournalTag, dominantPlanets: string[], dominantPhases: string[], dominantPersonalDays: number[], sampleSize: number, entryDates: string[] }[]`
- `chartData` for natal context (Sun sign, Moon sign, Ascendant, key house rulers)
- `totalEntryCount: number`
- `apiKey: string`

**Output:** An array of pattern readings: `{ tagGroup: JournalTag, heading: string, body: string }[]`. Each `heading` is 3-5 words naming the pattern (e.g. `"Jupiter at Your Thresholds"`). Each `body` is 1-2 sentences naming what the pattern reveals about this person.

**System prompt instruction:** "You are reading a person's longitudinal life record through the cosmos. For each event category listed, write one named pattern with a 3-5 word heading and 1-2 sentences. Do not speak statistically. Speak in present tense. Name the pattern as a quality of this person — not as a count of data points. Use mirror-language: state what the pattern reveals about who this person is, not what their data shows. Do not use the word 'data', 'pattern', or 'trend'. Do not hedge. Write as though you have known this person for years."

**Behavior:** Called once per journal session on first panel expand. Not persisted. Temperature: 0.85. Max tokens: 800.

**Offline behavior:** If no API key, the Pattern Panel shows the aggregated data (planet frequencies, phase frequencies, personal day frequencies) as plain text labels without the GPT synthesis sentences. The pattern cards render with heading only and a placeholder: `"Add an API key to unlock pattern synthesis."` in `text-mystic-muted/40 text-xs italic`.

---

### 10. Engine Fixes Required Before Journal Can Ship

These are not optional enhancements — they are blocking correctness issues.

#### 10.1. `calculatePersonalDay` must accept a target date

**File:** `src/engine/numerology.ts`  
**Current issue:** Line 74 hardcodes `const now = new Date()`. Any journal entry created for a past date will store today's personal day number, not the entry date's personal day number.  
**Required change:** Add `targetDate?: Date` as the second parameter. Internally, replace `new Date()` with `targetDate ?? new Date()`. The existing function signature becomes:
```ts
export function calculatePersonalDay(birthDate: string, targetDate?: Date): number
```
All existing callers pass no second argument and receive today's personal day unchanged.

**Scope:** Also fix `calculatePersonalMonth` if called with a past date (its `currentMonth` parameter already accepts an override but depends on `personalYear` being computed for the right year — verify the chain is correct for past dates).

#### 10.2. `getTopActiveTransits` must accept a date parameter

**File:** `src/engine/transits.ts`  
**Current issue:** Line 397 hardcodes `calculateCurrentPositions(new Date())`. Any sky snapshot computation for a historical journal entry will return today's transits, not the historical transits.  
**Required change:** Add `date: Date = new Date()` as the fourth parameter:
```ts
export function getTopActiveTransits(
  chartData: ChartData,
  maxCount: number,
  maxOrbDegrees: number,
  date: Date = new Date(),
): TransitAspect[]
```
All existing callers pass no fourth argument and receive today's transits unchanged (due to the default value).

#### 10.3. Dream session key constant

**File:** `src/context/appState.ts`  
**Current issue:** The dream session localStorage key format is embedded as a string literal inside `DreamModal.tsx`. The journal's `dreamRef` lookup must reconstruct this key — creating silent coupling. If the format ever changes in `DreamModal.tsx`, the journal cross-reference silently breaks.  
**Required change:** Export `getDreamSessionKey(date: string): string` from `src/context/appState.ts`. Both `DreamModal.tsx` and the journal entry save logic import from this shared location.
```ts
export const DREAM_SESSION_KEY_PREFIX = 'dream-session-'
export function getDreamSessionKey(date: string): string {
  return `${DREAM_SESSION_KEY_PREFIX}${date}`
}
```

#### 10.4. `computeEnergyRating` deduplication

**File:** `src/engine/transits.ts` (extract to), `src/components/reading/DailySnapshotCard.tsx`, `src/components/reading/TodayPage.tsx`  
**Current issue:** The identical `computeEnergyRating` function (12 lines) is defined twice. The journal's `JournalEntryCard.tsx` will be the third consumer.  
**Required change:** Export `computeEnergyRating` from `src/engine/transits.ts`. Remove the local definition from both `DailySnapshotCard.tsx` and `TodayPage.tsx`.

---

### 11. Files to Create

11.1. `src/components/journal/CosmicJournalPage.tsx` — Main journal page. Contains the Pattern Panel (at top), the entry list, the entry composer (as a conditional panel or overlay), and the empty state. Manages: entries array in local state loaded from localStorage, composer open/closed state, pattern panel expand/collapse state.

11.2. `src/components/journal/JournalEntryCard.tsx` — Individual entry card. Props: `entry: JournalEntry`, `chartData: ChartData`, `birthData: BirthData`, `onDelete: (id: string) => void`, `onDreamOpen: (sessionKey: string) => void`. Handles significance scoring, three-register layout, deferred annotation loading via `IntersectionObserver`.

11.3. `src/components/journal/PatternPanel.tsx` — Pattern analysis panel. Props: `entries: JournalEntry[]`, `chartData: ChartData`, `birthData: BirthData`, `apiKey: string`. Manages: expanded/collapsed state, aggregation computation (via `requestAnimationFrame` batching), GPT synthesis state.

11.4. `src/components/journal/types.ts` — TypeScript interfaces (`JournalEntry`, `JournalTag`), constants (`JOURNAL_STORAGE_KEY`), and utility types.

---

### 12. Files to Modify

12.1. `src/context/appState.ts` — Add `'journal'` to `AppView`, export `getDreamSessionKey()` and `DREAM_SESSION_KEY_PREFIX`.

12.2. `src/App.tsx` — Add `'journal'` case in `AppContent` render switch, add Journal button to `CachedDataLanding`.

12.3. `src/engine/transits.ts` — Add `date` parameter to `getTopActiveTransits()`, export `computeEnergyRating()`.

12.4. `src/engine/numerology.ts` — Add `targetDate?` parameter to `calculatePersonalDay()`.

12.5. `src/services/gptInterpretation.ts` — Add `generateJournalEntryAnnotation()` and `generateCosmicPatternReading()`.

12.6. `src/components/dream/DreamModal.tsx` — Accept optional `initialSessionKey?: string` prop to pre-load a specific dream session; import `getDreamSessionKey` from `appState.ts` rather than using a local string literal.

---

### 13. Design System Compliance

13.1. All card surfaces use `bg-mystic-surface/50 border border-mystic-border rounded-xl`.

13.2. Gold accent: `#c9a84c` (Tailwind class `text-mystic-gold`, `border-mystic-gold`, `bg-mystic-gold`).

13.3. Purple accent: `#7c5cbf` (Tailwind class `text-mystic-purple`, `border-mystic-purple`, `bg-mystic-purple`).

13.4. Shimmer skeletons use `bg-mystic-surface rounded animate-pulse` matching the pattern used in `DailySnapshotCard.tsx` and `TodayPage.tsx`.

13.5. All loading spinners use the existing `animate-spin` pattern (`animationDuration: '3s'`) with a glyph — use `✦` for journal loading states.

13.6. Font heading class (`font-heading`) is used for primary headings, page-level titles, and the submit button label. Body text and labels use the default sans-serif.

13.7. The entry composer textarea and all journal inputs must not use native browser focus rings. Use `focus:ring-0 focus:outline-none focus:border-mystic-gold/50` to maintain the dark-themed aesthetic.

13.8. All transitions use `transition-all duration-200` or `transition-colors` matching existing component patterns.

---

### 14. Loading States

14.1. When the journal page is first mounting and entries are being loaded from localStorage (synchronous, near-instant), no loading spinner is shown — the transition is imperceptible. If entries load in under 50ms, show content directly.

14.2. During the cosmic annotation sequence after saving an entry, each piece of the cosmic register appears progressively: personal day first (immediate), then moon phase/sign (~100ms, synchronous computation), then transit glyphs (~200ms, synchronous computation), then GPT annotation (async, variable). The cosmic register slots that are not yet resolved show shimmer skeletons at their expected size and position.

14.3. During Pattern Panel aggregation (the `requestAnimationFrame`-batched transit recomputation for all entries), the pattern cards show shimmer skeletons in their heading and body positions. The panel is not hidden during computation — it is shown in its loading state so the user can see it processing.

14.4. During the GPT synthesis call for the Pattern Panel, the pattern card bodies show shimmer skeletons. Headings (computed locally from the pattern label logic, not from GPT) are shown immediately.

14.5. If the journal page is opened while `chartData` is null (edge case), show a notice: "Open your chart first to unlock the Cosmic Journal." with a "Read My Chart ✦" button dispatching `SET_VIEW: 'loading'`. The journal requires `chartData` to compute sky snapshots.

---

### 15. Offline Behavior (No API Key)

15.1. All core journal functionality works without an API key: composing entries, saving entries, viewing entry cards, viewing the cosmic register (transit glyphs, moon phase, personal day), viewing the Pattern Panel aggregation (local computation only), dream cross-reference, export.

15.2. GPT-dependent features that are absent without an API key: `gptAnnotation` on entry cards, the GPT synthesis sentences in Pattern Panel cards.

15.3. Without an API key, tags on entries remain whatever the user selected in the composer. GPT does not reassign or augment them. This means the Pattern Panel aggregation runs only on user-selected tags, which may be less precise than GPT-assigned tags.

15.4. The absence of an API key is surfaced once, quietly, in the journal header: a small `text-mystic-muted/40 text-xs` note: `"Add an API key for cosmic annotations"` with a link to the API key settings. This note disappears once a key is stored.

---

### 16. Performance Constraints

16.1. The journal page must reach interactive state in under 300ms from navigation click (localStorage read + initial render). No network calls block this.

16.2. The cosmic annotation sequence after saving (steps 1-3, local computations) must complete in under 500ms total. GPT annotation is async and does not block interactivity.

16.3. Pattern Panel aggregation (transit recomputation for all entries) must not block the main thread. All computations are batched via `requestAnimationFrame`, limiting each frame to 1-2 entry computations. For a user with 100 entries, aggregation completes in approximately 1.6 seconds without affecting UI responsiveness.

16.4. The real-time sky preview in the entry composer (updating on date/time change) is debounced at 300ms to prevent astronomical engine calls on every keystroke.

16.5. `IntersectionObserver` for deferred annotation loading uses a root margin of `200px` to begin loading entries slightly before they scroll into view.

16.6. The journal never calls `calculateCurrentPositions()` for all entries simultaneously. All historical sky computations are sequential (Pattern Panel aggregation) or deferred (card rendering via `IntersectionObserver`).

---

### 17. Acceptance Criteria

17.1. A user can log an event for today, see the correct sky snapshot (transits, moon, personal day) for today's date and time appear in the entry card.

17.2. A user can log an event with a past date and see a sky snapshot that is astronomically accurate for that historical moment — not today's sky. Verification: log an entry for a date when a known transit was exact (e.g., a full moon date) and confirm the moon phase matches.

17.3. The `numerologicalDay` stored on a retroactive entry matches the actual personal day for that historical date — not today's personal day. Verification: manually compute `calculatePersonalDay(birthDate, pastDate)` and confirm it matches the stored value.

17.4. If a dream session exists in localStorage for the entry's date, the entry card shows `☽ A dream lives in this night.` and clicking it opens the Dream modal with that session pre-loaded.

17.5. If no dream session exists for the entry's date, no dream cross-reference appears on the card.

17.6. The Pattern Panel does not display any pattern analysis until at least 5 entries exist.

17.7. A specific tag group does not surface in the Pattern Panel's expanded analysis until that tag has at least 8 entries.

17.8. The GPT annotation on a saved entry is written once and never changes on subsequent visits or app reloads. The stored `gptAnnotation` string is shown exactly as originally generated.

17.9. When localStorage is at >70% capacity, a soft warning is shown in the journal UI before any write fails.

17.10. When a `QuotaExceededError` occurs during a journal entry save, a visible, persistent error banner informs the user that the entry was not saved and prompts export.

17.11. The journal is fully functional without an API key: entries can be created, viewed, and the Pattern Panel aggregation (local computation) completes. Only GPT annotations and GPT synthesis are absent.

17.12. The "Export Journal" function downloads a valid JSON file containing all entries with all stored fields.

17.13. All card surfaces, gold/purple accent usage, and shimmer skeleton patterns match the design of `DailySnapshotCard.tsx` and `NumberCard.tsx`.

17.14. The entry composer textarea receives focus automatically when the composer opens. The "Record This Moment" button is disabled when body is empty and date is also empty.

17.15. The Pattern Panel GPT synthesis call fires only when the user expands the panel for the first time in a session — not on page mount, not on every open.

---

## Out of Scope

- Rich text formatting, markdown rendering, or text editing controls in the entry body.
- A "discuss" or chat interface for individual entries.
- Export to PDF, email sharing, or public profiles.
- Entry editing after save (delete and re-create is the model in this sprint).
- A dedicated journal view within the form wizard or chart results pages.
- Notifications or reminders to log events.
- Social features of any kind.
- Full `TransitData` snapshot (ingresses, retrograde table) stored per entry — the journal stores only the date and time, not the computed sky.
- House assignments for transit planets in the sky snapshot — house computation depends on birth time accuracy and adds complexity without proportional value for pattern detection.
- Chiron, asteroids, or points beyond the current `PLANET_NAMES` set in `src/engine/types.ts`.
- A new chart wheel or SVG rendering for the entry moment — the glyph row is the only visual representation.
- Numerology deep-dives from within the journal — personal day is shown as a number and archetype label only. Full numerology suite remains on `NumerologyPage`.
- Timezone selection per entry — home timezone (`birthData.city.tz`) is used for all events. Known limitation, documented but not addressed in this sprint.
- Polar latitude Placidus fallback — the `isFinite(ad)` failure mode in `src/engine/astronomy.ts` is a real issue but is out of scope for this sprint.

---

## Open Questions

1. **Tag reassignment by GPT:** The spec calls for GPT to assign tags automatically on save, with user-suggested tags from the composer as hints. How much weight should the GPT prompt give to user-suggested tags versus free inference from the body? If GPT disagrees with the user's selection, whose tag wins? Current proposal: GPT receives the user-selected tags as context ("user suggests: breakthrough, love") and may confirm or replace them. Stored tags reflect GPT's final assignment.

2. **Pattern Panel session cache invalidation:** The GPT synthesis is cached in React state for the session. If the user adds a new entry and returns to the Pattern Panel within the same session, the cached synthesis reflects pre-entry data. Should the panel show a "New entries since last reading — refresh patterns?" affordance? Or should the cache simply invalidate whenever `entries.length` changes?

3. **Significance scoring for card borders:** The spec (5.2) proposes recomputing transit aspects at render time for significance scoring. For large entry lists, this is O(n) astronomical computations on render. Is an in-memory cache keyed by `entry.id` acceptable, or should significance be computed at save time and stored as a single numeric field in `JournalEntry`? The trade-off: storing a score means it cannot be retroactively recalibrated if the scoring formula changes; recomputing at render is pure and always current.

4. **Retroactive dream cross-reference on historical entries:** When a user logs an event for a past date, `dreamRef` is checked at save time. But dream sessions may be added after the fact too — if the user logs a dream for a date after they've already logged a journal entry for that date, the journal entry's `dreamRef` will remain `null`. Should a background pass on mount check all entries' dates against current dream sessions and update stale `dreamRef` values? Or is "checked once at save time" sufficient for this sprint?

5. **`DreamModal` API change:** The spec requires `DreamModal` to accept an `initialSessionKey` prop to pre-load a past dream session. This is an interface change to an existing component. Does `DreamModal` need a formal review of its session state management to ensure a pre-loaded session doesn't interfere with the "new session" flow? The dream modal's session state is managed internally — passing `initialSessionKey` must not mutate localStorage or create side effects on close.
