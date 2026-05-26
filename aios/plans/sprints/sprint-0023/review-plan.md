# Sprint 0023 — Review Plan

Manual QA guide for sprint-0023 features. All steps assume the app is running locally.

---

## Tarot Entry Point

**Feature:** Tarot Reading entry in the Readings modal

**Where to go:** Open the app → tap the Readings button (the modal that lists all reading types)

**How to test it:**
1. Open the app and navigate to any main screen.
2. Tap the Readings button to open the Readings modal.
3. Scroll to the "Divination" group.
4. Confirm "Tarot Reading" appears with a violet accent and a Layers icon.
5. Tap it.

**What to expect:** The app transitions to the Tarot home screen.

---

## Tarot Home — Intention & Mode Selection

**Feature:** Intention chips, custom text input, and reading mode selection

**Where to go:** Tarot home screen (reached via Readings modal → Tarot Reading)

**How to test it:**
1. On the Tarot home screen, confirm intention chips are visible (love, growth, career, decision, spiritual, relationship).
2. Tap one chip — it should highlight.
3. Alternatively, type a custom intention in the text input below the chips.
4. Below the intention area, confirm three reading modes are shown: Single Card, Three Card, Celtic Cross (each with a short description).
5. Tap a mode to select it.
6. Proceed to the next step.

**What to expect:** Selected chip and mode are highlighted; the Continue or Draw button activates.

---

## Tarot Draw Ritual — Shuffle Animation

**Feature:** Deck shuffle animation and ritual transition

**Where to go:** Tarot home → select an intention and mode → tap Continue/Draw

**How to test it:**
1. After selecting intention and mode, tap the draw button.
2. Watch the deck shuffle animation: cards should fan out, collapse, and merge through multiple phases.
3. After the shuffle, the ritual fade overlay should appear briefly before the reading view loads.

**What to expect:** Smooth multi-phase shuffle animation followed by a fade transition into the reading.

---

## Single Card Reading

**Feature:** Single card draw, instant interpretation, GPT synthesis

**Where to go:** Tarot home → set intention → select Single Card → draw

**How to test it:**
1. Draw a single card. The card should display face-down initially.
2. Tap to reveal — the card flips with a 3D animation (600ms flip).
3. Confirm the card shows its SVG symbol (Major Arcana glyph or pip/court suit symbol).
4. Scroll down to see the Interpretation Panel: core meaning, symbolic theme, emotional meaning, practical guidance, reflection question, numerology resonance.
5. If the card's element or personal day matches, confirm a highlight badge appears.
6. Continue scrolling to the GPT Synthesis panel. Confirm a loading state appears, then the synthesis text arrives (up to 30s timeout).
7. Tap "Discuss ✦" to open the discuss panel.
8. Tap the Save button — confirm the reading is saved.

**What to expect:** Full card reveal with interpretation and GPT synthesis. Discuss entry point visible.

---

## Three Card Reading

**Feature:** Three-card sequential reveal with spread modes and synthesis

**Where to go:** Tarot home → set intention → select Three Card → draw

**How to test it:**
1. The reading opens with three face-down cards.
2. Tap each card in sequence to reveal it with the flip animation.
3. After all three are revealed, confirm the spread mode label appears (e.g., Past / Present / Future).
4. Tap the spread mode selector to cycle through all five modes: Past/Present/Future, Situation/Challenge/Advice, Mind/Heart/Action, Self/Other/Bridge, Theme/Shadow/Gift. Confirm card position labels update.
5. Wait for the GPT synthesis to load and appear below the spread.

**What to expect:** Three cards reveal sequentially; synthesis appears after all three are shown; spread mode changes update position labels.

---

## Celtic Cross Reading

**Feature:** 10-position Celtic Cross with progressive reveal and chapter synthesis

**Where to go:** Tarot home → set intention → select Celtic Cross → draw

**How to test it:**
1. The reading opens with 10 face-down cards in Celtic Cross layout (cross on the left, staff of 4 on the right).
2. Tap to reveal positions 1 and 2 together (they reveal simultaneously). Confirm a 3-second mandatory hold before the next position unlocks.
3. Reveal positions 3–10 individually, one at a time, each with a 3-second hold.
4. Confirm the crossing card (position 2) is visually rotated.
5. At card 7, GPT synthesis should begin loading in the background (fire-early).
6. After all 10 cards are revealed, the synthesis panel should show 8 chapters arriving sequentially (1200ms stagger).
7. Confirm the background temperature shifts as cards are revealed.

**What to expect:** Progressive reveal with mandatory holds, 8-chapter synthesis with staggered arrival, accessible keyboard navigation.

---

## Tarot Card Visuals

**Feature:** SVG symbol renderer, card back, reveal animation

**Where to go:** Any reading (single, three, Celtic Cross)

**How to test it:**
1. Before reveal: confirm the card back shows a deep indigo background, 8-pointed star, gold geometric frame, and a slow breathing pulse animation.
2. After reveal: confirm Major Arcana cards show their SVG glyph symbol; Minor Arcana show pip symbols (1–7) or court card symbols.
3. If a card is reversed, confirm it tilts slightly (rotate -4deg).
4. Confirm element temperature tints differ between fire, water, earth, and air cards.
5. Confirm the glow overlay appears briefly on reveal.

**What to expect:** Distinct visuals for each card type; reversed tilt; element tints; glow on reveal.

---

## Saved Readings

**Feature:** Save and replay readings

**Where to go:** Complete any reading → tap Save → then navigate to Saved Readings

**How to test it:**
1. Complete a single card or three-card reading.
2. Tap the Save button. Confirm a confirmation or success state appears.
3. Navigate to the Saved Readings screen (check the main menu or Readings modal for a "Saved Readings" entry).
4. Confirm the saved reading appears in the list with the card name, intent preview, spread mode, and date.
5. Tap the reading to open it — confirm it replays the full reading including cards and synthesis.
6. Tap the Delete button and confirm a delete confirmation dialog appears. Confirm deletion removes the reading from the list.

**What to expect:** Reading saved, listed, fully replayable, and deletable.

---

## Subscription Gate

**Feature:** Per-tier daily and weekly limits for tarot readings

**Where to go:** Attempt to draw cards after hitting the daily limit

**How to test it:**
1. As a free-tier user, draw the maximum allowed daily cards.
2. Attempt to draw again — confirm a gate message or upgrade prompt appears instead of proceeding to the reading.
3. For three-card readings, confirm the weekly limit is enforced separately from the daily card limit.

**What to expect:** Gate blocks draws beyond the limit; upgrade modal appears.

---

## Internal Changes

- **Rate Limiter Test Mode (task-0001):** Rate limit values now differ between development and production. No UI change — verify by checking that the server starts without errors in both `NODE_ENV=development` and `NODE_ENV=production`.
- **TarotContext isolation (task-0002):** Internal state refactor. No UI change — verify that navigating to/from Tarot does not affect other app views (birth chart, transits, etc.).
