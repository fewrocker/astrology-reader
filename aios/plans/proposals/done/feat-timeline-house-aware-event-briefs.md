---
**Type:** Feature
**Originated by:** Jobs, Carmack, Miyazaki, Taleb (all four voices)
**Depends on:** `code-transit-aspect-natal-house-embedding`
---

## Problem / Opportunity

`getAspectPerfectionBrief` in `src/data/interpretations/transitEvents.ts` returns the same string
for every user who shares a given `(transitPlanet, aspectType, natalPlanet)` combination. The
function signature is:

```ts
function getAspectPerfectionBrief(
  aspectType: AspectType,
  natalPlanet: PlanetName | 'NorthNode',
): string
```

It has no `natalHouse` parameter. The result is that a user whose natal Venus sits in House 2
(money, values, self-worth) and a user whose natal Venus sits in House 7 (committed partnerships,
one-on-one relating) both receive the identical `EventCard` expansion text on a Mercury-trine-Venus
perfection: `"Smooth communication, helpful ideas"` — a sentence that speaks to neither life area.

The natal planet's house is what distinguishes *your* Mercury-trine-Venus experience from anyone
else's. That house number is already present in `natalChart.planets` at `buildTransitTimeline`
call-time and is available on each `PlanetPosition` object as `np.house` inside
`findAspectPerfections`. It is discarded when the `TimelineEvent` is constructed because
`TimelineEvent` has no field to hold it.

The `TransitTimeline` component (`src/components/reading/TransitTimeline.tsx`) receives only
`days: TimelineDay[]` — no `chartData` prop — so there is currently no runtime path from the
component to the natal house number either. The house data must travel embedded in the event
object itself.

The static interpretation layer already has everything needed to produce house-aware text:
`HOUSE_THEMES` in `src/data/interpretations/houseThemes.ts` provides a `name` and `theme` string
for each of the twelve houses; `PLANET_IN_HOUSE` in `src/data/interpretations/planetInHouse.ts`
provides a `brief` field for every planet-in-house combination. No new interpretation entries are
required. The gap is purely structural: a missing field on `TimelineEvent` and a missing parameter
on `getAspectPerfectionBrief`.

This proposal closes that gap. The result is that each aspect-perfection `EventCard` in
`TransitTimeline` delivers a one-to-two sentence brief that names the specific life area the natal
planet governs for this user — without a GPT call, without a new API endpoint, and without new
interpretation data.

---

## Vision

A user who opens the Timeline tab sees their upcoming transits as a personal sky diary rather than
a generic planetary calendar. When they expand an aspect-perfection card for "Mercury trine natal
Venus," the expanded text reads differently depending on where their Venus lives:

- **2nd-house Venus:** "Mercury trine your 2nd-house Venus: financial conversations flow easily
  this week — a good time to negotiate, invoice, or revisit what you charge for your work."
- **7th-house Venus:** "Mercury trine your 7th-house Venus: a good day for a clear, direct
  conversation with someone close — your words will be received warmly."
- **12th-house Venus:** "Mercury trine your 12th-house Venus: insights into a hidden affection or
  private creative project flow naturally — what you sense but rarely say can be expressed now."

The brief is house-specific for all covered combinations. For uncovered combinations (rare natal
planet / house pairings where the house-branching table has no entry), the function falls back to
the existing generic text (`ASPECT_BRIEFS[aspectType][natalPlanet]`), which is always correct even
if it is not personalized. The user is never shown a blank card or an error.

This enhancement is invisible in its architecture and obvious in its result: the same component
rendering the same event cards, but each card now speaking to the individual user's chart rather
than to astrology-in-general.

---

## Specifications

**1. Prerequisite dependency on `code-transit-aspect-natal-house-embedding`**

This proposal depends on the `code-transit-aspect-natal-house-embedding` prerequisite being
shipped first. That prerequisite adds `natalHouse?: number | null` to the `TimelineEvent`
interface in `src/engine/transitTimeline.ts` and populates it from `np.house` inside
`findAspectPerfections`. If this prerequisite has not shipped, implement it as the first step of
this proposal before touching `transitEvents.ts` or `TransitTimeline.tsx`.

**2. `TimelineEvent` interface field: `natalHouse`**

The `TimelineEvent` interface in `src/engine/transitTimeline.ts` must gain exactly one new
optional field:

```ts
natalHouse?: number | null
```

The field is typed `number | null` (not merely `number`) because `natalHouse` must be `null`
when `chartData.unknownTime` is `true` — the astronomy engine does not compute house cusps without
a birth time and all planet house values are meaningless in that case. The field must be optional
(`?`) so that non-aspect-perfection event types (`sign-ingress`, `retrograde-station`,
`lunar-phase`, `moon-sign-change`) continue to construct without providing it.

**3. Population of `natalHouse` in `findAspectPerfections`**

Inside `findAspectPerfections` in `src/engine/transitTimeline.ts`, the event constructor at lines
192–204 iterates `np` over `natalPlanets: PlanetPosition[]`. At this point `np.house` is in
scope. The event construction must be updated to include:

```ts
natalHouse: natalChart.unknownTime ? null : (np.house > 0 ? np.house : null),
```

The `> 0` guard rejects the sentinel value `0` that `calculateCurrentPositions` uses to initialise
transit planet house before `assignTransitHouses` runs. A natal planet carries its house from the
birth chart calculation; a value of `0` indicates the house was never computed (only possible when
`unknownTime` is true, but the guard makes the intent explicit and safe).

Note that `findAspectPerfections` currently receives `natalPlanets: PlanetPosition[]` but not the
`ChartData` object itself. `buildTransitTimeline` — which calls `findAspectPerfections` — does
receive `natalChart: ChartData`. The `unknownTime` flag must be threaded through: either pass
`natalChart` to `findAspectPerfections` in place of `natalPlanets`, or pass `unknownTime: boolean`
as a separate parameter. The simpler change is the separate boolean; the cleaner change is
replacing `natalPlanets` with `natalChart` and destructuring `natalChart.planets` inside.
Either approach is acceptable; the implementer must choose one and be consistent.

**4. New function `getPersonalizedEventBrief`**

Introduce a new exported function in `src/data/interpretations/transitEvents.ts`:

```ts
export function getPersonalizedEventBrief(
  aspectType: AspectType,
  natalPlanet: PlanetName | 'NorthNode',
  natalHouse: number | null,
): string
```

This function is the replacement call site for `getAspectPerfectionBrief` inside `TransitTimeline.tsx`.
It must:

1. If `natalHouse` is `null` or `0` or not in `[1..12]`, fall back immediately to
   `getAspectPerfectionBrief(aspectType, natalPlanet)` — the existing generic text.
2. Otherwise, attempt a house-aware lookup via `HOUSE_BRIEF_BY_PLANET_ASPECT_HOUSE` (see spec 5).
3. If the house-aware lookup returns no entry for this combination, fall back to
   `getAspectPerfectionBrief(aspectType, natalPlanet)`.

The function must never return an empty string. If both lookups miss, return the aspect-type
`default` from `ASPECT_BRIEFS`.

**5. House-aware brief table `HOUSE_BRIEF_BY_PLANET_ASPECT_HOUSE`**

Add a new internal constant in `transitEvents.ts`:

```ts
const HOUSE_BRIEF_BY_PLANET_ASPECT_HOUSE: Record<
  string,   // key: `${aspectType}_${natalPlanet}_H${house}`
  string
> = { ... }
```

Keys are of the form `"trine_Venus_H2"`, `"trine_Venus_H7"`, `"square_Moon_H4"`, etc. Coverage
must include at minimum:

- All five major aspect types (`conjunction`, `sextile`, `square`, `trine`, `opposition`) crossed
  with the five personal natal planets most commonly hit by fast transit planets
  (`Sun`, `Moon`, `Mercury`, `Venus`, `Mars`) in houses 1–12.
- This produces 5 × 5 × 12 = 300 entry slots. Not all 300 need a unique entry on initial ship;
  however, **every house must have at least one entry per natal planet** so the 12-house coverage
  is complete for the planets users encounter most often. Outer planet natal positions (Saturn,
  Uranus, Neptune, Pluto) may fall back to the generic table on first ship.

Brief text requirements:
- Each brief is one sentence, 12–25 words.
- The sentence names a concrete life activity or relationship type drawn from the house theme, not
  zodiac sign language.
- Harmonious aspects (trine, sextile) use active, enabling language ("flows," "opens," "clarifies").
- Challenging aspects (square, opposition) use friction language without catastrophism ("presses,"
  "asks," "tests") and name the growth opportunity.
- Conjunctions name intensity and activation.
- The sentence must make sense to a non-astrologer: "Mercury trine your 7th-house Venus: a good
  day for honest conversation with a close partner" is acceptable; "Mercury applying trine natal
  Venus in H7 activates the 7th-house domain" is not.

**6. `TransitTimeline.tsx` call-site update**

Inside `EventCard`, the call:

```ts
detailText = getAspectPerfectionBrief(event.aspectType, event.secondPlanet)
```

must be replaced with:

```ts
detailText = getPersonalizedEventBrief(event.aspectType, event.secondPlanet, event.natalHouse ?? null)
```

No other changes to `TransitTimeline.tsx` are required. The component does not need a `chartData`
prop; the house number travels through `event.natalHouse`.

**7. `getAspectPerfectionBrief` must not be removed**

The existing `getAspectPerfectionBrief` function must remain exported and unchanged. It is the
correct fallback for: (a) `getPersonalizedEventBrief` internal fallback, (b) any other caller that
currently invokes it with `(aspectType, natalPlanet)` without house context, (c) sign-ingress and
retrograde-station events that do not carry `natalHouse`. Do not delete or alias it.

**8. `unknownTime` behavior: no house-aware text, no visible error**

When `chartData.unknownTime` is `true`, all natal `house` values in the chart are meaningless.
In this case `natalHouse` will be `null` (per spec 3). `getPersonalizedEventBrief` will fall back
to `getAspectPerfectionBrief` (per spec 4, step 1). The expanded `EventCard` still shows text —
the generic brief — so the user sees no blank expansion panel and no error. The personalization
layer is simply disabled. No UI indicator is required to communicate this to the user.

**9. NorthNode natal planet handling**

`event.secondPlanet` can be `'NorthNode'`. `NorthNode` is not a classical planet and the
`HOUSE_BRIEF_BY_PLANET_ASPECT_HOUSE` table need not contain NorthNode entries on first ship. When
`natalPlanet === 'NorthNode'`, `getPersonalizedEventBrief` must skip the house-aware table and
return `getAspectPerfectionBrief('conjunction' | aspectType, 'NorthNode')` immediately. The
existing `ASPECT_BRIEFS` table has no `NorthNode` key and returns `briefs.default`; this is
acceptable.

**10. House `0` sentinel rejection**

`PlanetPosition.house` is initialized to `0` in transit calculations before house assignment runs.
If a natal planet somehow carries `house === 0` (should not happen for a correctly computed natal
chart with a known birth time, but must be guarded against), `getPersonalizedEventBrief` must
treat it as `null` and fall back to the generic brief. The guard in spec 3 (`np.house > 0 ? np.house : null`)
prevents `natalHouse: 0` from ever reaching the brief function; the brief function itself must
also check `natalHouse !== null && natalHouse >= 1 && natalHouse <= 12` before attempting the
table lookup, for defense in depth.

**11. House-aware brief text is appended to, not replacing, `event.brief`**

`event.brief` is a short mechanical description populated at event construction time (e.g.,
`"Transit Mercury trine natal Venus becomes exact"`). This brief appears in the unexpanded
`EventCard` below the planet glyphs (`<p className="text-mystic-muted text-xs mt-1 ml-6">`). It
is not the same text as `detailText`. The house-aware text from `getPersonalizedEventBrief` is the
`detailText` that appears in the expanded panel (`expanded && detailText`). Do not replace or
modify `event.brief`. The expanded detail and the event brief serve different purposes and must
remain separate.

**12. Retrograde transit planet handling**

Retrograde transit planets are identified in the event by the transit planet's motion direction,
not by any field on `TimelineEvent`. A retrograde Mercury approaching exact trine of natal Venus
is astronomically identical to a direct Mercury approaching from the other direction — both are
aspect perfections. The brief text does not need to distinguish retrograde vs. direct transit
planets on first ship. A retrograde Mercury trine natal 7th-house Venus should receive the same
house-aware brief as a direct Mercury trine. Future enhancement: the brief could note the
retrograde condition ("Mercury retrograde trines your 7th-house Venus — a past conversation may
resurface"), but this is explicitly out of scope for this proposal.

**13. Plural perfections of the same aspect within one timeline window**

Outer transit planets (Saturn, Uranus, Neptune, Pluto) can form an aspect perfection three times
in one window when they go retrograde and direct: once applying, once retrograde, once direct. All
three perfections will produce separate `TimelineEvent` objects with different `dateStr` values and
the same `natalHouse`. Each event receives the same house-aware brief because the natal context
does not change between perfections. This is correct behavior — the same life area is activated
across all three hits. Brief text does not need to reference "first hit," "second hit," etc.

**14. TypeScript: no `any` types introduced**

All new function signatures, interface fields, and table constants must be fully typed. The
`HOUSE_BRIEF_BY_PLANET_ASPECT_HOUSE` constant must have a `Record<string, string>` type annotation.
The `natalHouse` parameter in `getPersonalizedEventBrief` must be typed `number | null`, not
`number | undefined | null` — callers must explicitly coerce `undefined` to `null` at the call
site (via `event.natalHouse ?? null`) rather than the function accepting `undefined`.

**15. No new imports required in `TransitTimeline.tsx`**

The only import change in `TransitTimeline.tsx` is replacing `getAspectPerfectionBrief` with
`getPersonalizedEventBrief` in the named import from `'../../data/interpretations/transitEvents'`.
Both symbols live in the same file. No new component file, no new utility import, no `chartData`
prop threading through `TransitTimeline` → `DaySection` → `EventCard`.

**16. Acceptance check: 2nd-house Venus on Mercury trine**

With a test chart where natal Venus is in House 2 and `unknownTime` is `false`:
a Mercury-trine-Venus `TimelineEvent` produced by `buildTransitTimeline` must have
`natalHouse === 2`. When that event is rendered in `EventCard` and the card is expanded,
`detailText` must be a string containing language referencing money, value, finances, or worth —
drawn from the `trine_Venus_H2` entry in `HOUSE_BRIEF_BY_PLANET_ASPECT_HOUSE`. It must not be
the string `"Love flows easily, beauty and pleasure"` (the current generic `trine.Venus` entry).

**17. Acceptance check: `unknownTime` fallback**

With a test chart where `unknownTime` is `true`: a Mercury-trine-Venus `TimelineEvent` must have
`natalHouse === null`. When expanded, `detailText` must equal the result of
`getAspectPerfectionBrief('trine', 'Venus')` — i.e., the generic string. No blank panel, no
error.

**18. Acceptance check: uncovered combination falls back gracefully**

With a test chart where natal Uranus is in House 9 (a combination not covered in the initial
table): the Saturn-conjunction-Uranus perfection event must expand to show
`getAspectPerfectionBrief('conjunction', 'Uranus')` — i.e., `"Sudden awakening or disruption"`.
Not an empty string.

**19. Acceptance check: NorthNode does not throw**

With a transit Moon approaching exact conjunction of natal NorthNode: the event must expand
without error, showing the `ASPECT_BRIEFS.conjunction.default` value.

**20. No regression on non-aspect event types**

`sign-ingress`, `retrograde-station`, `lunar-phase`, and `moon-sign-change` events must continue
to expand to the text produced by `getIngressBrief`, `getStationBrief`, and `getLunarPhaseBrief`
respectively. The change to `EventCard` must not alter the `else if` branches that handle these
event types.

---

## Out of Scope

- **Retrograde-aware brief language.** The brief does not distinguish retrograde vs. direct transit
  planets. Retrograde nuance ("a past conversation may resurface") is a future enhancement.
- **Outer natal planets in the house-aware table.** Saturn, Uranus, Neptune, and Pluto natal
  placements need not be covered in the initial `HOUSE_BRIEF_BY_PLANET_ASPECT_HOUSE` on first
  ship. They fall back to `getAspectPerfectionBrief` gracefully.
- **`TransitTimeline` receiving `chartData` as a prop.** The component's API surface does not
  change. House data travels through `TimelineEvent.natalHouse`, not through a new prop.
- **UI changes to `EventCard` layout.** No changes to the expanded panel's styling, no new icons,
  no house number rendered in the card header. The improvement is in the text content of
  `detailText`, not in the card's visual structure.
- **Changes to `event.brief`.** The one-line mechanical description that appears in the collapsed
  card is not modified. Only `detailText` — the expanded panel content — becomes house-aware.
- **New GPT calls.** This feature is explicitly a static lookup enhancement. No API calls, no
  rate-limit cost.
- **New interpretation database entries outside `transitEvents.ts`.** The house-aware brief table
  lives inside `transitEvents.ts`. No changes to `planetInHouse.ts`, `houseThemes.ts`,
  `aspectInterpretations.ts`, or any other existing interpretation file.
- **The `sign-ingress` and `retrograde-station` brief functions.** `getIngressBrief` and
  `getStationBrief` are not modified. Only the aspect-perfection brief path changes.
- **Synastry timeline events.** The `TransitTimeline` is only used in the transit reading context.
  Synastry does not have a timeline.
- **AdvanceTab aspect rows.** The AdvanceTab has its own inline aspect table that does not use
  `EventCard` from `TransitTimeline`. House-aware text in that table is the responsibility of
  `feat-advance-tab-power-day-banner`, not this proposal.

---

## Open Questions

**Q1: Should `natalHouse` on `TimelineEvent` be `number | null` or `number | undefined`?**

The current `TimelineEvent` interface uses optional fields (`toSign?: string`) for data that only
applies to specific event types. The `natalHouse` field could follow that pattern as
`natalHouse?: number`. However, Taleb's fragility analysis argues for `number | null` with
explicit nullability, because `undefined` and "unknown birth time" are semantically different
conditions that should not be conflated. Recommendation: use `natalHouse?: number | null` — the
field is optional at the interface level (so non-aspect events need not specify it), but when
specified, `null` explicitly means "birth time unknown, house not available" and a positive integer
means a valid house. The call site coerces `undefined` to `null` via `event.natalHouse ?? null`.

**Q2: How many `HOUSE_BRIEF_BY_PLANET_ASPECT_HOUSE` entries must ship in the first version?**

The proposal calls for all 12 houses covered for at least `Sun`, `Moon`, `Mercury`, `Venus`, and
`Mars`. This is a minimum of 5 planets × 5 aspects × 12 houses = 300 slots — not all need unique
content but all must be present. In practice, many house/planet combinations produce similar
themes (e.g., a Mars-square brief in houses 1 and 7 may share the framing of "assertion in
relationships" vs. "assertion in self-presentation"). Writing 300 unique briefs on first ship is
reasonable if the author accepts that some sentences will be similar in structure. Quality review
should prioritize Houses 1, 2, 4, 5, 7, 8, 10 — the houses users most commonly ask about.

**Q3: Should the house number be visible in the `EventCard` header (e.g., "Mercury △ 7th Venus")?**

The vision document (Miyazaki, Jobs) describes the improvement as being in the expanded text, not
in the collapsed header. The collapsed header already shows `event.label` (`"Mercury trine Venus"`),
which does not currently name the house. Adding the house to the header would be a visible UX
change — showing "Mercury △ 7th-house Venus" in the collapsed state — and would make the
personalization immediately visible without expansion. This is out of scope as defined but
represents a natural follow-on. Implementers should not add house labeling to the collapsed header
without a separate proposal and design approval.

**Q4: What happens when `findAspectPerfections` is called from `buildTransitTimeline` with a chart
that has valid house data for some planets but `house === 0` for one outlier?**

This should not happen for a correctly computed natal chart. The `assembleChart` engine function
sets house values for all planets when `unknownTime` is false. If a planet somehow carries
`house === 0` on a known-time chart, the spec 3 guard (`np.house > 0 ? np.house : null`) will
emit `natalHouse: null`, triggering the generic fallback brief. This is the safe and correct
behavior — a missing house value should never produce visible corruption.

**Q5: Should the proposal enforce that `findAspectPerfections` signature changes to accept
`ChartData` rather than `PlanetPosition[]`?**

Carmack's analysis and the draft proposal both note that `findAspectPerfections` currently takes
`natalPlanets: PlanetPosition[]` and that `unknownTime` must be threaded in. The cleanest
solution is to replace the `natalPlanets` parameter with `natalChart: ChartData` and destructure
inside. However, `findAspectPerfections` is a private function called only by `buildTransitTimeline`,
so the API surface is local. The implementer has full discretion on whether to pass `ChartData`
or `(PlanetPosition[], boolean)`. Document the chosen approach in the implementation commit for
future maintainability.
