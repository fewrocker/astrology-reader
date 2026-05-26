# Issue Fix: Natal Dominant Modality Silently Dropped After Computation

**Type:** Issue Fix
**Originated by:** Carmack, Taleb

---

## Problem

`buildTarotAstroContext` in `src/engine/tarot.ts` computes `natalDominantModality` (Cardinal, Fixed, or Mutable) via `computeDominantModality` at line 483 and stores the result on `TarotAstroContext` (declared at line 24). The field is returned in the context object at line 543 and is never used again.

None of the three synthesis payload types include the field:

- `TarotSingleSynthesisPayload` (lines 231–252 of `server/services/gptTarot.ts`) — absent
- `TarotThreeSynthesisPayload` (lines 254–276) — absent
- `TarotCelticSynthesisPayload` (lines 278–302) — absent

None of the three GPT prompts reference it. The "This Person's Sky Right Now" block in each handler (`handleTarotSingleSynthesis` line 588, `handleTarotThreeSynthesis` line 757, `handleTarotCelticSynthesis` line 937) sends natal Sun, Moon, Ascendant, four house placements, and numerology — but no modality. The computed value is silently discarded at the payload construction site in the client before it ever reaches the server.

The same gap was independently flagged by both Carmack ("The gap is purely in payload construction and prompt text. That's a low-cost addition with genuine interpretive yield.") and Taleb ("These two fields — `natalDominantElement` and `natalDominantModality` — are computed in `buildTarotAstroContext` and stored in `TarotAstroContext`. They are then... dropped. Computed, stored, never sent.").

---

## Expected Behavior

`natalDominantModality` should be present in all three synthesis payload types and passed through to all three GPT prompt blocks.

In each handler's "This Person's Sky Right Now" section, a line such as `Dominant modality: ${natalDominantModality}` should follow the existing natal context. When the value is null (e.g., no clear modal dominance), the line should be omitted rather than sent as `null`.

With the field in the prompt, the synthesis can distinguish how a card lands for this person: a Fixed-dominant chart (Taurus, Leo, Scorpio, Aquarius emphasis) brings a specific relationship to cards like The Tower or the Five of Pentacles — one of structural resistance and delayed release — that is qualitatively different from a Cardinal-dominant chart (Aries, Cancer, Libra, Capricorn emphasis), where the same card reads more as an initiating disruption than a collapse of something long held. A Mutable-dominant person (Gemini, Virgo, Sagittarius, Pisces) experiences the Hanged Man as familiar suspension rather than enforced pause. These are not generic astrological observations — they are sentence-level distinctions the model cannot make without the data.

The fix touches three payload interfaces and three prompt strings. No engine changes are required; the computation already exists and produces the correct value.
