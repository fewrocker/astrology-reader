# Proposal: Numerology Integration

**Type:** Feature
**Originated by:** Jobs + Miyazaki + Carmack + Taleb
**Impact:** High
**Effort:** Medium

## Guidance
> Introduce features which make the astrology suite more complete with different cross interpretations of things such as dreams, numerology, astrology, as one encompassing suite that works separately but also together

## Problem or Opportunity

The app is an excellent astrology suite, but it currently stands alone. Numerology is astrology's sister system — both map the same invisible terrain using different languages. When a user's Life Path number resonates with their Moon sign or Saturn placement, something clicks: the product stops being "a chart reader" and becomes a cosmological identity portrait. Without this cross-system resonance, the "encompassing suite" vision is incomplete.

Currently: no numerology whatsoever. Users who are interested in both systems must go elsewhere and mentally bridge the two — a gap the app should close.

## Proposed Solution

Add a **Numerology Profile** section to the natal chart results page that calculates the user's core numerology numbers from their birth date (and optionally their name) and then provides **cross-interpreted** insights linking numerology numbers to natal chart placements.

**Core numbers to calculate:**
- **Life Path Number** — sum of birth date digits reduced to 1-9 (or 11, 22, 33 master numbers)
- **Personal Year Number** — Life Path calculation for current year, showing where they are in their 9-year cycle
- **Birth Day Number** — day of birth reduced
- **Expression Number** (optional, name-based) — if user provides full name

**Cross-interpretation layer:**
- Link Life Path to chart themes: "Your Life Path 7 and your Mercury in Scorpio 12th house both speak to a mind that seeks hidden truths."
- Surface Personal Year in daily snapshot and transit readings: "You're in a Personal Year 4 — a year of foundation-building — which echoes Saturn's transit through your 10th house."
- Integrate numerology context into GPT prompts where relevant

**UI:** A new collapsible section in the natal chart reading ("Numerology Profile") styled to match the mystic theme. Numbers displayed with elegant typography and brief interpretations. Optional name input at the top of this section — clearly marked optional, stored locally only, not required for Life Path.

## Why Feature, Not Issue Fix or Code Enhancement

This adds significant new user-visible capability and a new domain of knowledge (numerology calculation engine + interpretation database). It is not fixing something broken.

## Impact Assessment
- **Impact:** High — directly implements the "encompassing suite" vision from guidelines; high emotional resonance for users who know both systems
- **Effort:** Medium — requires: numerology calculation functions, interpretation database entries for numbers 1-9 (+11/22/33), cross-interpretation text, UI section, optional name input in form or results, integration into GPT prompts

## Dependencies
- Existing natal chart engine (for planet placements to cross-reference)
- Birth date already available in app state
- GPT prompt system (for cross-interpretation integration)

## Implementation Summary

**New files:**
- `src/engine/numerology.ts` — calculation functions for all core numbers
- `src/data/interpretations/numerology.ts` — interpretation text for each number (1-9, 11, 22, 33) and cross-interpretation templates

**Modified files:**
- `src/components/reading/ReadingDisplay.tsx` — add NumerologySection component
- `src/components/reading/DailySnapshotCard.tsx` — surface Personal Year number
- `src/services/gptInterpretation.ts` — add numerology context to relevant prompts
- `src/context/appState.ts` — add optional `name` field to BirthData, add numerology results to state
- `src/components/form/StepDate.tsx` or a new optional step — optional name input
