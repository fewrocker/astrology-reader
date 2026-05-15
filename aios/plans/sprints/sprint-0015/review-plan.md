# Sprint 0015 — Review Plan

## How to review

### Asteroid Reading Section

**Feature:** A dedicated accordion section in the natal chart reading showing all five asteroids (Chiron, Ceres, Pallas, Juno, Vesta) with archetype badges and full sign/house/retrograde interpretations, styled in amber to distinguish them from the classical planet section.

**Where to go:** Open the app → enter a birth date and location → click "Get Reading" → scroll down past the "Planets" section on the birth chart reading page.

**How to test it:**
1. Enter any birth date (with a known birth time for full results, or without for sign-only results).
2. Click "Get Reading" to generate the natal chart reading.
3. Locate the "Asteroids & Minor Bodies" accordion — it should appear between the "Planets" section and the aspects section, and it should be **collapsed by default**.
4. Click the accordion header to expand it. Verify five asteroid cards appear: Chiron, Ceres, Pallas, Juno, Vesta (in that order).
5. In the collapsed view, confirm each card shows: the asteroid glyph, the asteroid name, an archetype badge (e.g. "Wounded Healer" for Chiron), the sign placement in amber text, and a brief interpretation sentence.
6. Click any individual asteroid card to expand it. Verify the full sign interpretation paragraph appears under the label "{Asteroid} in {Sign}".
7. If birth time was provided, verify the house interpretation paragraph also appears under "{Asteroid} in House {N}".
8. Expand a second card independently — confirm the first card stays open (independent expand state per card).
9. Verify no asteroids appear inside the "Planets" section above.
10. Verify no asteroids appear in the "Planetary Strength" section (if visible).

**What to expect:**
- The "Asteroids & Minor Bodies" section is collapsed on first load and must be clicked open.
- Five cards appear, each with a distinctive amber-bordered card, an archetype badge pill in amber, and a brief one-sentence interpretation in the collapsed row.
- Expanding a card reveals a full-paragraph interpretation for sign placement (and house placement if birth time is known).
- Asteroids do not appear in the classical planet list above.
- The chart tooltip on the wheel still shows asteroid sign/house interpretations (from the task-0001 wire-up) — hover an asteroid glyph on the chart wheel to confirm.

## Internal Changes

The `code-asteroid-interpretation-wire-up` improvement is verified implicitly through the asteroid reading section: if asteroid interpretations appear in the section and in the chart tooltip, the wire-up is working. As an additional check, verify that the chart wheel tooltip for an asteroid body (e.g., Chiron) shows a sign interpretation paragraph — if it does, the lookup functions are correctly widened and the guards have been removed.
