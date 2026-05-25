// Core tarot types — shared across single-card, three-card, and Celtic Cross components.
// Will be aligned with data layer (task-0003) and engine (task-0006) when those land.

export type TarotArcana = 'major' | 'minor'
export type TarotSuit = 'wands' | 'cups' | 'swords' | 'pentacles'
export type TarotZone = 'cross' | 'staff'

export interface TarotAstroContext {
  sunSign: string
  moonSign: string
  ascendant: string
  dominantElement: string
  currentMoonPhase: string
  significantTransits: string[]
  personalDay: number
  advanceCategory: string | null
  numerologyYear: number
}

export interface DrawnCard {
  cardId: string
  cardName: string
  arcana: TarotArcana
  suit?: TarotSuit
  element: string | null
  number?: number  // 0-21 for major, 1-14 for minor
  reversed: boolean
  coreMeaning: string
  symbolicTheme: string
  emotionalMeaning: string
  astroConnection: string
}

export interface InstantInterpretation {
  cardId: string
  position: number
  positionName: string
  positionDescription: string
  coreMeaning: string
  emotionalMeaning: string
  astroConnection: string
  reversalNote: string | null
}

export interface SynthesisChapter {
  heading: string
  body: string
}

export interface CelticCrossPrecomputedSignals {
  majorArcanaCount: number
  minorArcanaCount: number
  dominantElement: string | null
  elementDistribution: Record<string, number>
  reversalCount: number
  hasFoolOrWorld: boolean
  foolPosition: number | null
  worldPosition: number | null
  repeatingNumerology: number[]
  suitDistribution: Record<string, number>
}

export interface CelticSynthesisPayload {
  cards: Array<{
    position: number
    positionName: string
    positionDescription: string
    cardName: string
    cardId: string
    arcana: TarotArcana
    suit?: string
    element: string | null
    reversed: boolean
    coreMeaning: string
    symbolicTheme: string
    emotionalMeaning: string
    astroConnection: string
  }>
  precomputedSignals: CelticCrossPrecomputedSignals
  astroContext: {
    sunSign: string
    moonSign: string
    ascendant: string
    dominantElement: string
    currentMoonPhase: string
    significantTransits: string[]
    personalDay: number
    advanceCategory: string | null
    numerologyYear: number
  }
  userIntention: string | null
  spreadType: 'celtic-cross'
}

export interface SavedCelticCrossReading {
  schemaVersion: 1
  readingType: 'celtic-cross'
  userId: string
  drawnCards: Array<{ position: number; cardId: string; reversed: boolean }>
  spreadType: 'celtic-cross'
  userIntention: string | null
  astroContextSnapshot: {
    natalFingerprint: string
    transitSnapshotDate: string
    moonPhase: string
    personalDay: number
    numerologyYear: number
  }
  interpretationPayload: {
    version: 1
    payload: Record<string, unknown>
  }
  synthesisText: string
  createdAt: string
  journalEntryId: string | null
}

export type SavedReading = SavedCelticCrossReading
