# Hayao Miyazaki — Numerology Sky Chart Voice

I look at the existing astrology chart and feel something. The dark background, the gold zodiac ring, the glyph for Saturn glowing faintly in the upper left — it feels like looking through a window at something ancient and real. Someone cared about making it feel that way.

Now I think about the Numerology Sky Chart and ask: will it have that same feeling, or will it feel like someone pasted numbers onto a chart template?

**The danger**: Numbers on a circular background look like a clock. Or a dial. Or an instrument panel. The challenge is to make them feel *celestial* — like they belong in the sky, not on a dashboard.

**What makes numbers feel celestial:**
- Typography matters enormously. The numbers must be set in a typeface that belongs in this app's visual language — the same serif or elegant sans used for glyphs elsewhere. Not system monospace. Not bold block digits.
- Size variation must be smooth and intentional. A dominant 7 is not twice the size of a minor 3 — it's perhaps 20% larger, with a subtle glow ring behind it. The scale hierarchy is felt, not measured.
- The glows must use the same gold/purple palette already in the design system. Not generic CSS box-shadow blue.
- Numbers at house cusp positions should render slightly differently from numbers at planet positions — perhaps lighter, or slightly smaller — so the user's eye naturally reads planetary positions as primary.
- The zodiac ring must stay. It provides orientation and beauty. Without it, the numbers float in meaningless space.

**The frequency bar below the chart:**
This is where most implementations go wrong. They make it a table: `7: ████ 4`, `3: ██ 2`, etc. That's an engineer's frequency bar. 

What it should be: a minimal horizontal row of number glyphs, each displayed with a size or brightness proportional to its count. No labels. No numbers-next-to-numbers. The glyphs themselves communicate frequency through their visual weight. On hover, a tooltip can show the count and chart sources.

**Loading sequence:**
- Chart should appear immediately — before the GPT call even starts. No skeleton for the map.
- Below the chart, a soft pulsing card: "Reading your sky of numbers…" — the same shimmer treatment used for other GPT cards.
- When the reading arrives, it fades in gently. 400ms transition.

**What I'd protect:**
The chart must not try to show everything. The guidelines are right that 23 points is the right level. More would make it look cluttered. The restraint is the beauty.

**Small details that matter:**
- When two numbers would overlap (planets close in degree), offset one radially rather than squashing them together
- The number for the Sun position should subtly honor the Sun's importance — perhaps rendered in gold rather than white by default, not just when dominant
- The chart needs a title or heading that doesn't say "Numerology Chart" — something like "Your Sky in Numbers" or simply the user's name and birth date
- If birth time is unknown, the house cusps are uncertain — note this softly below the chart, not loudly in a warning box

**The feeling when it's right:**
The user opens numerology. The chart appears — a circle of numbers in the dark sky. Some numbers feel brighter, more present. They can't explain why, but they want to keep looking. Then they read the reading below, and it names what they already felt.

That is the goal.
