import type { PlanetName, ZodiacSign, Element, Modality } from '../../engine/types'
import type { AspectType } from '../../engine/aspects'
import type { FocusArea } from '../../context/appState'

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
    description: 'Love is primarily governed by Venus (romantic attraction and love language), the 7th house (committed partnerships and marriage), 5th house (romance, dating, and creative passion), and 8th house (deep intimacy and emotional bonding). Your Moon sign shows your emotional needs in love, while Mars reveals how you pursue and express desire. The sign on your 7th house cusp describes the type of partner you attract.',
  },
  career: {
    houses: [2, 6, 10],
    planets: ['Saturn', 'Jupiter', 'Sun', 'Mars'],
    description: 'Career is ruled by the Midheaven (10th house cusp) which describes your public reputation, Saturn (discipline, ambition, and long-term career structure), Jupiter (professional growth and opportunities), and the 6th house (daily work environment and routines). Your Sun sign shapes your core professional identity, while the 10th house ruler\'s placement shows where your career path leads. Mars indicates your drive and competitive edge at work.',
  },
  growth: {
    houses: [1, 9, 12],
    planets: ['Sun', 'Moon', 'Pluto', 'Jupiter'],
    description: 'Personal growth connects to the 1st house (self-awareness and identity evolution), 9th house (higher education, philosophy, and expansion of worldview), 12th house (subconscious patterns, spiritual growth, and inner work), and transformative Pluto (deep psychological change). Jupiter shows where you grow most easily, while your Sun-Moon relationship reveals the core tension driving your personal development.',
  },
  health: {
    houses: [1, 6, 8],
    planets: ['Sun', 'Mars', 'Saturn', 'Moon'],
    description: 'Health relates to the 1st house (physical constitution and vitality), 6th house (health habits, daily routines, and wellness practices), Mars (physical energy, inflammation, and exercise), and Saturn (bones, teeth, chronic conditions, and endurance). Your Moon influences emotional well-being and digestive health, while the Sun represents your core vitality and heart health.',
  },
  finances: {
    houses: [2, 8, 11],
    planets: ['Venus', 'Jupiter', 'Pluto', 'Saturn'],
    description: 'Finances are linked to the 2nd house (earned income, personal resources, and self-worth), 8th house (shared resources, investments, inheritance, and debt), Venus (values and what you attract), and Jupiter (abundance and financial opportunities). Pluto shows potential for financial transformation and power through resources, while Saturn indicates financial discipline and long-term wealth building. The 11th house connects to income from career and group ventures.',
  },
  spirituality: {
    houses: [8, 9, 12],
    planets: ['Neptune', 'Pluto', 'Moon', 'Jupiter'],
    description: 'Spirituality connects to Neptune (transcendence, mysticism, and divine connection), the 12th house (meditation, solitude, the unconscious, and past-life patterns), 9th house (spiritual philosophy, faith traditions, and the search for meaning), and the 8th house (transformation, death-rebirth cycles, and occult knowledge). Your Moon reveals your instinctive spiritual needs, while Jupiter shows the path to wisdom and faith.',
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
