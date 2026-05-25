export type SpreadMode =
  | 'past-present-future'
  | 'situation-challenge-advice'
  | 'mind-heart-action'
  | 'self-other-bridge'
  | 'theme-shadow-gift'

export interface SpreadPosition {
  label: string
  meaning: string
}

export type TarotElement = 'Fire' | 'Water' | 'Air' | 'Earth'
export type TarotSuit = 'Wands' | 'Cups' | 'Swords' | 'Pentacles'
export type TarotArcana = 'major' | 'minor'

export interface DrawnCard {
  id: string
  name: string
  arcana: TarotArcana
  number: number | null
  suit: TarotSuit | null
  element: TarotElement | null
  reversed: boolean
}

export interface AstroConnection {
  headline: string
  transitInfluence: string
  lunarPhaseNote: string | null
  advanceCategoryNote: string | null
}

export interface InstantInterpretation {
  coreMeaning: string
  symbolicTheme: string
  emotionalMeaning: string
  practicalGuidance: string
  reflectionQuestion: string
  astroConnection: AstroConnection
  numerologyNote: string
  cardNumber: number | null
}

export interface TarotAstroContext {
  moonPhase: string
  moonSign: string
  personalDay: number
  personalYear: number
  sunSign: string
  moonSignNatal: string
  ascendant: string
  dominantElement: string
  dominantModality: string
  topTransits: string[]
  advanceCategory: string | null
}

export interface ThreeCardSynthesisSkeleton {
  dominantArcana: 'major-heavy' | 'minor-heavy' | 'mixed'
  elementDistribution: Record<string, number>
  polarityCount: { upright: number; reversed: number }
  hasFoolOrWorld: boolean
  suitSpread: string[]
  elementConflicts: string[]
  positionalWeights: string[]
}
