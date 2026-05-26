**Type** — `Issue Fix`
**Originated by** — Jobs, Carmack, Miyazaki, Taleb (unanimous)
**User guidance** — n/a

---

**Problem**

Three compounding defects make the Celtic Cross the least-interpreted spread in the product, despite being the most complex.

---

**Defect 1 — Stub shadows the real engine for all ten Celtic Cross position interpretations**

File: `src/components/tarot/CelticCrossReading.tsx`, lines 76–92

A local function named `computeInstantInterpretation` is defined with the comment `// ─── Stub: instant interpretation ─── Engine (task-0006) will provide a proper computeInstantInterpretation.` Task-0006 has shipped. The real `computeInstantInterpretation` exists in `src/engine/tarot.ts` (line 678) and is already imported and called correctly in `TarotPage.tsx`. However, `CelticCrossReading.tsx` never imports from the engine. The local stub shadows the real function by name.

The stub's behavior in `handleActualDeckSelect` (line 609):

```typescript
const nextInterpretation = computeInstantInterpretation(nextDrawn, CELTIC_CROSS_POSITIONS[selectionIndex])
```

This calls the local stub, not the engine. The stub constructs an `InstantInterpretation` by:
- Copying `card.coreMeaning` directly — no position-framing, no spread-profile adaptation
- Building `astroConnection` as `[card.rulingPlanet, card.rulingSign].filter(Boolean).join(' — ')` via `toDrawnCard` (line 72) — a raw data join, not an interpreted signal
- Ignoring the `position` argument entirely beyond storing `position.name` and `position.description` as decorative fields
- Computing a reversal note from a template string (`In reversal, ${card.coreMeaning.toLowerCase()} turns inward...`) rather than from card-specific reversed meaning data
- Producing no transit influence, no lunar phase note, no advance category note, no element resonance note, no numerology resonance, no astro headline

The real engine function at `src/engine/tarot.ts` line 678 takes `(card: TarotCard, reversed: boolean, position: SpreadPosition | null, astroContext: TarotAstroContext)` and executes: `buildTransitInfluence`, `buildAstroHeadline`, `buildElementResonanceNote`, `buildLunarPhaseNote`, `buildAdvanceCategoryNote`, `adaptInterpretationToPosition`. None of this reaches the Celtic Cross user.

Concrete wrong behavior: The Tower in position 3 (Unconscious Influence) and the Tower in position 10 (Outcome) produce identical `InterpretationPanel` content. Position-awareness does not exist for Celtic Cross readings.

The type mismatch that caused the stub to persist: `CelticCrossReading.tsx` imports `InstantInterpretation` and `TarotAstroContext` from `./types`, not from `../../engine/tarot`. The `InstantInterpretation` in `src/components/tarot/types.ts` (line 34) has `astroConnection: string` (a plain string). The engine's `InstantInterpretation` has `astroConnection: AstroConnection` (a structured object with `elementResonanceNote`, `transitInfluence`, `lunarPhaseNote`, etc.). The `TarotAstroContext` in `src/components/tarot/types.ts` (line 8) has `significantTransits: string[]` and `currentMoonPhase: string`. The engine's `TarotAstroContext` (in `src/engine/tarot.ts`, line 19) has `currentTransits: TransitAspect[]`, `retrogradeplanets: string[]`, `dominantTransitPlanet: string | null`, `lunarPhaseName: string | null`. These are structurally incompatible — the stub exists because wiring the real engine requires resolving this type mismatch.

---

**Defect 2 — `buildCelticAstroCtx` hardcodes empty transit fields**

File: `src/components/tarot/TarotPage.tsx`, lines 155–167

```typescript
function buildCelticAstroCtx(chartData: ChartData, birthDate: string): CelticCtx {
  return {
    sunSign: chartData.planets.find(p => p.name === 'Sun')?.sign ?? '',
    moonSign: chartData.planets.find(p => p.name === 'Moon')?.sign ?? '',
    ascendant: chartData.angles?.ascendant?.sign ?? '',
    dominantElement: computeDominantElement(chartData) ?? '',
    currentMoonPhase: '',
    significantTransits: [],
    personalDay: computePersonalDay(birthDate),
    advanceCategory: null,
    numerologyYear: computePersonalYear(birthDate),
  }
}
```

`currentMoonPhase` is hardcoded to `''`. `significantTransits` is hardcoded to `[]`. Compare `buildThreeAstroCtx` (lines 128–153), which accepts `dailyTransitSummary` and `weeklyTransitSummary` as parameters and passes them through to the synthesis payload. The three-card flow computes actual transit data and threads it into the context. The Celtic Cross flow does not call `calculateTransits` at all.

The `CelticCtx` received by `CelticCrossReading.tsx` as the `tarotAstroContext` prop therefore carries no live sky data. This empty context is passed through `buildCelticSynthesisPayload` (line 153) and sent to `getTarotCelticSynthesis` in `src/services/gptInterpretation.ts`, where `getTarotCelticSynthesis` (line 546) maps `payload.astroContext.currentMoonPhase` → `moonPhaseName` (line 586) and `payload.astroContext.significantTransits` (line 171 of `buildDiscussContext`) to the discuss context. Both arrive empty.

---

**Defect 3 — `TarotCelticSynthesisPayload` lacks transit summary fields; server handler does not compute transits for Celtic**

File: `server/services/gptTarot.ts`, lines 94–110

`TarotCelticSynthesisPayload` does not have `dailyTransitSummary` or `weeklyTransitSummary` fields. The single-card payload (`TarotSingleSynthesisPayload`, lines 72–92) has both. The three-card payload (`TarotThreeSynthesisPayload`, lines 72–92 range) has both.

In `handleTarotCelticSynthesis` (line 448), the `if (userId)` block (lines 460–472) re-derives natal chart and numerology server-side for authenticated users — exactly as the three-card and single-card handlers do — but does not call `calculateTransits`. `handleTarotThreeSynthesis` (line 323) calls `calculateTransits(chart, 'daily')` and `calculateTransits(chart, 'weekly')` and uses `formatTransitSummary` to build the transit context strings. `handleTarotCelticSynthesis` has no equivalent.

As a result, the Celtic prompt (lines 497–546) section labeled `## This Person's Living Sky` contains only natal signs, life path, personal year/day, current moon phase name, and advance signal. There is no `## Daily Transit Context` or `## Weekly Transit Context` section. The prompt instructs GPT: "Be specific — name the sign or transit that directly amplifies a card's meaning" (line 538), but provides no transit data from which to be specific. The model must hallucinate transits or default to natal sign generalizations.

Additionally, in `getTarotCelticSynthesis` in `src/services/gptInterpretation.ts` (lines 546–595), the adapter maps each Celtic `DrawnCard` to the server payload with:
- `number: 0` for every card (line 558) — ignores actual card number
- `practicalGuidance: ''`, `reflectionQuestion: ''`, `numerologyResonance: ''`, `transitInfluence: ''` (lines 564–567) — all blanked
- `astroHeadline: c.astroConnection` (line 567) — maps the stub's raw `"Mars — Aries"` string into the `astroHeadline` field the server prompt uses in card lines (line 481: `Sky connection: ${card.astroHeadline}`)

This means every card in the Celtic synthesis prompt has its `Sky connection` line populated with a raw planet-sign concatenation from `toDrawnCard` rather than the engine-computed `astroHeadline` that `buildAstroHeadline` in `src/engine/tarot.ts` produces.

---

**Reproduction**

1. Open the app as an authenticated user with a birth chart set.
2. Navigate to the Tarot module and begin a Celtic Cross reading.
3. Draw all ten cards.
4. Tap any card's interpretation panel during the reveal sequence.
5. Observe: the `astroConnection` field in the panel reads either `"[Planet] — [Sign]"` (raw data join) or `"Astrological resonance present in the symbolic field."` (fallback string from `toDrawnCard` line 72 in `CelticCrossReading.tsx`). It does not reflect the user's transits, lunar phase, or advance category.
6. Draw the same card in two different positions across two readings — the interpretation panel content is identical regardless of position.
7. Inspect the network payload sent to `tarot-celtic-synthesis`: `moonPhaseName` is `""`, `significantTransits` is absent, `dailyTransitSummary` and `weeklyTransitSummary` are absent from the server payload type. The `Sky connection` line for each card in the GPT prompt is a two-token planet-sign string.

---

**Expected behavior**

**For defect 1:** `CelticCrossReading.tsx` must import `computeInstantInterpretation` from `src/engine/tarot.ts` and call it in `handleActualDeckSelect` (line 609) in place of the local stub. The engine call requires:
- A `TarotCard` (the engine's full card type from `src/data/tarot/cards.ts`), not the flat `DrawnCard` from `./types` — `CelticCrossReading.tsx` already has access to `DataTarotCard` from `ALL_TAROT_CARDS` (line 3) and can look up the full card by `card.id`
- A `boolean` for `reversed`
- A `SpreadPosition` from `CELTIC_CROSS_POSITIONS[selectionIndex]` — already available
- A `TarotAstroContext` matching the engine's interface (not the `./types` interface) — requires either passing an `EngineCtx` from `TarotPage.tsx` as a prop, or adding a converter function that maps the Celtic prop type to the engine type with real transit data

After this fix: each of the ten Celtic Cross positions produces a position-aware, transit-aware `InstantInterpretation`. A Tower in the Foundation position adapts its `coreMeaning` through `adaptInterpretationToPosition` with the Foundation spread profile. A card drawn under a Saturn transit shows the Level 1 or Level 2 transit influence from `buildTransitInfluence`. The `astroConnection` field in the `InterpretationPanel` contains the engine-computed `astroHeadline` and `elementResonanceNote`, not a raw planet-sign join.

**For defect 2:** `buildCelticAstroCtx` in `TarotPage.tsx` must compute transit data using the same `calculateTransits` calls that `buildThreeAstroCtx` already uses. The computed `dailyTransitSummary` and `weeklyTransitSummary` strings — built via `formatTransitSummary` (lines 169–203 of `TarotPage.tsx`) — must be passed into the Celtic context and threaded through to `buildCelticSynthesisPayload`. The `currentMoonPhase` field must be populated from the Moon's current sign via `calculateTransits` rather than hardcoded to `''`.

**For defect 3:** `TarotCelticSynthesisPayload` in `server/services/gptTarot.ts` must gain `dailyTransitSummary: string | null` and `weeklyTransitSummary: string | null` fields, matching the structure of `TarotSingleSynthesisPayload`. `handleTarotCelticSynthesis` must call `calculateTransits` for authenticated users (the same pattern used in `handleTarotThreeSynthesis`) and inject a `## Daily Transit Context` and `## Weekly Transit Context` section into the Celtic prompt, placed after `## This Person's Living Sky` and before `## Structure Your Synthesis in These Named Sections`. The client adapter `getTarotCelticSynthesis` in `src/services/gptInterpretation.ts` must compute and include these fields in the outgoing payload rather than omitting them.

After all three fixes: a Celtic Cross synthesis receives the same quality of sky data that the single-card and three-card syntheses receive. The GPT prompt can fulfill its own instruction to name specific transits. The `InterpretationPanel` shown during each card reveal carries position-aware, transit-aware, astro-grounded text. The most complex reading type in the product is no longer flying blind on every signal it was designed to use.
