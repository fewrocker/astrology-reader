# Code Enhancement: Tarot Type Unification

**Type:** Code Enhancement

**Originated by:** Carmack, Taleb

**User guidance:** n/a

---

## Problem / Opportunity

Three separate, mutually incompatible definitions of `TarotAstroContext` coexist in the codebase with no shared ancestry:

- `src/engine/tarot.ts` — the canonical engine type (`EngineCtx` when aliased by importers), with `currentTransits: TransitAspect[]`, `retrogradeplanets: string[]`, `dominantTransitPlanet: string | null`, `lunarPhaseName`, `lunarPhaseSymbol`, `natalSunSign`, `natalMoonSign`, `natalAscendantSign`, `advanceCategory`, `advanceReason`.
- `src/context/TarotContext.tsx` — a placeholder definition that was marked `// Placeholder types — replaced when src/engine/tarot.ts lands` but was never replaced. It carries `moonPhase: unknown | null` and `transitAspects: unknown[] | null` — fields typed as `unknown`, a compiler-level admission that no one decided what these should contain. This file also defines its own stripped-down `DrawnCard` (four fields: `id`, `name`, `suit`, `number`) and its own `InstantInterpretation` (three fields: `cardId`, `position`, `text`).
- `src/components/tarot/types.ts` — a third definition used by `CelticCrossReading`, with `significantTransits: string[]`, `currentMoonPhase: string`, `numerologyYear: number`, and `sunSign`/`moonSign`/`ascendant` as plain strings rather than typed `ZodiacSign` values.

`src/components/tarot/types.ts` also defines its own `DrawnCard` (flat structure with `cardId`, `cardName`, `arcana`, `suit`, `element`, `reversed`, `coreMeaning`, `symbolicTheme`, `emotionalMeaning`, `astroConnection: string`) and its own `InstantInterpretation` (with `position: number`, `positionName`, `positionDescription`, `astroConnection: string` — the `astroConnection` field is a raw string rather than the full `AstroConnection` object the engine computes).

That is: two parallel `DrawnCard` interfaces, two parallel `InstantInterpretation` interfaces, and three parallel `TarotAstroContext` interfaces, none of which are derived from a shared type.

The direct consequence is the adapter boilerplate in `src/components/tarot/TarotPage.tsx`: `adaptSingleCard`, `adaptSingleInterp`, `adaptThreeDrawnCard`, and `adaptThreeInterp` — four conversion functions whose sole purpose is to translate between the parallel type systems. These functions exist because the types diverged, not because the data is structurally different. Every field that needs to be added to the interpretation layer must be added in multiple places and then plumbed through the adapters.

The type divergence is also the proximate reason the Celtic Cross stub was never replaced. `CelticCrossReading.tsx` receives the `types.ts` version of `TarotAstroContext` (via `buildCelticAstroCtx` in `TarotPage.tsx`), but the real `computeInstantInterpretation` in `src/engine/tarot.ts` expects the engine's `TarotAstroContext`. No converter exists between them. The component local stub was left in place — labeled `// Engine (task-0006) will provide a proper computeInstantInterpretation` — because wiring the real engine call would require either resolving the type mismatch or writing yet another adapter. The stub is still in production.

`TarotPage.tsx` manages the collision at the import boundary by aliasing: it imports `TarotAstroContext as EngineCtx`, `InstantInterpretation as EngineInterp` from the engine alongside unaliased imports from the context and component type files. Three type names collide; aliasing is the workaround. This is not an architectural choice — it is the footprint of types that were never unified.

Every sprint that touches interpretation data must reason about which of three incompatible `TarotAstroContext` shapes is in play at any given call site. The `unknown` fields in the context type mean that downstream code cannot safely use data the context carries. The `astroConnection: string` in the Celtic component type discards the full `AstroConnection` object that the engine computes — rulingPlanet and rulingSign are joined with a dash and the rest of the computed signal is lost before it reaches the GPT payload.

---

## Desired State

There is one canonical `TarotAstroContext` type, one canonical `DrawnCard` interface, and one canonical `InstantInterpretation` interface — all defined in `src/engine/tarot.ts` and imported directly by every file that needs them.

`src/context/TarotContext.tsx` contains no type definitions of its own for these concepts. The placeholder comment `// Placeholder types — replaced when src/engine/tarot.ts lands` is gone because the replacement has happened.

`src/components/tarot/types.ts` contains no parallel definitions of `TarotAstroContext`, `DrawnCard`, or `InstantInterpretation`. Component-specific structural types (spread signals, saved reading schemas, synthesis payloads) may remain in that file, but they are built on top of the engine types rather than duplicating them.

`src/components/tarot/TarotPage.tsx` contains no adapter functions (`adaptSingleCard`, `adaptSingleInterp`, `adaptThreeDrawnCard`, `adaptThreeInterp`). Components receive engine types directly; there is nothing to convert.

`CelticCrossReading.tsx` accepts the engine's `TarotAstroContext` rather than the component-local variant, which removes the type impedance that caused the local stub to exist. There is no local `computeInstantInterpretation` function in that file.

The `astroConnection` field in interpretation data is the full `AstroConnection` object everywhere it appears — not a plain string formed by joining two fields. The Celtic Cross GPT payload carries complete astro connection data per card rather than a degraded string representation.

Adding a field to the interpretation layer means changing one type definition and one implementation. Verifying that a transit signal reaches the Celtic Cross synthesis means reading one data path, not reasoning about three type shapes simultaneously.