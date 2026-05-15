# Server-Side Dream Chart Calculation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move dream interpretation's natal chart + sky context calculation from the client to the server, so every dream reading is correctly grounded in the user's birth data and the sky at the time of the dream — regardless of client state — and update the GPT prompt so astrology appears only when it genuinely illuminates a dream symbol.

**Architecture:** The server reads `birth_place` (already stored as a JSON string containing `lat`, `lng`, `tz`), calls `calculateChart()` + `getTopActiveTransits()` server-side, and injects the results into the dream interpretation payload before calling GPT. The client becomes a thin sender: it only passes `dreamDescription` and `dreamDate`. Engine files are copied to `server/engine/` (with NodeNext `.js` import extensions) to stay within the server's existing `tsconfig.server.json` rootDir.

**Tech Stack:** TypeScript (NodeNext), astronomy-engine (already installed), better-sqlite3, Express

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `server/engine/types.ts` | Create (copy) | Zodiac/planet type definitions |
| `server/engine/zodiac.ts` | Create (copy) | Longitude → zodiac conversion |
| `server/engine/aspects.ts` | Create (copy) | Aspect definitions |
| `server/engine/astronomy.ts` | Create (copy) | `calculateChart`, `getMoonSignAndPhase` |
| `server/engine/transits.ts` | Create (new) | Minimal `getTopActiveTransits` for server use |
| `server/services/chartEngine.ts` | Create (new) | `getUserChartAndSky()` — DB lookup + chart calc |
| `server/routes/gpt.ts` | Modify | Inject server-computed chart data into dream payload |
| `server/services/gpt.ts` | Modify | Update prompt instructions (light-touch astrology) |
| `src/services/gptInterpretation.ts` | Modify | Simplify `getDreamInterpretation` signature |
| `src/components/dream/DreamModal.tsx` | Modify | Remove client-side chart/sky collection |

---

### Task 1: Copy `types.ts` to `server/engine/types.ts`

**Files:**
- Create: `server/engine/types.ts`

- [ ] **Step 1: Copy `src/engine/types.ts` verbatim to `server/engine/types.ts`**

The file has no imports, so no path changes needed. Copy exactly:

```typescript
export const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const

export type ZodiacSign = typeof ZODIAC_SIGNS[number]

export const ZODIAC_GLYPHS: Record<ZodiacSign, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
}

export type PlanetName =
  | 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars'
  | 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune' | 'Pluto'

export const PLANET_NAMES: PlanetName[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
]

export const PLANET_GLYPHS: Record<PlanetName | 'NorthNode', string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  NorthNode: '☊',
}

export interface ZodiacPosition {
  longitude: number
  sign: ZodiacSign
  signIndex: number
  degree: number
  minute: number
}

export interface PlanetPosition extends ZodiacPosition {
  name: PlanetName | 'NorthNode'
  retrograde: boolean
  house: number
}

export interface HouseCusp {
  house: number
  longitude: number
  sign: ZodiacSign
  degree: number
  minute: number
}

export interface ChartAngles {
  ascendant: ZodiacPosition
  midheaven: ZodiacPosition
  descendant: ZodiacPosition
  imumCoeli: ZodiacPosition
}

export type Element = 'Fire' | 'Earth' | 'Air' | 'Water'
export type Modality = 'Cardinal' | 'Fixed' | 'Mutable'

export const SIGN_ELEMENTS: Record<ZodiacSign, Element> = {
  Aries: 'Fire', Taurus: 'Earth', Gemini: 'Air', Cancer: 'Water',
  Leo: 'Fire', Virgo: 'Earth', Libra: 'Air', Scorpio: 'Water',
  Sagittarius: 'Fire', Capricorn: 'Earth', Aquarius: 'Air', Pisces: 'Water',
}

export const SIGN_MODALITIES: Record<ZodiacSign, Modality> = {
  Aries: 'Cardinal', Taurus: 'Fixed', Gemini: 'Mutable', Cancer: 'Cardinal',
  Leo: 'Fixed', Virgo: 'Mutable', Libra: 'Cardinal', Scorpio: 'Fixed',
  Sagittarius: 'Mutable', Capricorn: 'Cardinal', Aquarius: 'Fixed', Pisces: 'Mutable',
}

export interface ChartData {
  planets: PlanetPosition[]
  houses: HouseCusp[]
  angles: ChartAngles
  unknownTime: boolean
  houseSystem: 'placidus' | 'whole-sign'
}
```

- [ ] **Step 2: Verify file exists**

Run: `ls /projects/astrology-reader/server/engine/`
Expected: `types.ts` is listed.

---

### Task 2: Copy `zodiac.ts` to `server/engine/zodiac.ts`

**Files:**
- Create: `server/engine/zodiac.ts`

- [ ] **Step 1: Write `server/engine/zodiac.ts` with NodeNext `.js` import extension**

The only change from `src/engine/zodiac.ts` is the import path: `'./types'` → `'./types.js'`.

```typescript
import { ZODIAC_SIGNS, type ZodiacPosition, type ZodiacSign } from './types.js'

export function longitudeToZodiac(longitude: number): ZodiacPosition {
  const norm = ((longitude % 360) + 360) % 360
  const signIndex = Math.floor(norm / 30)
  const degInSign = norm - signIndex * 30
  const degree = Math.floor(degInSign)
  const minute = Math.floor((degInSign - degree) * 60)

  return {
    longitude: norm,
    sign: ZODIAC_SIGNS[signIndex],
    signIndex,
    degree,
    minute,
  }
}

export function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360
}

export function formatPosition(pos: ZodiacPosition): string {
  return `${pos.degree}° ${pos.sign} ${pos.minute}'`
}
```

---

### Task 3: Copy `aspects.ts` to `server/engine/aspects.ts`

**Files:**
- Create: `server/engine/aspects.ts`

- [ ] **Step 1: Write `server/engine/aspects.ts` with NodeNext `.js` import extensions**

Changes from `src/engine/aspects.ts`: `'./zodiac'` → `'./zodiac.js'`, `'./types'` → `'./types.js'`.

```typescript
import { normalizeAngle } from './zodiac.js'
import type { PlanetPosition, PlanetName } from './types.js'

export type AspectType =
  | 'conjunction'
  | 'sextile'
  | 'square'
  | 'trine'
  | 'opposition'
  | 'semi-sextile'
  | 'quincunx'

export interface AspectDefinition {
  name: AspectType
  angle: number
  orb: number
  symbol: string
  nature: 'harmonious' | 'challenging' | 'neutral'
}

export const ASPECT_DEFINITIONS: AspectDefinition[] = [
  { name: 'conjunction', angle: 0, orb: 8, symbol: '☌', nature: 'neutral' },
  { name: 'sextile', angle: 60, orb: 6, symbol: '⚹', nature: 'harmonious' },
  { name: 'square', angle: 90, orb: 8, symbol: '□', nature: 'challenging' },
  { name: 'trine', angle: 120, orb: 8, symbol: '△', nature: 'harmonious' },
  { name: 'opposition', angle: 180, orb: 8, symbol: '☍', nature: 'challenging' },
  { name: 'semi-sextile', angle: 30, orb: 2, symbol: '⚺', nature: 'neutral' },
  { name: 'quincunx', angle: 150, orb: 3, symbol: '⚻', nature: 'challenging' },
]

export interface Aspect {
  planet1: PlanetName | 'NorthNode'
  planet2: PlanetName | 'NorthNode'
  type: AspectType
  angle: number
  orb: number
  exactAngle: number
  applying: boolean
  nature: 'harmonious' | 'challenging' | 'neutral'
  symbol: string
}
```

---

### Task 4: Copy `astronomy.ts` to `server/engine/astronomy.ts`

**Files:**
- Create: `server/engine/astronomy.ts`

- [ ] **Step 1: Copy `src/engine/astronomy.ts` to `server/engine/astronomy.ts`**

Read the full content of `src/engine/astronomy.ts` with the Read tool, then write it to `server/engine/astronomy.ts` with two changes:
1. `from './zodiac'` → `from './zodiac.js'`
2. `from './types'` → `from './types.js'`

All other content stays verbatim.

- [ ] **Step 2: Confirm both exports are present**

Run: `grep -n "export function" server/engine/astronomy.ts`
Expected output must include `calculateChart` and `getMoonSignAndPhase` and `getHouseForLongitude`.

---

### Task 5: Create `server/engine/transits.ts`

**Files:**
- Create: `server/engine/transits.ts`

This is a minimal server-only module — it includes only the three functions needed for dream interpretation (`calculateCurrentPositions`, `calculateTransitAspects`, `getTopActiveTransits`) plus their private helpers. It does NOT include `analyzeElements` or any data interpretation imports.

- [ ] **Step 1: Write `server/engine/transits.ts`**

```typescript
import * as Astronomy from 'astronomy-engine'
import { longitudeToZodiac, normalizeAngle } from './zodiac.js'
import type { PlanetPosition, PlanetName, ChartData } from './types.js'
import { PLANET_NAMES } from './types.js'
import type { AspectType } from './aspects.js'
import { ASPECT_DEFINITIONS } from './aspects.js'
import { getHouseForLongitude } from './astronomy.js'

export type TransitPeriod = 'daily' | 'weekly' | 'monthly'

export interface TransitPosition extends PlanetPosition {
  dailyMotion: number
}

export interface TransitAspect {
  transitPlanet: PlanetName | 'NorthNode'
  natalPlanet: PlanetName | 'NorthNode'
  natalHouse: number | null
  natalSign: string
  type: AspectType
  orb: number
  exactAngle: number
  applying: boolean
  nature: 'harmonious' | 'challenging' | 'neutral'
  symbol: string
}

const BODY_MAP: Record<PlanetName, Astronomy.Body> = {
  Sun: Astronomy.Body.Sun,
  Moon: Astronomy.Body.Moon,
  Mercury: Astronomy.Body.Mercury,
  Venus: Astronomy.Body.Venus,
  Mars: Astronomy.Body.Mars,
  Jupiter: Astronomy.Body.Jupiter,
  Saturn: Astronomy.Body.Saturn,
  Uranus: Astronomy.Body.Uranus,
  Neptune: Astronomy.Body.Neptune,
  Pluto: Astronomy.Body.Pluto,
}

function getPlanetLongitude(body: Astronomy.Body, time: Astronomy.AstroTime): number {
  if (body === Astronomy.Body.Sun) return Astronomy.SunPosition(time).elon
  if (body === Astronomy.Body.Moon) return Astronomy.EclipticGeoMoon(time).lon
  const geo = Astronomy.GeoVector(body, time, true)
  return Astronomy.Ecliptic(geo).elon
}

function getMeanNodeLongitude(time: Astronomy.AstroTime): number {
  const T = time.tt / 36525
  const omega = 125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T * T * T / 467441 - T * T * T * T / 60616000
  return normalizeAngle(omega)
}

function getDailyMotion(body: Astronomy.Body, time: Astronomy.AstroTime): number {
  const lon1 = getPlanetLongitude(body, time)
  const timePlus = Astronomy.MakeTime(new Date(time.date.getTime() + 86400000))
  const lon2 = getPlanetLongitude(body, timePlus)
  let diff = lon2 - lon1
  if (diff > 180) diff -= 360
  if (diff < -180) diff += 360
  return diff
}

export function calculateCurrentPositions(date: Date): TransitPosition[] {
  const time = Astronomy.MakeTime(date)
  const positions: TransitPosition[] = []

  for (const name of PLANET_NAMES) {
    const body = BODY_MAP[name]
    const lon = getPlanetLongitude(body, time)
    const zodiac = longitudeToZodiac(lon)
    const motion = getDailyMotion(body, time)

    positions.push({
      ...zodiac,
      name,
      retrograde: motion < 0,
      house: 0,
      dailyMotion: motion,
    })
  }

  const nodeLon = getMeanNodeLongitude(time)
  const nodeZodiac = longitudeToZodiac(nodeLon)
  positions.push({
    ...nodeZodiac,
    name: 'NorthNode',
    retrograde: true,
    house: 0,
    dailyMotion: -0.053,
  })

  return positions
}

export function calculateTransitAspects(
  transitPlanets: TransitPosition[],
  natalPlanets: PlanetPosition[],
  period: TransitPeriod,
  unknownTime = false,
): TransitAspect[] {
  const orbScale = period === 'daily' ? 0.3 : period === 'weekly' ? 0.5 : 0.7
  const aspects: TransitAspect[] = []

  for (const tp of transitPlanets) {
    for (const np of natalPlanets) {
      const rawAngle = Math.abs(tp.longitude - np.longitude)
      const angle = rawAngle > 180 ? 360 - rawAngle : rawAngle

      for (const def of ASPECT_DEFINITIONS) {
        const orb = Math.abs(angle - def.angle)
        const maxOrb = def.orb * orbScale

        if (orb <= maxOrb) {
          const applying = tp.dailyMotion > 0
            ? (angle > def.angle ? false : true)
            : (angle > def.angle ? true : false)

          aspects.push({
            transitPlanet: tp.name,
            natalPlanet: np.name,
            natalHouse: unknownTime ? null : (np.house > 0 ? np.house : null),
            natalSign: np.sign,
            type: def.name,
            orb: Math.round(orb * 100) / 100,
            exactAngle: def.angle,
            applying,
            nature: def.nature,
            symbol: def.symbol,
          })
          break
        }
      }
    }
  }

  aspects.sort((a, b) => a.orb - b.orb)
  return aspects
}

export function getTopActiveTransits(
  chartData: ChartData,
  maxCount: number,
  maxOrbDegrees: number,
  date?: Date,
): TransitAspect[] {
  const positions = calculateCurrentPositions(date ?? new Date())
  const aspects = calculateTransitAspects(positions, chartData.planets, 'daily', chartData.unknownTime)
  return aspects.filter(a => a.orb <= maxOrbDegrees).slice(0, maxCount)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc -p tsconfig.server.json --noEmit`
Expected: No errors. If there are import errors in the engine files, they are almost certainly missing `.js` extensions — fix them in the affected file.

- [ ] **Step 3: Commit**

```bash
git add server/engine/
git commit -m "feat(dream): add server-side engine module for chart + transit calculation"
```

---

### Task 6: Create `server/services/chartEngine.ts`

**Files:**
- Create: `server/services/chartEngine.ts`

- [ ] **Step 1: Write `server/services/chartEngine.ts`**

```typescript
import { getDb } from '../db.js'
import { calculateChart, getMoonSignAndPhase } from '../engine/astronomy.js'
import { getTopActiveTransits } from '../engine/transits.js'
import type { ChartData } from '../engine/types.js'

interface BirthPlace {
  lat: number
  lng: number
  tz: string
}

export interface SkyContext {
  moonSign: string
  moonPhase: string
  transits?: Array<{ transitPlanet: string; aspect: string; natalPlanet: string; orb: number }>
}

export interface ServerDreamContext {
  chartData: ChartData
  natalContext: string
  transitAspectsText: string
  skyContext: SkyContext
}

function buildNatalContextText(chart: ChartData, birthDate: string): string {
  let ctx = `Born: ${birthDate}\n`
  for (const p of chart.planets) {
    ctx += `${p.name}: ${p.sign} ${p.degree}°${p.minute}'`
    if (!chart.unknownTime) ctx += ` (House ${p.house})`
    if (p.retrograde) ctx += ' [Rx]'
    ctx += '\n'
  }
  if (!chart.unknownTime && chart.angles) {
    ctx += `Ascendant: ${chart.angles.ascendant.sign} ${chart.angles.ascendant.degree}°\n`
    ctx += `Midheaven: ${chart.angles.midheaven.sign} ${chart.angles.midheaven.degree}°\n`
  }
  return ctx
}

export function getUserChartAndSky(userId: number, dreamDateStr?: string): ServerDreamContext | null {
  const db = getDb()
  const row = db
    .prepare('SELECT birth_date, birth_time, birth_place FROM users WHERE id = ?')
    .get(userId) as { birth_date: string | null; birth_time: string | null; birth_place: string | null } | undefined

  if (!row?.birth_date || !row.birth_place) return null

  let place: BirthPlace
  try {
    place = JSON.parse(row.birth_place) as BirthPlace
  } catch {
    return null
  }

  if (!place.lat || !place.lng || !place.tz) return null

  const unknownTime = !row.birth_time
  const timeStr = row.birth_time ?? '12:00'
  const chartData = calculateChart(row.birth_date, timeStr, place.lat, place.lng, place.tz, unknownTime)

  const dreamDate = dreamDateStr ? new Date(dreamDateStr) : new Date()
  const moonData = getMoonSignAndPhase(dreamDate)
  const topTransits = getTopActiveTransits(chartData, 3, 2, dreamDate)

  const skyContext: SkyContext = {
    moonSign: moonData.sign,
    moonPhase: moonData.phase,
    ...(topTransits.length > 0 && {
      transits: topTransits.map(t => ({
        transitPlanet: t.transitPlanet as string,
        aspect: t.symbol,
        natalPlanet: t.natalPlanet as string,
        orb: t.orb,
      })),
    }),
  }

  const transitAspectsText = topTransits.length > 0
    ? topTransits
        .map(a =>
          `Transit ${a.transitPlanet} ${a.symbol} Natal ${a.natalPlanet} (${a.type}, orb ${a.orb}°, ${a.applying ? 'applying' : 'separating'}, ${a.nature})`
        )
        .join('\n')
    : 'No tight transit aspects active today.'

  return {
    chartData,
    natalContext: buildNatalContextText(chartData, row.birth_date),
    transitAspectsText,
    skyContext,
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc -p tsconfig.server.json --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add server/services/chartEngine.ts
git commit -m "feat(dream): add getUserChartAndSky service — reads birth data from DB and computes chart + transits"
```

---

### Task 7: Inject server-computed context in `server/routes/gpt.ts`

**Files:**
- Modify: `server/routes/gpt.ts`

The route handler enriches the dream-interpretation payload with server-side computed chart data before forwarding to `handleGptRequest`. This way the GPT service receives accurate data regardless of what the client sent.

- [ ] **Step 1: Add import for `getUserChartAndSky`**

In `server/routes/gpt.ts`, add after the existing imports:

```typescript
import { getUserChartAndSky } from '../services/chartEngine.js'
```

- [ ] **Step 2: Inject server context before `handleGptRequest`**

Replace:
```typescript
  try {
    const result = await handleGptRequest(type, payload)
```

With:
```typescript
  // For dream interpretation: calculate chart + sky server-side from the user's stored birth data.
  // This ensures the reading is grounded even when the client's chart state is missing or stale.
  if (type === 'dream-interpretation') {
    const userId = res.locals.userId as number | undefined
    if (userId) {
      const serverCtx = getUserChartAndSky(userId, payload.dreamDate as string | undefined)
      if (serverCtx) {
        payload = {
          ...payload,
          chartData: serverCtx.chartData,
          natalContext: serverCtx.natalContext,
          skyContext: serverCtx.skyContext,
          transitAspectsText: serverCtx.transitAspectsText,
          transitSummary: '',
        }
      }
    }
  }

  try {
    const result = await handleGptRequest(type, payload)
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc -p tsconfig.server.json --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add server/routes/gpt.ts
git commit -m "feat(dream): enrich dream payload with server-side chart + sky context before GPT call"
```

---

### Task 8: Update GPT prompt in `server/services/gpt.ts`

**Files:**
- Modify: `server/services/gpt.ts`

Three targeted changes: remove the emphasis label from the Dreamscape Blueprint header, update the system prompt to instruct light-touch astrology, and update the user prompt ending.

- [ ] **Step 1: Remove "(emphasize these in interpretation)" from `buildDreamscapeContext`**

In `server/services/gpt.ts`, in the `buildDreamscapeContext` function (around line 146):

Replace:
```typescript
  let ctx = '## Dreamscape Natal Blueprint (emphasize these in interpretation)\n'
```

With:
```typescript
  let ctx = '## Dreamscape Natal Blueprint\n'
```

- [ ] **Step 2: Update the system prompt in `handleDreamInterpretation`**

Find the `content` field of the system message (around line 212). Replace:
```typescript
        content: `You are a mystical astrologer and dream interpreter. You read the unconscious mind through the lens of the cosmos — connecting dream symbols, emotions, and narratives with current planetary transits and the dreamer's natal chart.\n\nWhen interpreting:\n- Focus especially on the Dreamscape Blueprint — these are the placements most relevant to this person's dream life\n- Connect specific dream symbols to relevant planetary archetypes and active transits (Mars = conflict/drive, Neptune = dissolution/illusion/dreams, Moon = emotion/memory, Mercury = mind/communication, Saturn = limits/structure, etc.)\n- Reference the dreamer's natal placements to personalize the reading — show how the dream echoes their chart\n- Weave between psychological depth and cosmic synchronicity\n- Speak with poetic precision — evocative but grounded in actual astrological doctrine\n- Be specific about which planets and aspects are speaking through the dream imagery\n- Do not be generic — every interpretation must be personal to this chart and this transit moment`,
```

With:
```typescript
        content: `You are a dream interpreter who also knows astrology. Let the dream's imagery, emotions, and narrative lead completely.\n\nWhen interpreting:\n- Read the dream on its own terms first — its symbols, tensions, emotional texture, and story arc\n- Weave in natal placements or active transits ONLY where the connection is unmistakable: when a dream image or emotion clearly mirrors a specific planetary archetype or an active transit\n- Do not mention planets just to include astrology — if no astrological thread genuinely illuminates the dream, do not force one\n- The Dreamscape Blueprint is context for you to hold, not a checklist to complete\n- Be evocative, psychologically grounded, and specific to this dreamer's actual experience`,
```

- [ ] **Step 3: Update the user prompt ending in `handleDreamInterpretation`**

Find the closing instruction in the prompt string (around line 206). Replace:
```typescript
\n\nFocus your interpretation especially on the Dreamscape Blueprint above — these are the placements that most shape this person's dream life. Provide a deep, personalized dream interpretation that weaves together the dream's symbols with the active planetary energies. Connect specific dream elements to transit planets and natal placements. Be evocative, specific, and insightful — 4 to 6 paragraphs. Speak directly to the dreamer in second person.`
```

With:
```typescript
\n\nInterpret this dream's imagery and emotional truth directly. If a natal placement or active transit unmistakably illuminates something already present in the dream, bring it in — one or two precise connections, only where they genuinely deepen the reading. Let the dream lead. 4 to 6 paragraphs, spoken directly to the dreamer in second person.`
```

- [ ] **Step 4: Also remove the transitSummary section from the prompt string** 

In the same prompt string, replace:
```typescript
  const prompt = `${dreamscapeSection}## Dreamer's Natal Chart\n${payload.natalContext}\n\n## Today's Astrological Picture\n${payload.transitSummary}\n\n## Active Transit Aspects Today\n${payload.transitAspectsText}${skySection}\n\n## The Dream\n${payload.dreamDescription}\n\n`
```

With:
```typescript
  const transitSection = payload.transitAspectsText
    ? `\n\n## Active Transits at Time of Dream\n${payload.transitAspectsText}`
    : ''
  const prompt = `${dreamscapeSection}## Natal Chart\n${payload.natalContext}${transitSection}${skySection}\n\n## The Dream\n${payload.dreamDescription}\n\n`
```

Note: the prompt string in the actual code is one long template literal. Read the file carefully at lines 204-206 to get the exact string, then apply the above change.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc -p tsconfig.server.json --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add server/services/gpt.ts
git commit -m "feat(dream): update prompt to light-touch astrology — dream symbols lead, planets only when unmistakably connected"
```

---

### Task 9: Simplify `getDreamInterpretation` in `src/services/gptInterpretation.ts`

**Files:**
- Modify: `src/services/gptInterpretation.ts`

The client no longer needs to pass natal context, transit data, or sky context — the server computes all of it. The simplified function only sends the dream text and the date.

- [ ] **Step 1: Read the current `getDreamInterpretation` function**

Open `src/services/gptInterpretation.ts` and find `getDreamInterpretation`. It currently accepts 6 parameters: `dreamDescription`, `natalContext`, `transitSummary`, `transitAspectsText`, `skyContext?`, `chartData?`.

- [ ] **Step 2: Replace the function with the simplified version**

Replace the entire `getDreamInterpretation` function with:

```typescript
export async function getDreamInterpretation(
  dreamDescription: string,
  dreamDate?: string,
): Promise<string> {
  try {
    const result = await callProxy('dream-interpretation', {
      dreamDescription,
      dreamDate: dreamDate ?? null,
    })
    return (result as string) || 'Unable to generate dream interpretation.'
  } catch (err) {
    return err instanceof Error ? err.message : GPT_SERVER_ERROR
  }
}
```

- [ ] **Step 3: Remove now-unused imports from `gptInterpretation.ts`**

If `ChartData` or any transit/sky types were imported only for this function's old signature, remove those imports.

- [ ] **Step 4: Run TypeScript check on the frontend**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: Errors at `DreamModal.tsx` call sites (expected — will be fixed in Task 10). No errors in `gptInterpretation.ts` itself.

---

### Task 10: Simplify `handleInterpret` in `src/components/dream/DreamModal.tsx`

**Files:**
- Modify: `src/components/dream/DreamModal.tsx`

Remove all client-side sky context collection, the snapshot GPT call, the natal context builder call, and the transit aspects text builder. The new `handleInterpret` only sends the dream description and today's date.

- [ ] **Step 1: Read lines 205-270 of `DreamModal.tsx`**

Use the Read tool to view the full `handleInterpret` function before editing.

- [ ] **Step 2: Replace `handleInterpret` with the simplified version**

Replace everything from `const handleInterpret = async () => {` through the closing `}` of that function with:

```typescript
  const handleInterpret = async () => {
    const dream = dreamInput.trim()
    if (!dream) return

    setError(null)
    setStage('loading-dream')

    try {
      const dreamDate = new Date().toISOString().split('T')[0]
      const interpretation = await getDreamInterpretation(dream, dreamDate)

      const ctx = `## The Dream\n${dream}`
      setDreamContext(ctx)
      setMessages([{ role: 'assistant', content: interpretation }])
      setStage('chat')
      setTimeout(() => chatInputRef.current?.focus(), 100)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred')
      setStage('input')
    }
  }
```

- [ ] **Step 3: Remove now-unused imports from `DreamModal.tsx`**

Check which of these imports are no longer used after the simplification and remove them:
- `calculateCurrentPositions` (from engine/transits)
- `calculateTransitAspects` (from engine/transits)
- `getTopActiveTransits` (from engine/transits)
- `getMoonSignAndPhase` (from engine/astronomy)
- `getCurrentMoonPhase` (if it was only used in `buildDreamSnapshotPrompt`)
- `buildDreamSnapshotPrompt` (local function — if it's now unreferenced, delete it too)
- `getDailySnapshotInterpretation` (from gptInterpretation)

Also remove the `setSkyContext` call and the `capturedSkyCtx` variable if `skyContext` state is only used for session persistence — check if `skyContext` is still needed for the `DreamSession` saved to localStorage. If yes, keep the state but set it to `undefined` instead of computing it. If the session type requires `skyContext`, keep `setSkyContext(undefined)`.

- [ ] **Step 4: Handle `loading-sky` stage references**

Search for `'loading-sky'` in `DreamModal.tsx`. If any UI renders differently for this stage, either remove the branch (since we no longer set this stage) or merge it with `loading-dream`.

- [ ] **Step 5: Run TypeScript check**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/services/gptInterpretation.ts src/components/dream/DreamModal.tsx
git commit -m "feat(dream): simplify client — remove chart/sky collection, send only dream text + date"
```

---

### Task 11: Smoke test end-to-end

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Open the app in a browser and navigate to Dream Interpretation**

Confirm the modal opens.

- [ ] **Step 3: Submit a dream description**

Enter a short dream and submit. Observe:
- The modal goes directly to `loading-dream` (no `loading-sky` spinner)
- The interpretation returns
- The interpretation contains astrological references only if clearly relevant to the dream's imagery (not forced planet mentions)
- If the logged-in user has birth data set, the interpretation should reflect their natal chart

- [ ] **Step 4: Test with a user who has no birth data set**

The server's `getUserChartAndSky` returns `null` → payload falls back to client-provided values (which will be empty) → GPT produces pure symbolic interpretation. This is acceptable and expected.

- [ ] **Step 5: Verify server logs show no errors**

Check the server terminal for any unhandled exceptions during the dream interpretation call.

- [ ] **Step 6: Final commit if anything was adjusted during testing**

```bash
git add -p
git commit -m "fix(dream): address smoke test findings"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Birth data (lat/lng/tz) read from DB — `birth_place` JSON already has these fields
- ✅ Chart calculated server-side — Task 6 `getUserChartAndSky`
- ✅ Transits for dream date calculated server-side — Task 6
- ✅ Server injects data into payload — Task 7
- ✅ Prompt updated for light-touch astrology — Task 8
- ✅ Client simplified — Tasks 9 + 10
- ✅ Fallback when user has no birth data — `getUserChartAndSky` returns `null`, existing payload used

**Placeholder scan:** None found.

**Type consistency:** 
- `SkyContext` defined in `server/services/chartEngine.ts` matches the shape expected by `handleDreamInterpretation` in `server/services/gpt.ts`
- `ChartData` in `server/engine/types.ts` matches the shape used by `buildDreamscapeContext` in `server/services/gpt.ts` (server's local `ChartData` interface is a subset — verify compatibility in Task 7)

**Known compatibility note:** `server/services/gpt.ts` defines its own local `ChartData` interface (a subset with `planets`, `angles`, `unknownTime`). The full `ChartData` from `server/engine/types.ts` is a superset (adds `houses`, `houseSystem`). TypeScript structural typing means the full type is assignable to the subset — no changes needed.
