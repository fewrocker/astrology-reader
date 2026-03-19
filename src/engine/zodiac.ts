import { ZODIAC_SIGNS, type ZodiacPosition, type ZodiacSign } from './types'

/**
 * Convert ecliptic longitude (0-360) to zodiac sign, degree, and minute.
 */
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

/**
 * Normalize angle to 0-360 range.
 */
export function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360
}

/**
 * Format a zodiac position as a readable string, e.g. "15° Aries 23'"
 */
export function formatPosition(pos: ZodiacPosition): string {
  return `${pos.degree}° ${pos.sign} ${pos.minute}'`
}

/**
 * Get sign glyph from zodiac sign name
 */
export function signGlyph(sign: ZodiacSign): string {
  const glyphs: Record<ZodiacSign, string> = {
    Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
    Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
    Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
  }
  return glyphs[sign]
}
