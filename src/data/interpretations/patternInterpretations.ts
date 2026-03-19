import type { AspectPatternType } from '../../engine/aspects'

export interface PatternInterpretation {
  brief: string
  detail: string
  symbol: string
}

export const PATTERN_INTERPRETATIONS: Record<AspectPatternType, PatternInterpretation> = {
  'Grand Trine': {
    symbol: '△',
    brief: 'A Grand Trine represents a powerful flow of harmonious energy between three planets, forming a triangle of ease and natural talent.',
    detail:
      'The Grand Trine is one of the most fortunate aspect patterns in astrology. Three planets, each approximately 120° apart, create a closed circuit of flowing energy. This pattern indicates innate gifts and areas of life where things come naturally — almost effortlessly. The element of the Grand Trine (Fire, Earth, Air, or Water) colors its expression: Fire Grand Trines bring creative confidence and inspiration; Earth Grand Trines grant practical mastery and material stability; Air Grand Trines bestow intellectual brilliance and social grace; Water Grand Trines deepen emotional intelligence and intuitive gifts. The challenge of a Grand Trine is complacency — because things come so easily in these areas, there may be less motivation to develop them fully. The key is to consciously channel this flowing energy into productive action rather than taking it for granted.',
  },

  'T-Square': {
    symbol: '⊤',
    brief: 'A T-Square creates dynamic tension between three planets, driving ambition, growth, and the urgent need to resolve inner conflict.',
    detail:
      'The T-Square is formed when two planets in opposition (180°) are both squared (90°) by a third planet — the apex. This creates a persistent source of tension and frustration that, paradoxically, becomes a powerful engine for achievement. The apex planet is the focal point where the opposing energies converge and demand resolution. People with T-Squares are rarely complacent; the constant inner pressure pushes them to take action, overcome obstacles, and develop strength in the areas ruled by the apex planet. The modality of the T-Square shapes its expression: Cardinal T-Squares drive initiative and leadership; Fixed T-Squares build determination and staying power; Mutable T-Squares foster adaptability and intellectual restlessness. The "missing leg" — the empty sign/house opposite the apex — often represents an area of life that, when consciously developed, brings the entire pattern into balance.',
  },

  'Grand Cross': {
    symbol: '✚',
    brief: 'A Grand Cross locks four planets into a pattern of maximum tension, creating extraordinary drive and the capacity to handle intense pressure.',
    detail:
      'The Grand Cross (or Grand Square) is formed when four planets create two oppositions that square each other, forming a cross pattern. This is one of the most challenging — and potentially powerful — aspect configurations. It creates pressure from all four directions simultaneously, leaving no easy outlet. People with a Grand Cross often feel pulled in multiple directions and face persistent challenges that demand resilience, flexibility, and inner strength. However, this same pressure forges remarkable character. Once the individual learns to balance these competing energies rather than being overwhelmed by them, the Grand Cross becomes a source of extraordinary capability and accomplishment. The key is integration: learning that all four points of the cross are parts of a whole, not separate battles to be fought.',
  },

  'Yod': {
    symbol: '⚻',
    brief: 'A Yod, the "Finger of God," points to a special destiny or life mission, creating a sense of fated purpose that demands adjustment and growth.',
    detail:
      'The Yod (also called the "Finger of God" or "Finger of Fate") is formed when two planets in sextile (60°) both form quincunx aspects (150°) to a third planet — the apex. This creates a long, narrow triangle that seems to "point" at the apex planet, suggesting a fated quality or sense of special purpose connected to that planet\'s themes. The quincunx is an aspect of adjustment and subtle discomfort — things that don\'t quite fit together but must be reconciled. People with a Yod often feel a nagging sense that they have a specific mission or calling, though it may take years to understand what it is. The apex planet represents an area of constant fine-tuning, where the person must learn to integrate energies that don\'t naturally harmonize. When activated by transits, the Yod can bring pivotal turning points and moments of destiny. The sextile base provides the talents and resources needed; the apex shows where those gifts must be directed.',
  },
}

/**
 * Get element-specific flavor text for Grand Trines.
 */
export function getPatternElementFlavor(element: string): string | null {
  const flavors: Record<string, string> = {
    Fire: 'This Fire Grand Trine ignites creative vision, courage, and an infectious enthusiasm that inspires others.',
    Earth: 'This Earth Grand Trine grants practical wisdom, material stability, and a natural mastery of the physical world.',
    Air: 'This Air Grand Trine bestows intellectual brilliance, communication gifts, and effortless social connection.',
    Water: 'This Water Grand Trine deepens emotional intelligence, psychic sensitivity, and compassionate understanding.',
  }
  return flavors[element] ?? null
}

/**
 * Get modality-specific flavor text for T-Squares.
 */
export function getTSquareModalityFlavor(modality: string): string | null {
  const flavors: Record<string, string> = {
    Cardinal: 'This Cardinal T-Square drives relentless initiative and leadership. You are compelled to start new ventures and take charge, even when the path is unclear.',
    Fixed: 'This Fixed T-Square builds extraordinary determination and staying power. You hold on through immense pressure, and your persistence forges lasting achievement.',
    Mutable: 'This Mutable T-Square fosters intellectual restlessness and versatility. You adapt constantly, juggling multiple perspectives and finding creative solutions at every turn.',
  }
  return flavors[modality] ?? null
}
