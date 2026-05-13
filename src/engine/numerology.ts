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

export function calculatePersonalYear(birthDate: string, targetDate?: Date): number {
  const year = targetDate ? targetDate.getFullYear() : new Date().getFullYear()
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

export function calculatePersonalMonth(personalYear: number, targetDate?: Date): number {
  const month = targetDate ? (targetDate.getMonth() + 1) : (new Date().getMonth() + 1)
  return reduceToSingleDigit(personalYear + month)
}

// Personal Day = reduce(birthMonth + birthDay + universalDay)
// Universal Day = reduce(sum of all individual digits in current YYYY-MM-DD)
// Master numbers (11, 22, 33) are preserved at every reduction step.
export function calculatePersonalDay(birthDate: string, targetDate?: Date): number {
  const [, birthMonthStr, birthDayStr] = birthDate.split('-')
  const birthMonth = parseInt(birthMonthStr, 10)
  const birthDay = parseInt(birthDayStr, 10)

  const now = targetDate ?? new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const universalDaySum = dateStr.split('').reduce((acc, d) => acc + Number(d), 0)
  const universalDay = reduceToSingleDigit(universalDaySum)

  return reduceToSingleDigit(birthMonth + birthDay + universalDay)
}

export interface NumerologyReading {
  lifePath: number
  birthdayNumber: number
  personalYear: number
  personalMonth: number
  personalDay: number
  karmicDebt: number | null
  expressionNumber?: number
  soulUrge?: number
}

export function calculateNumerology(birthDate: string, name?: string, targetDate?: Date): NumerologyReading {
  const digits = birthDate.replace(/-/g, '').split('').map(Number)
  const lifePathSum = digits.reduce((acc, d) => acc + d, 0)
  const { result: lifePath, intermediate } = reduceWithIntermediate(lifePathSum)
  const personalYear = calculatePersonalYear(birthDate, targetDate)

  return {
    lifePath,
    birthdayNumber: calculateBirthdayNumber(birthDate),
    personalYear,
    personalMonth: calculatePersonalMonth(personalYear, targetDate),
    personalDay: calculatePersonalDay(birthDate, targetDate),
    karmicDebt: detectKarmicDebt(intermediate),
    expressionNumber: name ? calculateExpressionNumber(name) : undefined,
    soulUrge: name ? calculateSoulUrge(name) : undefined,
  }
}
