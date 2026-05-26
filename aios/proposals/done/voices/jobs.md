# Steve Jobs — Sprint 0025 Voice

I want to talk about the difference between a product that works and a product that someone loves.

This product works. The shuffle ritual is beautiful. The Celtic Cross has ten positions and a real synthesis engine behind it. The cards flip. The element gradient tints the page. Someone spent real time on this, and it shows.

But there is a fundamental betrayal happening in this product right now, and it is not subtle. When a user taps "Save," the UI says "Saved ✓" and nothing happens. The reading is gone the moment they close the tab. That is not a minor bug. That is a lie. It is the worst kind of failure — not a crash the user can see, but a silent betrayal they will only discover when they come back to find nothing there.

I've seen this pattern before. Engineers wire up the beautiful parts — the animation, the flip, the synthesis — and leave the plumbing for later. But the plumbing is the promise. The Saved Readings page renders beautifully with skeleton tiles and a graceful empty state. The `readingsService.ts` has `saveReading()` already built and tested. And then `TarotPage.tsx` passes `onSave={() => {}}` — a literal no-op — to every single reading flow. Lines 217, 284, and 329. Three places where the product tells a user their reading matters, and three places where the code immediately forgets it ever happened.

---

## What Is Mediocre That Should Be Delightful

**1. The "In Your Sky Now" section always shows the baseline fallback.**

This is the most important section in the entire tarot experience. It is the thing that makes this product irreducibly personal — not just another tarot app, but *your* tarot reading, grounded in *your* sky at *this moment*. The engine has 397+ transit adaptation entries built precisely for this purpose. They are populated. They are waiting.

And they are never reached.

In `TarotPage.tsx`, `buildEngineCtx` calls `buildTarotAstroContext(chartData, null, ...)` — the second argument is `null`. Always. The transit data is already computed in `SingleReadingFlow` and `ThreeReadingFlow` via `calculateTransits`. It is sitting right there, unused. So every single card drawn lands at Level 3 — the baseline astro note. The Tower under a Pluto transit reads the same as The Tower on a quiet Wednesday. That is not astrology. That is a label.

The fix is one line. The payoff is the entire reason the section exists.

**2. The Discuss panel is having a conversation about a generic card, not about this person's reading.**

Look at what `SingleCardReading.tsx` sends as `discussContext` (lines 64–77): card name, arcana, core meaning, symbolic theme, emotional meaning, practical guidance, reflection question, personal day. Nine fields. Not a single line about natal Sun sign, Moon sign, or Ascendant. Not a line about what transits are active. Not a word about what the synthesis said.

So when someone draws the Three of Swords after a breakup, completes the reading, reads the synthesis — and then opens Discuss to ask "is this telling me it's over?" — the assistant responds as if it has never met this person. It does not know their Venus placement. It does not know what the synthesis said. It does not know a single transit is active. It is answering a general question about a card, dressed up as a personal response.

This is what kills trust in an AI product. Not hallucinations. Responses that are obviously not about you.

**3. The Saved Readings detail view looks like a developer JSON dump.**

Open a saved reading in `SavedReadingsPage.tsx` and look at the `DetailModal`. The synthesis is rendered as:

```tsx
{typeof reading.synthesis === 'string'
  ? reading.synthesis
  : JSON.stringify(reading.synthesis, null, 2)}
```

`JSON.stringify` with `null, 2`. In a premium product. The synthesis object has chapters — Opening Sentence, Main Theme, Tension, Direction, Hidden Influence, Advice, Timing. These are the most important words in the reading. They are rendered as a formatted JSON blob because no one has built the detail view yet.

The tile list is beautiful. The back button to exit the Saved Readings view works. And then you tap a reading and see raw JSON.

---

## What Is Cluttered or Unfocused

The reading flows have too many concerns that bleed into each other. `ThreeCardReading.tsx` is 1,200 lines. It contains: the deck state machine, the reveal phase state machine, the synthesis fetch loop, the fallback synthesis computation, the discuss context assembly, the save state, the back-confirm modal, and the full rendering tree. That is six distinct concerns in one file.

I am not arguing for component decomposition as an aesthetic preference. I am arguing that this complexity is why the save wiring was left as a no-op. When a file is 1,200 lines, the last 50 lines of plumbing feel optional.

The `computeAIFreeSynthesis` function generates static narrative about "a period of inward re-evaluation" and "elemental tension" — language that sounds astrological but is generated from card counts and reversal ratios, completely divorced from the actual natal chart. It exists to fill the screen when GPT fails. This is fine as a fallback. It is not fine when it is indistinguishable from the real synthesis in the UI, which means a user can never tell if they received a personalized reading or a formulaic one.

---

## What Is Missing That Would Make Someone Love This

**The reading has no memory that connects to the life.**

The Saved Readings list shows tiles: "The Tower, yesterday." But there is no sense of pattern, no recognition that someone draws The Tower repeatedly during a Saturn transit, no thread across time. The readings are saved as isolated objects. The product treats each reading as a transaction, not a practice.

The most powerful thing a tarot journal can do is say: "You've drawn cards about relationships six times in the last month. Here is what the cards have been saying." That requires nothing new in the architecture — the readings are already stored, the synthesis text is already there. It requires a reading of the collection, not just a reading of the card.

**The natal house context is entirely absent.**

The sprint vision describes this clearly and I won't repeat it better: "Saturn transits your Mercury" and "Saturn transits your Mercury in the 7th house" are not the same sentence. The product currently sends the first version. The natal chart has house data. The planets have `house` properties. Moon in the 8th house is a radically different natal signature than Moon in the 2nd house. The tarot synthesis that says "Moon in Cancer" without knowing it is the 8th house Moon is giving half an answer.

**The single card reading has no save button that works.**

In `SingleCardReading.tsx`, `handleSave()` calls `onSave()` with no arguments. The `onSave` prop is typed as `() => void`. There is no payload. Even if `TarotPage.tsx` weren't passing a no-op, there would be nothing to save — the card, reversed state, synthesis text, and intention are all present in the component but not passed out.

---

## The 2–3 Most Important Things to Fix

**1. Save must be real. This is non-negotiable.**

A user who taps Save on any reading type must end up with that reading in their Saved Readings list. The "Saved ✓" label must be earned. The database call must happen. The error state — network failure, session expired — must surface, not swallow. This is not a feature. It is the foundational promise of the product's memory system. Until it works, every reading feels disposable.

The fix is known: wire `TarotPage.tsx` handlers at lines 217, 284, and 329 to call `readingsService.saveReading()` with the actual payload. `CelticCrossReading.tsx` already passes the payload correctly — the pattern exists, it just needs to be applied to the other two flows. And `SingleCardReading.tsx` needs its `onSave` prop typed to accept a payload, not void.

**2. The instant interpretation must see the live sky.**

Change one call in `TarotPage.tsx`. Pass `dailyTransitData` into `buildTarotAstroContext` instead of `null`. That is the entire fix. The 397+ transit adaptation entries will become reachable. The "In Your Sky Now" section will show what it is designed to show. This is the deepest quality gap in the product — the most visible section showing the most fallback content — and it is one argument change.

**3. The Discuss context must carry the full reading.**

The person who opens Discuss after reading the synthesis deserves a response grounded in their actual reading. The `discussContext` string in `SingleCardReading.tsx` must include natal signs, active transit aspects, advance category, lunar phase, and the synthesis text if it has loaded. This is what transforms Discuss from a generic chatbot into something irreducibly personal.

---

## Concrete Proposals

### issue-save-wiring-three-flows

**Type:** issue  
**Priority:** Critical

`TarotPage.tsx` passes `onSave={() => {}}` to `SingleReadingFlow` (line 217), `ThreeReadingFlow` (line 284), and `CelticReadingFlow` (line 329). These are no-ops. Every Save tap across all three reading types silently discards the reading. The UI shows "Saved ✓" while the database receives nothing.

Fix:
- Add `useAuth` hook to `TarotPageInner` to get the session token
- Implement a real `handleSave` function that calls `readingsService.saveReading()` with the reading payload
- Wire it into all three flow components
- Change `SingleCardReading`'s `onSave` prop from `() => void` to accept a payload (card id, reversed, intention, synthesis text)
- Surface error state in the UI — do not silently swallow `saveReading` failures

**Files:** `src/components/tarot/TarotPage.tsx`, `src/components/tarot/SingleCardReading.tsx`, `src/components/tarot/ThreeCardReading.tsx`

---

### issue-transit-context-always-null

**Type:** issue  
**Priority:** High

In `TarotPage.tsx`, `buildEngineCtx` (lines 117–124) calls `buildTarotAstroContext(chartData, null, ...)`. The second argument — `TransitData | null` — is always `null`. As a result, `currentTransits`, `retrogradeplanets`, and `dominantTransitPlanet` are always empty in every `TarotAstroContext` produced. `computeInstantInterpretation` never reaches Level 1 (transit adaptation) or Level 2 (element affinity) in `buildTransitInfluence` — it always falls through to Level 3 (baseline astro note). The 397+ entries in `TRANSIT_ADAPTATIONS_BY_CARD` are unreachable by design.

Fix: in `buildEngineCtx`, accept the already-computed `dailyTransitData` as an argument and pass it as the second argument to `buildTarotAstroContext`. Both `SingleReadingFlow` and `ThreeReadingFlow` already compute `dailyTransitData` via `calculateTransits(chartData, 'daily')` — thread it through.

**Files:** `src/components/tarot/TarotPage.tsx`

---

### issue-discuss-context-natal-blind

**Type:** issue  
**Priority:** High

`SingleCardReading.tsx` lines 64–77 build the `discussContext` string with nine fields: card name, reversal, arcana, core meaning, symbolic theme, emotional meaning, practical guidance, reflection question, personal day. It contains no natal signs, no transit aspects, no advance category, no lunar phase, no synthesis text. The Discuss assistant cannot reference this person's sky, their natal placements, or what the synthesis said — only the card's generic interpretation data.

Fix: `SingleCardReading.tsx` needs access to the `TarotAstroContext` and the loaded synthesis text. Add these as props. Rebuild `discussContext` to include: natal Sun/Moon/Ascendant signs, dominant element, top three active transit aspects, advance category, lunar phase, and synthesis text (if loaded). Mirror the same pattern in `ThreeCardReading.tsx`, which has a slightly richer `discussContext` but still lacks natal and transit data.

**Files:** `src/components/tarot/SingleCardReading.tsx`, `src/components/tarot/ThreeCardReading.tsx`

---

### feat-saved-reading-detail-view

**Type:** feature  
**Priority:** High

The `DetailModal` in `SavedReadingsPage.tsx` renders saved reading synthesis with `JSON.stringify(reading.synthesis, null, 2)` when synthesis is not a plain string. This is a developer fallback, not a user experience. The synthesis payload for three-card and Celtic Cross readings is a structured object with named chapters (Opening Sentence, Main Theme, Tension, Direction, Hidden Influence, Advice, Timing, Reflection Prompts). These must be rendered as the reading experience they are — the same way they appear in the live reading view.

Fix:
- Add a `SynthesisDetailView` component that takes the synthesis object and renders each chapter with the section headers, typography, and spacing used in the live reading
- Replace the `JSON.stringify` fallback in `DetailModal` with this component
- For single-card readings, the synthesis is a prose string — render it in styled paragraphs
- Show the card name prominently and the intention as the modal's emotional anchor

**Files:** `src/components/tarot/SavedReadingsPage.tsx`

---

### feat-natal-house-context-in-engine

**Type:** feature  
**Priority:** High

`TarotAstroContext` contains natal Sun sign, Moon sign, and Ascendant sign but no house placements. The GPT synthesis prompts state "Moon in Cancer" without knowing it is the 8th house Moon — a radically different signature. House awareness is the difference between a sign-level reading and a chart-level reading.

Fix:
- Add `natalMoonHouse`, `natalVenusHouse`, `natalNorthNodeHouse`, and `natalMarsHouse` to `TarotAstroContext`
- Extract these from `ChartData.planets[x].house` in `buildTarotAstroContext` — the data is already present
- Add corresponding fields to `TarotSingleSynthesisPayload`, `TarotThreeSynthesisPayload`, `TarotCelticSynthesisPayload` in `gptInterpretation.ts`
- Add house lines to the "This Person's Sky Right Now" section in `gptTarot.ts` synthesis prompts — every field added must appear in the prompt

**Files:** `src/engine/tarot.ts`, `src/services/gptInterpretation.ts`, `server/services/gptTarot.ts`

---

### feat-advance-signal-into-engine

**Type:** feature  
**Priority:** Medium

`buildEngineCtx` in `TarotPage.tsx` passes `null` as the `advanceScore` argument to `buildTarotAstroContext`. The `advanceSnapshotSessionCache` from `AdvanceTab.tsx` contains today's computed score. The `buildAdvanceCategoryNote` function in `tarot.ts` is already implemented — it just needs a non-null input to fire. Today, `advanceCategoryNote` is always empty in the instant interpretation.

Fix: import `advanceSnapshotSessionCache` from `AdvanceTab.tsx` into `TarotPage.tsx`. Read the cached score for today's date. Pass it as the `advanceScore` argument in `buildEngineCtx`. This is a threading fix, not new logic.

**Files:** `src/components/tarot/TarotPage.tsx`

---

### code-single-card-reading-save-payload

**Type:** code  
**Priority:** High (required by issue-save-wiring-three-flows)

`SingleCardReading.tsx` types `onSave` as `() => void`. For the save wiring in `TarotPage.tsx` to work, this component must pass the reading payload to the parent. The payload needs: card id, card name, reversed boolean, interpretation object, synthesis text (if loaded), and user intention.

This requires:
- Changing the `onSave` prop signature to `(payload: SingleCardSavePayload) => void`
- Capturing the synthesis text inside `SingleCardSynthesisPanel` and surfacing it through a callback or ref so `SingleCardReading` can include it in the payload when the user taps Save
- Updating `SingleReadingFlow` in `TarotPage.tsx` to pass the wired handler

**Files:** `src/components/tarot/SingleCardReading.tsx`, `src/components/tarot/SingleCardSynthesisPanel.tsx`, `src/components/tarot/TarotPage.tsx`

---

## What This Sprint Is About, At Its Core

The architecture is good. The design is good. The data is good. The 397 transit adaptations are good. The problem is that none of the good things are connected to each other at the moments that matter.

Save is wired to nothing. Transit context is passed as null. The Discuss panel doesn't know the person's name, sign, or what their synthesis said. The detail view shows JSON.

This is not a creative problem. It is a completion problem. The product is 80% of the way to something someone could genuinely love as a daily practice — and the remaining 20% is all in the connective tissue. Every proposal above is about closing a gap between something that was designed to work and the call site that doesn't use it.

The user who draws The Tower, sees "Saturn transits your Mercury in the 8th house, bringing endings that restructure your deepest held securities" in the instant interpretation, saves the reading, comes back tomorrow, and re-reads it in a detail view that renders it with the care it deserves — that user has a reason to come back. And a reason to pay.

Right now, that user draws The Tower, sees a baseline astro note, taps Save, and finds nothing tomorrow.

That is the gap. Close it.
