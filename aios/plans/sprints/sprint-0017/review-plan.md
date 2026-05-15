# Sprint 0017 — Review Plan

## feat-biwheel-visual-parity

**Feature:** Bi-wheel visual equality + cross-aspect connections toggle

**Where to go:** Open the app → navigate to the Synastry reading page → enter two birth dates/times → scroll to the bi-wheel chart.

**How to test it:**
1. Look at both rings of the bi-wheel at rest. Person 1's planets (inner ring, gold glyphs) and Person 2's planets (outer ring, lavender glyphs) should appear at the same brightness and size.
2. Hover over a Person 2 planet — it should highlight and show a tooltip.
3. Find the "Show connections / Show charts" pill toggle above the wheel.
4. Tap "Show connections" — the natal aspect lines (lines through the inner chart) should fade dramatically, and the dashed cross-aspect lines between the two rings should become clearly visible.
5. Tap "Show charts" — the view returns to normal.
6. In "Show connections" mode, hover a planet — only its cross-aspect connections should highlight.

**What to expect:** Both persons' planets at equal visual weight at rest. Toggle smoothly switches between chart-focused and connection-focused views.

---

## feat-couple-profile-visual-identity

**Feature:** Per-dimension visual identity in the Couple Profile

**Where to go:** Open the app → Synastry reading → scroll past the bi-wheel to "Your Couple Profile".

**How to test it:**
1. Look at all 7 dimensions. Each should have a distinct color and emoji icon: 🔥 orange for Intensity, 💧 sky blue for Emotional Flow, 💬 violet for Communication Style, 🌿 teal for Intimacy Rhythm, 🌱 emerald for Growth Dynamic, ✨ rose for Sexual Chemistry, ⚡ amber for Life Pace.
2. For each dimension, the bar should extend left or right from a visible center divider — not show a floating dot.
3. The qualitative label (e.g., "Distinctly Fiery", "Balanced") should appear in the dimension's accent color.
4. The sentence below each dimension should be visible even on mobile.
5. If a dimension has a "weak signal" badge, it means limited cross-chart aspects contributed to that axis.

**What to expect:** Seven visually distinct tiles, each with its own color identity and a directional bar making the expressed pole immediately readable.

---

## Internal Changes

**issue-synastry-gpt-failure:** The GPT synastry reading should now succeed on the first load without requiring a retry. If you test with a synastry chart, the interpretation section should populate automatically without showing a "Couldn't generate interpretation" error. Daily usage should only increment once per reading (not 3 times).
