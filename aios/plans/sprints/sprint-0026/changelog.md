# Sprint 0026 — Changelog

**Focus:** Natal personalization depth — chart ruler, dominant modality, reversed meanings, court card transits, and position-aware instant interpretations.

---

## task-0001 — Fix: thread natalDominantModality to all 3 synthesis payloads and prompts

**Proposal:** `issue-natal-dominant-modality-gap`

**Problem:** `natalDominantModality` (Cardinal / Fixed / Mutable) was computed client-side but never passed through any of the three synthesis payload types or referenced in any GPT prompt. The modality was silently dropped before reaching the LLM.

**Solution:** Added `natalDominantModality` to all three payload interfaces (`TarotSingleSynthesisPayload`, `TarotThreeSynthesisPayload`, `TarotCelticSynthesisPayload`) and wired it into every synthesis handler. The server now re-derives modality from the authoritative natal chart when a user context is available, overriding any client-supplied value.

---

## task-0002 — Code: 36 court card transit adaptation entries

**Proposal:** `code-court-card-transit-adaptations`

**Problem:** All 16 court cards (Page, Knight, Queen, King of each suit) were missing from `TRANSIT_ADAPTATIONS`. When a court card was drawn during a transit-active reading, the system fell back to generic copy rather than the rich, rank-and-element-specific guidance written for all other cards.

**Solution:** Wrote 36 new entries in `src/data/tarot/transitAdaptations.ts` — covering Saturn, Pluto, and Uranus transits for all 16 court cards. Each entry reflects the specific dynamic between that transit planet's symbolic register and the court card's rank/element psychology.

---

## task-0003 — Code: 7 Major Arcana reversed meanings rewritten

**Proposal:** `code-reversed-meanings-depth`

**Problem:** Seven Major Arcana reversed meanings were written as simple negations of the upright ("blocked," "denied," "absent"). They described the absence of the card's principle rather than its off-axis, internalized, or arrested expression.

**Solution:** Rewrote reversed meanings for The Fool, The Magician, The High Priestess, The Empress, The Emperor, The Hierophant, and The Lovers in `src/data/tarot/majorArcana.ts`. Each rewrite names the specific way the card's archetype operates when it is working beneath the surface, stuck in a loop, or expressing as distortion rather than development.

---

## task-0004 — Code: GPT synthesis prompt quality upgrades

**Proposal:** `code-synthesis-prompt-specificity`

**Problem:** Synthesis prompts lacked enforcement constraints for card-specificity. GPT could produce Paragraph 2 (natal chart connection) that would be equally valid for any card drawn by the same person — a generic astrology observation rather than a reading of this card meeting this natal configuration. Dominant modality context was also not prominently positioned.

**Solution:** Upgraded all three synthesis prompts in `server/services/gptTarot.ts` with explicit card-specificity tests ("if a different card had been drawn, would this paragraph need to be rewritten?"), modality integration instructions, and tighter reflection question quality constraints. Also narrowed `natalDominantModality` type from `string | null` to the precise union `'Cardinal' | 'Fixed' | 'Mutable' | null` and introduced `computeServerDominantModality` with its own sign-modality constant to keep the server compilation context self-contained.

---

## task-0005 — Feat: chart ruler derivation + threading to all synthesis handlers

**Proposal:** `feat-chart-ruler-natal-personalization`

**What it is:** The chart ruler is the planet that rules the person's Ascendant sign (e.g., Aries rising → Mars rules; Libra rising → Venus rules). It is the single most personal astrological signal — the planet whose condition and transits most directly describe how this person moves through the world. GPT can now reference it by name in every synthesis reading.

**How to use it:** No user action required. The chart ruler is derived automatically from the Ascendant sign and threaded to all three synthesis flows. When a chart ruler is available, GPT synthesis prompts require it to be named and connected to a specific card in the reading.

**Problem:** The chart ruler was never derived or passed to any synthesis handler. GPT prompts were limited to Sun sign, Moon sign, and Ascendant sign — missing the most individuating natal signal.

**Solution:** Added `SIGN_RULERSHIPS_SERVER` lookup and `deriveChartRuler()` helper to `server/services/gptTarot.ts`. Added `chartRulerPlanet: string | null` to all three synthesis payload interfaces and all three synthesis functions. Updated all three React reading components (`TarotPage.tsx`, `ThreeCardReading.tsx`, `CelticCrossReading.tsx`) to pass `astroContext.chartRulerPlanet` into payloads. GPT prompts updated to require chart ruler references in the natal chart paragraph and astrology synthesis sections. Added `chartRulerPlanet` to `TarotAstroContext` in `src/engine/tarot.ts`.

---

## task-0006 — Feat: positionLabel/positionMeaning shown in panel; position-aware Level 2 fallback

**Proposal:** `feat-position-aware-instant-interpretation`

**What it is:** When a card is drawn in a spread (Three-Card, Celtic Cross), each position has a label ("Past," "Present," "Future") and a symbolic meaning. The instant interpretation panel now displays the position label and meaning, and the offline/fallback Level 2 interpretation is generated with awareness of the specific position the card occupies.

**How to use it:** Draw cards in any multi-card spread. The interpretation panel for each card now shows a "Position" section above the interpretation text, naming the position label and its symbolic meaning. The AI-free fallback (Level 2) incorporates the position context into its generated text.

**Problem:** The instant interpretation panel rendered the same text regardless of spread position. The position label and meaning were never exposed in the UI, and the Level 2 offline fallback had no awareness of which position in the spread the card occupied.

**Solution:** Added `positionLabel: string | null` and `positionMeaning: string | null` to `TarotAstroContext` and the `buildInstantInterpretation` function in `src/engine/tarot.ts`. Updated `TarotInterpretationPanel.tsx` to display a position row when a label is present. Updated `ThreeCardReading.tsx` to pass spread position data into the engine context.
