const PYTHAGOREAN: Record<string, number> = {
  a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9,
  j: 1, k: 2, l: 3, m: 4, n: 5, o: 6, p: 7, q: 8, r: 9,
  s: 1, t: 2, u: 3, v: 4, w: 5, x: 6, y: 7, z: 8,
}

// Y is treated as a consonant for Soul Urge calculation (standard Pythagorean convention)
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u'])

export function reduceToSingleDigit(n: number): number {
  if (n === 11 || n === 22 || n === 33) return n
  if (n < 10) return n
  const sum = String(Math.abs(n)).split('').reduce((acc, d) => acc + Number(d), 0)
  return reduceToSingleDigit(sum)
}

export function reduceWithIntermediate(n: number): { result: number; intermediate: number } {
  return { intermediate: n, result: reduceToSingleDigit(n) }
}

export function calculateLifePath(birthDate: string): number {
  const digits = birthDate.replace(/-/g, '').split('').map(Number)
  const sum = digits.reduce((acc, d) => acc + d, 0)
  return reduceToSingleDigit(sum)
}

export function calculateBirthdayNumber(birthDate: string): number {
  const day = parseInt(birthDate.split('-')[2], 10)
  return reduceToSingleDigit(day)
}

export function calculatePersonalYear(birthDate: string, currentYear?: number): number {
  const year = currentYear ?? new Date().getFullYear()
  const [, month, day] = birthDate.split('-')
  const digits = `${month}${day}${year}`.split('').map(Number)
  const sum = digits.reduce((acc, d) => acc + d, 0)
  return reduceToSingleDigit(sum)
}

export function calculateExpressionNumber(name: string): number {
  const letters = name.toLowerCase().replace(/[^a-z]/g, '')
  if (!letters) return 0
  const sum = letters.split('').reduce((acc, l) => acc + (PYTHAGOREAN[l] ?? 0), 0)
  return reduceToSingleDigit(sum)
}

export function calculateSoulUrge(name: string): number {
  const letters = name.toLowerCase().replace(/[^a-z]/g, '')
  if (!letters) return 0
  const sum = letters.split('').reduce((acc, l) => VOWELS.has(l) ? acc + (PYTHAGOREAN[l] ?? 0) : acc, 0)
  return reduceToSingleDigit(sum)
}

export function detectKarmicDebt(intermediate: number): number | null {
  if (intermediate === 13 || intermediate === 14 || intermediate === 16 || intermediate === 19) {
    return intermediate
  }
  return null
}

export function calculatePersonalMonth(personalYear: number, currentMonth?: number): number {
  const month = currentMonth ?? (new Date().getMonth() + 1)
  return reduceToSingleDigit(personalYear + month)
}

export interface NumerologyReading {
  lifePath: number
  birthdayNumber: number
  personalYear: number
  personalMonth: number
  karmicDebt: number | null
  expressionNumber?: number
  soulUrge?: number
}

export function calculateNumerology(birthDate: string, name?: string): NumerologyReading {
  const digits = birthDate.replace(/-/g, '').split('').map(Number)
  const lifePathSum = digits.reduce((acc, d) => acc + d, 0)
  const { result: lifePath, intermediate } = reduceWithIntermediate(lifePathSum)
  const personalYear = calculatePersonalYear(birthDate)

  return {
    lifePath,
    birthdayNumber: calculateBirthdayNumber(birthDate),
    personalYear,
    personalMonth: calculatePersonalMonth(personalYear),
    karmicDebt: detectKarmicDebt(intermediate),
    expressionNumber: name ? calculateExpressionNumber(name) : undefined,
    soulUrge: name ? calculateSoulUrge(name) : undefined,
  }
}
