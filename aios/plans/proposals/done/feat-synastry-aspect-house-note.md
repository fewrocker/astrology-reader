# feat-synastry-aspect-house-note

**Type:** Feature  
**Originated by:** Jobs, Carmack, Miyazaki  
**Sprint:** 0022

---

## Problem / Opportunity

The Synastry page contains two of the richest interpretive layers in the product: cross-chart aspect rows and house overlay sections. When a synastry aspect row is expanded, it shows the brief produced by `computeSynastryAspectBrief` (`src/data/interpretations/synastryAspectBriefs.ts`). That brief correctly describes the archetypal character of the aspect in abstract, planet-to-planet terms — e.g. Venus trine Mars as "their drive and your warmth move with each other naturally."

Separately, the House Overlays section (`HouseOverlaySection`, `SynastryPage.tsx` line 215) shows which of person 1's planets fall in person 2's houses, and vice versa. These briefs (from `synastryHouseOverlayBriefs.ts`) speak in situated relational language: "Your capacity for love and beauty flows directly into the space they hold for joy and romance."

The gap: a Venus-Mars trine where person 2's Venus also sits in person 1's 5th house (pleasure, romance, creativity) is a qualitatively different story from the same trine where Venus sits in the 8th house (intimacy, transformation, power). The aspect row expansion knows the planets; the house overlay data is fully computed in `synastryData.houseOverlay` (populated by `calculateHouseOverlays` in `synastry.ts`, line 726). The two richest interpretive layers of the Synastry page never acknowledge each other in the aspect row expansion panel.

Specific structural gaps today:

- `SynastryAspectsSection` (`SynastryPage.tsx`, line 157) receives only `aspects`, `label1`, and `label2` — no overlay data is threaded in.
- The `AspectRow` component (`src/components/reading/AspectRow.tsx`) accepts a single `brief: string | null` prop for its expansion panel. There is no mechanism to render a secondary contextual note beneath the brief.
- The `HIGH_SIGNAL_HOUSES` constant (`SynastryPage.tsx`, line 185) and `INNER_PLANETS` constant (line 184) and `isHighSignal` predicate (line 201) are already defined and encode exactly the selectivity criterion needed — but are used only by `HouseOverlaySection`.
- `getSynastryHouseOverlayBrief` (`synastryHouseOverlayBriefs.ts`, line 82) and `getHouseTheme` (`houseThemes.ts`, line 112) are already imported and in scope in `SynastryPage.tsx`.

---

## Vision

When a user expands a Venus-Mars trine row on the Synastry page and one person's Venus happens to sit in the other's 5th house, they see — beneath the aspect brief — one quiet additional line: "Her Venus also falls in your 5th house (pleasure and romance) — this aspect activates the space you hold for joy." The line is visually subordinate: smaller, italic, slightly dimmer, offset to signal that it is a gloss on the primary brief rather than a competing statement.

This note does not appear on every expanded row — only where it is true and meaningful. Most aspect rows expand to show only the aspect brief. When the house note fires, it tells the reader: these two interpretive threads describe the same energy. The planets are meeting, and they are meeting in a place that already matters.

The feature requires no new data, no new files, no new GPT calls. It is wiring between two data structures that already exist and are already rendered on the same page.

---

## Specifications

### 1. Qualifying planets (inner planets only)

A house note is only generated when the planet being checked is one of: `Sun`, `Moon`, `Venus`, `Mars`, `Mercury`. This matches the existing `INNER_PLANETS` constant at `SynastryPage.tsx` line 184. Outer planets (`Jupiter`, `Saturn`, `Uranus`, `Neptune`, `Pluto`, `NorthNode`) are excluded. An outer planet in a high-signal house overlay is already displayed prominently in `HouseOverlaySection` using the `OUTER_PLANET_KEYWORDS` fallback brief (line 249); it does not need to be cross-referenced in the aspect row as well.

### 2. Qualifying houses (relationship-significant only)

A house note is only generated when the overlay entry's house is one of: `1`, `5`, `7`, `8`. This is a subset of the existing `HIGH_SIGNAL_HOUSES = [1, 4, 5, 7, 8, 12]` (line 185), narrowed for this feature to the four most directly relationship-relevant houses:

- **1st** — the partner literally lands in how you present yourself and experience your identity; the aspect animates self-perception
- **5th** — romance, creativity, joy, and play; the most charged house for attraction dynamics
- **7th** — the house of committed partnership; any planet here is felt as directly partner-relevant
- **8th** — intimacy, transformation, shared depth; the house that governs what the relationship changes in each person

Houses 4 and 12 (present in `HIGH_SIGNAL_HOUSES`) are excluded from this feature's triggering set. House 4 (home, emotional foundation) and 12 (hidden self, unconscious) are meaningful but their aspect-row connection is less universally legible as "relationship-significant" to a user scanning the aspect list. They remain prominent in the `HouseOverlaySection` itself. This exclusion keeps the note selective and legible.

If the sprint team's review of real synastry charts shows house 4 firing meaningfully in the aspect-row context, it may be added before implementation closes — but default to the four-house list above.

### 3. Directionality: which overlay list to check

Each synastry aspect has `a.person1Planet` (the planet belonging to the person whose chart is `chart1` / `label1`) and `a.person2Planet` (belonging to `label2`). The overlay data has two lists:

- `synastryData.houseOverlay.person1InPerson2Houses`: person 1's planets, positioned in person 2's houses
- `synastryData.houseOverlay.person2InPerson1Houses`: person 2's planets, positioned in person 1's houses

For a given aspect row, check both lists:

**Check A — person1Planet in person2's houses:**  
Search `person1InPerson2Houses` for an entry where `entry.planet === a.person1Planet` and the qualifying planet and house conditions are met.  
Prose template: `"${label1}'s ${planet} also falls in ${label2}'s ${ordinal(house)} house (${houseTheme.theme.toLowerCase()})."`

**Check B — person2Planet in person1's houses:**  
Search `person2InPerson1Houses` for an entry where `entry.planet === a.person2Planet` and the qualifying planet and house conditions are met.  
Prose template: `"${label2}'s ${planet} also falls in ${label1}'s ${ordinal(house)} house (${houseTheme.theme.toLowerCase()})."`

The `ordinal` helper already exists at `SynastryPage.tsx` line 195. The `getHouseTheme` function is already imported at line 10.

### 4. Tie-breaking when both directions qualify

If both Check A and Check B find qualifying overlay entries, render only one house note per expanded row. Selection priority:

1. Prefer the entry whose house number appears earlier in the qualifying set `[1, 5, 7, 8]` — i.e., 1st > 5th > 7th > 8th. Angular houses (1st, 7th) are more immediately legible; prefer them.
2. If both have the same house number (e.g. both planets are in each other's 7th house — a mirror placement), prefer the check where `a.person1Planet` is the qualifying planet (Check A), so the rendered note names `label1` first for consistency with the row label order.

Do not render two house notes in a single expanded row. One note, one sentence.

### 5. Prop threading into `SynastryAspectsSection`

`SynastryAspectsSection` currently receives `{ aspects, label1, label2 }` (line 157). Add an optional prop:

```ts
houseOverlay?: HouseOverlay
```

where `HouseOverlay` is the type already exported from `../../engine/synastry`. Import it at the top of `SynastryPage.tsx` — it is already partially imported (line 7 imports `HouseOverlayEntry` from the same module; extend the import to include `HouseOverlay`).

At the call site (line 497), pass `houseOverlay={synastryData.houseOverlay}`.

When `houseOverlay` is undefined (defensive case), the component renders no house notes — behavior is identical to today.

### 6. House note computation within `SynastryAspectsSection`

Inside the component's map over `aspects`, after computing `computeSynastryAspectBrief`, derive `houseNote: string | null`:

```ts
function resolveHouseNote(
  aspect: SynastryAspect,
  houseOverlay: HouseOverlay,
  label1: string,
  label2: string,
): string | null {
  const QUALIFYING_HOUSES = [1, 5, 7, 8]

  const candidates: Array<{ house: number; note: string }> = []

  // Check A: person1Planet in person2's houses
  if (INNER_PLANETS.includes(aspect.person1Planet as string)) {
    const entry = houseOverlay.person1InPerson2Houses.find(
      e => e.planet === aspect.person1Planet && QUALIFYING_HOUSES.includes(e.house)
    )
    if (entry) {
      const theme = getHouseTheme(entry.house)
      candidates.push({
        house: entry.house,
        note: `${label1}'s ${entry.planet} also falls in ${label2}'s ${ordinal(entry.house)} house (${theme.theme.toLowerCase()}).`,
      })
    }
  }

  // Check B: person2Planet in person1's houses
  if (INNER_PLANETS.includes(aspect.person2Planet as string)) {
    const entry = houseOverlay.person2InPerson1Houses.find(
      e => e.planet === aspect.person2Planet && QUALIFYING_HOUSES.includes(e.house)
    )
    if (entry) {
      const theme = getHouseTheme(entry.house)
      candidates.push({
        house: entry.house,
        note: `${label2}'s ${entry.planet} also falls in ${label1}'s ${ordinal(entry.house)} house (${theme.theme.toLowerCase()}).`,
      })
    }
  }

  if (candidates.length === 0) return null

  // Tie-breaking: prefer lower index in QUALIFYING_HOUSES; prefer Check A on tie
  candidates.sort((a, b) => QUALIFYING_HOUSES.indexOf(a.house) - QUALIFYING_HOUSES.indexOf(b.house))
  return candidates[0].note
}
```

This function is a pure local helper inside `SynastryPage.tsx` — it does not need to be exported or placed in a separate file.

### 7. Rendering the house note in the `AspectRow` expansion panel

The `AspectRow` component currently renders its expansion panel using only the `brief` prop (line 138–141 of `AspectRow.tsx`). There are two implementation options:

**Option A — Extend `AspectRow` with an `expansionNote` prop (preferred):**  
Add an optional `expansionNote?: string` prop to `AspectRowProps`. When present and non-empty, render the note beneath the brief paragraph inside the expansion `div`. The note uses a visually distinct style: smaller text, dimmer opacity, not italic (to contrast with the italic brief), with no left border (the brief's left border applies to the whole block).

```tsx
{expansionNote && (
  <p className="text-mystic-muted/70 text-xs leading-relaxed mt-1.5">
    {expansionNote}
  </p>
)}
```

This keeps `AspectRow` as the single source of expansion-panel rendering and makes the note available to any future caller without duplication.

**Option B — Render note outside `AspectRow` (not preferred):**  
Wrap each `AspectRow` in a container `div` and conditionally append a `<p>` for the house note outside the component. This avoids touching `AspectRow.tsx` but breaks the encapsulation of the expansion animation — the note would appear/disappear outside the animated `maxHeight` transition, creating a visual seam.

Use Option A.

### 8. The `maxHeight` expansion panel constraint

`AspectRow` currently hard-codes `maxHeight: expanded ? '6rem' : '0'` (line 133). At ~1.5 lines of brief text plus the house note (one additional line), the content may exceed 6rem on small screens or when names are long. Increase the `maxHeight` when `expansionNote` is present: `expanded ? '8rem' : '0'`. Guard this conditionally — `maxHeight` remains `6rem` when no note is present, to avoid layout jump for the common case.

### 9. Edge case: unknown-time chart (no house data)

When either person's birth time is unknown, house placements are not computed. `chartData.unknownTime === true` means `planet.house` is null or 0 for that person's planets. The `calculateHouseOverlays` function in `synastry.ts` populates `HouseOverlayEntry.house` from the partner chart's house system — if the receiving partner has `unknownTime`, house positions for the overlay are meaningless.

Guard: before generating a house note, verify `entry.house > 0 && entry.house <= 12`. The existing `HouseOverlaySection` already applies this guard (`invalidHouse` check at line 237). Apply the same check inside `resolveHouseNote`. If the overlay entry has an invalid house, skip it as if the entry were not found.

Additionally, the `HouseOverlaySection` for an unknown-time partner will already be empty or collapsed — the house note in the aspect row should similarly stay silent.

### 10. Edge case: no overlay entry found for the aspect's planets

This is the common case — most aspect rows will not find a qualifying overlay entry. `resolveHouseNote` returns `null`. `SynastryAspectsSection` passes `expansionNote={undefined}` (or omits the prop) to `AspectRow`. `AspectRow` renders identically to its current behavior. No UI change for these rows.

### 11. Edge case: `getSynastryHouseOverlayBrief` vs. `getHouseTheme` for note text

The house note sentence uses `getHouseTheme(entry.house).theme.toLowerCase()` for the parenthetical theme name — the same short phrase used in `HouseOverlaySection`'s `houseLabel` construction (line 241). Do not use `getSynastryHouseOverlayBrief` for the note — that function returns the full relational paragraph, which is too long and too rich for a one-line gloss. The `theme` field (`"Creativity, romance, children, self-expression"` for house 5) is appropriately compact; the parenthetical in the note can be shortened to the first clause if the full theme string is long. Acceptable to use `theme.name` (e.g. "House of Pleasure") instead if the theme string feels too dense — evaluate at implementation time.

### 12. Note tone and phrasing consistency

The note is a factual cross-reference, not a new interpretation. The phrasing `"${label1}'s ${planet} also falls in ${label2}'s Nth house (theme)"` is factual and subordinate — it points the reader to an interpretive connection without over-claiming what that connection means. The aspect brief already carries the relational interpretation; the house note is a locating signal: "this is also happening here."

Do not add editorializing language to the note ("this deepens the connection," "making this even more significant"). Factual pointer only. The reader's interpretive work is done by the aspect brief and the `HouseOverlaySection` brief together.

### 13. Type imports

`SynastryAspectsSection` will need to import `HouseOverlay` from `../../engine/synastry`. The current import at line 7 of `SynastryPage.tsx` already imports `HouseOverlayEntry` from that module — extend it to include `HouseOverlay`.

`AspectRow` will need `expansionNote?: string` added to `AspectRowProps` in `AspectRow.tsx` (line 8). No new type imports are required in `AspectRow.tsx`.

### 14. Visual hierarchy summary

When an aspect row is expanded and a house note is present, the expansion panel contains:

1. Left-border block (color-coded by nature): the italic aspect brief from `computeSynastryAspectBrief`
2. Directly beneath, no left border, dimmer: the house note in regular (non-italic) `text-mystic-muted/70 text-xs`

The house note is visually subordinate — shorter, dimmer — making it legible as a gloss rather than a competing brief.

### 15. Selectivity expected in practice

In a typical synastry chart with 15–25 aspect rows, the house note is expected to fire on 2–5 rows. Inner planets are 5 of 10–12 total planets; qualifying houses are 4 of 12. At random, the probability of a qualifying match per aspect is roughly (5/10) × (4/12) ≈ 17%, so for 20 aspect rows, expect 3–4 house note rows. This is consistent with the sprint vision's "selective, not mechanical" constraint and with Miyazaki's guidance that the note should feel like music placed at the right moment, not underscoring every beat.

---

## Out of Scope

- **No changes to `computeSynastryAspectBrief`.** The brief function signature and output are unchanged. The house note is a separate element rendered after the brief, not an extension of the brief text.
- **No changes to `HouseOverlaySection`.** The house overlay rendering in its dedicated section is unchanged.
- **No GPT call.** The note is derived entirely from `synastryData.houseOverlay`, which is already computed synchronously when `synastryData` is available.
- **No new data files.** All interpretation data needed (`getHouseTheme`) already exists.
- **No outer planets.** Jupiter, Saturn, Uranus, Neptune, Pluto, NorthNode do not qualify for house notes even when they appear in aspects.
- **No house 4 or house 12** in the qualifying set by default (see Spec 2).
- **No change to the Synastry compatibility scoring** or the `DimensionAxis` bars. Only the aspect row expansion panel is touched.
- **No change to the GPT synastry interpretation** (`getSynastryInterpretation` in `gptInterpretation.ts`). The house note is a static UI element.
- **No change to the synastry bi-wheel** or `ChartWheel` component.
- **No new navigation, tab, or modal.**

---

## Open Questions

1. **Should house 4 (Home) be included in the qualifying set?** The sprint vision's qualifying houses in the synastry section mention 1, 5, 7, 8. Jobs' voice says the same. Carmack says "1, 5, 7, 8" explicitly. However, `HIGH_SIGNAL_HOUSES` in the codebase already includes 4 and 12. If a real synastry chart shows a compelling Venus-Moon square where Venus is in the 4th house, the cross-reference ("her Venus also falls in your 4th house — home, family, emotional foundation") reads meaningfully. Leave out by default; revisit after reviewing 3–5 sample synastry charts against the qualifying set.

2. **Should the `maxHeight` increase (Spec 8) be derived dynamically** from a ref measurement, or should the fixed bump from `6rem` to `8rem` suffice? Dynamic measurement is more correct but adds complexity; the fixed bump is simpler and unlikely to clip at typical name lengths. Start with fixed bump; only revisit if QA finds truncation.

3. **Is the `theme.theme.toLowerCase()` parenthetical the right text**, or should it be `theme.name` (e.g. "House of Pleasure" vs. "creativity, romance, children, self-expression")? `theme.name` is shorter and less enumerative. `theme.theme` is more descriptive but comma-separated. Evaluate both in UI at implementation time; `theme.name` is the safer default if in doubt.

4. **When the overlay entry exists but `getSynastryHouseOverlayBrief` returns a non-null brief**, should the house note use that brief instead of the constructed sentence? The full overlay brief is rich but too long (one or two sentences) for a gloss note. Confirmed: use the constructed one-liner, not the full overlay brief. But should a truncated form (first clause only) of the overlay brief be used? Unlikely to improve on the factual one-liner; leave as-is unless design review finds the note too bare.

5. **Does the `AspectRow` `expansionNote` prop need to support JSX** (e.g. to link to the house overlay section)? Linking to the `HouseOverlaySection` scroll position would be a natural UX improvement ("tap to jump to full overlay brief"), but it requires a ref and scroll handler. Out of scope for this sprint — the note is plain text only. Flag as a potential follow-on enhancement.
