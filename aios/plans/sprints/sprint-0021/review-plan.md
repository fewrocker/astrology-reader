# Sprint 0021 — Review Plan

## How to Review This Sprint

Open the app and follow the steps below for each feature. You will need a saved natal chart for most of these.

---

## feat-daily-snapshot-advance-signal

**What was delivered:** The Home screen Daily Snapshot card shows a category badge when today is a named advance day and you have visited the Advance tab in the same session.

**Where to go:** Home screen → Daily Snapshot card (the card showing moon phase, energy dots, and the daily brief).

**How to test it:**
1. Open the app — note the Daily Snapshot card. It should look exactly as before (no badge yet, since the advance cache is empty).
2. Navigate to a natal transit reading → Look Ahead tab → set the period to "Daily".
3. Wait for the advance strip to load and show markers.
4. Navigate back to the Home screen.
5. Look at the Daily Snapshot card.

**What to expect:**
- If today is a "Power Day" in the advance system: a gold "✦ Power Day" pill appears in the card's pill row alongside the moon phase.
- If today is a "Favorable Window": an emerald "◆ Favorable Window" pill.
- If today is "Challenging Period": a red "◆ Challenging Period" pill.
- If today is "Planetary Shift": a blue "◆ Planetary Shift" pill.
- If today scores as neutral in the advance system: no badge — the card is unchanged.
- If you reload the page (fresh session) before visiting Advance: no badge.

---

## feat-solar-return-house-briefs

**What was delivered:** The Solar Return Reading tab now shows a "This Year's Themes" section with house-placement cards for major planets in angular houses of the SR chart.

**Where to go:** Solar Return reading (enter a birth date, select a solar return year) → Reading tab → scroll down past the Sun/Moon brief cards.

**How to test it:**
1. Open a Solar Return reading for any natal chart.
2. Navigate to the Reading tab.
3. Scroll to the area between the Sun/Moon brief cards at the top and the GPT interpretation paragraph.
4. Look for a section headed "This Year's Themes".

**What to expect:**
- If the SR chart has any planet other than Sun or Moon in houses 1, 4, 7, or 10: you see cards for those planets. Each card shows:
  - A planet glyph on the left
  - "SR [Planet Name] in House [N]" as the title
  - A one-line brief prefixed with "This year: "
- Slow planets (Saturn, Jupiter, Uranus, Neptune, Pluto) appear before fast planets when multiple qualify.
- Maximum 6 cards are shown.
- If the SR chart has no qualifying angular placements (all angular houses have only Sun, Moon, or no planets): the section does not appear at all.
- If the birth time was not provided (unknown-time chart): the section appears but shows a small italic note: "House placements are approximate — birth time was not provided."
- The section appears before the GPT prose and is visible immediately — it does not wait for the AI interpretation to load.

---

## feat-today-advance-signal

**What was delivered:** The Today page shows an advance category banner at the top of the reading when advance snapshots are warm in the current session.

**Where to go:** Transit reading for a natal chart → Today tab.

**How to test it:**
1. Open a natal transit reading.
2. First, navigate to the Look Ahead tab → set period to "Daily" and let it load fully.
3. Note whether today has a non-neutral marker (Power Day, Favorable Window, Challenging Period, or Planetary Shift).
4. Navigate to the Today tab.

**What to expect:**
- If today had a non-neutral advance marker in the Look Ahead strip: a category banner appears at the top of the Today reading, above the Personal Day card. The banner shows:
  - The category label in small uppercase text (e.g., "POWER DAY")
  - The reason sentence with the key planet name bolded
  - A guidance sentence below the reason in lighter text (if available)
  - Category-specific color: gold for power, green for favorable, red for challenging, blue for shift
- If today scored as neutral: no banner — the Today page looks exactly as before.
- If you navigate directly to the Today tab without first visiting Look Ahead: no banner (the advance cache is empty).
- The existing Transit Energy bar remains unchanged and in its original position.

---

## Internal Changes

### issue-couple-advance-intensity-parity
A silent scoring bug was fixed: the couple advance strip was using a different intensity formula than the individual advance strip for identical sky conditions. No new UI — verify by comparing dot sizes on both strips for the same date range. A Saturn+Pluto cluster should now produce equally large dots on both individual and couple advance strips.

### code-snapshot-cache-lru-bound
A memory management fix: the advance snapshot caches in four components are now bounded to 6 entries each instead of growing without limit throughout the session. No visible UI change.
