# John Carmack — Technical Analysis

Let me be concrete. I've reviewed the codebase. The computation code is solid — the binary search for aspect perfection dates is particularly elegant. The chart rendering is clean. But there are some things that need fixing.

---

## Technical Wins

- The binary search in `transitTimeline.ts` for finding exact aspect perfection dates is the right approach.
- The `calculateTransits` / `calculateSynastry` pipeline is well-structured.
- localStorage caching in `DailySnapshotCard` is done correctly — keyed by Sun longitude + date.

---

## What's Wrong Right Now

**1. TransitSelectScreen and SynastryTransitSelectScreen are 70% duplicate code.**

Look at `App.tsx`. Both components have the same month picker, the same API key input, the same period buttons, the same custom month logic. That's ~200 lines of copy-paste. This creates maintenance debt — any bug or improvement has to be applied in two places. Extract a `PeriodSelectPanel` component and reuse it.

**2. gptInterpretation.ts has 5 near-identical fetch patterns.**

Every function in that file does: `fetch(API_URL, { method: 'POST', headers: ... })`, then checks `!response.ok`, then parses the error, then parses the result. That's identical in all five functions. There should be one `callOpenAI(messages, options)` helper that all five call. This would halve the file's length and centralize error handling.

**3. No retry on transient GPT errors.**

GPT's API throws 429s (rate limit) occasionally, and network timeouts happen. Currently, a single failure destroys the reading and shows an error to the user. A simple exponential backoff retry (3 attempts, 1s/2s/4s delay) would silently handle 90% of these cases. The implementation is straightforward — the retry wrapper can wrap the single `callOpenAI` helper.

**4. No app-level React error boundary.**

One runtime error in any component — a null dereference, a bad type cast — produces a blank white screen. React error boundaries are trivial to add. One `ErrorBoundary` component at the `AppProvider` root, showing a friendly error state, is 30 lines of code and dramatically improves resilience.

---

## Feature Assessments

**Numerology:** Trivially simple calculations. Life Path = reduce(sum of all birth date digits) with the exception for master numbers 11, 22, 33. Birthday number = day of birth reduced. Expression/Soul Urge require a name (Pythagorean letter mapping). The name collection is a UX change but a small one. This is a weekend of work at most.

**Solar Return:** Needs finding the moment Sun returns to natal longitude in the current year. Same bisection search we already use for transit perfection. Then we render the bi-wheel (already built). Then GPT reading. This is a natural extension — probably 2-3 days of focused work.

---

## Priority

Fix the duplicate code and GPT reliability issues first — they make the codebase more maintainable and the product more reliable. Then add numerology (easy win) and solar return (bigger win but uses existing patterns).
