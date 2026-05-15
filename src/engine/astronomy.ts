import * as Astronomy from 'astronomy-engine'
import { longitudeToZodiac, normalizeAngle } from './zodiac'
import {
  PLANET_NAMES,
  type PlanetPosition,
  type PlanetName,
  type HouseCusp,
  type ChartAngles,
  type ChartData,
} from './types'
import { getPlanetLongitude, getMeanNodeLongitude, getHouseForLongitude } from './ephemeris'

/** Map our planet names to astronomy-engine Body enum */
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

/**
 * Check if a planet is retrograde by comparing longitude 1 day later.
 */
function isRetrograde(body: Astronomy.Body, time: Astronomy.AstroTime): boolean {
  // Sun and Moon never retrograde
  if (body === Astronomy.Body.Sun || body === Astronomy.Body.Moon) return false

  const lon1 = getPlanetLongitude(body, time)
  const timePlus = Astronomy.MakeTime(new Date(time.date.getTime() + 86400000))
  const lon2 = getPlanetLongitude(body, timePlus)

  // Account for wrap-around at 360°
  let diff = lon2 - lon1
  if (diff > 180) diff -= 360
  if (diff < -180) diff += 360

  return diff < 0
}

/**
 * Calculate Local Sidereal Time in degrees.
 */
function localSiderealTime(time: Astronomy.AstroTime, lngDeg: number): number {
  const gst = Astronomy.SiderealTime(time) // hours
  const lst = gst + lngDeg / 15 // convert longitude to hours
  return normalizeAngle(lst * 15) // convert back to degrees
}

/**
 * Calculate the Ascendant from LST and latitude.
 */
function calculateAscendant(lstDeg: number, latDeg: number, oblDeg: number): number {
  const lstRad = lstDeg * Astronomy.DEG2RAD
  const latRad = latDeg * Astronomy.DEG2RAD
  const oblRad = oblDeg * Astronomy.DEG2RAD

  const y = Math.cos(lstRad)
  const x = -(Math.sin(lstRad) * Math.cos(oblRad) + Math.tan(latRad) * Math.sin(oblRad))

  let asc = Math.atan2(y, x) * Astronomy.RAD2DEG
  return normalizeAngle(asc)
}

/**
 * Calculate the Midheaven (MC) from LST.
 */
function calculateMidheaven(lstDeg: number, oblDeg: number): number {
  const lstRad = lstDeg * Astronomy.DEG2RAD
  const oblRad = oblDeg * Astronomy.DEG2RAD

  let mc = Math.atan2(Math.sin(lstRad), Math.cos(lstRad) * Math.cos(oblRad)) * Astronomy.RAD2DEG
  return normalizeAngle(mc)
}

/**
 * Calculate Whole Sign house cusps.
 * House 1 starts at 0° of the Ascendant's sign; each subsequent house is the next whole sign.
 */
function calculateWholeSignHouses(asc: number): number[] {
  const ascSignStart = Math.floor(asc / 30) * 30
  return Array.from({ length: 12 }, (_, i) => normalizeAngle(ascSignStart + i * 30))
}

/**
 * Calculate Placidus house cusps.
 * Houses 1 (ASC) and 10 (MC) are exact. Others are interpolated.
 * Returns the cusp array and whether Placidus succeeded or fell back to Whole Sign.
 */
function calculatePlacidusHouses(
  asc: number,
  mc: number,
  latDeg: number,
  oblDeg: number
): { cusps: number[]; system: 'placidus' | 'whole-sign' } {
  const cusps: number[] = new Array(12)
  cusps[0] = asc           // 1st house = ASC
  cusps[9] = mc            // 10th house = MC
  cusps[6] = normalizeAngle(asc + 180)  // 7th house = DSC
  cusps[3] = normalizeAngle(mc + 180)   // 4th house = IC

  const latRad = latDeg * Astronomy.DEG2RAD
  const oblRad = oblDeg * Astronomy.DEG2RAD

  // Placidus intermediate house cusps
  // Houses 11, 12 (between MC and ASC)
  // Houses 2, 3 (between ASC and IC going clockwise)
  const ramc = ascensionFromLongitude(mc, oblRad)

  // Semi-arc method for Placidus — each may return null at high latitudes
  let placidusOk = true
  for (const [houseIndex, fraction] of [[10, 1 / 3], [11, 2 / 3], [1, 1 / 3], [2, 2 / 3]] as [number, number][]) {
    const result = placidusCusp(ramc, latRad, oblRad, fraction, houseIndex >= 10)
    if (result === null) {
      placidusOk = false
      break
    }
    cusps[houseIndex] = result
  }

  // Fall back to Whole Sign houses when Placidus fails (e.g. latitudes above ~60°N)
  if (!placidusOk) {
    return { cusps: calculateWholeSignHouses(asc), system: 'whole-sign' }
  }

  // Opposite houses
  cusps[4] = normalizeAngle(cusps[10] + 180)  // 5th opposite 11th
  cusps[5] = normalizeAngle(cusps[11] + 180)  // 6th opposite 12th
  cusps[7] = normalizeAngle(cusps[1] + 180)   // 8th opposite 2nd
  cusps[8] = normalizeAngle(cusps[2] + 180)   // 9th opposite 3rd

  return { cusps, system: 'placidus' }
}

function ascensionFromLongitude(lonDeg: number, oblRad: number): number {
  const lonRad = lonDeg * Astronomy.DEG2RAD
  let ra = Math.atan2(Math.sin(lonRad) * Math.cos(oblRad), Math.cos(lonRad))
  return normalizeAngle(ra * Astronomy.RAD2DEG)
}

function placidusCusp(
  ramcDeg: number,
  latRad: number,
  oblRad: number,
  fraction: number,
  aboveHorizon: boolean
): number | null {
  // Placidus cusps divide semi-arcs into thirds.
  // Diurnal semi-arc (above horizon): SA = 90° + AD
  // Nocturnal semi-arc (below horizon): SA = 90° - AD
  // We iterate because AD depends on the cusp's ecliptic longitude.

  // Initial guess: equal-arc approximation
  let targetRA = ramcDeg + (aboveHorizon ? fraction * 90 : 180 + fraction * 90)
  targetRA = normalizeAngle(targetRA)

  for (let i = 0; i < 50; i++) {
    const lon = eclipticLongFromRA(targetRA * Astronomy.DEG2RAD, oblRad)
    const decl = Math.asin(Math.sin(oblRad) * Math.sin(lon * Astronomy.DEG2RAD))
    const ad = Math.asin(Math.tan(latRad) * Math.tan(decl))

    if (!isFinite(ad)) return null // polar regions — Placidus undefined at this latitude

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

function eclipticLongFromRA(raRad: number, oblRad: number): number {
  // Convert right ascension to ecliptic longitude for a point on the ecliptic (β=0).
  // From α = atan2(sin(λ)cos(ε), cos(λ)), the inverse is:
  const lon = Math.atan2(Math.sin(raRad), Math.cos(raRad) * Math.cos(oblRad))
  return normalizeAngle(lon * Astronomy.RAD2DEG)
}

/**
 * Main function: calculate the full natal chart.
 */
export function calculateChart(
  dateStr: string,
  timeStr: string,
  lat: number,
  lng: number,
  timezone: string,
  unknownTime: boolean
): ChartData {
  // Build the birth date/time in the specified timezone
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, minute] = timeStr.split(':').map(Number)

  // Use Intl to resolve the UTC offset at the birth date/time
  const utcDate = resolveToUTC(year, month, day, hour, minute, timezone)
  const time = Astronomy.MakeTime(utcDate)

  // Calculate planet positions
  const planets: PlanetPosition[] = []

  for (const name of PLANET_NAMES) {
    const body = BODY_MAP[name]
    const lon = getPlanetLongitude(body, time)
    const zodiac = longitudeToZodiac(lon)
    const retro = isRetrograde(body, time)

    planets.push({
      ...zodiac,
      name,
      retrograde: retro,
      house: 0, // assigned after house calculation
    })
  }

  // North Node
  const nodeLon = getMeanNodeLongitude(time)
  const nodeZodiac = longitudeToZodiac(nodeLon)
  planets.push({
    ...nodeZodiac,
    name: 'NorthNode',
    retrograde: true, // North Node is always retrograde in mean motion
    house: 0,
  })

  // Calculate LST, ASC, MC with dynamic obliquity
  const lst = localSiderealTime(time, lng)
  const obliquity = Astronomy.e_tilt(time).mobl
  const ascLon = calculateAscendant(lst, lat, obliquity)
  const mcLon = calculateMidheaven(lst, obliquity)
  const dscLon = normalizeAngle(ascLon + 180)
  const icLon = normalizeAngle(mcLon + 180)

  // Calculate Placidus house cusps (falls back to Whole Sign at high latitudes)
  const { cusps: cuspLongitudes, system: houseSystem } = calculatePlacidusHouses(ascLon, mcLon, lat, obliquity)

  // Assign houses to planets
  for (const planet of planets) {
    planet.house = getHouseForLongitude(planet.longitude, cuspLongitudes)
  }

  // Build house cusp data
  const houses: HouseCusp[] = cuspLongitudes.map((lon, i) => {
    const z = longitudeToZodiac(lon)
    return {
      house: i + 1,
      longitude: lon,
      sign: z.sign,
      degree: z.degree,
      minute: z.minute,
    }
  })

  const angles: ChartAngles = {
    ascendant: longitudeToZodiac(ascLon),
    midheaven: longitudeToZodiac(mcLon),
    descendant: longitudeToZodiac(dscLon),
    imumCoeli: longitudeToZodiac(icLon),
  }

  return { planets, houses, angles, unknownTime, houseSystem }
}

/**
 * Find the exact UTC moment when the Sun returns to natalSunLongitude in targetYear.
 * Uses bisection search, accurate to ~1 minute.
 * The solar return moment is calculated for geographic birthplace coordinates (traditional).
 */
export function findSolarReturn(
  natalSunLongitude: number,
  targetYear: number,
  _birthLat: number,
  _birthLng: number
): Date {
  // Start search 2 days before and after the approximate birthday in targetYear
  // The Sun's longitude matches natal ~once per year, around birthday month/day
  // We use Jan 1 of targetYear as start, Dec 31 as end for safety
  const searchStart = new Date(Date.UTC(targetYear, 0, 1))
  const searchEnd = new Date(Date.UTC(targetYear, 11, 31))

  // Scan daily to find the window where Sun crosses natalSunLongitude
  const dayMs = 86400000
  const days = Math.ceil((searchEnd.getTime() - searchStart.getTime()) / dayMs)

  // Angular difference: how far current Sun is from natal Sun longitude
  // We want this to cross zero (modulo 360)
  function sunDiff(date: Date): number {
    const t = Astronomy.MakeTime(date)
    const lon = Astronomy.SunPosition(t).elon
    // Normalized difference in range (-180, 180]
    let diff = lon - natalSunLongitude
    if (diff > 180) diff -= 360
    if (diff < -180) diff += 360
    return diff
  }

  let crossStart: Date | null = null
  let crossEnd: Date | null = null
  let prevDiff = sunDiff(searchStart)

  for (let i = 1; i <= days; i++) {
    const d = new Date(searchStart.getTime() + i * dayMs)
    const diff = sunDiff(d)

    // Detect zero-crossing (Sun passes through natalSunLongitude)
    if ((prevDiff < 0 && diff >= 0) || (prevDiff >= 0 && diff < 0)) {
      crossStart = new Date(searchStart.getTime() + (i - 1) * dayMs)
      crossEnd = d
      break
    }
    prevDiff = diff
  }

  if (!crossStart || !crossEnd) {
    // Fallback: return approximate date
    return new Date(Date.UTC(targetYear, 5, 21)) // ~summer solstice as default
  }

  // Binary search to find exact crossing (within ~1 minute accuracy)
  let lo = crossStart.getTime()
  let hi = crossEnd.getTime()

  for (let iter = 0; iter < 30; iter++) {
    const mid = lo + (hi - lo) / 2
    const diff = sunDiff(new Date(mid))

    if (Math.abs(diff) < 0.0007) { // ~1 arcminute
      return new Date(mid)
    }

    const diffLo = sunDiff(new Date(lo))
    if ((diffLo < 0 && diff < 0) || (diffLo >= 0 && diff >= 0)) {
      lo = mid
    } else {
      hi = mid
    }
  }

  return new Date(lo + (hi - lo) / 2)
}

/**
 * Get the Moon's current sign and phase for a given date.
 * Returns sign name, human-readable phase label, and raw elongation (Moon-Sun angle).
 */
export function getMoonSignAndPhase(date: Date): { sign: string; phase: string; elongation: number } {
  const time = Astronomy.MakeTime(date)
  const moonLon = Astronomy.EclipticGeoMoon(time).lon
  const sunLon = Astronomy.SunPosition(time).elon
  const elongation = normalizeAngle(moonLon - sunLon)
  const sign = longitudeToZodiac(moonLon).sign

  let phase: string
  if (elongation < 22.5 || elongation >= 337.5) phase = 'New Moon'
  else if (elongation < 67.5) phase = 'Waxing Crescent'
  else if (elongation < 112.5) phase = 'First Quarter'
  else if (elongation < 157.5) phase = 'Waxing Gibbous'
  else if (elongation < 202.5) phase = 'Full Moon'
  else if (elongation < 247.5) phase = 'Waning Gibbous'
  else if (elongation < 292.5) phase = 'Last Quarter'
  else phase = 'Waning Crescent'

  return { sign, phase, elongation }
}

/**
 * Resolve a local date/time + IANA timezone to a UTC Date.
 */
export function resolveToUTC(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string
): Date {
  // Create a date string and use Intl to find the UTC offset
  // Format: YYYY-MM-DDTHH:mm:00
  const pad = (n: number) => String(n).padStart(2, '0')
  const isoStr = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00`

  // Use a binary search approach: create a UTC date, find what local time it maps to,
  // and adjust.
  // Start with an estimate assuming the timezone offset
  const estimate = new Date(`${isoStr}Z`)

  // Get the timezone offset at this estimate
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(estimate)
  const getPart = (type: string) => {
    const part = parts.find(p => p.type === type)
    return part ? parseInt(part.value, 10) : 0
  }

  const localAtEstimate = new Date(Date.UTC(
    getPart('year'),
    getPart('month') - 1,
    getPart('day'),
    getPart('hour') === 24 ? 0 : getPart('hour'),
    getPart('minute'),
    getPart('second'),
  ))

  // The difference between localAtEstimate and estimate is the timezone offset
  const offsetMs = localAtEstimate.getTime() - estimate.getTime()

  // Adjust: we want the UTC time such that UTC + offset = local birth time
  return new Date(estimate.getTime() - offsetMs)
}
