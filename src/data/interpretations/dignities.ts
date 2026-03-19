import type { PlanetName, ZodiacSign, PlanetPosition } from '../../engine/types'

// ---------- types ----------

export type DignityType = 'domicile' | 'exaltation' | 'detriment' | 'fall'

export interface DignityInfo {
  type: DignityType
  label: string
  symbol: string
  color: string        // tailwind text color class
  bgColor: string      // tailwind bg color class
  description: string  // brief sentence about what the dignity means for this planet
}

export interface MutualReception {
  planet1: PlanetName
  planet2: PlanetName
  sign1: ZodiacSign
  sign2: ZodiacSign
  interpretation: string
}

// ---------- rulership tables ----------

/** Classical + modern domicile rulerships */
const DOMICILE: Partial<Record<PlanetName, ZodiacSign[]>> = {
  Sun:     ['Leo'],
  Moon:    ['Cancer'],
  Mercury: ['Gemini', 'Virgo'],
  Venus:   ['Taurus', 'Libra'],
  Mars:    ['Aries', 'Scorpio'],
  Jupiter: ['Sagittarius', 'Pisces'],
  Saturn:  ['Capricorn', 'Aquarius'],
  Uranus:  ['Aquarius'],
  Neptune: ['Pisces'],
  Pluto:   ['Scorpio'],
}

/** Exaltation signs */
const EXALTATION: Partial<Record<PlanetName, ZodiacSign>> = {
  Sun:     'Aries',
  Moon:    'Taurus',
  Mercury: 'Virgo',
  Venus:   'Pisces',
  Mars:    'Capricorn',
  Jupiter: 'Cancer',
  Saturn:  'Libra',
}

/** Detriment = opposite of domicile */
const DETRIMENT: Partial<Record<PlanetName, ZodiacSign[]>> = {
  Sun:     ['Aquarius'],
  Moon:    ['Capricorn'],
  Mercury: ['Sagittarius', 'Pisces'],
  Venus:   ['Aries', 'Scorpio'],
  Mars:    ['Taurus', 'Libra'],
  Jupiter: ['Gemini', 'Virgo'],
  Saturn:  ['Cancer', 'Leo'],
  Uranus:  ['Leo'],
  Neptune: ['Virgo'],
  Pluto:   ['Taurus'],
}

/** Fall = opposite of exaltation */
const FALL: Partial<Record<PlanetName, ZodiacSign>> = {
  Sun:     'Libra',
  Moon:    'Scorpio',
  Mercury: 'Pisces',
  Venus:   'Virgo',
  Mars:    'Cancer',
  Jupiter: 'Capricorn',
  Saturn:  'Aries',
}

// ---------- dignity descriptions ----------

const DIGNITY_DESCRIPTIONS: Record<DignityType, Record<string, string>> = {
  domicile: {
    Sun: 'Your Sun shines at full power in its home sign — your identity and self-expression flow naturally and confidently.',
    Moon: 'Your Moon is deeply at home here — your emotional responses are instinctive, nurturing, and powerfully felt.',
    Mercury: 'Mercury is in its own sign — your mind is sharp, communication is fluid, and thinking aligns naturally with expression.',
    Venus: 'Venus rules this sign — love, beauty, and pleasure come effortlessly, and relationships feel fundamentally natural.',
    Mars: 'Mars is in its home territory — your drive, ambition, and assertiveness are strong, direct, and effective.',
    Jupiter: 'Jupiter thrives in its domicile — growth, wisdom, and expansion unfold with natural ease and abundance.',
    Saturn: 'Saturn is at home here — discipline, structure, and responsibility come naturally and produce lasting results.',
    Uranus: 'Uranus operates freely in its own sign — innovation and individuality express with full revolutionary force.',
    Neptune: 'Neptune is in its own waters — intuition, imagination, and spiritual sensitivity are magnified and pure.',
    Pluto: 'Pluto commands this sign — your transformative power runs deep and your capacity for renewal is extraordinary.',
  },
  exaltation: {
    Sun: 'Your Sun is exalted — your vitality and leadership radiate with a special intensity and recognized authority.',
    Moon: 'Your Moon is exalted — emotional stability combines with deep sensuality, creating a richly grounded inner life.',
    Mercury: 'Mercury is exalted — your analytical abilities are exceptional, with a gift for precision and detailed understanding.',
    Venus: 'Venus is exalted — your capacity for love reaches a transcendent, unconditional, and deeply compassionate quality.',
    Mars: 'Mars is exalted — your ambition is strategic and disciplined, channeling raw energy into masterful achievement.',
    Jupiter: 'Jupiter is exalted — generosity and emotional wisdom combine beautifully, nurturing growth in yourself and others.',
    Saturn: 'Saturn is exalted — your sense of justice and balance lends exceptional fairness and diplomatic authority.',
  },
  detriment: {
    Sun: 'Your Sun faces challenges in this sign — self-expression may feel constrained or at odds with social expectations.',
    Moon: 'Your Moon struggles here — emotional needs conflict with a tendency toward emotional restraint or suppression.',
    Mercury: 'Mercury is in detriment — communication may veer toward the imprecise, and focused thinking requires extra effort.',
    Venus: 'Venus is uncomfortable — relationships and pleasure principle may feel combative or overly intense.',
    Mars: 'Mars is weakened — asserting yourself directly may feel difficult, requiring you to find subtler paths to action.',
    Jupiter: 'Jupiter is in detriment — expansion feels scattered or overthought, and faith may be tested by skepticism.',
    Saturn: 'Saturn struggles here — establishing structure and boundaries requires overcoming emotional or creative resistance.',
    Uranus: 'Uranus is in detriment — the drive for radical change conflicts with pride and the desire for personal recognition.',
    Neptune: 'Neptune is in detriment — idealistic visions may be undermined by critical overthinking or perfectionism.',
    Pluto: 'Pluto is in detriment — transformative power meets stubborn material resistance, making change slow and grinding.',
  },
  fall: {
    Sun: 'Your Sun is in fall — identity feels uncertain, and finding your purpose requires balancing competing needs of self and other.',
    Moon: 'Your Moon is in fall — emotions run intensely deep but may feel uncomfortable, driving transformation through crisis.',
    Mercury: 'Mercury is in fall — logical thinking is colored by intuition and emotion, which can be both a gift and a source of confusion.',
    Venus: 'Venus is in fall — the desire for perfection in love can create critical tendencies that undermine connection.',
    Mars: 'Mars is in fall — direct aggression is softened, channeled through emotional sensitivity rather than raw force.',
    Jupiter: 'Jupiter is in fall — optimism meets pragmatic caution, and growth requires disciplined, patient effort.',
    Saturn: 'Saturn is in fall — discipline and patience are tested by impulsive energy and a desire for immediate results.',
  },
}

// ---------- lookup function ----------

/** Determine the essential dignity of a planet in a given sign. Returns null if peregrine (no special dignity). */
export function getDignity(planet: PlanetName, sign: ZodiacSign): DignityInfo | null {
  // Check domicile
  if (DOMICILE[planet]?.includes(sign)) {
    return {
      type: 'domicile',
      label: 'Domicile',
      symbol: '✦',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/15',
      description: DIGNITY_DESCRIPTIONS.domicile[planet] ?? `${planet} is in its home sign — its energy expresses naturally and powerfully.`,
    }
  }

  // Check exaltation
  if (EXALTATION[planet] === sign) {
    return {
      type: 'exaltation',
      label: 'Exalted',
      symbol: '↑',
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/15',
      description: DIGNITY_DESCRIPTIONS.exaltation[planet] ?? `${planet} is exalted — its qualities are elevated and perform exceptionally well.`,
    }
  }

  // Check detriment
  if (DETRIMENT[planet]?.includes(sign)) {
    return {
      type: 'detriment',
      label: 'Detriment',
      symbol: '↓',
      color: 'text-red-400/80',
      bgColor: 'bg-red-400/10',
      description: DIGNITY_DESCRIPTIONS.detriment[planet] ?? `${planet} is in detriment — its expression faces challenges and requires extra effort.`,
    }
  }

  // Check fall
  if (FALL[planet] === sign) {
    return {
      type: 'fall',
      label: 'Fall',
      symbol: '⬇',
      color: 'text-gray-400',
      bgColor: 'bg-gray-400/10',
      description: DIGNITY_DESCRIPTIONS.fall[planet] ?? `${planet} is in fall — its energy is diminished and must work harder to express itself.`,
    }
  }

  return null // Peregrine — no special dignity
}

// ---------- strength scoring ----------

const DIGNITY_SCORES: Record<DignityType, number> = {
  domicile: 5,
  exaltation: 4,
  detriment: -3,
  fall: -4,
}

/** Compute a numeric strength score for a planet. 0 = peregrine, positive = dignified, negative = debilitated. */
export function dignityScore(planet: PlanetName, sign: ZodiacSign): number {
  const d = getDignity(planet, sign)
  return d ? DIGNITY_SCORES[d.type] : 0
}

// ---------- mutual receptions ----------

/** Detect mutual receptions (two planets each in the other's domicile sign). */
export function detectMutualReceptions(planets: PlanetPosition[]): MutualReception[] {
  const receptions: MutualReception[] = []
  const planetList = planets.filter(p => p.name !== 'NorthNode') as (PlanetPosition & { name: PlanetName })[]

  for (let i = 0; i < planetList.length; i++) {
    for (let j = i + 1; j < planetList.length; j++) {
      const a = planetList[i]
      const b = planetList[j]

      // Check: is planet A in one of planet B's domicile signs, AND planet B in one of planet A's domicile signs?
      const aInBsDomicile = DOMICILE[b.name]?.includes(a.sign) ?? false
      const bInAsDomicile = DOMICILE[a.name]?.includes(b.sign) ?? false

      if (aInBsDomicile && bInAsDomicile) {
        receptions.push({
          planet1: a.name,
          planet2: b.name,
          sign1: a.sign,
          sign2: b.sign,
          interpretation: getMutualReceptionText(a.name, b.name),
        })
      }
    }
  }

  return receptions
}

function getMutualReceptionText(p1: PlanetName, p2: PlanetName): string {
  const key = [p1, p2].sort().join('_')
  return MUTUAL_RECEPTION_TEXTS[key] ??
    `${p1} and ${p2} are in mutual reception — each occupying the other's home sign. This creates a powerful cooperative exchange where both planets strengthen each other, blending their energies in a uniquely supportive way.`
}

const MUTUAL_RECEPTION_TEXTS: Record<string, string> = {
  'Moon_Sun': 'The Sun and Moon in mutual reception unite your identity and emotions in deep harmony — what you want and what you need are fundamentally aligned, giving you a rare inner coherence.',
  'Mercury_Venus': 'Mercury and Venus in mutual reception blend mind and heart beautifully — your words carry grace, and your aesthetic sense is intellectually refined.',
  'Mars_Venus': 'Venus and Mars in mutual reception create a dynamic balance between desire and assertion — passion and affection feed each other naturally.',
  'Jupiter_Saturn': 'Jupiter and Saturn in mutual reception balance expansion with structure — you can dream big and build solidly at the same time.',
  'Mars_Saturn': 'Mars and Saturn in mutual reception unite courage with discipline — your ambition is relentless and your actions are strategically sound.',
  'Jupiter_Moon': 'The Moon and Jupiter in mutual reception expand your emotional generosity — you feel things deeply and express warmth and optimism instinctively.',
  'Mercury_Mars': 'Mercury and Mars in mutual reception create a sharp, quick mind paired with decisive action — you think on your feet and communicate with bold clarity.',
  'Jupiter_Venus': 'Venus and Jupiter in mutual reception amplify love, beauty, and abundance — your generosity of spirit and appreciation of life\'s pleasures are extraordinary.',
  'Mercury_Saturn': 'Mercury and Saturn in mutual reception give structured, disciplined thinking — your mind is methodical, patient, and capable of deep concentration.',
  'Moon_Venus': 'The Moon and Venus in mutual reception harmonize emotions with love nature — your nurturing instincts and romantic sensibility are deeply intertwined.',
}
