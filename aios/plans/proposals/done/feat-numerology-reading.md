# Feature: Numerology Reading

**Type:** Feature
**Originated by:** Jobs + Miyazaki + Taleb (for name collection design considerations)

---

## Problem / Opportunity

The product's guidelines explicitly call for cross-interpretations of dreams, numerology, and astrology "as one encompassing suite that works separately but also together." Numerology is the most natural and accessible complement to astrology — both derive meaning from a birth date, and the overlaps (Life Path 7 ↔ Neptune/Moon/12th house; Life Path 1 ↔ Sun/Aries/Mars) create genuinely profound moments of synthesis.

Currently, the birth date is already collected but only used for astronomical calculations. The numerological data is sitting untapped.

## What It Is

A Numerology Reading feature accessible from the landing page. It calculates:

- **Life Path Number** — the most important number; sum of all birth date digits, reduced to a single digit (except master numbers 11, 22, 33). Represents the soul's journey and life theme.
- **Birthday Number** — the day of birth reduced. Represents a secondary talent or gift.
- **Personal Year Number** — calculated from birth month/day + current year. Represents the current annual cycle (1-9 year cycles). Highly time-relevant.
- **Expression Number** (optional, requires name) — sum of all birth name letters using Pythagorean mapping. Represents outward expression and talents.

For each number, show:
- The number in large golden typography with its archetype title ("7 — The Seeker")
- A rich interpretation (3-4 sentences) explaining what this number means
- **Cross-chart synthesis** — one paragraph connecting the numerology number to the user's natal placements (e.g., "Your Life Path 7's need for solitude and depth is echoed in your Moon in Scorpio in the 12th house...")

The name collection is optional — Life Path, Birthday, and Personal Year work from birth date alone. Expression number is shown when a name is provided, with a graceful prompt if not.

## Why This is a Feature

This adds a new, complete domain of meaning — numerology — that stands independently but cross-references astrology. It requires new calculations, new UI sections, new interpretation content, and a new data collection point (name). This is clearly new user-visible capability.

## How to Use It

- A "Numerology ✦" button appears on the landing page menu (alongside chart, transits, synastry, dream)
- Clicking opens the numerology view for the user's birth date
- If no name is saved, a small optional name field appears at the top with prompt "Enter your full birth name for Expression Number (optional)"
- Numbers are displayed as beautiful cards in the mystic theme
- Cross-references to the natal chart are shown in a "Cosmic Connections" section

## Impact

**High** — adds a full new domain; deeply aligned with product guidelines
**Effort** — Medium (new engine module, new UI components, new interpretation database for 9 numbers × 4 categories)

## Dependencies

- Birth date is already available in `AppContext`
- Natal chart data is available for cross-referencing
- Name needs to be optionally stored in `AppContext` and localStorage

## Implementation Summary

- New file: `src/engine/numerology.ts` — calculation functions
- New file: `src/data/numerologyInterpretations.ts` — interpretation text for numbers 1-9 + master numbers 11, 22, 33 for each category
- New file: `src/components/results/NumerologyPage.tsx` — the reading display
- Modified: `src/context/AppContext.tsx` — add optional `userName` to birth data
- Modified: `src/App.tsx` — add numerology view and landing page button
- Modified: `src/context/appState.ts` — persist name in localStorage
