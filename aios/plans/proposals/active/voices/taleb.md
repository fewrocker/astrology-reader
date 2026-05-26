# Taleb's Risk Review — Sprint 0028: After Full Transit Coverage
*Nassim Nicholas Taleb. May 2026.*

---

## Opening Observation

Sprint 0027 shipped what it promised. 101 new transit adaptation entries. The two-pass retrograde priority fix. The `retrogradePlanets` rename. The single-card position register fix. The per-pip-card coverage assertion test.

These are genuine improvements. The priority-override bug I named — retrograde `condition: 'any'` entries overriding the dominant planet — was the most critical fragility I identified, and it was fixed via the two-pass approach in `buildTransitInfluence`. I note this because it is the correct response to a named systemic fragility.

Now let me examine what remains.

---

## 1. The Dominant Transit Planet Selection Remains a Single-Winner Architecture

I named this in sprint 0027 as the most important fragility. It was not addressed — correctly, because it was out of scope and the data layer work was the priority. It remains the most important architectural fragility in the system.

To restate precisely: `buildTarotAstroContext` computes `dominantTransitPlanet` as the highest-priority planet by `PLANET_PRIORITY`. Orb, applying/separating status, and transit type are not factored. A Pluto trine at 4° separating will suppress a Saturn opposition at 0.3° applying, even though the Saturn transit is the astrologically significant one for that person on that day.

With 193 entries now covering all 78 cards, the practical impact has grown. Before this sprint, the coverage gap meant that for 30 cards, no Level 1 entry would fire regardless of which planet was dominant. The priority override problem was masked by the absence of entries. Now that entries exist for every card and every major planet condition, the question of which planet fires becomes the decisive quality factor. A user with Pluto nominally dominant due to a wide, separating transit will receive Pluto entries for every card they draw — even when Saturn, Venus, or Mars has a much tighter, more personally activated transit.

The `TransitAspect` type already carries `orb` and `applying`. The fix requires modifying the dominance scoring in `buildTarotAstroContext`, not the data layer. This is a one-function change: compute a weighted score for each transit planet (`planetPriority × orbRecency × applyingBonus`) and select the highest scorer rather than the highest static priority. The change would make the delivered transit note more likely to correspond to what is actually most significant in the user's sky.

This is the most structurally important improvement available to the system right now. The data quality that sprint 0027 added cannot be fully realized until the selection logic is improved.

---

## 2. The Pre-existing Failing Test Has Been Deferred Two Sprints

The changelog for sprint 0027 noted: "1 pre-existing failure: `adapts the instant interpretation text to the actual spread position` — pre-dates this sprint."

This test has been failing since before sprint 0027. It tests whether `computeInstantInterpretation` correctly adapts text for different spread positions — `situation` vs `advice`. This is production behavior. The test exists because someone correctly identified that position adaptation is a meaningful quality gate. The test is failing because of a single missing import: `SPREAD_POSITIONS` is imported as a type but not as a value.

Two sprints have passed. The fix is one line. The risk of deferring further: as more code touches position adaptation (the single-card fix in sprint 0027 is precisely this area), the chance that a regression goes undetected increases. A broken test is an absent safety net.

I will not soft-pedal this: deferring a trivially fixable broken test in a production codebase is a process failure. The test should be fixed in the next sprint, alongside whatever else is being shipped.

---

## 3. The Coverage Test's Success Is Now the Standard; Regressions Need a Harder Guard

The sprint-0027 coverage test (`all pip cards (Two through Nine) have at least one transit adaptation entry`) now passes. This is the minimum contract: at least one entry per pip card.

The test does not assert entry quality. It does not assert that Saturn, Pluto, and the suit-appropriate planet are all covered per card. A future developer could add one Mercury entry to a pip card that currently has Saturn + Pluto + Mars entries, and if Saturn + Pluto + Mars entries were accidentally deleted, the test would still pass because Mercury is present.

The test is a floor, not a ceiling. After a sprint that wrote 101 entries with careful planet-per-suit logic (Saturn + Pluto + Mars for Wands/Swords, Saturn + Pluto + Neptune for Cups, Saturn + Pluto + Venus for Pentacles), that logic should be encoded in a test. Something like: "All Wands pip cards have at least one Saturn entry, one Pluto entry, and one Mars entry." If someone removes a card's Saturn entry during a refactor, the test catches it.

This is the difference between a floor test and a contract test. The floor test was the right first step. The contract test is what preserves the investment.

---

## 4. The `formatTransitSummary` Truncation Ordering Is Still Not Documented

I raised this in sprint 0027 (point #7) as the fragility where `transitData.transitAspects.slice(0, 5)` may not be ordered by astrological significance. It remains unaddressed.

The GPT synthesis handlers receive the transit summary as a pre-formatted string. The quality of the synthesis paragraph 3 ("connect the card to the daily transits") depends on whether the top-5 transit aspects in the summary are the 5 most relevant aspects. If the array happens to be ordered by planet alphabetization or by calculation sequence rather than by orb or significance, the synthesis receives a misleading selection.

This fragility has compounded rather than diminished as the prompt architecture has been refined. Sprint 0026 added specific instructions to paragraph 3: "Use the Daily Transit Context above concretely, but every transit point you mention must be explicitly tied back to the card." The instruction correctly requires GPT to tie the transit context to the card. But if the transit context lists Mercury conjunct natal Venus as the first aspect and Jupiter trine natal Moon as the second — when actually Saturn opposing natal Sun is orb 0.3° applying and should be most prominent — the synthesis will discuss Venus-Mercury and Jupiter-Moon while the most significant transit for that person is absent from the top of the list.

The fix is in the transit engine, not the tarot engine: `calculateTransits` should sort `transitAspects` by a significance score before returning. The significance score is straightforward: higher for outer planets, higher for tighter orbs, higher for applying vs separating. This is a transit engine task, not a tarot data task. But it affects tarot quality.

---

## 5. The Natal Correspondence Layer's Absence Creates an Asymmetric Quality Gap

Sprint 0027 delivered specific transit adaptations for every card. The transit layer now speaks with precision. The natal layer — the connection between the card and the user's birth chart — still does not have a parallel specific layer.

The current `buildElementResonanceNote` produces comparisons of card element to natal dominant element. These are generic: "your Fire nature meets this Fire card." The GPT synthesis paragraph 2 is where specific natal connections appear, because the prompt explicitly instructs the model to cite chart ruler, house placements, and modality. But paragraph 2 arrives only after the network call completes.

The asymmetry: transit specificity is available immediately, in the static layer, before GPT loads. Natal specificity is available only after GPT loads. A user who opens the interpretation panel and reads the "In Your Sky Now" section sees a specific, card-keyed transit note. They do not see a specific, card-keyed natal note. The natal context exists in the engine — chart ruler, dominant element, house placements — but no function maps it to card-specific resonance language.

This is not a defect in transit coverage. It is the next quality frontier. The infrastructure for natal specificity is in place: `TarotAstroContext` carries the natal data, `TarotCard` carries the ruling planet and element, `ASTRO_CONNECTIONS` carries per-card planetary associations. A function that detects and surfaces the three or four most meaningful natal-card correspondences would close this gap without touching the GPT layer.

The fragility here is not technical but motivational: the transit layer was built in response to a clear coverage test. The natal correspondence layer has no coverage test, no floor assertion, and therefore no sprint priority. It exists only as a quality observation. It will remain absent until it is given a measurable target.

---

## 6. The Dead Code in gptTarot.ts Persists

Two sprints. Still there. `computeDominantModality` at line 88 and `computeServerDominantModality` at line 481 in `gptTarot.ts` are two functions computing the same thing from two lookup tables in the same file. Only one is called. The other is dead.

I continue to name this because dead code in a file that handles GPT synthesis for a production feature is a maintenance liability. The file is complex enough that dead functions with plausible names create uncertainty. Future developers will not know which function is canonical. When a modality computation bug is fixed, both functions will need to be updated — except the developer may not realize the dead function exists.

This is a one-sprint cleanup task. It should be done.

---

## 7. The Three-Card Synthesis Results Are Computed But Not Trusted Enough to Show

`computeThreeCardSynthesis` produces `astroResonanceNote` — a pre-computed synthesis string. This string is passed to GPT but not shown to the user. The system computed it. The system trusts it enough to send it to GPT. The system does not trust it enough to show it to users directly.

This is a false distinction. If the string is good enough to anchor GPT synthesis, it is good enough to show users as an immediate constellation summary. The reluctance to show it suggests either: (a) the string's quality is inconsistent and production exposure would reveal this, or (b) the team has not considered making this change.

If it is (a), the solution is to improve the string quality before showing it. If it is (b), the solution is to show it.

The fragility of not showing it is that users experience a dead period between completing the three-card draw and receiving GPT synthesis. During this period, the reading has no forward momentum. The interpretation panels for individual cards are available but the inter-card meaning — which is what a three-card spread is about — is absent. Users in this dead period are more likely to disengage or lose the thread of the reading.

Surfacing the `astroResonanceNote` as a preview resolves a user-experience fragility without introducing any new computational cost. The computation already happened. Show the result.

---

## Summary of Remaining Fragilities

| # | Fragility | Risk Level | Status |
|---|-----------|------------|--------|
| 1 | Dominant transit planet single-winner selection ignores orb/applying | High | Deferred from sprint-0027 |
| 2 | Pre-existing failing test unrepaird for 2+ sprints | Medium | Process failure |
| 3 | Coverage test is a floor, not a contract — suite/planet specifics unguarded | Medium | New this review |
| 4 | `formatTransitSummary` truncation not significance-ordered | Medium | Deferred from sprint-0027 |
| 5 | Natal correspondence layer absent from static interpretation | Medium | No coverage target defined |
| 6 | Dead code in gptTarot.ts | Low-Medium | Deferred from sprint-0027 |
| 7 | Three-card synthesis `astroResonanceNote` computed but not surfaced | Low-Medium | New this review |

---

## What This Sprint Should Not Touch

The GPT prompt architecture is settled. The synthesis handlers are producing quality output. The two-pass retrograde fix is correct. The transit entry data is the best it has been.

The improvements I am naming are about: making the existing quality visible to users faster (three-card preview), making the existing natal data speak in the static layer (natal correspondence), and fixing the underlying signal that determines which transit entry fires (dominance weighting). These are improvements that honor the work that has already been done rather than layering more complexity on top of it.

What gets measured gets managed. Give the natal correspondence layer a measurable target and it will be addressed. Give the transit dominance weighting a test and it will be fixed. Give the truncation ordering a documented contract and it will not persist as a silent misconfiguration.

The fragility of quality work is that it tends to stop being examined precisely when it has gotten good enough to stop being obviously broken. The reading experience is genuinely good now. That is the moment when the next layer of fragility becomes consequential, because the obvious problems have been removed and the subtle ones remain.
