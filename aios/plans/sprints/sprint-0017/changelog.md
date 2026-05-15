# Sprint 0017 — Changelog

## Completed Tasks

### issue-synastry-gpt-failure
**Proposal:** issue-synastry-gpt-failure
**Problem:** GPT synastry interpretation failed on every fresh load due to missing error handling; daily usage counter was incremented 3× per reading; long readings were truncated at 2000 tokens.
**Solution:** Wrapped `getSynastryInterpretation` and `getCoupleTransitInterpretation` in try/catch matching the established pattern; removed duplicate `incrementTodayUsed` calls from all 4 reading paths; set `max_tokens` to 4000 for synastry and 3000 for couple transit.

### feat-biwheel-visual-parity
**Proposal:** feat-biwheel-visual-parity
**What it is:** Person 2's planets now render at equal visual weight to Person 1's in the synastry bi-wheel. A "Show connections / Show charts" toggle lets users bring cross-aspect lines to the foreground.
**Problem:** Person 2's glyphs were measurably dimmer (glow 0.15 vs 0.20, fill luminance ~0.60 vs ~0.85, circles 2px smaller), implying hierarchy.
**Solution:** Equalized glow opacity, body radius, glow radius, and glyph fill brightness across both rings. Reduced cross-aspect line rest opacity from 0.3 to 0.12. Added `synastryViewMode` prop to `ChartWheel` and a pill toggle to `SynastryPage`.
**How to use it:** Open a synastry reading → tap "Show connections" above the bi-wheel to bring cross-chart aspect lines to the foreground. Tap "Show charts" to return to the default view.

### feat-couple-profile-visual-identity
**Proposal:** feat-couple-profile-visual-identity
**What it is:** Each of the 7 couple profile dimensions now has its own color, icon, and a directional fill bar that shows which pole is expressed and by how much.
**Problem:** All 7 dimensions shared identical amber styling with no visual distinction, no icons, and a floating dot that didn't communicate direction.
**Solution:** Added `DIMENSION_CONFIG` with per-dimension colors (orange, sky, violet, teal, emerald, rose, amber), icons (🔥💧💬🌿🌱✨⚡), and rewrote `DimensionAxis` to use a directional bar that fills left or right from a center divider. Confidence indicators surface weak-evidence dimensions. Sentence always visible on mobile.
**How to use it:** Open a synastry reading → scroll to "Your Couple Profile" → each dimension now shows its own color and icon, with the bar filling toward the expressed pole.
