import * as Astronomy from 'astronomy-engine'
import { longitudeToZodiac, normalizeAngle } from './zodiac'
import type { ZodiacSign } from './types'

export type LunarPhaseName =
  | 'New Moon'
  | 'Waxing Crescent'
  | 'First Quarter'
  | 'Waxing Gibbous'
  | 'Full Moon'
  | 'Waning Gibbous'
  | 'Last Quarter'
  | 'Waning Crescent'

export interface CurrentMoonPhase {
  phaseName: LunarPhaseName
  illumination: number
  angle: number
  moonSign: ZodiacSign
  moonLongitude: number
  isVoid: boolean
  nextSignChange: string | null
  nextSignName: string | null
}

export interface LunarDayEntry {
  date: string
  sign: string
  phase: LunarPhaseName
  illumination: number
  phaseMilestone?: 'New Moon' | 'First Quarter' | 'Full Moon' | 'Last Quarter'
}

function getMoonLon(time: Astronomy.AstroTime): number {
  return Astronomy.EclipticGeoMoon(time).lon
}

function getSunLon(time: Astronomy.AstroTime): number {
  return Astronomy.SunPosition(time).elon
}

function phaseAngleToName(angle: number): LunarPhaseName {
  if (angle < 22.5 || angle >= 337.5) return 'New Moon'
  if (angle < 67.5) return 'Waxing Crescent'
  if (angle < 112.5) return 'First Quarter'
  if (angle < 157.5) return 'Waxing Gibbous'
  if (angle < 202.5) return 'Full Moon'
  if (angle < 247.5) return 'Waning Gibbous'
  if (angle < 292.5) return 'Last Quarter'
  return 'Waning Crescent'
}

function illuminationFromAngle(angle: number): number {
  return Math.round(((1 - Math.cos((angle * Math.PI) / 180)) / 2) * 100)
}

function detectVoidOfCourse(date: Date): {
  isVoid: boolean
  nextSignChange: Date | null
  nextSign: string | null
} {
  const time = Astronomy.MakeTime(date)
  const currentSign = longitudeToZodiac(getMoonLon(time)).sign

  // Find next sign change with 30-min steps, up to 3 days ahead
  const stepMs = 30 * 60 * 1000
  let nextSignChangeDate: Date | null = null
  let nextSign: string | null = null

  for (let i = 1; i <= 144; i++) {
    const checkDate = new Date(date.getTime() + i * stepMs)
    const checkTime = Astronomy.MakeTime(checkDate)
    const sign = longitudeToZodiac(getMoonLon(checkTime)).sign
    if (sign !== currentSign) {
      nextSignChangeDate = checkDate
      nextSign = sign
      break
    }
  }

  if (!nextSignChangeDate) return { isVoid: false, nextSignChange: null, nextSign: null }

  // Check Ptolemaic aspects to personal planets in remaining sign time
  const BODIES = [
    Astronomy.Body.Sun,
    Astronomy.Body.Mercury,
    Astronomy.Body.Venus,
    Astronomy.Body.Mars,
    Astronomy.Body.Jupiter,
    Astronomy.Body.Saturn,
  ]
  const ASPECT_ANGLES = [0, 60, 90, 120, 180]
  const ORB = 2
  const stepMs2 = 2 * 60 * 60 * 1000
  const msRemaining = nextSignChangeDate.getTime() - date.getTime()
  const steps = Math.ceil(msRemaining / stepMs2)

  for (let i = 1; i <= steps; i++) {
    const checkDate = new Date(date.getTime() + i * stepMs2)
    if (checkDate > nextSignChangeDate) break
    const checkTime = Astronomy.MakeTime(checkDate)
    const moonLon = getMoonLon(checkTime)

    for (const body of BODIES) {
      let bodyLon: number
      if (body === Astronomy.Body.Sun) {
        bodyLon = getSunLon(checkTime)
      } else {
        const geo = Astronomy.GeoVector(body, checkTime, true)
        bodyLon = Astronomy.Ecliptic(geo).elon
      }

      const raw = Math.abs(moonLon - bodyLon)
      const ang = raw > 180 ? 360 - raw : raw

      for (const asp of ASPECT_ANGLES) {
        if (Math.abs(ang - asp) <= ORB) {
          return { isVoid: false, nextSignChange: nextSignChangeDate, nextSign }
        }
      }
    }
  }

  return { isVoid: true, nextSignChange: nextSignChangeDate, nextSign }
}

export function getCurrentMoonPhase(date: Date): CurrentMoonPhase {
  const time = Astronomy.MakeTime(date)
  const moonLon = getMoonLon(time)
  const sunLon = getSunLon(time)
  const angle = normalizeAngle(moonLon - sunLon)
  const phaseName = phaseAngleToName(angle)
  const illumination = illuminationFromAngle(angle)
  const moonZodiac = longitudeToZodiac(moonLon)

  const { isVoid, nextSignChange, nextSign } = detectVoidOfCourse(date)

  return {
    phaseName,
    illumination,
    angle,
    moonSign: moonZodiac.sign as ZodiacSign,
    moonLongitude: moonLon,
    isVoid,
    nextSignChange: nextSignChange ? nextSignChange.toISOString() : null,
    nextSignName: nextSign,
  }
}

export function getNatalMoonPhase(
  sunLongitude: number,
  moonLongitude: number
): { phaseName: LunarPhaseName; angle: number; illumination: number } {
  const angle = normalizeAngle(moonLongitude - sunLongitude)
  return { phaseName: phaseAngleToName(angle), angle, illumination: illuminationFromAngle(angle) }
}

export function getLunarCalendar(startDate: Date, days = 7): LunarDayEntry[] {
  const entries: LunarDayEntry[] = []
  const MILESTONES = [
    { angle: 0, name: 'New Moon' as const },
    { angle: 90, name: 'First Quarter' as const },
    { angle: 180, name: 'Full Moon' as const },
    { angle: 270, name: 'Last Quarter' as const },
  ]

  let prevAngle: number | null = null

  for (let d = 0; d < days; d++) {
    const date = new Date(startDate.getTime() + d * 86400000)
    const noon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
    const time = Astronomy.MakeTime(noon)
    const moonLon = getMoonLon(time)
    const sunLon = getSunLon(time)
    const angle = normalizeAngle(moonLon - sunLon)
    const phaseName = phaseAngleToName(angle)
    const illumination = illuminationFromAngle(angle)
    const sign = longitudeToZodiac(moonLon).sign

    let phaseMilestone: LunarDayEntry['phaseMilestone']
    if (prevAngle !== null) {
      for (const m of MILESTONES) {
        let crossed = false
        if (m.angle === 0) {
          crossed = prevAngle > 330 && angle < 30
        } else {
          crossed = prevAngle < m.angle && angle >= m.angle
        }
        if (crossed) {
          phaseMilestone = m.name
          break
        }
      }
    } else {
      for (const m of MILESTONES) {
        const dist = m.angle === 0 ? Math.min(angle, 360 - angle) : Math.abs(angle - m.angle)
        if (dist < 10) {
          phaseMilestone = m.name
          break
        }
      }
    }

    prevAngle = angle
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    entries.push({ date: dateStr, sign, phase: phaseName, illumination, phaseMilestone })
  }

  return entries
}
