# John Carmack — Voice Analysis: Sprint 0012

Sprint 0011 wired up the surfaces. Sprint 0012 moves the computation. These are different problems. Wiring surfaces is about matching data that already exists to components that can display it. Moving computation to the server is about establishing a module boundary that did not exist before, choosing what to copy, what to share, and what to retire. Get the boundary wrong and you are doing this sprint again in six months.

I've read all of it: `chartEngine.ts`, `transits.ts`, `synastry.ts`, `solarReturn.ts`, `numerology.ts`, `aspects.ts`, the twelve handlers in `gpt.ts`, and the four `useEffect` loading blocks in `App.tsx`. Here is what I see.

---

## The Real Problem First

The dream handler proved the pattern. Before `fe51ab02`, the dream handler accepted `natalContext` as a pre-built string from the client. After, it fetches `birth_date`, `birth_time`, `birth_place` from the DB and calls `calculateChart` server-side when the client sends nothing. That is a 60-line change and it completely inverts the trust model for one handler.

The problem is that the dream handler was the easy case. It only needed `calculateChart` and the two sky helpers. The transit handler needs `calculateTransits`. The synastry handler needs `calculateSynastry` plus a second chart computation for the partner. The solar return handler needs `findSolarReturn` plus a chart for the SR moment. These are not just bigger — they have a structural dependency the dream handler did not: the prompt builders (`buildTransitPrompt`, `buildSynastryPrompt`, `buildSolarReturnPrompt`) call `analyzeElements` from `src/data/interpretations/index.ts`.

That import is the central tension of this sprint. `src/data/interpretations/index.ts` imports from `src/engine/types.ts`, `src/engine/aspects.ts`, and several interpretation tables. If you want the server to call `analyzeElements`, you either import it from `src`— which means the server is importing frontend source — or you duplicate the logic, which is maintenance debt. There is a third path, which I'll come to.

---

## What Actually Exists vs. What Needs to Be Built

`server/engine/chartEngine.ts` is 366 lines. It is a standalone port: it copies `normalizeAngle`, `longitudeToZodiac`, `getMeanNodeLongitude`, `ZODIAC_SIGNS`, `PLANET_NAMES`, `BODY_MAP`, the Placidus house calculation, `getHouseForLongitude`, and `resolveToUTC`. It imports only `astronomy-engine`. It exports `calculateChart`, `getMoonInfo`, `getActiveTransitAspects`, and a few types.

What does `src/engine/transits.ts` actually need that `chartEngine.ts` does not already have?

- `getPlanetLongitude` — already in chartEngine.ts (private)
- `getMeanNodeLongitude` — already in chartEngine.ts (private)
- `longitudeToZodiac` — already in chartEngine.ts (private)
- `normalizeAngle` — already in chartEngine.ts (private)
- `BODY_MAP` — already in chartEngine.ts (private)
- `PLANET_NAMES` — already in chartEngine.ts (private)
- `getDailyMotion` — new, two lines
- `calculateCurrentPositions` — new, uses the above
- `calculateTransitAspects` — new, uses `ASPECT_DEFINITIONS`
- `detectIngresses` — new, date-range scan
- `getRetrogradeStatus` — new, trivial
- `calculateTransits` — orchestrator, new
- `buildTransitPrompt` — new, calls `analyzeElements`
- `getTopActiveTransits` — wraps calculateCurrentPositions + calculateTransitAspects

The pattern is clear. The astronomical primitives exist in chartEngine.ts but are private. Everything in transits.ts that does not touch `analyzeElements` is pure arithmetic over those primitives.

---

## The Duplication Problem Is Already Here and Will Get Worse

Right now, `normalizeAngle` and `longitudeToZodiac` exist in three places:
1. `src/engine/zodiac.ts` (the canonical frontend module)
2. Inlined in `server/engine/chartEngine.ts`
3. (Soon) inlined in every new server engine file if nothing changes

`getMeanNodeLongitude` exists in both `src/engine/transits.ts` and `src/engine/astronomy.ts` (different files, identical formula). `getHouseForLongitude` exists in `src/engine/synastry.ts` (local copy) and `server/engine/chartEngine.ts`. `BODY_MAP` is duplicated three times across `astronomy.ts`, `transits.ts`, and `chartEngine.ts`.

The correct move for this sprint is to extract the shared server primitives into a `server/engine/astroCore.ts` file before adding more engine files. The alternative — writing `server/engine/transits.ts` that re-copies all the same functions again — digs the hole deeper. Six months from now when the mean node formula changes, you will update it in one place and silently break the others.

The extract is not a refactor for its own sake. It is a necessary precondition for keeping the four new engine files maintainable. This takes maybe two hours and makes every subsequent engine file 30% shorter.

---

## The `analyzeElements` Dependency: The Right Decision

`buildTransitPrompt`, `buildSynastryPrompt`, and `buildSolarReturnPrompt` all call `analyzeElements(chart.planets)`. This function is in `src/data/interpretations/index.ts`, which is a frontend source file that imports from `src/engine/types.ts`.

Options:
1. **Import from `src/` on the server.** This works in a monorepo if TypeScript paths are configured. But it couples the server bundle to frontend source. Any future tree-shaking or bundling separation gets harder.
2. **Duplicate `analyzeElements` in `server/engine/`.**  It is 15 lines of pure logic. The `SIGN_ELEMENTS` record is 12 entries. The `ELEMENT_INTERPRETATIONS` is 4 entries of short strings. Total: maybe 60 lines including the interpretation strings. Zero external dependencies. Perfectly isolatable.
3. **Extract `analyzeElements` and its data into a shared package.** This is the right long-term architecture but requires monorepo tooling changes, which is out of scope.

Option 2 is the right call for this sprint. `analyzeElements` does not use the Astronomy engine. It does not use React. It takes `PlanetPosition[]` (which is a plain data structure) and returns an object with a `dominant` string. The duplication is exactly 60 lines and creates zero behavioral risk. The function is deterministic and has no side effects — it is literally the safest thing in the codebase to duplicate.

Document it explicitly: `server/engine/astroCore.ts` contains a comment that reads "analyzeElements ported from src/data/interpretations/index.ts — keep in sync with frontend." That is the maintenance contract. It is honest about what it is.

---

## Port Order: What Goes First and Why

**Port in this order: 1) astroCore, 2) transits, 3) aspects, 4) synastry, 5) solarReturn, 6) numerology.**

**1. `server/engine/astroCore.ts` (extract, not port)**

Extract from `chartEngine.ts`: `normalizeAngle`, `longitudeToZodiac`, `ZODIAC_SIGNS`, `PLANET_NAMES`, `BODY_MAP`, `getMeanNodeLongitude`, `getPlanetLongitude`, `getDailyMotion` (new), `getHouseForLongitude`. Add `SIGN_ELEMENTS`, `ASPECT_DEFINITIONS`, and `analyzeElements`. Make `chartEngine.ts` import from `astroCore.ts`. This is the foundation for every subsequent step. Without it, every new engine file copies the same 80 lines.

**2. `server/engine/transitEngine.ts`**

This is the most important port because `handleTransitInterpretation` is the most broken handler — it accepts an opaque `systemPrompt` string and blindly forwards it. Port: `calculateCurrentPositions`, `calculateTransitAspects`, `detectIngresses`, `getRetrogradeStatus`, `calculateTransits`, `buildTransitPrompt`, `getTopActiveTransits`. Upgrade `handleTransitInterpretation` to compute its own prompt when passed user birth data instead of a raw prompt string. This is the pattern-setter for the sprint.

Why first: it has the most direct GPT-handler impact (the transit handler is used by far the most frequently), and it establishes the server-side `ChartData`-equivalent type contract that synastry and solar return will depend on.

**3. `server/engine/aspectEngine.ts`**

`calculateAspects` and `detectPatterns` from `aspects.ts`. These are pure math over planet positions. No astronomy-engine imports — just longitude arithmetic and array operations. Port is literally copy-paste with a minor import adjustment. Do this before synastry because synastry will want aspects for the SR prompt assembly.

Why third: it is the easiest port in the sprint. It produces a clean win with zero surprises. And it unblocks the natal prompt assembly on the server (the transit prompt does not call `calculateAspects`, but the natal reading assembly does — and server-side natal reading GPT calls will want it).

**4. `server/engine/synastryEngine.ts`**

Port: `calculateSynastryAspects`, `calculateHouseOverlays`, `calculateCompositeChart`, `calculateCompatibility`, `calculateSynastry`, `buildSynastryPrompt`, `buildCoupleTransitPrompt`. Create `handleSynastryInterpretation` and `handleCoupleTransitInterpretation` as proper handlers.

The non-trivial part here: synastry requires two birth charts. The current session model stores one user's birth data. The partner's data is browser-session-only — it is never persisted. To make `handleSynastryInterpretation` truly server-sovereign, you need the partner's birth data to reach the server. Currently it is sent as pre-computed `chartData` in the request payload. The sprint can solve this two ways: (a) require the client to send partner birth data (date, time, lat/lng, tz) rather than the pre-computed chart — the server then computes both charts — or (b) accept pre-computed partner chart but compute person-1 chart server-side. Option (a) is better long-term. Option (b) is still an improvement over accepting the full pre-built prompt. The vision says "sovereign" so go with option (a): accept raw birth data for both people, compute both charts, run synastry, build the prompt.

**5. `server/engine/solarReturnEngine.ts`**

Port: `findSolarReturn` (from `astronomy.ts`) plus `calculateSolarReturn`, `buildSolarReturnPrompt`. Create `handleSolarReturnInterpretation`.

`findSolarReturn` is a bisection search over the Sun's longitude — 365 iterations max, each being a single `SunPosition` call. Computationally cheap. The bisection code is 50 lines and has no dependencies beyond astronomy-engine. This is a clean port.

One thing to verify: the frontend's `solarReturn.ts` calls `findSolarReturn` from `astronomy.ts`, then calls `calculateChart` (from `astronomy.ts`) for the SR moment. The server's `calculateChart` in `chartEngine.ts` is equivalent. The round-trip through UTC parsing (`resolveToUTC`) is already in `chartEngine.ts`. So server-side SR computation is: call `findSolarReturn` (new), feed result to existing `calculateChart` from `chartEngine.ts`. The natal chart is already computed by the calling handler. This is close to a two-function port.

**6. `server/engine/numerologyEngine.ts`**

`numerology.ts` has zero imports. It is pure arithmetic. The port is verbatim copy. But here is the thing: the server does not actually need to compute numerology numbers for any of the existing GPT handlers — `handleAstroNumerologyCross` still requires the client to send the numbers because the server does not have the user's name (name is not in the DB schema). The sprint vision acknowledges this: "the server can't compute them from stored birth data."

So what does porting numerology get you? It gets you `calculateNumerology(birthDate)` which works for birth-date-only numbers (life path, birthday number, personal year, personal month, personal day). Expression number and soul urge still require the name. The `handleTodaySynthesis` handler already receives `personalDay` from the client — with a server-side numerology port, you could recompute it and cross-check rather than blindly trusting the client value. That is modest but correct. Port it last because it delivers the least immediate value.

---

## The Non-Trivial Technical Parts

**The `buildTransitPrompt` dependency chain.** `buildTransitPrompt` calls `analyzeElements`, which needs `SIGN_ELEMENTS` from the types file and the `ELEMENT_INTERPRETATIONS` strings from `src/data/interpretations/types.ts`. The interpretations are four short strings — one sentence each. These need to live in `server/engine/astroCore.ts` alongside `analyzeElements`. They are not in the frontend's `interpretations/` deep structure. Look at `ELEMENT_INTERPRETATIONS` in `src/data/interpretations/types.ts` before writing `astroCore.ts`.

**The `ChartData` type mismatch.** `server/engine/chartEngine.ts` exports `ServerChartData`. The frontend uses `ChartData` from `src/engine/types.ts`. They are structurally equivalent — same `planets`, `houses`, `angles`, `unknownTime`, `houseSystem` fields — but they are different TypeScript types. Right now `gpt.ts` defines its own local `ChartData` interface (lines 22–29) with a stripped-down `Planet` type missing `longitude` and `minute`. This stripped type is already causing silent information loss: `buildNatalContextFromChart` in `gpt.ts` formats positions without the `minute` field. The transit and synastry prompt builders need `p.minute` for arc-minute precision.

The right move: `astroCore.ts` defines `ServerChartData` as the canonical server type (exporting it), `chartEngine.ts` re-exports it, and the per-handler port functions all use it. The stripped `ChartData` interface in `gpt.ts` should be retired as each handler gets upgraded.

**The `ingresses` detection loop.** `detectIngresses` in `transits.ts` scans every day in the period for every planet, checking every 6 hours for the Moon. For a monthly period, that is 30 days × 10 planets = 300 iterations for slow planets, plus 120 Moon checks. This is fine — it is fast. The reason I'm noting it: do not change the algorithm, do not optimize it, just port it exactly. The ingress detection is CPU-cheap but has a subtle correctness requirement around the sign-change boundary. The current code is correct. Copy it.

**The `buildCoupleTransitPrompt` function.** It lives in `synastry.ts` but takes a `TransitData` argument from `transits.ts`. On the server, this means `synastryEngine.ts` will need to import from `transitEngine.ts` — a same-layer cross-module dependency. That is fine and expected. The build order matters: `transitEngine.ts` must exist before `synastryEngine.ts` can import from it.

---

## What Sounds Simple But Is Actually a Rabbit Hole

**Synastry's partner data persistence.** The sprint vision correctly scopes this as "no database schema change." But making synastry truly server-sovereign requires the server to know the partner's birth data. Right now that data lives only in browser session state. The clean solution — persist partner data when the user initiates a synastry reading — is out of scope because it requires a schema change. The pragmatic solution for this sprint: change the API contract for synastry requests so the client sends raw birth data (date, time, lat, lng, tz) for both people, rather than pre-computed chart objects. The server computes both charts. This is not a schema change — it is a payload change. The client already has the birth data; it just needs to send it as raw fields instead of computed chart objects. This is the right scoping call.

**The transit period and "current" date.** `calculateTransits` calls `getDateRange(period, targetMonth)` which uses `new Date()` internally. On the server, "now" is always correct. On the client, the user may have a stale browser tab where "now" has drifted. This is actually a reason server-side transit computation is *more* correct, not less. The server's `new Date()` is always fresh. Note this in the handler implementation — the server does not need to accept a `date` parameter for the transit start; it uses the server's current time. The exception is journal annotation, where historical dates matter. The journal handler already accepts an entry date — the transit computation for journal entries must use the entry's date, not `now()`.

**`buildSynastryPrompt` depends on `synastryData.houseOverlay`** which in turn requires `calculateHouseOverlays`, which calls `getHouseForLongitude` with house cusp data. If both charts have unknown birth time, `houses` arrays are empty, and the overlay is empty. The server must handle the `unknownTime` path correctly — same as the frontend does. Check the `calculateHouseOverlays` guard at `synastry.ts` lines 141–165: `if (!chart1.unknownTime && chart2.houses.length > 0)`. Port that guard exactly. Do not simplify it.

---

## What Is Over-Engineered vs. Pragmatic

**Do not try to share code between `src/` and `server/` this sprint.** The natural instinct when you see `analyzeElements` duplicated is to create a `shared/` package. That requires monorepo tooling decisions, tsconfig path changes, and potentially build pipeline changes. The cost is real. The benefit for four sentences of element interpretations is not worth it this sprint. Duplicate, document the duplication, move on. The technical debt is visible and contained. Fix it properly when there is a sprint that is actually about monorepo structure.

**Do not port `transitTimeline.ts`.** The vision already says this, but I want to add the technical justification. `transitTimeline.ts` is 477 lines. It does binary searches for aspect perfection dates, retrograde stations, and lunar phase events across a date range. It is used exclusively for the transit timeline tab UI — a calendar of future events the user can scroll through. There is no server-side GPT handler that needs this data. The computation is the most expensive thing in the engine (hundreds of ephemeris lookups). Porting it to the server without a server-side consumer is pure waste.

**Do not create separate `server/engine/zodiacEngine.ts` and `server/engine/planetEngine.ts` files.** I have seen codebases where the refactor produces a module per concept. `astroCore.ts` is the right granularity — one file for all the shared astronomical primitives that every other engine file depends on. The reason is import simplicity: `import { normalizeAngle, longitudeToZodiac, ASPECT_DEFINITIONS, analyzeElements } from './astroCore'` is cleaner than four separate imports from four files.

**`computeEnergyRating` in `transits.ts`** — this is a UI concern dressed as an engine function. It returns `{ label, score, dotColor, textColor }` with Tailwind class strings. `dotColor: 'bg-emerald-400'`, `textColor: 'text-emerald-400'`. The server has no use for Tailwind class strings. Do not port `computeEnergyRating` to the server. If the server ever needs to communicate energy level, have it return the raw `score` integer and let the client map it to display classes. This is one of the few genuinely frontend-specific functions in the engine.

---

## The Right Module Structure for `server/engine/`

```
server/engine/
  astroCore.ts          — normalizeAngle, longitudeToZodiac, ZODIAC_SIGNS, PLANET_NAMES,
                          BODY_MAP, getMeanNodeLongitude, getPlanetLongitude, getDailyMotion,
                          getHouseForLongitude, SIGN_ELEMENTS, ASPECT_DEFINITIONS,
                          analyzeElements, ServerChartData type (re-export)
  chartEngine.ts        — calculateChart, getMoonInfo, getActiveTransitAspects
                          (imports from astroCore, re-exports ServerChartData)
  transitEngine.ts      — calculateCurrentPositions, calculateTransitAspects, detectIngresses,
                          getRetrogradeStatus, calculateTransits, buildTransitPrompt,
                          getTopActiveTransits, assignTransitHouses
  aspectEngine.ts       — calculateAspects, detectPatterns
  synastryEngine.ts     — calculateSynastryAspects, calculateHouseOverlays,
                          calculateCompositeChart, calculateCompatibility, calculateSynastry,
                          buildSynastryPrompt, buildCoupleTransitPrompt
  solarReturnEngine.ts  — findSolarReturn, calculateSolarReturn, buildSolarReturnPrompt
  numerologyEngine.ts   — all exports from src/engine/numerology.ts (verbatim copy)
```

Seven files. No circular dependencies. `astroCore.ts` has no imports from other engine files. Every other engine file imports from `astroCore.ts`. `synastryEngine.ts` imports from `transitEngine.ts` for `TransitData` type. `solarReturnEngine.ts` imports `calculateChart` from `chartEngine.ts`.

---

## The Single Most Important Observation

The `handleTransitInterpretation` handler is the keystone task. Every other handler in this sprint is a variation on the same pattern: accept birth data, compute chart, run calculation, build prompt, call GPT. The transit handler is the most complex version of that pattern — it has a period parameter, ingress detection, retrograde tracking, the tightest applying aspect logic, and `buildTransitPrompt`'s element profile injection. If you implement the transit handler correctly, you have the template for synastry and solar return. If you implement it by accepting pre-computed data and just porting the prompt builder, you have not solved the problem — you have just moved the string assembly one step closer to the server without closing the trust gap.

The test the vision sets is correct: take `birth_date`, `birth_time`, `birth_place` from the DB, compute the chart, run the calculation, build the prompt, call GPT. The transit handler should pass that test. Until it does, the sprint is not done.
