**Type:** Issue Fix
**Originated by:** Carmack, Jobs

## Problem

`calculateAspects()` in `src/engine/aspects.ts` at line 76 determines whether a natal aspect is applying or separating using this expression:

```typescript
const applying = orb < def.orb * 0.5
```

The comment on line 75 reads: "Use simple heuristic: if orb is decreasing, it's applying." The comment is wrong about what the code does. Orb is not decreasing here — it is a static snapshot of the current angular separation from exactness. The expression simply tests whether the current orb is smaller than half the maximum allowed orb. An aspect with a 1° orb and a maximum of 8° will always be labeled `applying: true`, regardless of whether the two planets are moving toward or away from each other. An aspect with a 6° orb will always be labeled `applying: false`, regardless of motion direction.

This is semantically incorrect. "Applying" means the planets are converging toward exactness; "separating" means they are diverging away from it. The determination requires comparing the angular separation at two moments in time — not comparing the current orb to an arbitrary threshold.

The `applying` field is not decorative. It is surfaced to users in every aspect tooltip in `ChartWheel.tsx` (lines 158, 242, 270), in `AspectRow.tsx` (lines 106–111), and is passed as context into every GPT-driven reading prompt in `buildTransitPrompt()` (`transits.ts` line 339). More critically, `buildTransitPrompt()` at line 366 finds the `tightestApplying` transit aspect and instructs GPT to lead the entire reading with it — but the transit code in `calculateTransitAspects()` uses `dailyMotion` for this determination (lines 145–148) and is correct. The natal code is not.

The same incorrect heuristic appears in `synastry.ts` at line 89: `const applying = orb < maxOrb * 0.5`, used when computing aspects between two natal charts. This is the same bug in a third location.

**Reproduction:** generate any natal chart. Open any tight natal aspect tooltip (e.g., Sun conjunct Mercury at 1° orb). It will show "Applying." Open a wide natal aspect (e.g., Venus trine Saturn at 6° orb). It will show "Separating." Neither label reflects actual planetary motion.

**Why this matters now:** the asteroid sprint (sprint-0014) adds five slow-moving bodies to `calculateAspects()`. Chiron and the main-belt asteroids have daily motions roughly 100–2600× slower than the Moon. Tight Chiron aspects — common in natal charts because Chiron moves slowly — will systematically be misidentified as applying, and those labels will appear in natal tooltips and be included in GPT context. Fixing the heuristic while already modifying `aspects.ts` for the asteroid sprint is the right moment to correct all three affected files.

## Expected behavior

The `applying` field in a natal `Aspect` should be `true` when the two planets are moving toward exactness at the moment of the chart, and `false` when they are diverging from it.

The correct implementation computes the same aspect orb 24 hours later and compares it to the current orb. If the future orb is smaller, the aspect is applying; if larger, it is separating. This is exactly the approach already used correctly in `calculateTransitAspects()` (`transits.ts` lines 145–148), which evaluates direction using `tp.dailyMotion` — the per-planet 24-hour longitude delta also used for retrograde detection throughout the codebase.

`calculateAspects()` in `aspects.ts` currently takes only `planets: PlanetPosition[]` with no time parameter. To compute applying/separating correctly, it needs either: (a) a second `PlanetPosition[]` snapshot computed 24 hours later passed alongside the first, or (b) a `date: Date` parameter so it can call the position functions internally. The `PlanetPosition` interface in `types.ts` already carries `retrograde: boolean` and `longitude: number`; adding a `dailyMotion?: number` field analogous to `TransitPosition.dailyMotion` would allow the caller to supply motion data without changing the function signature semantics.

The same fix must be applied to `synastry.ts` line 89, which carries an identical incorrect heuristic. Synastry aspects between two static natal charts have no time-of-calculation motion to compare, so the correct behavior there is to drop the `applying` field from `SynastryAspect` — the field has no meaningful value when both charts are fixed snapshots. This aligns with `SynastryPage.tsx` line 126, which already hard-codes `applying={false}` when rendering synastry aspect rows, indicating the value was already known to be unreliable.

## Outcome

- Added `dailyMotion?: number` to `PlanetPosition` in `types.ts`.
- Added `getDailyMotion()` helper in `astronomy.ts`; `calculateChart()` now populates `dailyMotion` for every planet (including North Node via formula diff).
- Fixed `calculateAspects()` in `aspects.ts`: applying/separating is now determined by simulating each planet's position 24 hours later using `dailyMotion` and checking whether the orb shrinks (applying) or grows (separating). Falls back to the old threshold only when `dailyMotion` is unavailable.
- Fixed `calculateSynastryAspects()` in `synastry.ts`: `applying` is now always `false` since two static natal charts have no directional motion — consistent with `SynastryPage.tsx` which already hard-coded `applying={false}` when rendering synastry rows.
- Transit applying/separating logic in `transits.ts` was left untouched — it was already correct.
