# Voice: Nassim Taleb
## Sprint 0025 — Fragility, Hidden Risks, and What Everyone Is Ignoring

---

I have read every file. Let me tell you what I see.

---

## The Save No-Op: A Lie to the User's Face

This is the clearest case of fragility in the system, and the vision document already names it explicitly. Three `onSave={() => {}}` calls in `TarotPage.tsx` (lines 217, 284, 329). The user taps Save. `SingleCardReading.tsx` responds by calling `onSave()`, then immediately flips `saveLabel` to `'Saved'` via `setSaveLabel('Saved')`, and resets it to `'Save'` after 2000ms. The save happened. The label confirmed it. The database received nothing.

This is not merely a missing feature. It is deceptive feedback. In risk terms: the system produces a false signal of safety. The user believes they have a record. They return to the Saved Readings page. It is empty. They drew The Tower under a Pluto transit and wanted to return to that reading. It is gone.

The infrastructure for saving is complete. `readingsService.ts` has `saveReading()`. `readings.ts` on the server validates, persists, and returns an `id`. The `TarotContext` reducer already handles `SAVE_READING` — it stores the `readingId` in `savedReadingIds` and `currentReadingId`. The entire chain works. The only missing piece is the call site in `TarotPage.tsx`.

But here is what concerns me more than the no-op itself: the save architecture has no token plumbing at the `TarotPage` level. `saveReading()` requires a `token: string`. Where does that token come from? The component receives `chartData` and `birthDate`. It does not receive a token. Something must provide it — probably `useApp()` or a separate auth context — but no token flow is visible in `TarotPage.tsx`. This is a second fragility: when someone finally wires the save call, they may discover the token is not available at that call site, requiring a refactor up the tree. The wiring looks trivial from the description but may require threading auth through `SingleReadingFlow`, `ThreeReadingFlow`, and `CelticReadingFlow` as props or via context. That is more scope than a one-line fix.

**Concrete risk:** The `ThreeCardReading.tsx` component already has a `saveState` variable with states `'idle' | 'saved' | 'error'`, and even renders an error retry UI. But `handleSave` at line 852 just calls `onSave()` and immediately sets `saveState` to `'saved'` — no async, no catch, no way to reach the `'error'` state. The error UI exists. It is unreachable. The error state is a ghost.

---

## The Engine Context Is Transit-Blind at the Most Important Moment

When a user draws a card, `computeInstantInterpretation` runs. This is the first thing they see — the interpretation panel that appears before GPT loads. The function has three levels of specificity: Level 1 (direct transit adaptation lookup from 397+ entries), Level 2 (element affinity with dominant transit planet), Level 3 (baseline note).

`buildEngineCtx` in `TarotPage.tsx` calls `buildTarotAstroContext(chartData, null, ...)`. The second argument is always `null`. So `currentTransits` is always `[]`, `retrogradeplanets` is always `[]`, `dominantTransitPlanet` is always `null`. Level 1 can never match. Level 2 can never match. Every user, every reading, every card: Level 3. The fallback that exists for the edge case becomes the universal path.

Meanwhile, `dailyTransitData` is computed right there in `SingleReadingFlow` — `useMemo(() => calculateTransits(chartData, 'daily'), [chartData])` — and sent to GPT synthesis as a formatted string. The instant interpretation layer, which runs before GPT and is what the user sees first, ignores the same data that GPT uses. This is incoherent: GPT says "Saturn is squaring your natal Mercury" and the instant interpretation says something generic derived from Level 3. The user sees both in the same reading.

The fix is passing `dailyTransitData` into `buildEngineCtx` instead of `null`. The function `buildTarotAstroContext` already accepts `TransitData | null` and handles it correctly. The problem is entirely at the call site.

But there is a deeper structural fragility: `buildEngineCtx` is called via `useMemo` at mount time (line 141), and `dailyTransitData` is also a separate `useMemo` on line 142. These two memos could theoretically go out of sync if `chartData` changes between renders, though in practice `chartData` is stable. The real issue is that `buildEngineCtx` exists as an indirection — a helper function — that hides the fact that it always passes `null` for transits. The abstraction conceals the bug.

---

## Silent Failures in the Celtic Cross State Machine

`CelticCrossReading.tsx` has a 12-phase state machine. The synthesis fires via `fireEarlySynthesis`, called from the `cross-staff-transition` phase effect. There is a 90-second timeout checked in the `constellation-text` phase.

Here is the fragility: the timeout check runs only when the component enters the `constellation-text` phase. If the synthesis resolves or errors before that phase is reached — which is unlikely but possible if the network is very fast or very slow — the timeout logic becomes irrelevant or inaccurate. More critically: if the synthesis is still loading when `constellation-text` transitions to `synthesis`, the component enters `synthesis` with `synthesisStatus === 'loading'` and `synthesisChapters.length === 0`. The chapter-reveal `useEffect` has a guard:

```
if (synthesisStatus !== 'ready' || synthesisChapters.length === 0) return
```

It does nothing. No loading indicator. No error. The user sees the synthesis phase but nothing is rendering. The `loadingMessage` prop on `TarotSynthesisPanel` handles this ("The cards are being read as a constellation."), but this path is opaque — there is no visible signal to the user about how long they might wait.

Also: `fireEarlySynthesis` is called inside a `useEffect` cleanup-unsafe callback. The `fireEarlySynthesis` function is a `useCallback` that captures `drawnCards`, `tarotAstroContext`, etc. But at the time `cross-staff-transition` fires, only 6 of the 10 cards have been drawn into `drawnCards`. The synthesis payload `buildCelticSynthesisPayload` maps `cards.map((dc, i) => ...)` across whatever is in `drawnCards` at that moment. If cards 7–10 have not been drawn yet (which is structurally impossible given the phase logic, but stay with me), the payload would contain 6 cards against 10 position slots. The server would accept it — `cards` is `unknown[]` — and GPT would synthesize 10 positions with only 6 card entries, silently. The structural protection here is that `cross-staff-transition` can only be reached after all 10 cards are drawn (the `drawing` phase completes at 10), but the validation is implicit, not enforced.

---

## The Celtic Cross Save Flow: The `userId` Is Left Empty

`CelticCrossReading.tsx` builds a `SavedReading` object in `handleSave()`. Look at line 638:

```typescript
userId: '',  // set by parent/auth context
```

This `userId` is an empty string. It is accepted by the type system. The parent (`CelticReadingFlow`) passes `onSave={() => {}}` — it never receives this object at all. So not only is save not wired, but the payload being built has a known-invalid field that is commented as if someone else will fix it. The comment is architectural optimism. Nobody is fixing it in the parent because the parent discards the payload.

Compare this to the `readings.ts` server route: it sets `user_id` from the authenticated session, not from the payload. The `SavedReading` type's `userId` field is never actually sent to the server — it is part of a client-side type that predates the current API design. This means the `SavedReading` type itself is a vestige of an earlier design, and `CelticCrossReading.tsx`'s `handleSave` is building the wrong payload shape for the actual API. The actual API (`saveReading()` in `readingsService.ts`) takes a `SaveReadingRequest` with `readingType`, `firstCardName`, `cards`, and `synthesis`. The `SavedReading` type with `schemaVersion`, `drawnCards`, `spreadType`, `astroContextSnapshot`, and `interpretationPayload` is a different shape entirely.

When someone wires this up, they will discover that `CelticCrossReading.tsx` is not building a `SaveReadingRequest` — it is building something incompatible with the service layer. This is a type mismatch that the TypeScript compiler will not catch because both the `onSave` prop and `readingsService.ts` use `unknown[]` and `unknown` for the nested fields.

---

## The Discuss Context Is an Island

The `discussContext` in `SingleCardReading.tsx` is assembled from what is available inside the component: card name, reversal, arcana, core meaning, symbolic theme, emotional meaning, practical guidance, reflection question, personal day. No natal signs. No transits. No advance category. No synthesis text.

The GPT discuss handler (`handleTarotDiscuss`) is already well-designed — it threads intention, applies symbolic framing, and avoids prediction. But it can only work with what it receives. If the context string has no natal Venus, the response has no natal Venus. If the context string has no current transit aspects, the response has no transit context. The handler does not make up information — it amplifies what it receives.

The result: every Discuss conversation is a general tarot conversation with a card named. It is not a conversation about this person's reading.

The `synthesisPayload` is available in `SingleCardReading.tsx` as a prop. It contains `natalSunSign`, `natalMoonSign`, `natalAscSign`, `dailyTransitSummary`, `weeklyTransitSummary`, `advanceCategory`, `moonPhaseName`. All of this is already in scope. The `discussContext` memo simply does not use it. The information is present, attached, and ignored.

There is an additional timing fragility: the `discussContext` is computed when the component renders (via `useMemo`), before any synthesis loads. When the user opens Discuss after synthesis has completed, the `discussContext` does not include the synthesis text — even though `SingleCardSynthesisPanel` would have rendered it by then. The context is frozen at the pre-synthesis moment. In `ThreeCardReading.tsx`, `activeSynthesis` is in scope when `discussContext` is constructed (it's not a `useMemo` there, it's computed inline), so synthesis text does reach Discuss in the three-card flow. In `SingleCardReading.tsx`, there is no equivalent mechanism.

---

## The Advance Signal Is Never Non-Null in Any Reading

`buildEngineCtx` calls `buildTarotAstroContext(chartData, null, computePersonalDay(birthDate), null)`. The fourth argument is `advanceScore: SnapshotScore | null`. It is `null`. Always.

The vision document notes that the advance score is available via `advanceSnapshotSessionCache` from `AdvanceTab.tsx`. It is not imported in `TarotPage.tsx`. So `advanceCategory` and `advanceReason` in the `TarotAstroContext` are always `null`. `ADVANCE_CATEGORY_NOTES` in `tarot.ts` has five entries — `power`, `favorable`, `challenging`, `shift`, `neutral`. None of them is ever reached.

In the synthesis payloads sent to GPT, both `advanceCategory: engineCtx.advanceCategory` and `advanceReason: engineCtx.advanceReason` are `null`. The server-side prompt has:

```
${payload.advanceCategory ? `Advance signal: ${payload.advanceCategory} — ${payload.advanceReason ?? ''}` : ''}
```

This line is always empty. The advance system exists in the product. Its output is computed somewhere else in the app. The tarot module has a field for it, a mechanism to use it, and a prompt instruction to surface it. But the plumbing is cut. The advance signal never enters any reading.

---

## The Lunar Phase Calculation Depends on Transit Data Being Non-Null

`buildTarotAstroContext` computes the lunar phase by comparing Moon and Sun longitudes from `transits.currentPlanets`. Since `transits` is always `null` in `buildEngineCtx`, `lunarPhaseName` is always `null`. The lunar phase note in `AstroConnection.lunarPhaseNote` is always empty.

But the synthesis payloads do set `moonPhaseName: engineCtx.lunarPhaseName ?? ''` — which is always the empty string. And `moonSign` is populated by reading from `dailyTransitData.currentPlanets.find(...)` directly (not from the engine context). So the synthesis has a moon sign but no moon phase name. The GPT prompt includes "Moon: [phase] in [sign]" where phase is always blank. This is not a catastrophe, but it is a gap that silently degrades every reading's interpretive depth.

---

## The ThreeCardReading Synthesis Effect Has a Stale Reference

Look at line 839 in `ThreeCardReading.tsx`:

```typescript
}, [astroContext, drawnCards, instantInterpretations, placementComplete, spreadMode, spreadPositions, userIntention])
```

`instantInterpretations` is listed as a dependency. But `instantInterpretations` is not declared in `ThreeCardReading.tsx`. It is not a prop, not a state variable, not a local variable in the component. It is a reference to nothing — or rather, it refers to an outer-scope variable from an earlier version of this code, now a stale closure ghost that TypeScript apparently accepts in this context (perhaps coercing it to `undefined`). This will not cause a runtime crash because the effect's logic does not use `instantInterpretations`. But the dependency array is incorrect, which means the effect's dependency tracking is inaccurate, and under React's strict mode or future optimizations, this creates unpredictable re-fire behavior.

---

## The Celtic Cross Receives a `personalYear: 0`

In `buildCelticSynthesisPayload`:

```typescript
personalYear: 0,
lifePathNumber: 0,
```

These are hardcoded zeros. The `personalYear` computation — `computePersonalYear(birthDate)` — is available in `TarotPage.tsx` and used in `ThreeReadingFlow`. It is not passed to `CelticReadingFlow` or down to `CelticCrossReading`. The Celtic Cross synthesis receives a personal year of zero, which GPT will either ignore or interpret as a numerologically meaningful zero. Neither is correct.

---

## What the Server-Side Synthesis Re-Computation Creates

`handleTarotSingleSynthesis` (and its siblings) in `gptTarot.ts` run server-side. When a `userId` is provided, the server re-computes natal chart data and transit data independently from what the client sent. This is a sensible security measure — don't trust client-supplied astrological data.

But this server-side re-computation uses `resolveUserBirthContext(userId)`. That function returns a birth context from the server's store. If the user has changed their birth data recently, or if the server's birth context is out of sync with the client's `ChartData`, the server-side synthesis will use different planetary positions than the client-side instant interpretation. The user sees a card with one astro headline (from the client-side engine), then receives synthesis text (from the server re-computation) that may reflect slightly different transit data. The divergence is small in practice but structurally it means the "This Person's Sky Right Now" in GPT synthesis and the "In Your Sky Now" in the instant interpretation panel are computed at different moments with potentially different transit data.

---

## What to Fix, in Order of Severity

1. **Wire the save calls.** All three flow containers need real `onSave` handlers that call `saveReading()` from `readingsService.ts`. This requires threading a token through `TarotPageInner` into the flows. Before writing a line: confirm where the auth token lives at the `TarotPage` level, and verify that `CelticCrossReading`'s `onSave` prop type changes from `(reading: SavedReading) => void` to `() => void` to match the pattern, or that `CelticCrossReading.tsx` builds a `SaveReadingRequest` instead of a `SavedReading`. The two types are incompatible and require explicit reconciliation.

2. **Pass transit data into `buildEngineCtx`.** Both `dailyTransitData` and `weeklyTransitData` are computed in `SingleReadingFlow`, `ThreeReadingFlow`, and `CelticReadingFlow`. Pass one of them (daily is sufficient for `dominantTransitPlanet` and retrograde detection) into `buildEngineCtx`. This immediately enables Level 1 and Level 2 transit adaptations in the instant interpretation for all cards across all reading types.

3. **Enrich the SingleCardReading `discussContext`.** Add `synthesisPayload` fields (natal signs, transit summary, advance category, moon phase) to the `discussContext` memo. Also add a mechanism to include synthesis text once loaded — the simplest approach is a `synthesisText` prop passed from `SingleReadingFlow` when synthesis resolves.

4. **Fix `ThreeCardReading.tsx` line 839.** Remove `instantInterpretations` from the dependency array. It does not exist in scope and pollutes the effect's dependency tracking.

5. **Pass `personalYear` into `CelticReadingFlow`.** `computePersonalYear(birthDate)` is available in `TarotPage.tsx` and should be passed as a prop to `CelticReadingFlow`, then down to `buildCelticSynthesisPayload`. The `personalYear: 0` hardcode is a numerological insult.

6. **Import and thread the advance score.** `advanceSnapshotSessionCache` from `AdvanceTab.tsx` provides today's advance score. Import it in `TarotPage.tsx`, read it at mount, and pass it as the fourth argument to `buildTarotAstroContext`. This activates `advanceCategoryNote` in every instant interpretation and `advanceCategory`/`advanceReason` in every GPT synthesis.

---

## The Central Observation

All of these risks share a common structure: the architecture is well-designed and the data is present, but the wiring from data to consumption is severed at critical junctions. The system looks complete from the outside — it has components, types, handlers, database routes, and prompt templates. But it is like a building where the pipes are installed and the valves are there, and the water is running somewhere — just not to the faucets.

The danger is not technical complexity. The danger is that this kind of failure is invisible. A user who draws a card under Saturn retrograde sees an interpretation that could apply on any day of any year. A user who taps Save sees the word "Saved" and loses their reading. A user who asks in Discuss "is this about my relationship?" receives an answer that does not know they have Venus in Scorpio in the 8th house with Saturn transiting it. The system looks functional because there are no errors. The failures are silent, and silent failures in a product that asks for trust are worse than visible crashes.

You can always fix a crash. You cannot fix eroded trust once the user has discovered the lie.
