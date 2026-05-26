# Proposal: Retrograde Condition Priority-Override Bug in `buildTransitInfluence`

**Type:** Issue Fix
**Originated by:** Taleb

---

## Problem

In `buildTransitInfluence` (src/engine/tarot.ts, lines 680–709), the Level 1 transit adaptation lookup iterates through a card's entries in array order and returns on the first match. The `condition: 'any'` branch (lines 700–708) fires on two independent conditions joined by OR:

```typescript
if (
  astroContext.dominantTransitPlanet === entry.planet ||
  astroContext.retrogradeplanets.includes(entry.planet)
) {
  return entry.emphasis
}
```

The second operand — `astroContext.retrogradeplanets.includes(entry.planet)` — matches any planet that is currently retrograde, with no requirement that it be the dominant transit planet. This means a retrograde planet's entry fires whenever that planet appears anywhere in `retrogradeplanets`, regardless of what planet is actually dominant.

The `condition: 'retrograde'` branch (lines 689–692) has the same property: it also tests only `astroContext.retrogradeplanets.includes(entry.planet)` with no reference to `dominantTransitPlanet`.

**Concrete reproduction path:**

Consider a user whose chart has an active Pluto transit aspect (e.g., Pluto trine natal Venus) and Mercury currently retrograde. `dominantTransitPlanet` is `'Pluto'` (priority 10). `retrogradeplanets` includes `'Mercury'`.

Sprint 0027 plans to add a Mercury retrograde entry (`condition: 'any'` or `condition: 'retrograde'`) for the Two of Swords, alongside a Pluto entry (`condition: 'any'`). If the Mercury entry is written before the Pluto entry in the `TRANSIT_ADAPTATIONS_BY_CARD` array — which is the natural writing order, since the sprint vision names Mercury first for this card — the iteration hits the Mercury entry first:

1. Check Mercury entry (`condition: 'any'`): `dominantTransitPlanet === 'Mercury'` is false, but `retrogradeplanets.includes('Mercury')` is true. Return Mercury text.
2. Pluto entry is never evaluated.

The user sees the Mercury retrograde interpretation for the Two of Swords even though Pluto is the dominant — and far more significant — active transit.

**Scope of activation:**

Mercury is retrograde for approximately 19% of the year (three periods of roughly three weeks each). During any Mercury retrograde season, every card that has a Mercury retrograde entry ordered before a higher-priority planet's entry will silently return the Mercury text instead of the dominant planet text. The same applies to Venus retrograde (roughly 7% of the year) and Saturn retrograde (approximately 36% of the year, though Saturn entries use `condition: 'any'` rather than `condition: 'retrograde'` in the existing data).

**Current impact is narrow but growing:**

In the current dataset (pre-sprint 0027), most cards have at most one transit adaptation entry. The Hermit is the clearest existing example: it has a Mercury retrograde entry (`condition: 'retrograde'`, line 28) followed by a Mercury direct entry (`condition: 'direct'`, line 34) and a Saturn entry (`condition: 'any'`, line 40). During Mercury retrograde with Saturn dominant, the Hermit returns its Mercury retrograde text and the Saturn entry on line 40 is never reached. This is the live form of the bug today.

After sprint 0027 adds 60–90 new entries including Mercury retrograde entries for Two of Swords, Eight of Swords, and Seven of Cups alongside outer-planet entries for those same cards, the number of cards where entry ordering can silently override the dominant planet grows substantially.

The bug will most commonly produce wrong-but-plausible output: Mercury retrograde text is coherent and sounds reasonable. No error is logged. No test fails. The silent wrong result becomes the common result during the three Mercury retrograde seasons per year.

---

## Expected Behavior

When `dominantTransitPlanet` is an outer planet (Saturn, Pluto, Uranus, Neptune, Jupiter), that planet's adaptation entry should take priority over any retrograde entry for a lower-priority planet, regardless of array order.

Specifically: a user drawing the Two of Swords with Pluto as the dominant transit planet and Mercury retrograde should see the Pluto entry for the Two of Swords in "In Your Sky Now." The Mercury retrograde entry for that card should fire only when Mercury is itself the dominant transit planet, or when no higher-priority transit adaptation entry exists for any of the dominant or retrograde planets in the chart.

The fix should not change the behavior for `condition: 'retrograde'` entries where the retrograde planet is also the dominant planet (e.g., Saturn retrograde while Saturn is dominant). It should not suppress retrograde entries entirely — they carry real meaning. It should establish that dominance takes precedence over retrograde status when a dominant entry is available for the dominant planet.

The two-pass approach achieves this: in a first pass, iterate entries looking for a match where `dominantTransitPlanet === entry.planet`; if a match is found, return it. Only if no dominant-planet entry matches should the function fall through to a second pass that checks retrograde entries. This preserves all existing entry content and changes only which entry fires first when multiple entries could match simultaneously.
