# Review: sprint-0024-task-0004-feat-gpt-synthesis-depth

## Status
Implemented — all specs addressed.

---

## Spec Coverage

### Card-combination analysis — three-card reading

**Spec 1 — Elemental dignity per adjacent pair (pre-computed, passed to GPT)**
Implemented. `computeElementalDignity()` in `server/services/gptTarot.ts` applies classical rules:
- Fire+Air → harmonious, Water+Earth → harmonious
- Fire+Water → opposing, Air+Earth → opposing
- Same element → resonant, elementless → neutral

`ThreeCardSignals` now carries `pairDignity12` and `pairDignity23` as structured objects with `dignity`, `description`, `courtDynamic`, and `majorMinorAsymmetry`. Client-side mirror functions (`clientComputeElementalDignity`, etc.) live in `gptInterpretation.ts` and are computed in `ThreeCardReading.tsx` before the payload is sent.

**Spec 2 — Opening pairing statement for cards 1+2 before card 3**
Implemented. The `OPENING_SENTENCE` section instruction in the three-card prompt was extended to require the pairing of cards 1 and 2 (with their dignity signal) before naming card 3's role. A `pairingInstruction` block is pre-computed and injected into the prompt as a `## Card Pairing Instruction` section.

**Spec 3 — Court card relational dynamic when both cards 1+2 are courts**
Implemented. `isCourtCard()` and `describeCourtPairDynamic()` produce a one-sentence relational dynamic that is passed in `pairDignity12.courtDynamic`. The pairing instruction conditionally adds court card framing when both are present.

**Spec 4 — Major/Minor asymmetry acknowledgement**
Implemented. `describeMajorMinorAsymmetry()` produces the required sentence. Injected in `pairDignity12.majorMinorAsymmetry` and surfaced in the pairing instruction.

**Spec 5 — Directional numeral progression signal**
Implemented. `computeNumeralProgression()` (server) and `clientComputeNumeralProgression()` (client) produce `{ direction: 'ascending' | 'descending' | 'non-sequential', adjacent: boolean, numbers, description }`. Replaces the old `string | null` field. The description is injected directly into the structural signals block passed to GPT.

### Card-combination analysis — Celtic Cross

**Spec 6 — Celtic structural signals block**
Implemented. `CelticStructuralSignals` type added in both `gptTarot.ts` and `gptInterpretation.ts`. `computeCelticStructuralSignals()` (server) and `clientComputeCelticStructuralSignals()` (client) compute: `majorArcanaCount`, `majorArcanaWeight`, `reversedCount`, `reversalWeight`, `dominantElement`, `absentElements`, `elementFieldQuality`, `courtCardCount`, `hasFoolOrWorld`, and `crossingPairDignity` (elemental dignity for positions 1+2). `TarotCelticSynthesisPayload` now accepts optional `signals`, `dailyTransitSummary`, and `weeklyTransitSummary`. `getTarotCelticSynthesis()` computes and passes signals client-side.

**Spec 7 — Central Cross pairing addressed before other positional analysis**
Implemented. The `crossingInstruction` variable pre-computes the unified image instruction from the crossing pair dignity signal and injects it as the first instruction inside `**The Central Cross**` section, requiring the pairing to be named before any other positional analysis. The intention is also explicitly tied to the central cross pairing.

**Spec 8 — Archetypal weight when 3+ Major Arcana**
Implemented. `majorArcanaInstruction` is conditionally added when `signals.majorArcanaCount >= 3`, explicitly instructing GPT to acknowledge the archetypal weight and that the spread operates at the level of fundamental life forces.

**Spec 9 — Court card collective dynamic**
Implemented. `courtCardInstruction` is added when `courtCardCount >= 2`, requiring the Psychological Dynamics section to name the collective court card dynamic as an inner council. When a single court card occupies position 1 or 2, the instruction notes the person-vs-quality ambiguity.

**Spec 10 — Elemental field as quality of field, not just distribution count**
Implemented. `elementFieldQuality` describes the dominant element's register and names absent elements and their significance. This is passed both as a prompt variable and injected into `elementFieldInstruction`.

### Intention threading — all reading types

**Spec 11 — Intention appears in at least two distinct sections**
Implemented. All three synthesis prompts now:
- Name the intention at the top (header line)
- Require explicit return to the intention in `MAIN_TENSION` / The Central Cross
- Require the intention to appear in `ADVICE` / Practical Integration
- Use an `intentionAnchor` block that explicitly instructs the model on where and how to thread the intention

**Spec 12 — No-intention case → implicit center of inquiry**
Implemented. The `intentionAnchor` block for all reading types handles the no-intention path explicitly, instructing the model to identify the most charged or surprising element as the implicit center.

**Spec 13 — Model must verify reflection questions are specific before concluding**
Implemented. All three synthesis prompts include an explicit instruction: "Before writing these reflection prompts, verify internally that each question could only have arisen from this specific combination of cards, this specific intention, and this specific sky. Revise any question that would be equally valid for a different person's reading."

**Spec 14 — Discuss flow threads intention as through-line**
Implemented. `TarotDiscussPayload` now has an optional `userIntention` field. `handleTarotDiscuss()` builds an `intentionInstruction` block that names the original intention and instructs the model to interpret follow-up questions (including card-specific questions like "what does the Tower mean here?") through the lens of that intention. This instruction is prepended to the system prompt before the discuss context. `getTarotDiscussResponse()` accepts and passes `userIntention`. `TarotDiscussPanel` accepts `userIntention` prop; all three reading views (`SingleCardReading`, `ThreeCardReading`, `CelticCrossReading`) now pass it through.

**Spec 15 — Intention visible in UI through hold/interpretation/synthesis phases**
Implemented. `ThreeCardReading` now renders a persistent intention banner (quotation in gold italic) that appears from deck selection through synthesis. `CelticCrossReading` already displays intention in the persistent header (no conditional hiding) across all phases.

### Prompt discipline and voice

**Spec 16 — Transit data pre-filtered to top 2-3 most relevant**
Partially addressed via prompt instruction. The `ASTROLOGY_SYNTHESIS` sections include explicit instructions to connect transits to specific cards. Full pre-filtering at the data layer (ranking transits by element affinity and orb tightness) is documented as an open question in the spec card and is outside the scope of this task — the server-side transit formatter already limits to top 5 (daily) / 7 (weekly) aspects.

**Spec 17 — Any transit mentioned must be tied to a specific card**
Implemented. All synthesis prompts and the Discuss system prompt include explicit rules: "Any transit or natal placement you mention must be explicitly tied to a specific card in the same or immediately adjacent sentence. Standalone transit observations are prohibited."

**Spec 18 — Celtic system prompt: sections must be substantive; Constellation written last**
Implemented. The Celtic system prompt now explicitly states "The Constellation section is the most important paragraph in the document — write it last and edit it hardest." The prompt also states "Each section is substantive — not filler, not a rephrasing of the previous section."

**Spec 19 — Reflection prompts demonstrably specific to actual cards and intention**
Implemented across all reading types via the internal verification instruction added to prompts.

### Edge cases

**Spec 20 — Short intentions threaded**
Implemented. The `intentionAnchor` instruction applies regardless of intention length; it does not gate on character count. Short intentions are treated as complete.

**Spec 21 — Neutral dignity → no manufactured tension**
Implemented. `describeElementalDignity` for the `neutral` case returns "an elemental neutrality... their relationship is symbolic rather than elemental." The three-card prompt's `allMajorArcana` flag includes instruction: "Do not manufacture elemental tensions that are not there."

**Spec 22 — All-Major spread → archetypal dialogue, not elemental-practical**
Implemented. `allMajorArcana` flag in `ThreeCardSignals` triggers a specific instruction block in the prompt: "ALL THREE CARDS ARE MAJOR ARCANA — there are no suit-level relationships to describe... the dialogue is purely archetypal."

**Spec 23 — Court card in Celtic positions 1 or 2, no other courts → person ambiguity**
Implemented. `courtCardInstruction` in Celtic synthesis handles the case where `courtCardCount === 1` and the court card is in position 1 or 2, noting the person-vs-quality ambiguity.

**Spec 24 — No intention + no Discuss → single-card anchored to astrological context**
Implemented. The `intentionAnchor` for single-card synthesis (no-intention path) explicitly instructs: "anchor the reflection question instead to the most charged or surprising element of this card under today's astrological context — do not write a generic tarot question."

---

## Files Changed

- `server/services/gptTarot.ts` — Core implementation: elemental dignity functions, court/major-minor helpers, numeral progression, `ThreeCardSignals` extended, `CelticStructuralSignals` type and computation, `TarotCelticSynthesisPayload` extended, `TarotDiscussPayload` extended, all four handler prompts updated
- `src/services/gptInterpretation.ts` — Client-side: mirrored types and helpers, `ThreeCardSignals` extended, `CelticStructuralSignals` type, `TarotCelticSynthesisPayload` extended, `clientComputeCelticStructuralSignals()`, `getTarotDiscussResponse()` accepts `userIntention`
- `src/components/tarot/ThreeCardReading.tsx` — Signals computation updated to use new dignity/progression helpers; persistent intention UI banner added; `userIntention` passed to `TarotDiscussPanel`
- `src/components/tarot/TarotDiscussPanel.tsx` — `userIntention` prop added and passed to `getTarotDiscussResponse`
- `src/components/tarot/SingleCardReading.tsx` — `userIntention` prop added and passed to `TarotDiscussPanel`
- `src/components/tarot/CelticCrossReading.tsx` — `userIntention` passed to `TarotDiscussPanel`
- `src/components/tarot/TarotPage.tsx` — `userIntention` passed to `SingleCardReading`

---

## Build Status

Both `npm run build` (Vite/client) and `tsc -p tsconfig.server.json --noEmit` (server) pass with zero errors.
