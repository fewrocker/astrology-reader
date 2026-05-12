# Code Enhancement: AbortController Pattern for Numerology GPT Calls

**Type:** Code Enhancement
**Originated by:** Taleb (fragility analysis)

---

## Problem

When the new GPT calls are added to NumerologyPage (`feat-gpt-numerology-narrative` and `feat-gpt-astro-numerology-crossreading`), there's a race condition risk: if the user navigates away from the Numerology page while GPT calls are still in flight, the calls will resolve and attempt to update state on an unmounted component. This causes React state update warnings and potential memory leaks.

The existing code in other pages (TransitReadingPage, etc.) should be audited for the same pattern. But the new NumerologyPage GPT calls must be implemented correctly from the start.

## Solution

Ensure all GPT `useEffect` calls in NumerologyPage use AbortController properly:

```typescript
useEffect(() => {
  const controller = new AbortController()
  // fire GPT call, pass signal where possible
  // on state update, check if controller.signal.aborted before calling setState
  return () => { controller.abort() }
}, [dependencies])
```

Since the OpenAI fetch calls in `gptInterpretation.ts` don't currently accept an AbortSignal, the pattern is:

```typescript
useEffect(() => {
  let cancelled = false
  setLoading(true)
  generateNumerologyNarrative(numbers, userName, apiKey)
    .then(text => { if (!cancelled) setNarrative(text) })
    .catch(err => { if (!cancelled) setNarrativeError(err.message) })
    .finally(() => { if (!cancelled) setLoading(false) })
  return () => { cancelled = true }
}, [numbers, userName, apiKey])
```

This is the `cancelled` flag pattern — simpler than AbortController when the underlying fetch doesn't support signal cancellation, and equally safe for preventing state updates on unmounted components.

## Why This Is a Code Enhancement

This is not new user-visible capability — it's a correctness and stability improvement to the implementation of the new GPT features. Without this, the new features would have a known React anti-pattern from the moment they ship.

## Impact / Effort

**Impact:** Medium — prevents a class of React state update bugs and memory leaks.
**Effort:** Low — the `cancelled` flag pattern is 5 lines per useEffect. Must be applied to both GPT useEffects in NumerologyPage.

## Dependencies

- Implemented as part of `feat-gpt-numerology-narrative` and `feat-gpt-astro-numerology-crossreading` — this is a quality bar for those tasks, not a separate deployment

## Implementation Summary

1. `src/components/results/NumerologyPage.tsx`:
   - All `useEffect` blocks that fire GPT calls must use the `cancelled` flag pattern
   - Two effects: one for numerology narrative, one for astro cross-reading
   - Each has its own `cancelled` boolean and cleanup function

---

## Outcome

Added `generateNumerologyNarrative` and `getNumerologyDiscussResponse` to `src/services/gptInterpretation.ts`. The narrative function takes all five numerology numbers, constructs a user-prompt that names each number's archetype and flags master numbers (11, 22, 33) with appropriate weight, and returns a cohesive 3-paragraph reading via a single GPT call at temperature 0.85 / max_tokens 1200 wrapped in `retryWithBackoff`. The discuss function mirrors the `getDreamDiscussResponse` / `getDiscussResponse` pattern — it injects the caller-supplied numerology context into the system prompt and supports full multi-turn conversation. The cancelled-flag pattern is now documented as a codebase standard in `setup/agents.md` with an annotated TypeScript example. Build verified zero errors.
