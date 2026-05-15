**Type:** Code Enhancement
**Originated by:** Carmack, Jobs, Miyazaki

## Problem / Opportunity

`identifyKeyThemes()` in `src/engine/synastry.ts` (lines 292–354) is the function that populates `CompatibilityScore.keyThemes` — the array of plain-language theme strings surfaced in the synastry compatibility summary. It currently detects six categories of significant contact:

1. Sun-Moon (core compatibility, lines 307–313) — nature-branched theme string
2. Venus-Mars (romantic chemistry, lines 315–321) — nature-branched theme string
3. Moon-Moon (emotional resonance, lines 323–329) — nature-branched theme string
4. Saturn contacts (commitment, lines 332–335) — any Saturn aspect, single string
5. Pluto contacts (transformation, lines 338–341) — any Pluto aspect, single string
6. NorthNode contacts (karmic, lines 344–347) — any Node aspect, single string

Detection uses two internal helpers: `hasAspect(p1, p2)` checks for any aspect between the named pair (symmetric — order does not matter), and `getAspect(p1, p2)` returns the first matching aspect so the theme string can branch on `a.nature`.

Chiron is entirely absent from this function. No filter, no `hasAspect` call, no theme string. When Chiron is added to `chart.planets` as part of the sprint-0014 asteroid integration, cross-chart Chiron aspects will be calculated by `calculateSynastryAspects()` (which iterates all planets in both charts, lines 79–108) and will appear in the `synastryAspects` array — but none of them will ever surface as a key theme. They will be invisible to `identifyKeyThemes()`, invisible to the GPT synastry prompt's compatibility summary block, and invisible to any UI element that reads `CompatibilityScore.keyThemes`.

This is the same gap Carmack identifies explicitly in his code-quality notes: "Add Chiron to this function. The check is one block... this is a 10-line addition" (carmack.md, lines 207–223). Jobs names the specific moment of failure: "If Person 1's Chiron conjuncts Person 2's Sun, that is one of the most significant synastry contacts in depth psychology... the synastry page [is] transformative for anyone whose chart has this contact" (jobs.md, lines 66–69). Miyazaki frames the craft standard: the product must not add asteroids carelessly — every added layer must be legible and felt, not silently present.

Astrologically, Chiron-to-personal-planet aspects in synastry (Chiron conjunct or opposite Sun, Moon, Venus, or Mars) are among the most consequential contacts a chart comparison can show. In depth psychology-informed astrology — Jungian, Chironian — they indicate that one person's formative wound and another person's core energy are directly entangled. The Chiron person tends to project their wound onto the planet person; the planet person tends to unconsciously act out the Chiron person's unhealed pattern. These relationships are rarely neutral and never fully explained by Venus-Mars or Sun-Moon dynamics alone. Leaving Chiron out of `identifyKeyThemes()` means leaving the most psychologically precise finding out of the compatibility reading.

A second gap exists in `src/data/interpretations/transitAspectBriefs.ts`. The file defines `TRANSIT_PLANET_PHRASES` — a `Record<string, PlanetPhrases>` with entries for all ten classical transit planets (Sun through Pluto, lines 19–70). It has no entry for Chiron. This means `computeTransitAspectBrief()` (lines 99–142) will fall through to its fallback path (`getAspectPerfectionBrief` or `fallbackSentence`) whenever Chiron is the transit planet, producing generic output. More specifically: there is no lookup for the single most significant Chiron transit — `Chiron_Conjunction_Chiron`, the Chiron Return, which occurs around age 49–51 and is one of the few transit events that practitioners treat with the weight of a Saturn Return. Jobs calls this out directly: "a special case for `Chiron_Conjunction_Chiron` with a dedicated interpretation entry. One entry. One sentence. But the right sentence" (jobs.md, lines 56–63).

## Desired State

### 1. Chiron detection in `identifyKeyThemes()`

`identifyKeyThemes()` gains a Chiron contact detection block, placed after the NorthNode block and before the fallback. The detection follows the same pattern as Saturn and Pluto — filter by body name — but branches further on which personal planet is involved.

The personal planets for this purpose are Sun, Moon, Venus, and Mars. A Chiron contact to one of these four is categorically different from a Chiron contact to Mercury, Jupiter, or an outer planet: it runs through the most intimate layer of the relationship.

The detection block would:

1. Filter `aspects` for any aspect where either `person1Planet === 'Chiron'` or `person2Planet === 'Chiron'`
2. Within that filtered set, identify whether any involve a personal planet (Sun, Moon, Venus, Mars) on the other side
3. Push a nature-aware theme string: harmonious/neutral Chiron-to-personal-planet contacts produce a wound-and-healing theme that acknowledges depth and potential for mutual transformation; challenging contacts acknowledge the same depth but name the friction directly — the Chiron person's wound may be activated by the planet person's natural expression, and neither may yet have the vocabulary to describe what is happening

The theme strings should be written in the voice established by the synastry database — second-person relational, address-first, not categorical. Compare the existing Saturn theme ("Saturn contacts indicate commitment potential and lasting bonds") to the synastry brief voice ("one of you carries the light, the other feels it"). The Chiron theme strings belong to the second register, not the first.

Structurally, an additional block can detect Chiron-to-Chiron contact (double Chiron generational resonance — two people of similar age whose wounds are in the same sign and degree, each mirroring the other's pattern) and push a separate theme if that conjunction or opposition is present.

The type signatures are already forward-compatible: `SynastryAspect.person1Planet` and `person2Planet` are typed `PlanetName | 'NorthNode'` (synastry.ts line 11–12), which will become `BodyName` (including `'Chiron'`) once the sprint-0014 type refactor lands. The `hasAspect` and `getAspect` helpers take `string` parameters, so no helper signatures change. The Chiron detection block reads cleanly within the existing function structure.

### 2. Chiron in `TRANSIT_PLANET_PHRASES`

`transitAspectBriefs.ts` gains a `Chiron` entry in `TRANSIT_PLANET_PHRASES`, following the same `{ harmonious, challenging, neutral } × { applying, separating }` structure as the ten existing entries.

Chiron's verb phrases must reflect its archetype — the wound teacher, the mentor-healer, the body that surfaces what has been unresolved. Verb phrases like "surfacing" (applying harmonious), "having surfaced" (separating harmonious), "reopening" (applying challenging), "having reopened" (separating challenging), "activating" (applying neutral), "having passed through" (separating neutral) fit the archetype without importing therapeutic jargon.

### 3. The Chiron Return brief

`computeTransitAspectBrief()` currently has no mechanism for special-casing specific transit-planet-to-natal-planet pairings — it dispatches on transit planet, house, and nature, not on the specific natal planet being contacted. To support a dedicated Chiron Return interpretation, the function would check for `transitPlanet === 'Chiron'` and `natalPlanet === 'Chiron'` before the generic house-template path, and return a named interpretation rather than the composed house-template string.

The interpretation text for `Chiron_Conjunction_Chiron` should not be a house-framed brief. It should name the event directly: something in the register of "Chiron has returned to the place it occupied when you were born — the wound teacher completes its first full circle, and what was wound becomes available as wisdom." The text does not need to be long. It needs to be true, and it needs to be specific to this event rather than to Chiron aspecting a natal house theme.

This check belongs at the top of the `try` block in `computeTransitAspectBrief()`, before the `natalHouse` guard — because the Chiron Return is significant regardless of which house natal Chiron occupies.

The same brief mechanism, once in place, can later accommodate other self-conjunctions (Saturn Return, Jupiter Return) as named event interpretations rather than relying on the house-template path for those transits as well.

## Outcome

**Completed 2026-05-15.** All three changes implemented and committed (`62dbfea`).

- **Change 1 (synastry.ts):** Added Chiron contact detection block in `identifyKeyThemes()` after the NorthNode block. Detects Chiron-to-personal-planet aspects (Sun/Moon/Venus/Mars) and branches on harmonious vs challenging nature for the theme string. Also detects Chiron-to-Chiron contact and pushes a generational resonance theme. String casts (`as string`) used safely to avoid type errors since `'Chiron'` is not yet in `PlanetName`.

- **Change 2 (transitAspectBriefs.ts):** Added `Chiron` entry to `TRANSIT_PLANET_PHRASES` with wound-archetype verb phrases: surfacing/having surfaced (harmonious), reopening/having reopened (challenging), activating/having passed through (neutral).

- **Change 3 (transitAspectBriefs.ts):** Added Chiron Return early-return at the top of the `try` block in `computeTransitAspectBrief()`. When both `transitPlanet` and `natalPlanet` are `'Chiron'`, returns: "Chiron is returning to where it stood at your birth — the wound teacher comes full circle. This is your Chiron Return — one of the most significant transits of a human life, occurring around age 49–51."

TypeScript: zero errors. Build: clean.
