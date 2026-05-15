# Sprint 0016 — Review Plan

A manual verification guide for the features delivered in this sprint. Follow each section to confirm the feature is working correctly.

---

## Feature 1: Synastry Bi-Wheel Chart

**What was delivered:** The synastry page now shows a single unified chart wheel with both people's planets, instead of two side-by-side charts.

**Where to go:** Open the app → navigate to the synastry/couple reading page → enter two birth charts (or use any previously saved synastry result).

**How to test it:**
1. Enter birth data for two people and run the synastry reading.
2. On the results page, look at the chart at the top of the page.
3. Confirm you see **one circular chart wheel** (not two side-by-side circles).
4. Look at the outer ring of the chart — you should see planets in a lilac/purple color (`#c084fc`). These are Person 2's planets.
5. Look at the inner area of the chart — you should see the familiar gold planets. These are Person 1's natal planets.
6. Look for dashed lines crossing between the inner and outer rings — these are cross-chart aspect lines. They should be visible by default at low opacity (not hidden).
7. Hover (or tap on mobile) a lilac outer-ring planet — a tooltip should appear showing the planet name, sign, and degree.
8. Hover (or tap) a dashed line between two planets — a tooltip should appear showing the synastry aspect brief.
9. Check the legend below the chart — it should label the inner ring as "Person 1 (inner)" or their name/birth date, and the outer ring as "Person 2 (outer)" or their name/birth date.
10. On a phone (or resize the browser to ~375px wide), confirm the chart is still legible — all planets visible, no text clipping.

**What to expect:**
- One unified circular chart instead of two
- Lilac planets in the outer ring (Person 2), gold planets in the inner ring (Person 1)
- Dashed lines connecting related planets across the rings
- Tooltips on hover for both outer planets and the connecting lines
- A legend identifying which ring belongs to whom

---

## Feature 2: Couple Relationship Profile (replaces Overall Resonance)

**What was delivered:** The "Overall Resonance: 72" circle and five score bars have been replaced with seven non-judgmental bipolar dimension axes.

**Where to go:** Synastry results page → scroll below the bi-wheel chart.

**How to test it:**
1. After running a synastry reading, scroll past the chart.
2. You should see a **"Relationship Profile"** section (not an "Overall Resonance" circle).
3. Confirm there is **no number in a circle** and no percentage score anywhere in this section.
4. You should see **seven horizontal bars**, each with labels at the left and right ends:
   - Calm ↔ Fiery
   - Reserved ↔ Expressive
   - Intuitive ↔ Analytical
   - Spacious ↔ Merging
   - Stabilizing ↔ Expanding
   - Understated ↔ Electric
   - Steady ↔ Catalytic
5. Each bar has a **gold dot** positioned somewhere along it. The dot position reflects where this couple sits on the spectrum.
6. Above the bar, check for a qualitative label like "Leaning Fiery" or "Distinctly Merging" or "Balanced".
7. Hover (or tap) the gold dot — a one-sentence description should appear explaining what this dimension means for this specific couple.
8. Check that none of the bars use red or green coloring — only neutral colors (gold dot, grey track).
9. If a bar appears dimmed with a "limited data" note, that means the charts didn't have enough relevant aspects to assess that dimension — this is correct behavior, not a bug.
10. Scroll down to the GPT reading — the narrative should mention the couple's dimension profile using vocabulary like "Fiery", "Merging", etc. rather than "Overall Resonance: 72".

**What to expect:**
- No numerical overall score
- Seven horizontal spectrum bars with named poles
- Gold dot positioned on each bar
- Qualitative label above each bar (Balanced / Leaning / Moderately / Distinctly + pole name)
- Hover tooltip with an aspect-grounded sentence
- No red or green coloring anywhere in the profile

---

## Feature 3: Personalized Names Throughout the Reading

**What was delivered:** Optional name fields added to the forms; the entire reading now uses names (or readable birth dates) instead of "Person 1" / "Person 2".

**Where to go:** The birth data entry form (your own chart) and the partner form (couple synastry form).

**How to test it — with names:**
1. When entering your own birth data, look for a **"Your name (optional)"** text field. Type a name (e.g. "Emma").
2. When entering your partner's birth data in the couple form, look for a **"Name (optional)"** field. Type a name (e.g. "Michael").
3. Run the synastry reading.
4. Check the page **header** at the top of the results — it should read "Emma & Michael" (or whatever names you entered), not "Person 1 & Person 2".
5. Check the **chart legend** — it should say "Emma (inner)" and "Michael (outer)".
6. Look at any **aspect description** — it should say "Emma's Venus trine Michael's Moon" style, not "P1's Venus trine P2's Moon".
7. Open the **GPT reading** — the narrative should address Emma and Michael by name throughout.

**How to test it — without names (fallback):**
1. Run a synastry reading without entering any names.
2. The header should read something like "Born Mar 15, 1990 & Born Jul 22, 1991" — human-readable dates, not "Person 1 & Person 2".
3. Aspect labels should say "Born Mar 15's Venus…" — not ideal prose but not "P1's Venus".

**What to expect:**
- "Your name" field visible in the birth entry flow
- "Name" field visible in the partner form
- Header uses names (or birth dates as fallback)
- All labels throughout the page use the resolved names
- GPT reading uses names in the narrative

---

## Internal Changes (no manual verification needed)

**Cache version guard (task-0001):** Prevents blank profile sections for returning users after the schema change. Automatically handled on page load — no user action needed. If you want to verify: open browser DevTools → Application → Local Storage → find `astral-chart-synastry-results` — it should now have a `_v: 2` field in the serialized JSON.

**ChartWheel optimization (task-0002):** Replaced 360 individual SVG line elements with 2 path elements for degree tick marks. Visually identical. Verified via build — no user-visible change, just improved rendering performance.

---

## Things to Double-Check

- **The bi-wheel must not show the old side-by-side layout.** If you still see two circles, the merge may not have applied correctly.
- **The Overall Resonance circle must be gone.** If you see "Overall Resonance: 72" anywhere, the CompatibilitySection was not replaced.
- **"Person 1" must not appear anywhere** in the synastry results (when names or birth dates are available). Grep for it if in doubt.
- **No red bars on the relationship profile.** The Challenge concept no longer exists as a bar. If you see any red coloring on score elements, something was missed.
- **The CurrentMoonWidget must not appear** on the synastry page. It was removed as it interrupted the couple's reading context.
