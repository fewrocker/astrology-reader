# Nassim Taleb — Numerology Sky Chart Voice

Everyone is excited about this feature. Let me be the one who isn't.

**Hidden assumption #1: The chart data is always available.**
NumerologyPage currently shows a numerology reading based on birth date alone. A user can have a numerology reading without ever generating a birth chart — they might have entered just a birth date and skipped the full chart. But the Numerology Sky Chart requires `chartData` from context (planet positions, house cusps, angles). What happens if `chartData` is null?

Options:
- Show the sky chart only when chart data exists (acceptable — but the UI must handle this gracefully, not crash or show an empty circle)
- Prompt the user to "generate your birth chart to see your sky of numbers" — which is a fair degradation
- Show a partial chart with only the numbers derivable from birth date alone (life path, personal year, etc.) — but these don't have chart positions to plot

The null case must be explicitly designed. Not handled with a ternary and an empty div.

**Hidden assumption #2: The astronomy data maps cleanly to numerology positions.**
The chart data from `astronomy.ts` gives ecliptic longitudes in degrees (0-360). Reducing a degree to a single digit (e.g., 247° → 2+4+7 = 13 → 4) is straightforward. But "planet at 247°" means Sagittarius at 7° — should the number be plotted at 247° on the zodiac ring, or at the sign-relative 7°? The difference is irrelevant visually (same ring position) but the labeled position matters for the GPT prompt: "your Sun at 7° Sagittarius reduces to 4" is more meaningful than "your Sun at 247° reduces to 4".

The data pipeline must preserve both the absolute degree (for SVG placement) and the sign-contextualized reading (for GPT prompt and tooltip).

**Hidden assumption #3: GPT will say something meaningfully different from the existing narrative.**
The NumerologyPage already has a GPT narrative and a cross-reading card. Now we're adding a sky-chart-specific reading. Will the user experience three separately interesting readings, or three overlapping paragraphs that say similar things about their "Life Path 7"?

The GPT prompt for the sky chart reading must be explicitly different in scope: it's about the chart distribution — why these numbers cluster in these houses, what the dominant number's chart sources mean together. If the prompt is lazy, it will echo the narrative. The prompt engineering matters here.

**Hidden assumption #4: Label collision is a rare edge case.**
It's not. A chart often has Mercury, Venus, and Sun within 20° of each other (inner planets travel together). Three numbers at nearly the same position will overlap. This isn't an edge case — it's probably the most common chart configuration for fast-moving planets.

The collision-avoidance must be built in, not deferred. Radial offsets or micro-stacking. Without it, the chart looks broken for most users on first load.

**What is genuinely antifragile about this feature:**
- The chart renders immediately from existing `chartData` — no new async dependencies for the visualization itself
- The GPT reading degrades gracefully if the API is unavailable — the chart still works
- If the astronomy data is missing, the feature can hide without breaking the rest of the page

**Fragility to fix before shipping:**
1. Explicit null handling for missing chartData
2. Collision avoidance for overlapping degrees
3. The GPT prompt must be specifically sky-chart-scoped, not a rehash of the narrative

**The uncomfortable truth:**
This feature will be beautiful. It will probably also be complex to get right. The 23 data points seem manageable until you realize that in many charts, 8-10 of them will fall within 40° of each other (the inner planets and angles can cluster in one sector). Make the rendering robust before making it pretty.
