# issue-celtic-cross-gpt-synthesis-fails

**Type:** Issue Fix
**Originated by:** Taleb, Carmack, Jobs

**User guidance:**

> the gpt interpretatio for celtic cross always fails, try this curl to see why curl 'http://localhost:5173/api/gpt/interpret' \
>   -H 'Accept: */*' \
>   -H 'Accept-Language: pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7,es;q=0.6' \
>   -H 'Connection: keep-alive' \
>   -H 'Content-Type: application/json' \
>   -b '_ga=GA1.1.1870152619.1765223237; __stripe_mid=601ddd8d-374c-4ea0-80e2-177aa61f4c373349a4; __zlcmid=1V0o7m1BuRyIZGg; ajs_anonymous_id=%22fb387cee-fe63-4b92-ae9f-91090fe555be%22; _gcl_au=1.1.1555039504.1773354238; __profilin=p%3Dt; session_id=504df00a-3c10-4bef-8eef-36b35efb12a4; auth_token=dFlQ7M1Evuhxe8svUl3gDWY5HarrJT9IV%2BFhXZ2qmgdOHpoWMu3dOPfDThEaVn8zI96eSm4TV4%2BkwFpxMgJz%2FK1WL3ooA78MNQp9g1HkTAHkUg5k8AhsMGiGw9Z6HyzgttOcxKjrwvQ9YBk8cL4lFN6peFPqVibsc0fsrHIO1wKUbNLbXaZPZZ%2BBrKaXLB%2FC%2FPbzdQ6XOs9%2BPE8SP7j6xc2JXFyHDv8NbKaF9A%3D%3D--zYJdtMjD5jSiLuBE--s9qB%2FkCIglfhMwbwJSCGBw%3D%3D; csrf_token=c070f9c4bed92eb2bcc15a6c98802f65330cdffa75b0e567bc2874f152f08fb7' \
>   -H 'Content-Type: application/json' \
>   --data-raw '{"type":"tarot-celtic-synthesis","payload":{...}}'
>
> and fix

The curl sends a valid `tarot-celtic-synthesis` payload — 10 cards, 10 positions, full transit context, `userIntention: "Love"` — with a live `auth_token` cookie. The user is authenticated. The request reaches the server and routes to `handleTarotCelticSynthesis`. The failure is at runtime, not at routing or payload parsing.

## Problem

The Celtic Cross GPT synthesis endpoint (`POST /api/gpt/interpret`, type `tarot-celtic-synthesis`) always returns a 500 error. The handler is registered, the payload structure matches `TarotCelticSynthesisPayload`, and the request body is well-formed. Because the curl carries a valid `auth_token` cookie, the server resolves a `userId` and enters the authenticated code path in `handleTarotCelticSynthesis`.

Three distinct failure paths have been identified. Any one of them, alone, is sufficient to crash the synthesis:

**Candidate A — `positions[i]` access without null guard** (`server/services/gptTarot.ts`, lines 983–988)

```typescript
const cardLines = cards.slice(0, 10).map((card, i) => {
  const pos = positions[i]          // undefined if positions.length < i+1
  const reversalText = card.reversed ? ' (reversed)' : ' (upright)'
  return `${i + 1}. ${pos.label} — ${card.name}${reversalText}  // TypeError thrown here
```

If `positions` has fewer entries than the cards slice, `pos` is `undefined` and `pos.label` throws `TypeError: Cannot read properties of undefined (reading 'label')`. This error is uncaught in `handleTarotCelticSynthesis` and propagates directly to the route handler, which returns a 500. The normal client path sends exactly 10 positions (mapped from `CELTIC_CROSS_POSITIONS`), but any deviation — a future modification to the positions array, a client bug, a malformed payload — crashes the entire synthesis with no error logged at the throw site.

**Candidate B — `calculateChart` called without try/catch inside the `if (userId)` block** (`server/services/gptTarot.ts`, lines 947–975)

```typescript
if (userId) {
  const ctx = resolveUserBirthContext(userId)
  if (ctx) {
    // ...
    const natalChart = calculateChart(ctx.birthDate, ctx.birthTime, ctx.lat, ctx.lng, ctx.tz, ctx.unknownTime)
    // All subsequent code assumes natalChart is valid
  }
}
```

`calculateChart` is an astronomical computation engine. If the user's stored birth context contains fields with unexpected values — an unusual birth date, edge-case geographic coordinates, timezone string variants — `calculateChart` can throw. This throw is not caught anywhere in the `if (userId)` block. It propagates to the route handler and returns a 500 with no fallback to the client-supplied payload values. The curl's `auth_token` confirms the user is authenticated, meaning this path is exercised on every synthesis call for this user. The equivalent defensive pattern — `try { ... } catch { return null }` — is already applied in `computeDominantElement` and `computeDominantModality` in `src/engine/tarot.ts` for exactly this reason. The server-side handlers are missing it.

**Candidate C — `parseCelticChapters` has no fallback for GPT format drift** (`src/services/gptInterpretation.ts`, lines 674–702)

```typescript
function parseCelticChapters(raw: unknown): SynthesisChapter[] {
  // ...
  const parts = text
    .split(/\n(?=(?:#{1,6}\s+|\*\*[^*\n]+\*\*\s*$|\d+\.\s+[A-Z]))/m)
    // ...
  if (parts.length === 0) return []
  // ...
}

export async function getTarotCelticSynthesis(payload): Promise<SynthesisChapter[]> {
  const result = await callProxy('tarot-celtic-synthesis', enrichedPayload)
  const chapters = parseCelticChapters(result)
  if (chapters.length === 0) throw new Error('Empty synthesis response')  // ← swallows valid GPT text
  return chapters
}
```

`parseCelticChapters` splits the GPT response on three heading formats: markdown (`## Heading`), bold (`**Heading**`), and numbered (`1. Heading`). If GPT returns its synthesis in a format that matches none of these patterns — which is a documented category of API regression across model updates — the entire response is not split, `parts` has one entry with no heading match, falls to `{ heading: 'Synthesis', body: fullText }`, is retained by the filter (`body.length > 0`), and produces a one-chapter array. This is not the crash path directly. But if the GPT response is empty or structurally broken upstream (from Candidate B throwing before the OpenAI call is reached), `parseCelticChapters` returns `[]` and `getTarotCelticSynthesis` throws `Error('Empty synthesis response')`, which surfaces as the error panel the user sees. There is no test for `parseCelticChapters` anywhere in the test suite. It is the sole boundary between raw GPT text and rendered chapters.

The most probable active failure for the user's curl, given that the user is authenticated and the payload is well-formed, is **Candidate B**: `calculateChart` throwing inside the unguarded `if (userId)` block before the OpenAI call is ever reached, producing a 500 that `getTarotCelticSynthesis` receives as `GPT_SERVER_ERROR` and surfaces as the error panel.

## Expected behavior

- The Celtic Cross GPT synthesis returns a complete set of named chapters (The Constellation, The Central Cross, The Roots and the Horizon, The Inner World, Hopes Fears and Outcome, Psychological Dynamics, Astrology Resonance, Practical Integration, Reflection Prompts) that the client renders in `CelticCrossReading.tsx`.
- If `calculateChart` throws for an authenticated user's birth context, the handler logs the error server-side and falls through to the client-supplied natal values from the payload. The synthesis completes using payload data rather than crashing. This is the same graceful-fallback posture already applied to `computeDominantElement` and `computeDominantModality` in the engine layer.
- If `positions[i]` is undefined for any index in the card lines construction, the access does not throw. A null guard — `positions[i] ?? { label: \`Position ${i + 1}\`, meaning: '' }` — ensures the prompt is built with a fallback label rather than a runtime crash.
- If GPT returns a synthesis that does not match any heading format in `parseCelticChapters`, the function returns the full text as a single chapter with a generic heading rather than returning an empty array. Valid synthesis text is never silently discarded.
- After fixing these paths, running the provided curl against a local server returns 200 with a `result` string containing the structured synthesis.
