# Voice: Hayao Miyazaki
## Sprint 0025 — Tarot Integration Layer

---

I have spent time with this product as if it were handed to me by someone asking: "Is this ready?" My answer is: the bones are honorable, but there are wounds that need tending before this can truly care for the person who comes to it.

Let me be specific, because vagueness is the enemy of craft.

---

## The Save Button Is a Lie

The most important thing I read in the code is this: in `TarotPage.tsx` at lines 217, 284, and 329, three separate reading flows pass `onSave={() => {}}` to their respective components. A user who draws The Tower, feels something shift in their chest, reads the synthesis, and then taps "Save" — receives a response that says "Saved ✓" while the reading vanishes forever.

This is not a bug. This is a betrayal.

In `SingleCardReading.tsx`, `handleSave()` calls `onSave()`, immediately sets `saveLabel` to "Saved", and then resets it after 2 seconds. The label is a performance. Nothing was saved. The user is applauded for a gesture that produced no result.

In `ThreeCardReading.tsx`, the component has a proper `saveState` that can show 'saved' or 'error', but both conditions are unreachable because the parent has discarded the wire. The error path — `saveState === 'error'` with its "Could not save. Try again." — was written by someone who understood that save could fail. And yet the parent never calls anything at all.

A person who returns the next day hoping to find a reading that moved them — and finds nothing — will not know the product failed. They will believe their own memory failed them. They will feel that the moment did not matter enough to be kept. That is a cruelty, and it is entirely preventable.

The fix is not complicated. `CelticCrossReading.tsx` already passes `onSave: (reading: SavedReading) => void` — a payload-bearing callback. The pattern exists. It simply needs to be connected in `TarotPage.tsx` for the single and three-card flows.

---

## The Sky Is Dark When It Should Be Alive

In `TarotPage.tsx`, `buildEngineCtx` is called with `buildTarotAstroContext(chartData, null, computePersonalDay(birthDate), null)`. The second argument — transit data — is always null. The fourth argument — advance score — is always null.

This means the "In Your Sky Now" section in `TarotInterpretationPanel.tsx` — which has a distinct left border to signal its special status, which has room for an astroHeadline, a transitInfluence, a lunarPhaseNote — will almost always show the fallback text:

> "Enter your birth data to see your sky connection."

Except the user has entered their birth data. The system has their chart. The transit data is being calculated right there in `SingleReadingFlow` and `ThreeReadingFlow` — it exists in memory, it just never flows into the engine context. The 397 transit adaptations are sitting unused. The user draws The Tower during a Pluto transit and is told nothing about Pluto.

I find this deeply wasteful. Not just technically — emotionally wasteful. Someone came to this product during a moment of disruption in their life. They drew the exact card that names their disruption. The sky outside their window is making the same noise as the card in their hand. And the product says nothing about that connection because someone forgot to pass a variable.

The transit data is computed. Pass it into `buildTarotAstroContext`. The fix is one line. The result is that the "In Your Sky Now" section earns its name.

---

## Discuss Responds to a Card, Not to a Reading

The `discussContext` in `SingleCardReading.tsx` is constructed at lines 64–77. It contains the card name, reversal status, arcana type, core meaning, symbolic theme, emotional meaning, practical guidance, reflection question, and personal day.

It does not contain: the synthesis text (if GPT has loaded), the user's natal Sun, Moon, or Ascendant signs, the transit aspects that shaped the "In Your Sky Now" section, the lunar phase, or the advance category.

When a user opens Discuss and asks "is this card telling me to leave?", they are asking that question in the context of their full sky — their Venus placement, the Venus transit pressing on their chart, the waxing or waning moon. The assistant receives only the card and is expected to speak to the full human. It cannot.

In `ThreeCardReading.tsx`, the `discussContext` is somewhat richer — it includes the synthesis opening sentence if available — but it still lacks natal sign data. The three-card discuss context at lines 883–888 builds from the card names, core meanings, and the synthesis skeleton, but does not include the astro context that was already computed and is sitting in `astroContext`.

This is a failure of threading, not a failure of design. The natal context, the transit context, the synthesis text — all of it is available at the call site. It just doesn't make it into the string that reaches the assistant. The result is a conversation that feels strangely flat: accurate about the cards, ignorant about the person.

---

## The Saved Readings Page Does Not Feel Like a Treasury

When I look at `SavedReadingsPage.tsx`, I see a functional list with `ReadingTile` components displaying card name, reading type, timestamp, and intention. When a tile is clicked, a `DetailModal` appears showing the synthesis text.

This is a ledger, not a sanctuary.

The detail modal is particularly austere. The container has `background: '#1a1a2e'` and `border: '1px solid #3a3a5c'` — the darkest, flattest container in the entire application. Every other reading surface in this product uses the mystic gold border system, the warm gradient backgrounds, the font-heading typography with its breath and weight. The detail modal uses `color: '#ccc'` and a pre-wrap text dump of the synthesis.

More troubling: if the synthesis is a JSON object (as the condition `typeof reading.synthesis === 'string'` guards against), it is rendered as raw `JSON.stringify`. A user opening a past reading and seeing `{"openingSentence":"...","mainTheme":"..."}` in their detail view has been handed a data dump instead of a reading.

There is also no card image shown in the detail modal. The card name appears in gold serif above a timestamp, and that is the full visual. No card art, no element indicator, no sense of the specific form of the card that was drawn.

The empty state is the best-written part of this page: "Your readings will live here. When you save a reading, it joins your personal collection — marked by the moon that was present when you drew." That sentence has care in it. The moon detail is a beautiful touch. But the moon is never shown again — not in the tile, not in the detail modal. The promise is made and not kept.

---

## What the Reversed Card Moment Deserves

In `ThreeCardReading.tsx`, when a card arrives reversed, the interpretation panel at line 441 says:

> "This card arrives turned."

One sentence, in small muted text. This is the entire acknowledgment of reversal — a symbolic event that changes the card's meaning, that signals the energy is internalized or blocked. In many traditions, a reversed card is the more interesting card. Here it gets four words and no elaboration. The engine likely has a richer reversed meaning, but the panel doesn't surface it distinctly.

In `SingleCardReading.tsx`, the reversal is noted only in the section header text where the card's name is rendered with "(reversed)" appended. The `TarotInterpretationPanel.tsx` does not have a specific visual treatment for reversed cards — no rotation indicator, no distinct visual orientation, nothing that communicates to the user what it means for a card to arrive in this position.

The card itself rotates in the CSS (via `reversalStyle = flipDone && card?.reversed ? 'rotate(180deg)' : ''`), which is correct. But the interpretive panels do not respond to this state with their own voice.

---

## The Mechanicalness of Section Headers

In `TarotInterpretationPanel.tsx`, the section headers are:

- "Core Meaning"
- "What It Carries"
- "Today's Invitation"
- "In Your Sky Now"
- "Number"
- "Sit With This"

These names have been chosen carefully. "Sit With This" is particularly good — it asks the reader to stay, not just read. "Today's Invitation" is warm. "What It Carries" suggests the card has weight and history.

But the implementation of each section is uniform: the same `SECTION_CONTAINER` class, the same `SECTION_HEADER` style, the same `BODY_TEXT` size. There is no visual hierarchy that communicates that "In Your Sky Now" is the most personal section, that "Sit With This" is the closing ceremony, that "Number" is a different kind of information than the emotional content. They are presented as equal items in a list, which strips them of their dramatic rhythm.

A reading should have a shape. It should rise and fall. The "Number" section — which displays a large numeral at `clamp(4rem, 15vw, 7rem)` — has the most dramatic visual, but it is positioned as section 5 of 6, sandwiched between practical guidance and a reflection question. Numerology as an afterthought rather than a foundation.

---

## Concrete Proposals

**1. The save wire must close before anything else.** In `TarotPage.tsx`, replace all three `onSave={() => {}}` with actual persistence logic that mirrors what `CelticReadingFlow` does with `onSave: (reading: SavedReading) => void`. Surface errors; do not silently drop them. The "Saved ✓" label should only appear when the database has confirmed receipt.

**2. Pass transit data into `buildEngineCtx`.** At the `TarotPage.tsx` call site, `buildTarotAstroContext` already accepts `TransitData | null`. The daily transit data is computed in each flow. Pass it. One line per flow. The 397 transit adaptations will finally reach the user.

**3. Enrich the discuss context with natal and synthesis data.** In `SingleCardReading.tsx`, the `discussContext` useMemo should include `engineCtx.natalSunSign`, `engineCtx.natalMoonSign`, `engineCtx.natalAscendantSign`, the current lunar phase, the top transit aspect or two from the transit summary, and — if GPT synthesis has loaded — a summary line or the synthesis text. The same for `ThreeCardReading.tsx`. These are all available at the call site.

**4. Restore the visual identity of the Saved Readings detail modal.** The modal at `#1a1a2e` with `#3a3a5c` borders does not belong to the same product as the reading surfaces. Replace with the gradient background and gold border system used elsewhere. Render the synthesis chapters as formatted prose — check for the JSON case and serialize the key sections into readable paragraphs rather than data. Show the card name prominently and, if possible, show the card's element indicator or an element-colored border.

**5. Make the empty state promise something it delivers.** If the empty state says "marked by the moon that was present when you drew," then the reading tiles and detail modal should show the lunar phase. This data is available in the reading payload as `moonPhaseName`. A one-line lunar phase indicator beneath the timestamp would make the copy honest.

**6. Give the reversed card a distinct interpretive voice.** In `TarotInterpretationPanel.tsx`, if `reversed === true`, show a distinct note near the top of the interpretation — not just "This card arrives turned" but a sentence that frames what reversal means in the context of this particular card's energy: whether the energy is being internalized, whether a blockage is present, whether the invitation is to look inward rather than outward. The data for this likely exists in the engine but is not surfaced in the panel.

**7. Consider the shape of the reading, not just its sections.** The "Sit With This" reflection question is the most human moment in the single card reading. It should feel final — a visual closing that signals the reading is complete and the user may now hold this. A thin gold line above it, slightly more space below it, perhaps a dimmer background. Small things. But reading has rhythm, and rhythm is made of small decisions made consciously.

---

I am not asking for more features. I am asking for the features that exist to actually work — to save when they say they will save, to see the sky when they claim to see it, to speak to the person when they open a conversation. The architecture is already generous. The craft is in connecting it all the way through.

The child who comes home and says "I drew a card today and it showed me something" deserves to find that card waiting for them tomorrow.
