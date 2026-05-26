// Core tarot types — component-specific structural types built on top of engine types.
// Canonical types (TarotAstroContext, DrawnCard, InstantInterpretation) live in src/engine/tarot.ts.

export type { TarotArcana, TarotSuit } from '../../data/tarot/types'

export type TarotZone = 'cross' | 'staff'

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
