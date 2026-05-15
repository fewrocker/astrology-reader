**Type:** Code Enhancement
**Originated by:** Carmack, Taleb

## Problem / Opportunity

Four astronomical utility functions are independently defined across four production files, with no shared source of truth. Every file that needs them has copied the implementation. Adding asteroid support will create a fifth consumer and would require a fifth copy — or forces a fix first.

### The four functions and where each copy lives

**`getPlanetLongitude(body, time) → number`**

Copies at: `src/engine/astronomy.ts:31`, `src/engine/transits.ts:60`, `src/engine/transitTimeline.ts:61`, `server/engine/astroCore.ts:134`.

The three client-side copies are functionally identical. The `astroCore.ts` copy is also identical in logic but is exported (`export function`) while the three client copies are private module functions. No behavioral divergence has occurred yet.

**`getMeanNodeLongitude(time) → number`**

Copies at: `src/engine/astronomy.ts:66`, `src/engine/transits.ts:67`, `src/engine/transitTimeline.ts:68`, `server/engine/astroCore.ts:140`.

All four copies carry the same five-term polynomial formula (`125.0445479 - 1934.1362891 * T + ...`). The `astronomy.ts` copy formats the polynomial across five lines with a comment header; the `transits.ts` and `transitTimeline.ts` copies compress it to one line; `astroCore.ts` reformats it with explicit parentheses for the `normalizeAngle` call. The polynomial coefficients are identical in all four — no divergence yet, but the layout differences reflect independent editorial decisions with no mechanism to keep them aligned.

**`getHouseForLongitude(longitude, cusps) → number`**

Copies at: `src/engine/astronomy.ts:230` (exported, takes `number[]`), `server/engine/astroCore.ts:161` (exported, takes `number[]`), `src/engine/synastry.ts:113` (private, takes `HouseCusp[]`).

This function has already diverged. The `astronomy.ts` and `astroCore.ts` copies receive a plain `number[]` of cusp longitudes and return a 1-based house number directly. The `synastry.ts` copy receives a `HouseCusp[]` array (objects with `.longitude` and `.house` fields), applies `normalizeAngle` to both the input longitude and each cusp before comparison, and returns `houses[i].house` from the object rather than computing `i + 1`. The synastry version also guards for an empty array (`if (houses.length === 0) return 1`) — the other two do not. The two variants now have different signatures, different internal normalization, and return through different mechanisms. They share the same wrap-around comparison logic but are no longer the same function.

**`getDailyMotion(body, time) → number`**

Copies at: `src/engine/transits.ts:73`, `src/engine/transitTimeline.ts:79`, `server/engine/astroCore.ts:151`.

`astronomy.ts` does not contain `getDailyMotion` — the retrograde check in that file replicates the same delta-longitude arithmetic inline inside `isRetrograde()` rather than calling a named helper. All three named copies are logically identical: compute `lon1` at `time`, compute `lon2` at `time + 86400000ms`, normalize the difference to `[-180, 180]`, return it. No behavioral divergence yet.

### The risk this creates

Each copy is a separate mutation surface. A correction to any one of these functions — a coefficient update, a precision fix, a guard for an edge case — must be manually replicated to every other copy, with no compiler enforcement and no test that would catch a missed propagation. The `getHouseForLongitude` divergence in `synastry.ts` shows this is not theoretical: the function already exists in two incompatible forms, acquired independent edge-case handling, and the difference is invisible unless both files are read side by side.

The asteroid calculation will require all four of these functions. Carmack's proposal P3 names `src/engine/ephemeris.ts` as the consolidation target specifically because the asteroid module will be a fifth consumer — if the duplication is not resolved first, the asteroid implementation will either add a fifth copy of each or depend on one of the four existing copies while the other three remain unaware of any future changes.

Taleb's concern complements this: the server copy in `astroCore.ts` already contains independently formatted versions of all four functions, described in comments as "ported from the frontend" and manually kept in sync. When orbital elements or calculation logic changes, the server copy is the copy most likely to be forgotten.

## Desired State

A new file, `src/engine/ephemeris.ts`, exports all four functions as the single authoritative implementation. Every file that currently defines a local copy imports from `ephemeris.ts` instead.

`ephemeris.ts` should export:

- `getPlanetLongitude(body: Astronomy.Body, time: Astronomy.AstroTime): number` — the geocentric ecliptic longitude logic currently duplicated across all four files
- `getMeanNodeLongitude(time: Astronomy.AstroTime): number` — the five-term polynomial for the mean lunar node
- `getDailyMotion(body: Astronomy.Body, time: Astronomy.AstroTime): number` — the 24-hour delta-longitude helper
- `getHouseForLongitude(longitude: number, cusps: number[]): number` — the wrap-aware house lookup operating on a plain `number[]` of cusp longitudes

The `synastry.ts` private variant of `getHouseForLongitude` should be reconciled with the canonical version: either it adapts to call the shared function after extracting longitudes from its `HouseCusp[]` argument, or the canonical signature is updated to accept both forms. The reconciliation must be explicit — the current silent divergence (different argument types, different normalization, different return path) means the two variants can drift further without any signal.

After consolidation, `src/engine/astronomy.ts`, `src/engine/transits.ts`, `src/engine/transitTimeline.ts`, `src/engine/synastry.ts`, and `server/engine/astroCore.ts` all import the functions they need from `src/engine/ephemeris.ts`. `astroCore.ts` is a server-side module but imports pure TypeScript math with no browser-specific dependencies, which `ephemeris.ts` must remain — no DOM, no Vite-specific APIs, no import that would break in the Node.js/tsx server build context.

The cleaner architecture has one visible property: a correction or extension to any of these four algorithms — including the addition of asteroid support — is made in one place and takes effect everywhere. The `getHouseForLongitude` divergence becomes impossible to repeat because there is no second copy to diverge into. The server and client calculate the same thing because they call the same function, not because a developer remembered to update both files.
