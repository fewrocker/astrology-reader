When evolving the product:
-> Introduce features which make the astrology suite more complete with different cross interpretations of things such as dreams, numerology, astrology, as one encompassing suite that works separately but also together
-> Every feature and design has to be beautiful and follow the majestic designs that are currently on the app, so before developing new UI, check some UI components to understand their vibe

---

## Sprint focus: Numerology Sky Chart

**One big feature, done really well: a sky chart that speaks numbers.**

When the user taps into the numerology analysis, the first thing they see is a sky map — the same kind of beautiful circular birth chart the app already renders for astrology. But on this map, every element that can be translated into a number is rendered as a number, not a planet glyph. The goal is to look at the birth chart through a numerological lens, see which numbers dominate, and then receive a GPT reading about what that numerical pattern means for this specific person.

---

### Research phase (must run before the proposal, not as a task)

Before proposing implementation, the agent must research and answer:

- What birth chart elements can be reduced to a single-digit (or master number) via numerological reduction? Examples to investigate:
  - Planet degree positions (e.g. Sun at 23° → 2+3 = 5)
  - House cusp degrees
  - Angles (ASC, MC, DSC, IC) as degrees
  - Aspects between planets (angle in degrees → reduced)
  - Planet positions by sign (Aries=1, Taurus=2, … Pisces=12 → 1+2=3)
  - Planet positions by house (house number itself)
  - Node degrees, Part of Fortune degree
- Which of these sources produce the richest, most varied number distribution? Which are too noisy or redundant?
- What is the best subset to display on the map so it's rich but not overwhelming?
- How do other numerology systems (Pythagorean, Chaldean) handle birth chart numbers — is there prior art to draw from?
- How should master numbers (11, 22, 33) be treated — kept as-is or reduced further?

The research conclusion must inform exactly which data points feed the map and how the reduction is computed, before any code is written.

---

### The feature: Numerology Sky Chart

**What it is**
A circular sky map rendered at the top of the numerology page — the same polar coordinate canvas already used for astrology charts. Instead of planet glyphs and aspect lines, every data point on the chart is drawn as its numerological number. The visual output is a sky full of numbers.

**How it works**
1. Compute the birth chart (planets, houses, angles) using the user's birth data — same ephemeris pipeline already in use.
2. For each chart element in the selected subset (determined by research), reduce the degree or position value to a single digit (or master number).
3. Place that number on the chart at the correct position (sign + degree) using the same polar layout as the existing sky map.
4. Numbers that appear most often get visual emphasis: larger font size, brighter color, or a glowing ring — so at a glance the dominant numbers pop out.
5. A legend or summary bar below the map shows the frequency count per number (1 through 9, plus 11/22/33 if present), sorted descending.

**GPT reading (async, non-blocking)**
- After the map renders, a single GPT call receives: the user's name, birth data, full number frequency table, and the top 2–3 dominant numbers with their chart sources.
- The prompt asks: what does this pattern reveal about this person? Why are these numbers dominant? What do they mean in combination?
- This is not a generic "number 7 means introspection" response — it must be a flowing reading specific to this person's chart, grounded in the actual chart positions that produced those numbers.
- The card shows a pulsing skeleton ("Reading your numbers…") while the call is in flight. Never block the map render on the GPT call.

**Design**
- The map must follow the same majestic visual language as existing sky charts: dark background, elegant typography, subtle glows for emphasis.
- Numbers should be styled to feel celestial — not like a spreadsheet. Think constellations of numbers.
- Dominant numbers should feel alive: slightly larger, subtly glowing, drawing the eye naturally.
- The frequency summary below the map should be minimal and beautiful, not a data table.

---

### What NOT to propose
- Do not split this into many small tasks — this is one cohesive feature
- Do not propose a generic "show numbers on a list" fallback — the map is the feature
- Do not add new static numerology cards — the point is the chart and the GPT reading
- Do not block the map on GPT — the chart must render immediately, the reading layers in asynchronously
