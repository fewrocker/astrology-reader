# Sprint 0029 — Review Plan

This guide tells you exactly how to manually verify each fix in the running app. Open the app at `http://localhost:5173` before starting.

---

## 1 — Single Card Ritual Invitation (task-0004)

**What was delivered:** After the deck shuffle animation ends, the card now shows a gold glowing pulse and the instruction "Visualize your intention and click on the card to start the ritual" before it flips.

**Where to go:** Open the app → Tarot → Single Card Reading → Select any deck → Complete the intention entry → Watch the shuffle animation.

**How to test it:**
1. Navigate to Tarot and choose Single Card Reading.
2. Enter any intention (e.g., "love") and tap the button to start the ritual.
3. Watch the shuffle animation play through to completion.
4. When the animation ends and the card stands alone on screen, observe the card before tapping it.

**What to expect:** A soft gold glow pulses continuously around the card back. Below the card, in gold text, you see "Visualize your intention and click on the card to start the ritual." Clicking or tapping the card immediately flips it to reveal the drawn card.

---

## 2 — Three-Card Reading: First Tap Now Works (task-0005)

**What was delivered:** After placing all three cards, tapping the first card no longer silently fails — it now immediately glows and responds to the tap to reveal.

**Where to go:** Open the app → Tarot → Three Card Reading → Select any deck and spread.

**How to test it:**
1. Navigate to Tarot and choose Three Card Reading.
2. Select a deck and a spread (e.g., Past / Present / Future).
3. Tap three cards from the fan to place them in their positions. Watch the placement animation.
4. Once all three cards are placed, immediately tap the first card (leftmost position).

**What to expect:** The first card has a visible ring glow indicating it is active. Tapping it immediately triggers its flip animation and reveals the card interpretation below. The reading flow continues — tap card 2, then card 3 — with no sticking.

---

## 3 — Celtic Cross: Scroll on Card Reveal (task-0002)

**What was delivered:** Tapping a card in the Celtic Cross reading now smoothly scrolls the page to the interpretation panel, which previously rendered below the visible area.

**Where to go:** Open the app → Tarot → Celtic Cross → Select a deck → Begin placing cards.

**How to test it:**
1. Navigate to Celtic Cross and select a deck.
2. Place the first card (tap to hold it in position 1 — the center "Present Situation" card).
3. After the card is revealed, wait for the first interpretation panel to appear.
4. Tap "Continue" to advance to the next position.
5. Tap to place card 3 or later (positions further into the reading).

**What to expect:** Each time a card is revealed and the interpretation panel mounts, the page smoothly scrolls down so the panel is visible at the top of the viewport. You do not need to manually scroll to see your reading — it follows you.

---

## 4 — Celtic Cross: Positional Awareness (task-0003)

**What was delivered:** Every Celtic Cross instant interpretation panel now shows the position name, the position description, and a "demand string" naming what this specific position requires of the card sitting in it — before the card's generic interpretation text loads.

**Where to go:** Open the app → Tarot → Celtic Cross → Place any card.

**How to test it:**
1. Navigate to Celtic Cross and begin a reading.
2. Place the first card in the center ("Present Situation" position).
3. Look at the interpretation panel that appears.
4. Advance to a few more positions (e.g., "Challenge", "Outcome") and observe each panel.

**What to expect:** Each interpretation panel begins with the position name in a distinct style (e.g., "Present Situation"), followed by the position description, then a short italicized or visually distinct line stating what this position demands of the card — e.g., for the Outcome position: "The Outcome position asks what this card points toward when all other energies have had their say — not what it promises, but what its direction implies." Below that, the card's own interpretation text follows. The content is specific to the position, not generic.

---

## 5 — Celtic Cross: GPT Synthesis (task-0001)

**What was delivered:** The Celtic Cross GPT synthesis now completes successfully for authenticated users. Previously it always failed with a 500 error.

**Where to go:** Open the app → Tarot → Celtic Cross → Complete a full 10-card reading (you must be logged in).

**How to test it:**
1. Log in to the app.
2. Navigate to Celtic Cross and complete a full reading: place all 10 cards one by one, tapping Continue after each.
3. After placing the 10th card and advancing, watch for the GPT synthesis section to load.

**What to expect:** After all 10 cards are placed, a GPT synthesis section appears (may take a few seconds to load). It renders chapters of text synthesizing the full 10-card spread. Previously this section would fail silently or show an error — now it should load successfully.

---

## Internal Changes

**task-0006 — Celtic payload zeros:** The Celtic Cross GPT synthesis now correctly omits Life Path and Personal Year lines from the prompt when the user's birth data is unavailable, rather than silently passing `0` for both fields. This is not user-visible but improves synthesis accuracy for users without a birth date on file.

No navigation steps needed — the improvement is reflected in the quality of the synthesis text when a Celtic Cross reading completes.
