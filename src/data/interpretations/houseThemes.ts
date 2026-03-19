import type { ZodiacSign, PlanetName } from '../../engine/types'

export interface HouseTheme {
  house: number
  name: string
  theme: string
  naturalRuler: PlanetName
  naturalSign: ZodiacSign
  brief: string
}

export const HOUSE_THEMES: HouseTheme[] = [
  {
    house: 1,
    name: 'House of Self',
    theme: 'Identity, appearance, first impressions',
    naturalRuler: 'Mars',
    naturalSign: 'Aries',
    brief: 'Your rising sign and 1st house shape how you present yourself to the world — your physical appearance, demeanor, and the energy people first encounter when they meet you.',
  },
  {
    house: 2,
    name: 'House of Value',
    theme: 'Money, possessions, self-worth',
    naturalRuler: 'Venus',
    naturalSign: 'Taurus',
    brief: 'The 2nd house governs your material resources, earning ability, and personal values. It reveals your relationship with money and what you consider truly valuable.',
  },
  {
    house: 3,
    name: 'House of Communication',
    theme: 'Communication, siblings, short trips, learning',
    naturalRuler: 'Mercury',
    naturalSign: 'Gemini',
    brief: 'The 3rd house rules how you think, communicate, and process information. It also governs siblings, neighbors, and your immediate environment.',
  },
  {
    house: 4,
    name: 'House of Home',
    theme: 'Home, family, roots, emotional foundation',
    naturalRuler: 'Moon',
    naturalSign: 'Cancer',
    brief: 'The 4th house is the foundation of your chart — your home, family lineage, emotional roots, and the private self you show only to those closest to you.',
  },
  {
    house: 5,
    name: 'House of Pleasure',
    theme: 'Creativity, romance, children, self-expression',
    naturalRuler: 'Sun',
    naturalSign: 'Leo',
    brief: 'The 5th house is where you express your creative spark, experience romance and joy, and connect with your inner child. It rules what brings you pleasure.',
  },
  {
    house: 6,
    name: 'House of Health',
    theme: 'Daily work, health, service, routines',
    naturalRuler: 'Mercury',
    naturalSign: 'Virgo',
    brief: 'The 6th house governs your daily routines, work habits, and physical health. It reveals how you serve others and maintain your wellbeing through everyday practices.',
  },
  {
    house: 7,
    name: 'House of Partnership',
    theme: 'Marriage, partnerships, open enemies',
    naturalRuler: 'Venus',
    naturalSign: 'Libra',
    brief: 'The 7th house rules committed partnerships — both romantic and business. It shows what you seek in a partner and how you relate in one-on-one relationships.',
  },
  {
    house: 8,
    name: 'House of Transformation',
    theme: 'Shared resources, intimacy, death, rebirth',
    naturalRuler: 'Pluto',
    naturalSign: 'Scorpio',
    brief: 'The 8th house governs deep transformation, shared finances, intimacy, and the mysteries of life and death. It reveals how you handle crisis and profound change.',
  },
  {
    house: 9,
    name: 'House of Philosophy',
    theme: 'Higher education, travel, beliefs, meaning',
    naturalRuler: 'Jupiter',
    naturalSign: 'Sagittarius',
    brief: 'The 9th house expands your horizons through travel, higher education, philosophy, and spiritual seeking. It reveals your quest for meaning and truth.',
  },
  {
    house: 10,
    name: 'House of Career',
    theme: 'Career, public image, reputation, authority',
    naturalRuler: 'Saturn',
    naturalSign: 'Capricorn',
    brief: 'The 10th house — your Midheaven — represents your public role, career ambitions, and legacy. It shows what you strive to achieve and how the world sees your accomplishments.',
  },
  {
    house: 11,
    name: 'House of Community',
    theme: 'Friends, groups, hopes, humanitarian goals',
    naturalRuler: 'Uranus',
    naturalSign: 'Aquarius',
    brief: 'The 11th house rules your social networks, friendships, and aspirations for the future. It shows how you contribute to the collective and what you hope to achieve.',
  },
  {
    house: 12,
    name: 'House of the Unconscious',
    theme: 'Spirituality, solitude, hidden strengths, karma',
    naturalRuler: 'Neptune',
    naturalSign: 'Pisces',
    brief: 'The 12th house is the realm of the unconscious, spirituality, and hidden dimensions of life. It reveals your connection to the divine, your dreams, and the patterns you must transcend.',
  },
]

/** Get the theme data for a specific house number (1-12) */
export function getHouseTheme(house: number): HouseTheme {
  return HOUSE_THEMES[house - 1]
}
