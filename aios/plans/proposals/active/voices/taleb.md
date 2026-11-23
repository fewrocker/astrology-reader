# Taleb's Risk Review — Sprint 0029: Five Bug Fixes and the Hidden Sixth
*Nassim Nicholas Taleb. May 2026.*

---

## Opening Observation

Sprint 0028 built depth on top of a broken foundation. Four of three reading modes are broken in production. The vision document lists five confirmed bugs, two of which block forward progress entirely. The infrastructure — 193 transit adaptation entries, natal resonance notes, constellation preview, orb-weighted dominant transit selection — is excellent. The user experience is broken.

This is the correct moment to stop and look carefully. Not at what the five bugs are — the vision document describes them precisely — but at what the bugs reveal about the system's hidden fragilities. When five production failures accumulate across the core interaction loop of the product's most premium feature, the question is not just "what broke" but "what assumptions were never tested."

Let me describe what I see in the code as it stands, specific to sprint 0029's domain.

---

## 1. The Hardcoded Zeros That Silently Corrupt Every Unauthenticated Synthesis

In `src/components/tarot/CelticCrossReading.tsx`, `buildCelticSynthesisPayload` sends:

```typescript
personalYear: 0,
lifePathNumber: 0,
```

These are not null. They are not undefined. They are the integer zero. The server receives them and, if `userId` is present and `resolveUserBirthContext` returns a valid birth context, overwrites them via `calculatePersonalYear` and `calculateLifePath`. If `userId` is absent — that is, for every unauthenticated user — the server uses the zeros directly and writes them into the GPT prompt. The prompt then reads: `Life Path: 0`, `Personal Year: 0`.

Life path numbers run 1 through 9 (with master numbers 11, 22, 33). A life path of 0 is not a valid numerology value. A personal year of 0 is not a valid numerology value. Zero looks like a valid integer to the server. The server passes it to GPT without complaint. GPT receives numerology context that is factually wrong for every unauthenticated user and responds in ways that cannot be predicted or audited.

The vision document names this as a defect but frames it as "not the cause of the GPT failure." That framing obscures the actual severity: this bug silently poisons the synthesis for all users without birth data on file. The GPT failure (Bug 5) is a crash that produces an error panel. The hardcoded zeros are a correctness failure that produces a reading — it just produces the wrong reading, invisibly.

The correct fix is to pass `null` rather than `0` for any numerology value the client cannot compute. The server already handles null gracefully; `authorizedLifePath` and `authorizedPersonalYear` would fall through to `payload.lifePathNumber` and `payload.personalYear`, which would be null, and the prompt would render those lines as empty rather than as `0`. This is unambiguously better than rendering `Life Path: 0`.

---

## 2. The `positions[i]` Access Without a Null Guard

In `handleTarotCelticSynthesis` in `server/services/gptTarot.ts` at lines 983–989:

```typescript
const cardLines = cards.slice(0, 10).map((card, i) => {
  const pos = positions[i]
  const reversalText = card.reversed ? ' (reversed)' : ' (upright)'
  return `${i + 1}. ${pos.label} — ${card.name}${reversalText}
```

If `positions` has fewer than 10 entries, `pos` is `undefined`, and `pos.label` throws `TypeError: Cannot read properties of undefined`. This throw propagates uncaught to the route handler, which returns a 500. The vision document identifies this as a candidate cause of Bug 5 and assumes the payload is always well-formed. That assumption is load-bearing and untested.

The payload comes from `buildCelticSynthesisPayload` in the client, which maps `CELTIC_CROSS_POSITIONS` to exactly 10 entries. If the `CELTIC_CROSS_POSITIONS` array is ever modified — if a future sprint adds a position, removes one, or slices it incorrectly — the client will send fewer than 10 positions and the server will crash. There is no test asserting that `buildCelticSynthesisPayload` produces exactly 10 positions. There is no test asserting that the server handles a positions array shorter than the cards array.

The guard is one line: `const pos = positions[i] ?? { label: `Position ${i + 1}`, meaning: '' }`. This eliminates the crash path without changing behavior in the normal case.

---

## 3. `calculateChart` Is Called Without Error Handling in the Server Auth Block

In `handleTarotCelticSynthesis` (and identically in `handleTarotSingleSynthesis` and `handleTarotThreeSynthesis`), when `userId` is present and `resolveUserBirthContext` returns a non-null context:

```typescript
const natalChart = calculateChart(ctx.birthDate, ctx.birthTime, ctx.lat, ctx.lng, ctx.tz, ctx.unknownTime)
```

This call is inside `if (ctx) { ... }` but there is no try/catch wrapping it. If `calculateChart` throws — because of an unusual birth date, an edge-case geographic coordinate, or any internal computation failure — the error propagates to the route handler and returns a 500 with no retry, no fallback, and no graceful degradation to the client-supplied natal data.

`calculateChart` is an astronomical computation engine operating over real-valued coordinates and historical dates. Whether it can throw on valid-looking inputs that trigger internal edge cases is not something the tarot test suite answers. The behavior of `calculateChart` under edge inputs is not tested in `src/engine/__tests__/tarot.test.ts`. The pattern of defensive wrapping — `try { ... } catch { return null }` — is already used in `computeDominantElement` and `computeDominantModality` in `src/engine/tarot.ts`, for precisely this reason. The server-side handlers are missing this same posture.

The fix: wrap the entire `if (ctx)` block in try/catch and fall through to client-supplied payload data on any exception. This is a two-line change that converts a hard crash into a graceful fallback.

---

## 4. The Three-Card Stale Closure Is a Pattern, Not Just a Bug

The vision document correctly identifies the stale closure in `ThreeCardReading.tsx`: `handleCardTap` depends on `activeCardIndex`, which is derived from `activeRevealIndex`, which is derived from `revealedCount`, which is derived from `revealedMask`. This is a four-level derivation chain. A rerender that updates any node in the chain without triggering `useCallback` memoization leaves the handler with a captured stale value.

The vision document proposes ensuring `activeCardIndex` is not stale when `handleCardTap` is reconstructed. That is the correct fix for Bug 2. But the structural pattern that enables this bug will enable the next bug the moment anyone modifies the reveal state logic. Every future sprint that touches `revealedMask`, `flipDoneMask`, `phase`, or `activeRevealIndex` in `ThreeCardReading.tsx` is working against a closure staleness surface with no test coverage. The test the vision document proposes — a test that confirms `handleCardTap(0)` updates `revealedMask[0]` and transitions phase — is necessary. It is not sufficient to prevent the next variation of this bug.

The underlying structural fragility is that reveal state is managed through five pieces of `useState` (`revealedMask`, `flipDoneMask`, `phase`, `synthesisStartedRef`, `abortRef`) with complex interdependencies and no reducer. Any future sprint that wants to add a feature to the reveal flow — an undo-reveal option, a skip-to-synthesis affordance, an animation state — will be working in a system where it is easy to introduce closure staleness and difficult to detect it without running the exact user interaction sequence that triggers it.

---

## 5. The Celtic Cross Synthesis Fire Assumes `drawnCards` Is Fully Populated

In `CelticCrossReading.tsx`, `fireEarlySynthesis` reads `drawnCards` from its `useCallback` closure. The `useCallback` dependency list includes `drawnCards`, which is correct. The assumption is that by the time `fireEarlySynthesis` is invoked (inside the `cross-staff-transition` phase effect), `drawnCards` is fully populated with all 10 entries.

This assumption is guaranteed by the current phase machine: `cross-staff-transition` only fires after `selectedCount === 10` and the `awaiting-12` phase has completed. The guarantee holds as long as `setDrawnCards` is synchronous and React batches updates consistently.

The fragility: React 18 and later batch state updates by default. If `setDrawnCards` and the phase transition that triggers `fireEarlySynthesis` happen in the same synchronous event handler, there is a window where the phase transitions but `drawnCards` has not yet committed the full 10 entries. The synthesis fires with a stale, partial `drawnCards`. With fewer than 10 cards, `positions[i]` may be `undefined` (as described above), or the synthesis prompt will contain fewer than 10 card lines, which may cause the GPT model to produce a malformed or incomplete synthesis.

This is not currently observed in production — the phase machine's current structure makes it unlikely. But it is a latent fragility that will surface if the card selection flow is modified.

---

## 6. `parseCelticChapters` Returns Empty Arrays on GPT Format Drift

In `src/services/gptInterpretation.ts`, `parseCelticChapters` splits the GPT response on heading markers using:

```typescript
const parts = text
  .split(/\n(?=(?:#{1,6}\s+|\*\*[^*\n]+\*\*\s*$|\d+\.\s+[A-Z]))/m)
```

This regex handles three heading formats: markdown (`## Heading`), bold (`**Heading**`), and numbered (`1. Heading`). If GPT produces a response that uses none of these formats — because a model update changes default formatting, or because the response starts with narrative text before the first heading — `parseCelticChapters` returns `[]`. Then:

```typescript
if (chapters.length === 0) throw new Error('Empty synthesis response')
```

The user receives the error panel. The synthesis text exists — GPT returned something — but the parser could not structure it. The synthesis is lost entirely.

The assumption is that GPT will always format its response in one of these three ways. GPT models are not deterministic. Format drift across model updates is a documented category of API regression. The current parser has no fallback: if the regex fails to split, the entire synthesis is discarded.

The fix is a single line: if `chapters.length === 0` and `text.trim().length > 0`, return `[{ heading: 'Reading', body: text.trim() }]`. The user receives the synthesis as unstructured text rather than structured chapters. This degrades the reading experience slightly. It does not discard a completed synthesis.

This is untested. The `parseCelticChapters` function is not tested anywhere in the current test suite. It is the sole boundary between raw GPT text and the displayed reading, and it has no test coverage.

---

## 7. The Tests That Do Not Exist

The existing test suite covers the data layer (`cards.completeness.test.ts`) and the engine's core functions (`tarot.test.ts`). What is absent:

**`computeInstantInterpretation` with a Celtic Cross position.** The vision document identifies that `getThreeCardSpreadProfile` returns null for `spreadType === 'celtic-cross'`, causing `positionLabel` and `positionMeaning` to be null for all 10 Celtic Cross positions. This is Bug 4's root cause. There is no test asserting that `computeInstantInterpretation` with a Celtic Cross position produces non-null `positionLabel` and `positionMeaning`. If sprint 0029 fixes this by wiring the position fields through, a future sprint could silently break the wiring without any test catching it.

**`parseCelticChapters`.** The GPT response parser is untested. It is the most complex string-parsing function in the client codebase and the only barrier between GPT output and rendered chapters. It handles three heading formats, produces a filtered array, and throws on empty output. None of this is tested.

**`buildCelticSynthesisPayload`.** The function that produces the synthesis payload is untested. Its hardcoded `personalYear: 0` and `lifePathNumber: 0` are not caught by any assertion. A test asserting that the payload contains `null` (not `0`) for numerology fields when birth data is unavailable would have caught Bug 5's contributing factor.

**`handleTarotCelticSynthesis` route behavior.** No test exercises the server-side Celtic Cross handler. The handler that is currently failing in production has never been tested. Any future modification to the prompt template, the cardLines construction, or the signals block can break the synthesis silently.

The vision document proposes two new tests. These are the right two tests. They are not sufficient. The parser test and the payload builder test are higher-value additions because they test the boundaries between system components — the places where format assumptions are load-bearing and silent failures are most likely.

---

## 8. The Duplicated Logic Is Now in Three Places for Celtic Cross Signals

There are now three separate computations of Celtic Cross structural signals:

1. `computeCelticStructuralSignals` in `server/services/gptTarot.ts` — server-canonical, used as fallback
2. `clientComputeCelticStructuralSignals` in `src/services/gptInterpretation.ts` — client computation, enriches the payload before sending
3. `computeCelticCrossSignals` in `src/components/tarot/CelticCrossReading.tsx` — used for the discuss context and internal UI signals

These three functions compute overlapping but not identical fields. The field names differ between the server version and the component version. The thresholds differ: the server uses `>= 5` Major Arcana for `archetypal-heavy`, the client uses the same threshold in `clientComputeCelticStructuralSignals`, but the component version does not compute a `majorArcanaWeight` field at all. If the threshold for `archetypal-heavy` is changed in one function, the behavior diverges silently in the other two.

Sprint 0029 is not the moment to refactor this. But it is the moment to name it, because sprint 0029 is adding positional meaning strings to the Celtic Cross interpretation — meaning the Celtic Cross data layer is about to grow again. Each addition increases the surface area of the divergence.

---

## Summary of Fragility Points

**Will cause visible failures under normal use (already causing Bug 5):**
- `positions[i]` access without null guard in `handleTarotCelticSynthesis`
- `calculateChart` called without try/catch in server auth block — crash path on engine exceptions
- `parseCelticChapters` returns empty on GPT format drift — silent discard of completed synthesis

**Already corrupting output for unauthenticated users (invisible, no error panel):**
- `personalYear: 0` and `lifePathNumber: 0` in `buildCelticSynthesisPayload` — invalid numerology sent to synthesis

**Will be reintroduced by future sprints if not addressed structurally:**
- Stale closure pattern in three-card reveal — any modification to `revealedMask` management reintroduces Bug 2
- Celtic Cross synthesis fires with closure-captured `drawnCards` — vulnerable to React batching changes
- Three separate Celtic Cross structural signal computations that can diverge silently

**Test coverage gaps that make regressions invisible:**
- Zero tests for `computeInstantInterpretation` with Celtic Cross position (the root of Bug 4)
- Zero tests for `parseCelticChapters` (the sole synthesis parsing boundary)
- Zero tests for `buildCelticSynthesisPayload` (where the hardcoded zeros live)
- Zero tests for `handleTarotCelticSynthesis` server behavior

The system fails at the boundaries. Not inside the well-tested engine functions. Not in the GPT prompts, which are strong. At the joints: where client meets server, where GPT text meets the parser, where `useState` closures meet React's rendering scheduler. These are the places no one tests because they are not "the algorithm" — they are the plumbing. And it is always the plumbing that fails in production.

*Five confirmed bugs. All five live in the plumbing.*

---

## What the Previous Sprint Review Named That Remains

From my sprint 0028 review, three items remain unaddressed and relevant to sprint 0029:

**The dominant transit planet single-winner selection.** Still selects by static planet priority rather than weighted orb × applying. Still causes wide Pluto transits to suppress tight Saturn transits. Not a sprint 0029 item, but the quality ceiling of the transit layer.

**The pre-existing failing test** (`adapts the instant interpretation text to the actual spread position`). The import is still type-only; `SPREAD_POSITIONS` value is missing. This test has been broken since before sprint 0027. It tests position adaptation logic — the exact logic that Bug 4 breaks. This test should be fixed as part of Bug 4.

**The `formatTransitSummary` truncation ordering.** Transit aspects are sliced to the top 5 without significance ordering. The transit summary sent to GPT synthesis may not contain the most symbolically significant aspects for the user's current sky. Not a sprint 0029 item.

These remain open. They will remain open as long as they have no measurable target assigned to them. The transit dominance weighting and the truncation ordering are quality improvements. The failing test is a correctness guarantee. The failing test should be fixed in sprint 0029 as a side effect of Bug 4.

