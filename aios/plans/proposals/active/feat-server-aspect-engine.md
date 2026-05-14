# feat-server-aspect-engine

**Type:** Feature
**Originated by:** Carmack (strong), Jobs (implicit), Taleb (implicit)
**User guidance:** (none — sprint vision overrides)

---

## Problem / Opportunity

The server cannot compute natal aspect profiles. `calculateAspects` and `detectPatterns` live exclusively in `src/engine/aspects.ts` and have no server-side equivalent.

The consequence is visible in today's `handleDreamInterpretation` (`server/services/gpt.ts`, line 205). The dream handler now falls back to server-computed chart context when the client sends nothing — it calls `calculateChart`, gets a full set of planet positions, builds `natalCtx` via `buildNatalContextFromChart` (line 192). But `buildNatalContextFromChart` lists planet sign/degree/house placements only. It never computes what those planets do to each other. A natal context string assembled server-side today contains no Sun conjunct Neptune, no Saturn square Moon, no Grand Trine — none of the aspect vocabulary that makes a natal reading read like an actual chart interpretation rather than a table of positions.

The gap: the server has the planet longitudes (from `calculateChart`) but no function to find aspects among them. Every GPT handler that operates from server-computed chart data is missing the astrological connective tissue.

Beyond the dream handler, the same hole will widen as the sprint proceeds. `handleTransitInterpretation` (line 179) currently accepts an opaque `{ systemPrompt: string }` payload — it does not compute anything. When that handler is upgraded to compute its own prompt from stored birth data, the natal profile section of the transit prompt will need aspects. The `handleJournalAnnotation` handler (line 535) receives `topTransits` pre-filtered by the client; when the server computes those transits independently, natal aspect context will belong in the same computation pass. Any server-assembled GPT prompt that purports to represent a person's natal chart but omits aspects is an incomplete representation of that chart.

The specific omission: `src/engine/aspects.ts` exports `calculateAspects` (lines 62–98), `detectPatterns` (lines 103–186), the `ASPECT_DEFINITIONS` array (lines 21–29), and four TypeScript types: `AspectType`, `AspectDefinition`, `Aspect`, `AspectPattern`. All of these are pure longitude arithmetic over `PlanetPosition[]`. There are zero imports from `astronomy-engine`. The only import is `normalizeAngle` from `./zodiac`, which is already inlined in `server/engine/chartEngine.ts` (line 86). The functions have no side effects, no external calls, and no React or browser dependencies.

---

## Vision

When `server/engine/aspectEngine.ts` exists, the server can do two things it cannot do today:

**First:** given the `planets` array from any `calculateChart` call, it can compute the complete natal aspect list in a single function call — all seven aspect types, sorted by orb tightness, each with its nature, symbol, applying/separating status, and exact angular difference. That result can be embedded directly in any server-assembled GPT prompt. A dream interpretation assembled entirely server-side can say that this person has Moon trine Neptune (2.1° orb) in their natal chart and use that as a lens on the dream imagery — not because the client sent it, but because the server computed it from stored birth data.

**Second:** pattern detection — Grand Trine, T-Square, Grand Cross, Yod — becomes available server-side. A natal chart with a natal Yod is a chart the server can describe correctly. A natal Grand Cross is a structural fact the server can name.

The longer-horizon value is what Jobs identified: the experiences that require the server to know things across time — proactive morning briefings, journal annotations for historical dates, dream readings from a cold start — all need a complete picture of the natal chart as context. Aspect profiles are the vocabulary of that picture. Without them, the server's natal context is a list of addresses with no description of the relationships between the people who live there.

---

## Specifications

### 1. What `server/engine/aspectEngine.ts` exports

The file exports five items, matching the public interface of `src/engine/aspects.ts` exactly:

- **`AspectType`** — type alias, seven string literals: `'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition' | 'semi-sextile' | 'quincunx'`
- **`AspectDefinition`** — interface with `name: AspectType`, `angle: number`, `orb: number`, `symbol: string`, `nature: 'harmonious' | 'challenging' | 'neutral'`
- **`Aspect`** — interface with `planet1`, `planet2` (both `PlanetName | 'NorthNode'`), `type`, `angle`, `orb`, `exactAngle`, `applying`, `nature`, `symbol`
- **`AspectPattern`** — interface with `type: AspectPatternType` and `planets: (PlanetName | 'NorthNode')[]`
- **`ASPECT_DEFINITIONS`** — the seven-entry constant array from `aspects.ts` lines 21–29, with the natal orbs: conjunction 8°, sextile 6°, square 8°, trine 8°, opposition 8°, semi-sextile 2°, quincunx 3°
- **`calculateAspects(planets: PlanetPosition[]): Aspect[]`** — pairs all planets, computes angular differences via `angleDiff`, matches against `ASPECT_DEFINITIONS`, returns sorted by tightest orb
- **`detectPatterns(aspects: Aspect[]): AspectPattern[]`** — finds Grand Trine, T-Square, Grand Cross, Yod from the aspect list using the four detection loops already in `aspects.ts`

The `PlanetPosition` type used in the parameter of `calculateAspects` must be compatible with what `calculateChart` returns. `chartEngine.ts`'s `PlanetPosition` (line 25) carries `longitude` and `name` — both of which are the only fields `calculateAspects` actually reads. No structural mismatch.

### 2. Orb tables: `ASPECT_DEFINITIONS` vs `ASPECT_DEFS` in `chartEngine.ts` — these are different and must stay different

`chartEngine.ts` defines `ASPECT_DEFS` at line 78, a five-entry array used exclusively by `getActiveTransitAspects`. Those orbs are transit orbs — explicitly documented as "tight transit orbs (0.3x of natal orbs)": conjunction 2.4°, sextile 1.8°, square 2.4°, trine 2.4°, opposition 2.4°. They also cover only the five major aspects — no semi-sextile, no quincunx.

`ASPECT_DEFINITIONS` in `aspects.ts` carries natal orbs — the full 8° for major aspects, the minor aspect orbs for semi-sextile and quincunx. These are not interchangeable. A natal Grand Trine requires 8° trine orbs; the transit aspect snapshot requires 2.4° trine orbs to stay signal-to-noise useful.

The implementation must **not** unify these tables. `aspectEngine.ts` uses the natal orb table. `chartEngine.ts` keeps its transit orb table. If the Carmack-prescribed `server/engine/astroCore.ts` shared module is extracted before this file is written, `ASPECT_DEFINITIONS` should live in `astroCore.ts` and be imported by both `aspectEngine.ts` and any future transit engine that needs natal-orb aspect checking. The transit `ASPECT_DEFS` stays private to `chartEngine.ts` (or moves to a transit-specific scope in `transitEngine.ts`). The two tables must remain named differently and their distinct purposes documented in comments.

### 3. `normalizeAngle` dependency

`aspects.ts` imports `normalizeAngle` from `./zodiac`. That import does not exist on the server. The function is already available in `chartEngine.ts` (line 86) as a private function. For `aspectEngine.ts`, either:

- Inline the two-line `normalizeAngle` implementation directly (acceptable if `astroCore.ts` has not yet been extracted), or
- Import from `./astroCore` if that module exists at the time of writing

Do not import from `chartEngine.ts` to get `normalizeAngle` — that creates an intra-engine dependency where an astronomy-engine-heavy module is pulled in just for a math utility. The function is two lines; inline it if needed.

### 4. `PlanetName` type dependency

`aspects.ts` imports `PlanetName` from `./types`. On the server, `PlanetName` is defined locally inside `chartEngine.ts` as a `const` tuple and derived type (line 15). When writing `aspectEngine.ts`, define `PlanetName` locally or import from `astroCore.ts` if available. Do not import from `src/engine/types.ts` — that is a frontend source file.

### 5. GPT handlers that benefit and what changes in `gpt.ts`

**`handleDreamInterpretation` (line 205):** This is the primary beneficiary. When the server computes the natal chart via `calculateChart` (line 227), the resulting `computed.planets` array can be passed directly to `calculateAspects`. The top 5–7 aspects by orb can be appended to `natalCtx` before it is embedded in the dream prompt (line 269). Specifically: the `buildNatalContextFromChart` function (line 192) should be extended to accept an optional `aspects` parameter and append an `## Natal Aspects` section when present. The dream handler computes aspects immediately after chart computation and passes them through. This changes zero call sites outside the dream handler's own fallback block.

**Future `handleTransitInterpretation` upgrade:** When this handler is eventually upgraded to compute from stored birth data rather than accepting an opaque `{ systemPrompt: string }`, it will need aspects for the natal profile section of the transit prompt. `aspectEngine.ts` being present before that upgrade means the transit handler can be written with natal aspects from day one rather than retrofitted.

**`handleJournalAnnotation` (line 535):** Currently receives pre-computed `chartData` with a stripped-down `planets` array (missing `longitude`). The current local `Planet` interface in `gpt.ts` (lines 10–18) omits `longitude`, which means `calculateAspects` cannot be called against it even if `aspectEngine.ts` exists. The stripped type is a separate technical debt item (noted in Carmack's voice analysis). Once the journal handler is upgraded to compute its own chart server-side, the full `ServerChartData.planets` will have `longitude` and aspects can be computed for journal annotations.

**`handleDreamInterpretation` change in `gpt.ts` — the only modification in scope for this proposal:**

```
Import: add `calculateAspects` from `../engine/aspectEngine.js`

In the chart fallback block (lines 226–238):
  After computing `const computed = calculateChart(...)` and setting `natalCtx`:
  const natalAspects = calculateAspects(computed.planets)
  natalCtx = buildNatalContextFromChart(computed, row.birth_date, natalAspects)

In `buildNatalContextFromChart` signature:
  Add optional third parameter `aspects?: Aspect[]`
  When present, append:
    "\n## Natal Aspects (tightest orb first)\n"
    + aspects.slice(0, 7).map(a => `${a.planet1} ${a.symbol} ${a.planet2} (${a.orb}°, ${a.nature})`).join('\n')
```

No other handlers are modified as part of this proposal.

### 6. Implementation port fidelity

The port from `src/engine/aspects.ts` is intended to be semantically identical. The helper functions `findSharedPlanet`, `getOtherPlanet`, `hasPair`, `arraysEqual` (lines 189–205) are private to the module and are ported as private functions. The `applying` heuristic at line 76 (`orb < def.orb * 0.5`) is copied exactly — it is a known approximation and is not improved in this port. The `break` after matching the first aspect per pair (line 89) is preserved — it enforces one aspect per planet pair, tightest match only. The sort by ascending orb (line 96) is preserved.

---

## Out of Scope

- **Transit orb aspects.** `aspectEngine.ts` handles natal orbs only. Transit aspect computation (the tighter orbs used in `getActiveTransitAspects` and the future `transitEngine.ts`) is owned by `chartEngine.ts` and `transitEngine.ts`. No changes to transit orb logic.
- **`computeEnergyRating`.** This function in `src/engine/transits.ts` returns Tailwind class strings. It has no server utility and is not ported.
- **Synastry cross-aspects.** The `calculateSynastryAspects` function in `src/engine/synastry.ts` applies aspect detection across two charts simultaneously. That logic belongs in the future `synastryEngine.ts`, not here.
- **Aspect interpretation text.** The interpretation strings in `src/data/interpretations/` are not touched. `aspectEngine.ts` produces structured `Aspect` objects; it does not produce human-readable interpretation sentences. That remains the job of the GPT prompt layer.
- **Frontend `aspects.ts`.** The frontend file is not modified. The client-side calculation continues unchanged for instantaneous UI response.
- **The `astroCore.ts` shared module extraction.** If `astroCore.ts` does not yet exist when this proposal is implemented, `aspectEngine.ts` inlines the two dependencies it needs (`normalizeAngle`, `PlanetName`). Whether to perform the extraction first is a sequencing decision belonging to the `code-server-astrocore-module` proposal, not this one.
- **`transitEngine.ts`.** This proposal does not touch transit calculation. The aspect engine is a prerequisite for future transit prompt assembly, not a requirement for writing it.
- **Pattern detection in GPT prompts.** `detectPatterns` is ported but not yet wired into any GPT prompt. Embedding pattern results in prompts (e.g., "You have a natal Grand Trine in Water") is a future prompt enhancement step, out of scope here.

---

## Open Questions

**1. Whether `buildNatalContextFromChart` should include aspects by default or only when an `aspects` parameter is explicitly passed.**
The safest approach is opt-in: the function signature adds an optional `aspects?: Aspect[]` parameter, and callers that don't have aspects simply omit it. This preserves backward compatibility with any call sites that pass a `ServerChartData` without having computed aspects first. The alternative — always computing aspects inside `buildNatalContextFromChart` — would require the function to import `calculateAspects`, coupling what is currently a formatting utility to the aspect engine. Opt-in is cleaner.

**2. How many aspects to include in the dream prompt's natal section.**
The full natal aspect list for a typical chart is 15–25 aspects. Including all of them would materially increase prompt token count. The `slice(0, 7)` in the specification above is a reasonable default — the seven tightest aspects by orb represent the most structurally significant connections in the chart. Whether the right number is 5, 7, or 10 is an empirical question about prompt quality vs cost. This can be adjusted without changing the interface.

**3. Whether `PlanetName | 'NorthNode'` should be unified into a single server-side type.**
Both `chartEngine.ts` and `aspects.ts` use `PlanetName | 'NorthNode'` as a compound type. On the server this pattern will appear in every engine file. If `astroCore.ts` is written before `aspectEngine.ts`, it is the right place to define a `ServerPlanetName = PlanetName | 'NorthNode'` alias. If `astroCore.ts` does not yet exist, the inline definition is acceptable. The question is whether to hold this proposal until `astroCore.ts` exists. Given that the port itself is trivial (the hard work is the dependency resolution), sequencing after `astroCore.ts` is preferred but not strictly required.

**4. Grand Cross detection correctness in the port.**
The Grand Cross detection block in `aspects.ts` (lines 147–167) has a known structural issue: the `hasAllSquares` guard reads `squares[0]!` before checking if `squares` is non-empty, and the OR condition on line 155 effectively short-circuits if any single square happens to match the first pair. The logic was written to require 4 adjacent squares but the implementation only enforces it weakly. This is a pre-existing frontend bug. The port copies it faithfully — the spec says behavioral parity, not correctness improvements. Noting this so the implementing engineer does not "fix" the detection logic during porting and silently diverge from the frontend's behavior.
