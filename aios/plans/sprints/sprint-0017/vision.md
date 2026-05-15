# Sprint 0017 — Vision

## Sprint Focus

Complete the synastry feature to production quality on three concrete fronts: fix the GPT reading (currently always failing) and expand it into a comprehensive couple interpretation; give the bi-wheel true visual parity between inner and outer planets and make cross-chart aspects the primary visual event; and transform the Couple Profile section from a bleak gold-bar set into seven visually distinct, richly colored dimension tiles that each carry their own identity.

---

## Why Now

Sprint 0016 shipped the structural foundation — bi-wheel chart, seven-axis profile, personalized names. The scaffolding is correct. What it is not yet is *felt*. The GPT reading fails on every fresh load (the error is `Couldn't generate interpretation`), so the central prose feature is dead for most users. The bi-wheel renders Person 2's planets in a noticeably dimmer visual weight than Person 1's, which implicitly demotes one person. The couple profile renders identically across all seven dimensions — same amber track, same gold dot, no icons, no color distinction — making it visually monotonous despite the quality of the underlying data.

This sprint exists to close the gap between what was architecturally built and what actually lands for a user who opens the synastry page.

---

## Where to Look

### GPT interpretation failure
`/projects/astrology-reader/src/services/gptInterpretation.ts` — `getSynastryInterpretation` (line 326) passes `person1` and `person2` with birth coordinates directly to `callProxy`. The server handler at `/projects/astrology-reader/server/services/gpt.ts` (`handleSynastryInterpretation`, line 852) reconstructs charts server-side using those coordinates. The error originates in the `callProxy` path and bubbles up through `App.tsx:397 runSynastry`. The failure is not in `buildSynastryPrompt` (line 738 of `synastry.ts`) — the prompt is comprehensive and already includes all aspects, house overlays, composite chart, and profile dimensions. The failure is at the HTTP or OpenAI call level; `callProxy` re-throws without wrapping into the error sentinel (`GPT_SERVER_ERROR` / `isGptError`) when called from `runSynastry`, causing the raw error to propagate instead of rendering the retry UI. Once fixed, the interpretation is already fed rich data — but confirm that `buildSynastryPrompt` in `server/engine/synastryEngine.ts` is exactly in sync with the client-side version in `src/engine/synastry.ts`; divergence between these two is a likely root cause.

### Bi-wheel visual parity and cross-aspect highlighting
`/projects/astrology-reader/src/components/chart/ChartWheel.tsx` — The gap is clear in the code. Inner planets (Person 1) have glow opacity `0.20` at rest and a glyph fill of `#e8e6e3` (near-white). Outer synastry planets (Person 2) have glow opacity `0.15` at rest and a glyph fill of `#d8b8f8` (dimmer purple). The stroke circle for inner planets defaults to `#2a2a3a`; the outer ring defaults to `#2a1a3a` — subtle but cumulative. The synastry aspect lines sit at `opacity={0.3}` at rest, which is appropriate as a background presence, but there is no interaction mode that highlights all cross-chart aspects as a group (e.g., a toggle or a default that brings synastry lines to foreground and dims natal lines). The guidelines call for making "combinations visual" — the right move is an interactive layer toggle or a default state where cross-aspects are the primary line layer.

### Couple Profile visual identity
`/projects/astrology-reader/src/components/results/SynastryPage.tsx` — `DimensionAxis` component (line 20) and `CoupleProfileSection` (line 65). Currently all seven dimensions share the same visual treatment: `bg-mystic-gold/20` track, `bg-amber-400` dot, `text-amber-300/80` label. Each dimension needs its own color palette, an icon or glyph, and a directional bar (not just a dot) that fills left or right of center with one color per side. The divider line at center (midpoint of the spectrum) is absent — the guidelines explicitly call for it.

---

## Quality Bar

"Deep, not shallow" for this sprint means:

- **The GPT reading must succeed reliably.** The error path has been visible since sprint 0016 shipped. Fix the root cause, not just the error display. Once working, the interpretation must address the couple's actual aspects and profile dimensions by name — not boilerplate that could fit any chart.
- **Both people in the bi-wheel must read as equals.** A user who sees one ring faint and one ring solid will intuitively feel one person is dominant. Glyph brightness, glow radius, and stroke weight must be visually matched between inner and outer rings at rest. Interactive highlighting may differentiate them, but the default state must not imply hierarchy.
- **Cross-chart aspects must be the visual star of the bi-wheel.** In the current state, synastry aspect lines at `0.3` opacity feel like a secondary detail behind the planet glyphs. The goal is a mode (either default or easily toggled) where the cross-aspect lines come forward and the natal aspects recede — making the relationship connections the primary visual event.
- **The seven profile dimensions must be immediately visually distinct from each other.** A user scanning the profile should be able to tell which dimension they are reading from color and icon alone, not only from the text label.
- **No dimension is coded good or bad.** Both poles of every axis continue to be equally valid. The directional bar fill (left vs. right of center) must use symmetrical colors, not red/green.

---

## What This Sprint Is NOT

- **Not a new feature sprint.** No new sections, no new chart types, no new reading categories. Everything is improvement and completion of what 0016 delivered.
- **Not a composite chart sprint.** The composite section remains a data table. A visual wheel for the composite was flagged as lower priority in 0016 and remains out of scope here.
- **Not a transit sprint.** Couple transits, individual transits, and the transit reading page are not touched.
- **Not an auth or subscription sprint.** No changes to UpgradeModal, rate limits, tiers, or analytics events.
- **Not a mobile redesign sprint.** The layout is not restructured. Fixes to mobile rendering of the bi-wheel (glyph overlap, tooltip clipping) are acceptable if they arise naturally, but not the focus.
- **Not a backend infrastructure sprint.** The server-side synastry engine (`server/engine/synastryEngine.ts`) may need a targeted fix for the GPT failure, but no new infrastructure is built.
- **Not a birth chart or solar return sprint.** Those pages are not in scope.
