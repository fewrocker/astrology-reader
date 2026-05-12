import * as Astronomy from 'astronomy-engine'
import { normalizeAngle } from './zodiac'
import { calculateChart } from './astronomy'
import type { ChartData } from './types'

/**
 * Get the Sun's geocentric ecliptic longitude at a given Date.
 */
function getSunLongitude(date: Date): number {
  const time = Astronomy.MakeTime(date)
  return Astronomy.SunPosition(time).elon
}

/**
 * Angular difference from sunLon to targetLon (signed, in [-180, 180]).
 * Positive means sunLon is "behind" targetLon (needs to advance).
 */
function sunDiff(sunLon: number, targetLon: number): number {
  let diff = normalizeAngle(targetLon - sunLon)
  if (diff > 180) diff -= 360
  return diff
}

/**
 * Find the exact UTC Date when the Sun returns to natalSunLongitude
 * during the given year, using binary search.
 *
 * The Sun moves ~1°/day. We start scanning around the same calendar
 * month/day ± 10 days, then use binary search to narrow to within seconds.
 *
 * @param natalSunLongitude - Sun's ecliptic longitude at birth (0–360°)
 * @param birthMonth        - Month of birth (1-based)
 * @param birthDay          - Day of birth (1-based)
 * @param year              - Calendar year to find the solar return for
 * @returns Exact UTC Date of the solar return moment
 */
function findSolarReturnDate(
  natalSunLongitude: number,
  birthMonth: number,
  birthDay: number,
  year: number,
): Date {
  // Start scanning 10 days before the birthday in the target year
  const startMs = new Date(Date.UTC(year, birthMonth - 1, birthDay - 10, 0, 0, 0)).getTime()
  const endMs = startMs + 25 * 86400000 // scan 25-day window

  const hourMs = 3600000

  // Coarse scan: 1-hour steps to find the bracket around the zero crossing
  let loMs: number | null = null
  let hiMs: number | null = null

  let prevDiff = sunDiff(getSunLongitude(new Date(startMs)), natalSunLongitude)

  for (let ms = startMs + hourMs; ms <= endMs; ms += hourMs) {
    const d = sunDiff(getSunLongitude(new Date(ms)), natalSunLongitude)

    // Sign change: the Sun crossed (or reached) the target longitude
    if ((prevDiff <= 0 && d >= 0) || (prevDiff >= 0 && d <= 0 && Math.abs(prevDiff) < 2)) {
      loMs = ms - hourMs
      hiMs = ms
      break
    }
    prevDiff = d
  }

  if (loMs === null || hiMs === null) {
    // Fallback: return noon of the birthday in target year (shouldn't happen)
    return new Date(Date.UTC(year, birthMonth - 1, birthDay, 12, 0, 0))
  }

  // Binary search to within 30 seconds
  let lo2: number = loMs
  let hi2: number = hiMs

  for (let iter = 0; iter < 30; iter++) {
    const midMs: number = lo2 + (hi2 - lo2) / 2
    const d = sunDiff(getSunLongitude(new Date(midMs)), natalSunLongitude)

    if (Math.abs(d) < 0.0001) {
      return new Date(midMs)
    }

    const loD = sunDiff(getSunLongitude(new Date(lo2)), natalSunLongitude)

    if ((loD <= 0 && d <= 0) || (loD >= 0 && d >= 0)) {
      lo2 = midMs
    } else {
      hi2 = midMs
    }
  }

  return new Date(lo2 + (hi2 - lo2) / 2)
}

/**
 * Format a UTC Date as local time in the given IANA timezone.
 * Returns { dateStr: 'YYYY-MM-DD', timeStr: 'HH:MM' }.
 */
function formatInTimezone(
  utcDate: Date,
  timezone: string,
): { dateStr: string; timeStr: string } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(utcDate)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00'

  const year = get('year')
  const month = get('month')
  const day = get('day')
  let hour = get('hour')
  const minute = get('minute')

  // Intl sometimes returns '24' for midnight
  if (hour === '24') hour = '00'

  return {
    dateStr: `${year}-${month}-${day}`,
    timeStr: `${hour}:${minute}`,
  }
}

/**
 * Calculate the Solar Return chart for a given year.
 *
 * @param natalSunLongitude - The Sun's ecliptic longitude at birth (0–360°)
 * @param birthMonth        - Month of birth (1-based)
 * @param birthDay          - Day of birth (1-based)
 * @param year              - Year to calculate the solar return for (e.g. 2026)
 * @param lat               - Latitude to cast the chart for
 * @param lng               - Longitude to cast the chart for
 * @param tz                - IANA timezone string
 * @returns ChartData for the solar return moment, plus the return Date
 */
export function calculateSolarReturn(
  natalSunLongitude: number,
  birthMonth: number,
  birthDay: number,
  year: number,
  lat: number,
  lng: number,
  tz: string,
): { chart: ChartData; returnDate: Date } {
  const returnDate = findSolarReturnDate(natalSunLongitude, birthMonth, birthDay, year)

  const { dateStr, timeStr } = formatInTimezone(returnDate, tz)

  const chart = calculateChart(dateStr, timeStr, lat, lng, tz, false)

  return { chart, returnDate }
}
