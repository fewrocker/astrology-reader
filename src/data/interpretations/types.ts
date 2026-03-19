import type { PlanetName, ZodiacSign, Element, Modality } from '../engine/types'
import type { AspectType } from '../engine/aspects'
import type { FocusArea } from '../context/appState'

export interface InterpretationEntry {
  brief: string
  detail: string
}

export type PlanetSignKey = `${PlanetName}_${ZodiacSign}`
export type PlanetHouseKey = `${PlanetName}_H${number}`
export type AspectKey = `${string}_${AspectType}_${string}`

export interface FocusAreaMapping {
  houses: number[]
  planets: (PlanetName | 'NorthNode')[]
  description: string
}

export const FOCUS_AREA_MAPPINGS: Record<FocusArea, FocusAreaMapping> = {
  love: {
    houses: [5, 7, 8],
    planets: ['Venus', 'Mars', 'Moon'],
    description: 'Love is primarily governed by Venus (romantic attraction), the 7th house (partnerships), 5th house (romance), and 8th house (intimacy).',
  },
  career: {
    houses: [2, 6, 10],
    planets: ['Saturn', 'Jupiter', 'Sun'],
    description: 'Career is ruled by the Midheaven (10th house), Saturn (ambition/structure), Jupiter (growth/opportunity), and the 6th house (daily work).',
  },
  growth: {
    houses: [1, 9, 12],
    planets: ['Sun', 'Moon', 'Pluto'],
    description: 'Personal growth connects to the 1st house (identity), 9th house (philosophy/expansion), 12th house (subconscious), and transformative Pluto.',
  },
  health: {
    houses: [1, 6, 8],
    planets: ['Sun', 'Mars', 'Saturn'],
    description: 'Health relates to the 1st house (body), 6th house (health habits), Mars (vitality), and Saturn (endurance/limits).',
  },
  finances: {
    houses: [2, 8, 11],
    planets: ['Venus', 'Jupiter', 'Pluto'],
    description: 'Finances are linked to the 2nd house (personal resources), 8th house (shared resources), Venus (values), and Jupiter (abundance).',
  },
  spirituality: {
    houses: [8, 9, 12],
    planets: ['Neptune', 'Pluto', 'Moon'],
    description: 'Spirituality connects to Neptune (transcendence), the 12th house (the unseen), 9th house (higher meaning), and the 8th house (transformation).',
  },
}

export const ELEMENT_INTERPRETATIONS: Record<Element, { dominant: string; lacking: string }> = {
  Fire: {
    dominant: 'You lead with passion, enthusiasm, and courage. You\'re naturally action-oriented and inspire others with your energy and confidence.',
    lacking: 'You may sometimes struggle with motivation or assertiveness. Cultivating spontaneity and physical activity can help ignite your inner fire.',
  },
  Earth: {
    dominant: 'You\'re grounded, practical, and reliable. You build things that last and have a strong connection to the material world and physical senses.',
    lacking: 'You may find it challenging to stay organized or follow through on practical matters. Establishing routines and connecting with nature can help.',
  },
  Air: {
    dominant: 'You\'re intellectually curious, communicative, and socially adept. Ideas flow easily to you, and you thrive on mental stimulation and connection.',
    lacking: 'You may sometimes struggle to articulate your thoughts or feel disconnected from intellectual pursuits. Journaling and conversation can stimulate this energy.',
  },
  Water: {
    dominant: 'You\'re deeply intuitive, emotionally rich, and empathetic. You navigate the world through feeling and have powerful instincts about people and situations.',
    lacking: 'You may find it difficult to access or express emotions. Creative outlets and time near water can help you connect with your emotional depth.',
  },
}

export const MODALITY_INTERPRETATIONS: Record<Modality, { dominant: string; lacking: string }> = {
  Cardinal: {
    dominant: 'You\'re a natural initiator — always ready to start new projects and lead the charge. You bring fresh energy and direction wherever you go.',
    lacking: 'You may hesitate to start new ventures or take the lead. Setting small, achievable goals can help build your initiative muscle.',
  },
  Fixed: {
    dominant: 'You\'re deeply persistent and determined. Once committed, you see things through to completion with unwavering focus and resilience.',
    lacking: 'You may struggle with follow-through or consistency. Building habits around commitment can strengthen your staying power.',
  },
  Mutable: {
    dominant: 'You\'re exceptionally adaptable and versatile. You flow with change easily and can see multiple perspectives simultaneously.',
    lacking: 'You may resist change or find it hard to be flexible. Practicing spontaneity and embracing uncertainty can help develop adaptability.',
  },
}
