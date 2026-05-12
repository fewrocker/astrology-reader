# Feature: Advanced Numerology Layers — Soul Urge, Karmic Debt, Personal Month, Pinnacles & Challenges

**Type:** Feature
**Originated by:** Carmack + Taleb + guidelines (Section 3: "Go deeper on numerology itself")

---

## Problem / Opportunity

The current numerology engine computes four numbers: Life Path, Birthday, Personal Year, Expression. These are the basics. A genuinely deep numerology reading — the kind that makes someone say "how did it know that?" — requires the full picture:

- **Soul Urge Number** (aka Heart's Desire): vowel sum of birth name. Reveals inner motivation, what the soul truly wants beneath the outer Expression.
- **Personal Month**: Personal Year + current calendar month, reduced. Shows what this specific month's energy is calling for.
- **Karmic Debt Numbers**: if the intermediate sum before reduction was 13, 14, 16, or 19, this is a karmic debt. Reveals deep soul-level work being carried from past lives. Powerful, specific, and common enough to affect many users.
- **Pinnacle Numbers**: four numerological cycles that govern life stages (based on birth date arithmetic). Shows the major overarching energies of each life chapter.
- **Challenge Numbers**: four challenge numbers corresponding to each pinnacle. The "obstacles and gifts" that the soul chose to work with.

The guidelines specifically call this out: "Beyond the basics (Life Path, Expression, Soul Urge): explore Personal Year, Personal Month, Pinnacles, Challenges, Karmic Debt numbers, Hidden Passion, Planes of Expression."

## Proposed Solution

Expand the engine, interpretation data, and UI to include:

**Priority 1 (this sprint):**
- Soul Urge Number (requires name — same flow as Expression)
- Personal Month Number (auto-computed, no extra input needed)
- Karmic Debt detection (requires refactoring `reduceToSingleDigit` to preserve intermediate sums)

**Priority 2 (follow-up sprint):**
- Pinnacle Numbers (4 numbers with life-stage framing)
- Challenge Numbers (4 numbers)

**Karmic Debt handling:**
The current reduction function discards intermediate sums. Refactor to track the pre-reduction sum at each Life Path, Expression, and Soul Urge calculation. If that intermediate sum is 13, 14, 16, or 19 — it's a Karmic Debt. Show a distinct card section or badge on the parent number card: "⚖ Karmic Debt 13 — The Debt of Laziness" with its own interpretation.

**Soul Urge:**
- Same Pythagorean table, vowels only (A, E, I, O, U; treat Y as consonant for simplicity — document this in the code)
- Requires the user's birth name (already collected for Expression Number)
- If name is present, auto-compute and show alongside Expression Number

**Personal Month:**
- Auto-computed: `reduce(Personal Year + current month)`
- Trivial to add — no extra input required
- Show as a small contextual card below Personal Year: "Your Personal Month (May 2026)"

**Interpretation data expansion:**
- Soul Urge: 9 entries + master numbers 11/22/33 (similar depth to Life Path interpretations)
- Karmic Debt: 4 entries (13, 14, 16, 19) — each with weight and gravity appropriate to the subject
- Personal Month: 9 entries (brief — this is a monthly energy note, not a life reading)
- Pinnacles/Challenges (if scoped): 9 entries each × 4 cycles = 36+ entries per category

## Why This Is a Feature

New calculation capabilities, new interpretation data, and new UI sections. This adds three entirely new numbers to the product that didn't exist before.

## Impact / Effort

**Impact:** High — Soul Urge + Karmic Debt are the most emotionally resonant numbers after Life Path. Users who get "Karmic Debt 16" for the first time often feel deeply seen.
**Effort:** Medium-High — calculation refactor (Karmic Debt intermediate sum), significant interpretation text writing, UI cards for each new number. Scoped here to Soul Urge + Karmic Debt + Personal Month.

## Dependencies

- Name already in AppContext (for Soul Urge)
- Refactor of `reduceToSingleDigit` needed to preserve intermediate sums for Karmic Debt detection
- `numerologyInterpretations.ts` must be expanded with new categories

## Implementation Summary

1. `src/engine/numerology.ts`:
   - Refactor `reduceToSingleDigit` to also return the pre-reduction intermediate (or create `reduceWithIntermediate`)
   - Add `calculateSoulUrge(name: string): number`
   - Add `detectKarmicDebt(intermediate: number): number | null` (returns 13/14/16/19 or null)
   - Add `calculatePersonalMonth(personalYear: number, currentMonth?: number): number`
   - Export `NumerologyReading` expansion with `soulUrge`, `personalMonth`, `karmicDebt`

2. `src/data/numerologyInterpretations.ts`:
   - Add `soulUrge` category (9 + master numbers)
   - Add `karmicDebt` category (4 entries: 13, 14, 16, 19)
   - Add `personalMonth` category (9 entries, brief)

3. `src/components/results/NumerologyPage.tsx`:
   - Add Soul Urge card (conditional on name being provided, shown near Expression Number)
   - Add Personal Month card (auto, shown near Personal Year)
   - Add Karmic Debt badge or card where applicable

---

## Outcome

Implemented Soul Urge, Karmic Debt detection, and Personal Month across all three layers. The engine gained `reduceWithIntermediate`, `calculateSoulUrge` (vowels only, Y as consonant), `detectKarmicDebt` (returns 13/14/16/19 or null from the Life Path intermediate sum), and `calculatePersonalMonth`; the `NumerologyReading` interface was extended accordingly. Interpretation data was expanded with 12 Soul Urge entries (1–9 + master numbers), 4 Karmic Debt entries (13/14/16/19) with appropriate gravity, and 9 Personal Month entries (brief essence-only notes). The UI renders a distinct amber-tinted `KarmicDebtCard` (⚖ glyph) below Life Path when applicable, a Personal Month card with month/year badge below Personal Year, and Soul Urge alongside Expression Number — all conditionally and with the existing design language. Build passes with zero TypeScript errors.
