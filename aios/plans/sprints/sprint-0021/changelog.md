# Sprint 0021 — Changelog

## Completed Tasks

---

### issue-couple-advance-intensity-parity
**Proposal:** issue-couple-advance-intensity-parity
**Problem:** `scoreCoupleSnapshot` Priorities 2–4 gated correctly on `computeCombinedWeight` but derived `baseIntensity` from the unrelated `computeEnergyRating` path — producing marker dots of different sizes for identical sky conditions on the individual vs. couple advance strips. A Saturn+Pluto cluster that passed the gate could render a small dot on the couple strip while showing a large, saturated dot on the individual strip. `COMBINATION_WEIGHT_NORMALIZE` was entirely absent from `CoupleAdvanceTab`'s import list, making the divergence invisible at compile time.
**Solution:** Added `COMBINATION_WEIGHT_NORMALIZE` to the `CoupleAdvanceTab` import block. Replaced the three `Math.abs(rating.score - 3) / 2` derivations (Priorities 2–4) with `Math.min(1, combinedWeight / COMBINATION_WEIGHT_NORMALIZE)`, matching `AdvanceTab`'s formula exactly. Removed the now-dead `computeEnergyRating` import and `rating` variable. One additional repair commit fixed a `combinedWeight` scope issue in the Priority 2 coShift branch where the variable needed to be declared before the intensity calculation.

---

### code-snapshot-cache-lru-bound
**Proposal:** code-snapshot-cache-lru-bound
**Problem:** Four components (`AdvanceTab`, `CoupleAdvanceTab`, `SolarReturnPage`, `TransitReadingPage`) held unbounded `useRef<Map>` advance snapshot caches that were never evicted. An extended session with multiple charts, periods, and SR years could accumulate 1.5–2 MB of orphaned heap entries that were never reclaimed until page reload.
**Solution:** Created `src/utils/lruMap.ts` with an `LruMap<K, V>` class that extends `Map` and enforces a maximum entry count (O(1) eviction of the least-recently-used key on every `set` that would exceed the cap). Changed all four `useRef<Map>` initializations to `useRef<LruMap>(new LruMap(6))` — a one-line substitution at each site with no changes to any `.get`, `.has`, or `.set` call sites. A cap of 6 accommodates three transit periods × two likely base dates without evicting in normal use.

---

### feat-daily-snapshot-advance-signal
**What it is:** The Home screen `DailySnapshotCard` now shows a category badge (e.g., "✦ Power Day" or "◆ Favorable Window") when today's advance marker is cached from a prior Advance tab visit in the same session.
**Problem:** The Home screen was the highest-frequency surface in the product but had no connection to the advance marker system. A user who opened the app every morning received no advance signal from the home screen — they had to navigate to the Advance tab separately, even though the infrastructure to score today already existed.
**Solution:** When `AdvanceTab` pre-calculates daily advance snapshots, it now writes today's scored category (if non-neutral) to `localStorage` under the key `advance-today-signal-{YYYY-MM-DD}`. `DailySnapshotCard` reads this key on mount and renders a badge pill using category-specific glyphs and colors (`✦` gold for power, `◆` emerald for favorable, `◆` red for challenging, `◆` blue for shift). The key expires automatically when the date changes. No blocking computation on home screen mount — if the key is absent, the badge is silently omitted.
**How to use it:** Open the Advance tab and view the daily period. Then navigate to the Home screen. If today is a non-neutral advance day, the Daily Snapshot card now shows a colored category badge alongside the moon phase pill.

---

### feat-solar-return-house-briefs
**What it is:** The Solar Return Reading tab now includes a "This Year's Themes" section showing curated house-placement briefs for major planets in angular houses (1, 4, 7, 10) of the solar return chart.
**Problem:** The Solar Return page surfaced only Sun and Moon house placements from `PLANET_IN_HOUSE`. All other planets had SR house placements computed but nothing surfaced them. A user with Saturn in SR house 10 or Jupiter in SR house 1 received no static interpretive layer for those placements — only the GPT prose summary, which may not call out every meaningful angular cluster.
**Solution:** Added a `SRThemeBriefs` component (file-local in `SolarReturnPage.tsx`) that filters the SR chart's planets to angular houses, excludes Sun and Moon (already shown in `SRStaticBriefs`), excludes NorthNode and asteroids, sorts by slow-planet priority (Saturn, Jupiter, Uranus, Neptune, Pluto before Mercury, Venus, Mars), and caps at 6 cards. Each card shows the planet glyph, "SR {Name} in House {N}", and the `PLANET_IN_HOUSE` brief prefixed with "This year: ". Unknown-time charts show an "approximate house placements" footnote. The section renders null when no qualifying placements exist.
**How to use it:** Open a Solar Return reading → Reading tab. If the SR chart has any non-luminary planets in angular houses (1, 4, 7, 10), the "This Year's Themes" section appears between the Sun/Moon briefs and the GPT prose.

---

### feat-today-advance-signal
**What it is:** The Today page now shows an advance category banner at the top of the reading when the user has visited the Advance tab in the same session — connecting the advance engine's "Power Day" / "Favorable Window" / "Challenging Period" language directly to the daily reading page.
**Problem:** The Today page presented transit aspects and an energy rating in complete isolation from the advance marker system. A user who discovered a "Power Day" in the Advance tab and then navigated to Today saw nothing about it — two separate, contradictory answers to "what is today like for me?"
**Solution:** Introduced a module-level singleton `advanceSnapshotSessionCache` exported from `AdvanceTab.tsx`. Both `AdvanceTab` and `TransitReadingPage` write to it as a side effect of pre-calculation. `TodayPage` reads from it synchronously on mount — iterating cache entries to find any daily-period snapshot for the current chart and today's date (`dateStr` matching). If a non-neutral score is found, it renders the advance category banner above the Personal Day card, using the exact same visual design (colors, border, icon, reason + guidance text) as the advance tab's own category banner. No blocking computation, no skeleton, no placeholder — silence is the correct empty state.
**How to use it:** Visit the Advance tab (daily period) for a natal chart. Then navigate to the Today page. If today scores as a named advance category, the banner now appears at the top of the Today reading, above the Personal Day card.

---

## Conflict Resolutions

- **task-0003 vs task-0002 (AdvanceTab import block):** task-0002 added `LruMap` import; task-0003 added `isQuotaError` import at the same location. Resolution: kept both imports on consecutive lines — both actively used.
- **task-0001 repair (combinedWeight scope in Priority 2 coShift):** task-0001 replaced the three `baseIntensity` formulas correctly but omitted `const combinedWeight = isFavorable ? harmoniousWeight : challengingWeight` in the coShift branch. Added the missing declaration in a repair commit matching the identical pattern in `AdvanceTab.tsx`.
