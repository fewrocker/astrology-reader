# Nassim Taleb: Sprint 0022 — Fragility Analysis

You have built a system that works beautifully in the middle of the distribution and is systematically blind to the tails. Let me show you what breaks.

---

## The Core Problem: A Single External Process Owns Your Product's Value Proposition

The central fragility is not any individual bug. It is this: every piece of interpretive text that gives this product its soul — every "Morning Synthesis," every transit reading, every synastry interpretation — flows through a single synchronous call to OpenAI's API in `server/services/gpt.ts`. When that call succeeds, the product works. When it fails for any reason — rate limit, OpenAI outage, network partition, token budget exceeded, model deprecation — the user sees either a silent skeleton or a generic fallback string.

You have mistaken availability for resilience. OpenAI has had multi-hour outages. The `retryWithBackoff` function in `server/services/gpt.ts` retries three times with exponential backoff — but retries on the same provider that is already down. Three retries against a dead endpoint are not resilience; they are a more expensive form of failure. The correct architecture separates "does the feature work" from "is OpenAI up right now." Today, those are identical.

Everything built in sprints 0018–0021 — the advance engine, the scoring system, the house-anchored interpretation tables — runs locally in the browser and is robust. The reading surfaces themselves are fragile. This is the hidden single point of failure that four sprints of advance engine work has made more invisible, not less.

---

## Proposal 1 — Issue Fix: The `advance-today-signal` localStorage Key Is Written Without Schema Validation on Read and Is Corruptible

**Files:** `src/components/reading/AdvanceTab.tsx` (line 1319), `src/components/reading/DailySnapshotCard.tsx` (line 109)

The `advance-today-signal-{YYYY-MM-DD}` mechanism writes a JSON string to localStorage inside a `startTransition` callback. The read in `DailySnapshotCard.tsx` at line 109 does `JSON.parse(raw)` and casts directly to `{ category: MarkerCategory; intensity: number; reason: string }` without validating the shape.

If `raw` parses to a malformed object — for instance, because a prior partial write or a future schema change left a different structure — the component receives an object where `category` is an unrecognized string. The rendering logic uses `CATEGORY_LABELS[advanceSignal.category]` (line 271), which does a keyed lookup on `MarkerCategory`. An unrecognized key produces `undefined`, which renders as nothing. The badge silently vanishes. No error, no indication to the user or developer that the signal read corrupted state.

More dangerously: the same key pattern is cleaned up opportunistically by removing "yesterday's" key at line 123. This cleanup uses `yesterday.toISOString().split('T')[0]`, which returns the UTC date. But the `todayStr` on line 107 also uses `toISOString().slice(0, 10)` — UTC. Both sides use UTC, which is consistent. However, `AdvanceTab.tsx` writes the key using `new Date().toISOString().split('T')[0]` (line 1313) — also UTC. This is coincidentally safe only because all three sites use `toISOString()`. If any site ever switches to a local-date method for any reason, the key written and the key cleaned up will diverge for users in non-UTC timezones, leaving stale advance signals displayed indefinitely.

The `isQuotaError` guard at the write site logs a warning but does not clear a potentially stale key. A user with nearly-full storage gets no signal and no explanation.

**Fix:** Validate the parsed object's `category` field against the set of known `MarkerCategory` values before trusting it. If validation fails, remove the key. Add a comment at every site that reads or writes this key requiring `toISOString()` for date extraction, not local-date methods.

---

## Proposal 2 — Issue Fix: `DailySnapshotCard` Cache Key Uses `toFixed(0)` — Two Charts Can Share the Same Cached GPT Text

**File:** `src/components/reading/DailySnapshotCard.tsx` (line 82)

```ts
return `${CACHE_PREFIX}${sun?.longitude?.toFixed(0)}-${today}`
```

`toFixed(0)` rounds the Sun's longitude to the nearest integer degree. The Sun moves approximately 1° per day. Two people born on consecutive days — or in the same day in different years when the Sun is near a degree boundary — get colliding cache keys and receive each other's GPT-generated morning snapshot. The snapshot prompt includes Sun, Moon, and Ascendant natal positions in the text sent to GPT. User A reads User B's personalized reading. Neither knows.

The Ascendant is not included in the cache key at all. Two people with identical Sun longitudes but different Ascendants — which changes the entire house context — get the same cached text.

This is the exact class of precision bug fixed in the advance snapshot cache in sprints 0019 and 0020 (`toFixed(4)`, including Ascendant and Midheaven in the fingerprint). The `DailySnapshotCard` was not updated to match the pattern that was established as correct.

**Fix:** Fingerprint the cache key with `sun?.longitude?.toFixed(4)` plus Ascendant sign and Moon sign — matching the chart-identity approach proven correct for advance snapshots.

---

## Proposal 3 — Code Enhancement: `advanceSnapshotSessionCache` Is an Unbounded Module-Level Singleton

**File:** `src/components/reading/AdvanceTab.tsx` (line 128)

```ts
export const advanceSnapshotSessionCache = new Map<string, AdvanceSnapshot[]>()
```

The LruMap fix from sprint-0021 capped the four `useRef<Map>` caches inside components. This module-level singleton — the one that `TodayPage` reads from to display the advance banner — is still a bare `Map` with no size bound and no eviction.

An extended session with multiple charts across multiple periods accumulates snapshot arrays indefinitely. Each `AdvanceSnapshot` carries full `transitPlanets`, `housedTransitPlanets`, and `transitAspects` arrays. Nine combinations (three charts × three periods) at 30–36 snapshots each is a non-trivial heap footprint that grows for the lifetime of the browser tab.

More practically: `TodayPage` reads this cache at line 71 by iterating all entries and scanning for a key prefix match. This is an O(n) iteration over the entire cache on every TodayPage mount. At a small session it is invisible. At a session where the user has visited Advance tabs for multiple charts, this scan touches every stored snapshot array. That is an O(n) scan in a component that mounts on every daily-use session open.

**Fix:** Convert `advanceSnapshotSessionCache` to an `LruMap` with cap 6 — matching the component-level caches. This is one character change: `new LruMap<string, AdvanceSnapshot[]>(6)`. Export it with the same type. The LruMap is already imported in `AdvanceTab.tsx`.

---

## Proposal 4 — Issue Fix: `ErrorBoundary.handleStartOver` Calls `localStorage.clear()` — This Destroys Journal Data Without Warning

**File:** `src/components/ErrorBoundary.tsx` (line 28)

```ts
handleStartOver = () => {
  localStorage.clear()
  window.location.reload()
}
```

The ErrorBoundary is activated by rendering errors. These can be caused by corrupted cached values — a malformed cached chart result or a stale JSON structure from a schema change — and calling "Start Over" is the expected user action. The problem is that `localStorage.clear()` deletes everything, including journal entries that are also stored in localStorage (`journal-*` keys in `src/components/journal/types.ts`). Entry sync to the server is best-effort and asynchronous. For an unauthenticated user, or an authenticated user whose last sync failed silently, "Start Over" after a rendering error causes permanent, silent data loss of the journal.

The banner says "Your chart data is safe." This is false when `localStorage.clear()` is the next instruction.

**Fix:** Replace `localStorage.clear()` with targeted removal of the known chart cache keys: `astral-chart-results`, `astral-chart-transit-results`, `astral-chart-synastry-results`, and the `daily-snapshot-` prefix. Preserve all keys that begin with `journal-`, `dream-session-`, and `astral-chart-birth-data`. Update the message to reflect what is actually being cleared.

---

## Proposal 5 — Feature: `callProxy` Has No Request Timeout — OpenAI Latency Can Hang the UI Indefinitely

**File:** `src/services/gptInterpretation.ts` (line 62), `server/services/gpt.ts` (line 65)

The `fetch('/api/gpt/interpret', ...)` call in `callProxy` has no `AbortController` timeout. OpenAI's API, under load, can take 30–90 seconds to respond for complex prompts with full natal chart context. The `retryWithBackoff` wrapper in `server/services/gpt.ts` retries three times — meaning a single user action can spend 90+ seconds in progressively longer timeouts before failing.

The user sees the `GptSkeleton` loading state with "Reading today's sky for you..." indefinitely. There is no maximum wait time, no retry button that appears after a threshold, and no fallback text. In the failure case — a hanging connection that never resolves — the component is trapped in loading state for the entire session.

The server has the same problem: `callOpenAI` calls the OpenAI SDK with no `timeout` option in the client constructor (line 65: `new OpenAI()`). The OpenAI Node SDK accepts `timeout` and `defaultHeaders` in the constructor. Without a timeout, a single network partition at the OpenAI edge can hold a server worker for the full Node.js connection timeout.

**Fix:** Add an `AbortController` with a 30-second timeout to `callProxy` in `gptInterpretation.ts`. Pass the signal to `fetch`. Add `timeout: 30000` to the `OpenAI` constructor in `server/services/gpt.ts`. Surface timeout as a distinct user-facing error — "The reading took too long — try again" — separate from the generic server error string.

---

## Proposal 6 — Code Enhancement: `calculatePersonalDay` and the Today Synthesis Prompt Both Compute "Today" Independently Using Different Timezone Anchors

**Files:** `src/engine/numerology.ts` (line 74), `server/services/gpt.ts` (line 585)

`calculatePersonalDay` in the client uses `new Date()` with local time methods `getFullYear()`, `getMonth()`, `getDate()` — so it returns the user's local date. The server-side `handleTodaySynthesis` builds the date header with:

```ts
const today = new Date().toLocaleDateString('en-US', {
  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
})
```

This uses the server's system timezone, not the user's. The server also runs `calculatePersonalDay(birthCtx.birthDate)` at line 577 using `new Date()` — again the server's local clock. If the server is in UTC and the user is in UTC+9, the server computes "Thursday May 22" while the user's browser computes "Friday May 23." The server verification logs a `console.warn` and uses the server-computed value in the GPT prompt — generating a morning synthesis for the wrong day.

This is not a theoretical tail risk. It is a daily occurrence for users in Asia and Australia during the UTC morning hours. The synthesis says "today is Thursday" when the user is already in Friday.

**Fix:** Pass the client's local date string (`YYYY-MM-DD`) in the `today-synthesis` payload. The server should accept and use this date string for both the prompt header and the personal day computation. The local date is not sensitive.

---

## Proposal 7 — Code Enhancement: The GPT Error Surface Is Magic-String Equality — Cached Error Strings Become Indistinguishable From Valid Content

**Files:** `src/services/gptErrors.ts`, `src/services/gptInterpretation.ts` (15 call sites)

The error detection system works as follows: GPT functions return `string` in both success and failure cases. Callers distinguish errors from content by calling `isGptError(text)`, which checks membership in a `Set` of four hardcoded strings. Those strings are also stored in localStorage as cached GPT results.

If the string for `GPT_SERVER_ERROR` is ever changed — which it cannot be safely, because "preserved for backward compatibility" is the stated reason for keeping it — users with the old string in their cache will have it rendered as a successful reading. If a new error condition is introduced and its string is not added to the `GPT_ERROR_STRINGS` set, it renders as content.

There are 15 sites in `gptInterpretation.ts` that return `err instanceof Error ? err.message : GPT_SERVER_ERROR`. Each is a place where a future developer makes a different choice about which string to return. The `RateLimitError` demonstrates the correct architecture — a typed error class that callers catch explicitly. Only `RateLimitError` is structured this way.

**Fix:** Sprint 0022 touches `gptInterpretation.ts` to enrich the Today synthesis prompt. When modifying that function, do not add a 16th magic-string error site. Instead, `getTodayPageInterpretation` should follow the `RateLimitError` pattern: throw a typed error on failure, let the caller handle rendering. This converts one function from string-sentinel to typed-throw. Mark the remaining 14 sites with a comment indicating migration target.

---

## Proposal 8 — Feature: Transit Timeline Event Cards Show Generic Briefs on Advance-Scored Days — The Header Label and the Content Are Disconnected

**Files:** `src/components/reading/TransitTimeline.tsx` (line 36), `src/data/interpretations/transitEvents.ts`

The transit Timeline receives `scoreByDate: Map<string, MarkerCategory>` from `TransitReadingPage` and uses it to override the day-level header badge with the authoritative advance category. This is correct as far as it goes. But within that same day's expanded event cards, `getPersonalizedEventBrief` is called with `aspectType`, `secondPlanet` (the natal planet), and `natalHouse` — and returns a generic one-line phrase from a lookup table. The event card has no awareness of the day's advance category.

A user opens a "◆ Favorable Window" day in the Timeline — this label came from the advance engine scoring a Jupiter-to-natal-Venus trine as favorable. They expand the event card for that aspect. The card shows: "Jupiter trine natal Venus — ease in relationships and finances." The day header says "Favorable Window." But the card never says why this makes the window favorable, which house axis is activated, or what the advance engine specifically identified. The connection between the badge and the content is absent.

The sprint 0022 vision already identifies routing aspect-perfection event briefs through `computeTransitAspectBrief`. The additional step — which costs nothing given that routing — is to pass the advance category as an optional `dayCategory` argument into the brief generation, allowing the brief to shade its language when it knows the day has been authoritatively scored. "Jupiter opening toward your Venus in your 7th house (partnership) — the advance engine identifies today as a favorable window; this is the aspect driving it" closes the gap between the header and the card content.

---

## What Everyone Is Ignoring

The product spent four sprints building a sophisticated advance engine that scores every day for the next 36 months. The engine is genuinely impressive. But the engine's output is mediated through a GPT call that has no timeout, no fallback content, and is cached in localStorage with insufficient key precision.

The advance engine can survive an OpenAI outage because it runs locally. The reading surfaces — the thing the user actually reads — cannot. You have built a robust calculation layer sitting beneath a fragile presentation layer, and the fragility is invisible because OpenAI's uptime has been adequate during development.

The tail scenario: OpenAI has a two-hour outage. Every GPT call returns a 503. Each call retries three times. The Today page shows "Reading today's sky for you..." for the entire session. The advance engine continues working in tabs the user has stopped visiting. The product is blind during the one moment when a daily-use app most needs to deliver value.

The fix is not complex. Add request timeouts. Surface timeout failures as distinct user-facing states with retry options. The static interpretation tables already in the codebase — `computeTransitAspectBrief`, `PLANET_IN_HOUSE`, house themes — are sufficient to generate a meaningful static fallback for the Today page without any GPT call. That fallback does not need to replace GPT. It needs to give the user something to read while the external dependency is unavailable.

That is antifragility. Not three retries against the same dead endpoint.

