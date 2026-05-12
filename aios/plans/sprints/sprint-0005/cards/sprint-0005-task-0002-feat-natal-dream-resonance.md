# Sprint 0005 — Task 0002: feat-natal-dream-resonance

**From proposal:** `proposals/active/feat-natal-dream-resonance.md`

---

# Proposal: Natal Dream Resonance

**Type:** Feature
**Originated by:** Jobs + Miyazaki + Carmack
**Impact:** High
**Effort:** Low–Medium

---

## Problem

When a user records a dream, the GPT receives their full natal chart as context — all 10 planets, angles, and house positions dumped as a flat list. The AI then attempts to relate all of it to the dream. This produces generic astrological commentary rather than specifically dreamscape-relevant interpretation.

The dream realm in astrology has clear rulers:
- **Neptune** — the planet of the unconscious, illusions, mysticism, and sleep
- **The 12th house** — the house of hidden things, the collective unconscious, isolation, and spiritual withdrawal
- **The Moon** — emotions, the inner world, the night, memory
- **Pisces** (and specifically Pisces Rising or Pisces placements) — dissolution, permeability to the unseen

A person with Neptune in the 8th house will dream very differently than someone with Neptune in the 1st. A person with the Moon in Scorpio processes their night-mind through depth and intensity. A person with three planets in the 12th house has a rich, active unconscious. None of this is currently surfaced to the user or foregrounded for the AI.

## Proposed Solution

Add a **"Dreamscape Blueprint"** section to the dream modal that surfaces the dreamer's natal placements most relevant to the dream realm. Display this in the sky context area alongside the current transits.

Also enhance the GPT dream interpretation prompt to lead with this focused natal dreamscape context before passing the full chart — giving the AI a "spotlight" on the placements that most shape this person's dream life.

### UI Addition (DreamModal)

In the sky context section (the area that shows moon phase + active transits), add a compact "Your dream nature" subsection showing:
- **Neptune:** `[sign] · [house] house` — 1-line interpretation (e.g., "House 8 — transformation and shadow")
- **Moon:** `[sign] · House [n]` — 1-line note (e.g., "Scorpio — intense, depth-seeking")
- **12th house planets** (if any): listed as glyphs with signs (e.g., "♂ Mars · ♀ Venus in 12th")
- **Pisces ascendant** note if applicable: "Pisces Rising — naturally porous to the dream realm"

Rendered in the same quiet style as the existing sky context pills — small, gold-tinted, below the transit aspects.

### GPT Context Enhancement (gptInterpretation.ts)

In `getDreamInterpretation()`, prepend a `buildDreamscapeContext(chart)` section before the existing `buildNatalContext()` call:

```ts
function buildDreamscapeContext(chart: ChartData): string {
  const neptune = chart.planets.find(p => p.name === 'Neptune')
  const moon = chart.planets.find(p => p.name === 'Moon')
  const twelfthHousePlanets = chart.planets.filter(p => p.house === 12)
  const ascSign = chart.houses?.[0]?.sign ?? chart.angles?.ascendant?.sign

  let ctx = '## Dreamscape Natal Blueprint (emphasize these in interpretation)\n'
  if (neptune) {
    ctx += `Neptune (dream ruler): ${neptune.sign}`
    if (neptune.house) ctx += `, House ${neptune.house}`
    ctx += '\n'
  }
  if (moon) {
    ctx += `Moon (night mind): ${moon.sign}`
    if (moon.house) ctx += `, House ${moon.house}`
    ctx += '\n'
  }
  if (twelfthHousePlanets.length > 0) {
    ctx += `12th house (unconscious realm): ${twelfthHousePlanets.map(p => `${p.name} in ${p.sign}`).join(', ')}\n`
  }
  if (ascSign === 'Pisces') {
    ctx += 'Pisces Rising: naturally permeable to dreamspace and the collective unconscious\n'
  }
  return ctx
}
```

The GPT prompt is updated to say: "Focus your interpretation especially on the Dreamscape Blueprint above — these are the placements that most shape this person's dream life."

### Edge Case Handling

- If `unknownTime = true`, `planet.house` will be undefined — skip house mentions, use sign only
- If Neptune not found in planets array (shouldn't happen, but defensive), skip that line
- If no 12th house planets, skip that subsection entirely
- If no API key, the dreamscape blueprint still shows in the UI for the user to read themselves

## Why This Is a Feature, Not a Code Enhancement

This adds new UI elements (dreamscape blueprint display), new logic (context filtering/building), and a modified GPT prompt that changes the character of dream readings. It is a meaningful new capability — dream readings that know what kind of dreamer you are.

## Implementation Summary

**Files to modify:**
- `src/components/dream/DreamModal.tsx` — add dreamscape blueprint display in the sky context section
- `src/services/gptInterpretation.ts` — add `buildDreamscapeContext()` helper, modify `getDreamInterpretation()` to prepend it

**Optional:**
- Short Neptune-in-house interpretation strings can be inline in the component or a small lookup object

## Dependencies

- Sprint 4 dream sky context (✅ done — `DreamModal` already has the sky context section this enhances)
- Existing `ChartData` type with `planet.house` field

## Acceptance Criteria

- [ ] Dreamscape blueprint section visible in the dream modal sky context area (alongside moon + transits)
- [ ] Neptune sign + house displayed with a brief 1-line interpretation
- [ ] Moon sign + house displayed
- [ ] 12th house planets listed if any (suppressed if none)
- [ ] Pisces Rising noted if applicable
- [ ] House mentions suppressed when `unknownTime = true` (houses not reliable)
- [ ] GPT dream interpretation references the dreamer's Neptune/Moon/12th house in its reading
- [ ] Graceful render when chart is unavailable (blueprint section hidden, not broken)
- [ ] Design matches existing sky context styling — same font size, gold glyphs, quiet presentation
