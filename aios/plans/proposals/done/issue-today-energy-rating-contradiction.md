# issue-today-energy-rating-contradiction

**Type:** Issue Fix
**Originated by:** Jobs, Carmack

## Problem

`TodayPage.tsx` renders two independent cards that both answer the question "what is today like energetically?" — and they can contradict each other on screen at the same time.

The first card is the advance category banner (lines 118–163). It appears when `advanceScore` is non-null and `advanceScore.category !== 'neutral'`, and it is produced by `computeCombinedWeight` in `AdvanceTab.tsx`: a planet-weighted, orb-adjusted, applying-only scorer that treats Saturn and Pluto as high-weight slow planets and fires on natal angle contacts. The banner carries a category label ("Challenging Period", "Favorable Window", "Power Configuration"), a reason string naming the specific planetary configuration, and optional guidance text.

The second card is the Transit Energy dot bar (lines 251–267). It is always shown when `chartData && energy` is truthy, regardless of whether the advance banner is also showing. It is produced by `computeEnergyRating` in `src/engine/transits.ts` (lines 505–523): a simple +1/-1 vote count over the top 8 classical transit aspects, treating each aspect as equal weight regardless of planet, orb, or applying/separating status.

The two models can disagree on the same sky. A Saturn opposition at 0.5° orb applying to a natal angle scores as a hard `challenging` marker in the advance engine. Under `computeEnergyRating`, that same Saturn opposition is one −1 vote. If Venus, Sun, and Mercury are simultaneously making harmonious aspects, the vote count can net out to 0 ("Mixed") or positive ("Favorable") — directly contradicting the advance banner's "Challenging Period" label that is already visible on screen two sections above.

The contradiction is not an edge case. It occurs whenever a tight slow-planet transit is active alongside several harmonious inner-planet aspects, which is a common configuration. The user sees two authoritative-looking signals with opposing colors and labels and has no way to reconcile them. Carmack's audit (sprint-0022 voice, section 5) names this explicitly: "Two cards answer the same question with contradictory answers on the same screen. The advance category is the more accurate signal."

The advance category is authoritative because it was purpose-built to replace `computeEnergyRating` as the energy signal. `computeEnergyRating` predates the advance engine and uses the inferior pre-combination-weight formula. Jobs's voice (sprint-0022, Issue Fixes section) frames it: "Two answers to one question is worse than one good answer."

## Expected Behavior

The Transit Energy dot card should be suppressed when an advance score for today is available and non-neutral. Specifically:

- When `advanceScore` is non-null **and** `advanceScore.category !== 'neutral'`: do not render the Transit Energy card. The advance banner already carries the authoritative energy signal for that day.
- When `advanceScore` is null **or** `advanceScore.category === 'neutral'`: render the Transit Energy card as the fallback signal. This preserves the dots for users whose advance cache is cold and for days that score as neutral in the advance engine.

The condition mirrors the existing banner guard on line 118. The Transit Energy card render condition at line 252 changes from:

```tsx
{chartData && energy && (
```

to:

```tsx
{chartData && energy && !(advanceScore && advanceScore.category !== 'neutral') && (
```

No changes to `computeEnergyRating`, `AdvanceTab`, or the advance banner are required. The energy rating remains computed (line 64) so it is available as a fallback — only its render is suppressed when the advance signal is present.
