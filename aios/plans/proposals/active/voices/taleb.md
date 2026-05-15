# Fragility Analysis: Sprint 0018 — Advance Tab Marker System
## By Nassim Taleb's Lens

Three sprints on synastry. Now we pivot to the Advance tab — the feature where we pre-score 30, 52, or 36 snapshots, paint colored dots on a slider, and declare it a "predictive intelligence layer." Let me tell you what will break and why everyone is too excited about the UI to notice.

---

## SECTION 1: THE SCORING MODEL IS A CONFIDENCE CLAIM WITH NO EPISTEMIC FOUNDATION

### 1.1 The `applying` Flag Is Computed Incorrectly for Retrograde Planets — and the Whole Scoring System Inherits This Bug

The `favorable` and `challenging` categories in the proposed marker system depend on counting "2+ applying harmonious/challenging aspects with orb ≤ 1.5°." The `applying` boolean on each `TransitAspect` comes from `calculateTransitAspects` in `src/engine/transits.ts`, lines 154–157:

```typescript
const applying = tp.dailyMotion > 0
  ? (angle > def.angle ? false : true)
  : (angle > def.angle ? true : false)
```

This logic is geometrically correct only for the simple case where the transit planet moves directly toward or away from the natal planet. It breaks for the opposition (180°) and conjunction (0°/360°) when the planets are on opposite sides of 180°. It also silently misfires for retrograde stations — moments when `tp.dailyMotion` is very near zero (not yet negative, but about to flip). At that instant, the denominator of the applying computation crosses zero: a planet with `dailyMotion = 0.001` is classified "direct" and the applying direction is derived from its current angular relationship. One day later, when `dailyMotion = -0.001`, the planet is classified "retrograde" and the applying direction reverses — for the same physical sky configuration, separated by 24 hours.

The consequence: an aspect that was scored "applying" in snapshot N becomes "separating" in snapshot N+1 without the orb meaningfully changing. If the marker scoring logic counts "2+ applying aspects at orb ≤ 1.5°," a favorable marker can appear at N and disappear at N+1 for purely computational reasons, not astrological ones. On a 30-day daily slider, this creates marker flicker at station dates — exactly the dates that should be the most confidently marked (stations are definitional shift events, not noise).

**The fix is not free.** Correctly computing applying/separating requires knowing whether the planet is accelerating or decelerating toward exact, not just the current sign of daily motion. No such correction exists in the engine today. Adding it for the scoring pass without fixing the underlying `calculateTransitAspects` function would create an asymmetry: the marker scores correctly; the aspect list displayed below the slider disagrees.

### 1.2 The `computeEnergyRating` Function Caps at 8 Aspects — So Dense Planetary Periods Appear Identical to Sparse Ones

`computeEnergyRating` in `src/engine/transits.ts`, line 486:

```typescript
const top = classicalAspects.slice(0, 8)
```

It slices to the 8 tightest aspects. A snapshot with 8 aspects scoring +3 and a snapshot with 14 aspects scoring +9 both return `{ label: 'Highly Favorable', score: 5 }`. The marker system proposes using `computeEnergyRating` as the primitive for the green/red dimension. Two green markers will appear visually identical — same color, same animation — despite one representing a genuinely dense, high-energy configuration and the other barely qualifying.

The vision calls for `intensity: number` on the scored result. This intensity will be flat-topped at whatever the 8-aspect ceiling produces. Users will see two green markers and assume they are equally favorable. One of them has 14 tight harmonious aspects perfecting. The other has 3. The dot cannot tell them apart.

This is the normalization problem. By capping at 8 for the rating computation, we created a system where variance above the cap is invisible. The "predictive intelligence layer" conveys no gradient above a threshold. This is like a weather forecast that says "warm" for anything above 70°F regardless of whether it's 75° or 105°.

### 1.3 The `monthly` Step Uses Average Month Math (30.44 Days) That Accumulates Drift

`ADVANCE_CONFIG` in `AdvanceTab.tsx`, line 37:

```typescript
monthly: { unit: 'month', unitPlural: 'months', max: 36, msPerStep: 30.44 * 86400000 }
```

But the `preCalculateSnapshots` function already corrects this for the monthly case — lines 178–181 use proper calendar month arithmetic with `new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate())`. So the `msPerStep` for monthly is never actually used in the calculation — only in a conceptual sense.

**The fragility:** the marker's position on the slider track is `(offset / max) * 100%`. Offset is an integer 0–36. The visual spacing is perfectly uniform. But the actual calendar time between monthly markers is not uniform — February has 28 or 29 days, not 30.44 days. A marker at offset 14 (14 months ahead) represents a different elapsed-time distance from offset 13 than from offset 15, if one of those gaps crosses February. The track treats all intervals as equal. The astrological moments are not equally spaced.

This matters most for the overview strip — the miniature timeline that "lets a user scan the entire period for peaks and valleys." A user looking at the strip interprets marker spacing as time spacing. A red cluster appears to be "about 2/3 through the year" based on where the dot sits on the strip. In reality, it might be offset 8 (8 months from now), but the strip positions it as 8/36 = 22% of the way through, which is geometrically equal to 2 months and 22 days — not 8 calendar months. The strip's visual encoding is wrong for the monthly period.

---

## SECTION 2: PERFORMANCE — THE `useTransition` BET IS A ONE-WAY DOOR

### 2.1 `preCalculateSnapshots` Is a Synchronous Loop of 53 or 37 Full Ephemeris Calls

At line 167 of `AdvanceTab.tsx`, `preCalculateSnapshots` runs a loop of `config.max + 1` iterations (31 daily, 53 weekly, 37 monthly). Each iteration calls:

- `calculateCurrentPositions(targetDate)` — computes all planet longitudes via astronomy-engine (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, NorthNode, plus 5 asteroids = 16 ephemeris lookups), each requiring a call to `Astronomy.GeoVector` or equivalent
- `calculateTransitAspects(...)` — O(transit × natal) aspect matching (16 × 16 = 256 pairs per snapshot)
- `getRetrogradeStatus(targetDate)` — 8 additional `getDailyMotion` calls, each computing longitude + longitude+1day = 16 more ephemeris calls per snapshot
- `assignTransitHouses(...)` — O(16) house lookups

For the weekly period: 53 snapshots × (16 + 16 + 8×2) planet longitude computations = 53 × 48 = 2,544 individual astronomy-engine calls. Each `GeoVector` call is a C-level WASM computation, but run from JavaScript in a tight loop without yielding.

The vision says this is "wrapped in `useTransition` to prevent blocking the main thread." `useTransition` does not yield CPU time to the main thread. It yields *render priority* — React defers the state update until the main thread is idle. The synchronous computation still runs inside `startTransition`, blocking all JS execution on the main thread until the loop completes.

**What this means in practice:** on a mid-range Android phone (the median user's device), `preCalculateSnapshots` for the weekly period will freeze the tab for 300–800 milliseconds. This is not a theoretical concern. `astronomy-engine` is a WebAssembly library; WASM runs synchronously unless explicitly moved to a Web Worker. `useTransition` is not a Web Worker. The UI will be unresponsive during this computation.

Adding the scoring pass to each snapshot — even a lightweight one operating on already-computed `TransitAspect[]` — extends this freeze. The vision says "the scoring pass adds a small constant per snapshot." This is true for the scoring computation itself. But if the scoring pass includes `computeEnergyRating` (which filters and slices the aspect array per snapshot), it adds ~53 × 8 array operations. Small, but added to an already-blocking loop.

**The real risk:** the computation gets worse on tab switches. Every time the user switches from Timeline to Advance, the tab remounts (it is conditionally rendered in `TransitReadingPage.tsx`, line 366–374). `useEffect` fires again. `startTransition` launches again. The 53-snapshot synchronous loop runs again. If the user switches tabs three times while browsing their reading, they have triggered three sequential 500ms freezes.

The only defensible fix is a Web Worker. The current architecture cannot be made truly non-blocking without one.

### 2.2 Marker Rendering Stability: `useMemo` Protects Against Re-Renders, But Not Against Snapshot Array Identity

The vision correctly states that "the marker layer must not trigger re-renders on slider drag — it should be a `useMemo` over the full `snapshots` array." This is the right approach. However, `useMemo` on an array is reference-stable only if the dependency array contains a stable reference.

In the current code, `snapshots` is a `useState` value set inside `startTransition`. When `preCalculateSnapshots` completes, `setSnapshots(result)` assigns a new array. The `useMemo` that computes markers from `snapshots` will recompute exactly once — when the snapshots are first populated. This is correct.

The fragility: if anyone adds a `useEffect` that re-triggers `preCalculateSnapshots` on period or baseDate change (which is already the pattern on lines 223–227), the snapshot array is replaced with a new reference, the markers `useMemo` recomputes, and the entire marker layer re-renders. This is correct behavior — but if the scoring computation is expensive, it adds cost to the re-render path. Every period switch (daily → weekly → monthly) re-runs `preCalculateSnapshots` and re-runs the marker scoring. Three period switches = three full scoring passes = three main-thread stalls.

### 2.3 The Overview Strip Is 53 DOM Nodes for Weekly — Fine Until Animations Are Added

The overview strip is proposed as "small colored dots on a miniature timeline." For the weekly period: 52 total positions, some with markers, some without. If 30% of weeks get markers, that's ~15 dots. This is manageable.

But the vision calls for animations: "a CSS `animation: pulse` keyframe on the dot's glow/shadow, applied at reduced intensity when idle." Pulsing animations force the browser to repaint on each animation frame (60fps). 15 simultaneously pulsing elements — each with a box-shadow that changes opacity — are 15 × 60 = 900 repaint operations per second, each requiring compositor work for the shadow. On mobile, this will increase battery consumption measurably and may cause frame drops in the main chart wheel's own render path when the user drags the slider.

The `animate-pulse` Tailwind class uses `opacity` transitions, which are GPU-composited and cheap. But the vision specifically calls for glow/shadow animations ("slow glows and breathing pulses"). Box-shadow is not GPU-composited. If the glow is implemented as `box-shadow` with animated opacity, it runs on the CPU compositor. 15 elements with simultaneous CPU-composited shadow animations will degrade performance on every device that is not a recent flagship.

The defensive design: use `opacity` transitions on a pseudo-element sized to the dot, not `box-shadow`. This moves the glow to the GPU compositor. The vision's "starlight" aesthetic is achievable either way; the implementation choice is the difference between 0.1% CPU and 15% CPU on a constrained device.

---

## SECTION 3: EDGE CASE INPUTS THAT WILL PRODUCE WRONG OR MISLEADING MARKERS

### 3.1 The `unknownTime` Chart — Power Markers for a Phantom Ascendant

The primary trigger for a `power` marker is "slow planet within 1° of natal ASC or MC." `computePowerDayBanner` correctly guards this:

```typescript
if (!chartData.unknownTime) {
  // angle contact logic
}
```

The vision says `scoreSnapshot` must carry the same guard. This is correct. But there is a subtler problem.

When `unknownTime = true`, the chart is computed with a default time of 12:00 noon (the standard practice). This produces a nominal Ascendant and Midheaven at the zodiac positions corresponding to noon on the birth date. These angles are plausible but wrong. The power day trigger is suppressed. Good.

But the `favorable` and `challenging` categories remain active. They score based on applying aspects to natal planets. Those natal planets are computed correctly (slow planets' positions change by < 1° per day, so a 12:00 assumption introduces negligible error). The markers for favorable and challenging will fire correctly.

The problem: the user with an unknown birth time receives a marker overlay that looks authoritative. Green dots and red dots appear on their slider. They are derived from real natal planet positions. They are not derived from the user's actual angles. But the user does not know this — the UI presents the marker system without any indication that ASC/MC-based signals are suppressed. A user who believes their Midheaven is in the power day zone will receive no gold marker, and no explanation for its absence.

There is no disclaimer on the Advance tab when `unknownTime = true`. The marker system will silently operate in a degraded mode — meaningful but incomplete — with no signal to the user that the gold power tier is unavailable for their chart.

### 3.2 The Retrograde Station Detection in `getRetrogradeStatus` Uses a Fixed Threshold That Will Produce False Positives for Mercury

`getRetrogradeStatus` at line 238 of `transits.ts`:

```typescript
const isStationing = Math.abs(motion) < 0.02
```

0.02° per day is the stationing threshold for all planets. Mercury's typical direct motion is 1.2°–1.7° per day. Near a station, Mercury slows to approximately 0.2°/day before halting, then reverses. At 0.02°/day, Mercury is very close to its actual station — the threshold is tight and appropriate.

But Jupiter moves ~0.08°/day when direct and ~0.04°/day when retrograde. Saturn moves ~0.03°–0.04°/day normally. These outer planets routinely have `|motion| < 0.02` for extended periods that are not stations — they are simply slow. If `getRetrogradeStatus` returns `'Stationing'` for Saturn when it is merely moving slowly (as it does for months around its retrograde arc), every snapshot that includes Saturn in the `Stationing` state will fire the `shift` blue marker trigger.

In a 36-month monthly slider, Saturn might appear as "Stationing" for 6–8 snapshots in a row — not because it is actually stationing, but because its normal motion happens to fall below the 0.02° threshold. The blue shift markers will cluster in a region that looks like "many shifts are coming." The user will drag to those months expecting dramatic astrological events. They will find Saturn is merely moving slowly through Taurus.

The calibration is the problem. Each planet needs its own stationing threshold, not a single shared one. Mercury stations at ~0.02°/day. Jupiter at ~0.02°/day. Saturn at ~0.01°/day. Neptune and Pluto at ~0.005°/day. The current threshold is correctly calibrated for Mercury and accidentally overcalibrated for outer planets — the opposite of what the marker system needs.

### 3.3 The `applying` Flag Reverses at Snapshot Boundaries for Planets Crossing 0°/360°

The angular difference computation in `calculateTransitAspects`, lines 146–147:

```typescript
const rawAngle = Math.abs(tp.longitude - np.longitude)
const angle = rawAngle > 180 ? 360 - rawAngle : rawAngle
```

When a transit planet crosses 0° Aries (e.g., from 359.9° to 0.1° Pisces → Aries), `rawAngle` jumps from a small number (near natal longitude) to a large number (360° minus that). The `angle` computation correctly normalizes this. But the `applying` determination on lines 155–157:

```typescript
const applying = tp.dailyMotion > 0
  ? (angle > def.angle ? false : true)
  : (angle > def.angle ? true : false)
```

This logic derives applying/separating from whether `angle > def.angle`. After the 0° crossing, `angle` may have jumped from `def.angle - 0.5` to `def.angle + 0.5` (or vice versa) purely due to the modular arithmetic discontinuity. At that snapshot, the aspect is classified as separating when it was applying the day before — not because the planet reversed direction, but because the longitude wraps.

In a 30-day daily slider, any planet transiting a zodiac sign boundary will produce a flipped `applying` classification for one snapshot. If the marker scoring counts "2+ applying aspects at orb ≤ 1.5°" and one of those aspects flips to separating due to the wrap-around, a favorable marker disappears or a threshold drops below 2, removing the marker entirely. The user sees a green dot at day 14, nothing at day 15, a green dot again at day 16. The gap at day 15 is a computational artifact of ecliptic coordinate arithmetic, not a real astrological event.

### 3.4 The Monthly Average-Month Edge Case: February 28/29

The monthly snapshot loop uses `new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate())`. If `baseDate` is January 31, then:

- Offset 1: `new Date(2026, 1, 31)` → JavaScript normalizes this to March 3, 2026 (February has 28 days in 2026)
- Offset 2: `new Date(2026, 2, 31)` → March 31 (correct)
- Offset 3: `new Date(2026, 3, 31)` → JavaScript normalizes to May 1

A user born on or requesting a reading from the 29th, 30th, or 31st of any month will have their monthly advance slider skip February entirely — the February snapshot will land in early March, making "March" appear twice and "February" invisible. The slider track has 36 equidistant marks. The user will see a marker at what they believe is month 1 (February) but is actually March 3rd. The date label will show March 3rd, which will confuse them into thinking the marker is for March, not February.

This edge case affects every user with a birth date on the 29th, 30th, or 31st — roughly 9% of users based on calendar distribution. It is not a theoretical edge case.

---

## SECTION 4: MARKER SEMANTICS — WHAT THE SYSTEM CLAIMS VERSUS WHAT IT ACTUALLY KNOWS

### 4.1 The Scoring System Will Mark 15–30% of Positions as Notable — Destroying the Signal

Let me estimate marker density. For the weekly period (52 steps):

- `power`: slow planet within 1° of ASC/MC. Outer planets move 0.02–0.13°/day. At 1° orb over 52 weeks (364 days), Saturn (0.03°/day) can traverse 10.9° over the range. At any given 1° window, Saturn will be within 1° of ASC or MC for roughly 1/180th of its orbit per angle. For two angles (ASC and MC) on a ~180° visible arc, perhaps 2–3 weeks across the 52-week range will trigger this for Saturn. Add Uranus, Neptune, Pluto. Rough estimate: 6–10 power markers per 52 weeks. That is 12–19% of weekly positions.
- `shift`: station events. Mercury stations twice per retrograde cycle (~3 months), 4 times per year. Over 52 weeks: ~4 Mercury stations + 1 Jupiter, 1 Saturn, 1 Uranus, 1 Neptune, 1 Pluto. With the overcalibrated 0.02° threshold discussed in section 3.2, Saturn may contribute 3–4 "Stationing" weeks, not 1. Rough estimate: 12–16 shift markers per 52 weeks = 23–31%.

The four categories are not mutually exclusive — the vision says shift + favorable/challenging can co-display. A week with a station event and tight applying aspects could carry two dots. At 23–31% shift density plus 12–19% power density, a user looking at the weekly overview strip will see colored marks at perhaps 30–45% of all positions.

A signal that fires 30–45% of the time is not a signal. It is a colorful calendar. The "scan the whole period for peaks and valleys" use case depends on most positions being neutral (gray/empty) and notable positions standing out. If a third of all weeks carry dots, nothing stands out. The user cannot tell what is actually important.

The vision acknowledges the need for "threshold calibration per period" — loosening orbs for monthly, requiring 3+ aspects for weekly. But it provides no actual probability analysis of expected marker density. The thresholds chosen are intuitive, not empirically validated. The system will be built, tested on a handful of charts, declared complete, and deployed — without anyone measuring what fraction of positions receive markers across a representative sample of real charts.

### 4.2 The `reason` Field Will Be Generated from Heuristic Text, Not from Meaning

Each scored snapshot produces `{ category, intensity, reason }`. The `reason` is a string shown in the tooltip. The vision says the reason is "derived from `scoreSnapshot`'s `reason` field." There is no such function yet — it must be written.

What will the `reason` field say for a `favorable` marker? Probably something like "Three harmonious aspects applying within 1.5°." The user reads this and thinks: my Jupiter trine Venus is exact this week, it's the most favorable configuration in my chart, now is the best time for financial decisions. The tooltip confirms their inference.

But the marker system does not know which specific aspects are creating the score. It counts applying aspects above a threshold. The tooltip says "three tight harmonious aspects" but it does not say which three. For a meaningful tooltip, `scoreSnapshot` would need to identify the most astrologically significant aspect (by planet weight, by orb tightness, by house significance) and surface it. Writing a function that correctly ranks aspect significance requires: slow planet over fast planet priority, applying over separating priority, angle contacts over planet contacts, house-specific significance from `unknownTime` guard, and orb tightness tiebreaking.

This is the transit reading engine done again, in miniature, inside the scoring function. The vision treats it as a small addition to `computePowerDayBanner`. It is not small. The tooltip quality is what separates "the chart tells you where to look" from "the chart shows you colored dots."

### 4.3 The "Favorable" Label Can Fire on Configurations That Astrologers Would Not Call Favorable

The `favorable` category requires "Energy rating score ≥ 3 AND 2+ applying harmonious aspects with orb ≤ 1.5°." The `computeEnergyRating` function filters to classical (non-asteroid) aspects and scores harmonious +1, challenging -1. A score of ≥ 3 from 8 aspects means the top 8 include at least 5.5 harmonious on average.

The problem: "harmonious" in `calculateTransitAspects` comes from `ASPECT_DEFINITIONS`, where the `nature` field is set per aspect type. A trine is harmonious. A sextile is harmonious. But a trine from transit Saturn to natal Sun is astrologically harmonious in aspect type but may represent consolidation, responsibility, and hard work — not the "favorable" connotation the green dot implies.

The marker system uses aspect geometry (trine = harmonious) as a proxy for experiential quality. Professional astrologers do not make this substitution. A Saturn trine on a weekly marker will appear as a green dot. The user will arrange a job interview or a date on the basis of the green dot. They will find the week requires more effort, not less — Saturn trines reward discipline, not luck. The user will blame the tool.

The system encodes a simplification that is known to be wrong in the domain it claims expertise over. This is not an edge case. Saturn, Uranus, Neptune, and Pluto form harmonious aspects to natal planets throughout the 30-52 week advance range. Many of those aspects will be trines or sextiles. All of them will generate green dots. None of them will feel like "favorable" days in the colloquial sense the UI implies.

---

## SECTION 5: WHAT EVERYONE IS IGNORING THAT WILL BITE LATER

### 5.1 The `useTransition` Pattern Is Incompatible with the Tab Remount Pattern

In `TransitReadingPage.tsx`, the Advance tab content is conditionally rendered:

```typescript
{activeTab === 'advance' && (
  <div className="mb-8">
    <AdvanceTab ... />
  </div>
)}
```

Every time the user clicks the Advance tab, `AdvanceTab` mounts fresh. `useEffect` fires. `startTransition` launches `preCalculateSnapshots`. The entire 31/53/37 snapshot computation runs again.

This is the current code. The marker system makes this worse: after `setSnapshots`, the marker scoring pass runs (as a `useMemo`). So the render cycle on tab entry is: mount → useEffect → startTransition → preCalculateSnapshots (main thread stall) → setSnapshots → render → useMemo markers → marker layer render → overview strip render → 15 pulsing animation loops start.

There is no snapshot cache outside the component. There is no check "do I already have snapshots for this period/baseDate?" The computation is unconditional on every mount. A user who navigates Reading → Advance → Reading → Advance has triggered this full cycle twice. The second time is identical to the first. The work is thrown away on unmount and repeated on remount.

The defensive fix — caching the snapshots in a parent component or in context — would require lifting state out of `AdvanceTab` and into `TransitReadingPage`. This is architecturally correct but nontrivial. If it is not done before the marker layer is shipped, the marker layer will also be computed twice. The longer the computation, the more painful the duplicate work.

### 5.2 The Marker System Will Be Inconsistent with the Timeline Tab — Because They Compute Differently

The `Timeline` tab uses `buildTransitTimeline` from `transitTimeline.ts`, which uses `findAspectPerfections` — binary search to find the exact moment each aspect becomes exact. This is high-precision event detection.

The `Advance` tab uses `preCalculateSnapshots`, which samples one snapshot per step and computes aspects at that moment. An aspect that perfects at day 14.7 will appear in the day 14 snapshot and day 15 snapshot, but the orb will be different at each. The marker system will mark day 14 or day 15 based on which has the tighter orb. The Timeline tab will show the aspect as exact on "Day 14, 17:30."

The user who has both tabs open will compare them. They will see a green marker on the Advance slider at day 14, and the Timeline tab showing the aspect's exact perfection at day 14. They will feel the system is consistent. Then they will encounter a case where the Advance marker fires at day 15 (the orb was tighter on day 15's sample), and the Timeline shows exact at day 14. They will trust neither.

There is no documented reconciliation between the two systems. The vision explicitly says "do not call `buildTransitTimeline` again" for performance reasons. The two systems will diverge whenever an aspect perfects between samples (which is most aspects, since daily motion is faster than the sampling interval).

### 5.3 The Overview Strip Anchoring on Mobile Is a Usability Catastrophe Waiting to Happen

The overview strip is proposed as a `w-full h-6` bar with `pointer-events-none` on the marker overlay and separate click handlers on each dot. On desktop, clicking a dot to jump the slider is intuitive. On mobile, the strip is `h-6` (24px). A colored dot that must be tapped precisely on a 24px-tall strip is below the minimum recommended touch target of 44px (Apple HIG) and 48dp (Google Material). A user trying to tap a dot cluster at 2/3 of the strip will frequently tap an adjacent dot or miss entirely.

This will not surface during desktop development testing. It will surface in every mobile session where a user tries to navigate by tapping the strip. The developer will rationalize: "they can use the slider." But the strip's stated purpose is "the primary navigation affordance" for weekly and monthly periods (the vision's words). If the primary navigation affordance is untappable on mobile, the feature degrades to decorative for the majority of users.

The fix — making each dot a minimum 44×44px tap target with transparent padding — requires absolute positioning math that conflicts with the tight `h-6` strip height. Either the strip grows (changing the visual design) or the tap targets overlap (making adjacent dots indistinguishable). This tradeoff should be decided before implementation, not discovered during user testing.

### 5.4 The `baseDate` Is Constructed from a String in the Transit Reading Page — And Contains a UTC Midnight Trap

`AdvanceTab` receives `baseDate` from `TransitReadingPage.tsx`:

```typescript
baseDate={new Date(transitData.dateRange.start + 'T12:00:00')}
```

The `T12:00:00` suffix forces noon local time, avoiding the UTC-midnight-to-previous-day trap. This is defensive. However, in the monthly advance mode, `preCalculateSnapshots` does:

```typescript
targetDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate())
```

`new Date(year, month, day)` creates a local-time midnight date. The time-of-day is reset to 00:00:00 local, regardless of the `baseDate`'s time component (12:00:00). So snapshot 0 is at 12:00:00 local (from `baseDate`), but snapshot 1 onward is at 00:00:00 local — midnight. Planetary positions computed at midnight local time will differ from those computed at noon by up to ~13° for the Moon and ~0.5° for Mercury. The Moon changes sign at a rate of ~13°/day. A Moon sign that was in Aries at noon might be in Aries at midnight, or might have just entered Taurus.

The Moon is the fastest-moving body in the aspect system. It changes sign roughly every 2.5 days. In the monthly advance, each step is ~30 days apart. The Moon's sign at a monthly sample is essentially random — no prediction about the Moon is meaningful at monthly resolution. This is the correct interpretation. But if the scoring system counts Moon aspects in its `computeEnergyRating` computation (and it does — Moon is in `PLANET_NAMES` and thus in transit aspects), then the Moon's arbitrary position at midnight vs. noon will create scoring noise that pollutes the marker signal.

The correct fix: use noon (12:00:00) for all advance snapshots, not just snapshot 0. The monthly branch currently resets time to midnight. This is a latent inconsistency in the existing code that becomes a systematic bias when the scoring layer is added.

---

## SUMMARY: RISKS RANKED BY SEVERITY FOR SPRINT 0018

| Risk | Severity | Location | Will It Be Hit? |
|------|----------|----------|----------------|
| `preCalculateSnapshots` blocks main thread on tab switch; computation is repeated on every remount | HIGH | AdvanceTab.tsx:167–201, TransitReadingPage.tsx:366 | Every Advance tab visit on mobile |
| `applying` flag misfires at retrograde stations; favorable/challenging markers flicker at exact station dates | HIGH | transits.ts:154–157 | Every Mercury, Venus, Mars station within the advance range |
| Saturn/Neptune/Pluto fall below 0.02° stationing threshold during normal slow motion; blue shift markers over-fire | HIGH | transits.ts:238, getRetrogradeStatus | Every 36-month monthly view; outer planet "stations" for weeks |
| Monthly snapshot dates reset to midnight for offset ≥ 1; Moon position inconsistency corrupts energy scoring | HIGH | AdvanceTab.tsx:180 | All monthly advance readings |
| Marker density 30–45% for weekly period; strip becomes noise, not signal | HIGH | scoreSnapshot design | Every chart, immediately after shipping |
| February 29/30/31 baseDate causes month skipping; marker at wrong calendar position | MEDIUM | AdvanceTab.tsx:178–181 | ~9% of users (end-of-month birth dates) |
| Longitude wrap-around at 0° Aries flips applying/separating for one snapshot; gap in marker run | MEDIUM | transits.ts:146–157 | Any transit planet crossing Aries in the advance window |
| `unknownTime` charts receive no explanation for absent gold/power markers | MEDIUM | computePowerDayBanner guard, no UI indicator | All users with unknown birth time |
| Box-shadow glow animations on 15 dots drain battery on mobile at 60fps | MEDIUM | CSS animation implementation | All mobile users |
| Overview strip dots are 24px tall; untappable on mobile | MEDIUM | strip design, h-6 | All mobile users using strip navigation |
| `computeEnergyRating` caps at 8 aspects; dense configurations indistinguishable from sparse ones | MEDIUM | transits.ts:486 | Charts with many simultaneous transits |
| Saturn/Jupiter trines labeled "favorable" (green marker); user expects effortless results; finds they must work | MEDIUM | Scoring semantics | Every chart with outer planet harmonious transits |
| Timeline tab and Advance markers disagree on which day an aspect peaks; user trusts neither | LOW (now), HIGH (after discovery) | Architectural: transitTimeline.ts vs. AdvanceTab.tsx | Any user comparing tabs |
| Monthly marker visual spacing implies uniform time intervals; February shortens actual spacing | LOW | Overview strip rendering | Monthly period, all users |

---

## DEFENSIVE DESIGN PROPOSALS

**Against the blocking computation:** Add a snapshot cache keyed by `(period, baseDate.toISOString())` in `TransitReadingPage` or context. On tab entry, check cache before launching `startTransition`. This prevents the repeated-computation-on-remount problem without requiring a Web Worker — which is the correct long-term fix but is architecturally disruptive.

**Against the stationing threshold overfire:** Replace the single `0.02°` threshold with a per-planet map: `{ Mercury: 0.02, Venus: 0.05, Mars: 0.03, Jupiter: 0.015, Saturn: 0.01, Uranus: 0.008, Neptune: 0.006, Pluto: 0.005 }`. These thresholds should reflect actual station velocities, not a single shared intuition. This change belongs in `getRetrogradeStatus`, and the marker system should inherit the corrected data automatically.

**Against the midnight-reset in monthly snapshots:** Change the monthly branch in `preCalculateSnapshots` to: `new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate(), 12, 0, 0)`. One argument added. Zero architectural change.

**Against marker density overload:** Implement a global cap: no period should have more than 20% of positions marked. After scoring all snapshots, sort by `intensity` descending, retain only the top 20% of non-neutral results, discard the rest. This transforms the marker system from "everything above threshold" to "the most significant moments above threshold" — which is what the vision intends.

**Against the tooltip hollowness:** `scoreSnapshot` must name the specific aspect driving the score — not just the count. The function should return `{ category, intensity, reason, triggerAspect: { transitPlanet, natalPlanet, type, orb } | null }`. The tooltip renders "Saturn trines your natal Venus — a grounding, consolidating moment" rather than "Three tight aspects converge." This requires knowing which aspect is the most astrologically significant, which requires a planet-weight map. It is worth building correctly.

**Against the mobile touch target problem:** Make the overview strip `h-10` (40px) with the dots centered vertically, not `h-6`. The visual dot is still small; the tap target is not. This is the standard pattern for small interactive elements on touch surfaces.

**Against the applying flag flicker:** Add a hysteresis: a marker category does not change if the orb delta between consecutive snapshots is less than 0.3° and the `applying` flip is the only difference. Markers should be stable across consecutive snapshots unless the astrological situation meaningfully changes.

---

## THE THING THAT CANNOT BE FIXED THIS SPRINT BUT MUST BE ACKNOWLEDGED

The Advance tab's marker system claims to tell users where to look before they look. It is a confidence claim made in color. Green says: go here, this is good. Red says: be careful here. Gold says: this is important.

The claim rests on a scoring function that has never been run against a validated set of chart moments and assessed for accuracy by a working astrologer. We do not know whether green markers correlate with what professional astrologers would call "favorable" periods. We do not know whether the power day trigger fires on the right days or fires on days that look good computationally but feel nothing to real people.

The system is visually authoritative. Colored animated dots on a slider feel like a prediction. They are not predictions — they are threshold crossings in an unvalidated heuristic. The product is about to ship a more confident UI for a calculation that has not earned that confidence.

This is not a reason to not ship. It is a reason to include, somewhere visible, an acknowledgment that the markers are astrological signals derived from the chart — not guarantees. The vision already says "not a gamification sprint" and "not achievements." But no label in the proposed UI says "these markers show planetary configurations, not predicted outcomes." The user will infer outcome prediction from the color and animation. That inference is the product's most fragile assumption.

---

**—Nassim Taleb**

*Every system that makes predictions derives its credibility from the accuracy of past predictions. This system has no past predictions — it is being shipped for the first time. The colored dots will look authoritative on day one. On day 90, after users have dragged to green markers and not found what they expected, the credibility will have been spent. The question is not whether to ship. The question is whether the thresholds, the density controls, and the tooltip specificity are honest enough that the first 90 days build trust rather than exhaust it.*
