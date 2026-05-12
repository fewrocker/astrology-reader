# John Carmack — Sprint 4 Proposal Voice

Let me look at what's actually in the code.

## Personal Year / Month / Day — already computed, not displayed

`NumerologyPage.tsx` has `calculatePersonalMonth()` and uses `reading.personalYear` from `calculateNumerology()`. Both are computed on render. But they're only used inside `buildNumerologyContext()` to construct a GPT prompt string. The user never sees these numbers in the UI.

This is the lowest-hanging fruit I've seen in a while. The calculation is done. The data is correct. The UI just needs cards. Looking at the numerology engine, I'd add one more function:

```ts
function calculatePersonalDay(birthMonth: number, birthDay: number): number {
  const today = new Date()
  // personal day = reduce(personal month + today's day)
  // but more precisely: reduce(birth_month + birth_day + current_month + current_day + current_year_digits)
}
```

Personal Day = reduce(Birth Month + Birth Day + Current Month + Current Day + Universal Day)
where Universal Day = reduce(current year + current month + current day)

This is a clean pure function, totally testable, no dependencies. It can live in `numerology.ts` alongside the rest.

**Implementation path:** Add `personalDay` to the return of `calculateNumerology()`. Add interpretation entries to `numerologyInterpretations.ts` for personal year (already exists for some), personal month, personal day. Render as cards in NumerologyPage between the core numbers and the chart. Done. Probably 200 lines total.

## Dream journal missing transit context at record time

`DreamModal.tsx` stores entries to localStorage with a timestamp. It does NOT capture the astrological state at time of recording. This is a lossy operation — you can't reconstruct the exact transits retroactively with high precision because the time of the dream entry matters.

What I'd store alongside each dream entry:
```ts
interface DreamEntry {
  id: string
  date: string // ISO timestamp
  title: string
  content: string
  reading: string
  // NEW:
  moonSign?: string     // Moon's current sign at time of recording
  moonPhase?: string    // 'New Moon' | 'Waxing Crescent' | ... | 'Balsamic'
  activeTransits?: Array<{ planet: string; aspect: string; natalPlanet: string }>
}
```

The Moon sign and phase are computable from `astronomy.ts` with just the current timestamp — no birth data required for Moon sign. For active transits, we need the natal chart from context, which is available in AppContext.

The DreamModal already has access to `chartData` via props. Adding the computation there is straightforward:
- `getMoonSign(new Date())` — already calculable from astronomy engine
- `getMoonPhase(new Date())` — computable from Sun/Moon elongation
- Top 3 active transits — filter `calculateTransits(chartData, 'daily')` for tight orb aspects (<2°)

Store these with the entry. Display them as a small "sky at this dream" footer on each dream card.

**Migration concern:** Existing dream entries won't have this data. Handle gracefully with optional fields and a "no sky data available" fallback.

## DailySnapshotCard missing numerology

`DailySnapshotCard.tsx` shows today's sky (Moon position, key transits, active aspect). It gets `chart` as a prop. It doesn't know anything about numerology.

Adding personal day number: pass `birthData` into DailySnapshotCard (it's already available in AppContext where DailySnapshotCard is called from App.tsx and CachedDataLanding). Compute personalDay inside the component or pass it as prop. Add one line to the card: "Personal Day 3 · The Communicator."

This is ~20 lines. The payoff is high — the landing page becomes a genuine daily oracle.

## Complexity summary

- Personal Year/Month/Day cards in Numerology: Low complexity, high value
- Dream transit context at record time: Medium complexity (need to capture + store + display)
- DailySnapshotCard numerology integration: Low complexity
- No new external dependencies needed for any of these

## Build risk

The only real risk is the personal day calculation formula. There are multiple conventions in numerology for personal day calculation. Need to pick one and be consistent. I'd go with the most common: Personal Day = reduce(Birth Month + Birth Day + Universal Day) where Universal Day = reduce(year digits + month + day of current date).

Label overlap on the display (similar to numerology sky chart) is not a concern here — these are text cards, not visual charts.
