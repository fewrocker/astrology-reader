# John Carmack — Sprint 6 Proposal Voice

Sprint 5 shipped cleanly. Today page is live. Dream resonance is working. The personal day deduplication is done. Good. Now let's talk about Cosmic Journal, because this sprint is technically the most interesting one yet — and it has some real complexity hiding under what looks like a simple CRUD feature.

---

## The Real Technical Problem: Retroactive Sky Computation

The vision describes "real retroactive sky computation" like it's a checkbox. It's not. Let me be precise about what this actually means and where the complexity lives.

The existing `calculateCurrentPositions(date: Date)` in `src/engine/transits.ts` already accepts an arbitrary `Date`. That part works. So does `calculateTransitAspects()`. And `getMoonSignAndPhase()` in `src/engine/astronomy.ts` accepts a `Date`. The engine layer is fine — it's genuinely general-purpose.

The problem is the **timezone conversion for historical dates**. Look at `resolveToUTC()` in `src/engine/astronomy.ts` (line 409). It uses `Intl.DateTimeFormat` to find the UTC offset at a given local datetime. For current dates, this is reliable. For historical dates, it depends on whether the browser's IANA timezone database has accurate historical DST data. Most modern engines do — but this is a silent failure mode: if someone enters an event from 1987 in a timezone that had a DST rule change, the computed UTC moment could be off by an hour. The chart positions will be off by a proportional amount — nothing catastrophic for slow planets, but potentially wrong for the Moon (which moves ~13° per day, so an hour error means ~0.5° Moon position error). This is acceptable for the journal's purpose, but it should be documented, not silently trusted.

The journal entry composer needs to construct a proper `Date` from the user's local date and time fields. The catch is: we don't know the user's timezone for the event. We know their birth city timezone (in `birthData.city.tz`). Do we assume the event happened in their home timezone? Probably yes for most users. But a journal entry from a business trip to Tokyo would be wrong if we apply their Berlin timezone. For sprint 6, assume home timezone for events. Don't over-engineer this — note it as a known limitation.

**Implementation**: In the entry composer, construct the UTC moment via `resolveToUTC()` using `birthData.city.tz` (already imported in App.tsx via birthData). Pass that UTC Date to `calculateCurrentPositions()` and `getMoonSignAndPhase()`. This is a 3-line wire-up. The complexity is in recognizing you need to do it at all.

---

## Data Model: Where Decisions Will Haunt You

The vision proposes this interface:

```ts
{ id, date, time?, title, body, tags, skySnapshot, numerologicalDay, dreamRef? }
```

That's directionally right but underspecified. Let me work through what `skySnapshot` needs to contain for the pattern detection to work, because if you store the wrong things now, you'll have to migrate or recompute everything later when you want to do the analysis.

**skySnapshot must store:**
1. `moonSign: string` — for phase pattern detection
2. `moonPhase: string` — for phase pattern detection  
3. `moonElongation: number` — if you want to group entries by lunar phase with any precision
4. `transitAspects: TransitAspect[]` — the full set computed at entry time, not just top 3. The Pattern Panel needs to aggregate across all aspects, not just the ones that happened to display on the card.
5. The raw `currentPlanets: TransitPosition[]` — or at minimum, each planet's sign and retrograde status. Planet-in-sign patterns over time are meaningful (e.g., "most of my grief entries happen when Saturn is in Capricorn").

If you only store the top 3 aspects for display, you've permanently lost the analytical signal. Store the full set, filter for display. The storage overhead is trivial — 10-20 transit aspects are maybe 2KB of JSON per entry. Even 200 journal entries is 400KB, well within localStorage's 5-10MB limit.

**skySnapshot should NOT store:**
- The full `TransitPosition` planet list with house assignments against natal chart — the natal chart is stable and you can recompute house assignments on read if needed.
- Computed interpretations (GPT annotations are stored separately as `annotation?: string`).

**The `dreamRef` field** — the vision says to check `dream-session-YYYY-MM-DD` in localStorage. That format is already in use by `DreamModal.tsx`. But the key format isn't centralized — it's presumably a string literal somewhere in `DreamModal.tsx`. Before the journal tries to look up dream sessions by date, extract that key format into a shared constant in `appState.ts` or a new `dreamStorage.ts`. Right now you have a hidden coupling: if someone ever changes the dream session key format, the journal link silently breaks and there's no compile-time error.

The `numerologicalDay` field stores a number. Fine. But `calculatePersonalDay()` in `src/engine/numerology.ts` (line 69) has a subtle issue for journal entries: **it hardcodes `new Date()` internally**. For retroactive entries, you need a version that accepts a target date. Right now the function always computes today's personal day regardless of what date you pass it as `birthDate`. 

Look at line 74-79 in `src/engine/numerology.ts`:
```ts
const now = new Date()
const dateStr = `${now.getFullYear()}${...}`
```

This is a bug for the journal use case. You need `calculatePersonalDayForDate(birthDate: string, targetDate: Date): number`. The existing function should probably just delegate to this new one with `new Date()` as the default. One-line change to the engine, but you have to catch it before it ships wrong data into every journal entry.

---

## The Pattern Panel: Aggregation vs. Display

The Pattern Panel is the feature's analytical heart, and it's where complexity can blow up if you don't plan the algorithm clearly upfront.

The natural implementation that will get written first: iterate over all journal entries with a given tag, count occurrences of each aspect type and lunar phase, sort by frequency, render. That's O(n × k) where n is entries and k is aspects per entry. For 200 entries with 15 aspects each, that's 3000 iterations — totally fine, runs in milliseconds.

What will make this feel fake rather than real: displaying raw aspect names as patterns. "Transit Jupiter trine Natal Sun appeared 4 times" is data. But the pattern that matters is higher-level: which transit *planets* correlate with which event types, regardless of specific aspect. Someone who has 6 breakthrough entries, 4 with Jupiter active (conjunction, trine, and sextile mixed), 2 with Saturn — Jupiter is the breakthrough planet for this person. The frequency of the specific aspect type is less meaningful than the planet involved.

**The aggregation I'd implement:**
```
For each tag group:
  1. Planet frequency: count unique transit planets appearing in any aspect across all entries
  2. Lunar phase frequency: count phase names
  3. Personal day frequency: count day numbers
  4. Compute dominant signatures: planet with highest frequency / total entries > 0.4 is "meaningful"
```

The 0.4 threshold is arbitrary — you need *some* threshold or you get false positives with small sample sizes. With only 3-5 entries per tag, every pattern is "meaningful" statistically. The GPT synthesis prompt should include the total count so it can hedge appropriately ("based on your 4 breakthrough entries, there appears to be a tendency...").

The GPT call for pattern synthesis is the **only** expensive operation in the Pattern Panel. Everything else is pure local computation. The pattern detection itself runs without network access. GPT is called once, on demand, with the aggregated data as input — not once per entry. This is the right architecture.

---

## What's Fragile or Poorly Structured Right Now

**1. `AppState` is becoming a God Object.**

Look at `src/context/appState.ts`. The state interface has 25+ fields. Every feature sprint adds more. Right now it's manageable, but Cosmic Journal is going to add `journalEntries: JournalEntry[]` to this object, plus potentially a loading state for pattern GPT calls. At some point this needs to be split — but that refactor is not sprint 6 work. What sprint 6 must not do is add a separate full journal reducer into the same reducer function (already 50 cases). The journal's storage pattern should follow the dream journal's model: **localStorage-direct, not reducer-managed**. Dream sessions aren't in AppState at all. The journal entries shouldn't be either. They load from localStorage on component mount and save there directly. This avoids inflating the already-large reducer.

**2. `computeEnergyRating` is duplicated.**

The exact same function appears in both `src/components/reading/DailySnapshotCard.tsx` (line 29) and `src/components/reading/TodayPage.tsx` (line 49). Sprint 5 fixed the `calculatePersonalDay` duplication; this one was missed. Before the journal's entry card needs an energy rating, extract `computeEnergyRating` to a shared utility — probably `src/engine/transitUtils.ts` or inline in `src/engine/transits.ts` as an exported helper. Both components import from `../../engine/transits` anyway.

**3. `getTopActiveTransits` hardcodes `new Date()`.**

In `src/engine/transits.ts` (line 392-400), `getTopActiveTransits()` always computes for the current moment. For the journal feature, you need to compute for the entry's historical moment. The function should accept a `Date` parameter. The current call sites pass nothing and want current time — make the parameter default to `new Date()`. This is a 2-line change that unblocks the journal without breaking existing usage.

```ts
export function getTopActiveTransits(
  chartData: ChartData,
  maxCount: number,
  maxOrbDegrees: number,
  date: Date = new Date(),  // <-- add this
): TransitAspect[] {
  const positions = calculateCurrentPositions(date)  // use date instead of new Date()
  ...
}
```

**4. The `BODY_MAP` is duplicated between `astronomy.ts` and `transits.ts`.**

Both files define an identical `BODY_MAP: Record<PlanetName, Astronomy.Body>`. This is a classic copy-paste coupling — if a planet name ever changes in `types.ts`, you have to update two places and the compiler won't tell you one of them is wrong. Extract to `src/engine/astronomyBodies.ts` or add to `src/engine/types.ts`. This isn't a sprint 6 blocker, but it's the kind of thing that bites you when you add a new body (Chiron, Ceres) and update one map but not the other.

---

## Performance: What's Brewing

The `detectVoidOfCourse()` function in `src/engine/lunar.ts` (line 57) is doing real astronomical computation in a loop — checking 2-hour intervals for up to 72 steps (3 days), computing 6 planet positions at each step. That's up to 432 planet position lookups per call, each using `Astronomy.GeoVector()`. In practice it terminates early, but worst case on a device without hardware math optimization, this could be 200-500ms.

It's called from `getCurrentMoonPhase()`, which is called from both `DailySnapshotCard` and `TodayPage` on mount. Currently they both call it independently for the same moment. For the journal feature, if someone opens the pattern panel while the entry list is loading, you don't want multiple `getCurrentMoonPhase()` calls in flight.

This won't cause user-visible jank today because it runs once on mount and the result is cached daily in `DailySnapshotCard`. But for the journal, each entry's sky snapshot is precomputed at save time and stored — so `detectVoidOfCourse()` is called exactly once per entry at write time, not at read time. That's the right architecture. The journal entry card renders from stored snapshot data, never recomputes.

The one performance risk I want flagged explicitly: if someone builds the pattern panel by calling `calculateCurrentPositions()` for each historical entry on-the-fly instead of reading from stored snapshots, that's O(n) astronomical calculations synchronously on the main thread when the panel renders. 50 entries would be 50 × (10 planet GeoVector calls each) = 500 astronomical computations. That will freeze for 2-3 seconds. **The fix is to always store the sky snapshot at write time and never recompute it at read time.** This is an architectural discipline thing, not a technical limitation.

---

## Proposals

### Proposal 1: `calculatePersonalDay` for Arbitrary Date (Engine Fix)

**Type:** Issue Fix  
**File:** `src/engine/numerology.ts`  
**Impact:** Blocks correct journal entry annotation

`calculatePersonalDay(birthDate)` reads `new Date()` internally (line 74). For journal entries saved with a past date, this returns today's personal day, not the entry date's personal day. The `NumerologyReading.personalDay` stored on historical entries will be wrong.

Fix: add `calculatePersonalDayForDate(birthDate: string, targetDate: Date): number` that accepts an explicit date. Refactor `calculatePersonalDay` to call it with `new Date()`. The journal entry composer calls `calculatePersonalDayForDate(birthData.date, entryDate)`.

This is a 10-line change that prevents permanent incorrect data in every historical journal entry.

---

### Proposal 2: `getTopActiveTransits` Date Parameter (Code Enhancement)

**Type:** Code Enhancement  
**File:** `src/engine/transits.ts`, line 392  
**Impact:** Required for journal sky snapshot computation

Add a `date: Date = new Date()` parameter to `getTopActiveTransits()` so it can compute transit aspects for historical moments. All current call sites in `TodayPage.tsx` and `DailySnapshotCard.tsx` pass nothing, so default behavior is unchanged. The journal composer passes the entry date to get the historical snapshot.

This is the correct way to make the existing engine work for the journal without duplicating any computation logic.

---

### Proposal 3: `computeEnergyRating` Deduplication (Code Enhancement)

**Type:** Code Enhancement  
**Files:** `src/components/reading/DailySnapshotCard.tsx` (line 29), `src/components/reading/TodayPage.tsx` (line 49), `src/engine/transits.ts`

The function is identical in both components — 12 lines of pure logic mapping aspect scores to label/color tuples. Extract to `src/engine/transits.ts` as an exported function alongside the other transit utilities. Both components already import from that file. The journal's `JournalEntryCard` will also want an energy indicator — this is the third call site that will need it, making the duplication even more wasteful if it's not resolved now.

---

### Proposal 4: Dream Session Key Constant (Issue Fix)

**Type:** Issue Fix  
**Files:** `src/components/dream/DreamModal.tsx`, `src/context/appState.ts`  
**Impact:** Prevents silent breakage of journal ↔ dream cross-reference

The journal's `dreamRef` lookup will need to reconstruct the localStorage key for a dream session by date. If that key format is a string literal embedded in `DreamModal.tsx`, the journal must replicate it — creating silent coupling. Extract `DREAM_SESSION_KEY_PREFIX` (or `getDreamSessionKey(date: string): string`) to `src/context/appState.ts` alongside the other key constants. Both `DreamModal` and the journal's lookup code import from the same place. If the key format ever changes, it changes in one place.

This is a 5-minute fix now versus a subtle bug later when the formats drift.

---

## What I'm NOT Recommending

**Don't add journal state to AppState/appReducer.** The reducer is already handling 50+ actions across 25+ state fields. The journal is a self-contained append-only list of entries. Load on component mount, save on mutation, done. The dream journal proves this pattern works.

**Don't compute sky snapshots lazily.** Some implementation paths will be tempted to store only `{ date, time, tags, body }` and compute the sky data when displaying the Pattern Panel. This is wrong. Astronomical calculations for historical moments must happen once at write time. If someone edits an entry's time field later, recompute then. But the display path must read from storage, not compute.

**Don't build the Pattern Panel as a GPT-first feature.** The pattern aggregation is pure local computation. GPT synthesizes what the computation finds — it doesn't drive it. If you invert this (send all entries to GPT and ask it to find patterns), you'll spend 10x more tokens, lose the ability to work offline, and get hallucinated patterns that don't actually exist in the data. Aggregate locally, send summary to GPT.

**Don't start with the full feature surface.** The entry composer, entry list, sky snapshot computation, and localStorage persistence are the load-bearing floor. The Pattern Panel is the ceiling. Build the floor first and make sure the data model is right before building anything that reads from it.
