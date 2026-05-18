**Type:** Feature
**Originated by:** Jobs, Carmack, Miyazaki (strongest convergence)

## Problem / Opportunity

The `getTodayPageInterpretation` call in `TodayPage.tsx` (line 81) sends four arguments to the `today-synthesis` GPT handler: `currentMoon` (phase name, sign, void-of-course boolean), `top` (array of up to 3 `TransitAspect` objects), `personalDayNum` (integer), and `interpretation?.archetype ?? ''` (single archetype label string). That is the complete payload.

The server-side handler in `server/services/gpt.ts` (`handleTodaySynthesis`, line 566) receives these fields and builds a prompt that names the personal day number and archetype, the moon phase and sign (with a void note), and the top aspects as raw planet-symbol-planet strings with orb and nature. The prompt closes: "Write a 2-3 sentence personalized morning synthesis that weaves this person's Personal Day energy together with the current Moon phase and the active transit aspects."

The result is a brief that could apply to any person with that moon phase and those transit aspects. It is not personal. The natal chart is in scope at the `TodayPage` call site but is never serialized. The following signals are available in component state or derivable from it at the time `getTodayPageInterpretation` is called, and none of them reach the prompt:

**Natal Big Three (Sun, Moon, Ascendant signs).** `chartData.planets` (line 60) is in scope. The Sun sign is `chartData.planets.find(p => p.name === 'Sun')?.sign`. Moon sign is the same pattern. Ascendant sign is `chartData.angles.ascendant.sign`. These three are the foundation of any personal reading and are conspicuously absent.

**Natal house placements of transited planets.** The `TransitAspect` objects in `top` carry `natalHouse: number | null` (set by `calculateTransitAspects` in `transits.ts`). The current payload mapping in `TodayPage.tsx` (lines 81–86) does not include `natalHouse` or `applying` in the aspects array sent to GPT. The server prompt therefore produces "Saturn square natal Moon" instead of "Saturn pressing on your Moon in your 4th house (home and family)." House context is what makes a transit reading personal rather than generic.

**Pre-computed `computeTransitAspectBrief` sentences.** `computeTransitAspectBrief` (imported at `TodayPage.tsx` line 14, already called for the `AspectRow` components in the Sky Highlights card at line 239) generates house-aware, applying/separating-aware prose sentences for each transit. These sentences are more legible to the language model than raw structured data. They are already computed on the client and could be passed as `aspectBriefs: string[]` alongside the structured aspect array, or used to replace it entirely.

**Personal day essence text.** `interpretation` (line 44) is the full `NumberInterpretation` object from `getInterpretation('personalDay', personalDayNum)`. It carries `archetype` (sent), `essence` (a full expository paragraph, not sent), `keywords` (not sent), and `shadow` (not sent). The current prompt names only the archetype label. The `essence` text — or its first sentence, already extracted as `firstSentence` at line 46 — carries the qualitative meaning of the day that the single archetype word cannot convey.

**Void-of-course status as a named constraint.** `moon.isVoid` is passed in the `moon` object, and the server handler converts it to a terse inline note: "The Moon is void of course — avoid committing to irreversible decisions." This is correct but minimal. The prompt does not instruct the model to give the void status interpretive weight, nor to relate it to the personal day archetype or the nature of the active transits.

**Advance category string.** `advanceScore` (line 54) is computed synchronously from the session cache at lines 68–78 and set to a non-null `SnapshotScore` object when the advance engine has scored today as non-neutral. The `advanceScore.category` string (`'power' | 'favorable' | 'challenging' | 'shift'`) and `advanceScore.reason` string are both available before the GPT call fires at line 80. Neither is passed to `getTodayPageInterpretation`. The advance engine is the product's most sophisticated scoring layer; it is invisible to the GPT prompt that is supposed to synthesize the day.

**Natal moon phase.** The natal Sun-Moon elongation phase (the phase of the Moon at the moment of birth) can be derived from `chartData.planets` by computing the angular separation between the natal Sun longitude and natal Moon longitude. This is a short arithmetic operation using already-loaded data. The natal moon phase — New Moon natally, Full Moon natally, etc. — is an established astrological signal about the person's fundamental emotional and motivational orientation, and is directly relevant to how today's transiting Moon interacts with their chart.

The consequence of these omissions is concrete. The `handleTodaySynthesis` prompt at `server/services/gpt.ts` line 595 currently reads, in effect: "Personal Day 7 — The Seeker. Moon: Waning Gibbous in Aquarius. Saturn square natal Moon (challenging, 2.1° orb). Jupiter trine natal Sun (harmonious, 3.4° orb). Write 2-3 sentences." GPT produces a coherent response, but it is a generic daily tone-poem. It does not know that the Seeker's natal Moon is in Scorpio in the 4th house. It does not know that the challenging Saturn square is pressing on that Scorpio Moon specifically. It does not know that the advance engine has flagged today as a Challenging Period. It cannot produce a personal reading from impersonal inputs.

Jobs (voice file) identifies this as the central problem for sprint 0022: "The result is a paragraph that reads like it was written for anyone born on any day." Carmack (voice file) traces the precise omission: "`TransitAspect` objects from `getTopActiveTransits` carry `natalHouse` and `applying` — they are just not passed through." Miyazaki (voice file) names the human cost: "When I open this page, no one seems to know I have arrived."

---

## Vision

A user opens the Today page at 7 AM. The Morning Synthesis card loads its skeleton. When the text arrives, the first sentence names something specific about their day — not the moon sign, which anyone can look up, but the intersection of their natal chart, their personal day number, and what the sky is doing to their specific placements right now. "Your Personal Day 7 (The Seeker) coincides with Saturn pressing on your natal Moon in your 4th house — a day that wants depth and solitude rather than action." That sentence is not possible without the natal house. It is not generic. It could not appear on a newspaper horoscope page.

The second sentence weaves in the advance signal if one exists: "The advance engine flags today as a Challenging Period, and the void-of-course Moon through midday confirms it — hold major decisions until the energy clears this afternoon." Or, on a Power Day: "With Jupiter expanding your Venus in the 7th house and your Personal Day 2 supporting receptivity, this is a rare alignment for partnership moves." Or simply, on a quiet day with no advance signal, the second sentence names the quality of the day — not in abstract terms but in terms of this person's chart.

The user reads the paragraph and thinks: this was written for me. Not because it is flattering or vague enough to fit anyone, but because it names something specific that only their chart reveals — a house, a natal placement, a pattern visible in the intersection of three independent interpretive systems.

When the user does not have a natal chart entered (no `chartData`), the behavior is unchanged from today. The enriched payload requires a chart and does not fire the GPT call without one.

When the advance session cache is cold (the user has not visited the Advance tab this session), the advance category is omitted from the prompt gracefully — the synthesis still draws on the Big Three, natal houses, personal day essence, and void-of-course context. The advance signal is additive, not required.

---

## Specifications

### Client-side: `TodayPage.tsx` call site

1. **Extract the natal Big Three before the GPT call.** At the `getTodayPageInterpretation` call site (currently line 81), derive three strings from `chartData` (which is in scope and guaranteed non-null by the surrounding `if (chartData)` guard at line 60):
   - `natalSunSign: string = chartData.planets.find(p => p.name === 'Sun')?.sign ?? ''`
   - `natalMoonSign: string = chartData.planets.find(p => p.name === 'Moon')?.sign ?? ''`
   - `natalAscSign: string = chartData.angles.ascendant.sign`
   All three are `ZodiacSign` values (e.g., `'Scorpio'`, `'Gemini'`). If the Sun or Moon planet is not found in `chartData.planets` (degenerate state), the string falls back to `''` — the prompt will omit that sign gracefully.

2. **Include natal Moon house in the Big Three context.** In addition to natal Moon sign, derive `natalMoonHouse: number | null` from `chartData.planets.find(p => p.name === 'Moon')?.house ?? null`. When `chartData.unknownTime` is true, the house field will be 0 (unset) — treat house 0 as null. Pass this as part of the natal context alongside the sign.

3. **Derive the natal moon phase.** Compute the natal Sun-Moon elongation: the angular difference (mod 360) between `chartData.planets.find(p => p.name === 'Moon')?.longitude` and `chartData.planets.find(p => p.name === 'Sun')?.longitude`. Map this angle to a phase name string using the same 8-bucket boundary logic already used in `lunar.ts` (`phaseAngleToName`): 0–22.5° = New Moon, 22.5–67.5° = Waxing Crescent, 67.5–112.5° = First Quarter, 112.5–157.5° = Waxing Gibbous, 157.5–202.5° = Full Moon, 202.5–247.5° = Waning Gibbous, 247.5–292.5° = Last Quarter, 292.5–337.5° = Waning Crescent, 337.5–360° = New Moon. Produce a `natalMoonPhase: string` (e.g., `'Full Moon'`). If either longitude is unavailable (undefined), set `natalMoonPhase` to `null`.

4. **Pass the personal day essence text, not just the archetype label.** Replace `interpretation?.archetype ?? ''` in the call with the full archetype label, and add `personalDayEssence: firstSentence ?? ''` as a separate argument (or field). `firstSentence` is already computed at line 46 of `TodayPage.tsx`. Pass both: the archetype name (e.g., `'The Seeker'`) and the first sentence of the essence text (e.g., `'You are the soul who came to know — not the surface shimmer of facts, but the deep architecture of reality.'`). The first sentence is capped at one sentence by the existing `split(/(?<=\.)\s+/)[0]` extraction — it is concise enough for a prompt without padding.

5. **Include `natalHouse` and `applying` in each aspect object.** The `top` array passed to `getTodayPageInterpretation` currently has type `Array<{ transitPlanet: string; symbol: string; natalPlanet: string; orb: number; nature: string }>`. Add `natalHouse: number | null` and `applying: boolean | undefined` to each element by reading these fields directly from the `TransitAspect` objects in `top`. These fields are populated by `getTopActiveTransits` → `calculateTransitAspects` and are present on the `TransitAspect` type.

6. **Include pre-computed `computeTransitAspectBrief` sentences in the payload.** For each aspect in `top`, call `computeTransitAspectBrief(a.transitPlanet, a.type, a.natalPlanet, a.natalHouse, a.nature, a.applying)` (the same call already made for the `AspectRow` components at line 239) and store the resulting string as `aspectBriefSentences: string[]`. Pass this array alongside the structured aspect data. The server-side prompt builder should prefer these human-readable sentences over the raw structured fields when constructing the transit section of the prompt.

7. **Pass the advance category and reason when the session cache is warm.** After the `advanceScore` state derivation block (lines 66–78), pass `advanceScore?.category ?? null` as `advanceCategory: string | null` and `advanceScore?.reason ?? null` as `advanceReason: string | null` to the enriched call. If `advanceScore` is null or its category is `'neutral'`, pass `null` for both — the prompt omits the advance section in that case.

8. **Extend `getTodayPageInterpretation` function signature.** The new signature in `src/services/gptInterpretation.ts` accepts:
   ```
   getTodayPageInterpretation(
     moon: { phaseName: string; moonSign: string; isVoid: boolean },
     aspects: Array<{
       transitPlanet: string; symbol: string; natalPlanet: string;
       orb: number; nature: string; natalHouse: number | null; applying?: boolean
     }>,
     aspectBriefSentences: string[],
     personalDay: number,
     personalDayArchetype: string,
     personalDayEssence: string,
     natalSunSign: string,
     natalMoonSign: string,
     natalMoonHouse: number | null,
     natalAscSign: string,
     natalMoonPhase: string | null,
     advanceCategory: string | null,
     advanceReason: string | null,
   ): Promise<string>
   ```
   All parameters after `personalDayArchetype` are new additions. The function passes them through to `callProxy('today-synthesis', { ... })` in the enriched payload body.

9. **The `callProxy` call must not omit any new field.** The payload object sent to `callProxy('today-synthesis', ...)` must include every new argument. Optional fields with `null` values must still be included as explicit null properties (not omitted) so the server-side handler can distinguish "not provided" from "caller forgot to include it."

### Server-side: `server/services/gpt.ts` — `handleTodaySynthesis`

10. **Extend the `handleTodaySynthesis` payload type.** The function currently accepts `{ moon, aspects, personalDay, personalDayArchetype }`. Add the new fields to its parameter type to match the extended client payload:
    - `aspectBriefSentences?: string[]`
    - `personalDayEssence?: string`
    - `natalSunSign?: string`
    - `natalMoonSign?: string`
    - `natalMoonHouse?: number | null`
    - `natalAscSign?: string`
    - `natalMoonPhase?: string | null`
    - `advanceCategory?: string | null`
    - `advanceReason?: string | null`
    All are optional to preserve backward compatibility if the client does not send them (fallback to current behavior).

11. **Rebuild the prompt in `handleTodaySynthesis` to include natal context.** The prompt currently starts at line 595 with the date, personal day, moon, and aspects. Restructure it into named sections:

    Section 1 — Natal Chart (when `natalSunSign` is present):
    ```
    ## Natal Chart
    Sun in [natalSunSign], Moon in [natalMoonSign][in the [N]th house if natalMoonHouse is 1–12], Ascendant in [natalAscSign]
    Natal Moon Phase: [natalMoonPhase]
    ```
    When `chartData.unknownTime` results in null house, omit the house phrase.

    Section 2 — Personal Day:
    ```
    ## Personal Day [number] — [archetype]
    [personalDayEssence first sentence]
    ```

    Section 3 — The Sky Today:
    ```
    ## Today's Sky
    Moon: [phaseName] in [moonSign][, void of course — avoid committing to irreversible decisions if isVoid]
    
    Active transits:
    [aspectBriefSentences[0]]
    [aspectBriefSentences[1]]
    [aspectBriefSentences[2]]
    ```
    If `aspectBriefSentences` is absent or empty, fall back to the existing raw aspect lines (transitPlanet symbol natalPlanet format).

    Section 4 — Advance Signal (when `advanceCategory` is non-null):
    ```
    ## Advance Signal
    Today is scored as a [advanceCategory] period: [advanceReason]
    ```
    Omit this section entirely when `advanceCategory` is null.

12. **Revise the prompt instruction to require synthesis, not enumeration.** Replace the current closing instruction ("Write a 2-3 sentence personalized morning synthesis that weaves this person's Personal Day energy together with the current Moon phase and the active transit aspects") with: "Write a 2-3 sentence personalized morning synthesis that integrates all of the above into a single coherent reading. Do not list the systems separately — find the sentence that names what today means when the natal chart, the personal day, the lunar quality, and the active transits are read together. Name specific natal placements and houses where relevant. Be direct, specific, and honest about what is genuinely supported today and what calls for care. Do not pad or encourage generically. Speak in second person."

13. **Retain the max_tokens ceiling.** The current `max_tokens: 350` limit in `handleTodaySynthesis` (line 613) produces a 2-3 sentence response. This ceiling should remain. Richer inputs should produce richer sentences, not more sentences. The Morning Synthesis card is not a long-form reading.

14. **Retain the temperature at 0.8.** Do not change the `temperature` setting. The richer prompt provides the specificity signal; temperature should remain as-is.

15. **Retain the server-side personal day cross-check.** The existing server-side verification (lines 573–583) that compares `payload.personalDay` against a server-computed personal day for authenticated users must remain. Do not remove this guard. The enriched payload does not affect this logic.

16. **The `today-synthesis` type string and `callProxy` routing are unchanged.** No new GPT type is introduced. The existing `'today-synthesis'` case in the `handleGptRequest` dispatcher (line 921) dispatches to `handleTodaySynthesis`. The server route in `server/routes/gpt.ts` requires no changes.

### Behavior and display

17. **The Morning Synthesis card visual layout is unchanged.** The card label ("Morning Synthesis"), the `GptSkeleton` loading state, the paragraph rendering, and the `getGptNudge()` nudge line remain exactly as they are. The enriched synthesis is simply a better-quality string that renders in the same place.

18. **The GPT call fires at the same point in the component lifecycle.** The call remains inside the `if (chartData)` block at line 60 of the `useEffect`. No change to when it fires or how it is triggered.

19. **Loading state text is unchanged.** `GptSkeleton label="Reading today's sky for you..."` remains as-is.

20. **Error handling is unchanged.** The `.catch(() => { /* silently hide if API call fails */ })` pattern at line 88 remains. If the enriched call fails, the Morning Synthesis card is simply not shown, as before.

21. **Rate limiting applies to the enriched call in the same way it applies today.** The `callProxy` function handles rate limit detection and throws `RateLimitError` regardless of payload size. The enriched payload does not bypass rate limiting.

22. **When `chartData` is null, `getTodayPageInterpretation` is not called.** The `if (chartData)` guard remains at line 60. When the user has not entered birth data, the Morning Synthesis card does not render and no GPT call is made. The enrichment arguments that depend on `chartData` are never needed.

23. **When `chartData.unknownTime` is true, natal houses are null throughout.** `natalMoonHouse` will be null (house field is 0, treated as null per spec 2). `natalHouse` on each transit aspect will be null. `computeTransitAspectBrief` already handles null house by falling back to the generic sentence. The prompt will include natal Sun, Moon, and Ascendant signs but no house context — a valid and useful degraded experience.

24. **When no advance score is present in the session cache, the advance section is omitted.** `advanceCategory: null` and `advanceReason: null` in the payload must cause the server to omit Section 4 of the prompt entirely. No placeholder text (e.g., "advance signal: not available") should be added in its place.

25. **The existing `GptSkeleton` loading behavior is unchanged.** The skeleton renders immediately when `gptLoading` becomes true. It dismisses when `gptText` arrives. Payload enrichment does not affect loading latency observably; GPT response time is dominated by model inference, not by additional payload bytes.

26. **The personal day essence first sentence must not exceed 200 characters in the prompt.** `firstSentence` is extracted by splitting the `essence` string on the first sentence boundary. In practice, essence first sentences in `numerologyInterpretations.ts` range from 80 to 150 characters. If a future interpretation entry has a longer first sentence, it should still be passed in full — the prompt length is not a binding constraint at this scale. No truncation is needed; this is informational only.

27. **The `aspectBriefSentences` array must be parallel to the `aspects` array.** `aspectBriefSentences[i]` corresponds to `aspects[i]`. The server should use `aspectBriefSentences[i]` as the human-readable description for each aspect in the prompt, with `aspects[i]` as structured fallback when `aspectBriefSentences` is absent. Mismatched lengths (e.g., `aspects.length === 3` but `aspectBriefSentences.length === 2`) should not cause errors — the server should use whichever has an entry at each index.

28. **The `natalMoonPhase` derivation must not throw.** The computation uses planet longitudes from `chartData.planets`. If either the Sun or Moon planet object is undefined (degenerate chart data), `natalMoonPhase` is set to `null` and no error is thrown. The prompt simply omits the natal moon phase line.

### Quality bar

29. **The enriched synthesis must explicitly reference at least one natal house placement in typical conditions.** When `chartData.unknownTime` is false and the top transit has a non-null `natalHouse`, the synthesis paragraph should name the house (e.g., "your 4th house" or "your House of Career") rather than speaking only in planet and sign terms. This is the minimum quality threshold that distinguishes a personal synthesis from a generic daily brief.

30. **The synthesis must not list the sections separately.** The prompt instruction (spec 12) requires the model to find a sentence that integrates the systems, not to enumerate them. Acceptable output: "Your Personal Day 7 draws you inward just as Saturn presses on your Scorpio Moon in the 4th house — a day designed for depth, not movement." Unacceptable output: "Your Personal Day is 7 (The Seeker). The Moon is waning in Gemini. Saturn squares your Moon. The advance engine says challenging." If the model produces an enumerated list rather than a woven sentence, the prompt instruction is too weak and should be strengthened.

31. **When the advance signal is present, the synthesis must not contradict it.** If `advanceCategory` is `'challenging'` and the prompt includes that signal, the synthesis must not produce a tone-positive or encouraging paragraph. The system prompt ("No generic encouragement. No filler. Speak to this person's day as it actually is.") already instructs the model in this direction. The advance signal in the user prompt section reinforces it.

---

## Out of Scope

- No changes to the `today-synthesis` GPT type identifier or the `callProxy` routing infrastructure.
- No changes to the `GptSkeleton` component, its label text, or its visual design.
- No changes to the Morning Synthesis card's visual structure, padding, label, or border.
- No new GPT types, no new API endpoints, no new server routes.
- No changes to `computeTransitAspectBrief`, `TRANSIT_PLANET_PHRASES`, or `transitAspectBriefs.ts`. These are correct and complete.
- No changes to `getTopActiveTransits`, `calculateTransitAspects`, or any engine file in `src/engine/`.
- No changes to `numerologyInterpretations.ts` or the interpretation data.
- No changes to the Personal Day card, Moon card, Sky Highlights card, Transit Energy card, or Advance signal banner. These UI elements are not restructured. The enrichment affects only the GPT synthesis text.
- No changes to the advance scoring engine, `AdvanceTab.tsx`, or `advanceSnapshotSessionCache`. The enrichment reads from the existing session cache synchronously; it does not trigger advance scoring.
- No changes to `TodayPage` props or to how `chartData` and `birthDate` are passed from the parent.
- No changes to how `calculatePersonalDay`, `getInterpretation`, or any numerology function is called.
- No natal moon phase display in the Moon card or any static section — the natal moon phase is used only in the GPT prompt.
- No changes to authenticated versus unauthenticated behavior. The server-side personal day cross-check applies only to authenticated users; this feature does not change that logic.
- No changes to how `advanceScore` is derived from the session cache. The enrichment reads the value that is already in component state; it does not modify the cache derivation logic.

---

## Open Questions

1. **Argument object versus positional arguments.** The current `getTodayPageInterpretation` signature uses positional arguments. Adding 9 new arguments positionally produces a function call that is hard to read and maintain. Should the signature be refactored to accept a single options object? The proposal describes positional arguments for continuity with the current signature, but an options object is the better long-term choice. This is a decision for the implementer; either form is correct.

2. **Should `aspectBriefSentences` replace the raw `aspects` array in the prompt, or supplement it?** The structured aspect data (`transitPlanet`, `symbol`, `natalPlanet`, `orb`, `nature`, `natalHouse`, `applying`) gives GPT the raw inputs to reason about; the brief sentences give it the interpreted form. The proposal calls for passing both. If the server prompt becomes too long, one option is to pass only `aspectBriefSentences` and omit the raw structured fields. This is safe because `computeTransitAspectBrief` already encodes all the relevant information. To be decided during implementation.

3. **Should the `essence` first sentence be the full `essence` paragraph instead?** `firstSentence` is a single sentence (up to ~150 characters). The full `essence` paragraph is 4-8 sentences and is much richer, but would add ~500-800 characters to the prompt. For `max_tokens: 350` output, the additional context may not yield a proportional quality improvement. The recommendation is to use `firstSentence`. If testing shows the model needs more essence context to produce truly differentiated output, using the full `essence` is a valid escalation.

4. **Should `advanceReason` be included alongside `advanceCategory`?** The `reason` string (e.g., "Saturn opposition natal Ascendant — your public presence and identity are under pressure") adds specificity beyond the bare category label. Including it makes the advance signal more concrete. The proposal includes it. If the reason string sometimes contains phrasing that is awkward when embedded in a GPT prompt (e.g., redundant with the transit aspect lines), it may be preferable to pass only `advanceCategory`. To be validated during prompt testing.

5. **Natal moon phase: derive client-side or server-side?** The proposal calls for client-side derivation from `chartData.planets` longitudes. An alternative is to derive it server-side from the authenticated user's birth data in `handleTodaySynthesis` when `userId` is available — analogous to how `handleTodaySynthesis` already cross-checks the personal day number server-side. Server-side derivation is more tamper-resistant but requires an additional calculation pass. Client-side derivation is simpler and sufficient given the natal moon phase is not a security-sensitive value. Recommendation: client-side for now, consistent with how the natal Big Three are derived.

6. **What if the natal Moon house is 0 because the chart was computed with `unknownTime: true`?** The `PlanetPosition.house` field is set to 0 when house system is inapplicable. The spec (item 2) says to treat 0 as null. This must be implemented consistently: `natalMoonHouse = chartData.planets.find(p => p.name === 'Moon')?.house || null` (treating 0 as falsy). Verify that no house-0 value leaks into the prompt as a valid house number.
