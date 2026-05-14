# Code Review — sprint-0011-task-0007-feat-synastry-house-overlay-briefs

Reviewed by: Claude (automated)
Date: 2026-05-14
Files reviewed:
- `src/data/interpretations/synastryHouseOverlayBriefs.ts`
- `src/components/results/SynastryPage.tsx`

---

## Summary

The implementation is largely solid. The data file is complete, the card layout matches the spec, the filtering logic is correct, and TypeScript compiles clean. One blocking issue was found in the outer planet fallback template; everything else is clean.

---

## Findings

### **[blocking]** — Outer planet fallback template produces broken English

**Location:** `SynastryPage.tsx` line 228

```ts
brief = `Your ${entry.planet} in their ${ordinal(entry.house)} House (${theme.name}) — your ${keyword} energy lands in the space where they ${theme.theme.toLowerCase()}.`
```

`theme.theme` is a noun-phrase keyword list, not a verb phrase. Every house theme is structured as `"Noun, noun, noun"` (e.g., `"Marriage, partnerships, open enemies"` for house 7). Interpolating it after "they" produces ungrammatical output for all 12 houses:

> "Your Jupiter in their 7th House (House of Partnership) — your expansive energy lands in the space where they marriage, partnerships, open enemies."

The `theme.name` field is a cleaner noun phrase and already used for the house label above, but the spec calls for referencing the house theme in the brief. The fix should use `theme.name` directly rather than `theme.theme`, or reformulate the sentence entirely so it does not try to follow "they" with a noun list. A minimal fix:

```ts
brief = `Your ${entry.planet} in their ${theme.name} — your ${keyword} energy reaches the space they hold for ${theme.theme.toLowerCase()}.`
```

This produces: "Your Jupiter in their House of Partnership — your expansive energy reaches the space they hold for marriage, partnerships, open enemies." — which is grammatically correct and reads naturally.

---

### **[warning]** — INNER_PLANET_ORDER is a redundant constant

**Location:** `SynastryPage.tsx` lines 161 and 163

```ts
const INNER_PLANETS = ['Sun', 'Moon', 'Venus', 'Mars', 'Mercury']
const INNER_PLANET_ORDER = ['Sun', 'Moon', 'Venus', 'Mars', 'Mercury']
```

These are identical arrays. `sortOverlayEntries` uses `INNER_PLANET_ORDER.indexOf(...)`, but it could just use `INNER_PLANETS.indexOf(...)`. The second constant adds noise without benefit. Not blocking, but should be cleaned up.

---

### **[suggestion]** — Outer planet fallback for NorthNode uses keyword "karmic" which reads awkwardly in the template

**Location:** `SynastryPage.tsx` lines 164–171

```ts
const OUTER_PLANET_KEYWORDS: Record<string, string> = {
  ...
  NorthNode: 'karmic',
}
```

With the outer planet template, NorthNode in house 7 would produce: "your karmic energy lands in the space where they…". "Karmic" as an adjective before "energy" is reasonable, but NorthNode is not a planet. Consider a dedicated NorthNode keyword like `"fated"` or `"purposeful"` that reads more cleanly in the sentence. Low priority.

---

## Spec Compliance Checklist

| Requirement | Status |
|---|---|
| HouseOverlaySection converted from table to card list | PASS |
| Planet glyph + name, zodiac glyph + sign, house number + name | PASS |
| INNER_PLANETS constant correct | PASS |
| HIGH_SIGNAL_HOUSES constant correct `[1,4,5,7,8,12]` | PASS |
| isHighSignal correct | PASS |
| 60-entry lookup keyed by `${planet}_H${house}` | PASS — confirmed 12 per planet × 5 planets |
| Relational voice (partner receives/feels) | PASS — entries are relational throughout; no archetype labels found |
| No stubs or TODO comments | PASS |
| Outer planet generic template in component, not data file | PASS |
| High-signal briefs visible by default (no expand needed) | PASS |
| Non-high-signal at reduced opacity (`text-mystic-muted`) | PASS |
| Sorted: high-signal first in Sun→Moon→Venus→Mars→Mercury order, others after | PASS |
| Section `defaultOpen` when high-signal present | PASS |
| Section header shows count: "label (N key placements)" | PASS |
| No per-entry expand/collapse | PASS |
| PLANET_IN_HOUSE not reused | PASS |
| Exports `SYNASTRY_HOUSE_OVERLAY_BRIEFS` and `getSynastryHouseOverlayBrief` | PASS |
| Generic outer-planet fallback in component, not data file | PASS |
| Both HouseOverlaySection call sites updated | PASS |
| Visual: `border-b border-mystic-gold/10` between entries | PASS |
| High-signal left accent (`w-0.5 bg-mystic-gold/40`) | PASS |
| Subheader: "Showing N key placements — inner planets in relationship-defining houses." | PASS |
| No new GPT calls | PASS |
| No changes to HouseOverlayEntry type or synastry.ts | PASS |
| No changes to HOUSE_THEMES, PLANET_IN_HOUSE, or other existing interpretation data | PASS |
| Empty entries guard (return null) | PASS |
| house<=0 or >12 guard — skip brief, show planet+sign only | PASS (`invalidHouse` flag) |
| Outer planet template reads correctly | FAIL — broken English (see blocking finding) |
| TypeScript — no type errors | PASS |
| File scope — only two source files changed | PASS |

---

## Brief Quality Spot-Check

Selected entries checked against the quality bar ("describes what the partner receives/feels; not archetype labels; not natal restatements"):

- `Venus_H7`: "Your capacity for love and beauty lands directly in their house of committed partnership. You are felt, in their deepest relational space, as precisely the kind of person they have been looking for — someone who beautifies the bond itself." — PASSES quality bar
- `Sun_H12`: "Your Sun enters the most hidden and private chamber of their chart. They feel you in ways they struggle to articulate — a quiet, pervasive warmth that reaches what they keep from the world." — PASSES
- `Mars_H8`: "Your drive reaches the most private and transformative space in their chart. The intensity between you is something they cannot explain away — sexual and emotional power, a depth of feeling that changes both of you." — PASSES
- `Moon_H4`: "Your emotional nature lands in the deepest, most protected space in their chart. They feel nurtured and held in ways that reach their core — your presence in their home space feels irreplaceable." — PASSES
- `Mercury_H3`: "Your mind lands in the space that is most naturally theirs — their communication, curiosity, and local world. Conversation with you flows effortlessly; ideas multiply, and thinking alongside you becomes one of the pleasures of the relationship." — PASSES

No archetype labels or natal restatements found across the reviewed sample. Voice is consistently relational.

---

There is **1 blocking issue** — the outer planet fallback template produces ungrammatical output for all 12 houses due to `theme.theme` being a noun-phrase list, not a verb phrase.

---

## Follow-up Review

Reviewed by: Claude (automated)
Date: 2026-05-14

### Blocking issue — outer planet fallback template

**Fixed.** The template at `SynastryPage.tsx` line 227 now reads:

```ts
brief = `Your ${entry.planet} in their ${ordinal(entry.house)} House (${theme.name}) — your ${keyword} energy reaches the space they hold for ${theme.theme.toLowerCase()}.`
```

Verified against two example houses:

- **House 7** (`theme.theme = "Marriage, partnerships, open enemies"`): produces "Your Jupiter in their 7th House (House of Partnership) — your expansive energy reaches the space they hold for marriage, partnerships, open enemies." — grammatically correct.
- **House 1** (`theme.theme = "Identity, appearance, first impressions"`): produces "Your Saturn in their 1st House (House of Self) — your disciplining energy reaches the space they hold for identity, appearance, first impressions." — grammatically correct.

The construction "reaches the space they hold for [noun list]" is idiomatic and reads naturally for all 12 house themes, which are uniformly structured as noun-phrase lists.

### Warning — INNER_PLANET_ORDER redundant constant

**Resolved.** `INNER_PLANET_ORDER` has been removed. The sort in `sortOverlayEntries` (line 186) now uses `INNER_PLANETS.indexOf(...)` directly. Only one constant (`INNER_PLANETS` at line 161) remains.

### No new issues introduced

The file was reviewed in full. No regressions, no new type issues, no logic changes beyond the two items above.

---

Blocking issue resolved. No remaining blocking issues — implementation approved.
