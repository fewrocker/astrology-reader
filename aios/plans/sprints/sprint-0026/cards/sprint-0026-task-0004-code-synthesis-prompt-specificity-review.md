# Review: sprint-0026-task-0004-code-synthesis-prompt-specificity

**Status:** completed
**Reviewer:** task agent

---

## What was implemented

### 1. `natalDominantModality` wired through all three synthesis flows

The field was already computed in `buildTarotAstroContext` (line 483 of `src/engine/tarot.ts`) and present on `TarotAstroContext`, but had no path into any synthesis payload type or prompt.

**Types updated:**
- `TarotSingleSynthesisPayload` — added `natalDominantModality: 'Cardinal' | 'Fixed' | 'Mutable' | null`
- `TarotThreeSynthesisPayload` — added `natalDominantModality: 'Cardinal' | 'Fixed' | 'Mutable' | null`
- `TarotCelticSynthesisPayload` — added `natalDominantModality: 'Cardinal' | 'Fixed' | 'Mutable' | null`

Both the client types (`src/services/gptInterpretation.ts`) and the server types (`server/services/gptTarot.ts`) were updated in lockstep.

**Client payload builders updated:**
- `TarotPage.tsx` (single card): added `natalDominantModality: engineCtx.natalDominantModality`
- `ThreeCardReading.tsx`: added `natalDominantModality: astroContext.natalDominantModality`
- `CelticCrossReading.tsx` (`buildCelticSynthesisPayload`): added `natalDominantModality: astroContext.natalDominantModality`

**Server-side computation added:**
A `SERVER_SIGN_MODALITIES` lookup table and `computeServerDominantModality` function were added to `server/services/gptTarot.ts` — mirroring the logic in `src/engine/tarot.ts` exactly (same weighting: Sun/Moon at 2, ASC at 2, all others at 1). All three server handlers now re-derive `natalDominantModality` from the server-computed natal chart when `userId` is present, overriding the client-supplied value.

**Prompt inclusion:**
Each handler now includes a `modalityNote` line in the natal context block (labeled "Dominant modality:") with a plain-language description of how this modality type meets force:
- Cardinal: "this person initiates; they meet force by moving toward it"
- Fixed: "this person holds; they meet force by standing their ground or enduring"
- Mutable: "this person adapts; they meet force by reframing or moving with it"

### 2. Single handler — paragraph 2 replaced with quality constraint

The old instruction ("Mention at least one natal placement...") was a quantity requirement that the model could satisfy by name-dropping a placement and appending a generic resonance clause. The new instruction establishes a structural test:

> "The test for this paragraph: if a different card had been drawn, would this paragraph need to be rewritten? If not, it is not doing the work."

The instruction now explicitly requires the model to name what this card's element, archetype, and orientation *does* when it meets this person's natal configuration — and directs it to use the dominant modality when the card deals with change, disruption, resistance, or movement. Reversed card handling is made explicit: the paragraph must name what the card's central principle feels like when blocked, internalized, or beneath the surface in this natal context.

### 3. Three handler — opening sentence instruction upgraded from labeling to generating

The old instruction said "incorporate the pairing of cards 1 and 2" — a standard that a sentence like "The elementally opposing Tower (Fire) and Wheel of Fortune (Fire) set the stage for the Hermit" could pass without showing anything about the pairing.

The new `pairingInstruction` names the test explicitly:

> "A sentence that lists the two cards with their elements and calls them 'opposing' or 'harmonious' has labeled the pairing, not shown it. The test: does the opening sentence convey something that would be different if card 2 had been a different card?"

The `OPENING_SENTENCE` instruction was also updated to require the pairing to be "active in the sentence, not labeled."

### 4. Three and Celtic handlers — intention threading upgraded to operative requirement

The old instructions said the intention "must appear by name in at least two distinct sections" — a counting requirement that surface references satisfied.

The new `intentionAnchor` in both handlers establishes the operative test:

> "The test: if the intention were replaced with a different question, would the sentence need to be rewritten? If not, it is not threaded — it is footnoted."

The three handler's TIMING section now closes on the person's specific question. The Celtic handler's Practical Integration was updated to require invitations that connect to the person's specific question rather than to "the reading in general."

### 5. Celtic handler — Constellation section given structural prohibition

The old instruction said "it must say the one thing the whole spread is saying" — an aspiration that summary could still satisfy.

The new instruction includes an explicit structural prohibition:

> "STRUCTURAL PROHIBITION: Nothing that has already been named in any other section — in any form — belongs here. If you find yourself completing a thought begun in The Central Cross, or restating a dynamic named in Psychological Dynamics, or summarizing what the other sections said: stop. That is summary, not Constellation."

The test is explicit: a Constellation paragraph that could be removed and placed at the end of Psychological Dynamics without loss is summary. The paragraph that makes the reader re-read The Roots and the Horizon because they now see what those cards were pointing at — that has succeeded.

The system prompt for the Celtic handler was also updated to reinforce: "It must name what no other section has named — not a summary, not a rephrasing, not an executive conclusion."

### 6. Celtic Astrology Resonance — modality instruction added

The section instruction now explicitly directs the model to use dominant modality when any card deals with change, disruption, resistance, or movement:

> "A Fixed-dominant person receives a Tower differently than a Cardinal or Mutable person does — the modality makes the card personal, not just archetypal."

---

## Files changed

- `server/services/gptTarot.ts` — all three payload types, server modality computation function, all three handlers (variable initialization, server re-derivation, prompt text)
- `src/services/gptInterpretation.ts` — all three payload types
- `src/components/tarot/TarotPage.tsx` — single card payload builder
- `src/components/tarot/ThreeCardReading.tsx` — three card payload builder
- `src/components/tarot/CelticCrossReading.tsx` — celtic payload builder

---

## Build verification

- `npm run build`: clean (1924 modules transformed, no errors)
- `tsc --project tsconfig.server.json --noEmit`: clean (no output)

---

## Quality notes

All changes are prompt-layer modifications or type additions. No engine logic was changed. The changes are backward-compatible: `natalDominantModality` is nullable and all conditional template expressions handle null gracefully. The `modalityNote` lines render as empty strings when modality is null, producing no output in the prompt.

The quality constraints added are structural rather than stylistic: they give the model a self-test it can apply before writing, not just an aspiration to write toward.
