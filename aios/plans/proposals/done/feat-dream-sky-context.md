# feat-dream-sky-context

**Type:** Feature
**Originated by:** Jobs + Miyazaki + Taleb (Carmack secondary — identified technical path)

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
- If no sky context exists for the entry: show nothing (don't show "no data available" — just silence)
- On hover/expand: show full context with human-readable labels

**GPT reading enhancement:**
- Include the captured sky context in the GPT dream interpretation prompt: "The Moon was in Scorpio (Waxing Gibbous) when this dream was recorded. Active transits: Jupiter trine natal Sun (0.8° orb), Neptune conjunct natal Mercury (1.4° orb)."
- This makes the GPT reading meaningfully more personalized — it can weave celestial conditions into the dream interpretation

---

## Why this is a Feature, not a Code Enhancement

This adds new user-visible information to an existing section and changes what's captured and displayed. It creates a meaningful new cross-feature integration that didn't exist before.

---

## Impact / Effort

- **Impact:** High — makes dreams feel alive within the cosmic context; creates cross-feature integration
- **Effort:** Medium — requires Moon phase computation, transit capture, storage schema update, and display component changes

---

## Dependencies

- `src/components/dream/DreamModal.tsx` — capture sky context on save
- `src/engine/astronomy.ts` — use for Moon sign/phase computation at current time
- `src/engine/transits.ts` — use for capturing active daily transits
- `src/context/AppContext.tsx` — access `chartData` for transit computation

---

## Implementation Summary

Key files to modify:
- `src/engine/astronomy.ts` — add `getMoonSignAndPhase(date: Date): { sign: string; phase: string; elongation: number }` utility
- `src/engine/transits.ts` — add `getTopActiveTransits(chartData, maxCount, maxOrb)` that returns tightest active aspects
- `src/components/dream/DreamModal.tsx` — capture `skyContext` on save; pass `chartData` from props/context
- Dream entry type in storage (in `DreamModal.tsx` or wherever types live) — add optional `skyContext` field
- Dream entry display component (within `DreamModal.tsx` or inline) — render "Sky at this dream" footer

**Taleb's concerns to address:**
- Backward compatibility: `skyContext` is always optional; old entries without it render identically
- Store raw `moonElongation` angle so phase label can be recalculated if convention changes
- If `chartData` is null: capture Moon data only (which needs no natal chart), skip transits
- Wrap sky context computation in try/catch — if it fails, save the entry with no skyContext rather than blocking the save
