# Lessons Learned

## What Went Well

- **astronomy-engine** is excellent — accurate, well-documented, and lightweight. Client-side astronomical calculations are fully viable without a backend.
- **Static interpretation database** approach works well. Having structured `brief` + `detail` entries allows flexible UI rendering (cards, expandable sections, focus area filtering).
- **Incremental step-by-step development** kept each commit small and the build always passing. TypeScript strict mode caught issues at compile time.
- **SVG chart wheel** rendered with polar coordinate math produces a professional-looking natal chart with minimal code.
- **Tailwind CSS** made the mystic theme fast to implement and consistent across all components.

## What Broke / Gotchas

- **create-vite Node version**: create-vite@9.0.3 required Node ^20.19.0 || >=22.12.0. The system had 20.17.0. Manual project scaffolding worked fine as a fallback.
- **Placidus house system at extreme latitudes**: The iterative calculation for intermediate house cusps can fail or produce unintuitive results near polar latitudes. A fallback to Equal House system would be prudent.
- **Import paths in deeply nested components**: Relative imports (`../../data/`) are fragile. Path aliases (e.g., `@/data/`) in tsconfig would improve DX.
- **Cities JSON bundle size**: At 7.3MB, the cities database dominates the bundle. A trie-based or binary search over a more compact format (e.g., protobuf, or a server-side endpoint) would be better for production.

## Process Improvements

- The lifecycle system (PLANNING → SETUP → DEVELOPMENT → REVIEW) with gate checks kept quality high and scope controlled.
- Having `define-product.md` as a feature checklist made REVIEW straightforward — every feature could be verified against the spec.
- Scaffolding all step folders upfront with plan.md files provided clear roadmap visibility.

## Stack-Specific Notes

- **astronomy-engine**: Use `Body` enum values. `EclipticLongitude()` is the easiest path to zodiac positions. Moon requires `EclipticGeoMoon()` which returns full ecliptic coords.
- **Vite + React**: Zero-config TypeScript support. Dynamic `import()` for large JSON files works seamlessly for code splitting.
- **Tailwind CSS**: Custom color themes via `extend.colors` compose well with opacity modifiers (`bg-mystic-gold/10`).
