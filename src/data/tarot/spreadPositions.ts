import type { TarotZone } from '../../components/tarot/types'

export interface SpreadPosition {
  id: string
  number: number
  name: string
  description: string
  zone: TarotZone
  gridArea: string
}

// The canonical ten-position Celtic Cross spread.
// gridArea values correspond to the .celtic-cross-grid template in CelticCrossReading.tsx.
export const CELTIC_CROSS_POSITIONS: SpreadPosition[] = [
  {
    id: 'present-situation',
    number: 1,
    name: 'Present Situation',
    description:
      'The heart of the matter. What is present and central right now — the environment, the question, the dominant energy the querent is living inside. This card defines the field in which everything else plays out.',
    zone: 'cross',
    gridArea: 'p12',
  },
  {
    id: 'challenge',
    number: 2,
    name: 'Challenge',
    description:
      'What crosses the situation. The obstacle, the tension, the force that complicates, opposes, or tests. In the traditional spread this card crosses card 1 at a 90° angle — the crossing is physical and symbolic. It may be a block, a gift disguised as resistance, or a necessary friction.',
    zone: 'cross',
    gridArea: 'p12',
  },
  {
    id: 'unconscious-influence',
    number: 3,
    name: 'Unconscious Influence',
    description:
      'What lies beneath awareness. The foundation, the root cause, the buried motivation or pattern driving the situation from below the surface. This is what the querent may not see but which shapes everything above it.',
    zone: 'cross',
    gridArea: 'p3',
  },
  {
    id: 'recent-past',
    number: 4,
    name: 'Recent Past',
    description:
      'What is passing away or has recently completed. An energy, relationship, or phase in retreat. Relevant because it explains how the present situation arrived — the momentum that carried the querent to this moment.',
    zone: 'cross',
    gridArea: 'p4',
  },
  {
    id: 'conscious-goal',
    number: 5,
    name: 'Conscious Goal',
    description:
      'What the querent is hoping for, aiming toward, or consciously aware of as the desired outcome. The aspiration, the ideal, the direction of the wish. Not necessarily what will happen — what is wanted.',
    zone: 'cross',
    gridArea: 'p5',
  },
  {
    id: 'near-future',
    number: 6,
    name: 'Near Future',
    description:
      'What is approaching — not the ultimate outcome, but the next development. The energy or event moving into view on the horizon. A marker of what comes next in the near term if current trajectories hold.',
    zone: 'cross',
    gridArea: 'p6',
  },
  {
    id: 'inner-state',
    number: 7,
    name: 'Inner State',
    description:
      "The querent's internal relationship to the situation — fears, attitudes, emotional position. How they feel about all of this inside, regardless of how they present it externally. The private face of the question.",
    zone: 'staff',
    gridArea: 'p7',
  },
  {
    id: 'external-environment',
    number: 8,
    name: 'External Environment',
    description:
      'The people, forces, and energies surrounding the querent — the social and material context in which the situation is unfolding. What others bring, what the world is offering or withholding.',
    zone: 'staff',
    gridArea: 'p8',
  },
  {
    id: 'hopes-and-fears',
    number: 9,
    name: 'Hopes and Fears',
    description:
      'The deepest hope, the deepest fear — often the same thing. What is most wanted and most dreaded simultaneously. The ambivalence at the center of the question, the double edge of the longing.',
    zone: 'staff',
    gridArea: 'p9',
  },
  {
    id: 'outcome',
    number: 10,
    name: 'Outcome',
    description:
      'The most likely resolution or direction of movement if current trajectories continue. Not fate — a probable crystallization given what is already in motion. The place toward which the constellation is pointing.',
    zone: 'staff',
    gridArea: 'p10',
  },
]
