# Sprint 0026 — Review Plan

_For a non-technical product owner doing manual QA. Written 2026-05-26._

---

## Feature 1: Chart Ruler in Synthesis (task-0005)

**Feature name:** Chart Ruler Natal Personalization

**Where to go:** Any reading flow — Single Card (TarotPage), Three-Card Reading, or Celtic Cross.

**How to test it:**
1. Open the app and ensure your birth data is entered (date, time, location).
2. Draw any single card from the main Tarot page.
3. Tap "Get Full Reading" to trigger the GPT synthesis.
4. Read Paragraph 2 of the synthesis carefully.

**What to expect:**
- Paragraph 2 should name a specific planet (e.g., "Your chart ruler, Mars…" or "Venus, as the ruler of your Libra Ascendant…").
- The named planet should be connected to this specific card — not a generic observation.
- If the card's own ruling planet happens to be the same as the chart ruler (e.g., you have Aries rising and drew The Emperor, which is Mars-ruled), GPT should call this out explicitly as a high-resonance signal.
- Repeat for Three-Card and Celtic Cross to confirm chart ruler appears in ASTROLOGY_SYNTHESIS and Astrology Resonance sections.

---

## Feature 2: Position-Aware Instant Interpretation (task-0006)

**Feature name:** Position Label and Meaning in the Interpretation Panel

**Where to go:** Three-Card Reading (any spread mode — Past/Present/Future, Situation/Action/Outcome, etc.) or Celtic Cross.

**How to test it:**
1. Start a Three-Card reading.
2. Draw all three cards.
3. Without requesting a GPT synthesis, tap on any individual card to open the interpretation panel.
4. Look at the top of the interpretation panel.

**What to expect:**
- A "Position" row is visible, showing the position label (e.g., "Past," "Present," "Future") and a brief description of what that position means in this spread.
- The instant interpretation text (Level 1 or Level 2) references the position in its narrative — it should not read as a generic single-card interpretation divorced from context.
- Test with the offline fallback: disable your network connection or wait for the AI-free Level 2 to appear, and verify it also incorporates the position context.

---

## Feature 3: Dominant Modality in Synthesis (task-0001, task-0004)

**Feature name:** Natal Dominant Modality in Synthesis

**Where to go:** Any GPT synthesis reading.

**How to test it:**
1. Complete a full GPT synthesis reading (single card, three-card, or Celtic Cross).
2. Look for modality language in the natal chart paragraph and astrology section.

**What to expect:**
- The synthesis should reference your dominant modality — one of "Cardinal," "Fixed," or "Mutable" — by name.
- The reference should explain what that modality means for how you meet the energy of the drawn card (e.g., "As a Fixed-dominant person, you meet this Tower energy by standing your ground or enduring — which means the disruption lands differently than it would for someone who moves toward force or reframes it").
- This should appear even for spreads that include court cards or reversed Major Arcana.

---

## Internal Changes (non-visual, no direct QA steps needed)

**task-0002 — 36 Court Card Transit Adaptations**
When a court card (Page, Knight, Queen, or King of any suit) is drawn and a Saturn, Pluto, or Uranus transit is active, the synthesis will now include rich, rank-specific transit guidance instead of falling back to generic copy. To spot-check: draw a King of Wands during a Saturn transit and confirm the ASTROLOGY_SYNTHESIS references Saturn's specific relationship to visionary authority rather than a generic "Saturn brings discipline" observation.

**task-0003 — 7 Major Arcana Reversed Meanings Rewritten**
The reversed meanings for The Fool, Magician, High Priestess, Empress, Emperor, Hierophant, and Lovers are now written as off-axis or internalized expressions of the archetype rather than simple negations. To spot-check: draw any of these seven cards reversed and read the instant interpretation — it should describe how the card's central principle operates when blocked or working beneath the surface, not simply that the card's quality is "absent" or "blocked."

**task-0004 — GPT Prompt Specificity Constraints**
The synthesis prompts now enforce that every natal chart and transit observation must be verifiably card-specific — if a different card had been drawn by the same person, the paragraph should need to be rewritten. There is no direct visual change to review, but the quality bar for natal and synthesis paragraphs is higher. Watch for paragraphs that feel like they could belong to any reading for the same person — those would indicate the constraint is not working.
