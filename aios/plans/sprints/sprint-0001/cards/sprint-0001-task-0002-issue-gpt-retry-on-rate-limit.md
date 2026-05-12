# Issue Fix: GPT Retry on Transient Errors

**Type:** Issue Fix
**Originated by:** Carmack + Taleb

---

## Problem

All GPT API calls in `src/services/gptInterpretation.ts` fail immediately on the first error — no retry, no backoff. OpenAI's API returns 429 (rate limit exceeded) regularly, especially on free-tier or burst usage. Network timeouts also occur.

When a transit reading, synastry reading, or dream interpretation hits a transient error, the user sees the failure after waiting through a loading screen, with no automatic recovery. They must manually retry from scratch. This is a significant user experience failure for what should be the most magical moments of the app.

## Why This is an Issue Fix

This corrects unreliable behavior in an existing core feature. GPT interpretation is central to the product's value proposition. Making it silently retry on recoverable errors (429, 5xx, timeout) is table-stakes reliability, not a new capability.

## Proposed Solution

Add a `retryWithBackoff` utility that wraps the internal `fetch` call:
- Max 3 attempts
- Delays: 1s, 2s, 4s (exponential backoff)
- Retry only on: 429, 503, 504, and `TypeError` (network failure)
- Do not retry on: 401 (bad key), 400 (bad request) — these are permanent failures

Extract a shared `callOpenAI(messages, options)` helper from the 5 near-identical fetch patterns in `gptInterpretation.ts`. Apply retry logic inside this helper once, benefiting all callers.

## Impact

**High** — eliminates the most common category of reading failures
**Effort** — Low (~40 lines including the helper refactor)

## Dependencies

Works well with `code-gpt-service-refactor` (shares the helper extraction), but can be implemented independently.

## Implementation Summary

- Modified file: `src/services/gptInterpretation.ts`
  - Add `retryWithBackoff<T>(fn: () => Promise<T>, maxAttempts: number): Promise<T>` utility
  - Optionally extract `callOpenAI(messages, modelOptions)` helper while adding retry
  - Apply retry to all GPT API calls

---

## Outcome

**Status:** Done — commit `57224fa` on branch `sprint-0001-task-0002-issue-gpt-retry-on-rate-limit`.

Added a `retryWithBackoff<T>` utility (up to 3 attempts, delays 1s / 2s / 4s) and a shared `callOpenAI` helper that throws a typed `OpenAIError` carrying the HTTP status code. Retry logic checks `OpenAIError.status` directly against the retryable set `{429, 503, 504}` and also catches `TypeError` for network failures. Non-retryable errors (401, 400, etc.) propagate immediately. All five exported GPT functions (`getGptInterpretation`, `getDreamInterpretation`, `getDreamDiscussResponse`, `getDailySnapshotInterpretation`, `getDiscussResponse`) now route through `callOpenAI` wrapped in `retryWithBackoff`. Exported function signatures are unchanged. TypeScript type-check passes with zero errors.
