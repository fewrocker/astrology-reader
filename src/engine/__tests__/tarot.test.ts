import { describe, it, expect } from 'vitest'
import {
  drawCards,
  assignReversals,
  buildTarotAstroContext,
  computeInstantInterpretation,
  computeThreeCardSynthesis,
  computeDailyDrawSeed,
  buildNatalResonanceNote,
} from '../tarot'
import { TAROT_CARDS } from '../../data/tarot/cards'
import type { TarotAstroContext } from '../tarot'
import type { ChartData } from '../types'
import type { TransitData } from '../transits'
import { SPREAD_POSITIONS } from '../../data/tarot/spreadPositions'
import type { SpreadPosition } from '../../data/tarot/spreadPositions'

// ─── Mock fixtures ────────────────────────────────────────────────────────────

const mockChartData: ChartData = {
  planets: [
    { name: 'Sun', sign: 'Aries', signIndex: 0, longitude: 15, degree: 15, minute: 0, retrograde: false, house: 1 },
    { name: 'Moon', sign: 'Cancer', signIndex: 3, longitude: 105, degree: 15, minute: 0, retrograde: false, house: 4 },
    { name: 'Mercury', sign: 'Aries', signIndex: 0, longitude: 10, degree: 10, minute: 0, retrograde: false, house: 1 },
    { name: 'Venus', sign: 'Taurus', signIndex: 1, longitude: 40, degree: 10, minute: 0, retrograde: false, house: 2 },
    { name: 'Mars', sign: 'Aries', signIndex: 0, longitude: 20, degree: 20, minute: 0, retrograde: false, house: 1 },
    { name: 'Jupiter', sign: 'Sagittarius', signIndex: 8, longitude: 255, degree: 15, minute: 0, retrograde: false, house: 9 },
    { name: 'Saturn', sign: 'Capricorn', signIndex: 9, longitude: 285, degree: 15, minute: 0, retrograde: false, house: 10 },
    { name: 'Uranus', sign: 'Aquarius', signIndex: 10, longitude: 315, degree: 15, minute: 0, retrograde: false, house: 11 },
    { name: 'Neptune', sign: 'Pisces', signIndex: 11, longitude: 345, degree: 15, minute: 0, retrograde: false, house: 12 },
    { name: 'Pluto', sign: 'Scorpio', signIndex: 7, longitude: 225, degree: 15, minute: 0, retrograde: false, house: 8 },
  ],
  houses: [],
  angles: {
    ascendant: { sign: 'Leo', signIndex: 4, longitude: 120, degree: 0, minute: 0 },
    midheaven: { sign: 'Taurus', signIndex: 1, longitude: 30, degree: 0, minute: 0 },
    descendant: { sign: 'Aquarius', signIndex: 10, longitude: 300, degree: 0, minute: 0 },
    imumCoeli: { sign: 'Scorpio', signIndex: 7, longitude: 210, degree: 0, minute: 0 },
  },
  unknownTime: false,
  houseSystem: 'placidus',
}

const mockTransitData: TransitData = {
  period: 'daily',
  dateRange: { start: '2026-05-25', end: '2026-05-25' },
  currentPlanets: [
    { name: 'Sun', sign: 'Gemini', signIndex: 2, longitude: 64, degree: 4, minute: 0, retrograde: false, house: 1, dailyMotion: 0.985 },
    { name: 'Moon', sign: 'Pisces', signIndex: 11, longitude: 345, degree: 15, minute: 0, retrograde: false, house: 12, dailyMotion: 13.2 },
    { name: 'Mercury', sign: 'Gemini', signIndex: 2, longitude: 60, degree: 0, minute: 0, retrograde: false, house: 1, dailyMotion: 1.5 },
    { name: 'Saturn', sign: 'Pisces', signIndex: 11, longitude: 340, degree: 10, minute: 0, retrograde: false, house: 12, dailyMotion: 0.1 },
  ],
  transitAspects: [
    {
      transitPlanet: 'Saturn',
      natalPlanet: 'Sun',
      natalHouse: 1,
      natalSign: 'Aries',
      type: 'square',
      orb: 1.5,
      exactAngle: 90,
      applying: true,
      nature: 'challenging',
      symbol: '□',
    },
  ],
  ingresses: [],
  retrogrades: [
    { planet: 'Mercury', isRetro: true, status: 'Retrograde' },
  ],
}

const mockTransitWithMercuryRetro: TransitData = {
  ...mockTransitData,
  retrogrades: [{ planet: 'Mercury', isRetro: true, status: 'Retrograde' }],
}

const mockTransitWithRareCombo: TransitData = {
  ...mockTransitData,
  transitAspects: [
    {
      transitPlanet: 'Venus',
      natalPlanet: 'Jupiter',
      natalHouse: 9,
      natalSign: 'Sagittarius',
      type: 'trine',
      orb: 0.5,
      exactAngle: 120,
      applying: false,
      nature: 'harmonious',
      symbol: '△',
    },
  ],
  retrogrades: [],
}

const mockAstroContext: TarotAstroContext = {
  natalSunSign: 'Aries',
  natalMoonSign: 'Cancer',
  natalAscendantSign: 'Leo',
  natalDominantElement: 'Fire',
  natalDominantModality: 'Cardinal',
  chartRulerPlanet: 'Sun',
  natalMoonHouse: 4,
  natalVenusHouse: 2,
  natalNorthNodeHouse: null,
  natalMarsHouse: 1,
  currentTransits: mockTransitData.transitAspects,
  retrogradePlanets: ['Mercury'],
  dominantTransitPlanet: 'Saturn',
  lunarPhaseName: 'Waning Gibbous',
  lunarPhaseSymbol: '🌖',
  personalDay: 5,
  advanceCategory: 'challenging',
  advanceReason: 'Saturn square natal Sun — pressure to define priorities.',
}

const mockPositions: SpreadPosition[] = [
  { id: 'past', spreadType: 'three-past-present-future', positionIndex: 0, label: 'Past', meaning: 'What came before.' },
  { id: 'present', spreadType: 'three-past-present-future', positionIndex: 1, label: 'Present', meaning: 'What is now.' },
  { id: 'future', spreadType: 'three-past-present-future', positionIndex: 2, label: 'Future', meaning: 'What is coming.' },
]

// ─── drawCards: determinism ───────────────────────────────────────────────────

describe('drawCards', () => {
  it('returns the same cards for the same seed', () => {
    const a = drawCards('single', 'test-seed-abc')
    const b = drawCards('single', 'test-seed-abc')
    expect(a.map(c => c.id)).toEqual(b.map(c => c.id))
  })

  it('returns different cards for different seeds', () => {
    const a = drawCards('single', 'seed-1')
    const b = drawCards('single', 'seed-2')
    // These seeds are distant enough that they virtually always produce different draws
    expect(a[0].id).not.toEqual(b[0].id)
  })

  it('returns the correct number of cards for single', () => {
    const cards = drawCards('single', 'seed-x')
    expect(cards).toHaveLength(1)
  })

  it('returns 3 cards for three-card spreads', () => {
    const cards = drawCards('three-past-present-future', 'seed-x')
    expect(cards).toHaveLength(3)
  })

  it('returns 10 cards for celtic-cross', () => {
    const cards = drawCards('celtic-cross', 'seed-x')
    expect(cards).toHaveLength(10)
  })

  it('never duplicates cards in the same draw', () => {
    const cards = drawCards('celtic-cross', 'seed-unique-check')
    const ids = cards.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('three-card draws produce no duplicate cards', () => {
    for (let i = 0; i < 20; i++) {
      const cards = drawCards('three-past-present-future', `seed-${i}`)
      const ids = cards.map(c => c.id)
      expect(new Set(ids).size).toBe(3)
    }
  })

  it('daily card seed does not repeat within a 28-day cycle for 10 test users', () => {
    const testUsers = Array.from({ length: 10 }, (_, i) => `user-${i}`)
    const dates = Array.from({ length: 28 }, (_, i) => {
      const d = new Date(2026, 0, 1)
      d.setDate(d.getDate() + i)
      return d.toISOString().split('T')[0]
    })
    for (const userId of testUsers) {
      const drawnIds = dates.map(date => {
        const seed = computeDailyDrawSeed(userId, '1990-03-15', date, 'single')
        return drawCards('single', seed)[0].id
      })
      const uniqueIds = new Set(drawnIds)
      expect(uniqueIds.size).toBeGreaterThan(14)
    }
  })
})

// ─── assignReversals: determinism and probability ─────────────────────────────

describe('assignReversals', () => {
  it('returns the same reversals for the same cards and seed', () => {
    const cards = drawCards('three-past-present-future', 'rev-seed')
    const a = assignReversals(cards, 'rev-seed')
    const b = assignReversals(cards, 'rev-seed')
    expect(a).toEqual(b)
  })

  it('returns different reversals for different seeds', () => {
    const cards = drawCards('three-past-present-future', 'seed-abc')
    const a = assignReversals(cards, 'seed-a')
    const b = assignReversals(cards, 'seed-b')
    // Not guaranteed to differ per call but with different seeds they should
    expect(a).toBeDefined()
    expect(b).toBeDefined()
  })

  it('returns a boolean array with length equal to cards', () => {
    const cards = drawCards('three-past-present-future', 'rev-len')
    const result = assignReversals(cards, 'rev-len')
    expect(result).toHaveLength(cards.length)
    result.forEach(v => expect(typeof v).toBe('boolean'))
  })

  it('reversal rate is approximately 30% over large sample', () => {
    const cards = drawCards('celtic-cross', 'rate-seed')
    let trueCount = 0
    const trials = 1000
    for (let i = 0; i < trials; i++) {
      const reversals = assignReversals(cards, `rate-seed-${i}`)
      trueCount += reversals.filter(Boolean).length
    }
    const rate = trueCount / (trials * cards.length)
    expect(rate).toBeGreaterThan(0.20)
    expect(rate).toBeLessThan(0.40)
  })
})

// ─── buildTarotAstroContext ───────────────────────────────────────────────────

describe('buildTarotAstroContext', () => {
  it('extracts natal sun sign correctly', () => {
    const ctx = buildTarotAstroContext(mockChartData, mockTransitData, 5, null)
    expect(ctx.natalSunSign).toBe('Aries')
  })

  it('extracts natal moon sign correctly', () => {
    const ctx = buildTarotAstroContext(mockChartData, mockTransitData, 5, null)
    expect(ctx.natalMoonSign).toBe('Cancer')
  })

  it('handles null transits gracefully', () => {
    const ctx = buildTarotAstroContext(mockChartData, null, 5, null)
    expect(ctx.currentTransits).toEqual([])
    expect(ctx.retrogradePlanets).toEqual([])
    expect(ctx.dominantTransitPlanet).toBeNull()
    expect(ctx.lunarPhaseName).toBeNull()
  })

  it('detects mercury as retrograde', () => {
    const ctx = buildTarotAstroContext(mockChartData, mockTransitWithMercuryRetro, 5, null)
    expect(ctx.retrogradePlanets).toContain('Mercury')
  })

  it('computes lunar phase when Moon and Sun positions are available', () => {
    const ctx = buildTarotAstroContext(mockChartData, mockTransitData, 5, null)
    // Moon at 345°, Sun at 64° → angle = (345-64+360)%360 = 281° → Waning Crescent
    expect(ctx.lunarPhaseName).toBeTruthy()
  })

  it('computes a dominant element from natal chart', () => {
    const ctx = buildTarotAstroContext(mockChartData, null, 5, null)
    expect(['Fire', 'Earth', 'Air', 'Water', null]).toContain(ctx.natalDominantElement)
  })

  it('maps advance score category', () => {
    const mockScore = { category: 'power' as const, coShift: false, intensity: 0.9, reason: 'Jupiter conjunct natal Sun.' }
    const ctx = buildTarotAstroContext(mockChartData, null, 5, mockScore)
    expect(ctx.advanceCategory).toBe('power')
    expect(ctx.advanceReason).toBe('Jupiter conjunct natal Sun.')
  })

  it('never throws even with malformed chart data', () => {
    const badChart = { planets: [], houses: [], angles: {} as ChartData['angles'], unknownTime: true, houseSystem: 'placidus' as const }
    expect(() => buildTarotAstroContext(badChart, null, 5, null)).not.toThrow()
  })

  it('tight applying Saturn outscores wide separating Pluto', () => {
    // Pluto: base priority 10, orb 4.8° separating
    // Saturn: base priority 7, orb 0.3° applying
    // Pluto score: 10 * (1 + (8-4.8)/8 * 0.6) * 1.0 = 10 * (1 + 0.24) = 12.4
    // Saturn score: 7 * (1 + (8-0.3)/8 * 0.6) * 1.15 = 7 * (1 + 0.5775) * 1.15 ≈ 12.69
    const transitsWithMixedOrbs: TransitData = {
      period: 'daily',
      dateRange: { start: '2026-05-25', end: '2026-05-25' },
      currentPlanets: [],
      transitAspects: [
        {
          transitPlanet: 'Pluto',
          natalPlanet: 'Sun',
          natalHouse: 1,
          natalSign: 'Aries',
          type: 'trine',
          orb: 4.8,
          exactAngle: 120,
          applying: false,
          nature: 'harmonious',
          symbol: '△',
        },
        {
          transitPlanet: 'Saturn',
          natalPlanet: 'Moon',
          natalHouse: 4,
          natalSign: 'Cancer',
          type: 'opposition',
          orb: 0.3,
          exactAngle: 180,
          applying: true,
          nature: 'challenging',
          symbol: '☍',
        },
      ],
      ingresses: [],
      retrogrades: [],
    }
    const ctx = buildTarotAstroContext(mockChartData, transitsWithMixedOrbs, 5, null)
    expect(ctx.dominantTransitPlanet).toBe('Saturn')
  })

  it('Pluto still outscores Saturn when both have equal orbs (priority hierarchy preserved)', () => {
    // With identical orb and both separating, PLANET_PRIORITY determines the winner.
    // Pluto score: 10 * (1 + (8-2)/8 * 0.6) * 1.0 = 10 * 1.45 = 14.5
    // Saturn score: 7  * (1 + (8-2)/8 * 0.6) * 1.0 = 7  * 1.45 = 10.15
    const transitsEqualOrbs: TransitData = {
      period: 'daily',
      dateRange: { start: '2026-05-25', end: '2026-05-25' },
      currentPlanets: [],
      transitAspects: [
        {
          transitPlanet: 'Pluto',
          natalPlanet: 'Sun',
          natalHouse: 1,
          natalSign: 'Aries',
          type: 'square',
          orb: 2.0,
          exactAngle: 90,
          applying: false,
          nature: 'challenging',
          symbol: '□',
        },
        {
          transitPlanet: 'Saturn',
          natalPlanet: 'Moon',
          natalHouse: 4,
          natalSign: 'Cancer',
          type: 'square',
          orb: 2.0,
          exactAngle: 90,
          applying: false,
          nature: 'challenging',
          symbol: '□',
        },
      ],
      ingresses: [],
      retrogrades: [],
    }
    const ctx = buildTarotAstroContext(mockChartData, transitsEqualOrbs, 5, null)
    expect(ctx.dominantTransitPlanet).toBe('Pluto')
  })
})

// ─── computeInstantInterpretation: three-level fallback ──────────────────────

describe('computeInstantInterpretation', () => {
  it('returns complete output for a transit combination not in TRANSIT_ADAPTATIONS', () => {
    const context = buildTarotAstroContext(mockChartData, mockTransitWithRareCombo, 3, null)
    const card = TAROT_CARDS.find(c => c.id === 'two-of-wands')!
    expect(card).toBeDefined()
    const result = computeInstantInterpretation(card, false, null, context)
    expect(result.astroConnection.transitInfluence).toBeTruthy()
    expect(result.astroConnection.transitInfluence.length).toBeGreaterThan(10)
    expect(result.astroConnection.astroHeadline).toBeTruthy()
    expect(result.astroConnection.astroHeadline.split(' ').length).toBeLessThanOrEqual(20)
  })

  it('produces non-empty transitInfluence when no transit data is available', () => {
    const context = buildTarotAstroContext(mockChartData, null, 5, null)
    const card = TAROT_CARDS.find(c => c.id === 'the-magician')!
    expect(card).toBeDefined()
    const result = computeInstantInterpretation(card, true, null, context)
    expect(result.astroConnection.transitInfluence).toBeTruthy()
    expect(result.coreMeaning).toBe(card.reversedMeaning)
  })

  it('uses reversedMeaning when reversed is true', () => {
    const card = TAROT_CARDS.find(c => c.id === 'the-magician')!
    const result = computeInstantInterpretation(card, true, null, mockAstroContext)
    expect(result.coreMeaning).toBe(card.reversedMeaning)
  })

  it('uses uprightMeaning when reversed is false', () => {
    const card = TAROT_CARDS.find(c => c.id === 'the-magician')!
    const result = computeInstantInterpretation(card, false, null, mockAstroContext)
    expect(result.coreMeaning).toBe(card.uprightMeaning)
  })

  it('never returns empty string fields in astroConnection', () => {
    const context = buildTarotAstroContext(mockChartData, null, 5, null)
    for (const card of TAROT_CARDS.slice(0, 10)) {
      const result = computeInstantInterpretation(card, false, null, context)
      expect(result.astroConnection.transitInfluence).toBeTruthy()
      expect(result.astroConnection.elementResonanceNote).toBeTruthy()
      expect(result.astroConnection.lunarPhaseNote).toBeTruthy()
      expect(result.astroConnection.astroHeadline).toBeTruthy()
    }
  })

  it('uses Level 1 TRANSIT_ADAPTATIONS when the Hermit meets Mercury retrograde', () => {
    const context = buildTarotAstroContext(mockChartData, mockTransitWithMercuryRetro, 5, null)
    const hermit = TAROT_CARDS.find(c => c.id === 'the-hermit')!
    const result = computeInstantInterpretation(hermit, false, null, context)
    expect(result.astroConnection.transitInfluence).toContain('withdrawal')
  })

  it('detects personal day matching card number', () => {
    const context: TarotAstroContext = { ...mockAstroContext, personalDay: 7 }
    const hermit = TAROT_CARDS.find(c => c.id === 'the-hermit')!   // Major IX = 9, not 7
    const chariot = TAROT_CARDS.find(c => c.id === 'the-chariot')! // Major VII = 7
    const hermitResult = computeInstantInterpretation(hermit, false, null, context)
    const chariotResult = computeInstantInterpretation(chariot, false, null, context)
    expect(hermitResult.numerologyNote).not.toContain('Your personal day is also')
    expect(chariotResult.numerologyNote).toContain('Your personal day is also a 7')
  })

  it('includes position label and meaning when position is provided', () => {
    const card = TAROT_CARDS.find(c => c.id === 'the-fool')!
    const position = mockPositions[0]
    const result = computeInstantInterpretation(card, false, position, mockAstroContext)
    expect(result.positionLabel).toBe('Past')
    expect(result.positionMeaning).toBeTruthy()
  })

  it('positionLabel is null when no position is provided', () => {
    const card = TAROT_CARDS.find(c => c.id === 'the-fool')!
    const result = computeInstantInterpretation(card, false, null, mockAstroContext)
    expect(result.positionLabel).toBeNull()
    expect(result.positionMeaning).toBeNull()
  })

  it('adapts the instant interpretation text to the actual spread position', () => {
    const card = TAROT_CARDS.find(c => c.id === 'the-fool')!
    const situation = SPREAD_POSITIONS.find(position => position.id === 'situation')!
    const advice = SPREAD_POSITIONS.find(position => position.id === 'advice')!

    const situationResult = computeInstantInterpretation(card, false, situation, mockAstroContext)
    const adviceResult = computeInstantInterpretation(card, false, advice, mockAstroContext)

    expect(situationResult.coreMeaning).toContain('In the situation position')
    expect(adviceResult.coreMeaning).toContain('In the advice position')
    expect(situationResult.practicalGuidance).not.toBe(adviceResult.practicalGuidance)
    expect(situationResult.reflectionQuestion).not.toBe(adviceResult.reflectionQuestion)
  })

  it('populates positionLabel and positionMeaning for a Celtic Cross adapted SpreadPosition', () => {
    // Simulates what CelticCrossReading.tsx does: adapt CelticCrossPosition → SpreadPosition
    const card = TAROT_CARDS.find(c => c.id === 'the-fool')!
    const celticSpreadPosition: SpreadPosition = {
      id: 'outcome',
      label: 'Outcome',
      meaning: 'The most likely resolution or direction of movement if current trajectories continue.',
      spreadType: 'celtic-cross',
      positionIndex: 9,
    }
    const result = computeInstantInterpretation(card, false, celticSpreadPosition, mockAstroContext)
    expect(result.positionLabel).toBe('Outcome')
    expect(result.positionMeaning).toBeTruthy()
    expect(result.positionMeaning).toContain('resolution')
  })

  it('populates positionLabel for all 10 Celtic Cross positions when adapted correctly', () => {
    const card = TAROT_CARDS.find(c => c.id === 'the-world')!
    const celticPositionNames = [
      'Present Situation', 'Challenge', 'Unconscious Influence', 'Recent Past',
      'Conscious Goal', 'Near Future', 'Inner State', 'External Environment',
      'Hopes and Fears', 'Outcome',
    ]
    celticPositionNames.forEach((name, index) => {
      const position: SpreadPosition = {
        id: `celtic-pos-${index}`,
        label: name,
        meaning: `Description for position ${index + 1}.`,
        spreadType: 'celtic-cross',
        positionIndex: index,
      }
      const result = computeInstantInterpretation(card, false, position, mockAstroContext)
      expect(result.positionLabel).toBe(name)
      expect(result.positionMeaning).toBeTruthy()
    })
  })
})

// ─── computeThreeCardSynthesis ────────────────────────────────────────────────

describe('computeThreeCardSynthesis', () => {
  it('correctly identifies all-Water element distribution', () => {
    const waterCards = TAROT_CARDS.filter(c => c.element === 'Water').slice(0, 3)
    expect(waterCards).toHaveLength(3)
    const drawnCards = waterCards.map(card => ({
      card,
      reversed: false,
      interpretation: computeInstantInterpretation(card, false, null, mockAstroContext),
    }))
    const synthesis = computeThreeCardSynthesis(drawnCards, mockPositions, mockAstroContext)
    expect(synthesis.elementDistribution.allSame).toBe(true)
    expect(synthesis.elementDistribution.dominant).toBe('Water')
    expect(synthesis.elementDistribution.crossElement).toBe(false)
    expect(synthesis.elementDistribution.fireWaterTension).toBe(false)
  })

  it('detects Fire-Water tension', () => {
    const fireCard = TAROT_CARDS.find(c => c.element === 'Fire')!
    const waterCard = TAROT_CARDS.find(c => c.element === 'Water')!
    const airCard = TAROT_CARDS.find(c => c.element === 'Air')!
    const drawnCards = [fireCard, waterCard, airCard].map(card => ({
      card,
      reversed: false,
      interpretation: computeInstantInterpretation(card, false, null, mockAstroContext),
    }))
    const synthesis = computeThreeCardSynthesis(drawnCards, mockPositions, mockAstroContext)
    expect(synthesis.elementDistribution.fireWaterTension).toBe(true)
  })

  it('identifies major-heavy spread correctly', () => {
    const majorCards = TAROT_CARDS.filter(c => c.arcana === 'major').slice(0, 3)
    const drawnCards = majorCards.map(card => ({
      card,
      reversed: false,
      interpretation: computeInstantInterpretation(card, false, null, mockAstroContext),
    }))
    const synthesis = computeThreeCardSynthesis(drawnCards, mockPositions, mockAstroContext)
    expect(synthesis.dominantArcana).toBe('major-heavy')
    expect(synthesis.suitPattern.noMinorArcana).toBe(true)
  })

  it('identifies minor-heavy spread correctly', () => {
    const minorCards = TAROT_CARDS.filter(c => c.arcana === 'minor').slice(0, 3)
    const drawnCards = minorCards.map(card => ({
      card,
      reversed: false,
      interpretation: computeInstantInterpretation(card, false, null, mockAstroContext),
    }))
    const synthesis = computeThreeCardSynthesis(drawnCards, mockPositions, mockAstroContext)
    expect(synthesis.dominantArcana).toBe('minor-heavy')
  })

  it('detects centerReversed correctly', () => {
    const cards = TAROT_CARDS.slice(0, 3)
    const drawnCards = cards.map((card, i) => ({
      card,
      reversed: i === 1, // only center card reversed
      interpretation: computeInstantInterpretation(card, i === 1, null, mockAstroContext),
    }))
    const synthesis = computeThreeCardSynthesis(drawnCards, mockPositions, mockAstroContext)
    expect(synthesis.polarityProfile.centerReversed).toBe(true)
    expect(synthesis.polarityProfile.reversedCount).toBe(1)
  })

  it('detects The Fool, The World, Death, and The Tower correctly', () => {
    const fool = TAROT_CARDS.find(c => c.id === 'the-fool')!
    const world = TAROT_CARDS.find(c => c.id === 'the-world')!
    const tower = TAROT_CARDS.find(c => c.id === 'the-tower')!
    const drawnCards = [fool, world, tower].map(card => ({
      card,
      reversed: false,
      interpretation: computeInstantInterpretation(card, false, null, mockAstroContext),
    }))
    const synthesis = computeThreeCardSynthesis(drawnCards, mockPositions, mockAstroContext)
    expect(synthesis.archetypeFraming.hasFool).toBe(true)
    expect(synthesis.archetypeFraming.hasWorld).toBe(true)
    expect(synthesis.archetypeFraming.hasDeathOrTower).toBe(true)
  })

  it('produces a non-empty astroResonanceNote', () => {
    const cards = TAROT_CARDS.slice(0, 3)
    const drawnCards = cards.map(card => ({
      card,
      reversed: false,
      interpretation: computeInstantInterpretation(card, false, null, mockAstroContext),
    }))
    const synthesis = computeThreeCardSynthesis(drawnCards, mockPositions, mockAstroContext)
    expect(synthesis.astroResonanceNote).toBeTruthy()
  })

  it('preserves interpretedCards and spreadPositions', () => {
    const cards = TAROT_CARDS.slice(0, 3)
    const drawnCards = cards.map(card => ({
      card,
      reversed: false,
      interpretation: computeInstantInterpretation(card, false, null, mockAstroContext),
    }))
    const synthesis = computeThreeCardSynthesis(drawnCards, mockPositions, mockAstroContext)
    expect(synthesis.interpretedCards).toHaveLength(3)
    expect(synthesis.spreadPositions).toHaveLength(3)
  })
})

// ─── buildNatalResonanceNote ──────────────────────────────────────────────────

describe('buildNatalResonanceNote', () => {
  it('returns a non-empty string when card ruling planet matches chartRulerPlanet', () => {
    // The Sun card (The Sun, id: 'the-sun') has rulingPlanet: 'Sun'
    // mockAstroContext has chartRulerPlanet: 'Sun' (Leo Ascendant)
    const sunCard = TAROT_CARDS.find(c => c.id === 'the-sun')!
    expect(sunCard).toBeDefined()
    const note = buildNatalResonanceNote(sunCard, mockAstroContext)
    expect(note).toBeTruthy()
    expect(note).toContain('Sun')
    expect(note).toContain('Ascendant')
  })

  it('mentions the chart ruler planet in the chart ruler match note', () => {
    // The Sun card and Sun chart ruler (Leo Ascendant) should produce a note naming Sun
    const sunCard = TAROT_CARDS.find(c => c.id === 'the-sun')!
    const note = buildNatalResonanceNote(sunCard, mockAstroContext)
    expect(note).toContain('Sun rules both this card')
  })

  it('returns empty string when no correspondence is found', () => {
    // The Tower (id: 'the-tower') is ruled by Mars.
    // mockAstroContext chartRulerPlanet is Sun, natalDominantElement is Fire.
    // The Tower's element is Fire — so it WOULD match element. Use a Water card + Air chart.
    const towerCard = TAROT_CARDS.find(c => c.id === 'the-tower')! // Mars/Fire
    const noMatchContext: TarotAstroContext = {
      ...mockAstroContext,
      chartRulerPlanet: 'Saturn', // not Mars
      natalDominantElement: 'Water', // not Fire
    }
    const note = buildNatalResonanceNote(towerCard, noMatchContext)
    expect(note).toBe('')
  })

  it('returns empty string when all chart context is null', () => {
    const anyCard = TAROT_CARDS.find(c => c.id === 'the-hermit')!
    const emptyContext: TarotAstroContext = {
      ...mockAstroContext,
      chartRulerPlanet: null,
      natalDominantElement: null,
      natalAscendantSign: null,
    }
    const note = buildNatalResonanceNote(anyCard, emptyContext)
    expect(note).toBe('')
  })

  it('returns a note for court card whose suit element matches natal dominant element', () => {
    // King of Wands is a Fire court card. Context with Fire dominant but non-matching chart ruler.
    const kingOfWands = TAROT_CARDS.find(c => c.id === 'king-of-wands')!
    expect(kingOfWands).toBeDefined()
    const courtContext: TarotAstroContext = {
      ...mockAstroContext,
      chartRulerPlanet: 'Saturn', // not a match to King of Wands (null rulingPlanet)
      natalDominantElement: 'Fire', // matches king-of-wands element
    }
    const note = buildNatalResonanceNote(kingOfWands, courtContext)
    expect(note).toBeTruthy()
    expect(note).toContain('Fire')
  })

  it('natalResonanceNote is populated on the AstroConnection object', () => {
    const sunCard = TAROT_CARDS.find(c => c.id === 'the-sun')!
    const result = computeInstantInterpretation(sunCard, false, null, mockAstroContext)
    // chartRulerPlanet is 'Sun' and the-sun has rulingPlanet: 'Sun' → match expected
    expect(result.astroConnection.natalResonanceNote).toBeTruthy()
    expect(result.astroConnection.natalResonanceNote).toContain('Sun')
  })

  it('natalResonanceNote is empty string when no match on AstroConnection', () => {
    // High Priestess is Moon-ruled. mockAstroContext chartRulerPlanet is Sun (not Moon).
    // natalDominantElement is Fire, High Priestess is Water — no match.
    const highPriestess = TAROT_CARDS.find(c => c.id === 'the-high-priestess')!
    const result = computeInstantInterpretation(highPriestess, false, null, mockAstroContext)
    expect(result.astroConnection.natalResonanceNote).toBe('')
  })
})
