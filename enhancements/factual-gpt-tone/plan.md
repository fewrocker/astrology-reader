# Enhancement: Factual GPT Tone

## What the user wants
Make all GPT discussions factual, direct, and honest instead of supportive/hyped. Serious astrology users want to understand what the chart actually shows — both good and bad — without sugar-coating. If something is challenging, say it plainly. If something is favorable, say it clearly.

## What exists today
Five GPT prompt locations set a "warm, compassionate, empowering" tone:

1. **`src/services/gptInterpretation.ts` L44** — Transit reading system prompt: "warm, insightful, compassionate, empowering"
2. **`src/services/gptInterpretation.ts` L98** — Discuss chat system prompt: "warm, knowledgeable... conversational"
3. **`src/engine/transits.ts` L360-363** — Transit prompt builder instructions: "warm, insightful, personal... encouraging, empowering note"
4. **`src/engine/synastry.ts` L451+** — Synastry prompt: "Be warm... End with encouraging guidance"
5. **`src/engine/synastry.ts` L547+** — Couple transit prompt: similar warm/encouraging tone

## What needs to change
Replace all prompt tone directives with a factual, direct astrology voice that:
- States what the chart shows as-is — favorable or difficult
- Names challenging aspects and their real implications without softening
- Names favorable aspects and their real benefits without over-hyping
- References traditional astrological meanings (dignities, debilities, malefics, benefics)
- Treats the reader as someone who takes astrology seriously
- Avoids cheerleading, toxic positivity, and generic encouragement
- Still uses accessible language (not cold or clinical, just honest)

## Checklist
- [x] Update discuss chat system prompt (`gptInterpretation.ts`)
- [x] Update transit reading system prompt (`gptInterpretation.ts`)
- [x] Update transit prompt builder instructions (`transits.ts`)
- [x] Update synastry prompt builder instructions (`synastry.ts`)
- [x] Update couple transit prompt builder instructions (`synastry.ts`)
- [x] Build and verify zero errors
- [x] Document result
