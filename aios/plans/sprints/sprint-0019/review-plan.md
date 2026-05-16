# Sprint 0019 — Review Plan

A manual verification guide for every feature and fix delivered in sprint 0019. Follow these steps with the running app to confirm each item is working correctly.

---

## 1. Combination Scoring — Outer Planet Markers Fire on Weight, Not Noise

**What was delivered:** The advance tab now weights markers by the combined strength of concurrent applying aspects. Saturn+Pluto configurations produce high-intensity markers; Mercury+Mars clusters do not.

**Where to go:** Open a transit reading → tap the "Advance" tab → set period to Monthly.

**How to test it:**
1. Set the base date to the current month.
2. Scroll the monthly slider across a 24–36 month range.
3. Watch which positions receive gold (power), green (favorable), or red (challenging) markers.
4. Hover a red or green marker and read the tooltip reason. It should name an outer planet (Saturn, Jupiter, Pluto, Uranus, Neptune) — not just Mercury or Venus.
5. Hover a gold (power) marker. It should identify a slow planet within close contact of the Ascendant or Midheaven.

**What to expect:** Markers should appear at moments when slow outer planets are making tight contacts to natal planets — not at random Mercury or Venus transits. The tooltip reason should feel meaningful, not like a random planetary crossing.

---

## 2. House-Anchored Interpretation — Reason Strings Name the House and Give Guidance

**What was delivered:** Marker reason strings now include the natal house being activated ("your 7th house — partnership") and a second guidance line telling the user what to do with the moment.

**Where to go:** Open a transit reading → Advance tab → Monthly → navigate to a red (challenging) or green (favorable) marker using Prev/Next.

**How to test it:**
1. Tap "→ Next" to jump to the first notable marker.
2. Look at the category banner below the slider. It should show:
   - A bold planet name heading (e.g., "Saturn" or "Jupiter")
   - A reason sentence that includes a house number and plain-English house description (e.g., "your 7th house (partnership)")
   - A second lighter line of guidance text (e.g., "Face the pattern directly rather than managing around it...")
3. Hover the marker dot on the track — the tooltip should show a shorter version (first sentence only) of the reason, fitting cleanly within the tooltip without overflowing.
4. Repeat for a green (favorable) marker — guidance should say what kind of action the window supports.

**What to expect:** Every marker banner should feel personally relevant — naming a specific area of life (not just a planet name) and offering practical direction. The tooltip should be compact; the banner should have depth.

---

## 3. Category Diversity — Overview Strip Shows Mixed Colors

**What was delivered:** The 36-month overview strip now guarantees that when the chart has power, favorable, and challenging moments, all three categories appear — not just the highest-intensity cluster.

**Where to go:** Open a transit reading → Advance tab → Monthly period → observe the "Notable moments" overview strip above the slider.

**How to test it:**
1. Set period to Monthly and look at the full strip.
2. Confirm the strip shows a mix of dot colors — ideally at least one gold (power), one green (favorable), and one red (challenging) dot visible across the 36-month range.
3. If the strip shows only green or only gold, check whether the chart genuinely has no other categories (possible for some charts) — but for most charts you should see variety.
4. Tap any dot on the strip to jump to that moment and confirm the slider updates correctly.

**What to expect:** The strip reads like a map of the period's character — not a repetition of one color. Different colors should correspond to different types of moments when you jump to them.

---

## 4. Tooltip Width — No Overflow on Longer Reason Strings

**What was delivered:** The marker tooltip was widened from 200px to 280px and shows only the first sentence of the reason (the full reason appears in the banner below).

**Where to go:** Any marker dot in the Advance tab.

**How to test it:**
1. Hover slowly over several marker dots — gold, green, and red.
2. Observe the tooltip that appears above each dot.
3. The tooltip should be compact (2–3 lines maximum), not overflowing or colliding with the overview strip above.
4. The banner below the slider should show the full reason and guidance when you navigate to that position.

**What to expect:** Tooltips appear as clean, contained panels. No text spills outside the box. The tooltip and the banner together give you progressively more detail.

---

## 5. Couple Advance Tab — Look Ahead for the Relationship

**What was delivered:** The synastry (couple) transit reading now has a "Look Ahead" section with the advance slider, overview strip, and Prev/Next navigation for the relationship's composite chart.

**Where to go:** Open a couple transit reading (synastry) → scroll down below the GPT interpretation block.

**How to test it:**
1. After the interpretation text, look for a "Look Ahead" section header.
2. Confirm the overview strip appears showing dots for the relationship's notable moments.
3. Use "→ Next" to jump to the first significant couple moment.
4. Read the banner reason — it should use relational language ("the relationship's," "as a couple," "the bond between you") rather than individual language.
5. Confirm the period selector (daily/weekly/monthly) works and updates the strip.
6. If one or both birth times are unknown: an annotation should appear noting that composite angle markers are not available.

**What to expect:** The relationship's advance section feels like a parallel to the individual advance — same visual language, but the moments described speak to the couple, not to one person.

---

## Internal Changes Note

The following fixes have no visible UI changes but improve correctness behind the scenes:

- **Applying aspect accuracy:** Markers now only fire when an astrological window is genuinely approaching, not after it has already peaked. Station moments (when a planet appears to stop and reverse) no longer flicker on/off between consecutive snapshots.
- **Snapshot cache:** Switching between different people's charts in the same session no longer serves one person's advance data to another person.

No manual steps needed — these fixes are validation of reliability, not new features.
