# Fragility Analysis: Sprint 0015 — Asteroid Integration
## By Nassim Taleb's Lens

This sprint is a classic **infrastructure completion**: the mechanical foundation exists (positions calculated, glyphs rendered, aspects filtered), but the meaning layer is partially blocked. This is where fragility hides — not in obvious failure, but in silent partial operation. Here is what will break.

---

## CRITICAL FRAGILITY: The Signature Mismatch Trap

### The Risk
**File**: `src/data/interpretations/index.ts`, lines 19-25

The lookup functions are **typed for classical planets only**:
```typescript
export function getPlanetInSignInterpretation(planet: PlanetName | 'NorthNode', sign: ZodiacSign): InterpretationEntry | null
export function getPlanetInHouseInterpretation(planet: PlanetName | 'NorthNode', house: number): InterpretationEntry | null
```

These signatures do **not** accept `AsteroidName`. They cannot. If this sprint wires asteroid interpretations through these functions, a type error is required — the code will not compile as written.

**Why this matters**: The current code defensively guards against this:
```typescript
signInterpretation: !isAsteroid(p.name as BodyName) ? getPlanetInSignInterpretation(...) : null
```

When an asteroid is detected, the code **returns `null` unconditionally**. This is safe today because there is no data. But **the moment you add asteroid sign interpretations to `PLANET_IN_SIGN`**, you will need to:

1. Change these function signatures to accept `AsteroidName` *OR* create separate asteroid lookup functions
2. Update the logic in `assembleReading()` to distinguish between "asteroid, data doesn't exist" and "asteroid, data exists"
3. Handle the type cast burden of passing `AsteroidName` into functions typed for `PlanetName`

**The fragility**: If this wiring is done carelessly — by adding asteroid entries to `PLANET_IN_SIGN` without updating the function signatures — the code may compile (via `as` casts) but silently fail to surface the data. A developer might add "Chiron_Aries" to the data map and then call the same `getPlanetInSignInterpretation()` function unchanged, only to find it still returns `null` because the signature hasn't widened. **Silent failure is worse than no operation.**

---

## DATA COMPLETENESS: Asteroid Entries Already Exist (Mostly)

### Good News: Houses and Retrogrades
- **`src/data/interpretations/planetInHouse.ts`**: All **60 asteroid-in-house entries are complete** (5 asteroids × 12 houses). I counted: Chiron (12), Ceres (12), Pallas (12), Juno (12), Vesta (12). ✓
- **`src/data/interpretations/retrogrades.ts`**: All **5 asteroid retrograde entries are present** (Chiron, Ceres, Pallas, Juno, Vesta at lines 44–63). ✓

### The Gap: Sign Interpretations Don't Exist Yet
- **`src/data/interpretations/planetInSign.ts`**: Entries exist for Chiron, Ceres, Pallas, Juno, Vesta (12 each, 60 total). ✓
  - I verified: `Chiron_Aries`, `Ceres_Taurus`, `Pallas_Gemini`, `Juno_Cancer`, `Vesta_Leo`, etc. all present.

**Critical Finding**: The vision says "no entries for any of the 5 asteroids" but **the data is already present and complete**. Either:
1. The data was added in a previous sprint and the vision wasn't updated, OR
2. The vision is describing what needs to happen, and the data I'm seeing is a false positive

Regardless, **all 60 asteroid sign entries exist and are mapped correctly**. The data completeness is not the blocker.

---

## SILENT FAILURE RISK 1: Missing Null Guard in Components

### The Risk
**File**: `src/components/reading/ReadingDisplay.tsx`, lines 78–138

The `PlanetCard` component assumes that if `signInterpretation` is present, it can be rendered:
```typescript
{pr.signInterpretation && <p className="text-mystic-muted text-sm mt-1">{pr.signInterpretation.brief}</p>}
```

This is safe. But deeper in the code:
```typescript
{expanded && (
  <div className="mt-3 ml-9 space-y-3 text-sm">
    {pr.signInterpretation && (
      <div>
        <div className="text-mystic-gold/80 font-medium text-xs uppercase tracking-wider mb-1">{pr.planet.name} in {pr.planet.sign}</div>
        <p className="text-mystic-text/90 leading-relaxed">{pr.signInterpretation.detail}</p>
      </div>
    )}
    ...
  </div>
)}
```

All the display logic properly null-checks. **No fragility here.**

### Related: Chart Tooltip (ChartWheel.tsx, lines 69–150)

The `PlanetTooltip` component is where the real risk emerges. For asteroids:
```typescript
const isAsteroidBody = isAsteroid(planet.name as BodyName)
const signInterp = !isAsteroidBody ? getPlanetInSignInterpretation(...) : null
const houseInterp = !chartData.unknownTime && !isAsteroidBody ? getPlanetInHouseInterpretation(...) : null
```

Currently, asteroids **always return `null`** for both interpretations. When you unlock asteroid interpretations:

1. **Change line 71 to accept asteroids**: Remove the `!isAsteroidBody` guard
2. **But you must update `getPlanetInSignInterpretation()` first**, otherwise it will still reject the asteroid name at compile time

**Fragility**: If a developer changes line 71 before updating the function signatures, TypeScript will fail. If they use a `as any` cast to bypass it, the lookup will fail silently at runtime and the user will see a blank tooltip.

---

## SILENT FAILURE RISK 2: Asteroid Retrograde Data Exists But Is Blocked

### The Risk
**File**: `src/data/interpretations/index.ts`, line 141

```typescript
retrogradeInterpretation: (p.retrograde && !isAsteroid(p.name as BodyName) && p.name !== 'NorthNode') ? (NATAL_RETROGRADE[p.name] ?? null) : null
```

The guard `!isAsteroid(p.name as BodyName)` blocks ALL asteroid retrograde interpretations from ever surfacing. This is intentional — but **the data exists**:

- `NATAL_RETROGRADE['Chiron']` (lines 44–46) ✓
- `NATAL_RETROGRADE['Ceres']` (lines 48–50) ✓
- `NATAL_RETROGRADE['Pallas']` (lines 52–54) ✓
- `NATAL_RETROGRADE['Juno']` (lines 56–58) ✓
- `NATAL_RETROGRADE['Vesta']` (lines 60–62) ✓

This data is **completely written and ready to surface**, but requires only removing the `!isAsteroid()` guard.

**Fragility**: This is the *right kind* — intentional blocking that can be unlocked cleanly. But if someone removes the guard without testing, they might not realize it was blocking. The grid lookup `NATAL_RETROGRADE[p.name]` works for asteroids only if `p.name` is one of the 5 asteroid names. If an asteroid name is ever misspelled in the code or added as a new body later, this lookup will fail silently and return `null`.

---

## TYPE SYSTEM GAP: No Compile-Time Protection for New Bodies

### The Risk
**File**: `src/engine/types.ts`, lines 38–58

The type system is sound:
```typescript
export type AsteroidName = 'Chiron' | 'Ceres' | 'Pallas' | 'Juno' | 'Vesta'
export type BodyName = PlanetName | 'NorthNode' | AsteroidName
export function isAsteroid(name: BodyName): name is AsteroidName { ... }
```

But the **retrograde lookup has no type safety**:
```typescript
NATAL_RETROGRADE[p.name] ?? null
```

If `p.name` is 'Chiron' (an AsteroidName), this works. But:
- If the code ever passes `p.name` of type `BodyName` without narrowing, TypeScript doesn't prevent a lookup of an invalid key.
- The return type is `InterpretationEntry | undefined`, and the `?? null` coerces it to `null`. This is safe, but the pattern is fragile.

**Deeper fragility**: The vision says "Do not add Lilith, Eris, Sedna, or any other body." But if a future sprint adds a 6th asteroid:
1. The type `AsteroidName` must be updated (will cause compile errors, good)
2. The `ASTEROID_NAMES` array must be updated (will cause runtime errors if missed, bad)
3. All data maps (`PLANET_IN_SIGN`, `PLANET_IN_HOUSE`, `NATAL_RETROGRADE`) must have all 12 × 3 = 36 new entries, or lookups will silently return `null`

There is **no way to catch this at compile time**. If someone adds `'Lilith'` to `AsteroidName` but forgets to add entries to `PLANET_IN_HOUSE`, the code will still compile and the Lilith interpretations will simply never appear.

---

## EDGE CASE 1: Unknown Birth Time + Asteroid House Interpretations

### The Risk
**File**: `src/data/interpretations/index.ts`, line 139

```typescript
houseInterpretation: (chart.unknownTime || isAsteroid(p.name as BodyName)) ? null : getPlanetInHouseInterpretation(...)
```

This correctly returns `null` for:
- Any planet/asteroid when `unknownTime` is true ✓
- Any asteroid regardless of known time ✓

**No fragility here.**

But in the ReadingDisplay:
```typescript
<PlanetSection reading={reading} showHouse={!chartData.unknownTime} />
```

If someone later decides "let's show asteroid house interpretations even when time is unknown," they will need to:
1. Change the guard on line 139
2. Add house interpretations to all asteroids
3. Ensure the UI component doesn't display house info when `unknownTime` is true

**Fragility**: The UI prop `showHouse` controls whether ANY planet shows house data. If a developer changes the logic to surface asteroid house data for unknown times, they might not update `showHouse`, and the UI will display the interpretation text even though the house itself is meaningless.

---

## EDGE CASE 2: Focus Area Filtering Ignores Asteroids

### The Risk
**File**: `src/data/interpretations/index.ts`, lines 156–171

```typescript
const relevantPlanets = planetReadings.filter(
  (pr) => mapping.planets.includes(pr.planet.name as PlanetName)
)
```

The `mapping.planets` array only contains classical planet names: `['Venus', 'Mars', 'Moon']`, etc. (See lines 156–203 in `types.ts`).

Asteroids are **never included in focus area readings**, even if they have interpretations. For example, if a user asks for a "love" reading and Juno is in the 7th house, Juno will not appear in the focus area, only in the full planets list.

**Is this fragility?** It's intentional by design (spirit of the sprint says not to modify focus areas). But it's a single point of failure: if a future sprint wants to include asteroids in focus areas, the mapping structure must be redesigned. Currently, there's no way to do it without modifying every entry in `FOCUS_AREA_MAPPINGS`.

---

## EDGE CASE 3: Aspect Interpretations for Asteroid-Asteroid Conjunctions

### The Risk
**File**: `src/data/interpretations/index.ts`, line 145

```typescript
const filteredAspects = filterAsteroidAspects(aspects)
```

The vision says: "Not about aspect interpretations between asteroids and planets." Currently, asteroid-to-planet aspects are allowed (kept in the filtered list), but asteroid-to-asteroid aspects beyond 3° are filtered out.

If Chiron and Ceres are conjunct (within 3°), the aspect is kept. But:
```typescript
aspect: a,
interpretation: getAspectInterpretation(a),
```

The `getAspectInterpretation()` function tries both orderings:
```typescript
const key1 = `${aspect.planet1}_${typeKey}_${aspect.planet2}`
const key2 = `${aspect.planet2}_${typeKey}_${aspect.planet1}`
return ASPECT_INTERPRETATIONS[key1] ?? ASPECT_INTERPRETATIONS[key2] ?? null
```

If the keys are `Chiron_Conjunction_Ceres` and `Ceres_Conjunction_Chiron`, and neither exists in `ASPECT_INTERPRETATIONS`, the function returns `null`. The UI will display the aspect line with no interpretation text.

**This is correct behavior per the sprint scope.** But it's a place where a user might expect an interpretation and get silence.

---

## REGRESSION RISK: Type Casting in assembleReading()

### The Risk
**File**: `src/data/interpretations/index.ts`, lines 136–142

```typescript
const planetReadings: PlanetReading[] = chart.planets.map((p) => ({
  planet: p,
  signInterpretation: !isAsteroid(p.name as BodyName) ? getPlanetInSignInterpretation(p.name as PlanetName | 'NorthNode', p.sign) : null,
  houseInterpretation: (chart.unknownTime || isAsteroid(p.name as BodyName)) ? null : getPlanetInHouseInterpretation(p.name as PlanetName | 'NorthNode', p.house),
  dignity: (!isAsteroid(p.name as BodyName) && p.name !== 'NorthNode') ? getDignity(p.name as PlanetName, p.sign) : null,
  retrogradeInterpretation: (p.retrograde && !isAsteroid(p.name as BodyName) && p.name !== 'NorthNode') ? (NATAL_RETROGRADE[p.name] ?? null) : null,
}))
```

Every lookup cast `p.name` to either `PlanetName | 'NorthNode'` or `BodyName` depending on context. These casts are **always safe** because the guards ensure the downstream function only receives appropriate types.

**But**: If someone later adds asteroid interpretations and changes one of these guards without updating its corresponding cast, they introduce a type inconsistency. For example:

```typescript
// WRONG: Guard removed but cast not updated
signInterpretation: getPlanetInSignInterpretation(p.name as PlanetName | 'NorthNode', p.sign),
```

If `p.name` is 'Chiron', the cast to `PlanetName | 'NorthNode'` will pass TypeScript (casts are assertions), but the function call will fail at runtime.

**Fragility**: These casts are fragile because they depend on guards that might be removed. A safer pattern would be to resolve `AsteroidName` separately before calling these functions.

---

## MISSING VALIDATION: No Enum for Retrograde Asteroid Names

### The Risk
**File**: `src/data/interpretations/retrogrades.ts`, lines 44–63

The `NATAL_RETROGRADE` object has entries for 5 asteroids + 8 planets = 13 entries. But:

```typescript
export const NATAL_RETROGRADE: Record<string, InterpretationEntry> = { ... }
```

The key type is `Record<string, ...>`, not `Record<PlanetName | AsteroidName, ...>`. This means:
- The lookup `NATAL_RETROGRADE['Chiron']` succeeds because the entry exists
- The lookup `NATAL_RETROGRADE['Lilith']` returns `undefined` (no error, no warning)

If an asteroid name is ever misspelled in the code or added but not added to `NATAL_RETROGRADE`, the lookup silently fails.

**Better pattern**: Type the keys more strictly:
```typescript
export const NATAL_RETROGRADE: Record<PlanetName | AsteroidName, InterpretationEntry> = { ... }
```

This would cause TypeScript to flag missing entries at compile time. Currently, there's no such protection.

---

## THE REAL FRAGILITY: Interpretation Data Maps Are Untyped

### Root Cause
All three interpretation maps use `Record<string, InterpretationEntry>`:
- `PLANET_IN_SIGN: Record<string, InterpretationEntry>`
- `PLANET_IN_HOUSE: Record<string, InterpretationEntry>`
- `NATAL_RETROGRADE: Record<string, InterpretationEntry>`

The key format is **a convention, not enforced**:
- `"${planet}_${sign}"` (e.g., `"Chiron_Aries"`)
- `"${planet}_H${house}"` (e.g., `"Chiron_H7"`)
- `"${planet}"` (e.g., `"Chiron"`)

**What can go wrong:**
1. **Typo in key entry**: `"Chiron_aries"` instead of `"Chiron_Aries"` → lookup fails silently
2. **Typo in lookup**: `getPlanetInSignInterpretation('Cheron', 'Aries')` → lookup fails silently
3. **Missing entry**: 60 asteroids × signs should be present, but if one is skipped, it returns `null` with no warning
4. **New asteroid added**: If `'Lilith'` is added to types, nothing prevents missing 12 Lilith-in-sign entries

**Solution space (for future work)**:
- Use a discriminated union type for keys
- Generate the map from a 2D array of `[name, sign] | [name, house]` tuples
- Use Zod or ts-expect-error to validate map shape at build time

**For this sprint**: The existing maps are complete and correct. But **any future additions will be fragile**.

---

## SUMMARY: Where Sprint 0015 Will Break

| Risk | Severity | Location | Fix Required |
|------|----------|----------|--------------|
| Function signature mismatch for asteroid lookups | HIGH | `index.ts` 19–25 | Update signatures to accept `AsteroidName` before wiring data |
| Asteroid retrograde data silently blocked | MEDIUM | `index.ts` 141 | Remove `!isAsteroid()` guard (intentional, low risk) |
| Type casting fragility on guards | MEDIUM | `index.ts` 138–141 | Keep casts in sync with guards; easier to resolve types first |
| Retrograde lookup has no compile-time validation | LOW | `retrogrades.ts` 11 | Type keys more strictly for future safety |
| New asteroids can be added without data entries | LOW | `types.ts` 38 | Add build-time validation that all asteroids have all data |
| Focus areas don't include asteroids | LOW | `types.ts` 156–171 | By design; won't break, but limits usefulness |

---

## What Won't Break

- **Data completeness**: All 60 + 60 + 5 entries exist ✓
- **Null guards in display**: All components safely check for `null` ✓
- **Unknown time handling**: Asteroid house interpretations correctly stay `null` ✓
- **Element/modality analysis**: Asteroids intentionally excluded (correct) ✓
- **Aspect filtering**: Asteroid-to-asteroid aspects correctly filtered ✓

---

## Recommendation

Before unlocking asteroid interpretations:

1. **Update function signatures** in `index.ts` lines 19 & 23 to accept `AsteroidName`
2. **Update the call sites** in `assembleReading()` to pass asteroid names when available
3. **Test with unknown time**: Ensure asteroid house interpretations stay `null`
4. **Test the tooltip**: Tap an asteroid in ChartWheel and verify sign + house text appears
5. **Add a TypeScript check**: Ensure no `as any` casts slip through; type-safe casting is safer

The fragility isn't in the data or the display logic. **It's in the handoff between the data model and the function signatures**. Wiring this up carelessly will create silent failures where interpretations exist in the data but never reach the user.

---

**—Nassim Taleb**

*The system is not broken. It is in a state of artificial restriction. When you lift the restriction, what was hidden will surface. The question is: will you surface it cleanly, or will you introduce the kind of silent failure that takes months to find?*
