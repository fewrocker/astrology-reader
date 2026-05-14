# Sprint 0011 — Review Plan

## feat-couple-transit-aspect-rows
**What was delivered:** Couple Transit aspect rows now expand with a brief description of each transit.

**Where to go:** Open the app → navigate to a Synastry reading → tap the "Couple Transit" tab.

**How to test it:**
1. Open a Synastry reading (you need two people's birth data entered)
2. Tap the "Couple Transit" or "Today's Transits" tab on the Synastry page
3. You should see a list of transit aspects affecting the composite chart
4. Tap on any aspect row
5. The row should expand to show a brief below the glyph line

**What to expect:** The brief appears below the row. It may say something like "Saturn approaching your composite 10th house — a period calling for shared discipline and external recognition." The language is generic (composite houses are not yet calculated), but a meaningful brief appears. Tap again to collapse.

---

## feat-solar-return-static-interpretation
**What was delivered:** The Solar Return Reading tab shows instant SR Sun and SR Moon house interpretation cards before GPT loads.

**Where to go:** Open the app → navigate to a Solar Return reading → tap the "Reading" tab.

**How to test it:**
1. Open any Solar Return reading
2. Tap the "Reading" tab
3. Before GPT loads (or even if you have no GPT connection), two cards should appear at the top
4. One card shows: "SR Sun in House X — This year: [brief]"
5. Another card shows: "SR Moon in House X — This year: [brief]"
6. The GPT reading should appear below these cards once loaded

**What to expect:** Two small interpretation cards appear immediately, before the GPT skeleton resolves. They show the SR Sun's house focus for the year and the SR Moon's emotional climate, drawn from the existing interpretation database. Visual treatment is lighter than the GPT block to signal they are static.

---

## feat-synastry-aspect-row-briefs
**What was delivered:** Synastry aspect rows now expand with relational-voice interpretation briefs.

**Where to go:** Open the app → navigate to a Synastry reading → find the Aspects section.

**How to test it:**
1. Open a Synastry reading
2. Scroll to the "Aspects" or cross-chart aspects section
3. You should see a list of aspect rows (Venus trine Moon, Sun square Mars, etc.)
4. Tap or click any row
5. A brief should expand below the row

**What to expect:** The expanded brief uses relational language — "your Venus trine their Moon: warmth flows naturally between you; your sense of beauty resonates with their emotional world." The applying/separating badge should NOT appear (natal charts have no applying aspects). Tap again to collapse. Not every pair will have a custom brief — uncommon pairs use a fallback that still provides a readable sentence.

---

## feat-synastry-house-overlay-briefs
**What was delivered:** The synastry house overlay section now shows relational interpretation briefs for each planet-in-partner-house entry, converted from a table to a card layout.

**Where to go:** Open the app → navigate to a Synastry reading → scroll to the "House Overlay" or "Planets in Partner's Houses" section.

**How to test it:**
1. Open a Synastry reading
2. Scroll down past the aspects section to find the House Overlay section
3. The section should be open by default if there are "key" placements (inner planets in relationship-defining houses)
4. Look at a few entries — each should show the planet, their partner's house, and a brief sentence below
5. High-signal entries (e.g., "Your Venus in their 7th house") should be more prominent
6. Check that the section header shows the count: e.g., "4 key placements"

**What to expect:** Instead of a plain table, you see cards with interpretation text. "Your Venus in their 7th house: love and beauty land in their partnership space — you are felt as someone who enriches their relationships." Outer planet entries use a house-theme template. The section is visually a card stack, not a table.

---

## feat-today-sky-highlights-expand
**What was delivered:** The Sky Highlights transit rows on the daily snapshot page now expand with house-aware briefs.

**Where to go:** Open the app → home screen / Today page → find the Sky Highlights card with the top 3 transit aspects.

**How to test it:**
1. Open the app to the Today or home screen
2. Find the "Sky Highlights" section (shows 3 transit aspects)
3. Tap or click any of the three aspect rows
4. A brief should expand below the row

**What to expect:** The brief uses house-aware language if you have a birth time entered. For example: "Saturn square your 2nd-house Mars: pressure around resources and what you're building — a good week to be deliberate rather than reactive." If no birth time is set, a generic but meaningful brief still appears. Tap again to collapse. The keyword label (e.g., "applying") that previously appeared should now be replaced by the brief.

---

## Internal Changes
The following improvements happened under the hood and do not require manual verification:

- **Element compat bug fix:** The synastry compatibility section now correctly shows Person 1's dominant element (previously showed arbitrary results due to a one-character sort comparator bug).
- **Shared CollapsibleSection component:** SynastryPage and SynastryTransitPage now use a shared accordion component instead of duplicate local copies.
- **GPT prompt element profiles:** Synastry, Couple Transit, and Solar Return GPT readings now include dominant element profiles for both people and instructions to name life areas alongside house numbers — leading to more specific and focused GPT output.
