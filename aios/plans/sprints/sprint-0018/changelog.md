# Sprint 0018 — Changelog

## Completed Tasks

### issue-advance-monthly-midnight-reset
**Proposal:** issue-advance-monthly-midnight-reset
**Problem:** Monthly advance snapshots at offset ≥ 1 were computed at local midnight (00:00:00) instead of noon (12:00:00). The Moon moves ~13°/day, so a 12-hour error produced 6–7° of lunar position noise in all monthly advance readings, corrupting aspect calculations and energy scoring.
**Solution:** Changed the monthly branch of `preCalculateSnapshots` in `AdvanceTab.tsx` from `new Date(year, month, day)` to `new Date(year, month, day, 12, 0, 0)` — a one-argument fix that anchors all monthly snapshots at noon, matching the noon guard already in place for daily and weekly periods.

---

### issue-advance-station-threshold-overfire
**Proposal:** issue-advance-station-threshold-overfire
**Problem:** `getRetrogradeStatus` in `transits.ts` used a single `0.02°/day` threshold for all planets to detect stations. Outer planets (Saturn, Neptune, Pluto) routinely fall below this threshold during normal slow motion, causing them to be labeled "Stationing" for weeks at a time — not just at true station dates. This would have caused the marker system's "shift" category to fire false blue markers across large stretches of the weekly and monthly slider.
**Solution:** Replaced the single constant with a `STATION_THRESHOLD` per-planet map (Mercury: 0.020, Venus: 0.050, Mars: 0.030, Jupiter: 0.015, Saturn: 0.010, Uranus: 0.008, Neptune: 0.006, Pluto: 0.005), calibrated to each planet's actual station velocity. All consumers of `getRetrogradeStatus` receive corrected station status strings automatically.

---

### code-score-snapshot-engine
**Proposal:** code-score-snapshot-engine
**Problem:** `computePowerDayBanner` conflated astrological detection with string formatting in a 57-line function returning an opaque `string | null`. The scoring result was structurally inaccessible to any other consumer, and the `AdvanceSnapshot` interface carried no derived score — forcing every downstream system to re-derive the snapshot's character independently.
**Solution:** Refactored into a clean typed primitive: `scoreSnapshot()` returns a structured `SnapshotScore` with `{ category, intensity, reason, coShift, triggerAspect, ... }`. The `AdvanceSnapshot` interface now carries `score: SnapshotScore` computed once in `preCalculateSnapshots`. `computePowerDayBanner` was reduced to a 4-line formatter delegating detection to the stored score. All downstream systems (marker layer, banner, tooltip, navigation) read from the pre-computed score.

---

### feat-advance-marker-system
**Proposal:** feat-advance-marker-system
**What it is:** The Advance tab's plain slider track now shows colored dot markers at every significant astrological moment across the full period — before the user drags anywhere. A bird's-eye "Notable moments" overview strip above the slider shows all markers at once, with click-to-jump navigation. Hovering or landing on a marked position reveals a tooltip naming the specific astrological event.
**Problem:** The Advance tab pre-computed all snapshots but presented a completely inert slider. Users had to drag through every position manually to discover which moments mattered. The full astrological intelligence computed on load was invisible.
**Solution:** Added a `MarkerDot` component layer over the slider track (pointer-events-safe), an `OverviewStrip` above the slider, and a `MarkerTooltip` system. Marker categories: gold diamond (✦) for power days (slow planet near natal ASC/MC), green circle for favorable windows (energy ≥ 4 + tight harmonious aspects), red circle for challenging periods (energy ≤ 2 + tight challenging aspects), blue diamond (◆) for planetary stations. Animations: gold pulses slowly (3s), red pulses faster (2s), green glows statically, blue rotates. Global 20% density cap prevents strip noise. Hysteresis pass removes flicker at retrograde station boundaries. Snapshot cache prevents recomputation on tab remount.
**How to use it:** Open a transit reading → tap "Advance" tab → the overview strip labeled "Notable moments" shows all significant upcoming moments as colored dots. Tap any dot to jump the slider there. Hover a marker dot on the track to see the specific astrological event (e.g., "Saturn reaches your Ascendant — a significant moment for career and public direction").

---

### feat-advance-next-notable-navigation
**Proposal:** feat-advance-next-notable-navigation
**What it is:** Prev/Next jump controls traverse notable moments without dragging. The slider thumb changes color when resting on a marked position. The aspect list header shows the character of the current position alongside the aspect count.
**Problem:** After markers existed, the only way to move between them was to drag across every intervening neutral step. The slider thumb communicated nothing about where it rested. The aspect list header showed a bare count with no connection to the marker system.
**Solution:** Added "← Prev" and "→ Next" text-link buttons that jump the slider directly to the nearest marked position in each direction (disabled and grayed when no markers exist in that direction, 44px touch targets). The slider thumb shows a soft colored halo (gold/emerald/rose/blue) via a CSS variable when the current offset is a marked position. The aspect list header appends a category label: "Transit Aspects (6) — Power configuration" / "Favorable window" / "Tense configuration" / "Planetary Shift".
**How to use it:** Open the Advance tab → tap "→ Next" repeatedly to visit every notable moment in sequence. The thumb will glow in the marker's color when you land on a notable position, and the aspect list will confirm the character of the moment.
