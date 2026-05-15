# Sprint 0018 — Review Plan

## How to manually verify the sprint deliverables

---

## Feature 1: Advance Tab Marker System

**Delivered:** Colored dot markers on the slider track, "Notable moments" overview strip, animated markers, and marker tooltips.

**Where to go:** Open the app → run a natal chart reading for any birth date → tap **"Advance"** in the three-tab row below the chart wheel.

**How to test it:**
1. Wait for the Advance tab to finish computing (brief loading state while snapshots are pre-calculated).
2. Look above the slider for the **"Notable moments" strip** — a horizontal bar labeled "Notable moments" on the left with a period range on the right.
3. Confirm colored dots appear in the strip at various positions (gold diamonds, green circles, red circles, blue diamonds). If the period is very quiet, the strip may say "Quiet period — no exceptional moments detected."
4. **Click** any colored dot in the overview strip. Confirm the slider jumps immediately to that position.
5. Look at the slider track itself. Confirm small colored dots appear directly on the track at marked positions.
6. **Hover** over a dot on the slider track (desktop). Confirm a tooltip appears showing: the date with day of week, a category label ("Power configuration" / "Favorable window" / "Tense configuration" / "Planetary Shift"), and a one-line reason (e.g., "Saturn reaches your Ascendant — a significant moment for career and public direction").
7. Change the period from **Daily** to **Weekly** to **Monthly** using the period selector. Confirm markers update for each period.
8. Confirm the slider still drags normally — markers should not interfere with slider dragging.
9. Confirm the banner below the chart wheel updates appropriately when the slider is at a marked position (gold banner for power, green for favorable, red for challenging, blue for shift).

**What to expect:** The slider track is no longer a blank bar — it shows colored dots at significant astrological positions before you drag anywhere. The overview strip gives you an instant bird's-eye view of the full period. Clicking dots navigates directly to those moments.

---

## Feature 2: Prev/Next Navigation + Thumb Halo + Aspect Header

**Delivered:** Jump buttons to traverse notable moments, a colored halo on the slider thumb at marked positions, and a category label in the aspect list header.

**Where to go:** Same as Feature 1 — Open the app → run a reading → tap **"Advance"** tab.

**How to test it:**
1. Wait for markers to appear (after snapshot computation).
2. Confirm **"← Prev"** and **"→ Next"** button controls appear near the slider (only shown when markers exist).
3. Tap **"→ Next"** once. Confirm the slider jumps directly to the nearest marker position ahead of the current offset — skipping all neutral positions in between.
4. Tap **"→ Next"** again to continue through the remaining markers in sequence.
5. When you reach the last marker, confirm **"→ Next"** grays out and becomes disabled.
6. Tap **"← Prev"** to move backward through markers. Confirm it grays out at the start.
7. **Thumb halo:** With the slider at a marked position, look at the slider thumb (the gold circle). Confirm a faint colored glow/shadow appears behind it in the marker's color (amber for power, green for favorable, rose-red for challenging, blue for shift). When you move to a neutral position, the halo should disappear.
8. **Aspect list header:** While at a marked position, look at the aspect list section below. Confirm the header reads something like "Transit Aspects (6) — Power configuration" or "Transit Aspects (8) — Favorable window". At a neutral position, it should read just "Transit Aspects (N)" with no suffix.

**What to expect:** Tapping Next/Prev visits every notable moment in sequence without dragging. The slider thumb changes color subtly to confirm you're at a marked position. The aspect list header echoes the character of the current position.

---

## Internal Changes

The following fixes were delivered internally with no user-visible UI change to test directly:

**Monthly Snapshot Noon Fix:** Monthly advance snapshots are now computed at noon (12:00 local) instead of midnight for all offsets ≥ 1. This corrects Moon position accuracy (up to 7° improvement) and energy scoring for all monthly advance readings. Visible effect: monthly markers are more accurate and consistent.

**Per-Planet Station Thresholds:** The retrograde status engine now uses per-planet station velocity thresholds instead of a single shared value, preventing outer planets (Saturn, Neptune, Pluto) from appearing as "Stationing" during normal slow motion. Visible effect: blue "shift" markers in the weekly and monthly views now fire only at genuine station events, not across weeks of ordinary outer-planet motion.

**Typed Scoring Engine:** `computePowerDayBanner` was refactored into a typed `scoreSnapshot()` function that stores a structured `SnapshotScore` on every snapshot. Internal quality improvement — no visible behavior change beyond more accurate and consistent categorization.
