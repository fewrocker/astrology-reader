# Sprint 0016 — Changelog

**Completed:** 2026-05-15

---

## Issue Fixes

### Synastry Cache Version Guard (task-0001)
**Problem:** `SynastryData` was serialized to localStorage with no schema version marker. When sprint-0016 changed the data shape (replacing `CompatibilityScore` with `CoupleProfile`), returning users would silently receive `undefined` for `.coupleProfile` on every page load until they manually recomputed — with no error message and no fallback.
**Solution:** Added `SYNASTRY_CACHE_VERSION = 2` constant to `appState.ts`. `saveSynastryResults` now stamps `_v: 2` into every write. `loadCachedSynastryResults` validates the `_v` field on read and clears the stale localStorage entry, returning `null` for a clean recompute if the version is absent or mismatched. A secondary structural guard (`!coupleProfile`) catches any edge-case partial migration.

---

## Code Improvements

### ChartWheel Tick-Mark Optimization (task-0002)
**Problem:** The `ChartWheel` component rendered 360 individual `<line>` SVG elements for degree tick marks — 360 DOM nodes for purely decorative decoration, each a separate SVG rendering call. A second problem: the `HoverState` discriminated union had 5 variants requiring a manually exhaustive per-variant equality check in `handleTap`, and adding new hover variants (required for the bi-wheel) would have cost multiple branches per site.
**Solution:** Replaced the 360-element loop with two `<path>` elements whose `d` attributes concatenate all major and minor tick segments, reducing element count by ~358 nodes. Extended `HoverState` to include the new synastry variants using the typed discriminated union, and simplified all equality checks. Also removed a `useMemo` wrapper on `filteredAspects` that provided no benefit (the `aspects` prop is stable state).

---

## Features

### Synastry Bi-Wheel Chart (task-0003)
**Problem:** The synastry page showed two chart wheels side by side in a `grid-cols-2` layout, forcing users to mentally merge two separate circles to understand how the charts interact. This framing communicated "two individuals being compared" rather than "one relationship." Cross-chart aspects were invisible; users had to read aspect rows in a table to understand connections.
**Solution:** Replaced the side-by-side layout with a single unified bi-wheel: Person 1's natal chart as the inner wheel (gold planets, natal aspect lines) and Person 2's planets in an outer ring (lilac `#c084fc`), positioned by their actual ecliptic longitudes in Person 1's coordinate frame. Cross-chart synastry aspect lines are drawn between the inner and outer rings — always visible at 30% base opacity, brightening on hover — in the same blue/red/gold color coding as natal aspects but with a dashed stroke to distinguish them. Both rings have full hover support: hovering a Person 2 planet shows their sign and degree; hovering a cross-aspect line shows the synastry aspect brief. The chart container is promoted to full width (`max-w-2xl`). A legend below the chart labels the inner and outer rings using the personalized names or birth dates (from task-0005). The `CurrentMoonWidget` is removed.
**What it is:** A single synastry chart wheel showing both people's planets together, with visual aspect lines connecting them — the standard format used by professional astrologers.
**How to use it:** Open the synastry page after entering two birth charts. The bi-wheel appears at the top. Hover any outer-ring planet to see Person 2's placement. Hover any dashed line crossing the rings to read the synastry aspect brief.

### Couple Relationship Profile (task-0004)
**Problem:** The "Overall Resonance: 72" score communicated a judgment — a B-minus on the relationship — in place of insight. A 72 triggers anxiety or relief with no useful information. The five sub-scores (Romantic, Emotional, Communication, Growth, Challenge) were directional bars that framed "Challenge" as bad and "high scores" as good, which contradicts how astrology actually works. The scoring formula had structural bugs: the `overall` score ignored orb tightness, and any synastry could score no lower than 33 regardless of how tense the chart was.
**Solution:** Retired `CompatibilityScore` and `calculateCompatibility` entirely. Introduced `CoupleProfile` with seven bipolar dimension axes: **Intensity** (Calm ↔ Fiery), **Emotional Flow** (Reserved ↔ Expressive), **Communication Style** (Intuitive ↔ Analytical), **Intimacy Rhythm** (Spacious ↔ Merging), **Growth Dynamic** (Stabilizing ↔ Expanding), **Sexual Chemistry** (Understated ↔ Electric), and **Life Pace** (Steady ↔ Catalytic). Each dimension is computed from real synastry aspects using `Math.tanh`-normalized orb-weighted scoring; element and modality balance contribute secondary signals. Each dimension produces a qualitative label ("Balanced", "Leaning Fiery", "Distinctly Merging"), a confidence value (dimmed with "limited data" note when few aspects support the axis), and an aspect-grounded sentence. The `CoupleProfileSection` renders seven horizontal spectrum bars — a gold dot marker positioned along a neutral track with pole labels at each end. No red, no green, no numbers. Both the client engine and server engine (`server/engine/synastryEngine.ts`) were updated in sync. The GPT prompt now sends dimension labels instead of raw scores, so the narrative references the same vocabulary as the visual profile.
**What it is:** A seven-axis personality profile for the relationship — describing its character in non-judgmental terms, with both poles equally valid.
**How to use it:** Scroll below the bi-wheel to see the Relationship Profile section. Each bar shows where this couple sits on a spectrum. Hover the gold dot to read the aspect-grounded sentence for that dimension. Dimmed bars mean there weren't enough relevant aspects to make a confident assessment.

### Personalized Names Throughout Synastry (task-0005)
**Problem:** Every label in the synastry reading — page header, chart legend, aspect descriptions, house overlay titles, the GPT prompt itself — said "Person 1" and "Person 2". These are database labels, not people. The reading felt clinical regardless of how intimate the content was. The partner form had no name field, and the existing `userName` field in `BirthData` was never collected or displayed. Additionally, the Challenge score bar used `bg-red-400` (red) implying the challenge dimension is bad, and `CurrentMoonWidget` broke the emotional flow of the synastry reading by interrupting it with irrelevant content.
**Solution:** Added optional "Your name" and "Partner name" fields to the birth form (`StepPlace.tsx`) and partner form (`PartnerForm.tsx`). Added `resolvePersonLabel()` utility that returns the name if set or "Born Month Day, Year" as a fallback. Fixed `loadCachedPartnerData` which was silently dropping `userName` from the cache. Replaced every "Person 1" / "Person 2" label across `SynastryPage.tsx`, `SynastryTransitPage.tsx`, `App.tsx`, `DiscussModal.tsx`, `synastry.ts`, and `server/engine/synastryEngine.ts` with the resolved labels. Both `buildSynastryPrompt` and `buildCoupleTransitPrompt` now accept optional name parameters so the GPT narrative addresses people by name. Changed the Challenge bar color from `bg-red-400` to `bg-amber-600` and the challenging aspect count from `text-red-400` to `text-mystic-gold`. Removed `CurrentMoonWidget` from the synastry page. Defaulted the aspects and individual chart sections to collapsed.
**What it is:** The entire synastry reading now uses the names you enter — in the header, in the chart legend, in every aspect description, and in the GPT reading itself. If no name is entered, a human-readable birth date is used instead.
**How to use it:** When entering birth data (your own or your partner's), type a name in the "Name (optional)" field. The synastry page header will read "Emma & Michael" instead of "Person 1 & Person 2", and the GPT reading will address them by name throughout.

---

## Failed or Deferred Tasks

None. All 5 tasks completed and verified.
