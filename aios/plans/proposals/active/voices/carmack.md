# John Carmack's Technical Analysis: Asteroid Interpretations Architecture

## Status Summary
The asteroid interpretation system has a **critical gap between infrastructure and surface**: data exists but wiring is blocked. The architecture is sound but the implementation is fragile in three specific ways.

---

## What's Wired vs. What's Blocked

### Currently Wired (Functional)
- **Asteroid retrograde data**: 5 entries exist in `NATAL_RETROGRADE` (Chiron, Ceres, Pallas, Juno, Vesta). Lines 44–51 in `retrogrades.ts` are complete and substantive.
- **Asteroid house interpretations**: 60 entries exist in `PLANET_IN_HOUSE` (5 asteroids × 12 houses). Keys follow `Chiron_H1`, `Ceres_H7`, etc. Quality is high — see lines like `Chiron_H1` in `planetInHouse.ts` (~200 words, specific and mythologically grounded).
- **Chart wheel glyphs and archetypes**: `ASTEROID_GLYPHS` and `ASTEROID_ARCHETYPES` are defined. `getBodyGlyph()` handles both planets and asteroids correctly.

### Currently Blocked (Data Exists, Not Surfaced)
- **Asteroid sign interpretations**: 60 entries already exist in `PLANET_IN_SIGN` (`Chiron_Aries`, `Ceres_Taurus`, etc.). Verified by grep: exactly 60 entries present. Each has `brief` and `detail` fields with quality matching the house entries.
- **Interpretation retrieval in `assembleReading()`**: Lines 138–141 in `src/data/interpretations/index.ts` **explicitly return `null`** for all asteroid interpretations:
  ```typescript
  signInterpretation: !isAsteroid(p.name as BodyName) ? getPlanetInSignInterpretation(...) : null,
  houseInterpretation: (chart.unknownTime || isAsteroid(p.name as BodyName)) ? null : ...,
  retrogradeInterpretation: (p.retrograde && !isAsteroid(...) && ...) ? ... : null,
  ```
  These three guards can be **safely removed or inverted** — the data is ready.
- **Chart tooltip rendering for asteroids**: The `PlanetTooltip` component in `ChartWheel.tsx` (lines 69–150) already handles asteroid archetype display but conditionally suppresses sign/house/retrograde interpretations. Lines 71–74 repeat the same `!isAsteroidBody` checks that block data access.

---

## Function Signature Issues

### Critical: Type Mismatch in Lookup Functions
The two core lookup functions have signatures that exclude `AsteroidName`:

**Line 19, `src/data/interpretations/index.ts`:**
```typescript
export function getPlanetInSignInterpretation(planet: PlanetName | 'NorthNode', sign: ZodiacSign): InterpretationEntry | null
```

**Line 23:**
```typescript
export function getPlanetInHouseInterpretation(planet: PlanetName | 'NorthNode', house: number): InterpretationEntry | null
```

**The fix is straightforward:** Change both signatures to accept `BodyName` instead of `PlanetName | 'NorthNode'`:
```typescript
export function getPlanetInSignInterpretation(planet: BodyName, sign: ZodiacSign): InterpretationEntry | null
export function getPlanetInHouseInterpretation(planet: BodyName, house: number): InterpretationEntry | null
```

**Why this works:** The lookup uses string concatenation (`${planet}_${sign}`, `${planet}_H${house}`), which already works correctly for asteroids since the data file uses the same key convention. No internal logic change needed — just widen the type.

**No breakage risk:** These functions are called in exactly two places:
1. `assembleReading()` at lines 138–139 (already guarded by `!isAsteroid`, but will work fine with asteroids)
2. `PlanetTooltip` in `ChartWheel.tsx` at lines 71–72 (also guarded, will work fine)

Both callers use the conditional `isAsteroid()` check, so changing the signature does not force callers to pass asteroids — it just permits them.

---

## The `assembleReading()` Problem: Minimal Correct Fix

Current problematic code (lines 136–142):
```typescript
const planetReadings: PlanetReading[] = chart.planets.map((p) => ({
  planet: p,
  signInterpretation: !isAsteroid(p.name as BodyName) ? getPlanetInSignInterpretation(p.name as PlanetName | 'NorthNode', p.sign) : null,
  houseInterpretation: (chart.unknownTime || isAsteroid(p.name as BodyName)) ? null : getPlanetInHouseInterpretation(p.name as PlanetName | 'NorthNode', p.house),
  dignity: (!isAsteroid(p.name as BodyName) && p.name !== 'NorthNode') ? getDignity(p.name as PlanetName, p.sign) : null,
  retrogradeInterpretation: (p.retrograde && !isAsteroid(p.name as BodyName) && p.name !== 'NorthNode') ? (NATAL_RETROGRADE[p.name] ?? null) : null,
}))
```

**The fix (3 lines change):**
```typescript
const planetReadings: PlanetReading[] = chart.planets.map((p) => ({
  planet: p,
  signInterpretation: getPlanetInSignInterpretation(p.name as BodyName, p.sign),  // Remove isAsteroid guard
  houseInterpretation: (chart.unknownTime || isAsteroid(p.name as BodyName)) ? null : getPlanetInHouseInterpretation(p.name as BodyName, p.house),
  dignity: (!isAsteroid(p.name as BodyName) && p.name !== 'NorthNode') ? getDignity(p.name as PlanetName, p.sign) : null,  // Keep as is
  retrogradeInterpretation: (p.retrograde && isAsteroid(p.name as BodyName)) ? (NATAL_RETROGRADE[p.name] ?? null) : (p.retrograde && p.name !== 'NorthNode' ? NATAL_RETROGRADE[p.name] ?? null : null),  // Invert isAsteroid check, but keep guard for classical retrograde
}))
```

Actually, **simpler approach** (and more correct): just remove the `!isAsteroid` guard for sign interpretations and flip the logic for retrograde:
```typescript
const planetReadings: PlanetReading[] = chart.planets.map((p) => {
  const isAst = isAsteroid(p.name as BodyName);
  return {
    planet: p,
    signInterpretation: getPlanetInSignInterpretation(p.name as BodyName, p.sign),
    houseInterpretation: (chart.unknownTime || isAst) ? null : getPlanetInHouseInterpretation(p.name as BodyName, p.house),
    dignity: (!isAst && p.name !== 'NorthNode') ? getDignity(p.name as PlanetName, p.sign) : null,
    retrogradeInterpretation: (p.retrograde ? NATAL_RETROGRADE[p.name] ?? null : null),
  };
})
```

Wait — **critical observation**: the retrograde lookup uses `p.name` as a string key directly into `NATAL_RETROGRADE`. For asteroids, this works fine — Chiron retrograde is key `'Chiron'`, which exists. For classical planets, same. So the retrograde guard can actually be **removed entirely**:
```typescript
retrogradeInterpretation: p.retrograde ? (NATAL_RETROGRADE[p.name] ?? null) : null,
```

This handles both classical planets and asteroids, NorthNode is excluded because NorthNode is never retrograde and has no retrograde entry.

---

## Data Structure and Key Naming Convention

**Current approach is correct and consistent:**
- Planet-in-sign keys: `Sun_Aries`, `Mercury_Gemini`, `Chiron_Aries` (verified: `Chiron_Aries` exists in `planetInSign.ts`)
- Planet-in-house keys: `Sun_H1`, `Chiron_H1` (verified: `Chiron_H1` exists in `planetInHouse.ts`)
- Retrograde keys: just `'Chiron'`, `'Ceres'`, etc. (verified: all 5 asteroid retrograde entries exist in `retrogrades.ts`)

No changes needed here. The naming is already uniform.

---

## AsteroidSection Component: Simplest Correct Architecture

Looking at `ReadingDisplay.tsx`, the existing `PlanetCard` and `PlanetSection` pattern is generic enough that asteroids already render there — they just have `null` interpretations. **A dedicated `AsteroidSection` is a UI choice, not a data requirement.**

**Minimal AsteroidSection implementation:**
```typescript
function AsteroidCard({ pr, showHouse }: { pr: PlanetReading; showHouse: boolean }) {
  // Identical to PlanetCard, but with asteroid-specific theming
  // Use amber/orange colors instead of mystic-gold
  // Show archetype badge (already in ASTEROID_ARCHETYPES)
  // Render signInterpretation.brief + full detail
  // Render houseInterpretation if known-time chart
  // Render retrogradeInterpretation if retrograde
}

export function AsteroidSection({ reading, showHouse }: { reading: FullReading; showHouse: boolean }) {
  const asteroids = reading.planets.filter(pr => isAsteroid(pr.planet.name as BodyName));
  if (asteroids.length === 0) return null;
  
  return (
    <Section title="Asteroids" defaultOpen={false}>
      {asteroids.map(pr => <AsteroidCard key={pr.planet.name} pr={pr} showHouse={showHouse} />)}
    </Section>
  );
}
```

**Where to place it in `ResultsPage.tsx` (line 67):**
- After `PlanetSection` (line 67)
- Before `AspectSection` (line 68)

This respects the visual hierarchy: classical planets first (primary), asteroids second (secondary but meaningful), aspects third.

---

## Fragility Assessment: What Could Break

### 1. **Missing Asteroid Entry Lookup** — MINIMAL RISK
If an asteroid is somehow in the chart but lacks a sign/house entry, the lookup returns `null` and rendering gracefully skips the interpretation. This is safe because the code already handles `null` interpretations throughout.

### 2. **Type Casting Inconsistency** — REAL ISSUE
Current code casts `p.name` to `PlanetName | 'NorthNode'` in lines 138–141, even though `p.name` is actually `BodyName` and can be an asteroid. After the signature fix, **remove these unnecessary casts** — the type system will be honest.

Current fragility:
```typescript
getPlanetInSignInterpretation(p.name as PlanetName | 'NorthNode', p.sign)
```

Should be:
```typescript
getPlanetInSignInterpretation(p.name as BodyName, p.sign)
```

Better still:
```typescript
getPlanetInSignInterpretation(p.name, p.sign)  // No cast needed if p.name is BodyName
```

### 3. **The `isAsteroid()` Guard Duplication** — REAL FRAGILITY
Every call to `getPlanetInSignInterpretation` is guarded by `!isAsteroid()`. This creates **two places that must stay in sync**:
- The caller's guard (`!isAsteroid`)
- The function's acceptance of the input

If someone later changes the guard logic but forgets to change the function, or vice versa, silent data loss occurs. The fix: **remove the guard and let the function handle both types equally**. This is the "defense in depth" principle: the function should work correctly regardless of input type, not rely on the caller to pre-filter.

### 4. **PlanetReading Interface Typing** — ACCEPTABLE
The `PlanetReading` interface's `signInterpretation: InterpretationEntry | null` does not distinguish between "classical planet with no entry found" vs. "asteroid, entry not provided yet". In practice, the data is now complete, so this is no longer a problem. But if new asteroids are added later without interpretation data, this ambiguity could cause confusion. **Acceptable for now**, but document the assumption.

### 5. **No Retrograde Filtering for Asteroids in Analysis Functions** — CORRECT
Lines 201–202 in `assembleReading()` filter `chart.planets` to get retrograde planets, which automatically includes asteroids. This is correct — the retrograde summary should mention asteroids if they are retrograde. The code doesn't accidentally exclude them.

---

## Retrograde Interpretation Lookup: Second-Order Issue

The current code at line 141 uses `NATAL_RETROGRADE[p.name]`, which works because `p.name` is the string key. For asteroids, this is safe because all 5 have entries (`Chiron`, `Ceres`, etc.). The `?? null` fallback handles any missing key gracefully.

**However**, the guard `!isAsteroid(p.name as BodyName) && p.name !== 'NorthNode'` is overly cautious. It should be:
```typescript
retrogradeInterpretation: p.retrograde ? (NATAL_RETROGRADE[p.name] ?? null) : null,
```

This is simpler, more correct, and includes asteroids. NorthNode is still excluded because it has no retrograde entry (and NorthNode is never retrograde).

---

## Summary: What Needs to Change

### Must Do (Unblocks Data)
1. **Change function signatures** (2 lines in `index.ts`):
   - `getPlanetInSignInterpretation(planet: BodyName, ...)` 
   - `getPlanetInHouseInterpretation(planet: BodyName, ...)`

2. **Fix `assembleReading()`** (3–4 lines in `index.ts`, lines 136–141):
   - Remove `!isAsteroid` guard from sign interpretation lookup
   - Simplify retrograde interpretation logic to include asteroids
   - Remove unnecessary type casts

3. **Wire up tooltip** (2 lines in `ChartWheel.tsx`, lines 71–74):
   - Remove `!isAsteroidBody` guards from sign/house/retrograde lookups in `PlanetTooltip`

### Should Do (Polish)
4. **Create `AsteroidSection` component** in `ReadingDisplay.tsx`:
   - Filter `reading.planets` for asteroids
   - Render with amber theming and archetype badges
   - Same card structure as `PlanetCard`

5. **Add to `ResultsPage.tsx`** (1 line):
   - Insert `<AsteroidSection reading={reading} showHouse={!chartData.unknownTime} />` after `PlanetSection`

---

## Code Quality Notes

### Strengths
- The data layer is complete and high-quality. The asteroid interpretation text (60 sign entries, 60 house entries, 5 retrograde entries) is substantive and specific.
- The lookup functions are simple string-based maps — fast and reliable.
- The `isAsteroid()` type guard is well-placed and used consistently throughout.
- The existing `Section` and `PlanetCard` components are generic enough to handle both classical planets and asteroids.

### Weaknesses
- **Over-guarding**: The `!isAsteroid` check is duplicated at call sites instead of being handled inside the functions. This violates the DRY principle and creates fragility.
- **Type casting instead of honest types**: Code casts `p.name as PlanetName | 'NorthNode'` when `p.name` is actually `BodyName`. This hides the truth from the type system.
- **No unified retrograde lookup**: Retrograde logic is scattered across multiple guards instead of being consolidated in one place.

### Recommendations
- After unblocking asteroid interpretations, audit the codebase for similar patterns where type safety is weakened by unnecessary guards or casts.
- Consider adding a "body interpretation" type (union of all interpretation types) to consolidate lookups and reduce guard duplication in the future.

---

## Risk Assessment

**Implementation Risk: Very Low**
The changes are surgical and localized. The data already exists. The function signatures are being widened, not changed. Type safety improves.

**Regression Risk: Very Low**
All existing classical planet and NorthNode lookups continue to work unchanged. The asteroid path is currently returning `null`; any non-null value is an improvement.

**Data Completeness Risk: Very Low**
All 60 asteroid sign entries exist and were verified by grep. All 60 house entries exist. All 5 retrograde entries exist.

---

## Conclusion

The asteroid interpretation system is **architecturally sound but administratively blocked**. The data layer is complete and correct. The minimum viable fix requires:
1. Two type signature changes (5 minutes)
2. Simplification of `assembleReading()` retrograde logic (5 minutes)
3. Removal of guards from `PlanetTooltip` (5 minutes)
4. Creation and placement of `AsteroidSection` component (30 minutes)

The entire feature can be unblocked and shipped in under one hour of focused work. The code quality will improve in the process — fewer unnecessary guards, more honest types, clearer intent.
