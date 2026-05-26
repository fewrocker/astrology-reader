// Re-export canonical types from the engine. All consumers should import from here or directly
// from src/engine/tarot.ts. No parallel definitions — engine types are authoritative.
export type {
  DrawnCard,
  InstantInterpretation,
  AstroConnection,
  TarotAstroContext,
} from '../engine/tarot'

export type SpreadMode =
  | 'past-present-future'
  | 'situation-challenge-advice'
  | 'mind-heart-action'
  | 'self-other-bridge'
  | 'theme-shadow-gift'

export type TarotElement = 'Fire' | 'Water' | 'Air' | 'Earth'
export type TarotSuit = 'Wands' | 'Cups' | 'Swords' | 'Pentacles'
export type TarotArcana = 'major' | 'minor'

export interface ThreeCardSynthesisSkeleton {
  dominantArcana: 'major-heavy' | 'minor-heavy' | 'mixed'
  elementDistribution: Record<string, number>
  polarityCount: { upright: number; reversed: number }
  hasFoolOrWorld: boolean
  suitSpread: string[]
  elementConflicts: string[]
  positionalWeights: string[]
}
