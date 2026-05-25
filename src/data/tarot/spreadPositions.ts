import type { SpreadMode, SpreadPosition } from '../../types/tarot'

export interface SpreadDefinition {
  name: string
  description: string
  positions: [SpreadPosition, SpreadPosition, SpreadPosition]
  serializationOrder: [0 | 1 | 2, 0 | 1 | 2, 0 | 1 | 2]
  serializationRationale: string
}

export const SPREAD_DEFINITIONS: Record<SpreadMode, SpreadDefinition> = {
  'past-present-future': {
    name: 'Past / Present / Future',
    description: 'Understand a trajectory — where you have been, where you are, where you are going.',
    positions: [
      {
        label: 'Past',
        meaning: 'What has brought you to this moment; the energy or pattern that has been operating beneath the surface.',
      },
      {
        label: 'Present',
        meaning: 'The active situation; what is true right now, neither amplified nor minimized.',
      },
      {
        label: 'Future',
        meaning: 'The direction of movement; what is emerging if the present trajectory continues.',
      },
    ],
    serializationOrder: [0, 1, 2],
    serializationRationale: 'Cards are presented in temporal sequence: Past first because it establishes the premise; Present second because it creates the active tension; Future third because it names the direction.',
  },

  'situation-challenge-advice': {
    name: 'Situation / Challenge / Advice',
    description: 'Navigate a specific difficulty — understand what is happening, what is in the way, and what to do.',
    positions: [
      {
        label: 'Situation',
        meaning: 'The current circumstances as they stand; the premise of the reading.',
      },
      {
        label: 'Challenge',
        meaning: 'The central obstacle or the energy working against resolution.',
      },
      {
        label: 'Advice',
        meaning: 'What the symbolic field suggests; not a command but an invitation.',
      },
    ],
    serializationOrder: [0, 1, 2],
    serializationRationale: 'Cards are presented in narrative logic: Situation first because it establishes the premise; Challenge second because it creates the complication; Advice third because it names the resolution path.',
  },

  'mind-heart-action': {
    name: 'Mind / Heart / Action',
    description: 'Align thinking and feeling — what you know, what you feel, and what to do next.',
    positions: [
      {
        label: 'Mind',
        meaning: 'The cognitive frame; what you are thinking, planning, or over-analyzing.',
      },
      {
        label: 'Heart',
        meaning: 'The emotional truth; what you are feeling beneath the thinking.',
      },
      {
        label: 'Action',
        meaning: 'What the synthesis of mind and heart calls you toward.',
      },
    ],
    serializationOrder: [0, 1, 2],
    serializationRationale: 'Cards are presented inside-out, from cognition to feeling to behavior: Mind first because it names the conscious frame; Heart second because it reveals the emotional substrate; Action third because it emerges from both.',
  },

  'self-other-bridge': {
    name: 'Self / Other / Bridge',
    description: 'Understand a relationship — your energy, another energy, and what connects them.',
    positions: [
      {
        label: 'Self',
        meaning: 'Your energy, your position, what you are bringing into this situation.',
      },
      {
        label: 'Other',
        meaning: 'The external energy — a person, a situation, or a force outside your control.',
      },
      {
        label: 'Bridge',
        meaning: 'What connects or could connect these two energies; the point of meeting.',
      },
    ],
    serializationOrder: [0, 1, 2],
    serializationRationale: 'Cards are presented in relational order: Self first because it names your position; Other second because it names the external force; Bridge last because the bridge card is always the synthesis, legible only after both sides are named.',
  },

  'theme-shadow-gift': {
    name: 'Theme / Shadow / Gift',
    description: 'Integrate what is hidden — the dominant pattern, what is avoided, and what becomes available.',
    positions: [
      {
        label: 'Theme',
        meaning: 'The dominant energy or pattern currently active in your life.',
      },
      {
        label: 'Shadow',
        meaning: 'What is hidden, avoided, or unacknowledged; the unconscious dimension.',
      },
      {
        label: 'Gift',
        meaning: 'What becomes available when the shadow is integrated.',
      },
    ],
    serializationOrder: [0, 1, 2],
    serializationRationale: 'Cards are presented in integrative order: Theme first because it names the dominant surface; Shadow second because it names what is avoided; Gift last because the gift is only legible after the shadow is named.',
  },
}
