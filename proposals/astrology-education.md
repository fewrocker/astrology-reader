# Proposal: Astrology Education Tooltips & Glossary

## Problem / Opportunity

The app assumes users understand astrological terminology — "trine," "opposition," "stellium," "angular house," "orb," "applying aspect." Beginners feel lost. Even intermediate enthusiasts sometimes need a refresher on what a quincunx means or why the 8th house matters.

Meanwhile, expert users don't want to be slowed down by constant explanations. The solution is contextual, opt-in education that enriches without interrupting.

## Proposed Solution

1. **Contextual tooltips**: Key astrological terms throughout the reading are subtly underlined (dotted). Hovering/tapping reveals a concise definition. Examples:
   - "Trine" → "A harmonious 120° angle suggesting natural flow and ease between two energies"
   - "8th House" → "The house of transformation, shared resources, intimacy, and psychological depth"
   - "Retrograde" → "A planet appearing to move backward, turning its energy inward for review"
2. **"Learn more" expandables**: Each interpretation section gets an optional "What does this mean?" toggle that shows a brief educational context about that astrological concept.
3. **Glossary page**: An accessible reference page with all astrological terms used in the app, organized alphabetically, searchable.
4. **Beginner/Expert mode toggle**: A simple toggle in settings that controls tooltip density — beginners see all tooltips, expert mode hides them for a clean reading experience.
5. **"Why this matters" context**: For each section (aspects, houses, elements), a one-liner framing why this part of the chart is important (e.g., "Your aspects reveal the dynamic conversations happening between different parts of your psyche").

## Impact & Effort

- **Impact**: MEDIUM-HIGH — Dramatically improves accessibility for beginners while making the app educational. Users learn astrology *through* their own chart, which is the most engaging way to learn.
- **Effort**: MEDIUM — Content writing for ~50-80 tooltip definitions + UI component for tooltip system + glossary page.
- **Dependencies**: None — purely additive to existing UI.

## Implementation Summary

- New file: `src/data/glossary.ts` — comprehensive astrological glossary (term → definition + optional long description)
- New component: `src/components/ui/AstroTooltip.tsx` — reusable tooltip component that looks up terms from glossary
- New component: `src/components/reading/GlossaryPage.tsx` — searchable glossary reference page
- Modify: `src/components/reading/ReadingDisplay.tsx` — wrap key terms in AstroTooltip components
- Modify: `src/context/appState.ts` — add beginner/expert mode preference (persisted to localStorage)
