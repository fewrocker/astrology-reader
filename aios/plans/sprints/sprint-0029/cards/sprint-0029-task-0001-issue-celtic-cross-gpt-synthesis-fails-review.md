# Review — sprint-0029-task-0001-issue-celtic-cross-gpt-synthesis-fails

## Summary

All three candidate failure paths identified in the sprint card have been fixed. Both `npm run build` (Vite client build) and `npm run server:build` (tsc server build) pass with zero errors.

## Fixes Applied

### Fix A — Null guard for `positions[i]` access
**File:** `server/services/gptTarot.ts`, `handleTarotCelticSynthesis` card lines loop

Changed `const pos = positions[i]` to `const pos = positions[i] ?? { label: \`Position ${i + 1}\`, meaning: '' }`. If the client sends fewer than 10 positions, no TypeError is thrown. The prompt is built with a generic fallback label instead of crashing.

### Fix B — try/catch around `calculateChart` in `if (userId)` block
**File:** `server/services/gptTarot.ts`, `handleTarotCelticSynthesis`

The entire `if (userId)` block is now wrapped in a try/catch. If `calculateChart` or any downstream computation (transit calculation, numerology) throws for a user's birth context, the error is logged server-side with `console.error('[celtic-synthesis] calculateChart failed for userId ...]')` and execution falls through to use the client-supplied payload values. The synthesis call to OpenAI proceeds rather than returning a 500. This is the primary failure path for authenticated users.

### Fix C — Fallback in `parseCelticChapters` for unmatched GPT format
**File:** `src/services/gptInterpretation.ts`, `parseCelticChapters`

Two fallback guards added:
1. If `parts.length === 0` after the split (the regex produced no splits on the text), return `[{ heading: 'Synthesis', body: text }]` immediately.
2. After filtering chapters, if `filtered.length === 0`, return `[{ heading: 'Synthesis', body: text }]` as a final guarantee.

With these guards, any non-empty string from GPT produces at least one chapter. The `chapters.length === 0` throw in `getTarotCelticSynthesis` is now only reachable when the server returns an empty/null/non-string response, which is a legitimate failure condition distinct from GPT format drift.

## Build Verification

- `npm run build` — 1925 modules transformed, built in ~17s, no TypeScript or bundler errors
- `npm run server:build` — tsc -p tsconfig.server.json, zero errors, zero warnings
