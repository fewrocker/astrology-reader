# Proposal: issue-couple-advance-banner-bold-fragment

**Type:** Issue Fix
**Originated by:** Jobs, Miyazaki, Carmack

---

## Problem

The `CoupleAdvanceTab` banner uses the pre-sprint-0019 `categoryBanner.split(' ')[0]` pattern to select the bold fragment, and its three reason builder functions return bare `string` values rather than the structured `{ reason, bannerBoldFragment, guidance? }` objects introduced in sprint-0019 for `AdvanceTab`.

### Root cause — builder return types

All three couple reason builders in `/projects/astrology-reader/src/components/reading/CoupleAdvanceTab.tsx` have `): string` signatures:

- `buildCouplePowerReason` — line 48
- `buildCoupleAspectReason` — line 60
- `buildCoupleShiftReason` — line 82

The equivalent individual builders in `/projects/astrology-reader/src/components/reading/AdvanceTab.tsx` — `buildPowerReason` (line 511) and `buildAspectReason` (line 533) — return `{ reason: string; bannerBoldFragment: string; guidance?: string }`. The couple builders were never updated to match this shape. As a result, `SnapshotScore.bannerBoldFragment` is never set by the couple scoring path, and `SnapshotScore.guidance` is never populated.

### Root cause — banner render

`CoupleAdvanceTab.tsx` line 678–679:

```tsx
<span className="font-heading">{categoryBanner.split(' ')[0]}</span>
{' ' + categoryBanner.split(' ').slice(1).join(' ')}
```

This splits on whitespace and bolds whatever word happens to open the sentence. This is the pattern `AdvanceTab` replaced in sprint-0019 with the explicit `bannerBoldFragment` field. The `AdvanceTab` banner at lines 1513–1514 reads:

```tsx
<span className="font-heading">{snapshot.score.bannerBoldFragment ?? categoryBanner.split(' ')[0]}</span>
{' ' + categoryBanner.slice((snapshot.score.bannerBoldFragment ?? categoryBanner.split(' ')[0]).length).trimStart()}
```

The couple banner never adopted this pattern and has no fallback guard.

### Root cause — no guidance paragraph

`AdvanceTab` renders a second paragraph for guidance at lines 1516–1520:

```tsx
{snapshot.score.guidance && (
  <p className="text-xs text-mystic-muted/80 mt-1.5 font-light leading-relaxed">
    {snapshot.score.guidance}
  </p>
)}
```

`CoupleAdvanceTab`'s banner block (lines 647–682) contains only a single `<p>` element for the reason string. The `guidance` field is defined on `SnapshotScore` (imported from `AdvanceTab`) and is rendered in the individual tab, but no code in `CoupleAdvanceTab` reads or renders it.

### Observable defect

The split-on-first-word logic bolds the transit planet name by accident when builder functions happen to open with the planet — for example, "**Jupiter** flows through…" or "**Saturn** reaches…". This appears correct in the common case. However, `buildCoupleAspectReason` contains an `else` branch (line 65) that produces reason strings beginning with "the relationship's…" (e.g., "the relationship's drive and desire is under pressure in this period."). When this branch fires, "**the**" is bolded — the article, not the planet name. This is incorrect behavior and is structurally guaranteed to recur whenever a reason string's first word is not the transit planet name.

### Reproduction path

1. Open the couple advance tab for any chart pair.
2. Advance to a period where `buildCoupleAspectReason` fires for a natal planet that has no entry in `COMPOSITE_PLANET_PHRASES` (the `else` branch, line 64–70) — this produces a reason string starting with the transit planet name by coincidence.
3. Alternatively, observe that no guidance paragraph ever appears in any couple advance banner regardless of marker category, unlike the individual advance tab which shows the second paragraph for every scored marker.

---

## Expected Behavior

**Banner bold fragment:** The couple banner should bold the transit planet name — explicitly, not by word-position accident. Every return path in `buildCouplePowerReason`, `buildCoupleAspectReason`, and `buildCoupleShiftReason` should include a `bannerBoldFragment` field set to the planet name (e.g., `bannerBoldFragment: planet` or `bannerBoldFragment: tightest.transitPlanet`). The banner render block at `CoupleAdvanceTab.tsx` lines 678–679 should be updated to match the `AdvanceTab` pattern at lines 1513–1514, reading `snapshot.score.bannerBoldFragment` directly rather than splitting the reason string.

**Guidance paragraph:** Each of the three builders should return a `guidance?: string` field populated with relationship-native guidance language. The guidance must not reuse entries from `ASPECT_GUIDANCE` (the individual-advance table in `AdvanceTab.tsx`) with surface-level pronoun substitution. Guidance sentences for couple advance must address two people — using "the two of you", "together", "between you", or equivalent relational framing — and must describe what the moment means for a shared dynamic, not for an individual. A separate `COUPLE_ASPECT_GUIDANCE` table keyed by `"${planet}|${nature}"` is the appropriate structure, mirroring the individual tab's `ASPECT_GUIDANCE` but written in relationship-first voice.

The couple banner render block should mirror the full `AdvanceTab` pattern: a `<div>` wrapper, the reason `<p>` with `bannerBoldFragment` for the bold span, and a conditional second `<p>` with `text-xs text-mystic-muted/80 mt-1.5 font-light leading-relaxed` styling for the guidance text — identical DOM structure to `AdvanceTab.tsx` lines 1503–1521.
