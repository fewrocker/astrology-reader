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

// Tight transit orbs (0.3x of natal orbs) — matches client transits.ts daily period scaling
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
