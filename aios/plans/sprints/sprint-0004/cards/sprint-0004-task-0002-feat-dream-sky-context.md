# feat-dream-sky-context

**Type:** Feature
**Originated by:** Jobs + Miyazaki + Taleb + Carmack

---

## Problem or Opportunity

The dream journal records what a user dreamed but not *when the sky looked like*. This is a missed opportunity for the product's core promise: bridging the inner world (dreams, intuition) with the outer one (stars, transits).

When a user writes a dream at 3am, the Moon is in a specific sign and phase. Jupiter may be exactly trining their natal Sun. These celestial conditions are exactly what traditional astrology and dream interpretation consider significant — yet the app captures none of it. The astrological state at the moment of a dream is lost forever once the session moves on.

More concretely: the current dream journal is an isolated feature. It has no connection to any other part of the app. A user who loves both the transit readings and the dream journal has no way to see how the two relate in their own life. The sky-at-dream-time is the connective tissue between these two features.

---

## Proposed Solution

**At dream record time:**
1. Capture the Moon's current sign (from astronomy engine, no natal data required) and phase (from Sun/Moon elongation angle — store raw angle + label)
2. If natal `chartData` is available in context: capture the top 2–3 most exact active transits (filtered from daily transit calculation, orb ≤ 2°) as `{ planet, aspect, natalPlanet, orb }`
3. Store these alongside the dream entry in localStorage as an optional `skyContext` field

**Schema addition** (fully backward-compatible — optional fields, old entries show graceful fallback):
```ts
interface SkyContext {
  moonSign: string           // e.g. "Scorpio"
  moonPhase: string          // e.g. "Waxing Gibbous"
  moonElongation: number     // raw degrees, for future label recalculation
  transits?: Array<{         // only when natal chart is available
    transitPlanet: string
    aspect: string
    natalPlanet: string
    orb: number
  }>
}
```

**At dream display time:**
- Show a small "Sky at this dream" footer on each dream entry card with: Moon phase glyph, Moon sign, and up to 3 transit glyphs (e.g., "☽ Scorpio · ♃ △ ☉ · ♆ ☌ ☿")
- Use same glyph encoding as the chart wheel — planet symbols, aspect symbols
- If no sky context exists for the entry: show nothing (old entries just don't show a sky footer)
- On hover/expand: show human-readable labels in a tooltip

**GPT reading enhancement:**
- Include the captured sky context in the GPT dream interpretation prompt: "The Moon was in Scorpio (Waxing Gibbous) when this dream was recorded. Active transits: Jupiter trine natal Sun (0.8° orb), Neptune conjunct natal Mercury (1.4° orb)."
- This makes the GPT reading meaningfully more personalized — it can weave celestial conditions into the dream interpretation

---

## Impact / Effort

- **Impact:** High — makes dreams feel alive within the cosmic context; creates cross-feature integration
- **Effort:** Medium — requires Moon phase computation, transit capture, storage schema update, and display component changes

---

## Dependencies

- `src/components/dream/DreamModal.tsx` — capture sky context on save, display in entries
- `src/engine/astronomy.ts` — add Moon sign/phase computation at an arbitrary date
- `src/engine/transits.ts` — use for capturing active daily transits (tight orb filter)
- `src/context/AppContext.tsx` — access `chartData` for transit computation

---

## Implementation Summary

Key files to modify:
- `src/engine/astronomy.ts` — add `getMoonSignAndPhase(date: Date): { sign: string; phase: string; elongation: number }` utility function
- `src/engine/transits.ts` — add `getTopActiveTransits(chartData, maxCount, maxOrb)` that returns tightest active aspects at current moment
- `src/components/dream/DreamModal.tsx` — on save: compute skyContext and store with entry; in entry display: render "Sky at this dream" footer row
- Dream entry type (in DreamModal.tsx or a shared types file) — add optional `skyContext: SkyContext` field
- `src/services/gptInterpretation.ts` — update dream GPT prompt function to include sky context if present

**Safety rules (Taleb's concerns):**
- `skyContext` is always optional; old entries without it render identically — no breaking changes
- Store raw `moonElongation` angle alongside the phase label for future-proofing
- If `chartData` is null: capture Moon data only (no natal chart needed), skip transits — fail open
- Wrap all sky context computation in try/catch — if it throws, save the entry with `skyContext: undefined` rather than blocking the save
- Never modify existing entry structure — only append `skyContext` as a new optional field

---

## Outcome

**Status:** done — commit `e542898` on branch `sprint-0004-task-0002-feat-dream-sky-context`

**Delivered:**
- `src/engine/astronomy.ts` — added `getMoonSignAndPhase(date)` using `EclipticGeoMoon` + `SunPosition` to derive sign and 8-phase label from Moon–Sun elongation
- `src/engine/transits.ts` — added `getTopActiveTransits(chartData, maxCount, maxOrbDegrees)` returning tightest daily transit aspects at the current moment
- `src/services/gptInterpretation.ts` — extended `getDreamInterpretation` with optional `skyContext` parameter; sky context appended to the prompt as "Sky Context at Time of Recording" section when present
- `src/components/dream/DreamModal.tsx` — added `SkyContext` interface and `PLANET_GLYPHS` map; `DreamSession` gains optional `skyContext`; on interpret: sky context computed in a try/catch (fail-open) and stored with the session; chat display shows a subtle footer row on the first assistant message when `skyContext` is present, formatted as `☽ {sign} · {phase} · {planet glyph} {aspect glyph} {natal planet glyph}`; session restoration and reset both handle `skyContext` correctly

**Build:** zero TypeScript errors, clean Vite production build.
