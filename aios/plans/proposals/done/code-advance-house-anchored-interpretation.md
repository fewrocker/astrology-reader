# code-advance-house-anchored-interpretation

**Type:** Code Enhancement
**Originated by:** Jobs, Carmack, Miyazaki, Taleb
**Sprint vision:** sprint-0019

---

## Problem / Opportunity

### The house is in the data. The reason string ignores it entirely.

Every `TransitAspect` carries `natalHouse: number | null` — computed by `calculateTransitAspects` in `src/engine/transits.ts` (interface at line 33). The field is never `null` when the chart has a known birth time. Yet `buildAspectReason()` in `src/components/reading/AdvanceTab.tsx` (lines 175–196) never reads it. The function instead reaches for a `domainMap` keyed on the *transit* planet's name:

```typescript
const domainMap: Partial<Record<string, string>> = {
  Saturn: 'structure and discipline',
  Jupiter: 'expansion and opportunity',
  // ...
}
// line 192–195:
if (category === 'favorable') {
  return `${planet} ${type} your natal ${natalPlanet} — a window of ${domain}.`
} else {
  return `${planet} ${type} your natal ${natalPlanet} — tension around ${domain}.`
}
```

The result is a sentence that is true for every human being with that transit. Saturn opposing natal Moon always produces "tension around structure and discipline" — regardless of whether the Moon sits in the 4th house (home and family foundations), the 7th (committed partnerships), or the 10th (career and public life). Those are three entirely different lived experiences. The system cannot distinguish them.

**Current output — Saturn opposing natal Moon in the 7th:**
> "Saturn opposition your natal Moon — tension around structure and discipline."

**What it should say:**
> "Saturn pressing on your Moon in your 7th house (partnerships) — an emotional pattern in your closest relationships is being examined. What you reach for when a bond feels unstable may not settle it this time."

The same failure applies to `buildPowerReason()` (lines 161–170). It names the angle but not what concurrent transits are hitting, and its `ANGLE_DOMAIN` lookup (lines 114–117) hard-codes two static phrases — one for ASC, one for MC — that will appear identically for every user every time a slow planet contacts that angle:

```typescript
const ANGLE_DOMAIN: Record<'ASC' | 'MC', string> = {
  ASC: 'a significant moment for identity and how the world first meets you',
  MC: 'a significant moment for career decisions and public commitments',
}
// line 169:
return `${planet} ${verb} ${angleName} — ${domain}.`
```

**Current output — Saturn conjunct Ascendant:**
> "Saturn reaches your Ascendant — a significant moment for identity and how the world first meets you."

**What it should say:**
> "Saturn arrives at your Ascendant — the way you carry yourself in the world is being restructured. What others have always assumed about you may not hold. This is a period to let the old presentation go deliberately rather than waiting for it to be stripped away."

### Two interpretation paths exist for the same transit. The better one is not used by scoring.

`computeTransitAspectBrief()` in `src/data/interpretations/transitAspectBriefs.ts` (lines 115–163) already generates house-anchored, verb-table-driven sentences for individual aspect rows. Its output for Saturn pressing on natal Moon in the 4th house reads:

> "Saturn pressing on your House of Home — The 4th house is the foundation of your chart — your home, family lineage, emotional roots, and the private self you show only to those closest to you."

The function uses `TRANSIT_PLANET_PHRASES` (lines 30–86) — 10 planets × 3 natures × 2 directions — and `getHouseTheme()` from `houseThemes.ts`. It produces a living sentence. It is already imported in `AdvanceTab.tsx` (line 13) and called at line 1098 for the `AspectRow` components in the transit list below the slider.

`buildAspectReason()` is a second, parallel text-generation path sitting 85 lines above the import. It uses a flat `domainMap` instead of the phrase table, ignores `natalHouse` entirely, and produces sentences of significantly lower quality. A user looking at the same transit sees different language in the aspect row versus the marker banner — the row has house context, the banner does not.

This divergence will grow. Every improvement to `computeTransitAspectBrief` requires a separate, duplicate effort in `buildAspectReason` to avoid regression. The gap between the two paths is already visible to users as inconsistency; it will become visible as contradiction.

### Shift marker reason strings name the planet but not what it is sitting on.

When `scoreSnapshot()` (lines 282–331) detects a station crossing, it returns:

```typescript
reason: `${stationPlanet} stations ${stationDirection}.`
```

For Saturn stationing retrograde, this produces:

**Current output:**
> "Saturn stations retrograde."

This is a calendar fact, not an interpretation. It contains no information about what natal planet or house the station falls near — which is the entire meaning of the event for this person. The station degree is already computable from the `snapshot.transitPlanets` positions. `TRANSIT_RETROGRADE` in `src/data/interpretations/retrogrades.ts` (lines 72–105) already contains planet-specific brief strings: Saturn's entry reads "Revisit structures and responsibilities you've built." These briefs are used in the retrograde activity section at the bottom of the Advance tab but are not wired into the shift marker `reason` field of `SnapshotScore`.

More importantly, the station marker has no awareness of which natal planet sits closest to the station degree. Saturn stationing at 15° Pisces when a user's natal Mars sits at 14°48' Pisces is one of the most sustained, high-intensity transit contacts possible — the station holds the transit within a fraction of a degree for weeks. The current system has no mechanism to detect this proximity and name it.

**What it should say:**
> "Saturn slows to a halt directly over your natal Mars in your 10th house (career and ambition) — a sustained period of pressure on how you assert yourself professionally is beginning. This is not one difficult week; it is several months of deepened examination of that area."

### No action guidance exists anywhere in the reason string layer.

The `SnapshotScore` interface (lines 19–32) carries one text field: `reason`. The banner display (`formatScoreAsBannerText` at line 395–397) returns `score.reason` unchanged for all surfaces. No favorable window tells the user what to do with it. No challenging period tells the user what posture to hold.

**Favorable — current:**
> "Jupiter sextile your natal Venus — a window of expansion and opportunity."

A user reading this does not know whether to ask someone out, send the proposal, launch the creative project, or book the trip. All of those actions are correct for this transit. The product says nothing.

**Challenging — current:**
> "Saturn opposition your natal Moon — tension around structure and discipline."

A user reading this does not know whether to avoid major decisions, face a pattern directly, give themselves more space, or double down on routine. The planet and the aspect have a well-defined posture. The product withholds it.

This omission is not minor. The difference between astrology as curiosity and astrology as practical tool is exactly this guidance layer. The marker system was built to answer "when should I pay attention?" Sprint 0019 must answer "and what should I do when I get there?"

---

## Desired State

### A single house-aware interpretation path

The boundary between `buildAspectReason()` and `computeTransitAspectBrief()` should not exist. The reason string on a `SnapshotScore` must be generated by the same infrastructure that generates aspect row briefs — using `TRANSIT_PLANET_PHRASES`, `getHouseTheme()`, and the `natalHouse` field already present on every `TransitAspect`. There is one source of truth for transit language, and it is house-aware.

The marker reason string is shorter and more punchy than an aspect row brief — it must land in one sentence — but it draws from the same phrase table and the same house vocabulary. A user scanning the marker banner and then looking at the matching aspect row below should feel the same interpretive intelligence at work, not two separate systems with different levels of care.

Every reason string involving a natal planet names that planet's house and gives a plain-English phrase for what that house governs. Not "your natal Moon" — "your Moon in your 4th house (home and family)" or "your Moon in your 7th house (partnerships)." The house context is not decorative. It is the entire difference between a message about this person and a message about everyone.

### Shift markers that name what they are sitting on

A station marker reason string does two things the current one does not: it pulls the planet's brief from `TRANSIT_RETROGRADE` and it names the nearest natal planet (if within roughly 2°) and the house that planet occupies. The tone shifts from announcement to preparation — the user understands not just that a station is occurring but what area of their life is about to receive sustained attention, and roughly for how long.

When the station falls between natal planets without a close hit, the reason uses the house the station degree falls in (computable from the natal house cusps) to give location. "Saturn stations retrograde in your 6th house (daily work and health) — the routines and structures you've built around your work life are being asked to go inward and be reassessed." This is still specific to the person's chart even without a natal planet in exact contact.

### Action guidance as a distinct field

`SnapshotScore` carries an optional `guidance` field alongside `reason`. The `reason` is the one-sentence identification of the moment — what is happening, where it falls, what it feels like. The `guidance` is the navigational sentence — what kind of action or posture the moment supports.

The `guidance` field is not shown in the tooltip (too small). It appears only in the expanded banner when the user has navigated to that position, as a second line below the `reason`. This architectural split keeps the tooltip tight while giving the banner real depth.

Guidance is not generic planetary wisdom. It is specific to the combination. Jupiter expanding natal Venus in the 5th house carries different guidance than Jupiter expanding natal Saturn in the 10th. The former: initiate, reach out, express, seek pleasure deliberately. The latter: commit to the structure you've been building, allow an ambition that felt uncertain to become solid. The guidance phrases are generated from the intersection of transit planet archetype, aspect nature, and natal house domain — not from a flat table of planetary keywords.

### Interpretation language that matches the quality of the synastry layer

`src/data/interpretations/synastryAspectBriefs.ts` and `src/data/interpretations/synastryHouseOverlayBriefs.ts` demonstrate what the product's interpretation voice can achieve. Lines like "your emotional rhythms overlap — you instinctively know what the other needs, and the shared undercurrent can feel like coming home" are written with awareness that a human being will read them in a moment of genuine reflection.

The advance scoring reason strings should operate from the same commitment. Not the same emotional register — the advance layer addresses one person's future, which calls for a more navigational, less lyrical voice — but the same specificity and the same willingness to say something true rather than something merely correct.

The quality bar: a reason string passes if a thoughtful person can read it and say "yes, that is what that feels like" or "I hadn't thought about it that way but that fits." It fails if the person reads it and says "so what do I do?" — meaning the product said nothing actionable — or "that could be anyone" — meaning the house context was absent and the message was generic.

The system already knows which weeks matter. It must now say something worth knowing when someone arrives at one of those weeks.
