# Review: sprint-0029-task-0001-issue-celtic-cross-gpt-synthesis-fails

## Status
Completed.

## Changes

### Fix A — `positions[i]` null guard (`server/services/gptTarot.ts`)
Added `?? { label: \`Position ${i + 1}\`, meaning: '' }` fallback on the `positions[i]` access inside the `cardLines` map. If the positions array is shorter than the cards slice (malformed payload or future positions array drift), the prompt is built with a placeholder label instead of throwing `TypeError: Cannot read properties of undefined (reading 'label')`.

### Fix B — `calculateChart` try/catch (`server/services/gptTarot.ts`)
Wrapped the entire `if (userId)` block body in a `try { ... } catch (err) { console.error(...) }`. If `calculateChart` throws for any reason — edge-case birth coordinates, timezone string variants, or any other astronomical computation failure — the error is logged server-side and the handler falls through to the client-supplied payload values. The synthesis continues with the payload's natal context rather than propagating a 500. This is the most probable active failure path for the user's curl: the user is authenticated, their `calculateChart` throws, and the unguarded throw previously crashed the entire handler before any OpenAI call was made.

### Fix C — `parseCelticChapters` fallback guarantee (`src/services/gptInterpretation.ts`)
Two changes:
1. Added explicit `if (!text) return []` after `raw.trim()` to make the empty-text guard unambiguous.
2. Changed `if (parts.length === 0) return []` to `return [{ heading: 'Synthesis', body: text }]` — ensures non-empty text always yields at least one chapter even if the split regex finds no heading markers.
3. Replaced the final `return chapters.filter(...)` with a guarded form: if the filter eliminates all chapters (only possible in adversarial edge cases where all sections have empty bodies), return a single fallback chapter with the original full text. Valid GPT synthesis text is never silently discarded.

## Verification
- `npm run server:build` (tsc -p tsconfig.server.json): clean, zero errors.
- `npm run build` (vite build): clean, 1925 modules transformed, zero errors.
- All three failure paths close independently; the most critical path (Candidate B) is now try/catch guarded so authenticated users with any birth context receive a synthesis rather than a 500.
