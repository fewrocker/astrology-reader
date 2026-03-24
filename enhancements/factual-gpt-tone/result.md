# Enhancement Result: Factual GPT Tone

## Summary
All GPT prompt language across the app has been changed from a warm/supportive/empowering tone to a factual, direct, honest astrology voice.

## Changes Made

### 1. Discuss Chat System Prompt (`src/services/gptInterpretation.ts`)
- **Before**: "warm, knowledgeable astrologer... Be insightful, specific... conversational"
- **After**: "direct, honest... factual and precise — state what is favorable clearly and state what is difficult without softening... If an aspect is classically malefic, say so. If a placement is strong, say so... Do not default to reassurance or encouragement"

### 2. Transit Reading System Prompt (`src/services/gptInterpretation.ts`)
- **Before**: "warm, insightful, compassionate and empowering"
- **After**: "factual, precise, and honest... name favorable configurations and their real benefits, and name difficult ones with their real challenges. Do not sugar-coat... Reference dignities, debilities, sect, and aspect doctrine"

### 3. Transit Prompt Builder (`src/engine/transits.ts`)
- **Before**: Role declaration was generic; instructions ended with "warm, insightful, personal... encouraging, empowering note"
- **After**: Role declaration sets factual/direct tone upfront; instructions say "State favorable transits clearly and state difficult transits without softening — name real challenges and what they demand. Close with the most relevant factual takeaway"

### 4. Synastry Prompt Builder (`src/engine/synastry.ts`)
- **Before**: "warm, specific... End with encouraging guidance"
- **After**: "direct, specific... State what works well and what will be genuinely difficult — do not minimize tensions or over-romanticize strengths. Close with the most important factual dynamic to be aware of"

### 5. Couple Transit Prompt Builder (`src/engine/synastry.ts`)
- **Before**: "End with practical advice for the couple"
- **After**: "State favorable transits plainly and state difficult ones without softening. Close with the most important factual takeaway for the relationship"

## Verification
- TypeScript compilation: zero errors
- Production build: success

## Regression
No functional changes — only system prompt text was modified. All existing features (discuss modal, transit readings, synastry readings, couple transits) work identically; only the GPT response tone changes.
