export type {
  TarotCard,
  TarotSuit,
  TarotArcana,
  TarotElement,
  TarotNumber,
  SpreadPosition,
  SpreadType,
  CardAstroConnection,
  TransitAdaptation,
} from './types'

import { MAJOR_ARCANA } from './majorArcana'
import { WANDS } from './wands'
import { CUPS } from './cups'
import { SWORDS } from './swords'
import { PENTACLES } from './pentacles'
import type { TarotCard } from './types'

export { MAJOR_ARCANA }
export { WANDS }
export { CUPS }
export { SWORDS }
export { PENTACLES }

export const ALL_TAROT_CARDS: TarotCard[] = [
  ...MAJOR_ARCANA,
  ...WANDS,
  ...CUPS,
  ...SWORDS,
  ...PENTACLES,
]

export const TAROT_CARD_BY_ID: Record<string, TarotCard> = Object.fromEntries(
  ALL_TAROT_CARDS.map(card => [card.id, card])
)

export const MINOR_ARCANA: TarotCard[] = ALL_TAROT_CARDS.filter(c => c.arcana === 'minor')

// Engine compatibility alias
export const TAROT_CARDS = ALL_TAROT_CARDS
