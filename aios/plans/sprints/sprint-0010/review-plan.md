# Sprint 0010 — Review Plan

Manual QA guide for sprint-0010 deliverables.

---

## feat-transit-aspect-row-inline-briefs

**Feature:** Expandable house-aware inline briefs on each transit aspect row.

**Where to go:** Open the app → navigate to Transit Reading (tap the compass/transit icon or use the Readings modal).

**How to test it:**
1. Open a Transit Reading for any date.
2. Scroll to the "Transit Aspects" section — you should see a list of aspect rows, each showing planet symbols, an orb number, and an Applying/Separating badge.
3. Tap or click on any row.
4. A brief should expand beneath the row — one or two sentences describing what the aspect means for the specific house area your natal planet governs.
5. Tap the same row again — the brief should collapse smoothly.
6. Test with multiple rows — each should expand and collapse independently.
7. If you have a birth time entered, the brief should mention a specific life area ("partnerships," "career," "home"). If no birth time, the brief should give aspect-nature-only language without any house reference.

**What to expect:** Each row expands to a short, personal interpretation like "Saturn pressing on your 7th house asks you to examine the emotional contracts you've outgrown." No loading spinner — the brief appears instantly.

---

## feat-timeline-house-aware-event-briefs

**Feature:** Transit timeline event cards show house-specific brief text.

**Where to go:** Open a Transit Reading → scroll down past the aspect list to the Timeline section (or swipe to the Timeline tab if on mobile).

**How to test it:**
1. Look at the upcoming event cards in the timeline (e.g., "Mercury trine natal Venus in 3 days").
2. Read the detail text on each card.
3. If you have a birth time, the text should reference your natal planet's house: "Mercury opening a clear channel to your 7th-house Venus: a good day for a direct conversation with someone close."
4. Compare two users' readings for the same aspect — the house-specific text should differ based on where Venus (or whichever natal planet) sits in each person's chart.

**What to expect:** Event card briefs feel personal — they describe what the aspect means for your specific chart area, not generic planetary keywords.

---

## feat-daily-snapshot-key-aspect-pill-sentence

**Feature:** Key aspect pill on the home screen renders a one-line action sentence.

**Where to go:** Open the app → the home screen / Today view (the first thing you see when the app loads).

**How to test it:**
1. Look at the daily snapshot card — find the "Key" aspect badge (previously showed symbols like "Mars ☍ natal Sun").
2. It should now read a full sentence in italics: e.g., "Mars opposing your natal Sun — a day for assertion, not accommodation."
3. The sentence should appear immediately, before the GPT reading paragraph loads.
4. On a void-of-course moon day: check the moon pill — it should include "· decisions may need revisiting" alongside the phase name.

**What to expect:** A clear, readable sentence on the home screen that tells you at a glance what kind of day you're walking into.

---

## feat-advance-tab-power-day-banner

**Feature:** Contextual gold banner on notable future dates in the Advance tab.

**Where to go:** Open a Transit Reading → tap the "Advance" tab (the date-scrubber view showing future transits).

**How to test it:**
1. Scrub the slider forward through future dates — try weekly and monthly views.
2. On most dates, no banner appears.
3. When you land on a date with a significant configuration (slow planet contacting your natal Ascendant or Midheaven within 1°, or 3+ tight applying aspects), a gold-tinted banner should appear above the chart wheel.
4. The banner text should name the relevant planet and what area of life it touches: "Saturn reaches your Midheaven on this date — a significant moment for career decisions and public commitments."
5. Verify the slider still responds smoothly while scrubbing — no freezing while snapshots compute.

**What to expect:** Most dates are quiet. Notable dates stand out with a gold callout. The slider stays fluid throughout.

---

## feat-gpt-prompt-hierarchy

**Feature:** GPT transit and synastry readings open with the tightest aspect named first.

**Where to go:** Open a Transit Reading or Synastry Reading and trigger a GPT interpretation (if on a tier that allows it).

**How to test it:**
1. Run a Transit Reading and wait for the GPT paragraph to load.
2. Read the opening sentence — it should name a specific planet, aspect type, and house (e.g., "With Saturn squaring your natal Mercury in the 3rd house at 0.8°, the coming days invite a harder look at how you communicate...").
3. The paragraph should NOT open with a generic statement like "As a Scorpio Sun, you may find..." — it should be chart-specific from the first word.
4. Run a Synastry Reading for two charts — the GPT text should open by addressing the tightest cross-chart aspect, not a general compatibility overview.
5. For users without a birth time: verify the reading makes no house references (signs only).

**What to expect:** GPT readings feel more focused and specific — they address the most active planetary contact first rather than covering all topics with equal weight.

---

## Internal Changes (Code Enhancements)

Two structural improvements shipped alongside the features:

- **Natal house context utility** (`getNatalPlanetContext`): A shared helper that ensures every component accesses natal house data consistently and correctly handles unknown birth times. No visible UI change — prevents "House 0" from ever appearing in readings.

- **Transit type house embedding**: `natalHouse` is now embedded directly in `TransitAspect` and `TimelineEvent` objects at calculation time. No visible UI change — eliminates prop-drilling and ensures house data flows correctly through the component tree.
