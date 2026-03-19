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
 * Get ecliptic longitude for a planet at a given time.
 */
function getPlanetLongitude(body: Astronomy.Body, time: Astronomy.AstroTime): number {
  if (body === Astronomy.Body.Sun) {
    const sunPos = Astronomy.SunPosition(time)
    return sunPos.elon
  }

  if (body === Astronomy.Body.Moon) {
    const moonPos = Astronomy.EclipticGeoMoon(time)
    return moonPos.lon
  }

  return Astronomy.EclipticLongitude(body, time)
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
 * Calculate Mean Lunar Node (North Node).
 */
function getMeanNodeLongitude(time: Astronomy.AstroTime): number {
  // Mean Lunar Node formula
  // T is centuries from J2000.0
  const T = time.tt / 36525

  // Mean longitude of ascending node (in degrees)
  let omega = 125.0445479
    - 1934.1362891 * T
    + 0.0020754 * T * T
    + T * T * T / 467441
    - T * T * T * T / 60616000

  return normalizeAngle(omega)
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
function calculateAscendant(lstDeg: number, latDeg: number): number {
  const lstRad = lstDeg * Astronomy.DEG2RAD
  const latRad = latDeg * Astronomy.DEG2RAD

  // Obliquity of the ecliptic (~23.4°)
  const oblRad = 23.4393 * Astronomy.DEG2RAD

  const y = -Math.cos(lstRad)
  const x = Math.sin(lstRad) * Math.cos(oblRad) + Math.tan(latRad) * Math.sin(oblRad)

  let asc = Math.atan2(y, x) * Astronomy.RAD2DEG
  return normalizeAngle(asc)
}

/**
 * Calculate the Midheaven (MC) from LST.
 */
function calculateMidheaven(lstDeg: number): number {
  const lstRad = lstDeg * Astronomy.DEG2RAD
  const oblRad = 23.4393 * Astronomy.DEG2RAD

  let mc = Math.atan2(Math.sin(lstRad), Math.cos(lstRad) * Math.cos(oblRad)) * Astronomy.RAD2DEG
  return normalizeAngle(mc)
}

/**
 * Calculate Placidus house cusps.
 * Houses 1 (ASC) and 10 (MC) are exact. Others are interpolated.
 */
function calculatePlacidusHouses(asc: number, mc: number, latDeg: number): number[] {
  const cusps: number[] = new Array(12)
  cusps[0] = asc           // 1st house = ASC
  cusps[9] = mc            // 10th house = MC
  cusps[6] = normalizeAngle(asc + 180)  // 7th house = DSC
  cusps[3] = normalizeAngle(mc + 180)   // 4th house = IC

  const latRad = latDeg * Astronomy.DEG2RAD
  const oblRad = 23.4393 * Astronomy.DEG2RAD

  // Placidus intermediate house cusps
  // Houses 11, 12 (between MC and ASC)
  // Houses 2, 3 (between ASC and IC going clockwise)
  const ramc = ascensionFromLongitude(mc, oblRad)

  // Semi-arc method for Placidus
  for (const [houseIndex, fraction] of [[10, 1 / 3], [11, 2 / 3], [1, 1 / 3], [2, 2 / 3]] as [number, number][]) {
    cusps[houseIndex] = placidusCusp(ramc, latRad, oblRad, fraction, houseIndex >= 10)
  }

  // Opposite houses
  cusps[4] = normalizeAngle(cusps[10] + 180)  // 5th opposite 11th
  cusps[5] = normalizeAngle(cusps[11] + 180)  // 6th opposite 12th
  cusps[7] = normalizeAngle(cusps[1] + 180)   // 8th opposite 2nd
  cusps[8] = normalizeAngle(cusps[2] + 180)   // 9th opposite 3rd

  return cusps
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
): number {
  // Iterative method for Placidus cusps
  let ramc = ramcDeg * Astronomy.DEG2RAD

  // Starting RAMC offset for the cusp
  const offset = aboveHorizon
    ? fraction * Math.PI / 3  // 60° or 120° for houses 11, 12
    : Math.PI + fraction * Math.PI / 3 // for houses 2, 3

  let targetRA = normalizeAngle((ramc + offset * Astronomy.RAD2DEG / Astronomy.DEG2RAD * Astronomy.DEG2RAD) * Astronomy.RAD2DEG)

  // Simplify: use equal-arc approximation seeded from RAMC
  // Then iterate for Placidus correction
  targetRA = ramcDeg + (aboveHorizon ? fraction * 90 : 180 + fraction * 90)
  targetRA = normalizeAngle(targetRA)

  // Convert RAMC to ecliptic longitude
  const targetRARad = targetRA * Astronomy.DEG2RAD

  for (let i = 0; i < 20; i++) {
    const lon = eclipticLongFromRA(targetRARad, oblRad)
    const decl = Math.asin(Math.sin(oblRad) * Math.sin(lon * Astronomy.DEG2RAD))

    // Ascensional difference
    const ad = Math.asin(Math.tan(latRad) * Math.tan(decl))

    if (!isFinite(ad)) break // polar regions

    const correction = aboveHorizon
      ? targetRA - (ramcDeg + fraction * (90 + ad * Astronomy.RAD2DEG))
      : targetRA - (ramcDeg + 180 + fraction * (90 + ad * Astronomy.RAD2DEG))

    if (Math.abs(correction) < 0.01) break

    targetRA -= correction * 0.5
    targetRA = normalizeAngle(targetRA)
  }

  return eclipticLongFromRA(targetRA * Astronomy.DEG2RAD, oblRad)
}

function eclipticLongFromRA(raRad: number, oblRad: number): number {
  const lon = Math.atan2(
    Math.sin(raRad) * Math.cos(oblRad) + Math.tan(0) * Math.sin(oblRad),
    Math.cos(raRad)
  )
  return normalizeAngle(lon * Astronomy.RAD2DEG)
}

/**
 * Determine which house a planet is in based on house cusps.
 */
function getHouseForLongitude(longitude: number, cusps: number[]): number {
  for (let i = 0; i < 12; i++) {
    const nextI = (i + 1) % 12
    const start = cusps[i]
    const end = cusps[nextI]

    if (start < end) {
      if (longitude >= start && longitude < end) return i + 1
    } else {
      // Wraps around 360°
      if (longitude >= start || longitude < end) return i + 1
    }
  }
  return 1 // fallback
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

  // Calculate LST, ASC, MC
  const lst = localSiderealTime(time, lng)
  const ascLon = calculateAscendant(lst, lat)
  const mcLon = calculateMidheaven(lst)
  const dscLon = normalizeAngle(ascLon + 180)
  const icLon = normalizeAngle(mcLon + 180)

  // Calculate Placidus house cusps
  const cuspLongitudes = calculatePlacidusHouses(ascLon, mcLon, lat)

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

  return { planets, houses, angles, unknownTime }
}

/**
 * Resolve a local date/time + IANA timezone to a UTC Date.
 */
function resolveToUTC(
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
