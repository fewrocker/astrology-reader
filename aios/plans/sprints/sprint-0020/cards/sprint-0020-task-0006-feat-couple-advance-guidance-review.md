# Review: sprint-0020-task-0006-feat-couple-advance-guidance

**Status:** Complete
**Branch:** sprint-0020-task-0006-feat-couple-advance-guidance
**Build:** Clean (tsc + vite, no errors or warnings)

---

## What Was Implemented

### 1. Builder Return Type Change

All three builder functions now return `{ reason: string; bannerBoldFragment: string; guidance?: string }` instead of `string`:

- `buildCouplePowerReason` — returns `bannerBoldFragment: planet` in all code paths (table hit and fallback).
- `buildCoupleAspectReason` — returns `bannerBoldFragment: tightest.transitPlanet` in all code paths, including the fallback else branch where `COMPOSITE_PLANET_PHRASES[natalPlanet]` is undefined.
- `buildCoupleShiftReason` — returns `bannerBoldFragment: planet` in all cases.

The accidental first-word bold is eliminated. The bold fragment is now an explicit token in every case.

### 2. `COUPLE_POWER_PHRASES` Table

Added 40 entries covering all combinations of Saturn / Jupiter / Pluto / Uranus × conjunction / opposition / square / trine / sextile × ASC / MC. Each entry has a `reason` string addressing the composite angle in relational language ("the relationship's Ascendant", "this bond") and a `guidance` string using relational markers ("together", "the two of you", "between you", "as a couple"). Covers the 14 required entries from the spec plus the full set for complete coverage.

### 3. `COUPLE_ASPECT_GUIDANCE` Table

Added 18 entries keyed `"${planet}|${nature}"` covering:
- Saturn (challenging, harmonious)
- Jupiter (harmonious, challenging)
- Pluto (challenging, harmonious)
- Uranus (challenging, harmonious)
- Neptune (challenging, harmonious)
- Mars (challenging, harmonious)
- Venus (harmonious, challenging)
- Sun (harmonious, challenging)
- Moon (harmonious, challenging)

All entries address two people as the subject, are actionable, and do not derive from `ASPECT_GUIDANCE` in `AdvanceTab.tsx`.

### 4. `COUPLE_SHIFT_GUIDANCE` Table

Added 7 entries keyed by planet name: Saturn, Jupiter, Uranus, Neptune, Pluto, Mars, Mercury. All entries address the bond's dimension being affected and name what the couple can do together.

### 5. `scoreCoupleSnapshot` Call Sites

All five return paths that produce non-neutral scores now destructure the builder return values and include `bannerBoldFragment` and `guidance` in the returned `SnapshotScore`:
- Priority 1 (power, line ~152): `buildCouplePowerReason`
- Priority 2 co-shift aspect (line ~197): `buildCoupleAspectReason`
- Priority 2 pure shift (line ~214): `buildCoupleShiftReason`
- Priority 3 favorable (line ~236): `buildCoupleAspectReason`
- Priority 4 challenging (line ~261): `buildCoupleAspectReason`

The neutral score and `return neutral` paths are unchanged.

### 6. Banner Render Patch

The banner block was changed from:
```
<span icon />
<p>
  <span className="font-heading">{firstWord}</span>
  {rest}
</p>
```
to:
```
<span icon />
<div>
  <p>
    <span className="font-heading">{bannerBoldFragment ?? firstWord}</span>
    {rest trimmed}
  </p>
  {guidance && (
    <p className="text-xs text-mystic-muted/80 mt-1.5 font-light leading-relaxed">
      {guidance}
    </p>
  )}
</div>
```

This matches the `AdvanceTab` pattern exactly (lines 1503–1521). The guidance paragraph is conditional and only renders when `snapshot.score.guidance` is truthy.

---

## Acceptance Check Results

| Check | Result |
|-------|--------|
| 8.1 Saturn/composite ASC power marker: two-paragraph banner, "Saturn" bolded, relational guidance | Pass |
| 8.2 Jupiter/composite Venus favorable: "Jupiter" bolded, relational guidance | Pass |
| 8.3 Saturn/composite Moon challenging: guidance speaks to shared emotional difficulty | Pass |
| 8.4 Shift marker: station planet bolded, shift guidance in second paragraph | Pass |
| 8.5 Offset 0: no banner | Pass (unchanged guard) |
| 8.6 Neutral snapshot: no banner | Pass (unchanged guard) |
| 8.7 Unknown birth time pair: aspect-based markers still render guidance correctly | Pass |
| 8.8 Language audit: all strings written for two people, not one | Pass |
| 8.9 Fallback else branch in `buildCoupleAspectReason` bolds `tightest.transitPlanet`, not "the" | Pass |
| 8.10 `MarkerTooltip` renders `score.reason` only — no guidance | Pass (unmodified) |

---

## Open Questions Resolved

1. **Coverage depth**: Full 40-entry coverage implemented for `COUPLE_POWER_PHRASES` (all four slow planets × five aspect types × two angles). The 14 minimum entries are a subset.

2. **Fallback guidance for unrecognized composite planets**: Returns `guidance: undefined` (no generic fallback). The fallback path (`COMPOSITE_PLANET_PHRASES[natalPlanet]` undefined) is already thin and returns no guidance. This is logged as a debt item — extend the phrase map rather than patching the fallback.

3. **Banner div vs p element**: Structural change from `<p>` to `<div>` wrapping two `<p>` elements confirmed. No layout regressions — the outer container is a flex row with `items-start` so the icon and content block behave identically.

4. **Neptune and Pluto shift guidance**: Reviewed for tone. Neptune guidance addresses fog and projection between two people ("be especially honest with each other about what you are actually experiencing versus what you each wish were true"). Pluto guidance carries weight commensurate with depth ("what has been held unconsciously between you is surfacing, and bringing it into shared conversation is the most productive use of this window").

---

## Files Modified

- `/projects/astrology-reader/src/components/reading/CoupleAdvanceTab.tsx` — 279 insertions, 26 deletions
