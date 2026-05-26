# Sprint 0025 — Review Plan

This guide tells you exactly how to manually verify each feature delivered in sprint-0025.

---

## Feature 1 — Save Works Across All Three Reading Types

**What was delivered:** Tapping Save in any reading type now writes a real database record. The "Saved ✓" label only appears after the DB confirms success. Error states are reachable.

**Where to go:** Open the app → navigate to the Tarot section.

**How to test it:**
1. Draw a Single Card reading. Complete it so the interpretation panel appears.
2. Tap the **Save** button.
3. Watch the button label cycle: it should briefly show **Saving…** before showing **Saved ✓**.
4. Navigate away from the Tarot section, then navigate to **Saved Readings**.
5. Confirm the reading you just saved appears in the list with the correct card name and date.
6. Repeat steps 1–5 using **Three Card** mode.
7. Repeat steps 1–5 using **Celtic Cross** mode.

**What to expect:** All three reading types appear in Saved Readings after saving. The confirmation only appears after the save succeeds. If you have network issues or are logged out, an error message appears instead of a false "Saved" label.

---

## Feature 2 — Live Transit Context in Instant Interpretation

**What was delivered:** The "In Your Sky Now" section of the card interpretation now reflects your actual current transits — not a static baseline note. Cards drawn under significant transits show transit-specific text.

**Where to go:** Open the app → Tarot → draw any Single Card reading.

**How to test it:**
1. Draw a card. The interpretation panel appears immediately (before GPT loads).
2. Look at the **In Your Sky Now** section (the section with a left border, below the card meaning).
3. The text should reference a specific transit planet or element affinity — not a generic fallback like "its wisdom arrives exactly when you need it."
4. If you have a significant transit active (check the Today or Transits section for today's active aspects), draw a card associated with that transit's planet (e.g., if Pluto is prominent, draw The Tower or Death) and verify the note is transit-specific.

**What to expect:** The "In Your Sky Now" section shows a note grounded in what is actually happening in the sky today, not a generic default message.

---

## Feature 3 — Advance Category Note in Readings

**What was delivered:** If you have visited the Advance tab today and have an advance score for the current session, the instant interpretation now includes an advance category note (Power Day, Favorable, Challenging, etc.).

**Where to go:** Open the app → visit the **Advance** tab first to load today's score → then navigate to Tarot.

**How to test it:**
1. Visit the **Advance** section (or **Today** section) to load your advance score for today.
2. Navigate to the Tarot section.
3. Draw any card.
4. Look at the interpretation panel for an advance category note. Examples of what you might see:
   - "Today's sky is heightened — this card's energy arrives with unusual force and clarity." (Power Day)
   - "The sky asks for conscious engagement — this card's lesson comes with real stakes." (Challenging)
5. If you don't see an advance note, your score for today may be neutral (neutral scores are not shown as they add no information).

**What to expect:** On Power, Favorable, Challenging, or Shift days, the interpretation includes a one-sentence note grounding the card draw in the character of today's sky.

---

## Feature 4 — Discuss Knows Who You Are and What the Reading Said

**What was delivered:** Opening the Discuss panel after a reading now gives the assistant full awareness of your natal chart, active transits, lunar phase, and the synthesis you just read.

**Where to go:** Open the app → Tarot → complete a Single Card or Three Card reading with a synthesis loaded → tap **Discuss ✦**.

**How to test it:**
1. Draw a Single Card reading. Set an intention (e.g., "my career").
2. Wait for the GPT synthesis to load.
3. Tap **Discuss ✦** to open the Discuss panel.
4. Ask a question that references your natal chart or the synthesis — for example: "How does this connect to my Moon sign?" or "What does this mean given what you said about [something from the synthesis]?"
5. The response should reference your actual natal signs and/or the synthesis content — not a generic card explanation.
6. Repeat using **Three Card** mode.

**What to expect:** The Discuss assistant responds with awareness of who you are astrologically (natal Sun, Moon, Ascendant, dominant element), what is happening in the sky today (transit summary), and what the synthesis said. Responses are specific to your reading, not generic card descriptions.

---

## Feature 5 — Natal House Context in GPT Synthesis

**What was delivered:** GPT synthesis for all three reading types now includes your natal house placements. The synthesis says "Moon in Cancer in your 8th house" instead of just "Moon in Cancer."

**Where to go:** Open the app → Tarot → complete any reading and let the GPT synthesis load.

**How to test it:**
1. Draw a Single Card reading. Wait for the synthesis to load.
2. Read the synthesis carefully — look for any mention of your natal Moon, Venus, or other planets.
3. The placement should include a house number: "in your Xth house" or "in house X."
4. Repeat with Three Card and Celtic Cross readings.

**What to expect:** Synthesis references to your natal planets include the house they occupy — "Moon in Cancer in your 8th house" — not just the sign. The house grounds the interpretation in a specific domain of life, making the reading more specific to you.

---

## Feature 6 — Saved Readings Show a Real Reading, Not Raw JSON

**What was delivered:** The Saved Readings detail modal now renders synthesis properly — chapters with headings and body text, not `{"openingSentence":"...","mainTheme":"..."}` JSON output. It also shows card names, reversal states, spread positions, lunar phase, date, and your intention.

**Where to go:** Open the app → Saved Readings → tap any saved reading tile (you need at least one saved reading; use the save feature from Feature 1 above if needed).

**How to test it:**
1. Navigate to **Saved Readings**.
2. Tap a saved reading tile to open the detail modal.
3. Verify you see:
   - The card name(s) in gold serif, with reversal state noted if applicable
   - Your intention in italic gold
   - The spread type label
   - The date of the reading (absolute date for readings older than 7 days)
   - A `☽` lunar phase glyph with the phase name
   - The synthesis rendered as readable text — NOT raw JSON
   - For Celtic Cross readings: named chapters (Opening, Main Theme, Tension, Direction, Hidden Influence, Advice, Timing, Reflection) with headings and body paragraphs
4. The visual style should match the live reading surfaces — gold headings, warm muted text, element tint background — not a plain gray developer dialog.

**What to expect:** Opening a saved reading feels like opening a journal that preserved your reading in full. No JSON, no raw data — the complete reading as it was experienced.

---

## Internal Changes (No UI Verification Needed)

- **Transit context null fix** — architectural fix ensuring live transit data flows into the instant interpretation engine
- **Phantom dependency removal** — one-line cleanup in ThreeCardReading's useEffect
- **Shared utilities refactor** — shuffle, reversal, and transit setup now have a single canonical source in `tarotUtils.ts`
