# code-celtic-payload-hardcoded-zeros

**Type:** Code Enhancement
**Originated by:** Taleb, Carmack

## Problem / Opportunity

In `src/components/tarot/CelticCrossReading.tsx`, the function `buildCelticSynthesisPayload` (lines 86–142) hardcodes two numerology fields in every payload it constructs:

```typescript
personalYear: 0,
lifePathNumber: 0,
```

Zero is not a valid numerology value. Life path numbers run 1 through 9 (with master numbers 11, 22, 33). Personal year cycles run 1 through 9. No user has a life path of 0. No user is in personal year 0. These are not placeholder sentinels or null equivalents — they are integers that look valid to every layer downstream.

The server handler `handleTarotCelticSynthesis` (in `server/services/gptTarot.ts`, lines 926–976) receives these values and assigns them directly: `let authorizedPersonalYear = payload.personalYear` and `let authorizedLifePath = payload.lifePathNumber`. When `userId` is present, the handler overwrites them with server-computed values derived from the user's birth date. When `userId` is absent — every unauthenticated user, every session without a stored birth context — the zeros flow through unchanged. They are then written into the GPT synthesis prompt as `Life Path: 0` and `Personal Year: 0`.

GPT does not reject these values. It interprets them as real numerology data and produces a synthesis response grounded in a numerological context that is factually wrong for every unauthenticated user. No error panel appears. No log entry flags the anomaly. The reading completes silently with poisoned data.

The contrast with other reading flows makes the omission legible. `ThreeCardReading.tsx` receives `personalYear` as a required prop (line 41, type `number`) that `TarotPage.tsx` computes from the user's `birthDate` via `computePersonalYear(birthDate)` before passing it down (line 240). That flow makes the data dependency explicit at the component boundary. `CelticCrossReading.tsx` receives no `birthDate` and no `personalYear` prop at all — the parent (`CelticReadingFlow` in `TarotPage.tsx`, lines 250–283) passes only `tarotAstroContext`, `dailyTransitSummary`, `weeklyTransitSummary`, and `moonSign`. There is no route through which `buildCelticSynthesisPayload` could derive valid numerology values from the information it receives. It fills the required fields with 0 as a consequence of that missing data, not as a deliberate design.

The server's `TarotCelticSynthesisPayload` interface (in `server/services/gptTarot.ts`, lines 308–334) types both fields as `number`, not `number | null`. The client's mirror interface in `src/services/gptInterpretation.ts` follows the same contract. Passing null is a type change, not merely a value change — both interfaces need to be updated to accept `null` before the client can express "this value is unavailable" rather than "this value is zero."

The single-card synthesis flow in `server/services/gpt.ts` (lines 411–426) demonstrates the correct pattern: when the server cannot derive an authoritative numerology value, it falls back to `payload.numbers.personalYear`. That fallback is valid because the single-card flow receives a real computed value from the client. The Celtic Cross flow cannot follow this pattern because its client-supplied values are not real — they are zeros that were never computed.

## Desired state

The synthesis payload for Celtic Cross readings accurately represents what the client knows and does not know. When birth date is unavailable to the client — as it is for every unauthenticated session, since `CelticCrossReading` receives no `birthDate` prop — the payload communicates that absence cleanly by sending `null` for `personalYear` and `lifePathNumber`, rather than a fictitious integer.

The server receives null, recognizes it as an absent value, and either omits those lines from the GPT prompt or renders them as empty. GPT produces a synthesis grounded only in the data that is actually known: the natal sign placements, the transit context, the drawn cards, the user's intention. For authenticated users whose birth context resolves on the server, the server-authoritative values overwrite null exactly as they currently overwrite 0 — no behavior change for that path.

The type interfaces on both sides of the API boundary reflect the true optionality of these fields. A future developer reading the `TarotCelticSynthesisPayload` interface sees `personalYear: number | null` and understands that this value is not always available, rather than seeing `personalYear: number` and assuming it is always computed.

The option of passing birth date through `CelticCrossReading`'s props to enable client-side computation is also viable and would allow unauthenticated users with a stored birth date to receive correctly computed numerology without server authentication. Either path — null for unavailable or client-computed from birth date — is a substantive improvement over hardcoded zeros. The defining outcome is the same: GPT never receives a value the system did not actually compute.
