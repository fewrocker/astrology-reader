# Review: feat-natal-card-correspondence

**Task:** sprint-0028-task-0005
**Status:** Complete
**Branch:** sprint-0028-task-0005-feat-natal-card-correspondence

---

## What Was Implemented

### Engine: `src/engine/tarot.ts`

Added `buildNatalResonanceNote(card: TarotCard, astroContext: TarotAstroContext): string`.

Correspondence hierarchy (first match wins, returns '' on no match):
1. **Chart ruler match** — `card.rulingPlanet === astroContext.chartRulerPlanet`. Produces a sentence naming the planet, the Ascendant sign, and framing the card as "wired into your chart's governing intelligence."
2. **Dominant element match** — `card.element === astroContext.natalDominantElement`. Produces a sentence describing the card's element as "native territory" for the user.
3. **Court card branch** — structurally present but unreachable given branch 2 covers the same condition (both check `card.element === natalDominantElement`). Noted explicitly for future extension if a suit-only distinction is needed for courts versus major arcana.

The function resolves `rulingPlanet` from `card.rulingPlanet` first, falling back to `ASTRO_CONNECTIONS[card.id]?.rulingPlanet` — this correctly handles major arcana (which carry `rulingPlanet` on the card object) and minor/court cards (which do not).

Added `natalResonanceNote: string` to the `AstroConnection` interface and populated it in `computeInstantInterpretation`.

### Panel: `src/components/tarot/TarotInterpretationPanel.tsx`

`natalResonanceNote` renders in "In Your Sky Now" when non-empty, above the transit headline. Prefix symbol: `✶`. Styled as `text-mystic-muted/80 text-sm` — lighter than the transit body text, consistent with the lunar phase note style. The note appears in both the transit-present branch and the element-resonance-only branch.

### Tests: `src/engine/__tests__/tarot.test.ts`

7 new tests in `describe('buildNatalResonanceNote')`:
- Chart ruler match → non-empty string containing planet name and "Ascendant"
- Chart ruler match → specific wording check ("Sun rules both this card")
- No-match case → returns `''`
- All-null context → returns `''`
- Court card Fire element match → non-empty string containing "Fire"
- `natalResonanceNote` populated on `AstroConnection` via `computeInstantInterpretation` (match case)
- `natalResonanceNote` is `''` on `AstroConnection` (no-match case)

Also updated `mockAstroContext` to include the previously missing fields (`chartRulerPlanet`, `natalMoonHouse`, `natalVenusHouse`, `natalNorthNodeHouse`, `natalMarsHouse`) required by the `TarotAstroContext` interface.

---

## Test Results

- **Before:** 55 passing, 1 failing (pre-existing: `SPREAD_POSITIONS is not defined` — missing import in base test file)
- **After:** 62 passing, 1 failing (same pre-existing failure, untouched)
- **Build:** clean (`vite build` ✓, no TypeScript errors)

---

## Design Decisions

**Court card branch 3 vs branch 2:** The card spec listed court card element match as a distinct case (case 4), but `isCourtCard()` checks `card.arcana === 'minor' && card.number >= 11`. Since `card.element` for all court cards equals their suit element (e.g. King of Wands has `element: 'Fire'`), branch 2 (dominant element match) already catches this. The court card branch is kept in code as a structurally distinct block for readability and forward-extension.

**Empty-string guarantee:** The function explicitly returns `''` as the final fallback. Unlike `buildElementResonanceNote` (which always returns a non-empty string), `buildNatalResonanceNote` is designed to produce no output when there is no meaningful correspondence. The UI handles this correctly with a simple truthiness check before rendering.

**Ruling planet resolution order:** `card.rulingPlanet` (present on major arcana) takes precedence over `ASTRO_CONNECTIONS[card.id]?.rulingPlanet` (present for all 78 cards). For minor arcana pip cards, `ASTRO_CONNECTIONS` also returns `null` for `rulingPlanet`, which is correct — pip cards have no planetary ruler in this system.
