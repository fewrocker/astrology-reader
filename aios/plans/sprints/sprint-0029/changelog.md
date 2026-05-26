# Sprint 0029 — Changelog

## Completed Tasks

---

### task-0001 — issue-celtic-cross-gpt-synthesis-fails
**Proposal:** `issue-celtic-cross-gpt-synthesis-fails`
**Problem:** The Celtic Cross GPT synthesis endpoint always returned an error for authenticated users. Three runtime crash paths were present: (A) `positions[i]` access without a null guard caused `TypeError` when the payload had fewer than 10 entries; (B) `calculateChart` inside the `if (userId)` block had no try/catch — any throw from the astronomical engine returned a 500 before the OpenAI call was reached; (C) `parseCelticChapters` had no fallback — if GPT format drifted, valid synthesis text was discarded and `"Empty synthesis response"` was thrown.
**Solution:** Added null guard for `positions[i]` with a fallback label object; wrapped the `calculateChart` call in try/catch so auth failures fall through to client-supplied payload values; added two fallback guards in `parseCelticChapters` that return a single-chapter array instead of throwing on empty output.

---

### task-0002 — issue-celtic-cross-no-scroll-on-reveal
**Proposal:** `issue-celtic-cross-no-scroll-on-reveal`
**Problem:** Tapping a card in the Celtic Cross reading revealed an interpretation panel that mounted below the viewport fold with no scroll triggered. The user saw no response from their tap because the content appeared off-screen.
**Solution:** Added `interpretationPanelRef = useRef<HTMLDivElement>(null)` in `CelticCrossReading.tsx`, a `useEffect` that calls `scrollIntoView({ behavior: 'smooth' | 'instant' })` after each card reveal (gated on `phase === 'holding'` and `activePosition > 2`), and passed the ref to the `InterpretationPanel` container div. Respects `prefers-reduced-motion` by switching to `instant` when set.

---

### task-0003 — issue-celtic-cross-zero-positional-awareness
**Proposal:** `issue-celtic-cross-zero-positional-awareness`
**What it is:** Full positional context in every Celtic Cross instant interpretation panel — position name, description, and a static "demand string" naming what this position requires of the card sitting in it. All 10 positions now carry their symbolic role explicitly before the card's interpretation text.
**Problem:** `computeInstantInterpretation` received `CelticCrossPosition` objects (with `name`/`description` fields) but the engine expected `SpreadPosition` shape (`label`/`meaning`), so `positionLabel` and `positionMeaning` resolved to `null` for every Celtic Cross card. All 10 positions showed only the generic card meaning.
**Solution:** Added a `SpreadPosition` adapter at the call site in `CelticCrossReading.tsx` mapping `name → label` and `description → meaning`. Added a `cardDemand: string` field to `CelticCrossPosition` with 10 static strings written at the same literary register as the existing position descriptions — each naming the specific pressure the position exerts on the card sitting in it (e.g., "The Outcome position asks what this card points toward when all other energies have had their say — not what it promises, but what its direction implies."). Two new regression tests confirm the adapter produces non-null `positionLabel`/`positionMeaning` for all 10 positions.

---

### task-0004 — issue-single-card-ritual-gap
**Proposal:** `issue-single-card-ritual-gap`
**Problem:** After the deck shuffle animation completes and `SingleCardReading` mounts, the card rendered at reduced opacity with no instruction text and no click affordance. The "Seeking clarity on" label belonged to `DeckShuffleAnimation` and disappeared with it, leaving the user in silence at the ritual's climactic moment.
**Solution:** At the `revealReady && !revealed` phase gate in `SingleCardReading.tsx`: applied `tarot-ring-pulse 2s ease-in-out infinite` glow animation to the card wrapper, rendered the invitation text "Visualize your intention and click on the card to start the ritual" below the card in gold (`rgba(201,168,76,0.65)`) with `font-heading`, and wired an `onClick` handler that calls `setRevealed(true)` immediately — shortcutting the 480ms timer so the click response is instant.

---

### task-0005 — issue-three-card-stuck-after-selection
**Proposal:** `issue-three-card-stuck-after-selection`
**Problem:** After all three cards were selected in the three-card reading, the user could not proceed. The first card showed no glow and did not respond to taps. Root cause: `handleCardTap` was a `useCallback` with `[activeCardIndex, triggerRevealOverlay]` as dependencies. When `placementComplete` became `true` and React set `activeCardIndex = 0`, the old closure still captured `null`. The tap guard `if (index !== activeCardIndex) return` evaluated as `if (0 !== null) return` — always exiting silently.
**Solution:** Added `activeCardIndexRef = useRef<number | null>(null)` kept in sync during render (`activeCardIndexRef.current = activeCardIndex`). Changed `handleCardTap` to read `activeCardIndexRef.current` instead of the closed-over value, and removed `activeCardIndex` from the dependency array — the callback is now stable and always reads the current value. Four regression tests cover the stale-closure scenario and the fix.

---

### task-0006 — code-celtic-payload-hardcoded-zeros
**Proposal:** `code-celtic-payload-hardcoded-zeros`
**Problem:** `buildCelticSynthesisPayload` in `CelticCrossReading.tsx` hardcoded `personalYear: 0` and `lifePathNumber: 0` for all sessions. These invalid numerology values passed silently to GPT, which processed them as real data — every Celtic Cross synthesis was personalized with permanently wrong numerological context.
**Solution:** Changed both fields to `null` in `buildCelticSynthesisPayload`. Updated the `TarotCelticSynthesisPayload` interface in `server/services/gptTarot.ts` and `src/services/gptInterpretation.ts` to `number | null`. Updated the server-side prompt template to conditionally omit the Life Path and Personal Year lines when null, so GPT only references these fields when real values are available from the user's birth context.

---

## Failed / Deferred Tasks

None. All 6 tasks completed successfully.

## Build & Test Results

- 75 tests passing, 0 failing (up from 69 pre-sprint)
- New tests: +6 (task-0003 ×2, task-0005 ×4)
- Build: clean (Vite client + tsc server build)
- Merges: all 6 task branches merged to sprint-0029, then to master
