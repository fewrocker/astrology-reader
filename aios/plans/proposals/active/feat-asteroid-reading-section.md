# Proposal: feat-asteroid-reading-section

**Type:** Feature
**Originated by:** Jobs, Miyazaki, Carmack, Taleb (all four voices)
**Depends on:** `code-asteroid-interpretation-wire-up` must be merged before this feature is implemented. That change wires asteroid interpretations through `assembleReading()` so that `PlanetReading` objects for the five asteroids carry populated `signInterpretation`, `houseInterpretation`, and `retrogradeInterpretation` fields instead of `null`.

---

## Problem / Opportunity

### What is missing today

The five asteroids — Chiron, Ceres, Pallas, Juno, and Vesta — are computed as full `PlanetPosition` entries in `ChartData.planets` and are surfaced in the flat planet table at the bottom of `ResultsPage.tsx` (lines 92–107). Sprint 0014 authored 60 sign interpretations and 60 house interpretations for them (all in `src/data/interpretations/planetInSign.ts` lines 145–214 and `src/data/interpretations/planetInHouse.ts` lines 145–214). Every word of that copy exists and is expressive. None of it reaches the user.

There are two layers of suppression. First, `assembleReading()` in `src/data/interpretations/index.ts` lines 138–141 explicitly guards against asteroid interpretations:

```ts
signInterpretation: !isAsteroid(p.name as BodyName) ? getPlanetInSignInterpretation(...) : null,
houseInterpretation: (chart.unknownTime || isAsteroid(p.name as BodyName)) ? null : ...,
retrogradeInterpretation: (p.retrograde && !isAsteroid(p.name as BodyName) ...) ? ... : null,
```

The `code-asteroid-interpretation-wire-up` proposal removes those guards. After that change the `FullReading.planets` array will contain all five asteroids with fully populated `PlanetReading` objects.

Second, `PlanetSection` in `src/components/reading/ReadingDisplay.tsx` (lines 141–149) renders `reading.planets` without filtering. After the wire-up change, asteroids will appear inside the classical planet section alongside Sun, Moon, Mercury, etc. That is semantically wrong: asteroids operate on a different register — symbolic depth markers, not direct behavioral drivers — and mixing them into the classical planet list dilutes both groups.

The result today is that a user who comes to this app to understand their Chiron wound, their Ceres nourishment cycle, or their Vesta vocation receives nothing. The data exists. The archetype vocabulary exists (`ASTEROID_ARCHETYPES` in `src/engine/types.ts` lines 48–54, with values `'Wounded Healer'`, `'Nourisher'`, `'Strategist'`, `'Devoted Partner'`, `'Sacred Flame'`). The user sees a bare position in a table.

### Why this matters architecturally

`PlanetSection` is rendered as `defaultOpen` (line 143 of `ReadingDisplay.tsx`). If asteroids flow through it after the wire-up, the section expands significantly and the hierarchy of attention is lost. The classical planets are the primary behavioral story. The asteroids are a secondary, deeper layer. That difference in weight needs to be represented structurally in the UI, not just textually.

---

## Vision

A user opens their birth chart reading. They work through the classical planet section first — their dominant story. Then they notice a separate section below it, visually quieter, in amber rather than gold: **Asteroids & Minor Bodies**. The section header carries a subtitle: "Symbolic depth — open to explore your wounds, vocations, and relational patterns." Collapsed by default.

They open it. Five cards appear. Each card is immediately distinct from the planet cards: the archetype badge — "Wounded Healer", "Nourisher", "Strategist", "Devoted Partner", "Sacred Flame" — sits right below the name, giving the user vocabulary they don't have to supply themselves. Chiron in Cancer: the brief interpretation is already named as a wound about belonging. The user recognizes it instantly. They expand the card and read a full paragraph about how the hurt lives in early nourishment, and how the gift is creating safety for others.

The cards are visually unified through amber coloring: borders in `amber-400/20`, badges in amber, expanded section labels in `amber-400/80`. This is distinct from the gold (`mystic-gold`) of the planet section — similar family, different register, immediately legible as a separate category.

A user with unknown birth time sees only sign placement (no house). A user with retrograde asteroids sees a brief retrograde note when expanded. The section is self-contained: it does not depend on any other section to make sense of it, and it does not clutter the classical reading.

The signature moment: a user who has spent years hearing about their "Chiron wound" in podcast astrology opens this section and finds a full paragraph that names exactly what that wound is in their specific sign — without them having to look it up elsewhere. The app becomes the place where the vocabulary clicks into place.

---

## Specifications

### Data requirements

1. This feature must not be implemented until `code-asteroid-interpretation-wire-up` is merged. Concretely: `assembleReading()` must return asteroid `PlanetReading` objects with non-null `signInterpretation` fields for the feature to have anything to render.

2. Asteroid `PlanetReading` objects are already present in `FullReading.planets` (after the wire-up). The `AsteroidSection` component must extract them by filtering `reading.planets` using `isAsteroid(pr.planet.name as BodyName)` imported from `src/engine/types.ts`. The filter must be applied inside the component, not in the caller.

3. The `ASTEROID_ARCHETYPES` record (`src/engine/types.ts` line 48) maps each `AsteroidName` to its archetype string. The `AsteroidCard` must read from this record using `pr.planet.name as AsteroidName` as the key.

4. The `ASTEROID_GLYPHS` record (`src/engine/types.ts` line 44) provides the Unicode glyph for each asteroid. `AsteroidCard` must use `getBodyGlyph(pr.planet.name as BodyName)` (already exported from `src/engine/types.ts` line 60) for the glyph, consistent with how `AspectSection` and `HousesOverview` resolve glyphs.

5. The `ZODIAC_GLYPHS` record is already imported in `ReadingDisplay.tsx` and must be used for sign glyphs in `AsteroidCard`.

6. The five asteroids in display order must follow `ASTEROID_NAMES` order: `['Chiron', 'Ceres', 'Pallas', 'Juno', 'Vesta']` (line 40 of `src/engine/types.ts`). Cards must appear in this canonical order, not sorted by position or house.

### Component architecture

7. A new sub-component `AsteroidCard` must be defined in `src/components/reading/ReadingDisplay.tsx`, following the same file-local convention used by `PlanetCard`, `AspectRow`, `PatternCard`, `HouseCard`, and `RetrogradePlanetCard`. It must not be exported; it is used only by `AsteroidSection`.

8. A new exported component `AsteroidSection` must be defined in the same file, following the same export convention as `PlanetSection`, `AspectSection`, `BalanceSection`, etc.

9. `AsteroidSection` must use the existing `Section` component (`ReadingDisplay.tsx` lines 13–27) for its outer accordion shell. It must pass `defaultOpen={false}` — the section is collapsed by default. It must not reimplement the accordion.

10. `AsteroidSection` must accept props `{ reading: FullReading; showHouse: boolean }`, matching the signature of `PlanetSection`. `showHouse` is false when `chartData.unknownTime` is true.

11. `AsteroidSection` must guard against the case where no asteroid `PlanetReading` objects have a populated `signInterpretation`. If all five asteroids have `signInterpretation === null` (i.e., the wire-up has not been applied), the component must return `null` rather than rendering an empty section. The guard: `if (asteroids.every(pr => !pr.signInterpretation)) return null`.

### AsteroidCard — collapsed state

12. The collapsed card must show, on a single clickable row:
    - The asteroid glyph (via `getBodyGlyph`)
    - The asteroid name (`pr.planet.name`)
    - A retrograde badge `Rx` (same style as `PlanetCard` line 91: `text-amber-400 text-xs border border-amber-400/30 rounded px-1`) when `pr.planet.retrograde` is true
    - The word "in" in `text-mystic-muted`
    - Sign glyph + sign name in `text-amber-400` (not `text-mystic-gold` — amber distinguishes asteroids from planets)
    - House number when `showHouse` is true: `· House {pr.planet.house}` in `text-mystic-muted text-sm`
    - The archetype badge immediately below the name line (see spec 13)
    - The `brief` text from `signInterpretation` below the name row in `text-mystic-muted text-sm mt-1` when `signInterpretation` is non-null
    - An expand/collapse indicator `+` / `−` flush right, in `text-mystic-muted text-sm`

13. The archetype badge must appear as an inline pill immediately to the right of the asteroid name (on the same name row, not below it). It must use:
    - `text-xs font-medium` for text
    - `bg-amber-900/20 text-amber-400 border border-amber-400/20 rounded px-1.5 py-0.5` for styling
    - Content: the value from `ASTEROID_ARCHETYPES[pr.planet.name as AsteroidName]`

14. The card's outer container must use `border border-amber-400/10 rounded-lg p-4 mb-2` — the amber border variant replacing `border-mystic-gold/10` used in `PlanetCard`.

15. The clickable button must cover the entire card header area, using `w-full text-left flex items-start gap-3` — identical layout convention to `PlanetCard` line 85.

### AsteroidCard — expanded state

16. When expanded, the card must show an expanded content block with `mt-3 ml-9 space-y-3 text-sm` (same inset as `PlanetCard` line 106).

17. The sign interpretation block must appear first when `signInterpretation` is non-null:
    - Label: `{pr.planet.name} in {pr.planet.sign}` in `text-amber-400/80 font-medium text-xs uppercase tracking-wider mb-1`
    - Body: `signInterpretation.detail` in `text-mystic-text/90 leading-relaxed`

18. The house interpretation block must appear second when `showHouse` is true and `houseInterpretation` is non-null:
    - Label: `{pr.planet.name} in House {pr.planet.house}` in `text-amber-400/80 font-medium text-xs uppercase tracking-wider mb-1`
    - Body: `houseInterpretation.detail` in `text-mystic-text/90 leading-relaxed`

19. The retrograde block must appear last when `retrogradeInterpretation` is non-null:
    - Container: `rounded-md p-3 bg-red-900/10` (same as `PlanetCard` line 128)
    - Label: `℞ Retrograde at Birth` in `font-medium text-xs uppercase tracking-wider mb-1 text-red-400`
    - Body: `retrogradeInterpretation.detail` in `text-mystic-text/80 leading-relaxed`

20. Expanded state is controlled by a local `useState(false)` inside `AsteroidCard`, independent for each card. Expanding one card must not collapse or affect others.

### AsteroidSection — section header and intro text

21. The `Section` title must be `"Asteroids & Minor Bodies"` — not `"Asteroids (5)"` because the count adds no value here (it is always five), and not just `"Asteroids"` because Chiron is technically a centaur.

22. Immediately inside the `Section` body, before the first card, there must be a one-sentence intro paragraph in `text-mystic-muted text-sm mb-4`:

    > "The asteroids mark symbolic territory — wounds being healed, gifts being offered, and patterns of devotion or strategy that run beneath the surface of the chart."

    This gives the user context for why this section exists without overpromising.

23. The intro paragraph must not mention specific asteroid names — the cards themselves carry those names. The intro is purely about the category.

### Placement in ResultsPage

24. `AsteroidSection` must be imported in `src/components/results/ResultsPage.tsx` alongside the existing imports on line 7.

25. `AsteroidSection` must be inserted between `PlanetSection` (currently line 67) and `AspectSection` (currently line 68). The resulting render order in `ResultsPage.tsx` must be:

    ```tsx
    <PlanetSection reading={reading} showHouse={!chartData.unknownTime} />
    <AsteroidSection reading={reading} showHouse={!chartData.unknownTime} />
    <AspectSection reading={reading} />
    ```

26. `AsteroidSection` must not appear in `SynastryPage.tsx` or `SynastryTransitPage.tsx`. Those pages have their own reading structures. Scope is natal chart only.

### PlanetSection filtering (post-wire-up coordination)

27. After `code-asteroid-interpretation-wire-up` is applied, `reading.planets` will include asteroid `PlanetReading` objects. `PlanetSection` must be updated to exclude them: the `reading.planets.map(...)` call at line 144–146 must be preceded by a filter: `.filter(pr => !isAsteroid(pr.planet.name as BodyName))`. This prevents asteroids from appearing in both sections simultaneously. This change is part of this feature's implementation scope.

28. The `PlanetaryStrengthSection` component (`ReadingDisplay.tsx` lines 492–544) already filters using `pr.planet.name !== 'NorthNode'`. After the wire-up, it may also receive asteroid entries. It must be updated to also filter out asteroids: `.filter(pr => pr.planet.name !== 'NorthNode' && !isAsteroid(pr.planet.name as BodyName))`. Asteroids have no classical dignity system; including them in the strength bars would be semantically wrong and would render with `score: 0` (peregrine) for all five, adding noise without meaning.

29. `RetrogradeSummarySection` (`ReadingDisplay.tsx` lines 575–596) filters via `reading.planets.filter(pr => pr.retrogradeInterpretation)`. After the wire-up, asteroid retrograde interpretations are null (the wire-up proposal notes that retrograde data for asteroids does not yet exist in `src/data/interpretations/retrogrades.ts`). This filter will therefore continue to exclude asteroids correctly by coincidence — but this must be verified during implementation. If asteroid retrograde interpretations are added later, the retrograde section must explicitly exclude asteroids to avoid double-display with the asteroid section.

### Visual design — amber theming

30. The amber palette for all `AsteroidCard` and `AsteroidSection` elements must use Tailwind's `amber-*` scale, not `mystic-gold`. The `mystic-gold` custom color is used throughout `ReadingDisplay.tsx` for classical planet content. Amber is Tailwind built-in and visually adjacent to gold while being distinctly cooler and earthier — appropriate for material/body-focused asteroid symbolism.

31. Summary of required amber classes:
    - Card border: `border-amber-400/10`
    - Archetype badge background: `bg-amber-900/20`
    - Archetype badge text: `text-amber-400`
    - Archetype badge border: `border-amber-400/20`
    - Sign name text in collapsed row: `text-amber-400`
    - Section labels in expanded block: `text-amber-400/80`
    - Retrograde badge in collapsed row: `border border-amber-400/30 text-amber-400`

32. The `Section` component's header uses `text-mystic-gold` for its title (line 21 of `ReadingDisplay.tsx`). The `AsteroidSection` does not override this — the `Section` component is shared infrastructure and must not be modified. The amber theming lives only inside the individual `AsteroidCard` components.

### UI states and edge cases

33. **Unknown birth time:** When `showHouse={false}`, `AsteroidCard` must omit the house number from the collapsed row and must not render the house interpretation block in the expanded view. The section must still render (sign-only is valid and useful).

34. **No retrograde:** When `pr.planet.retrograde` is false and `pr.retrogradeInterpretation` is null, neither the Rx badge nor the retrograde block appears. This is the common case for most natal charts.

35. **Missing sign interpretation:** If an individual asteroid's `signInterpretation` is null (should not happen post wire-up, but must be handled defensively), `AsteroidCard` must not render the brief text in collapsed state and must not render the sign block in expanded state. The card still renders (glyph, name, archetype badge are always present).

36. **Missing house interpretation:** If `houseInterpretation` is null when `showHouse` is true, the house block is simply omitted from the expanded view. This can occur if `getPlanetInHouseInterpretation` returns null for a given asteroid/house combination.

37. **All interpretations missing (section-level guard):** Per spec 11, if all five asteroid `PlanetReading` objects have null `signInterpretation`, the component returns null. This prevents an empty section from appearing during development or if the wire-up was not applied.

38. **Expand behavior on mobile:** The clickable button must target the entire card header row. On mobile widths, the `flex items-start gap-3` layout must not break. The archetype badge may wrap to a second line on narrow screens — this is acceptable. The brief text must not be truncated.

### Accessibility

39. The outer button element on each `AsteroidCard` must have an `aria-expanded` attribute reflecting the current `expanded` state (`true`/`false`).

40. The `aria-expanded` attribute on the `Section` accordion button is already handled by the existing `Section` component (inherited behavior). `AsteroidSection` adds no special accessibility markup at the section level.

41. The archetype badge is presentational text that is already part of the visible label — it does not need a separate `aria-label`.

42. The glyph character (e.g., `⚷` for Chiron) must have a `title` attribute matching the asteroid name for screen readers, consistent with how `BigThreeRow` uses `title={label}` on glyph spans (line 34 of `ReadingDisplay.tsx`).

### Performance

43. All five `AsteroidCard` components are rendered unconditionally when the section is open. There is no virtualization needed — five cards is trivially small.

44. The asteroid filter (`reading.planets.filter(pr => isAsteroid(...))`) runs on every render of `AsteroidSection`. With at most 15–20 entries in `reading.planets`, this is O(n) with negligible cost. No memoization is required.

45. `expanded` state for each `AsteroidCard` starts as `false`. Initial render of the section (when the accordion opens) renders all five cards in collapsed state. Expanding a card re-renders only that card. No cross-card state interactions.

### Acceptance checks

46. After implementation, `reading.planets` in `PlanetSection` must contain exactly the ten classical planets plus NorthNode — no asteroids.

47. After implementation, `AsteroidSection` must contain exactly five cards when rendered with a chart that has all five asteroids (all natal charts do).

48. A user with `unknownTime: true` must see only sign placements in the asteroid cards — no house numbers, no house interpretation blocks.

49. A user with `unknownTime: false` must see both sign and house placements in the asteroid cards when expanded.

50. The section must be collapsed when the page first loads. The user must actively click to open it.

51. Expanding one `AsteroidCard` must not affect the expanded/collapsed state of any other `AsteroidCard`.

52. The `PlanetaryStrengthSection` must not contain any of the five asteroids in its strength bar list.

53. The `RetrogradeSummarySection` must not double-display any asteroid that also appears (with a retrograde note) in `AsteroidSection`. Given that asteroid retrograde interpretations are currently null, this means both sections show retrograde status only via the classical planet list — but this assumption must be verified by reading the state of `NATAL_RETROGRADE` in `src/data/interpretations/retrogrades.ts` during implementation.

54. The `Planet Positions` table at the bottom of `ResultsPage.tsx` (lines 92–107) renders all `chartData.planets` including asteroids. This is correct — the raw table is a data surface, not an interpretive surface. It must remain unchanged.

55. TypeScript must compile with no new errors introduced. In particular, the `isAsteroid` call within `AsteroidSection` requires that `BodyName` and `AsteroidName` types are imported properly.

---

## Out of Scope

- Asteroid aspects (asteroid-to-planet and asteroid-to-asteroid aspects are filtered in `filterAsteroidAspects()` in `src/engine/aspects.ts` and appear in `AspectSection` when relevant — this proposal does not change that behavior)
- Asteroid dignity/strength scoring (no classical dignity system applies; `PlanetaryStrengthSection` excludes asteroids per spec 28)
- Asteroid section in `SynastryPage.tsx` or `SynastryTransitPage.tsx`
- Adding asteroid retrograde interpretations to `src/data/interpretations/retrogrades.ts` (that is a separate data task)
- Sorting or grouping asteroid cards by sign, house, or any other criterion (canonical order per `ASTEROID_NAMES` is sufficient)
- An "explain asteroids" tooltip or educational modal (the intro sentence in spec 22 is the full educational surface)
- Adding asteroids to the `FocusSection` (`focus.relevantPlanets` is populated from `FOCUS_AREA_MAPPINGS` which only maps classical planets — this is intentional and out of scope)
- Changing the amber theming on the chart wheel or any other component (scope is `ReadingDisplay.tsx` and `ResultsPage.tsx` only)

---

## Open Questions

1. **`PlanetSection` defaultOpen after asteroid extraction:** Currently `PlanetSection` renders `defaultOpen` (line 143). After asteroids are removed from it, the section has 11 entries (10 planets + NorthNode). Does the product want to maintain `defaultOpen` for planets? The current behavior is intentional — planets are the primary story — so no change is proposed, but this should be confirmed.

2. **Retrograde asteroids in the wild:** Chiron, Ceres, Pallas, Juno, and Vesta are retrograde frequently (each for several months per year). A natal chart could have three or four retrograde asteroids. The `AsteroidSection` currently shows the `Rx` badge and (if the data exists) a retrograde block per card. If retrograde data for asteroids is authored later, the implementation must handle this without requiring a change to the component — the null check in spec 19 covers it. Confirm this with the retrograde data author.

3. **NorthNode in `AsteroidSection`:** NorthNode is not an asteroid (`isAsteroid('NorthNode')` returns false), so it will not appear in `AsteroidSection`. It will remain in `PlanetSection` after the filter in spec 27. This is the correct behavior — but it should be confirmed that no stakeholder expects NorthNode to be grouped with the asteroids.

4. **Amber color contrast on dark background:** `text-amber-400` on the dark mystic background (`bg-mystic-dark` or equivalent) must meet WCAG AA contrast requirements. `amber-400` is `#fbbf24` — on typical dark backgrounds this achieves approximately 8:1 contrast, well above the 4.5:1 minimum for normal text. This should be verified with the actual background color value in `tailwind.config.js`.

5. **`Section` component title color:** The `Section` component's title uses `text-mystic-gold` unconditionally (line 21 of `ReadingDisplay.tsx`). The `AsteroidSection` title will therefore appear in `mystic-gold`, not amber. This is a deliberate constraint (the `Section` is shared infrastructure). If the product wants the asteroid section title to appear in amber, `Section` would need to accept an optional `titleColor` prop — or a new `AmberSection` wrapper would need to be created. This trade-off should be evaluated; the current proposal accepts the gold title to avoid modifying shared infrastructure.
