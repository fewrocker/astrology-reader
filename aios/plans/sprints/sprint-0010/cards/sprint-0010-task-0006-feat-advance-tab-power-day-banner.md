---
**Type:** Feature
**Originated by:** Jobs, Carmack, Miyazaki
---

## Problem / Opportunity

The AdvanceTab lets users scrub a time slider to any future date — daily up to 30 days, weekly up to 52 weeks, monthly up to 36 months — and inspects the transit chart for that moment. The tab already computes `transitAspects`, `retrogrades`, and `housedTransitPlanets` for every snapshot position. It displays a count row ("8 aspects · 5 harmonious · 3 challenging") and an expandable aspect list.

All dates look identical at a glance. A date where Saturn is perfecting a conjunction to the natal Midheaven at 0.2° orb is presented with the same visual weight as a quiet date with one loose outer-planet sextile at 3.8° orb. The user who scrubs the slider is explicitly planning ahead — they are the most intentional user in the product — and the tab gives them no signal about which dates deserve attention.

Jobs: "The user slides to a date three weeks from now. The quick stats show: '8 aspects · 5 harmonious · 3 challenging.' And nothing says: pay attention to this one."

Carmack: "`AdvanceTab` already has `chartData` as a prop (line 83) and already calls `assignTransitHouses` via `preCalculateSnapshots` (line 60). The house data is there; it just never surfaces in the display."

Miyazaki: "The user who spends time with the Advance Tab is the most intentional user in the product. They are not checking the sky today. They are planning. They deserve a surface that plans back."

Taleb: "`preCalculateSnapshots` runs synchronously in `useMemo` and can block the main thread for 1–7 seconds on the monthly view on a slow device. Adding power-day detection to the same pass worsens an existing performance problem without addressing its root cause."

The gap is entirely in the render layer. The detection is algorithmic, requires no GPT call, and the required data is already present in every `AdvanceSnapshot`.

---

## Vision

When the user scrubs to a date that contains a genuinely notable planetary configuration, a contextual banner appears between the quick-stats row and the aspect list. The banner names the most significant configuration in plain language and tells the user what life area it touches. It appears only for dates that earn it — not on every date, not on most dates. Its presence is a signal, not a decoration.

Example banner for a slow-planet angle aspect: "Saturn reaches your Midheaven exactly on this date — a significant moment for career decisions and public commitments."

Example banner for a multi-aspect convergence: "Three tight aspects converge here. A good date to mark on your calendar."

The banner disappears when the user scrubs to a quieter date. It requires no user action to dismiss; it is a read-only annotation that reflects the snapshot's computed state. The detection is deterministic: the same chart, the same date, always produces the same banner or no banner.

---

## Specifications

### Detection Criteria

1. **Primary trigger — slow-planet aspect to a natal angle with orb under 1°.** A "slow planet" is defined as Saturn, Uranus, Neptune, or Pluto — planets whose daily motion is slower than 0.05°/day (matching the existing `SLOW_PLANETS` set in `PatternPanel.tsx` which includes Jupiter; Jupiter is excluded from the angle-contact trigger because its faster movement makes 1° orb contacts common). A "natal angle" is the Ascendant or Midheaven as stored in `chartData.angles.ascendant` and `chartData.angles.midheaven`. The orb is computed as the absolute angular distance between the transit planet's longitude and the natal angle's longitude, normalized to 0–180°. If any slow planet has an aspect-type contact (conjunction, square, opposition, trine, sextile — using the same `ASPECT_DEFINITIONS` already used by `calculateTransitAspects`) to a natal angle with orb ≤ 1.0°, the banner triggers. This is the primary trigger and produces the most specific banner text.

2. **Secondary trigger — three or more applying aspects with orb under 2°.** An "applying aspect" is one where `a.applying` is `true` in the `TransitAspect` object. Filter `snapshot.transitAspects` to `a.applying === true && a.orb <= 2.0`. If the count is three or more, the banner triggers. The applying filter is used rather than all aspects because applying aspects are actively tightening toward perfection on this date and represent the dominant energetic quality of the period. A date with six separating loose aspects is not a power day; a date with three tight applying aspects is.

3. **Trigger priority.** If both criteria are met simultaneously (a slow planet is within 1° of a natal angle and three or more applying aspects exist under 2° orb), only the primary trigger banner text is rendered — the slow-planet angle contact is the more specific and meaningful signal. The secondary trigger banner fires only when the primary trigger is not met.

4. **No banner when `chartData.unknownTime` is true.** Natal angles (ASC, MC) are meaningless without a birth time. When `chartData.unknownTime` is `true`, the primary trigger must be suppressed entirely, because `chartData.angles.ascendant.longitude` and `chartData.angles.midheaven.longitude` are undefined or zero. The secondary trigger (three applying aspects under 2° orb) does not depend on natal angles and may still fire — but the banner text must not reference any house or angle. See spec 12 for the `unknownTime` fallback text.

5. **Definition of "slow planet" in code.** The feature must define its own local constant rather than importing from `PatternPanel.tsx` (which is a UI component, not a shared utility). The constant is:
   ```ts
   const SLOW_PLANETS_FOR_BANNER = new Set<PlanetName>(['Saturn', 'Uranus', 'Neptune', 'Pluto'])
   ```
   Jupiter is intentionally excluded from the primary trigger. Jupiter conjunct the Midheaven at 0.8° orb is meaningful but not rare — Jupiter returns to the same angle roughly every 12 years and moves fast enough to create frequent near-contacts. The slow-planet threshold is about structural, multi-year transits, not annual ones.

6. **Definition of "natal angle" in this codebase.** The `ChartData.angles` field (`src/engine/types.ts` line 52–57) contains `ascendant` and `midheaven` as `ZodiacPosition` objects with `longitude` (0–360 ecliptic). The Descendant (longitude + 180° mod 360) and IC (MC + 180° mod 360) are derived from these two; aspects to DSC and IC are detected as oppositions to ASC and MC respectively and are handled automatically by the aspect detection logic. The banner refers to "Ascendant" and "Midheaven" by name in text, not "1st house cusp" or "10th house cusp," to match how other parts of the codebase present these points.

### The `computePowerDayBanner` Function

7. **Function signature and placement.** The function is defined inside `AdvanceTab.tsx`, not in `src/data/interpretations/`. It is a local computation helper, not a reusable interpretation primitive. Its signature:
   ```ts
   function computePowerDayBanner(
     snapshot: AdvanceSnapshot,
     chartData: ChartData,
   ): string | null
   ```
   It returns a human-readable banner string when a trigger condition is met, or `null` when neither condition is met. The component renders the banner only when the return value is non-null.

8. **Primary trigger banner text template.** When a slow planet contacts a natal angle within 1° orb, the function identifies the tightest such contact (minimum orb among all qualifying contacts) and constructs the text as follows:
   - Identify which natal angle is contacted: ASC → "your Ascendant", MC → "your Midheaven"
   - Identify the aspect type: conjunction → "reaches", opposition → "opposes", trine → "flows through", square → "presses", sextile → "opens to"
   - Identify the transit planet by name (e.g., "Saturn", "Pluto")
   - Identify the house theme for the natal angle: ASC is always the 1st house (theme: "identity and how the world first meets you"), MC is always the 10th house (theme from `HOUSE_THEMES[9]`: "Career, public image, reputation, authority")
   - Banner format: `"{TransitPlanet} {verb} {angle reference} on this date — {house domain phrase}."`
   - Example: `"Saturn reaches your Midheaven on this date — a significant moment for career decisions and public commitments."`
   - Example: `"Pluto squares your Ascendant on this date — a period of deep personal transformation and identity pressure."`
   - The house domain phrase is not derived algorithmically from `HOUSE_THEMES`; it is a small hardcoded map of two entries (ASC and MC) with human-authored phrasing that is more specific than the generic house theme brief.

9. **Secondary trigger banner text template.** When three or more applying aspects with orb under 2° exist and the primary trigger is not met, the banner reads:
   - If the tightest applying aspect (`snapshot.transitAspects` filtered and sorted by orb, taking `[0]`) has `natalHouse` available (i.e., `natalHouse !== null` after the `code-transit-aspect-natal-house-embedding` prerequisite ships): `"{count} tight aspects converge on this date. The {tightest transit planet} reaching your {house theme name} is the defining energy."`
   - Example: `"Three tight aspects converge on this date. The Mars applying to your House of Partnership is the defining energy."`
   - If `natalHouse` is null (either `unknownTime` or the prerequisite has not shipped): `"{count} tight aspects converge on this date — a notable concentration of planetary energy."`
   - The `{count}` word is spelled out as "Three", "Four", "Five" for 3, 4, 5 — and falls back to the numeral for 6 or more.

10. **Orb values are read from `TransitAspect.orb`, which is already rounded to two decimal places** by `calculateTransitAspects` (the existing output format, as visible in the AdvanceTab rendering at line 213: `{a.orb}° orb`). No additional rounding is needed inside `computePowerDayBanner`.

11. **The function must handle the case where `snapshot.transitAspects` is empty.** Return `null` immediately if the array is empty. This prevents filter/sort operations on an empty array from producing incorrect results.

12. **`unknownTime` fallback behavior.** When `chartData.unknownTime` is `true`:
    - The primary trigger (slow-planet to natal angle) is suppressed entirely — return `null` from the primary check branch.
    - The secondary trigger (three applying aspects under 2°) may still fire, but the banner text uses the `natalHouse`-null variant from spec 9.
    - Under no circumstances should "Ascendant," "Midheaven," "House 1," "House 10," or any house number appear in banner text when `unknownTime` is true.

### Performance and Reactivity

13. **The `computePowerDayBanner` call is made during render, not inside `preCalculateSnapshots`.** The function operates on the currently selected `snapshot` (a single `AdvanceSnapshot` object) and does not iterate over all snapshots. It is called once per render with the selected snapshot and `chartData`. This avoids adding any computation to the pre-calculation loop. The computation cost is O(k) where k is the number of transit aspects in the selected snapshot — typically 8–15 entries — which is negligible.

14. **The `preCalculateSnapshots` function must be gated behind `useTransition`.** As Taleb identified, the current implementation runs synchronously inside `useMemo` on the main thread, blocking rendering during initial tab load. The `useMemo` call must be replaced with a `useState`/`useEffect` pair that wraps `preCalculateSnapshots` in `startTransition`:
    ```ts
    const [snapshots, setSnapshots] = useState<AdvanceSnapshot[]>([])
    const [isPending, startTransition] = useTransition()
    useEffect(() => {
      startTransition(() => {
        setSnapshots(preCalculateSnapshots(chartData, period, baseDate))
      })
    }, [chartData, period, baseDate])
    ```
    This allows React to yield the main thread between snapshot calculations, keeping the slider responsive during the computation phase. A loading state (`isPending`) must be reflected in the UI: the slider and chart wheel render immediately; the aspect list and banner show a skeleton or "Computing…" state while pending.

15. **The slider must remain interactive during the `isPending` phase.** The `offset` state is independent of the `snapshots` state. `handleSlider` updates `offset` immediately without waiting for snapshots to complete. When `snapshots[offset]` is not yet available (array is still being populated during transition), the component renders a loading indicator for the aspect list and suppresses the banner. It does not block the slider from moving.

### Visual Treatment

16. **Banner placement.** The banner renders between the quick-stats row (the flex row showing aspect counts and retrograde indicators) and the chart wheel. It does not appear inside the "Transit Aspects" card below. This placement ensures the banner is the first thing the user sees after the stats — before they scroll to the aspect list — so it sets context for how to read the aspects below.

17. **Banner visual style.** The banner is a horizontally-padded block with:
    - Background: `bg-mystic-gold/10` (matching the existing `bg-mystic-gold/5` pattern used in section headers, but slightly stronger to distinguish as a contextual annotation, not a section heading)
    - Border: `border border-mystic-gold/30` with `rounded-xl`
    - Left accent: a 2px left border in `border-l-2 border-mystic-gold` to create a "callout" visual treatment, consistent with how retrograde interpretations are styled in the retrograde card (`border border-red-500/15`)
    - Icon: `✦` (the power-day glyph already used by `TransitTimeline.tsx` for its power-day badge) in `text-mystic-gold`, positioned at the left of the text
    - Text: `text-mystic-gold/90 text-sm` for the banner sentence, using `font-heading` for the opening transit-planet name only (not the full sentence), to give the planet name visual weight without making the whole banner feel like a section title
    - The banner does not contain a dismiss button. It is a computed annotation tied to the selected date; it disappears when the user scrubs to a different date.

18. **Banner does not animate in or out.** No fade, no slide. The banner appears or disappears as the snapshot changes. Transition animations on a slider-driven element would create visual lag and make the interface feel sluggish during rapid scrubbing. Static presence or absence is the correct behavior.

### Acceptance Checks

19. **Correctness check — slow planet to natal angle trigger.** Load a chart with a known birth time. Compute the date when Saturn transits conjunct the user's natal Midheaven within 1° orb (this can be found by checking ephemeris data for the chart). Scrub the AdvanceTab slider to that date. The banner must appear with text referencing "Saturn" and "Midheaven." Scrub one position away from that date. If the orb for that adjacent date exceeds 1°, the banner must disappear. This verifies the threshold is applied per-snapshot, not cached across slider positions.

20. **Correctness check — secondary trigger.** Find a date in the slider range where three or more applying aspects exist with orb under 2° and no slow planet contacts a natal angle within 1°. Verify the banner appears with the convergence text. Find an adjacent date where fewer than three aspects meet the orb criterion. Verify the banner disappears. If no such date exists in the slider range for the test chart, switch to the weekly or monthly period where more variation is present.

21. **`unknownTime` check.** Test with a chart marked `unknownTime: true`. Verify that no banner referencing "Ascendant," "Midheaven," or any house number appears, even when slow planets are near the natal angle longitudes (which are meaningless without birth time). Verify that the secondary trigger can still fire if three applying aspects under 2° orb exist.

22. **Performance check — slider responsiveness.** On the monthly period view (36 snapshots), the slider must respond to drag input within one animation frame (16ms) even before all snapshots have fully computed. The `useTransition` gating in spec 14 ensures this. Verify by throttling CPU to 4x slowdown in browser DevTools and confirming the slider thumb moves without perceptible lag while the aspect list shows its pending state.

23. **No banner on offset 0 (current date).** The AdvanceTab at offset 0 shows the current transit state, which the user can already read from the main transit reading page. Suppress the banner when `offset === 0` to avoid redundancy and to preserve the special meaning of offset 0 as a reference point, not a future date to plan around.

---

## Out of Scope

- **Annotating all slider positions simultaneously** (e.g., coloring the slider track to show which positions have banners). This would require iterating all snapshots on every render and comparing computed banner states — a significant performance concern on the monthly view. The banner is a per-position annotation only.
- **Storing or caching the banner computation results in a pre-computed array.** Power-day detection runs on demand for the currently selected snapshot only (spec 13). Pre-computing all 52 banner states during snapshot initialization would worsen the thread-blocking issue identified in spec 14.
- **Extending the primary trigger to include aspects between slow planets and natal planets** (e.g., Saturn conjunct natal Saturn within 0.5° — the "Saturn return"). This is a meaningful astrological event but the current banner text template is designed for angle contacts only; natal-planet contacts require different text and different house resolution. This belongs in a separate follow-on proposal.
- **Making the banner a persistent alert** (e.g., showing a dot on the slider position after the user scrubs past it). The AdvanceTab is a planning tool, not a notification system.
- **Extending the slow-planet list to include Jupiter.** Jupiter is excluded intentionally (see spec 5). Adding it is a configuration change that may produce banners on an unacceptably large number of dates.
- **Any change to `preCalculateSnapshots`'s computation** beyond the `useTransition` gating in spec 14. The existing astronomy calculation logic inside `preCalculateSnapshots` is correct and is not modified.

---

## Open Questions

1. **Should the primary trigger fire for trine and sextile aspects to natal angles, or only for the "hard" aspects (conjunction, square, opposition)?** The current spec (spec 1) includes all major aspects, but a slow-planet trine to the Midheaven is astrologically significant (Jupiter trine Midheaven is a classic career-opportunity transit). Including harmonious aspects broadens the trigger and may produce banners more frequently than intended. If the threshold produces too many banners during acceptance testing, restricting the primary trigger to conjunction/square/opposition only is the first adjustment to try.

2. **What is the right orb threshold for the primary trigger?** Spec 1 specifies 1.0°. Carmack suggested 0.5° as a tighter option in his technical analysis (`tightAspects[0].transitPlanet` with orb < 0.5° as a "heavy day" signal). A 1.0° orb for slow planets is defensible — slow planets can take weeks to transit 1°, so a 1° window represents a multi-day significant period, not a single day. For the monthly and weekly periods where the slider represents longer time spans, 1.0° is appropriate. For the daily period where each step is one calendar day, even a 1.5° orb might be defensible because the planet may not reach 0° orb within the 30-day window. Acceptance testing will reveal whether banners are appearing at the right frequency.

3. **Does the secondary trigger's `applying` filter produce false negatives near retrograde stations?** When a transit planet stations retrograde, aspects that were separating become applying again. The `TransitAspect.applying` flag is computed at the snapshot's `targetDate`, so it reflects the correct applying/separating state for that specific date. However, aspects very close to a retrograde station may flip between applying and separating across adjacent slider positions, causing the secondary trigger to fire on some positions and not others for the same apparent astronomical state. Whether this constitutes a bug or correct behavior is an open question; the alternative is using raw orb alone (≤ 2.0° regardless of applying/separating), which would produce more frequent but potentially less precisely meaningful banners.

4. **Should the banner reference the aspect symbol (glyph) or only plain text?** The current spec uses only plain text ("Saturn reaches your Midheaven") for maximum legibility. An alternative is `"Saturn ♄ reaches your Midheaven ♑"` with glyphs inlined. The rest of the AdvanceTab renders glyph-heavy rows (planet glyphs, aspect symbols, zodiac glyphs) — the banner's plain-text format would create a visual contrast that could read as either "cleaner and more emphatic" or "inconsistent with the surrounding UI." This is a design judgment call for the implementing developer.

5. **Should `useTransition` or `startTransition` be used for the snapshot pre-calculation?** `useTransition` returns an `isPending` flag that can be used to show a loading state; `startTransition` does not. Spec 14 uses `useTransition` to enable the `isPending` indicator. However, if the `isPending` duration is very short (fast devices), the loading skeleton flickers briefly and then disappears — which may be more distracting than helpful. A minimum display time for the loading state could be added, but that introduces a `setTimeout` which is its own fragility. This is a UX calibration question best resolved during implementation.
