# code-timeline-aspect-brief-consolidation

**Type:** Code Enhancement
**Originated by:** Jobs, Carmack, Miyazaki
**Sprint vision:** sprint-0022

## Problem / Opportunity

The Transit Timeline and the Transit Reading tab describe the same event — a transit planet forming an exact aspect to a natal planet — through two entirely separate interpretation systems that have diverged in quality.

When the user expands an aspect-perfection card in `TransitTimeline.tsx`, the `EventCard` component computes `detailText` by calling `getPersonalizedEventBrief` from `src/data/interpretations/transitEvents.ts` (lines 35–36 of `TransitTimeline.tsx`). That function performs a three-level lookup: it first tries `HOUSE_BRIEF_BY_PLANET_ASPECT_HOUSE`, a flat 240-entry dictionary keyed by `${aspectType}_${natalPlanet}_H${house}`; falls back to `ASPECT_BRIEFS[aspectType][natalPlanet]` for a planet-keyed generic phrase; and finally falls back to `ASPECT_BRIEFS[aspectType].default`. The dictionary covers Sun, Moon, Mercury, Venus, and Mars across five aspect types and twelve houses — 300 string literals, each hand-written and frozen at authorship time.

When the same event appears as an `AspectRow` on the Reading tab, `computeTransitAspectBrief` from `src/data/interpretations/transitAspectBriefs.ts` is used instead. That function is parametric: it looks up a planet archetype verb phrase from `TRANSIT_PLANET_PHRASES` (30 entries, applying/separating variants), retrieves the house theme from `getHouseTheme`, optionally enriches with `getPlanetInHouseInterpretation`, and composes a sentence with explicit house naming. The output for Saturn square natal Moon in the 4th house reads like a personal reading. The `HOUSE_BRIEF_BY_PLANET_ASPECT_HOUSE` output for the same event reads like a glossary entry.

The user sees both. The Timeline expanded card says "Emotional stress, internal conflict." The Reading tab aspect row for the same Saturn square Moon says "Saturn pressing on your Moon in your 4th house (home and family) — structures you've built around domestic stability are being examined." These are the same event, the same sky, the same person's chart. The product is speaking two different languages about one thing.

**The dual-system maintenance liability is the deeper structural problem.** `computeTransitAspectBrief` derives house-theme names dynamically from `houseThemes.ts`. If a house theme name changes or is refined — say "House of Home and Roots" becomes "House of Foundation and Lineage" — `transitAspectBriefs.ts` updates automatically. The 240 entries in `HOUSE_BRIEF_BY_PLANET_ASPECT_HOUSE` do not: they contain hardcoded house-theme words embedded in their string literals ("home and family", "partnership", "career"), and they silently diverge the moment the canonical theme text evolves anywhere else in the codebase. Similarly, if a new transit planet (Chiron, for instance, which already exists in `TRANSIT_PLANET_PHRASES`) should be handled for aspect-perfection events, it must be added to `HOUSE_BRIEF_BY_PLANET_ASPECT_HOUSE` across all 60 house slots — or it silently falls through to the generic phrase. There is no coverage test. The table was authored once and does not compose; `computeTransitAspectBrief` composes from reusable primitives and handles new planets by adding a single entry to `TRANSIT_PLANET_PHRASES`.

Carmack names the failure mode precisely in his sprint-0022 audit (section 3): "If the house theme names change in `houseThemes.ts`, the composed sentences in `transitAspectBriefs.ts` update automatically but `HOUSE_BRIEF_BY_PLANET_ASPECT_HOUSE` in `transitEvents.ts` does not — it has hardcoded house-theme words embedded in 240 string literals. These can silently diverge." Jobs calls the quality asymmetry what it is: "The Timeline is a dictionary. The Reading tab is a story. They should be the same voice." Miyazaki frames it as a craft failure: "The carpenter had the right wood and chose something cheaper."

The `TimelineEvent` interface (defined in `src/engine/transitTimeline.ts`, lines 20–38) already carries every input that `computeTransitAspectBrief` requires for aspect-perfection events: `planet` (the transit planet), `secondPlanet` (the natal planet), `aspectType`, `aspectNature`, and `natalHouse`. The data has been there since the Timeline shipped. The connection was never made.

## Desired State

There is one canonical interpretation path for transit-to-natal aspect contacts in this codebase: `computeTransitAspectBrief`. The Transit Timeline uses it for expanded aspect-perfection cards. The Transit Reading tab uses it for `AspectRow` inline briefs. The two surfaces read in the same voice.

In `TransitTimeline.tsx`, the `detailText` derivation block for `aspect-perfection` events calls `computeTransitAspectBrief` directly, passing the event's transit planet, aspect type, natal planet, natal house, aspect nature, and an `applying: true` flag — aspect-perfection events are by definition the moment of exact contact, equivalent to maximum applying. When `natalHouse` is null (no birth time known), `computeTransitAspectBrief`'s own fallback to `getAspectPerfectionBrief` fires — a house-blind sentence that is still better than the dictionary entry, and identical in behavior to what the current code produces at that fallback level. The `getPersonalizedEventBrief` call is removed from the `aspect-perfection` branch; it is not needed.

In `src/data/interpretations/transitEvents.ts`, the `HOUSE_BRIEF_BY_PLANET_ASPECT_HOUSE` table is deleted in full — approximately 250 lines of now-redundant string literals. The `getPersonalizedEventBrief` function, which existed solely to route into that table, is also removed. What remains in `transitEvents.ts` is strictly the interpretation data that has no parallel in `transitAspectBriefs.ts`:

- `getIngressBrief` — planet-to-sign ingress language, no counterpart exists elsewhere
- `getStationBrief` — retrograde and direct station language, no counterpart exists elsewhere
- `getLunarPhaseBrief` — lunar phase cycle language, no counterpart exists elsewhere
- `getAspectPerfectionBrief` — the generic fallback already called by `computeTransitAspectBrief` itself; it stays as the shared fallback surface
- `ASPECT_BRIEFS` — retained as the data backing `getAspectPerfectionBrief`, which continues to serve as the fallback layer inside `computeTransitAspectBrief`
- `EVENT_TYPE_INFO` — event type icons, labels, and colors used by `TransitTimeline.tsx`

The ingress and station `detailText` branches in `EventCard` are untouched. They call `getIngressBrief` and `getStationBrief` respectively, both of which remain in `transitEvents.ts` and have no migration candidate.

The net result: a user who expands a Saturn square Moon card in the Timeline sees "Saturn pressing on your Moon in your 4th house (home and family) — structures you've built around domestic stability are being examined" — the same quality of sentence they would read on the Reading tab for the same event. The product speaks in one voice about one sky. The 250-line table that made the product speak two voices is gone, and the system that remains is parametric, composable, and maintained in one place.

## Outcome

**Status:** completed — 2026-05-18

- `TransitTimeline.tsx`: replaced `getPersonalizedEventBrief` call with `computeTransitAspectBrief` in the `aspect-perfection` detailText branch; added import from `transitAspectBriefs.ts`; passes `event.planet`, `event.aspectType`, `event.secondPlanet`, `event.natalHouse ?? null`, `event.aspectNature`, and `applying: true`
- `transitEvents.ts`: deleted `HOUSE_BRIEF_BY_PLANET_ASPECT_HOUSE` (350 lines, 240 string literals) and `getPersonalizedEventBrief` (16 lines); net removal: **385 lines** across the two files
- Retained: `ASPECT_BRIEFS`, `getAspectPerfectionBrief`, `getIngressBrief`, `getStationBrief`, `getLunarPhaseBrief`, `EVENT_TYPE_INFO`
- Build: `tsc -b && vite build` passes clean, no TypeScript errors
