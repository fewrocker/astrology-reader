# Proposal: feat-gpt-request-timeout

**Type:** Feature  
**Originated by:** Taleb  
**Sprint:** 0022

---

## Problem / Opportunity

Every GPT-backed reading surface in the product — the Today page morning synthesis, transit reading, synastry, dream interpretation, journal annotation — flows through a single code path: `callProxy` in `src/services/gptInterpretation.ts` (line 47) issues a `fetch('/api/gpt/interpret', ...)` call with no `AbortController` and no timeout signal. On the server, `getClient()` in `server/services/gpt.ts` (line 64–66) constructs the OpenAI SDK client as `new OpenAI()` with no `timeout` option.

The consequence is structural, not edge-case:

1. **The client fetch can hang indefinitely.** OpenAI's API under load regularly takes 30–90 seconds on complex prompts. Without an `AbortController` signal, the browser's fetch connection is held open for Node.js's default TCP timeout — potentially several minutes. The user sees the `GptSkeleton` loading spinner with "Reading today's sky for you…" and has no recourse: no timeout, no retry button, no fallback text.

2. **Three retries amplify the worst-case wait.** `retryWithBackoff` in `server/services/gpt.ts` (line 78–93) retries up to three times with exponential backoff (1 s, 2 s delays) on 429, 503, and 504 responses. A hanging OpenAI connection never raises one of those status codes — it simply stalls. But even for legitimately retryable responses, three attempts against a degraded endpoint without a per-attempt timeout means the total server-side wait before the client receives a response can exceed 90 seconds before the first retry is even attempted.

3. **The server-side OpenAI client has no constructor-level timeout.** `callOpenAI` in `server/services/gpt.ts` (line 95–114) calls `client.chat.completions.create(...)` with no `signal` option. The OpenAI Node SDK accepts `timeout` in the constructor and a per-request `signal`. Without either, a single network partition at the OpenAI edge holds a server worker thread for the full system TCP timeout — typically 2+ minutes — blocking that worker from serving other requests.

4. **Timeout is not surfaced as a distinct error state.** `gptErrors.ts` defines four error sentinel strings: `GPT_RATE_LIMIT`, `GPT_RATE_LIMIT_UNAUTH`, `GPT_SERVER_ERROR`, and `GPT_OFFLINE`. A timeout — which is neither a server error nor a network-offline condition — would currently surface as `GPT_OFFLINE` (from the `catch` block at line 67–69 of `callProxy`) if the fetch never resolves, or as `GPT_SERVER_ERROR` if the server times out and returns a non-200. Neither string communicates what happened or that retrying is worthwhile. There is no retry button affordance triggered by a timeout condition.

**Exact locations:**

| Location | Issue |
|---|---|
| `src/services/gptInterpretation.ts` line 62 | `fetch(...)` has no `AbortController` signal |
| `src/services/gptInterpretation.ts` line 67–69 | timeout `catch` would produce `GPT_OFFLINE`, not a distinct timeout string |
| `server/services/gpt.ts` line 65 | `new OpenAI()` has no `timeout` option |
| `server/services/gpt.ts` line 101 | `client.chat.completions.create(...)` has no per-request `signal` |
| `server/services/gpt.ts` line 78–93 | `retryWithBackoff` does not enforce per-attempt max wait |
| `src/services/gptErrors.ts` line 9 | `GPT_ERROR_STRINGS` set has no timeout member |

---

## Vision

When this feature is complete, a user on a slow or degraded connection to OpenAI experiences a clean, bounded failure:

- The loading state appears as normal.
- After 30 seconds without a response, the fetch is aborted. The loading skeleton disappears and is replaced by a brief, honest message: "The reading took too long. Tap to try again." A single "Try again" button is visible in the same card position where the reading would have appeared.
- The user taps "Try again." The loading state reappears. If OpenAI responds within 30 seconds, the reading renders. If it times out again, the same message and button return.
- The user never sees a spinner running beyond 30 seconds. They always have an exit and a re-entry point. The application does not feel broken — it feels honest about what happened.
- On the server, the OpenAI SDK client enforces a 30-second timeout per connection attempt. A hanging network partition at the OpenAI edge releases the server worker after 30 seconds, not after several minutes. This protects throughput for all concurrent users during OpenAI degradation.
- The timeout failure state is visually and semantically distinct from: (a) a rate limit hit, which surfaces the upgrade modal; (b) a network-offline condition, which shows the offline string; (c) a generic server error, which shows the server-error string. Each failure mode has its own message and affordance appropriate to that mode.

---

## Specifications

1. **Client-side timeout duration.** The `AbortController` signal passed to `fetch` in `callProxy` must fire after **30 000 ms (30 seconds)**. This value must be defined as a named constant `GPT_REQUEST_TIMEOUT_MS = 30_000` at the top of `src/services/gptInterpretation.ts`, not inlined, so it can be updated in one place.

2. **AbortController wiring in `callProxy`.** Create an `AbortController` instance immediately before the `fetch` call. Set a `setTimeout(() => controller.abort(), GPT_REQUEST_TIMEOUT_MS)`. Pass `signal: controller.signal` to the `fetch` options object. Clear the timeout with `clearTimeout` in a `finally` block after the fetch resolves or rejects, so the timer does not linger when the request succeeds quickly.

3. **Detecting a client-side timeout in the `catch` block.** When `fetch` rejects due to an aborted signal, the error is a `DOMException` with `name === 'AbortError'`. The existing `catch` block at line 67–69 of `callProxy` must distinguish this case: if `err instanceof Error && err.name === 'AbortError'`, throw `new Error(GPT_TIMEOUT)` rather than `new Error(GPT_OFFLINE)`. No other change to the catch block.

4. **New sentinel string `GPT_TIMEOUT`.** Add `export const GPT_TIMEOUT = "The reading took too long — try again."` to `src/services/gptErrors.ts`. Add `GPT_TIMEOUT` to the `GPT_ERROR_STRINGS` set so that `isGptError(GPT_TIMEOUT)` returns `true`. Update `getGptErrorMessage` to handle `GPT_TIMEOUT` with the user-facing copy "The reading took too long. Tap to try again." (distinct from the server-error message "The reading could not be retrieved — try again.").

5. **Server-side constructor timeout.** Pass `timeout: 30_000` to the `OpenAI` constructor in `server/services/gpt.ts` line 65: `new OpenAI({ timeout: 30_000 })`. This is the timeout the OpenAI Node SDK applies to each HTTP request it makes. It must equal or slightly exceed the client-side timeout so the server gives up before the client's `AbortController` fires, reducing the chance of the server returning a partial response to a client that has already aborted.

6. **Server-side per-request signal (optional layer).** The OpenAI SDK's `chat.completions.create` also accepts an `options.signal`. For defense in depth, create an `AbortController` in `callOpenAI` with a 28-second timeout (2 seconds under the client-side limit) and pass it as the third argument. This ensures the server-level abort fires before the SDK-level constructor timeout, giving the server a chance to return a clean error to the client before the client's own abort fires.

7. **`retryWithBackoff` must not retry on timeout.** The set `RETRYABLE = new Set([429, 503, 504])` already excludes timeout. However, the OpenAI SDK wraps timeouts as `APIConnectionTimeoutError`, which is a subclass of `APIError` and may carry a status of `408` or `undefined`. The `catch` block in `retryWithBackoff` checks `err instanceof GptServiceError && RETRYABLE.has(err.status)` — this is already safe because a timeout will not be a `GptServiceError` with a retryable status. Confirm in the implementation that `callOpenAI`'s `catch` block does not convert `APIConnectionTimeoutError` to a `GptServiceError` with a retryable status. If needed, add an explicit guard: if `err instanceof OpenAI.APIConnectionTimeoutError`, rethrow without converting to `GptServiceError`.

8. **No retry amplification on timeout.** Because timeout is not retryable (spec 7), a single timeout from the server means one 30-second wait for the user, not three sequential 30-second waits. This is the primary correctness gain of spec 7.

9. **User-facing retry affordance.** Each component that displays a GPT interpretation string must handle `isGptError(text) && text === GPT_TIMEOUT` (or equivalently, call `getGptErrorMessage` and detect the timeout case) by rendering a "Try again" button alongside the timeout message. The button re-invokes the same GPT fetch function that produced the result. The exact components affected are: `TodayPage.tsx` (morning synthesis card), `DailySnapshotCard.tsx`, `TransitReadingPage.tsx` (interpretation tab), `SynastryPage.tsx` (GPT interpretation section), and `DreamPage.tsx` (dream interpretation card). Components that already have retry logic for other error states should apply the same pattern; components that do not yet have retry logic must add it specifically for `GPT_TIMEOUT`.

10. **Loading state must clear on timeout.** When the 30-second abort fires, the component's loading state (`isLoading`, `isPending`, or equivalent boolean) must be set to `false` before rendering the timeout error. It must not remain `true`. The timeout branch in `callProxy` throws synchronously (via `throw new Error(GPT_TIMEOUT)` in the catch), so the `await` in the calling function will reject, and the caller's error handling sets the state. Verify that every affected component's error path sets `isLoading` (or its equivalent) to `false`.

11. **Timeout error must not be cached.** Callers that cache GPT results in localStorage (e.g., `DailySnapshotCard`, `TodayPage`) must not write a timeout error string to the cache. The cache write must be conditional: `if (!isGptError(result))`. Audit every GPT cache-write site in the codebase to ensure this condition is present. If any site is missing the guard, add it.

12. **Timeout must not suppress `RateLimitError`.** The `callProxy` function re-throws `RateLimitError` before reaching the generic catch block (line 103–104 pattern in existing callers). The `AbortController` timeout fires on the `fetch` promise rejection, which happens before the 429 response body is parsed. In practice, a rate-limit response arrives quickly (< 1 s) so the abort timer will not fire during a 429 scenario. No special handling is needed, but this interaction must be confirmed during implementation testing.

13. **Visual treatment of the timeout state.** The timeout error message and retry button should render in the same container/card where the GPT reading normally appears — not in a toast, not in a modal, not floating. The button label must be "Try again" (not "Reload", "Refresh", or "Retry"). The error message must be the string from `getGptErrorMessage(GPT_TIMEOUT)`: "The reading took too long. Tap to try again." — except on desktop, where "Tap" may be replaced with "Click". This distinction is optional; a single copy is acceptable for the initial implementation.

14. **Server HTTP response on server-side timeout.** When `callOpenAI` times out (spec 5–6), the exception bubbles up through `retryWithBackoff` and then through the handler function, reaching the Express route handler. The route handler must catch this and return an HTTP 504 (Gateway Timeout) to the client rather than a 500. This allows future callers (if any) to distinguish timeout from internal error at the HTTP layer. The client-side `callProxy` translates any non-ok, non-429 response to `GPT_SERVER_ERROR` (line 86 of `callProxy`). A server-side timeout that crosses the wire as HTTP 504 will therefore surface as `GPT_SERVER_ERROR`, not `GPT_TIMEOUT` — unless the client's own `AbortController` has already fired first. This is acceptable behavior: the client-side timeout (30 s) is the primary mechanism; the server-side response code is a secondary signal used for monitoring and future disambiguation.

15. **No change to retry count.** `retryWithBackoff`'s `maxAttempts = 3` remains unchanged for retryable errors (429, 503, 504). Only timeout is excluded from retry. Do not reduce the retry count for other error types.

16. **Constant location and export.** `GPT_REQUEST_TIMEOUT_MS` is defined in `src/services/gptInterpretation.ts` (private, not exported). `GPT_TIMEOUT` is defined and exported from `src/services/gptErrors.ts` alongside the other sentinel strings. Server-side timeout duration (30 000 ms) is defined as a module-level constant `SERVER_OPENAI_TIMEOUT_MS = 30_000` in `server/services/gpt.ts`.

---

## Out of Scope

- **Fallback static content on timeout.** Taleb's analysis suggests that the static interpretation tables already in the codebase could generate a meaningful fallback for the Today page when GPT is unavailable. That is a separate, larger proposal. This feature adds only the timeout mechanism and the retry affordance — it does not add static fallback content.
- **Provider failover / alternative LLM.** Routing to a secondary LLM provider when OpenAI is unavailable is out of scope. The product is intentionally coupled to OpenAI for quality reasons.
- **Reducing the retry count for other error types.** The three-retry policy for 429/503/504 is unchanged. Only timeout behavior is being specified here.
- **Converting the remaining 14 magic-string error sites to typed throws.** Taleb's Proposal 7 identifies this as a separate refactoring target. This feature adds one new sentinel string (`GPT_TIMEOUT`) in the same existing pattern, consistent with the current system. The migration to typed throws is a separate task.
- **Server-side timeout response differentiation at the HTTP layer beyond 504.** The proposal does not add a new HTTP status code or response body shape for timeout. The 504 response is sufficient for monitoring; client-side behavior is determined by the AbortController, not by the HTTP status.
- **Per-prompt-type timeout tuning.** All prompt types receive the same 30-second client-side timeout. Some prompt types (e.g., synastry interpretation with `max_tokens: 4000`) may legitimately take longer than others (e.g., today-synthesis with `max_tokens: 350`). Differential timeouts are a future optimization and are explicitly not part of this feature.
- **User preference for timeout duration.** No user-configurable timeout setting.
- **Analytics events for timeout.** Adding a `track('gpt_timeout', ...)` event is desirable but out of scope for this proposal. It can be added as a one-line addition during implementation if the implementer chooses, but it is not specified.

---

## Open Questions

1. **Should the server-side per-request AbortController (spec 6) use 28 seconds or match the client at 30 seconds?** The 2-second gap is intended to let the server return a response before the client aborts, reducing the chance of the client receiving a network-level connection reset rather than a clean HTTP response. Whether the gap is meaningful in practice depends on network conditions between the browser and the server. The 28-second value is a starting guess; it may need to be adjusted based on observed behavior.

2. **Does the OpenAI Node SDK's `APIConnectionTimeoutError` propagate through `retryWithBackoff` without being classified as retryable?** The spec assumes it does based on reading the code, but this must be confirmed by running `callOpenAI` with a deliberately short timeout (e.g., 100 ms) against a valid endpoint in a local test and observing whether `retryWithBackoff` retries or re-throws immediately.

3. **Which components have pre-existing retry logic for other GPT error states, and which do not?** A full audit of the five affected components (spec 9) is needed before implementation. The pattern may already exist in some components (e.g., `DailySnapshotCard` may have a retry button for `GPT_SERVER_ERROR`) and may be absent in others (e.g., `DreamPage`). The implementer should not assume consistency.

4. **Is `GPT_TIMEOUT` the right sentinel string text, or should it be a short code like `'gpt_timeout'`?** The existing sentinel strings (`GPT_SERVER_ERROR`, `GPT_OFFLINE`) are human-readable and are displayed directly or tested for equality. The new string follows the same pattern. However, Taleb's Proposal 7 notes that this architecture is fragile. If the migration to typed errors begins in sprint 0022 (per the vision's code quality section), the implementer should discuss with the team whether `GPT_TIMEOUT` should be the last magic-string addition or whether it should be introduced as a typed error class following the `RateLimitError` pattern from the start.

5. **What happens to the `generateCosmicPatternReading` and `handleCosmicPatternReading` calls that do not go through the standard try/catch wrapper?** `generateCosmicPatternReading` in `gptInterpretation.ts` (line 299–313) calls `callProxy` without a try/catch — it lets errors propagate directly to the caller. If `callProxy` throws a timeout `Error`, the caller receives it as an uncaught rejection. The affected component (`JournalPage` or equivalent) must handle this. This case should be explicitly addressed during implementation.

---

## Outcome

**Status:** completed  
**Branch:** sprint-0022-task-0010-feat-gpt-request-timeout  
**Commit:** e432718

### Files changed

- `src/services/gptErrors.ts` — added `GPT_TIMEOUT` sentinel, added to `GPT_ERROR_STRINGS` set, added `getGptErrorMessage` branch returning "The reading took too long. Tap to try again."
- `src/services/gptInterpretation.ts` — added `GPT_REQUEST_TIMEOUT_MS = 30_000` constant; wrapped `fetch` in `AbortController` with `setTimeout`; `finally` clears the timer; `catch` detects `AbortError` and throws `GPT_TIMEOUT`
- `server/services/gpt.ts` — added `SERVER_OPENAI_TIMEOUT_MS = 30_000`; `new OpenAI({ timeout: SERVER_OPENAI_TIMEOUT_MS })`; per-request `AbortController` at 28 s in `callOpenAI`; explicit guard rethrows `APIConnectionTimeoutError` without converting to `GptServiceError` (prevents retry)
- `server/routes/gpt.ts` — added `OpenAI` import; catch branch returns HTTP 504 on `APIConnectionTimeoutError` or `AbortError`
- `src/components/reading/TodayPage.tsx` — extracted GPT call into `fetchGptSynthesis` callback backed by `useRef` refs for moon/transits; morning synthesis card renders timeout message + "Try again" button that re-invokes the callback
- `src/components/results/TransitReadingPage.tsx` — imported `GPT_TIMEOUT`; retry button label is "Try again" on timeout, "Ask again" on other errors
- `src/components/reading/DailySnapshotCard.tsx` — added `isGptError` guard around `localStorage.setItem` to prevent caching error strings
- `src/context/AppContext.tsx` — added `isGptError` guards to transit and synastry cache write effects
