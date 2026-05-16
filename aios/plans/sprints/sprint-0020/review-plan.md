# Sprint 0020 — Review Plan

This guide tells you exactly how to verify each delivered feature in the running app. All steps assume the app is running locally at its usual dev server address.

---

## Features to Review

---

### 1. Couple Advance Guidance (feat-couple-advance-guidance)
Two-paragraph banners in the couple advance section — reason + relational guidance.

**Where to go:** Open a couple transit reading → scroll below the GPT interpretation → find the "Look Ahead" section (couple advance strip).

**How to test it:**
1. Make sure you have a couple saved with two complete birth charts (birth time known for both).
2. Open the couple advance tab.
3. Use the overview strip or Prev/Next buttons to navigate to any colored marker (gold, green, red, or blue dot).
4. Look at the banner that appears when you land on a marked position.
5. Confirm the banner shows TWO paragraphs: a reason sentence and a guidance sentence below it.
6. Navigate to several different markers (try at least one favorable, one challenging, one shift if present).

**What to expect:**
- The banner shows a reason sentence in the top paragraph (e.g., "Saturn reaches the relationship's Midheaven — ...").
- Below it, a second paragraph in smaller, muted text gives guidance for the two of you (e.g., "This is a period to examine together what shared structures are working and what needs renegotiating...").
- The guidance always uses "the two of you", "together", "between you", or "the relationship" — never just "you".
- The first word of the reason is bolded (the planet name, not an article like "the" or "a").

---

### 2. Solar Return Advance Preview (feat-solar-return-advance-preview)
A "Peak Moments This Solar Year" strip at the bottom of the Solar Return reading.

**Where to go:** Open any person's chart → navigate to their Solar Return reading → click the "Reading" tab.

**How to test it:**
1. Open a natal chart for any person with a known birth time.
2. Navigate to the Solar Return reading (usually from the birth chart or natal reading page).
3. Make sure you're on the "Reading" tab (not "Chart").
4. Scroll to the bottom of the reading content.
5. Look for the "Peak Moments This Solar Year" section.
6. Wait a moment for the 12-month advance to compute (brief spinner or skeleton while loading).
7. Try the Prev/Next buttons to jump between markers.
8. If markers exist: navigate to one and read the banner.

**What to expect:**
- A section labeled "Peak Moments This Solar Year" appears below the GPT interpretation.
- An overview strip shows up to several colored dots across 12 months.
- Prev/Next buttons navigate between marked months.
- The banner for each marker shows a reason and guidance sentence.
- If no notable moments exist, a quiet message appears: "No particularly notable peaks this solar year."
- The strip covers 12 months from the solar return date (birthday) to the next birthday.

---

### 3. Synastry Axis Overlay (feat-couple-advance-synastry-axis)
Couple advance banners mention specific synastry connections when a transit activates both the composite chart and a tight personal synastry axis.

**Where to go:** Open a couple transit reading → scroll to the "Look Ahead" section → navigate between markers.

**How to test it:**
1. Open a couple where you know the two people have tight synastry aspects (orb ≤ 2°) — for best results, use a couple with Venus-Mars, Sun-Moon, or similar tight cross-chart aspects.
2. Navigate through the advance markers (especially power and favorable ones).
3. Look for markers where a slow planet (Saturn, Uranus, Neptune, Pluto) is active.
4. Check the banner reason text for synastry axis language.

**What to expect:**
- Most markers show standard composite contact language.
- When a slow transiting planet is also within close orb of a tight personal synastry axis, the reason string gains a suffix: "— and resonates with the [harmonious/tense] [Planet1]-[Planet2] axis between the two of you."
- The marker's intensity may be slightly higher (slightly larger dot or brighter presentation) than a plain composite contact.
- Fast planets (Mercury, Venus, Mars, Sun, Moon) do NOT trigger this suffix — only outer planets do.

---

### 4. Timeline / Advance Coherence (code-transit-timeline-advance-coherence)
The Transit Timeline's "Power Day" label now matches what the Advance strip calls a power day.

**Where to go:** Open any transit reading → open the "Timeline" tab → look for Power Day badges.

**How to test it:**
1. Open a transit reading for any person.
2. Go to the "Timeline" tab.
3. Note any dates showing a "Power Day" badge (gold dot + label).
4. Switch to the "Advance" tab for the same reading.
5. Look at the overview strip — note which positions have gold diamond markers (✦).
6. Switch back to the Timeline. Cross-reference: do the Timeline "Power Day" dates match the Advance strip's gold diamond positions?

**What to expect:**
- Dates the advance engine marks as `power` (slow planet near Ascendant or Midheaven) show "✦ Power Day" in the Timeline.
- Dates marked as `favorable` show "◆ Favorable Window" in the Timeline.
- Dates marked as `challenging` show "⚠ Challenging Period" in the Timeline.
- Dates that only qualify by event count (3+ ingresses, no advance marker) may still show a badge, but dates with advance scores show the advance-derived label.
- The two tabs tell a consistent story about the same days.

---

## Internal Changes (no UI verification needed)

The following improvements are internal and do not require navigation steps:

- **Couple advance cache key fix** — Prevents silent data corruption when two couples have similar birth times. No visible change; correctness improvement.
- **Couple advance banner bold fragment** — The bold word in couple advance banners is now always the planet name, not the first word of the sentence. You may notice that relational sentences starting with "The relationship's..." now bold the planet name correctly.
- **Couple advance scoring parity** — The couple and individual advance strips now agree on whether a given astrological configuration deserves a marker. If you have both open for the same person, the individual advance should fire markers at roughly the same planetary events as the couple advance.
- **Precompute abstraction** — Architecture improvement; no visible change.
