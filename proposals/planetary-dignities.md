# Proposal: Planetary Dignities & Strength Analysis

## Problem / Opportunity

Astrology enthusiasts know that a planet's power varies depending on where it falls. Mars in Aries (domicile) is fundamentally different from Mars in Libra (detriment). Currently, the app shows *what sign* each planet is in but never tells the user *how strong or comfortable* that planet is there. This is one of the most foundational layers of chart interpretation and its absence makes readings feel surface-level to anyone beyond a beginner.

Adding essential dignities (domicile, exaltation, detriment, fall) and an overall planetary strength indicator would immediately deepen every reading without requiring any new astronomical calculations — it's purely interpretive logic on top of existing data.

## Proposed Solution

1. **Dignities data layer**: A mapping of each planet to its domicile, exaltation, detriment, and fall signs (classical rulerships + modern where applicable).
2. **Strength badge on Planet-in-Sign cards**: Each planet card in the reading gets a visual badge — e.g., "Domicile ✦" (gold), "Exalted ↑" (purple), "Detriment ↓" (muted red), "Fall ⬇" (grey) — so users immediately see which planets are empowered or struggling.
3. **Planetary Strength Overview section**: A new section in the reading (after Element & Modality Balance) showing a visual heatmap or bar chart of all planets ranked by dignity strength, with a brief narrative about the user's strongest and weakest placements.
4. **Dignity-aware interpretations**: Augment existing planet-in-sign text with a sentence or two about what the dignity means ("Your Mars is in its home sign — your drive and assertiveness flow naturally").
5. **Mutual receptions detection**: When two planets are in each other's domicile signs (e.g., Moon in Aries + Mars in Cancer), highlight this as a special configuration with its own interpretation.

## Impact & Effort

- **Impact**: HIGH — This is astrology 101 for intermediate+ users. Every serious astrology app includes dignities. It makes the reading feel dramatically more sophisticated.
- **Effort**: LOW-MEDIUM — No new calculations needed. Purely a data mapping + UI additions on existing planet-in-sign cards.
- **Dependencies**: Existing planet-in-sign data, ReadingDisplay component.

## Implementation Summary

- New file: `src/data/interpretations/dignities.ts` — rulership mapping + dignity interpretation snippets
- Modify: `src/components/reading/ReadingDisplay.tsx` — add dignity badges to planet cards, add Strength Overview section
- Modify: `src/data/interpretations/planetInSign.ts` — optionally embed dignity-aware flavor text
- New util function to detect mutual receptions from chart data
