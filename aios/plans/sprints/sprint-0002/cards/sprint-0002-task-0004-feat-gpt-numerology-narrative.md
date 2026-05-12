# Feature: GPT Numerology Narrative — A Reading, Not a Glossary

**Type:** Feature
**Originated by:** Jobs + Carmack + Miyazaki (convergence across all three)

---

## Problem / Opportunity

The current numerology page shows four beautiful static cards — Life Path, Birthday Number, Personal Year, Expression Number — each with an archetype title, essence text, keywords, and shadow toggle. The cards are well-designed but deliver dictionary definitions, not a reading. The user sees "7 — The Seeker" and a generic paragraph about depth and introspection. They receive no insight into how their specific combination of numbers works together, and no sense that the app is reading *them* rather than a book at them.

The guidelines are explicit: "The GPT narrative card loads asynchronously: show a placeholder with a skeleton/pulse animation while the call is in flight, then swap in the text when it resolves. The interpretation must feel like a real reading of the whole person, not a dictionary entry per number."

## Proposed Solution

Add a GPT-powered narrative card at the top of the number cards section (or below them, above Cosmic Connections). One GPT call receives all the user's numbers together (Life Path, Birthday, Personal Year, Expression if available, user name if available) and returns a cohesive 3-paragraph flowing reading that shows how the numbers combine and interact — what they reinforce, what they create tension between, and what the specific combination says about this person right now.

**Loading behavior:**
- Static number cards render immediately on page load — zero GPT dependency for first paint
- As soon as the page mounts, the GPT call fires
- A skeleton/pulse placeholder card appears with "Interpreting your numbers…" text and pulsing animation matching the mystic gold palette
- When the GPT response arrives, the skeleton fades out and the narrative fades in (300ms transition, no layout shift)
- If GPT fails: show a human-friendly error message ("The stars are quiet right now — try again in a moment") with a retry button

**The narrative prompt requirements:**
- Must reference the user's name if provided
- Must reference each of their actual numbers specifically
- Must identify where numbers reinforce each other and where they create productive tension
- Must speak in second person, directly to the user
- Must not be generic — "Your 7 Life Path's hunger for depth is shaped by your 22 Expression Number into something rare: a seeker who can actually build what they find"

**Service layer:**
- New function `generateNumerologyNarrative(numbers, userName, apiKey)` in `src/services/gptInterpretation.ts`
- Takes: `{ lifePath, birthdayNumber, personalYear, expressionNumber? }`, optional name, API key
- Returns: a 3-paragraph flowing reading string

## Why This Is a Feature

Adds a new category of user-visible output (GPT-powered personal reading) that didn't exist before. Requires new UI state (loading/loaded/error), new skeleton component, new service function, and prompt engineering.

## Impact / Effort

**Impact:** High — transforms numerology from a static reference into a living reading. This is the core ask of the sprint guidelines.
**Effort:** Medium — service function + prompt + skeleton component + component wiring + error state

## Dependencies

- Birth date and name already in AppContext
- OpenAI API key flow already exists (same as transit/discuss)
- Static numerology cards already exist and render first (no dependency on GPT for initial paint)

## Implementation Summary

1. `src/services/gptInterpretation.ts` — add `generateNumerologyNarrative` function
2. `src/components/results/NumerologyPage.tsx` — add loading state, skeleton card, GPT narrative card
3. Skeleton component: pulsing gold-tinted shimmer lines, same padding/border-radius as number cards, no layout shift when content arrives
4. `useEffect` fires GPT call on mount; `AbortController` cleans up on unmount to prevent state updates on unmounted component

---

## Outcome

Added `generateNumerologyNarrative` to `src/services/gptInterpretation.ts` — a single GPT call using all four numbers and the user's name, with number archetypes mapped inline and wrapped in `retryWithBackoff`. In `src/components/results/NumerologyPage.tsx`, added a narrative section between the number cards and Cosmic Connections: a `NarrativeSkeleton` shimmer component pulses with gold-tinted shimmer lines while loading, then fades to the narrative card with split-paragraph rendering; no-API-key and error/retry states are handled. Build passes with zero TypeScript errors.
