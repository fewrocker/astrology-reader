import { describe, it, expect } from 'vitest'
import { ALL_TAROT_CARDS, TAROT_CARD_BY_ID, MAJOR_ARCANA, MINOR_ARCANA } from '../cards'
import { TRANSIT_ADAPTATIONS } from '../transitAdaptations'
import { CARD_ASTRO_CONNECTIONS } from '../astroConnections'
import type { TarotCard } from '../cards'

const REQUIRED_STRING_FIELDS: (keyof TarotCard)[] = [
  'id',
  'name',
  'uprightMeaning',
  'reversedMeaning',
  'symbolicTheme',
  'emotionalMeaning',
  'practicalGuidance',
  'reflectionQuestion',
  'numerologyResonance',
]

describe('Tarot card data completeness', () => {
  it('contains exactly 78 cards', () => {
    expect(ALL_TAROT_CARDS).toHaveLength(78)
  })

  it('contains exactly 22 Major Arcana', () => {
    expect(ALL_TAROT_CARDS.filter(c => c.arcana === 'major')).toHaveLength(22)
    expect(MAJOR_ARCANA).toHaveLength(22)
  })

  it('contains exactly 56 Minor Arcana', () => {
    expect(MINOR_ARCANA).toHaveLength(56)
  })

  it('contains exactly 14 cards per suit', () => {
    const suits = ['wands', 'cups', 'swords', 'pentacles'] as const
    for (const suit of suits) {
      expect(ALL_TAROT_CARDS.filter(c => c.suit === suit)).toHaveLength(14)
    }
  })

  it('has no duplicate card ids', () => {
    const ids = ALL_TAROT_CARDS.map(c => c.id)
    expect(new Set(ids).size).toBe(78)
  })

  it('TAROT_CARD_BY_ID has exactly 78 entries', () => {
    expect(Object.keys(TAROT_CARD_BY_ID)).toHaveLength(78)
  })

  it('TAROT_CARD_BY_ID keys match card ids', () => {
    for (const card of ALL_TAROT_CARDS) {
      expect(TAROT_CARD_BY_ID[card.id]).toBe(card)
    }
  })

  it('all cards have required string fields populated', () => {
    for (const card of ALL_TAROT_CARDS) {
      for (const field of REQUIRED_STRING_FIELDS) {
        const value = card[field]
        expect(
          typeof value === 'string' && value.trim().length > 0,
          `Card "${card.id}" is missing or has empty field "${field}"`
        ).toBe(true)
      }
    }
  })

  it('all reversed meanings are at least 20 chars long', () => {
    for (const card of ALL_TAROT_CARDS) {
      expect(
        card.reversedMeaning.trim().length >= 20,
        `Card "${card.id}" reversedMeaning is too short`
      ).toBe(true)
    }
  })

  it('all cards have at least 3 keywords', () => {
    for (const card of ALL_TAROT_CARDS) {
      expect(Array.isArray(card.keywords), `Card "${card.id}" keywords is not an array`).toBe(true)
      expect(card.keywords.length, `Card "${card.id}" has fewer than 3 keywords`).toBeGreaterThanOrEqual(3)
      for (const kw of card.keywords) {
        expect(typeof kw === 'string' && kw.trim().length > 0).toBe(true)
      }
    }
  })

  it('all minor arcana cards have a suit', () => {
    for (const card of ALL_TAROT_CARDS.filter(c => c.arcana === 'minor')) {
      expect(card.suit, `Minor arcana card "${card.id}" is missing suit`).toBeDefined()
    }
  })

  it('no major arcana cards have a suit', () => {
    for (const card of ALL_TAROT_CARDS.filter(c => c.arcana === 'major')) {
      expect(card.suit, `Major arcana card "${card.id}" should not have suit`).toBeUndefined()
    }
  })

  it('has at least 50 transit adaptation entries', () => {
    expect(TRANSIT_ADAPTATIONS.length).toBeGreaterThanOrEqual(50)
  })

  it('all transit adaptation entries have non-empty emphasis strings', () => {
    for (const entry of TRANSIT_ADAPTATIONS) {
      expect(
        typeof entry.emphasis === 'string' && entry.emphasis.trim().length > 20,
        `Transit adaptation for card "${entry.cardId}" × planet "${entry.planet}" has inadequate emphasis text`
      ).toBe(true)
    }
  })

  it('all transit adaptation card ids reference valid cards', () => {
    const cardIds = new Set(ALL_TAROT_CARDS.map(c => c.id))
    for (const entry of TRANSIT_ADAPTATIONS) {
      expect(
        cardIds.has(entry.cardId),
        `Transit adaptation references unknown card id "${entry.cardId}"`
      ).toBe(true)
    }
  })

  it('all pip cards (Two through Nine) have at least one transit adaptation entry', () => {
    const suits = ['wands', 'cups', 'swords', 'pentacles'] as const
    const numbers = ['two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'] as const
    const coveredCardIds = new Set(TRANSIT_ADAPTATIONS.map(e => e.cardId))
    const missing: string[] = []
    for (const suit of suits) {
      for (const number of numbers) {
        const id = `${number}-of-${suit}`
        if (!coveredCardIds.has(id)) {
          missing.push(id)
        }
      }
    }
    expect(
      missing,
      missing.length > 0 ? `Missing transit adaptations for: ${missing.join(', ')}` : ''
    ).toHaveLength(0)
  })

  it('all pip cards have Saturn and Pluto transit adaptations', () => {
    const suits = ['wands', 'cups', 'swords', 'pentacles'] as const
    const numbers = ['two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'] as const
    const missing: string[] = []
    for (const suit of suits) {
      for (const number of numbers) {
        const id = `${number}-of-${suit}`
        const entries = TRANSIT_ADAPTATIONS.filter(e => e.cardId === id)
        const hasSaturn = entries.some(e => e.planet === 'Saturn')
        const hasPluto = entries.some(e => e.planet === 'Pluto')
        if (!hasSaturn) missing.push(`${id} missing Saturn`)
        if (!hasPluto) missing.push(`${id} missing Pluto`)
      }
    }
    expect(missing, missing.join(', ')).toHaveLength(0)
  })

  it('Wands and Swords pip cards have Mars transit adaptations', () => {
    const suits = ['wands', 'swords'] as const
    const numbers = ['two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'] as const
    const missing: string[] = []
    for (const suit of suits) {
      for (const number of numbers) {
        const id = `${number}-of-${suit}`
        const entries = TRANSIT_ADAPTATIONS.filter(e => e.cardId === id)
        if (!entries.some(e => e.planet === 'Mars')) missing.push(id)
      }
    }
    expect(missing, missing.join(', ')).toHaveLength(0)
  })

  it('Cups pip cards have Neptune transit adaptations', () => {
    const numbers = ['two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'] as const
    const missing: string[] = []
    for (const number of numbers) {
      const id = `${number}-of-cups`
      const entries = TRANSIT_ADAPTATIONS.filter(e => e.cardId === id)
      if (!entries.some(e => e.planet === 'Neptune')) missing.push(id)
    }
    expect(missing, missing.join(', ')).toHaveLength(0)
  })

  it('Pentacles pip cards have Venus transit adaptations', () => {
    const numbers = ['two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'] as const
    const missing: string[] = []
    for (const number of numbers) {
      const id = `${number}-of-pentacles`
      const entries = TRANSIT_ADAPTATIONS.filter(e => e.cardId === id)
      if (!entries.some(e => e.planet === 'Venus')) missing.push(id)
    }
    expect(missing, missing.join(', ')).toHaveLength(0)
  })

  it('astro connections covers exactly 78 cards', () => {
    expect(Object.keys(CARD_ASTRO_CONNECTIONS)).toHaveLength(78)
  })

  it('all astro connection entries reference valid card ids', () => {
    const cardIds = new Set(ALL_TAROT_CARDS.map(c => c.id))
    for (const id of Object.keys(CARD_ASTRO_CONNECTIONS)) {
      expect(cardIds.has(id), `astroConnections has entry for unknown card id "${id}"`).toBe(true)
    }
  })
})
