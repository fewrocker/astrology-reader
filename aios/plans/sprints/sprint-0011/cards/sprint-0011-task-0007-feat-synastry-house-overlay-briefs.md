**Type:** Feature
**Originated by:** Jobs, Carmack, Miyazaki, Taleb
**User guidance:** (none — sprint vision overrides)
**Status:** done
**Outcome:** Implemented 2026-05-14. Created `synastryHouseOverlayBriefs.ts` with 60 relational-voice entries (5 inner planets × 12 houses) + `getSynastryHouseOverlayBrief()`. Refactored `HouseOverlaySection` from `<table>` to card stack with high-signal filtering (inner planets in 1st/4th/5th/7th/8th/12th), left accent borders for key placements, outer planet generic templates, auto-open when high-signal entries present, and count in section header. TypeScript clean. Commit: f9bd133.

## Problem / Opportunity

`HouseOverlaySection` in `src/components/results/SynastryPage.tsx` (lines 159–188) renders two tables — "Person 1's Planets in Person 2's Houses" and "Person 2's Planets in Person 1's Houses" — each with three columns: Planet, In Sign, Falls in House. There is no interpretation text, no house name, no sense of what it means that Venus lands in House 7 versus House 11.

This is the most emotionally resonant section on the synastry page. "Your Venus falls in their 7th house" is one of the most charged facts in synastry interpretation — the 7th house is where a person projects partnership, and Venus landing there means the partner sees the native as a potential committed other. The product computes this fact, carries it to the render layer, and then displays it as a raw number: `House 7`.

The raw `HouseOverlayEntry` type (defined in `src/engine/synastry.ts`, lines 20–26) carries `planet`, `sign`, `house`, `degree`, and `minute`. All the data needed to compose a relational brief exists either in this type or in adjacent data sources:

- `HOUSE_THEMES` in `src/data/interpretations/houseThemes.ts` provides `name` and `theme` for all 12 houses via `getHouseTheme(house)`.
- `PLANET_IN_HOUSE` in `src/data/interpretations/planetInHouse.ts` provides natal-voice interpretations for all planet-house pairs.

Neither source is currently consulted by `HouseOverlaySection`. The section also renders collapsed by default (no `defaultOpen` prop passed to the `Section` wrapper), meaning the most emotionally loaded data on the page is hidden behind a click with no preview text to signal its value.

A secondary structural problem: the current `<table>` layout (three narrow columns) cannot accommodate 1–2 sentence interpretation text. Multi-sentence prose in a `<td>` cell fights the table structure. Interpretation text requires card-style layout with room to breathe — the table must become a card list before brief text can be added cleanly.

The sprint vision states plainly: "The product computes far more than it communicates." The house overlay section is the most literal example of that gap in the entire synastry page.

## Vision

A person opens the synastry reading for someone they are in a relationship with. They expand "Person 1's Planets in Person 2's Houses." Instead of a table of numbers, they see a short list of the placements that matter most — the handful of planet-in-house crossings that actually define how one person inhabits the other's life. Each entry shows the planet, the sign, the house name (not just the number), and one or two sentences that describe, in relational language, what it means that this planet lands here.

They read: "Your Venus in their 7th house — you step directly into the space where they seek a committed partner. Your presence activates their longing for a lasting bond."

That is twelve words of template and one lookup. But to the person reading it, it is a sentence that could only be true for this chart, this person, this relationship. Not a generic archetype. Not a dictionary definition. A relational fact that names what the placement means *between two people*.

Taleb's filtering principle applies here: do not show all 22 entries with equal weight. Show the 6–8 that are highest-signal — the inner planets in the relationship-defining houses. The rest are present but secondary; they do not need a featured brief to make the section readable.

The signature moment: the user sees "Your Moon in their 4th house" and below it: "Your emotional world lives in the heart of their home. They feel nurtured by your presence in ways they may not be able to articulate." They do not need an astrologer to explain what they just read. The product told them something true.

## Specifications

1. **Convert `HouseOverlaySection` from a table to a card list.** Remove the `<table>/<tbody>/<tr>/<td>` structure entirely. Replace it with a `<div>` stack where each entry is a self-contained card element. This is a prerequisite for all interpretation text additions — prose content cannot be cleanly laid out inside table cells.

2. **Each card header row must display:** planet glyph + planet name, zodiac glyph + sign name, house name (from `HOUSE_THEMES[house - 1].name`) alongside the house number. Example: "Venus in Libra · 7th House · House of Partnership." The house name must come from `getHouseTheme(entry.house).name`, not be hardcoded.

3. **Apply Taleb's high-signal filter as the primary display strategy.** Define a constant set of high-signal planet-house pairs: inner planets (Sun, Moon, Venus, Mars, Mercury) in the relationship-defining houses (1st, 4th, 5th, 7th, 8th, 12th). These 30 pairs (5 planets × 6 houses) are the ones that receive interpretation briefs and are featured prominently. All other planet-house combinations are present in the list but rendered in a reduced visual weight without briefs.

4. **The high-signal pairs must be identified programmatically**, not hardcoded per entry. Define two constant arrays: `INNER_PLANETS = ['Sun', 'Moon', 'Venus', 'Mars', 'Mercury']` and `HIGH_SIGNAL_HOUSES = [1, 4, 5, 7, 8, 12]`. An entry is high-signal if `INNER_PLANETS.includes(entry.planet) && HIGH_SIGNAL_HOUSES.includes(entry.house)`.

5. **Create a new file `src/data/interpretations/synastryHouseOverlayBriefs.ts`.** This file must contain a lookup table keyed by `${planet}_H${house}` covering all 5 inner planets × 12 houses = 60 entries. Each entry is a two-sentence relational brief written in second-person relational voice — the voice of "your planet in their house" — not the natal self-description voice of `PLANET_IN_HOUSE`. Example contrast: `PLANET_IN_HOUSE['Venus_H7'].brief` = "Partnership-focused and harmonious" (natal voice, self-description). The synastry overlay brief for Venus in partner's 7th = "Your capacity for love and beauty lands directly in their house of committed partnership — you are, to them, precisely what they have been looking for in a lasting bond."

6. **The relational voice requirement for `synastryHouseOverlayBriefs.ts` is strict.** Every entry must describe what the overlay *feels like to the partner* — how they receive and experience the incoming planet. Not "Venus is love and beauty" (archetype label). Not "you are partnership-focused" (natal restatement). The register is: "what lands in them, what they feel, what this presence activates in them."

7. **All 60 inner-planet entries must be written before the task is closed.** No stubs, no `// TODO` comments, no entries that read like archetype dictionaries. The Sun in each of the 12 houses: 12 entries. Moon: 12. Venus: 12. Mars: 12. Mercury: 12. Total: 60. This is the core writing work of the feature.

8. **Outer planets (Jupiter, Saturn, Uranus, Neptune, Pluto, NorthNode) use a generic template fallback**, not a per-entry table. The template: "[Planet] in their [house name] — [one-clause description drawn from house theme]." The house name comes from `getHouseTheme(house).name`. The house theme text comes from `getHouseTheme(house).theme`. No additional lookup table is needed for outer planets. Example output: "Your Saturn in their 11th House (House of Community) — your disciplining energy lands in the space where they build friendships and shared visions."

9. **High-signal entries must render their brief text visibly without requiring a tap or expand.** These are the entries that matter most; the user should not need to discover them. Render the brief text below the header row, visible by default, styled in `text-mystic-text/80 text-sm leading-relaxed`.

10. **Non-high-signal entries (outer planets, or inner planets in non-relationship houses) render without a brief.** They display the planet glyph + name + sign + house name at reduced opacity (`text-mystic-muted`). This visual separation communicates importance hierarchy without hiding data.

11. **Sort the displayed entries: high-signal entries first (in their natural planetary order: Sun, Moon, Venus, Mars, Mercury), non-high-signal entries after.** Within each group, maintain the original planet order from `HouseOverlayEntry[]`. This ensures the most emotionally resonant entries appear at the top of the section.

12. **The section must open in an expanded state (`defaultOpen={true}`) when at least one high-signal entry is present.** If no high-signal entries exist (e.g., a chart without birth time), keep `defaultOpen={false}`. The rationale: if the section has something to say, it should be open on arrival — the user should not have to discover that this section speaks.

13. **The section header must include a count of high-signal entries when any are present.** Example: "Person 1's Planets in Person 2's Houses (3 key placements)." The count is the number of entries that pass the high-signal filter, not the total entry count. This sets user expectation at the header level before the section body is read.

14. **No expand/collapse per-entry UI is required.** Taleb's filtering recommendation eliminates the need for row-level expand toggles — by showing only 6–8 high-signal entries with briefs, the section is already navigable without per-row interaction. The `AspectRow` expand/collapse pattern applies to aspect rows, not house overlay cards. The card structure is simpler: header + brief text, always visible.

15. **Do not use `PLANET_IN_HOUSE` entries for the synastry overlay briefs.** The entries in that table are natal-voice self-descriptions ("Your Venus in the 7th house means you attract loving relationships"). They describe the reader's own inner architecture. The synastry overlay briefs describe what the reader's planet means *to their partner* — a fundamentally different semantic. Reusing natal entries, even with pronoun substitution, produces the wrong register and will be noticeable to any user who reads carefully.

16. **The `synastryHouseOverlayBriefs.ts` table must export:** (a) a lookup record `SYNASTRY_HOUSE_OVERLAY_BRIEFS: Record<string, string>` keyed by `${planet}_H${house}`, and (b) a pure function `getSynastryHouseOverlayBrief(planet: string, house: number): string | null` that returns the lookup result or `null` for outer planets. Null signals the caller to use the generic template fallback.

17. **The generic outer-planet fallback logic must live in the component render, not in the data file.** The data file covers inner planets only. The component assembles the outer-planet template string at render time using `getHouseTheme`. This keeps the data file clean and the fallback visually testable.

18. **The two `HouseOverlaySection` instances on `SynastryPage.tsx` (lines 352–362) must both use the new component.** They differ only in `entries` and `label`. The `personLabel` prop should indicate whose planets are being shown in whose houses, so brief text can be framed correctly ("Your [planet]" always refers to the person whose planets are being overlaid, not the partner).

19. **Add a `personLabel` prop (e.g., `'Person 1'` or `'Person 2'`) to `HouseOverlaySection`.** Use it to produce brief-framing text: "Person 1's [planet] in Person 2's [house]" in the section subheader. This ensures the user always knows which direction the overlay is running. The section currently uses the `label` prop string for the section title, which is sufficient — `personLabel` is optional and can be derived from the existing `label` string if kept simple.

20. **Each card in the list must visually separate from adjacent cards.** Use `border-b border-mystic-gold/10` between entries, or a `gap-3` flex column. High-signal entries should have a subtle left accent border (`border-l-2 border-mystic-gold/40`) to mark their elevated importance. Non-high-signal entries have no left accent.

21. **The section's section subheader text must communicate the filtering.** Below the section's collapsed title bar, when expanded, include a single line: `"Showing [n] key placements — inner planets in relationship-defining houses."` This sets expectations and explains why not all entries carry briefs.

22. **No new GPT calls.** All briefs are static, client-side, computed at render time from the `synastryHouseOverlayBriefs.ts` table and the `getHouseTheme` function. Zero network calls.

23. **No changes to `HouseOverlayEntry` type or `src/engine/synastry.ts`.** The engine is not touched. The overlay data is already computed and available; this is purely a display and interpretation-data change.

24. **No changes to `HOUSE_THEMES`, `PLANET_IN_HOUSE`, or any existing interpretation data files.** The only new file is `synastryHouseOverlayBriefs.ts`. The sprint vision explicitly prohibits modifying existing interpretation databases.

25. **Handle the edge case where `entries` is empty.** Both `HouseOverlaySection` instances already have a guard (`if (entries.length === 0) return null`) — preserve this guard.

26. **Handle the edge case where birth time is unknown for one or both persons.** If house data is unavailable (houses default to 0 in `ChartData` when `unknownTime` is true), the overlay entries will not be generated by the engine (house assignment requires house cusps). Verify that the existing `synastry.ts` overlay calculation already guards for `unknownTime` — if it does not, `HouseOverlaySection` may receive entries with `house: 0`. The component must guard against `house: 0` or negative house values and skip brief generation for those entries, rendering only the planet + sign data.

27. **Quality bar for brief text:** every brief must pass the sprint vision's test — it would only make sense for someone whose planet is in that specific partner house. A brief that could appear in a mass-market horoscope column without knowing the chart fails. Example failure: "Venus brings love and beauty wherever it goes." Example pass: "Your Venus in their 4th house — you enter their private world, the space they guard most carefully, and make it feel beautiful. They may not have expected to feel this safe with you."

28. **The component file changes are confined to `src/components/results/SynastryPage.tsx`.** Specifically the `HouseOverlaySection` function (lines 159–188) and its two call sites (lines 352–362). No other component is touched.

## Out of Scope

- **Expand/collapse per entry.** Taleb's filtering makes row-level interaction unnecessary. The high-signal entries are few enough to read without toggling.
- **All-22-entries interpretation.** Non-high-signal entries intentionally receive no brief. This is a deliberate design decision, not an incomplete implementation.
- **Outer planet brief tables.** Jupiter, Saturn, Uranus, Neptune, Pluto, and NorthNode use the generic template fallback. A full 70-entry outer-planet table is not needed and would not improve signal-to-noise.
- **Synastry aspect rows.** A separate proposal (`feat-synastry-aspect-row-briefs`) covers the `SynastryAspectsSection`. This proposal is scoped to `HouseOverlaySection` only.
- **Composite transit rows.** Out of scope for this proposal.
- **Changes to `CompatibilitySection` or scoring.** The `elementCompat` sort bug and overall resonance score are tracked separately.
- **Changes to `buildSynastryPrompt`.** Element profile additions to the GPT prompt are a separate task.
- **UI redesign.** No changes to page layout, color scheme, typography, or section accordion behavior outside the `HouseOverlaySection` component.
- **New GPT calls.** Strictly prohibited by sprint vision.
- **Engine changes.** `synastry.ts`, `astronomy.ts`, and all calculation engines are not touched.
- **Writing relational briefs for inner planets in non-relationship houses (2nd, 3rd, 6th, 9th, 10th, 11th).** These planet-house pairs are present in `synastryHouseOverlayBriefs.ts` as the 60-entry full table, but they render as non-high-signal (no featured brief, reduced weight). If the table author wants to write them, they are useful; they are not required for the filtered display.

## Open Questions

1. **Should non-high-signal entries (outer planets, inner planets in non-relationship houses) be visible at all, or collapsible under a "Show all placements" toggle?** The current proposal shows them at reduced weight. If 12–14 reduced-weight entries below 6–8 featured entries still feels like an information wall in practice, a secondary collapse ("+ 14 more placements") would solve it without affecting the featured content.

2. **Should the `synastryHouseOverlayBriefs.ts` table cover all 60 inner-planet-in-house combinations, or only the 30 high-signal ones?** Writing 60 entries provides a complete table for future use (if filtering rules change). Writing only 30 reduces the initial writing burden. The full 60-entry table is specified above; this question is whether to defer the 30 non-high-signal entries to a future sprint.

3. **How should the `personLabel` direction be communicated in the brief text?** The current spec uses "Your [planet] in their [house]" where "Your" = the person whose planets are being overlaid and "their" = the partner. This is readable when each `HouseOverlaySection` is clearly labeled. If the label string is the only context (e.g., "Person 1's Planets in Person 2's Houses"), the brief framing is unambiguous. But if both persons have the same name or initials, the direction could be confused. Consider whether the `personLabel` prop should pass display names or just directional strings.

4. **Should high-signal entries be open by default but allow collapse per entry?** The current spec renders brief text statically visible (no toggle). This is simpler but means a user cannot hide briefs they have already read. The per-entry expand/collapse interaction is explicitly ruled out by this proposal (see Out of Scope), but if testing shows users want to collapse seen entries, the spec could be revisited.

5. **What is the correct treatment for `NorthNode`?** It is currently typed as `PlanetName | 'NorthNode'` in `HouseOverlayEntry`. Is NorthNode an outer planet for filtering purposes (treated as non-high-signal, generic template fallback), or does it warrant its own brief table entry? The karmic significance of NorthNode in a partner's house is a legitimate synastry fact, but covering it in this sprint may be over-scoping. Default recommendation: treat NorthNode as an outer planet for this sprint.

6. **Carmack noted that the `Section` component in `SynastryPage.tsx` is a byte-for-byte duplicate of the one in `SynastryTransitPage.tsx`.** Should this refactor (extract to `src/components/ui/CollapsibleSection.tsx`) be bundled with this task, since `SynastryPage.tsx` will be open anyway? It is not strictly required for this feature, but it eliminates a maintenance liability while the file is already being edited.

## Implementation Checklist

- [x] 1. HouseOverlaySection converted from table to card list
- [x] 2. Card header: planet glyph + name, zodiac glyph + sign, house number + name from getHouseTheme
- [x] 3. Taleb's high-signal filter applied: inner planets in relationship-defining houses
- [x] 4. High-signal pairs identified programmatically via INNER_PLANETS + HIGH_SIGNAL_HOUSES constants
- [x] 5. synastryHouseOverlayBriefs.ts created with 60-entry lookup table
- [x] 6. Relational voice — all entries describe what the partner receives/feels
- [x] 7. All 60 inner-planet entries written (Sun×12, Moon×12, Venus×12, Mars×12, Mercury×12)
- [x] 8. Outer planets use generic template fallback in component render
- [x] 9. High-signal briefs visible by default (no expand needed)
- [x] 10. Non-high-signal entries at reduced opacity (text-mystic-muted), brief at text-mystic-muted/70
- [x] 11. Sorted: high-signal first (Sun→Moon→Venus→Mars→Mercury), others after
- [x] 12. Section opens defaultOpen when high-signal entries present
- [x] 13. Section header count: "(N key placements)"
- [x] 14. No per-entry expand/collapse UI
- [x] 15. PLANET_IN_HOUSE not reused — new relational-voice entries written from scratch
- [x] 16. Exports SYNASTRY_HOUSE_OVERLAY_BRIEFS record and getSynastryHouseOverlayBrief() function
- [x] 17. Generic outer-planet fallback lives in component render, not data file
- [x] 18. Both HouseOverlaySection instances on SynastryPage use the new component
- [x] 19. personLabel: label prop is sufficient for direction framing (brief text uses "Your [planet]")
- [x] 20. Visual separation: border-b border-mystic-gold/10; high-signal left accent (bg-mystic-gold/40)
- [x] 21. Subheader: "Showing N key placements — inner planets in relationship-defining houses."
- [x] 22. No new GPT calls — all briefs are static, client-side
- [x] 23. No changes to HouseOverlayEntry type or src/engine/synastry.ts
- [x] 24. No changes to HOUSE_THEMES, PLANET_IN_HOUSE, or existing interpretation data files
- [x] 25. Empty entries guard preserved (returns null when entries.length === 0)
- [x] 26. house <= 0 or > 12 guard: skips brief generation, shows planet + sign only
- [x] 27. Brief quality: relational, specific to placement — passes sprint vision's quality bar
- [x] 28. Component changes confined to HouseOverlaySection in SynastryPage.tsx only
