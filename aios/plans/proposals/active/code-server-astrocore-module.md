# Proposal: Extract `server/engine/astroCore.ts`

**Type:** Code Enhancement
**Originated by:** Carmack (strong), Taleb (strong)
**User guidance:** (none — sprint vision overrides)

---

## Problem / Opportunity

### The duplication is already entrenched — and the sprint will make it worse

Six functions exist in multiple places right now, before a single line of sprint 0012 is written:

| Symbol | `src/engine/astronomy.ts` | `src/engine/transits.ts` | `server/engine/chartEngine.ts` |
|---|---|---|---|
| `normalizeAngle` | yes | via `./zodiac` | yes (private, line 86) |
| `longitudeToZodiac` | yes | via `./zodiac` | yes (private, line 90) |
| `getPlanetLongitude` | yes | yes (local copy, line 60) | yes (private, line 129) |
| `getMeanNodeLongitude` | yes | yes (local copy, line 67) | yes (private, line 146) |
| `BODY_MAP` | yes | yes (local copy, line 47) | yes (private, line 64) |
| `PLANET_NAMES` | yes | via `./types` | yes (private, line 11) |
| `getHouseForLongitude` | yes | yes (via `./astronomy`) | yes (private, line 254) |
| `ZODIAC_SIGNS` | yes | via `./zodiac` | yes (private, line 5) |

Sprint 0012 is chartered to port five more engine files to `server/engine/`. Each port starts from the corresponding frontend file. Each frontend file carries local copies of at least `getPlanetLongitude` and `getMeanNodeLongitude`. The path of least resistance — copy file, adjust imports, verify output — produces five new copies of those eight functions. After the sprint, the codebase will contain six copies of `normalizeAngle` and five copies of `getMeanNodeLongitude` scattered across `server/engine/`.

The sprint vision names this problem directly: "duplicate logic should be resolved by establishing a clean shared module structure in `server/engine/`, not by accumulating more copies." The vision also says a precision bug would require fixes in 6+ files. Both assessments are correct. Without extraction first, the sprint produces exactly the accumulation the vision warns against.

### The stripped `ChartData` interface in `gpt.ts` silently drops fields that the prompt builders need

`server/services/gpt.ts` lines 22–28 define a local `ChartData` interface:

```typescript
interface ChartData {
  planets: Planet[]
  angles: Angles
  unknownTime: boolean
}
```

where `Planet` (lines 10–17) is:

```typescript
interface Planet {
  name: string
  sign: string
  house: number
  retrograde: boolean
  degree: number
  longitude: number
}
```

This type is missing `minute`. The frontend `buildTransitPrompt` (transits.ts line 321) formats planet positions as `${p.degree}°${p.minute}' ${p.sign}` — arc-minute precision is part of the output specification. When any ported server-side prompt builder receives a `Planet` from this local type, `p.minute` is `undefined`. The formatted position reads `°undefined'`. The degraded output reaches GPT and produces a reading that silently omits the precision the client version always included.

`Angles` (lines 19–22) is similarly stripped — it carries only `sign`, not `degree` or `minute`. `buildTransitPrompt` lines 323–324 format both angle fields with degree and minute. The stripped server type will silently drop that detail from every server-assembled prompt.

The correct canonical type already exists: `ServerChartData` exported from `server/engine/chartEngine.ts` (line 42). Every handler in `gpt.ts` that builds a prompt should use `ServerChartData`, not the stripped local alias. The stripped interface should be retired as each handler is upgraded.

### The `analyzeElements` dependency blocks any server-side prompt builder

`buildTransitPrompt` (transits.ts line 361), `buildSynastryPrompt`, and `buildSolarReturnPrompt` all call `analyzeElements(natalChart.planets)`. `analyzeElements` lives in `src/data/interpretations/index.ts`, which imports from `src/engine/types.ts` and `src/data/interpretations/types.ts` — frontend source files.

If no action is taken, every ported server-side prompt builder faces the same options: import from `src/` (coupling the server bundle to frontend source), or duplicate `analyzeElements` inline in the engine file. The former creates a bundling entanglement that becomes harder to unwind as the codebase grows. The latter produces one more ungoverned copy per engine file.

The function itself is 15 lines of pure arithmetic over a `PlanetPosition[]` array. Its dependencies are `SIGN_ELEMENTS` (12 entries, a record of sign names to element names) and `ELEMENT_INTERPRETATIONS` (4 entries, one short sentence each). Total self-contained reproduction: approximately 60 lines with zero external dependencies. This is the right scope for a single, documented copy in `server/engine/astroCore.ts`.

### The `ASPECT_DEFINITIONS` table has a divergent copy — and the divergence is load-bearing

`server/engine/chartEngine.ts` lines 78–84 define `ASPECT_DEFS` with tight orbs (2.4° for conjunction, 1.8° for sextile) suited for the dream handler's transit snapshot use case. `src/engine/aspects.ts` lines 21–29 define `ASPECT_DEFINITIONS` with natal orbs (8° conjunction, 6° sextile, plus semi-sextile and quincunx not present in the server copy).

The transit calculation chain in `transits.ts` applies period scaling to `ASPECT_DEFINITIONS`: daily uses `0.3x`, weekly `0.5x`, monthly `0.7x`. A server `transitEngine.ts` that imports from `chartEngine.ts`'s tight orbs rather than establishing a correct `ASPECT_DEFINITIONS` baseline will produce different aspect lists than the frontend for weekly and monthly periods. Daily conjunction orbs happen to match by coincidence (8 × 0.3 = 2.4), which will mask the divergence during manual testing. Monthly conjunction orb: frontend produces `8 × 0.7 = 5.6°`; a server using 2.4° will miss every aspect between 2.4° and 5.6°. The sprint vision's quality bar — "server-assembled prompts must be identical in information density to frontend-assembled prompts" — fails silently for monthly transit readings if `ASPECT_DEFINITIONS` is not established as the shared baseline.

---

## Desired State

### New file: `server/engine/astroCore.ts`

A single shared primitives module with no imports from other engine files and no imports from `src/`. Imports only `astronomy-engine`.

**Exports:**

- `normalizeAngle(a: number): number` — extracted from `chartEngine.ts` line 86
- `longitudeToZodiac(lon: number): ZodiacPosition` — extracted from `chartEngine.ts` line 90
- `getPlanetLongitude(body: Body, time: AstroTime): number` — extracted from `chartEngine.ts` line 129
- `getMeanNodeLongitude(time: AstroTime): number` — extracted from `chartEngine.ts` line 146
- `getDailyMotion(body: Body, time: AstroTime): number` — new, two lines, used by `transitEngine.ts`
- `getHouseForLongitude(longitude: number, cusps: number[]): number` — extracted from `chartEngine.ts` line 254
- `ZODIAC_SIGNS` — extracted from `chartEngine.ts` line 5
- `PLANET_NAMES` — extracted from `chartEngine.ts` line 11
- `BODY_MAP` — extracted from `chartEngine.ts` line 64
- `ASPECT_DEFINITIONS` — canonical 7-entry table (conjunction, sextile, square, trine, opposition, semi-sextile, quincunx) with `nature` field, matching `src/engine/aspects.ts` exactly. This is the base table for all period-scaled transit orb calculations.
- `SIGN_ELEMENTS` — 12-entry record mapping each sign name to its element. Ported verbatim from `src/engine/types.ts`.
- `analyzeElements(planets: ZodiacPosition[]): ElementBalance` — ported from `src/data/interpretations/index.ts` lines 52–69, with `ELEMENT_INTERPRETATIONS` inlined from `src/data/interpretations/types.ts` lines 53–70. Carries an explicit comment: `// ported from src/data/interpretations/index.ts — keep in sync with frontend`.
- `ZodiacPosition` and `ZodiacSign` type definitions (currently private to `chartEngine.ts`)

`ASPECT_DEFS` (the tight-orb table currently at `chartEngine.ts` lines 78–84) is kept private to `chartEngine.ts` for use only by `getActiveTransitAspects`, which is a snapshot function with its own maxOrb parameter. It is not exported from `astroCore.ts` because it is not the general-purpose aspect table.

### Modified file: `server/engine/chartEngine.ts`

All eight symbols listed above are removed from `chartEngine.ts` and replaced with imports from `./astroCore`. The file's public API and exports (`calculateChart`, `getMoonInfo`, `getActiveTransitAspects`, `ServerChartData`, `resolveToUTC`) are unchanged. `chartEngine.ts` re-exports `ServerChartData` from `astroCore.ts` once that type is established there, or keeps it locally — whichever keeps the public import surface stable for callers in `gpt.ts`.

The file becomes shorter by approximately 80 lines. Its private functions that remain are: `isRetrograde`, `localSiderealTime`, `calculateAscendant`, `calculateMidheaven`, `calculateWholeSignHouses`, `ascensionFromLongitude`, `eclipticLongFromRA`, `placidusCusp`, `calculatePlacidusHouses`, `phaseAngleToName`.

### Modified file: `server/services/gpt.ts`

The local `ChartData` interface (lines 24–28) and its nested `Planet` type (lines 10–17) are retired. All existing handlers that reference these local types are updated to use `ServerChartData` imported from `server/engine/chartEngine.js`. The `Angles` local interface (lines 19–22) is similarly retired in favor of the `ChartAngles` type already defined within `chartEngine.ts`.

For handlers not yet upgraded by other sprint tasks, the type migration is a structural change only — the runtime data being passed through these handlers already carries `longitude` and `minute` on each planet (it comes from `calculateChart`). The local stripped interface was silently downcast; using `ServerChartData` restores full type visibility.

### Resulting module graph for `server/engine/`

```
astroCore.ts
  └─ (no engine imports)

chartEngine.ts
  └─ imports: astroCore.ts

transitEngine.ts       (sprint task, not this proposal)
  └─ imports: astroCore.ts

aspectEngine.ts        (sprint task, not this proposal)
  └─ imports: astroCore.ts

synastryEngine.ts      (sprint task, not this proposal)
  └─ imports: astroCore.ts, transitEngine.ts

solarReturnEngine.ts   (sprint task, not this proposal)
  └─ imports: astroCore.ts, chartEngine.ts

numerologyEngine.ts    (sprint task, not this proposal)
  └─ (no engine imports)
```

No circular dependencies. `astroCore.ts` is a leaf node with no intra-engine imports. Every engine file that needs `normalizeAngle`, `longitudeToZodiac`, or `ASPECT_DEFINITIONS` imports from one place.

### What this proposal is not

This proposal does not port any of the five new engine files. It does not change any frontend files. It does not change the DB schema. It does not add new GPT handlers or new routes. It does not touch `src/engine/zodiac.ts` or `src/engine/astronomy.ts` — the frontend continues to own its own copies of these primitives. The extraction is server-only.

The `resolveToUTC` function in `chartEngine.ts` is not moved to `astroCore.ts`. It has no astronomy-engine dependency and is used only for chart computation; it stays in `chartEngine.ts` as a utility for `calculateChart`.

### Acceptance criteria

1. `server/engine/astroCore.ts` exists and exports all symbols listed above.
2. `server/engine/chartEngine.ts` imports `normalizeAngle`, `longitudeToZodiac`, `getPlanetLongitude`, `getMeanNodeLongitude`, `getHouseForLongitude`, `ZODIAC_SIGNS`, `PLANET_NAMES`, `BODY_MAP` from `./astroCore` and contains no local definitions of those symbols.
3. The public exports of `chartEngine.ts` are unchanged. All existing callers in `gpt.ts` continue to compile without modification.
4. `server/services/gpt.ts` no longer contains a local `ChartData`, `Planet`, or `Angles` interface. All references use `ServerChartData` from `chartEngine.ts`.
5. TypeScript compilation of `server/` produces zero errors.
6. `analyzeElements` in `astroCore.ts` carries a comment identifying its origin and sync requirement.
7. `ASPECT_DEFINITIONS` in `astroCore.ts` matches `src/engine/aspects.ts` symbol-for-symbol: same seven entries, same orb values, same `nature` field values.
