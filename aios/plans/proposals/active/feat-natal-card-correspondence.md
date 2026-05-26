# feat-natal-card-correspondence

**Type:** Feature

**Originated by:** Jobs, Miyazaki, Carmack, Taleb

---

## Problem or Opportunity

The tarot reading has two distinct layers of personalization: the **transit layer** (which planet is active in the sky right now and how it meets this card) and the **natal layer** (how this card's symbolic field intersects with the user's birth chart). After sprint 0027, the transit layer is complete: 193 entries cover every card under every major transit condition. The natal layer has no parallel.

The current "In Your Sky Now" section shows transit influence, a lunar phase note, and the advance category note. It does not show a natal correspondence note. The only place natal chart data appears in the reading is in GPT synthesis paragraph 2 — which requires a 5-15 second network call to materialize.

This means: a user with a Leo Ascendant drawing the Sun card, or a Cancer Sun drawing the High Priestess (both ruled by the Moon), or a Capricorn rising drawing the Devil (both Saturn-ruled) — the single most important personalization signal in the entire reading is invisible until GPT loads. The user is reading a panel that looks like it knows them and it doesn't yet say the most obviously true thing about their relationship to this specific card.

The natal layer data is fully available in `TarotAstroContext`:
- `chartRulerPlanet` — the ruling planet of the Ascendant sign
- `natalDominantElement` — the dominant element in the natal chart
- `natalSunSign` — natal Sun sign (implies Sun sign's element and ruling planet)
- `natalMoonHouse`, `natalVenusHouse`, `natalMarsHouse`, `natalNorthNodeHouse`

The card data is fully available in `TarotCard` and `ASTRO_CONNECTIONS`:
- `rulingPlanet` — card's ruling planet
- `element` — card's element
- `rulingSign` — card's associated zodiac sign

The infrastructure to detect correspondences exists. The function to surface them does not.

---

## Proposed Solution

Add `buildNatalResonanceNote(card: TarotCard, astroContext: TarotAstroContext): string` to `src/engine/tarot.ts`, alongside `buildElementResonanceNote`. The function detects and names the most significant correspondence between the card's symbolic field and the user's birth chart.

**Correspondence hierarchy (check in order, return the first match):**

1. **Chart ruler match** — card's `rulingPlanet === chartRulerPlanet`. This is the highest resonance: the planet that rules the person's entire chart is also the ruling planet of the card they drew. Example: "The Moon rules both this card and your Ascendant sign — the High Priestess's domain of inner knowing is directly wired into your chart's governing intelligence."

2. **Dominant element match** — card's element === natal dominant element. Already detected by `buildElementResonanceNote`, but the existing function is generic. A more specific version: "This card's Water element is native territory for you — Water dominates your natal chart, and the High Priestess arrives in the element where your deepest instincts already live."

3. **Card ruling planet activates natal house** — card's `rulingPlanet` matches a key natal planet's house context. Example: if card is ruled by Venus and user's natal Venus is in the 7th house, and the card is relationship-themed: "This card's Venus ruler speaks into your 7th house, where your natal Venus lives — the relational dimension of this card's guidance is personally activated."

4. **Court card suit element match to natal dominant element** — for court cards only: court's suit element === natal dominant element. The king/queen/knight/page of the same element as the person's natal dominant is a mirror figure.

5. **No significant correspondence** — return empty string (unlike other builders, this function can return empty, as the absence of correspondence is valid and should not produce a generic filler sentence).

The result is added as a new field `natalResonanceNote: string` on `AstroConnection` in `src/engine/tarot.ts`. The `TarotInterpretationPanel` renders it in the "In Your Sky Now" section when non-empty, before the transit influence line.

---

## Why This Is a Feature, Not a Code Enhancement

This adds new user-visible content to the interpretation panel — a new line in "In Your Sky Now" that did not exist before. It requires a new function, a new field on an exported interface, and a UI update to the panel component. This is not refactoring existing behavior; it is new interpretive output.

---

## Impact

**High** (user experience, personalization depth). The natal correspondence note is the signal that makes a user feel the reading was made for them specifically. It surfaces before GPT loads, which means it is visible in the first 0.5 seconds of reading. For users whose chart ruler matches their drawn card's ruling planet (e.g., Venus chart ruler drawing The Empress, Lovers, or a Venus-ruled court card), this produces an immediately recognizable and emotionally significant moment of recognition.

**Effort:** Medium. New engine function, new field on `AstroConnection`, updated interpretation panel. All source data is already available. No new database entries, no new API calls, no GPT changes.

---

## Dependencies

- `TarotAstroContext` is fully populated (requires natal chart data — works only when user has entered birth data)
- `ASTRO_CONNECTIONS` entries for the card (all 78 cards have entries — complete)
- `TarotCard.rulingPlanet` and `.element` fields — already present on all cards

---

## Implementation Summary

**Engine:** `src/engine/tarot.ts`
- Add `buildNatalResonanceNote(card: TarotCard, astroContext: TarotAstroContext): string`
- Add `natalResonanceNote: string` field to `AstroConnection` interface
- Populate in `computeInstantInterpretation` alongside other `AstroConnection` fields

**Panel:** `src/components/tarot/TarotInterpretationPanel.tsx`
- In the "In Your Sky Now" section, render `interpretation.astroConnection.natalResonanceNote` when non-empty
- Position: above the `transitInfluence` line, as a separate small note with distinct visual treatment (perhaps a different prefix symbol — a natal chart glyph or ✶ rather than ☽ for lunar notes)

**Tests:** `src/engine/__tests__/tarot.test.ts`
- Add describe block for `buildNatalResonanceNote` covering: chart-ruler match case, element match case, no-match case (returns empty string), court card element match case
