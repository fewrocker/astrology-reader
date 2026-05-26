# Technical Analysis — Tarot Module (Sprint 0028)
*Voice: John Carmack*

---

## What Changed in Sprint 0027

Sprint 0027 closed the pip transit adaptation gap. 101 new entries across 30 cards. Coverage test added and passing. The `retrogradePlanets` rename landed. Single-card draws now route through `present-active` position register instead of falling to the unregistered null path. The Taleb fragility about retrograde `condition: 'any'` entries overriding the dominant planet was addressed by the two-pass approach in `buildTransitInfluence`.

These are real, verifiable improvements. The architecture is in the state I described as the correct target state.

Now let me describe what the code actually looks like from a technical standpoint after those changes, and where the remaining fragilities live.

---

## The Dominant Transit Planet Selection Is Still a Single Winner

Taleb named this in the sprint-0027 review and it wasn't addressed — correctly, because it was out of scope. I want to be precise about the actual impact now that the data layer is complete.

`buildTarotAstroContext` computes `dominantTransitPlanet` as a single string: the highest-priority planet in `PLANET_PRIORITY` among all active transit aspects. The priority is: Pluto=10, Neptune=9, Uranus=8, Saturn=7, Jupiter=5, Mars=3, Sun=2, Venus=2, Mercury=1, Moon=1.

With 193 transit entries across 78 cards, the question is now: for a given user's sky, which entries actually fire? If a user has an active Pluto trine (orb 4°, separating) and an active Saturn opposition (orb 0.5°, applying), Pluto still wins by priority and the Saturn entry fires. This was less consequential when most cards lacked Saturn entries entirely. Now that every card has specific Saturn entries, the priority override means: tight Saturn aspects are being systematically underrepresented relative to their actual astrological significance.

The correct fix would require factoring orb and applying/separating into the dominance computation. Something like: `priorityScore = planetPriority × (1 + (1 - orb/maxOrb) × 0.5) × (applying ? 1.2 : 1.0)`. This would make a tight 0.5° applying Saturn square more dominant than a wide 4° separating Pluto trine.

This change touches `buildTarotAstroContext` in `src/engine/tarot.ts` and the mock data in `src/engine/__tests__/tarot.test.ts`. The transit data structure already has `orb` and `applying` fields on each `TransitAspect` — the engine doesn't need new data, it needs a different weighting computation.

**Impact:** Medium-to-high. The most symbolically significant transits for many users are not outer planets but tight personal planet transits. The current system will routinely surface the wrong card-transit pairing.

---

## The Pre-existing Failing Test Is Still Failing

The changelog for sprint 0027 notes: "1 pre-existing failure: `adapts the instant interpretation text to the actual spread position` (SPREAD_POSITIONS missing from import in tarot.test.ts — pre-dates this sprint)."

I looked at the test file. The test at line 348 imports `SPREAD_POSITIONS` from `'../../data/tarot/spreadPositions'` — or it should. Looking at the actual imports at the top of `tarot.test.ts`:

```typescript
import type { SpreadPosition } from '../../data/tarot/spreadPositions'
```

This is a `type`-only import. `SPREAD_POSITIONS` (the value) is not imported. The test tries to use `SPREAD_POSITIONS.find(...)` but the value isn't available, so it fails at runtime. The fix is one line: change the import to include the value alongside the type.

This is a real test that covers real behavior — the position adaptation logic that was improved in sprint 0026. The test has been broken since sprint 0025 and has been deferred sprint after sprint. It should be fixed. It tests whether `computeInstantInterpretation` correctly adapts text when passed a `situation` position vs an `advice` position. This behavior is production code. The test failure is masking a regression surface.

**Fix:** Add `SPREAD_POSITIONS` to the import in `src/engine/__tests__/tarot.test.ts`.

---

## The Dead Code in gptTarot.ts

`gptTarot.ts` contains two functions that compute dominant modality:
- `computeDominantModality()` at approximately line 88 — uses `SIGN_MODALITIES_SERVER`
- `computeServerDominantModality()` at approximately line 481 — uses `SERVER_SIGN_MODALITIES`

Both exist in the same file. Only `computeServerDominantModality` is called by the handlers. The first function is dead code. The two lookup tables (`SIGN_MODALITIES_SERVER` and `SERVER_SIGN_MODALITIES`) are identical but named differently.

This is three copies of the same data and two copies of the same function in a single file. Taleb noted this in sprint-0027; it was deferred. It should be cleaned up in the next code-quality sprint. The risk is divergence: if someone fixes a modality edge case, they may fix it in one function and miss the other. The dead function provides false confidence that there are two paths.

**Fix:** Remove `computeDominantModality` and `SIGN_MODALITIES_SERVER` from `gptTarot.ts`, rename `SERVER_SIGN_MODALITIES` to something consistent, keep only `computeServerDominantModality`.

---

## The Three-Card Synthesis Signals Are Computed but Not Directly Surfaced

`computeThreeCardSynthesis` in `src/engine/tarot.ts` returns a rich `ThreeCardSynthesisInput` object that includes:
- `elementDistribution` (elements, dominant, allSame, crossElement, fireWaterTension)
- `polarityProfile` (reversedCount, allReversed, allUpright, centerReversed)
- `archetypeFraming` (hasFool, hasWorld, hasDeathOrTower, numericalProgression)
- `suitPattern` (suits, allSameSuit, noMinorArcana)
- `astroResonanceNote` — a string that already synthesizes the most interesting structural feature

On the client side, `ThreeCardReading.tsx` calls `getTarotThreeSynthesis` to send this to GPT. The GPT synthesis receives it and produces chapters. But the `astroResonanceNote` and element/polarity signals are not shown to the user before GPT returns.

The `astroResonanceNote` is a pre-computed string like: "Fire and Water meet across the spread under a Saturn sky — emotional pressure and creative drive are in direct conversation." This string exists in the engine. It is passed to GPT as context. It is not rendered to the user directly.

Showing `astroResonanceNote` immediately after the three cards are drawn — before GPT loads — would give users a structural orientation for the constellation. This is a small UI change: render the synthesis input's `astroResonanceNote` as a brief display note while GPT processes. The data is already there. No additional computation required.

**Implementation:** In `ThreeCardReading.tsx`, after all three cards are selected, show the `astroResonanceNote` from `computeThreeCardSynthesis` above the GPT skeleton. Takes the synthesis call that already runs and surfaces one of its outputs immediately. Low effort, high readability gain.

---

## The Natal-to-Card Correspondence Is Not in the Static Layer

The `TarotAstroContext` has: `natalSunSign`, `natalMoonSign`, `natalAscendantSign`, `chartRulerPlanet`, `natalDominantElement`, `natalMoonHouse`, `natalVenusHouse`, `natalNorthNodeHouse`, `natalMarsHouse`.

The `TarotCard` has: `element`, `rulingPlanet`, `rulingSign`.

The `ASTRO_CONNECTIONS` has per-card `rulingPlanet`, `rulingSign`, `baselineNote`.

There is currently no function that takes these two and produces a natal resonance note — a sentence that says "this card's Venus ruler aligns with your natal chart ruler (also Venus)" or "this card's Water element resonates with your Moon in Cancer." The closest thing is `buildElementResonanceNote`, which compares `card.element` to `natalDominantElement` but produces a generic comparison string.

A `buildNatalResonanceNote` function would take a card and an astro context and produce a specific one-sentence note when a meaningful correspondence exists. The correspondences to detect:
1. Card's ruling planet === `chartRulerPlanet` — highest resonance signal
2. Card's element === natal dominant element — strong resonance
3. Card's ruling planet === planet in a key natal house (Moon house, Venus house, Mars house, North Node house) — specific house activation

This function would live in `src/engine/tarot.ts` alongside `buildElementResonanceNote`. The output would appear in `InstantInterpretation.astroConnection`. The `TarotInterpretationPanel` would render it in the "In Your Sky Now" section alongside or immediately after the transit influence.

**Cost:** Medium. New function, new field on `AstroConnection`, minor panel update. No GPT prompt changes. All data is already in the engine.

---

## The Test for `buildNatalResonanceNote` Is Implicit

If this function is added, it should be tested in `src/engine/__tests__/tarot.test.ts`. The existing mock context has `chartRulerPlanet: null` — a test for the ruling-planet-match case would need a context where `chartRulerPlanet` matches a card's `rulingPlanet`. The test structure already exists; adding one more describe block for the new function is straightforward.

---

## Summary of Technical Priorities

In order of impact and implementation clarity:

1. **Fix the pre-existing failing test** — one import line, restores coverage of position adaptation logic. Should have been done in sprint 0027. Zero risk.

2. **Surface `astroResonanceNote` in three-card reading** — pre-computed string already exists, UI addition only. Shows users the constellation structure before GPT loads.

3. **Build `buildNatalResonanceNote`** — medium effort, high interpretive value. Surfaces natal-card correspondence in the static layer before GPT synthesis. The data is all there.

4. **Fix dominant-transit weighting** — requires factoring orb and applying status into planet dominance scoring. The `TransitAspect` type already has these fields. Medium effort, corrects a systematic misallocation of which transit is "dominant."

5. **Dead code cleanup in `gptTarot.ts`** — low-risk deduplication, removes divergence surface for future modality computation fixes.

*The code is in the best state it has been. These are improvements on a solid foundation, not repairs to a broken one.*
