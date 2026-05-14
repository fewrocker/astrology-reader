# Dream Interpretation: Server-Side Chart Computation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the dream interpretation endpoint always produce astrological content by computing the natal chart and sky context server-side from stored birth data, instead of relying on the client to send them.

**Architecture:** The server already stores the full City JSON (including lat/lng/tz) in the `birth_place` column. We create a `server/engine/chartEngine.ts` that ports the pure-math chart calculation functions from `src/engine/`, then update the GPT dream handler to look up birth data from the DB and compute chart + sky context when they are absent from the request payload. We also update the GPT prompt so astrology is only invoked when unmistakably connected to the dream imagery.

**Tech Stack:** astronomy-engine (Node-compatible npm package already installed), better-sqlite3 (already used by server), TypeScript (tsconfig.server.json compiles `server/**/*` only — no src/ imports allowed)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `server/engine/chartEngine.ts` | **Create** | Server-side natal chart + sky context computation |
| `server/routes/gpt.ts` | **Modify** | Pass userId from res.locals to handleGptRequest |
| `server/services/gpt.ts` | **Modify** | Fallback chart/sky computation + prompt update |

---

## Task 1: Create `server/engine/chartEngine.ts`

This file ports the minimal astronomy calculation code from `src/engine/` (astronomy.ts, zodiac.ts, lunar.ts, transits.ts) to a self-contained server module. It cannot import from `src/` due to `tsconfig.server.json` restricting rootDir to `./server`.

**Files:**
- Create: `server/engine/chartEngine.ts`

- [ ] **Step 1: Write the file**

Create `/projects/astrology-reader/server/engine/chartEngine.ts` with this exact content:

```typescript
import * as Astronomy from 'astronomy-engine'

// ---------- Types ----------

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const
type ZodiacSign = typeof ZODIAC_SIGNS[number]

const PLANET_NAMES = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
] as const
type PlanetName = typeof PLANET_NAMES[number]

interface ZodiacPosition {
  longitude: number
  sign: ZodiacSign
  signIndex: number
  degree: number
  minute: number
}

interface PlanetPosition extends ZodiacPosition {
  name: PlanetName | 'NorthNode'
  retrograde: boolean
  house: number
}

interface HouseCusp extends ZodiacPosition {
  house: number
}

interface ChartAngles {
  ascendant: ZodiacPosition
  midheaven: ZodiacPosition
  descendant: ZodiacPosition
  imumCoeli: ZodiacPosition
}

export interface ServerChartData {
  planets: PlanetPosition[]
  houses: HouseCusp[]
  angles: ChartAngles
  unknownTime: boolean
  houseSystem: 'placidus' | 'whole-sign'
}

export interface MoonInfo {
  sign: ZodiacSign
  phase: string
}

export interface TransitAspectBrief {
  transitPlanet: string
  natalPlanet: string
  orb: number
  symbol: string
}

// ---------- Utilities ----------

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

// Tight transit orbs (0.3x of natal orbs) — same scaling as client transits.ts daily period
const ASPECT_DEFS = [
  { angle: 0,   orb: 2.4, symbol: '☌', name: 'conjunction'  },
  { angle: 60,  orb: 1.8, symbol: '⚹', name: 'sextile'      },
  { angle: 90,  orb: 2.4, symbol: '□', name: 'square'       },
  { angle: 120, orb: 2.4, symbol: '△', name: 'trine'        },
  { angle: 180, orb: 2.4, symbol: '☍', name: 'opposition'   },
]

function normalizeAngle(a: number): number {
  return ((a % 360) + 360) % 360
}

function longitudeToZodiac(lon: number): ZodiacPosition {
  const norm = ((lon % 360) + 360) % 360
  const signIndex = Math.floor(norm / 30)
  const degInSign = norm - signIndex * 30
  const degree = Math.floor(degInSign)
  const minute = Math.floor((degInSign - degree) * 60)
  return { longitude: norm, sign: ZODIAC_SIGNS[signIndex], signIndex, degree, minute }
}

export function resolveToUTC(
  year: number, month: number, day: number,
  hour: number, minute: number, timezone: string,
): Date {
  const pad = (n: number) => String(n).padStart(2, '0')
  const isoStr = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00`
  const estimate = new Date(`${isoStr}Z`)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(estimate)
  const getPart = (type: string) =>
    parseInt(parts.find(p => p.type === type)?.value ?? '0', 10)
  const localAtEstimate = new Date(Date.UTC(
    getPart('year'),
    getPart('month') - 1,
    getPart('day'),
    getPart('hour') === 24 ? 0 : getPart('hour'),
    getPart('minute'),
    getPart('second'),
  ))
  const offsetMs = localAtEstimate.getTime() - estimate.getTime()
  return new Date(estimate.getTime() - offsetMs)
}

// ---------- Planet position helpers ----------

function getPlanetLongitude(body: Astronomy.Body, time: Astronomy.AstroTime): number {
  if (body === Astronomy.Body.Sun) return Astronomy.SunPosition(time).elon
  if (body === Astronomy.Body.Moon) return Astronomy.EclipticGeoMoon(time).lon
  return Astronomy.Ecliptic(Astronomy.GeoVector(body, time, true)).elon
}

function isRetrograde(body: Astronomy.Body, time: Astronomy.AstroTime): boolean {
  if (body === Astronomy.Body.Sun || body === Astronomy.Body.Moon) return false
  const lon1 = getPlanetLongitude(body, time)
  const t2 = Astronomy.MakeTime(new Date(time.date.getTime() + 86400000))
  const lon2 = getPlanetLongitude(body, t2)
  let diff = lon2 - lon1
  if (diff > 180) diff -= 360
  if (diff < -180) diff += 360
  return diff < 0
}

function getMeanNodeLongitude(time: Astronomy.AstroTime): number {
  const T = time.tt / 36525
  return normalizeAngle(
    125.0445479
    - 1934.1362891 * T
    + 0.0020754 * T * T
    + T * T * T / 467441
    - T * T * T * T / 60616000,
  )
}

function getDailyMotion(body: Astronomy.Body, time: Astronomy.AstroTime): number {
  const lon1 = getPlanetLongitude(body, time)
  const t2 = Astronomy.MakeTime(new Date(time.date.getTime() + 86400000))
  const lon2 = getPlanetLongitude(body, t2)
  let diff = lon2 - lon1
  if (diff > 180) diff -= 360
  if (diff < -180) diff += 360
  return diff
}

// ---------- House calculation ----------

function localSiderealTime(time: Astronomy.AstroTime, lngDeg: number): number {
  const gst = Astronomy.SiderealTime(time)
  return normalizeAngle((gst + lngDeg / 15) * 15)
}

function calculateAscendant(lstDeg: number, latDeg: number, oblDeg: number): number {
  const lst = lstDeg * Astronomy.DEG2RAD
  const lat = latDeg * Astronomy.DEG2RAD
  const obl = oblDeg * Astronomy.DEG2RAD
  const y = Math.cos(lst)
  const x = -(Math.sin(lst) * Math.cos(obl) + Math.tan(lat) * Math.sin(obl))
  return normalizeAngle(Math.atan2(y, x) * Astronomy.RAD2DEG)
}

function calculateMidheaven(lstDeg: number, oblDeg: number): number {
  const lst = lstDeg * Astronomy.DEG2RAD
  const obl = oblDeg * Astronomy.DEG2RAD
  return normalizeAngle(Math.atan2(Math.sin(lst), Math.cos(lst) * Math.cos(obl)) * Astronomy.RAD2DEG)
}

function calculateWholeSignHouses(asc: number): number[] {
  const start = Math.floor(asc / 30) * 30
  return Array.from({ length: 12 }, (_, i) => normalizeAngle(start + i * 30))
}

function ascensionFromLongitude(lonDeg: number, oblRad: number): number {
  const lonRad = lonDeg * Astronomy.DEG2RAD
  return normalizeAngle(
    Math.atan2(Math.sin(lonRad) * Math.cos(oblRad), Math.cos(lonRad)) * Astronomy.RAD2DEG,
  )
}

function eclipticLongFromRA(raRad: number, oblRad: number): number {
  return normalizeAngle(
    Math.atan2(Math.sin(raRad), Math.cos(raRad) * Math.cos(oblRad)) * Astronomy.RAD2DEG,
  )
}

function placidusCusp(
  ramcDeg: number,
  latRad: number,
  oblRad: number,
  fraction: number,
  aboveHorizon: boolean,
): number | null {
  let targetRA = normalizeAngle(ramcDeg + (aboveHorizon ? fraction * 90 : 180 + fraction * 90))
  for (let i = 0; i < 50; i++) {
    const lon = eclipticLongFromRA(targetRA * Astronomy.DEG2RAD, oblRad)
    const decl = Math.asin(Math.sin(oblRad) * Math.sin(lon * Astronomy.DEG2RAD))
    const ad = Math.asin(Math.tan(latRad) * Math.tan(decl))
    if (!isFinite(ad)) return null
    const adDeg = ad * Astronomy.RAD2DEG
    const newRA = aboveHorizon
      ? ramcDeg + fraction * (90 + adDeg)
      : ramcDeg + 180 + fraction * (90 - adDeg)
    let diff = newRA - targetRA
    if (diff > 180) diff -= 360
    if (diff < -180) diff += 360
    if (Math.abs(diff) < 0.001) break
    targetRA = normalizeAngle(newRA)
  }
  return eclipticLongFromRA(targetRA * Astronomy.DEG2RAD, oblRad)
}

function calculatePlacidusHouses(
  asc: number, mc: number, latDeg: number, oblDeg: number,
): { cusps: number[]; system: 'placidus' | 'whole-sign' } {
  const cusps: number[] = new Array(12)
  cusps[0] = asc
  cusps[9] = mc
  cusps[6] = normalizeAngle(asc + 180)
  cusps[3] = normalizeAngle(mc + 180)

  const latRad = latDeg * Astronomy.DEG2RAD
  const oblRad = oblDeg * Astronomy.DEG2RAD
  const ramc = ascensionFromLongitude(mc, oblRad)

  let ok = true
  for (const [idx, frac, above] of [
    [10, 1 / 3, true], [11, 2 / 3, true],
    [1, 1 / 3, false], [2, 2 / 3, false],
  ] as [number, number, boolean][]) {
    const r = placidusCusp(ramc, latRad, oblRad, frac, above)
    if (r === null) { ok = false; break }
    cusps[idx] = r
  }
  if (!ok) return { cusps: calculateWholeSignHouses(asc), system: 'whole-sign' }

  cusps[4] = normalizeAngle(cusps[10] + 180)
  cusps[5] = normalizeAngle(cusps[11] + 180)
  cusps[7] = normalizeAngle(cusps[1] + 180)
  cusps[8] = normalizeAngle(cusps[2] + 180)
  return { cusps, system: 'placidus' }
}

function getHouseForLongitude(longitude: number, cusps: number[]): number {
  for (let i = 0; i < 12; i++) {
    const start = cusps[i]
    const end = cusps[(i + 1) % 12]
    if (start < end ? longitude >= start && longitude < end : longitude >= start || longitude < end) {
      return i + 1
    }
  }
  return 1
}

// ---------- Main chart calculation ----------

export function calculateChart(
  dateStr: string,
  timeStr: string,
  lat: number,
  lng: number,
  timezone: string,
  unknownTime: boolean,
): ServerChartData {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, minute] = (timeStr ?? '12:00').split(':').map(Number)
  const utcDate = resolveToUTC(year, month, day, hour, minute, timezone)
  const time = Astronomy.MakeTime(utcDate)

  const planets: PlanetPosition[] = []
  for (const name of PLANET_NAMES) {
    const body = BODY_MAP[name]
    const z = longitudeToZodiac(getPlanetLongitude(body, time))
    planets.push({ ...z, name, retrograde: isRetrograde(body, time), house: 0 })
  }
  const nodeLon = getMeanNodeLongitude(time)
  planets.push({ ...longitudeToZodiac(nodeLon), name: 'NorthNode', retrograde: true, house: 0 })

  const lst = localSiderealTime(time, lng)
  const obliquity = Astronomy.e_tilt(time).mobl
  const ascLon = calculateAscendant(lst, lat, obliquity)
  const mcLon = calculateMidheaven(lst, obliquity)
  const { cusps, system } = calculatePlacidusHouses(ascLon, mcLon, lat, obliquity)

  for (const p of planets) p.house = getHouseForLongitude(p.longitude, cusps)

  const houses: HouseCusp[] = cusps.map((lon, i) => ({ ...longitudeToZodiac(lon), house: i + 1 }))
  const angles: ChartAngles = {
    ascendant: longitudeToZodiac(ascLon),
    midheaven: longitudeToZodiac(mcLon),
    descendant: longitudeToZodiac(normalizeAngle(ascLon + 180)),
    imumCoeli: longitudeToZodiac(normalizeAngle(mcLon + 180)),
  }
  return { planets, houses, angles, unknownTime, houseSystem: system }
}

// ---------- Sky context ----------

function phaseAngleToName(angle: number): string {
  if (angle < 22.5 || angle >= 337.5) return 'New Moon'
  if (angle < 67.5) return 'Waxing Crescent'
  if (angle < 112.5) return 'First Quarter'
  if (angle < 157.5) return 'Waxing Gibbous'
  if (angle < 202.5) return 'Full Moon'
  if (angle < 247.5) return 'Waning Gibbous'
  if (angle < 292.5) return 'Last Quarter'
  return 'Waning Crescent'
}

export function getMoonInfo(date: Date): MoonInfo {
  const time = Astronomy.MakeTime(date)
  const moonLon = Astronomy.EclipticGeoMoon(time).lon
  const sunLon = Astronomy.SunPosition(time).elon
  const angle = normalizeAngle(moonLon - sunLon)
  return {
    sign: longitudeToZodiac(moonLon).sign,
    phase: phaseAngleToName(angle),
  }
}

export function getActiveTransitAspects(
  natalPlanets: { name: string; longitude: number }[],
  date: Date,
  maxOrb: number,
  maxCount: number,
): TransitAspectBrief[] {
  const time = Astronomy.MakeTime(date)

  const transitPositions: { name: string; longitude: number }[] = []
  for (const name of PLANET_NAMES) {
    const body = BODY_MAP[name]
    transitPositions.push({ name, longitude: getPlanetLongitude(body, time) })
  }
  transitPositions.push({ name: 'NorthNode', longitude: getMeanNodeLongitude(time) })

  const aspects: TransitAspectBrief[] = []
  for (const tp of transitPositions) {
    for (const np of natalPlanets) {
      const rawAngle = Math.abs(tp.longitude - np.longitude)
      const angle = rawAngle > 180 ? 360 - rawAngle : rawAngle
      for (const def of ASPECT_DEFS) {
        const orb = Math.abs(angle - def.angle)
        if (orb <= Math.min(def.orb, maxOrb)) {
          aspects.push({
            transitPlanet: tp.name,
            natalPlanet: np.name,
            orb: Math.round(orb * 100) / 100,
            symbol: def.symbol,
          })
        }
      }
    }
  }
  return aspects.sort((a, b) => a.orb - b.orb).slice(0, maxCount)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc -p tsconfig.server.json --noEmit 2>&1 | head -40`

Expected: No errors. If you see "astronomy-engine: no exported member" errors, check the import style matches what's in `src/engine/astronomy.ts` (which works).

- [ ] **Step 3: Commit**

```bash
git add server/engine/chartEngine.ts
git commit -m "feat(dream): add server-side chart + sky context engine

Ports minimal astronomy calculation from src/engine/ to a self-contained
server module so the dream interpretation endpoint can compute natal charts
and sky context without relying on client-provided data."
```

---

## Task 2: Update `server/routes/gpt.ts` to pass userId

The route already has `res.locals.userId` (set by gptRateLimit middleware). Pass it through to `handleGptRequest` so the dream handler can look up birth data.

**Files:**
- Modify: `server/routes/gpt.ts:42`

- [ ] **Step 1: Update the handleGptRequest call**

In `server/routes/gpt.ts`, find the line:
```typescript
    const result = await handleGptRequest(type, payload)
```

Replace with:
```typescript
    const userId = res.locals.userId as number | undefined
    const result = await handleGptRequest(type, payload, userId)
```

- [ ] **Step 2: Verify file looks correct**

Run: `npx tsc -p tsconfig.server.json --noEmit 2>&1 | head -20`

Expected: One error — `handleGptRequest` signature not yet updated (will fix in Task 3). That's fine for now; if there are unrelated errors, investigate.

- [ ] **Step 3: Commit**

```bash
git add server/routes/gpt.ts
git commit -m "feat(dream): thread userId through to GPT service for chart fallback"
```

---

## Task 3: Update `server/services/gpt.ts` — server-side chart computation + prompt

This is the main logic change. The dream handler will:
1. Accept an optional `userId` parameter
2. When `chartData` is null and userId is available: load birth data from DB, compute natal chart, rebuild natalContext
3. When `skyContext` is null but chart is available: compute moon info + top transit aspects
4. Update the prompt instruction to prioritize symbolic analysis with astrology only when unmistakably connected

**Files:**
- Modify: `server/services/gpt.ts`

- [ ] **Step 1: Add imports at the top of `server/services/gpt.ts`**

After the existing `import OpenAI from 'openai'` line, add:

```typescript
import { getDb } from '../db.js'
import { calculateChart, getMoonInfo, getActiveTransitAspects } from '../engine/chartEngine.js'
import type { ServerChartData } from '../engine/chartEngine.js'
```

- [ ] **Step 2: Update `handleGptRequest` signature**

Find the `handleGptRequest` export function. Its current signature is:
```typescript
export async function handleGptRequest(type: string, payload: Record<string, unknown>): Promise<unknown> {
```

Replace with:
```typescript
export async function handleGptRequest(type: string, payload: Record<string, unknown>, userId?: number): Promise<unknown> {
```

- [ ] **Step 3: Thread userId into the dream-interpretation case**

Inside `handleGptRequest`, find the switch/if block that routes to `handleDreamInterpretation`. It currently looks like:

```typescript
  if (type === 'dream-interpretation') {
    return handleDreamInterpretation(payload as { ... })
  }
```

Update it to pass userId:

```typescript
  if (type === 'dream-interpretation') {
    return handleDreamInterpretation(payload as {
      dreamDescription: string
      natalContext: string
      transitSummary: string
      transitAspectsText: string
      skyContext: { moonSign: string; moonPhase: string; transits?: Array<{ transitPlanet: string; aspect: string; natalPlanet: string; orb: number }> } | null
      chartData: ChartData | null
    }, userId)
  }
```

Note: look at the actual routing in the file (it may be if/else or a switch) and adjust accordingly.

- [ ] **Step 4: Add `buildNatalContextFromChart` helper**

Just above `handleDreamInterpretation`, add this helper function:

```typescript
function buildNatalContextFromChart(chart: ServerChartData, birthDate: string): string {
  let ctx = `Born: ${birthDate}\n`
  for (const p of chart.planets) {
    ctx += `${p.name}: ${p.sign} ${p.degree}°${p.minute}'`
    if (!chart.unknownTime && p.house > 0) ctx += ` (House ${p.house})`
    if (p.retrograde) ctx += ' [Rx]'
    ctx += '\n'
  }
  ctx += `Ascendant: ${chart.angles.ascendant.sign} ${chart.angles.ascendant.degree}°\n`
  ctx += `Midheaven: ${chart.angles.midheaven.sign} ${chart.angles.midheaven.degree}°\n`
  return ctx
}
```

- [ ] **Step 5: Update `handleDreamInterpretation` — accept userId, compute chart + sky fallbacks, update prompt**

Replace the entire `handleDreamInterpretation` function with:

```typescript
async function handleDreamInterpretation(payload: {
  dreamDescription: string
  natalContext: string
  transitSummary: string
  transitAspectsText: string
  skyContext: { moonSign: string; moonPhase: string; transits?: Array<{ transitPlanet: string; aspect: string; natalPlanet: string; orb: number }> } | null
  chartData: ChartData | null
}, userId?: number): Promise<string> {
  // --- Chart fallback: compute server-side if client didn't send it ---
  let chart: ChartData | ServerChartData | null = payload.chartData
  let natalCtx = payload.natalContext

  if (!chart && userId) {
    try {
      const db = getDb()
      const row = db
        .prepare('SELECT birth_date, birth_time, birth_place FROM users WHERE id = ?')
        .get(userId) as { birth_date: string | null; birth_time: string | null; birth_place: string | null } | undefined

      if (row?.birth_date && row.birth_place) {
        const place = JSON.parse(row.birth_place) as { lat?: number; lng?: number; tz?: string }
        if (typeof place.lat === 'number' && typeof place.lng === 'number' && place.tz) {
          const computed = calculateChart(
            row.birth_date,
            row.birth_time ?? '12:00',
            place.lat,
            place.lng,
            place.tz,
            !row.birth_time,
          )
          chart = computed
          natalCtx = buildNatalContextFromChart(computed, row.birth_date)
        }
      }
    } catch {
      // Non-fatal — proceed without chart if DB lookup fails
    }
  }

  // --- Sky context fallback: compute server-side if client didn't send it ---
  let skySection = ''
  if (payload.skyContext) {
    const transitLine = payload.skyContext.transits && payload.skyContext.transits.length > 0
      ? ' Active transits: ' + payload.skyContext.transits.map(t =>
          `${t.transitPlanet} ${t.aspect} natal ${t.natalPlanet} (${t.orb}° orb)`
        ).join(', ') + '.'
      : ''
    skySection = `\n\n## Sky Context at Time of Recording\nMoon in ${payload.skyContext.moonSign} (${payload.skyContext.moonPhase}).${transitLine}`
  } else if (chart) {
    try {
      const now = new Date()
      const moonInfo = getMoonInfo(now)
      const topTransits = getActiveTransitAspects(chart.planets, now, 2, 3)
      const transitLine = topTransits.length > 0
        ? ' Active transits: ' + topTransits.map(t =>
            `${t.transitPlanet} ${t.symbol} natal ${t.natalPlanet} (${t.orb}° orb)`
          ).join(', ') + '.'
        : ''
      skySection = `\n\n## Sky Context at Time of Recording\nMoon in ${moonInfo.sign} (${moonInfo.phase}).${transitLine}`
    } catch {
      // Non-fatal
    }
  }

  // --- Dreamscape Blueprint (natal dream placements) ---
  const dreamscapeSection = chart ? buildDreamscapeContext(chart as ChartData) + '\n' : ''

  // --- Prompt ---
  const prompt = `${dreamscapeSection}## Dreamer's Natal Chart\n${natalCtx}\n\n## Today's Astrological Picture\n${payload.transitSummary}\n\n## Active Transit Aspects Today\n${payload.transitAspectsText}${skySection}\n\n## The Dream\n${payload.dreamDescription}\n\nThe symbolic and emotional core of the dream is primary — explore the imagery, narrative, and feeling tone with depth and precision. If a natal placement or active transit directly and unmistakably illuminates a specific dream element, bring it in briefly and precisely. Do not scatter planet names throughout for their own sake. Astrology is a lens, not a mandate — use it surgically when the connection is undeniable. Be evocative, specific, and personal — 4 to 6 paragraphs in second person.`

  const result = await retryWithBackoff(() =>
    callOpenAI([
      {
        role: 'system',
        content: `You are a mystical astrologer and dream interpreter. You read the unconscious mind through the lens of the cosmos — connecting dream symbols, emotions, and narratives with current planetary transits and the dreamer's natal chart.\n\nWhen interpreting:\n- Explore the emotional and symbolic core of the dream first — this is the foundation\n- Only invoke astrology when the connection to a specific dream symbol is direct and unmistakable (e.g. Neptune prominent when the dream themes dissolution/illusion, Mars active when the dream is charged with conflict/will)\n- When you do reference astrology, be precise and specific — one clear astrological connection is worth more than five vague ones\n- Speak with psychological depth, poetic precision, and personal specificity\n- Address the dreamer directly in second person\n- Do not force planetary references or name planets for their own sake`,
      },
      { role: 'user', content: prompt },
    ], { temperature: 0.85, max_tokens: 1200 })
  )
  return result || 'Unable to generate dream interpretation.'
}
```

**Critical notes:**
- The `buildDreamscapeContext` function already exists in `server/services/gpt.ts` (around line 130). Do NOT remove or duplicate it.
- The cast `chart as ChartData` is safe because `ServerChartData` and the local `ChartData` interface have the same shape for what `buildDreamscapeContext` needs (planets with name/sign/house, angles.ascendant.sign, unknownTime).
- The `retryWithBackoff` and `callOpenAI` functions are already defined in the file — use them as-is.

- [ ] **Step 6: Verify TypeScript compiles cleanly**

Run: `npx tsc -p tsconfig.server.json --noEmit 2>&1`

Expected: No errors. If you see type mismatches on `chart as ChartData`, verify that `ServerChartData` exported from chartEngine.ts has compatible planet/angles shape with the local `ChartData` interface in gpt.ts. You can widen the cast to `chart as unknown as ChartData` if needed — the runtime shapes are identical.

- [ ] **Step 7: Run the dev server briefly to confirm it starts**

Run: `npm run dev 2>&1 | head -20` (Ctrl+C after seeing "server started" or similar)

Expected: Server starts without import errors. The dream interpretation endpoint is not interactive-testable here, but a clean start confirms no module resolution failures.

- [ ] **Step 8: Commit**

```bash
git add server/services/gpt.ts
git commit -m "feat(dream): server-side chart + sky context fallback; sharper prompt

- When chartData is absent from the request, the server now looks up stored
  birth data (birth_place JSON already contains lat/lng/tz) and computes
  the natal chart using astronomy-engine via the new chartEngine module
- When skyContext is absent but a chart is available, the server computes
  moon sign/phase and top-3 tight transit aspects for the current moment
- Updated the dream prompt: symbolic analysis is primary, astrology is used
  surgically only when the connection to the dream imagery is unmistakable"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Server computes natal chart when chartData is absent — Task 3, Step 5 (DB lookup + calculateChart)
- ✅ Server computes sky context when skyContext is absent — Task 3, Step 5 (getMoonInfo + getActiveTransitAspects)
- ✅ birth_place JSON already contains lat/lng/tz — no DB schema changes needed (confirmed in profile.ts: `JSON.stringify(birthPlace)` where birthPlace is a City object with lat/lng/tz)
- ✅ Prompt updated to prioritize symbolic analysis — Task 3, Step 5 (user + system prompt both updated)
- ✅ No DB migration required — birth_place already stores the full City JSON including coordinates

**Placeholder scan:** No TBDs or handwaving. All code is complete.

**Type consistency:**
- `ServerChartData` exported from chartEngine.ts has `planets: PlanetPosition[]` with name/sign/house/degree/retrograde — matches what `buildDreamscapeContext` reads in gpt.ts
- `MoonInfo` returned by `getMoonInfo` has `sign` and `phase` fields — used correctly in skySection construction
- `TransitAspectBrief` has `transitPlanet`, `natalPlanet`, `orb`, `symbol` — used correctly in the transit line
- `resolveToUTC` exported but not actually used externally — safe to export, unused export is not an error
