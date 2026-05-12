# Coding Standards & Agent Guidelines

## Project: Astral Chart

### Language & Framework
- **TypeScript** (strict mode) — no `any` types unless absolutely unavoidable
- **React 18** with functional components and hooks only
- **Tailwind CSS** for styling — avoid inline styles and separate CSS files

### Code Organization
- One component per file, named to match the export
- Keep components under 200 lines; extract sub-components when larger
- Colocate types with the module that owns them; shared types go in `src/engine/types.ts`
- Data constants (zodiac signs, aspect definitions) go in `src/data/`

### Naming Conventions
- Components: PascalCase (`ChartWheel.tsx`)
- Hooks: `use` prefix, camelCase (`useChartData.ts`)
- Utilities/engine: camelCase (`calculateAspects.ts`)
- Types/interfaces: PascalCase, no `I` prefix (`BirthData`, `PlanetPosition`)
- Constants: UPPER_SNAKE_CASE for true constants, camelCase for config objects

### Component Patterns
- Props interfaces defined above the component in the same file
- Destructure props in function signature
- Use `React.FC` sparingly — prefer typed function declarations
- Keep state close to where it's used; lift only when necessary

### Styling
- Use Tailwind utility classes exclusively
- Custom theme values defined in `tailwind.config.js` under `extend`
- Responsive design: mobile-first (`sm:`, `md:`, `lg:` breakpoints)
- Mystic theme colors via `mystic-*` prefix (e.g., `text-mystic-gold`, `bg-mystic-bg`)

### Astronomical Calculations
- All calculation functions must be pure — no side effects
- Input: raw birth data (date, time, lat, lng, timezone)
- Output: typed data structures (`PlanetPosition[]`, `Aspect[]`, `HouseCusp[]`)
- Use `astronomy-engine` library for planetary positions
- All angles in degrees (0-360) unless explicitly noted otherwise

### Error Handling
- Validate user inputs at the form boundary
- Calculation engine should not throw — return result objects with optional error fields
- UI should gracefully handle missing data (e.g., unknown birth time → skip house-dependent readings)

### Async GPT Calls in useEffect — Cancelled-Flag Pattern

All `useEffect` blocks that fire GPT calls must use the **cancelled-flag pattern** to prevent state updates on unmounted components:

```typescript
useEffect(() => {
  let cancelled = false
  setLoading(true)
  someGptService(args, apiKey)
    .then(text => { if (!cancelled) setText(text) })
    .catch(err => { if (!cancelled) setError(err.message) })
    .finally(() => { if (!cancelled) setLoading(false) })
  return () => { cancelled = true }
}, [dependencies])
```

- Use this pattern instead of AbortController when the underlying GPT functions in `gptInterpretation.ts` don't accept an `AbortSignal`
- Every GPT `useEffect` must return a cleanup function that sets `cancelled = true`
- Never call `setState` after a component unmounts — this pattern prevents that class of bug

### Git
- Commit messages: `type: description` (e.g., `feat: add aspect calculation engine`)
- Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `style`
- Commit logical units of work, not individual file changes
