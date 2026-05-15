**Type:** Issue Fix
**Originated by:** Jobs, Carmack, Miyazaki, Taleb
**User guidance:** Guidelines item 3 — "Gpt interpreation on synastry is failing with `installHook.js:1 Synastry calculation error: Error: Couldn't generate interpretation — using a cached reading if available.` at `callProxy (gptInterpretation.ts:86:11)` at `async runSynastry (App.tsx:397:32)`. It should succeed and bring a complete interpretation of everything that was shown here: all the aspects, lines, combinations, and the relationship profile should also be fed into the synastry. Make the gpt reading be a true description of forces for the couple, the things they have to watch out, and how to make the relationship work better given the forces!"

## Problem

Three independent defects combine to make synastry GPT readings fail silently, over-charge usage, and truncate output.

---

### Defect 1 — `getSynastryInterpretation` does not catch `callProxy` rejections

**File:** `/projects/astrology-reader/src/services/gptInterpretation.ts`, line 326–331

```ts
export async function getSynastryInterpretation(
  person1: { ... },
  person2: { ... },
): Promise<string> {
  return callProxy('synastry-interpretation', { person1, person2 }) as Promise<string>
}
```

`callProxy` throws two kinds of errors on non-200 responses:
- `RateLimitError` (HTTP 429, line 82) — callers must rethrow this so `App.tsx` can open the upgrade modal.
- `new Error(GPT_SERVER_ERROR)` (any other non-200, line 86) — callers should return the error message as a graceful fallback string.

Every other GPT wrapper in the file follows the established pattern. `getSolarReturnInterpretation` (lines 316–324) is the canonical example:

```ts
export async function getSolarReturnInterpretation(targetYear: number): Promise<string> {
  try {
    const result = await callProxy('solar-return', { targetYear })
    return (result as string) || 'Unable to generate solar return interpretation.'
  } catch (err) {
    if (err instanceof RateLimitError) throw err
    return err instanceof Error ? err.message : GPT_SERVER_ERROR
  }
}
```

`getSynastryInterpretation` has no `try/catch` at all. When `callProxy` rejects — whether from a network hiccup, a server-side exception during chart calculation, or any non-200 status — the raw `Error` propagates through `await getSynastryInterpretation(...)` in `App.tsx` (line 397), falls into the `catch (e)` block (line 410), and reaches `dispatch({ type: 'SET_SYNASTRY_ERROR', error: e.message })` (line 417). The user sees an error state rather than the reading. The console log at line 415 — `console.error('Synastry calculation error:', e)` — is the exact stack trace the user reported.

The same defect exists in `getCoupleTransitInterpretation` (`gptInterpretation.ts`, line 333–340), which is a directly parallel function also missing the try/catch wrapper.

---

### Defect 2 — `incrementTodayUsed` called three times per synastry reading

**File:** `/projects/astrology-reader/src/App.tsx`, lines 401, 404, 408

```ts
const interpretation = await getSynastryInterpretation(...)
incrementTodayUsed()        // line 401 — fires unconditionally after await

// Spec 12 — increment todayUsed optimistically after a successful GPT response.
incrementTodayUsed()        // line 404 — duplicate, fires unconditionally

if (!cancelled) {
  dispatch({ type: 'SET_SYNASTRY_INTERPRETATION', interpretation })
  incrementTodayUsed()      // line 408 — inside the !cancelled guard
}
```

Only one `incrementTodayUsed()` call is correct per GPT reading. The intent, per the inline comment citing "Spec 12", is a single optimistic increment after a successful response. The same triplication is present in the transit reading block (lines 336, 340, 344) and in the synastry transit block (lines 453, 456, 460), so the bug is systemic across at least three reading types, not unique to synastry. Each successful synastry load burns three usage credits instead of one.

The correct single-call placement is inside the `if (!cancelled)` guard (line 406), after the dispatch, because it is the point where the reading is confirmed as both successful and not stale-cancelled.

---

### Defect 3 — `handleSynastryInterpretation` uses the OpenAI default `max_tokens` (2000), which truncates the requested 6–8 paragraph output

**File:** `/projects/astrology-reader/server/services/gpt.ts`, line 861

```ts
return retryWithBackoff(() => callOpenAI([{ role: 'system', content: prompt }]))
```

No `max_tokens` override is passed. `callOpenAI` defaults to `max_tokens: 2000` (line 105):

```ts
max_tokens: options.max_tokens ?? 2000,
```

The prompt built by `buildSynastryPrompt` (`/projects/astrology-reader/server/engine/synastryEngine.ts`, line 754) explicitly instructs GPT-4o-mini to "Write 6–8 flowing paragraphs" covering eight named sections (overall energy, romantic chemistry, emotional compatibility, communication, growth, house overlays, composite chart, key strengths). For two people with full birth times, the prompt itself already contains two complete natal tables (~20 planets each), cross-aspect lines, house overlay tables, composite chart, and the couple relational profile (7 dimension entries). The combined token budget for prompt + completion can be tight enough that GPT-4o-mini hits the 2000-token ceiling mid-paragraph, producing a truncated reading that ends abruptly.

The same issue exists in `handleCoupleTransitInterpretation` (line 890), which also calls `callOpenAI` with no `max_tokens` override.

For comparison, `handleSolarReturnInterpretation` (line 836–844) is the only handler that explicitly sets `max_tokens: 2000`:

```ts
callOpenAI([...], { temperature: 0.8, max_tokens: 2000 })
```

The synastry reading is denser than a solar return reading (two charts instead of one, plus the cross-chart analysis), so the 2000-token ceiling is insufficient. A budget of 3500–4000 tokens is needed to guarantee the full 6–8 paragraph output is not cut.

## Expected Behavior

**Defect 1:** `getSynastryInterpretation` (and `getCoupleTransitInterpretation`) must wrap `callProxy` in a try/catch identical in structure to `getSolarReturnInterpretation`: rethrow `RateLimitError`, return `err.message` for all other errors. When the server returns non-200, the caller in `App.tsx` receives a graceful error string and dispatches `SET_SYNASTRY_ERROR` with a human-readable message rather than an uncaught rejection propagating to the outer catch.

**Defect 2:** Each reading type (`runSynastry`, `runSynastryTransit`, the transit block) must call `incrementTodayUsed()` exactly once, inside the `if (!cancelled)` guard, after the dispatch that delivers the reading to the UI. The two unconditional duplicate calls above the guard must be removed. A one-line comment referencing "Spec 12" should remain at the single correct call site.

**Defect 3:** `handleSynastryInterpretation` must pass `{ temperature: 0.85, max_tokens: 4000 }` to `callOpenAI`. `handleCoupleTransitInterpretation` must pass `{ temperature: 0.85, max_tokens: 3000 }` (couple transit output is shorter than the full synastry reading but still multi-section). With these budgets, GPT-4o-mini can complete the full requested output for all realistic synastry prompt sizes without truncation.
