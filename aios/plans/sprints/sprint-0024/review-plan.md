# Sprint 0024 — Review Plan

How to manually verify each delivered feature in the running app.

---

## Feature 1: Celtic Cross Uses Real Interpretations + Live Sky

**What was delivered:** The Celtic Cross now shows position-aware, transit-aware interpretations for each card during the reveal sequence, and the GPT synthesis receives real daily and weekly transit data.

**Where to go:** Open the app → Readings → Tarot Reading → set an intention → Celtic Cross

**How to test it:**
1. Begin a Celtic Cross reading with a birth chart set on your account.
2. Draw all ten cards by tapping each glowing position in sequence.
3. After each card reveals, read the interpretation panel beneath it.
4. Draw The Tower (or any high-impact Major Arcana) in two different positions across two separate readings.
5. In the Discuss panel after the full synthesis loads, ask: "What transits are most relevant to this spread?"

**What to expect:**
- The interpretation panel for each card should reference the card's position context — a card in "Foundation" should read differently than the same card in "Outcome."
- No two positions should show identical text for the same card.
- The GPT synthesis should name specific transit aspects (not just natal placements) in the Astrology Resonance section.
- The Discuss response to the transit question should name specific planets and aspects, not generic statements.

---

## Feature 2: Deck Fan Shows Real Card Backs

**What was delivered:** The 78-card fan displayed before drawing now shows the real `CardBack` component — indigo field, eight-pointed star, gold frame, breathing pulse — instead of `✦` Unicode characters.

**Where to go:** Open the app → Readings → Tarot Reading → any mode → arrive at the deck selection screen

**How to test it:**
1. Start any tarot reading (Single Card, Three-Card, or Celtic Cross).
2. Arrive at the deck fan screen (for Single/Three-Card this comes after the shuffle ritual; for Celtic Cross it is the initial draw screen).
3. Look at the fanned cards before selecting one.

**What to expect:**
- Each card in the fan shows a dark indigo background with a gold geometric star design and a subtle breathing animation.
- No `✦` characters are visible anywhere on the fan.
- Hovering or tapping a card shows a selection highlight; the visual is of a real face-down card, not a symbol.

---

## Feature 3: Card Combinations + Intention in Synthesis

**What was delivered:** GPT synthesis across all reading types now computes elemental dignity between card pairs, requires an explicit cards 1+2 pairing statement in the opening, and threads the user's original intention through the reading rather than mentioning it once and dropping it.

**Where to go:** Single Card, Three-Card, or Celtic Cross — any reading with an intention set

**How to test it:**
1. Set a specific, personal intention (e.g., "Should I take this new job?") and draw a Three-Card reading.
2. When the synthesis loads, read the opening paragraph.
3. Read through to the Advice section.
4. Open the Discuss panel and ask a follow-up question unrelated to the original intention.

**What to expect:**
- The opening of the three-card synthesis should name what cards 1 and 2 are doing *together* as a pair (e.g., "The Moon and the Five of Swords together describe a fog of incomplete information meeting a moment of painful clarity") before introducing card 3.
- Your specific question ("Should I take this new job?") should be referenced at least twice in the synthesis — not just as the opening header line.
- The reflection question at the end should feel specific to your question, not generic.
- Discuss follow-ups should stay anchored to your original intention even when you ask about something tangential.

---

## Feature 4: Shuffle Ritual Before Readings

**What was delivered:** After setting an intention and selecting Single Card or Three-Card mode, the shuffle ritual now plays as the transition — the user's intention echoes above three breathing card backs, the deck shuffles for at least 2 seconds, and a single face-down card waits to be revealed.

**Where to go:** Open the app → Readings → Tarot Reading → set an intention → Single Card or Three-Card

**How to test it:**
1. Open a new tarot reading and type or select an intention.
2. Select Single Card mode.
3. Watch and interact with the shuffle ritual.
4. Repeat with Three-Card mode.
5. Try selecting Celtic Cross.

**What to expect:**
- After selecting Single Card or Three-Card: a full-screen transition shows your intention text in italic gold above three face-down cards with star geometry. The cards animate in a shuffle motion for at least 2 seconds (never abrupt). The motion settles to one face-down card at center. A faint "Tap to reveal" hint may appear. Tapping the card triggers a 3D flip (back sweeps away, front arrives in ~600ms) and the reading begins.
- Celtic Cross: the shuffle ritual does NOT appear. Celtic Cross goes directly into its own draw ceremony.
- If you have reduced motion enabled in your system settings, the animations are replaced with simple fades.

---

## Internal Changes

### Tarot Type System Unification (`task-0003`)
No user-visible behavior changes. Verify by running the full application and confirming all three reading types (Single Card, Three-Card, Celtic Cross), saved readings, and the Discuss panel continue to function without errors. Open the browser console and confirm no TypeScript or runtime type errors appear during a complete Celtic Cross reading.
