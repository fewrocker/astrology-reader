# Taleb's Risk Review — Sprint 0024: Tarot Depth & Polish

*Nassim Nicholas Taleb. May 2026.*

---

## Opening Observation

Sprint 0023 shipped. The team is proud. Everything is "end-to-end functional." The vision document for sprint 0024 opens with the phrase "the mechanics are sound." This is exactly how people describe a bridge the week before it falls.

I have now read the actual code. I have read `src/engine/tarot.ts`, `server/routes/tarot.ts`, `src/context/TarotContext.tsx`, `server/services/gptTarot.ts`, `src/components/tarot/CelticCrossReading.tsx`, `src/components/tarot/TarotPage.tsx`, the full card data layer, the rate-limiting middleware, and the spread position definitions. Sprint 0023 addressed several of my prior concerns — `gptTarot.ts` was extracted, `tarot_usage` is a separate table, `TarotContext` is isolated. Some proposals were implemented. Others were not. The new sprint introduces new fragilities I have not yet discussed.

Here is what I see when I look at what was actually built versus what the team believes was built.

---

## 1. The Central Type System Incoherence: Three Parallel Type Universes

This is the most important structural problem in the codebase and nobody appears to have named it.

There are three separate definitions of `TarotAstroContext`, `DrawnCard`, and `InstantInterpretation` in this codebase:

- **`src/context/TarotContext.tsx`** defines its own `TarotAstroContext` with fields: `birthDate`, `personalDay`, `moonPhase: unknown | null`, `transitAspects: unknown[] | null`, `advanceCategory`, `dominantElement`. The `moonPhase` and `transitAspects` fields are typed as `unknown` — a compiler-level admission that nobody decided what these should be.

- **`src/engine/tarot.ts`** defines `TarotAstroContext` (as `EngineCtx` in imports) with the full, correct structure: `natalSunSign`, `natalMoonSign`, `natalAscendantSign`, `currentTransits: TransitAspect[]`, `retrogradeplanets`, `dominantTransitPlanet`, `lunarPhaseName`, `personalDay`, `advanceCategory`, `advanceReason`.

- **`src/components/tarot/types.ts`** defines yet another `TarotAstroContext` with fields: `sunSign`, `moonSign`, `ascendant`, `dominantElement`, `currentMoonPhase: string`, `significantTransits: string[]`, `personalDay`, `advanceCategory`, `numerologyYear`. This is the type consumed by `CelticCrossReading.tsx`.

These are not related by inheritance, not unified by a shared type, not validated against each other. They are three separate definitions that happen to describe the same concept. When `TarotPage.tsx` calls `buildCelticAstroCtx()` at line 155, it populates the `types.ts` version with `currentMoonPhase: ''` and `significantTransits: []` — hardcoded empty values. This is not a missing feature. This is a deliberately emptied data contract, and it means the Celtic Cross GPT synthesis runs without any live transit data.

The vision document calls this out as a known gap. But calling it a gap understates the architectural problem. The three-type divergence means that every future developer who touches this feature must reason simultaneously about three different shapes for the same concept. Each fix applied to one context type is invisible to the other two. This is how bugs accumulate invisibly.

**What breaks under stress:** Sprint 0024 asks developers to "wire real transit data for all three reading flows." The developer doing this work will write code that populates the `EngineCtx` version and will wonder why the Celtic Cross still sends empty transits — because `CelticCrossReading.tsx` receives the `types.ts` version, not the engine version. The type system provides no warning because both types are structurally valid TypeScript. The bug will be invisible until someone manually inspects the GPT payload.

**The hidden assumption that will not hold:** The assumption is that developers can reason about which type they are working with at any moment. Under sprint pressure, this assumption fails. You get a bug where the data is present in one representation and absent in the one actually consumed.

---

## 2. The `computeInstantInterpretation` Stub That Survived Production

At line 76–92 of `src/components/tarot/CelticCrossReading.tsx`, I find this:

```typescript
// ─── Stub: instant interpretation ────────────────────────────────────────────
// Engine (task-0006) will provide a proper computeInstantInterpretation.
function computeInstantInterpretation(card: DrawnCard, position: typeof CELTIC_CROSS_POSITIONS[number]): InstantInterpretation {
```

The comment says "Engine (task-0006) will provide a proper `computeInstantInterpretation`." Task-0006 shipped. The real `computeInstantInterpretation` exists in `src/engine/tarot.ts` and is already being imported and called correctly in `TarotPage.tsx` (line 10, imported as `computeInstantInterpretation from '../../engine/tarot'`). But `CelticCrossReading.tsx` has its own local stub that shadows the real function.

The stub function, when examined, produces an `InstantInterpretation` with:
- No transit influence (the `astroConnection` field is populated with `[card.rulingPlanet, card.rulingSign].filter(Boolean).join(' — ')` — a raw data field, not an interpreted signal)
- No lunar phase note
- No advance category note  
- No element resonance note
- No position-aware text — despite `position` being passed, the stub ignores position logic entirely beyond storing `position.name` and `position.description`
- A reversal note constructed as a string template (`In reversal, ${card.coreMeaning.toLowerCase()} turns inward`) — not the card-specific reversed meaning

This stub is what every Celtic Cross user receives in the interpretation panel during the reveal sequence. It is not the engine. It is a placeholder that was never replaced.

The real engine function at line 678 of `src/engine/tarot.ts` computes all the missing signals: `buildTransitInfluence()`, `buildAstroHeadline()`, `buildElementResonanceNote()`, `buildLunarPhaseNote()`, `buildAdvanceCategoryNote()`, and `adaptInterpretationToPosition()`. All of this work exists and is tested. None of it reaches the Celtic Cross user.

**What breaks:** Every Celtic Cross interpretation panel shows a stripped-down reading. This is not a future gap to address — this is the current state. The team shipped this believing task-0006 was complete. The stub is still in production.

---

## 3. The GPT Rate Limiter Is Not Wired to the Tarot Routes

I looked at `server/routes/tarot.ts`. The file has two routes: `POST /api/tarot/check-limit` and `GET /api/tarot/usage`. Neither route touches GPT. The actual GPT synthesis calls for tarot — `handleTarotSingleSynthesis`, `handleTarotThreeSynthesis`, `handleTarotCelticSynthesis`, `handleTarotDiscuss` — are dispatched through `server/services/gpt.ts` via the main GPT router, not through the tarot router.

This means tarot synthesis calls go through the existing `gptRateLimit` middleware — the same middleware that governs daily readings, solar returns, and synastry. A user who draws a Celtic Cross consumes the same daily GPT budget as a user who requests a daily transit reading.

But the `tarot_usage` table, the `checkDailyCardLimit`, and `checkWeeklyThreeCardLimit` functions in `tarotGate.ts` — the functions I explicitly recommended building — govern card *draws*, not synthesis calls. The card draw limit and the GPT synthesis call are tracked by different systems that do not talk to each other.

This creates a specific exploit: a user can draw their daily card (incrementing `daily_cards` in `tarot_usage`), receive the instant interpretation without triggering a synthesis, then call the synthesis endpoint directly. The draw counter says they've used their allowance. The synthesis counter (tracked by the generic GPT rate limiter) is separate. Whether this constitutes an exploit or intended behavior is not documented anywhere in the codebase.

More importantly, the Celtic Cross has no draw counter at all — `checkCelticCrossAccess()` only checks tier. A basic-tier user can trigger 50 Celtic Cross GPT syntheses in a day and each one goes through the generic GPT limiter, not a tarot-specific gate.

**The hidden assumption that will not hold:** The team believes they built a tarot-specific rate limiting system. They built a tarot-specific *draw counting* system. These are different things, and the difference matters when GPT costs are material.

---

## 4. The Celtic Cross Synthesis Runs Without the Live Sky

This is not a gap. It is a design decision that was implemented and then described as a gap.

In `server/services/gptTarot.ts`, `handleTarotCelticSynthesis` at line 448 does something notable. When `userId` is provided, it re-derives the natal chart and recalculates numerology. But it does not call `calculateTransits()`. The three-card handler at line 323 does call `calculateTransits()` for both daily and weekly periods. The single-card handler at line 220 does the same.

The Celtic handler explicitly has no transit calculation:

```typescript
if (userId) {
  const ctx = resolveUserBirthContext(userId)
  if (ctx) {
    // ... natal chart, numerology recalculated ...
    // calculateTransits is NOT called
  }
}
```

The Celtic Cross prompt therefore contains the person's natal Sun, Moon, Ascendant, Moon phase name, advance signal — but no daily transit summary, no weekly transit summary, no specific transit aspects. The prompt section labeled "## This Person's Living Sky" at line 509 shows only static natal data plus current Moon phase and personal day. The sky is not live. It is a snapshot of the person's birth chart plus a moon phase label — not the actual transits in effect today.

For comparison, the single-card prompt has four distinct sections: "## This Person's Sky Right Now," "## Daily Transit Context," and "## Weekly Transit Context," each with real computed data. The Celtic Cross, supposedly the most complex and meaningful spread, has none of this.

The vision document acknowledges this. But acknowledging it as a gap does not change the fact that every Celtic Cross synthesis currently produced is running without the most contextualizing data the system possesses. The ten-card constellation that is supposed to feel "written for them" is written against a partial sky.

---

## 5. The `gpt-4o-mini` Model Is Being Used for a 3000-Token Celtic Cross Synthesis

In `server/services/gpt.ts`, the `callOpenAI` function is hardcoded to `model: 'gpt-4o-mini'`. The Celtic Cross synthesis handler passes `max_tokens: 3000`. This is the most expensive and complex prompt in the system — ten cards, eight named sections, specific instructions about archetypal framing, psychological dynamics, and astrology resonance — and it is being routed to the cheapest, least capable model in the OpenAI family.

`gpt-4o-mini` is appropriate for the daily snapshot, the brief transit reading. It is a 30-second reading for a 300-token prompt. A Celtic Cross synthesis is a 3000-token output document that requires the model to hold ten card meanings, their positions, their elemental interactions, natal chart data, and a stated intention simultaneously while generating eight coherent sections. The model is not incapable of this, but the probability of the output being generic, repetitive, or internally contradictory is higher at this model tier.

The team is not aware of this trade-off because there is no documentation of the model selection rationale. The model is hardcoded once and the decision is invisible.

**The hidden assumption that will not hold:** The assumption is that `gpt-4o-mini` can produce synthesis quality that satisfies the "could this apply to any other person on the platform" quality bar for a ten-card Celtic Cross. This assumption has not been tested against the quality bar. It may be correct. It may not. The failure mode is silent: the model produces plausible-sounding text that passes a casual review but fails the bar under close reading. Nobody has an alert for this.

---

## 6. The `userId` Optional Everywhere: Data Flows Without Authorization at Key Points

In `handleTarotSingleSynthesis(payload, userId?: number)`, the `userId` parameter is optional. When it is absent, the function uses the client-supplied payload values for natal signs, transit summaries, and personal day. The server does not verify these client-supplied values.

This means a client can send a modified synthesis payload — different natal signs, different transit summary — and the server will use the client-supplied values without question. A user can claim to be a Scorpio Sun when they are a Gemini Sun, and the synthesis will be tailored to a Scorpio Sun.

Is this a practical attack vector? For most users, no. For a user who wants a reading that better fits their self-concept, yes. More practically: it means the server has no ground truth for quality control. If the client has a bug that corrupts the natal sign serialization, the server will synthesize a reading against corrupted data without any warning. The `resolveUserBirthContext(userId)` path, which re-derives data server-side, only runs when `userId` is present and the user has a birth context registered. For anonymous or partially registered users, the fallback is entirely client-trust.

This is not a sprint-0024 problem to solve. But it is a fragility that every sprint that adds synthesis handlers makes slightly worse.

---

## 7. What Everyone Is Excited About That They Shouldn't Be: Intention Threading

The sprint vision has identified "intention threading" as the key depth gap. The proposal is to pass `userIntention` through the interpretation engine, the GPT prompts, and the Discuss context so that the reading is anchored to what the user actually came to explore.

I looked at how `userIntention` currently flows through the system.

In `handleTarotSingleSynthesis`, intention appears once at the very top of the prompt:

```typescript
const intentionLine = payload.userIntention
  ? `The person drew this card seeking clarity on: "${payload.userIntention}"`
  : 'This is an open daily draw — no specific question was asked.'
```

It is a single line inserted at the top, before the card data, the sky data, the transit context. The model reads it and moves on. There is no instruction to return to this intention at any point in the synthesis. There is no instruction to evaluate whether the card addresses the intention or diverges from it. There is no instruction to close the synthesis by reflecting the intention back to the user.

In the GPT prompt instructions for the single-card synthesis, the word "intention" appears exactly once — in that opening line. The four-paragraph instruction block does not reference intention at any point. Paragraphs 2, 3, and 4 are about natal chart, daily transits, and weekly transits. The model is not instructed to anchor these to the stated intention.

Sprint 0024 plans to "thread intention explicitly." Threading requires more than inserting the intention string once at the top of a prompt and expecting a language model to honor it across four paragraphs. A model responding to `max_tokens: 900` with no explicit instruction to weave the intention through each section will optimize for completion coherence, not intention relevance. The intention will influence the first sentence and fade.

**The fragility:** The team will add the intention to the engine context and re-insert it in additional prompt positions and declare the threading done. The output will be slightly more intention-relevant than before. Whether it meets the vision's bar — "traceable in more than one paragraph" — depends on prompt engineering precision that has not yet been specified. This is an output quality claim that cannot be verified programmatically.

---

## 8. The Randomness Incoherence in the Celtic Cross

At the top of `CelticCrossReading.tsx`, the card draw uses:

```typescript
function shuffleTarotDeck(): DataTarotCard[] {
  const deck = [...ALL_TAROT_CARDS]
  for (let index = deck.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    // ...
  }
}

function computeCardReversal(): boolean {
  return Math.random() < 0.3
}
```

This is `Math.random()` — the browser's non-seeded PRNG. Compare this to `src/engine/tarot.ts` where `drawCards()` uses a deterministic LCG seeded with `userId + birthDate + localDate + spreadType`. The engine provides a reproducible, user-anchored draw. `CelticCrossReading.tsx` ignores the engine entirely and uses pure randomness.

This means:
- A Celtic Cross user who draws the same day twice gets different cards each time
- The Celtic Cross cannot be replicated from a seed (breaking saved readings replay)
- The "natal chart shapes your draw" narrative that the product communicates does not apply to the Celtic Cross

This is not a minor inconsistency. It is a philosophical incoherence. The single-card and three-card flows use the engine's seeded draw. The Celtic Cross uses dice. Users who do both in the same session are experiencing two different ontologies without knowing it.

The saved reading schema in `types.ts` stores `drawnCards` with `cardId` and `reversed`, which allows replay. But if the reversal was assigned via `Math.random()`, replaying a saved reading cannot guarantee the same reversal states unless those states were saved at draw time. The schema saves them, so replay works — but the draw itself being unseed means the "personalized draw" marketing claim does not apply to the most premium spread in the product.

---

## 9. The Error Classification That Creates Incorrect User Messaging

In `CelticCrossReading.tsx`, the synthesis error handler at lines 527–542:

```typescript
if (err instanceof RateLimitError) {
  setSynthesisError('rate-limited')
} else if (err instanceof Error) {
  if (err.message.includes('401') || err.message.includes('Unauthorized')) {
    setSynthesisError('session-expired')
  } else if (err.message.includes('timeout') || err.message.includes('TIMEOUT')) {
    setSynthesisError('timeout')
  } else {
    setSynthesisError('unavailable')
  }
}
```

The classification logic uses string matching on error messages. `err.message.includes('401')` is a fragility: if the error message format ever changes — if a new middleware wraps the error differently — the '401' check fails silently and the user sees "The synthesis is resting" instead of "Your session has ended." This misclassification sends the user to retry an endpoint that will reject them until they re-authenticate.

The string `'timeout'` will not be present if the AbortController fires and produces a `DOMException` with the message "signal is aborted without reason" or "The user aborted a request." The timeout classification will fail in exactly the scenario where a slow Celtic Cross synthesis times out — which is the most likely production failure mode given that `gpt-4o-mini` needs to produce 3000 tokens.

**What breaks under stress:** A user waits through a 10-position reveal sequence, then waits through the constellation overlay, then waits 90 seconds for a synthesis that times out. The error fires. The timeout check misses because the error message format doesn't contain the string `'timeout'`. The user sees "The synthesis is resting" with a Retry button, retries, waits another 90 seconds, gets the same result. No error tells them the system has a timeout problem. No alert tells the team.

---

## 10. The `TarotContext.tsx` Type Definitions Have Not Been Updated

The comment at line 4 of `src/context/TarotContext.tsx` reads:

```typescript
// Placeholder types — replaced when src/engine/tarot.ts and src/data/tarot/spreadPositions.ts land
```

These files have landed. `src/engine/tarot.ts` exists and exports its own `DrawnCard`, `InstantInterpretation`, `SpreadMode` types. But `TarotContext.tsx` still uses its own placeholder definitions:

```typescript
export interface DrawnCard {
  id: string
  name: string
  suit: string | null
  number: number | null
}
```

This is a fraction of the actual `DrawnCard` shape. The context's `TarotState.drawnCards: DrawnCard[]` uses these stripped-down placeholder types. Components downstream of the context receive a different shape than the engine produces. This is why `TarotPage.tsx` imports separately from both:

```typescript
import { TarotProvider, useTarot } from '../../context/TarotContext'
import type { TarotAstroContext } from '../../context/TarotContext'
// ...
import type {
  TarotCard,
  TarotAstroContext as EngineCtx,
  InstantInterpretation as EngineInterp,
} from '../../engine/tarot'
```

The as-aliasing (EngineCtx, EngineInterp) is a workaround for the name collision caused by the context's unreplaced placeholder types. The two type systems coexist by aliasing rather than unification.

The comment saying "replaced when these files land" was written before the files landed. The files landed. The replacement did not happen. This is the footprint of a task that was marked done without verifying the cleanup.

---

## 11. The Data Layer Has No Defense Against Silent Truncation

The `formatTransitSummary` function in `gptTarot.ts` slices arrays:

```typescript
const topAspects = transitData.transitAspects.slice(0, periodLabel === 'Daily' ? 5 : 7)
const ingresses = transitData.ingresses.slice(0, periodLabel === 'Daily' ? 2 : 4)
```

The number 5 and 7 are hardcoded. If the transit engine returns 20 aspects, 15 are silently dropped. The GPT model sees only the first 5. If the most significant transit for this user's reading is aspect #8 — because aspects are ordered by something other than significance, such as calculation order — the model never sees it.

I looked at how `transitData.transitAspects` is ordered. The `calculateTransits` function in `src/engine/transits.ts` presumably orders aspects by orb or by some priority. But the transit summary slice takes the first N without any documentation of what "first" means in this ordering. Whether "first" is "most relevant" or "most recently calculated" or "alphabetical by planet name" is not documented in `gptTarot.ts`.

**The silent wrong result risk:** A user with Saturn square natal Sun (a major life transit, orb 0.5°) and Mercury trine natal Venus (a minor transit, orb 0.2°) may receive a synthesis that mentions Mercury-Venus and ignores Saturn-Sun — if Saturn-Sun happens to fall outside the top-5 slice. The reading would be plausible, internally coherent, and wrong.

---

## 12. What This Sprint Is Underestimating: The Prompt Engineering Is Not Engineering

The sprint vision states: "The GPT prompt voice is capable but not yet ruthless." The fix is described as "tightening" prompts to enforce "fewer, sharper sentences" and "concrete imagery over abstraction."

This framing understates the problem. Prompts are not configuration knobs. They are natural language instructions given to a probabilistic model. Tightening a prompt is a creative writing exercise with no ground truth for success, no unit tests, and no regression detection. The team will tighten the prompts, produce some test readings that seem better, and declare the work done. Whether the improvement is durable — whether it holds for a user with an unusual natal chart, a vague intention, or a spread heavy in court cards — cannot be determined without testing against a diverse set of real inputs.

The "could this apply to any other person on the platform" quality bar is a human judgment that requires human reviewers to apply it to real outputs across diverse inputs. This is not a sprint task. It is an ongoing editorial function. If the team treats it as a one-time prompt edit, the prompts will regress under the pressure of the next sprint that touches them.

I am not saying do not tighten the prompts. I am saying: build the infrastructure to know when they have been degraded. A small set of canonical test cases — specific natal charts, specific intentions, specific card draws — evaluated against the quality bar by a reviewer after every prompt change is not optional for a product whose primary value is interpretation quality.

---

## Summary of Fragilities

| # | Fragility | Current State | Risk Level |
|---|-----------|---------------|------------|
| 1 | Three parallel `TarotAstroContext` type definitions | Active in production | High — every transit wiring attempt touches the wrong type |
| 2 | Celtic Cross uses local stub instead of real engine | Active in production | Critical — every Celtic reading is degraded |
| 3 | Tarot draw counter vs. synthesis counter are separate systems | Active in production | Medium — cost asymmetry, potential exploit |
| 4 | Celtic synthesis runs without live transits | Active in production | Critical — core depth claim is false |
| 5 | `gpt-4o-mini` for 3000-token Celtic synthesis | Active in production | Medium — quality ceiling unknown |
| 6 | `userId` optional in synthesis handlers — client-supplied data unverified | Active in production | Low-Medium |
| 7 | Intention threading is one-line insertion, not structural threading | Not yet built | Medium — output quality claim will not be met |
| 8 | Celtic Cross uses `Math.random()` instead of seeded engine draw | Active in production | Medium — philosophical incoherence |
| 9 | Error classification uses brittle string matching | Active in production | High — timeout failures produce wrong user messaging |
| 10 | `TarotContext.tsx` placeholder types never replaced | Active in production | High — future type work touches wrong definitions |
| 11 | Transit summary truncated by fixed slice with no orb-priority ordering | Active in production | Medium — silent wrong results possible |
| 12 | Prompt quality has no regression detection infrastructure | Structural gap | High — improvements cannot be verified as durable |

---

## Final Observation

The team has a working tarot module. The mechanics are not "sound" in the sense of structurally correct — there are at least three places where the code does something other than what the team believes it does (items 2, 3, and 8 above). But the user experience works, the synthesis produces plausible output, and the failure modes are mostly soft.

Sprint 0024 is asking the team to deepen interpretation quality against an implementation that has structural divergences the team does not know exist. The depth improvements will be applied on top of a stub that shadows the real engine. The transit wiring will populate a context type that is not consumed by the component that needs it. The intention threading will be added to a prompt structure that provides no mechanism to enforce it across multiple paragraphs.

This is not a catastrophe. It is a distributed fragility — ten small things that each appear manageable, but whose combined effect is that the quality improvements sprint 0024 aims for will be partially or fully invisible to the user.

Fix the three type universes first. Replace the Celtic Cross stub with the real engine. Seed the Celtic Cross draw deterministically. Then add depth.

Antifragility is not built by adding features on top of a fragile foundation. It is built by making the foundation honest about what it actually does.
