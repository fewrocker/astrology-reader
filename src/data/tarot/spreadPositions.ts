import type { SpreadPosition, SpreadType } from './types'
export type { SpreadType, SpreadPosition } from './types'

export const SPREAD_POSITIONS: SpreadPosition[] = [
  // Single card
  {
    id: 'single',
    label: 'The Card',
    meaning: 'This card arrives as both mirror and messenger. It reflects something present in your sky, your emotional landscape, or your circumstance — and it offers a lens through which to see it differently. The single card asks nothing except that you sit with it long enough to let it speak.',
    spreadType: 'single',
    positionIndex: 0,
  },

  // Past / Present / Future
  {
    id: 'past',
    label: 'The Past',
    meaning: 'What has recently concluded, what you have moved through, or what pattern has formed the ground beneath this moment. The past position does not ask you to revisit history but to understand which energies from it are still shaping the present without your full awareness.',
    spreadType: 'three-past-present-future',
    positionIndex: 0,
  },
  {
    id: 'present',
    label: 'The Present',
    meaning: 'Where you stand now — the energy immediately available to you, the situation as it currently exists, the quality of this particular moment in your life. The present position is neither past memory nor future projection; it is what is true as the cards are being laid.',
    spreadType: 'three-past-present-future',
    positionIndex: 1,
  },
  {
    id: 'future',
    label: 'The Future',
    meaning: 'The direction of movement — not a fixed destination, but the arc of energy that this reading is currently tracing. Subject to your choices, your attention, and the larger forces at work in your life. The future position reveals where current energies are pointing, not where they must inevitably arrive.',
    spreadType: 'three-past-present-future',
    positionIndex: 2,
  },

  // Situation / Challenge / Advice
  {
    id: 'situation',
    label: 'The Situation',
    meaning: 'The core of what is present — the context, the facts, the condition you are navigating. This position does not evaluate or judge; it simply reflects the actual landscape of your current circumstances as clearly as the cards can see it.',
    spreadType: 'three-situation-challenge-advice',
    positionIndex: 0,
  },
  {
    id: 'challenge',
    label: 'The Challenge',
    meaning: 'What is creating friction, resistance, or pressure. This is not necessarily an obstacle to be removed — it may be a constraint that defines the shape of the opportunity, a tension that is refining something, or a difficulty that is asking for a quality you have not yet fully developed.',
    spreadType: 'three-situation-challenge-advice',
    positionIndex: 1,
  },
  {
    id: 'advice',
    label: 'The Advice',
    meaning: 'The symbolic direction. What the cards suggest attending to, releasing, or embracing as you move forward. The advice position is not a command but an orientation — a direction in which the symbolic intelligence of the spread is pointing, offered for your own discernment.',
    spreadType: 'three-situation-challenge-advice',
    positionIndex: 2,
  },

  // Mind / Heart / Action
  {
    id: 'mind',
    label: 'The Mind',
    meaning: 'Your cognitive frame — the thoughts, patterns of reasoning, or narratives shaping how you see this situation. The mind position reveals not what is objectively true but how your particular way of thinking is filtering what is true, and whether that filter is serving you or limiting you.',
    spreadType: 'three-mind-heart-action',
    positionIndex: 0,
  },
  {
    id: 'heart',
    label: 'The Heart',
    meaning: 'Your emotional truth — what you feel beneath the thoughts, what matters to you at a level that logic cannot fully reach. The heart position speaks to the desires, fears, griefs, and loves that are shaping your experience from below the surface of rational deliberation.',
    spreadType: 'three-mind-heart-action',
    positionIndex: 1,
  },
  {
    id: 'action',
    label: 'The Action',
    meaning: 'What wants to move through you — the step, the gesture, the decision that would put your mind and heart into motion in the same direction. The action position is the bridge between understanding and doing, between knowing and acting on what you know.',
    spreadType: 'three-mind-heart-action',
    positionIndex: 2,
  },

  // Self / Other / Bridge
  {
    id: 'self',
    label: 'The Self',
    meaning: 'Your position in this dynamic — your needs, your energy, your part in the pattern. The self position asks you to see yourself as clearly as you see the situation, with neither harsh judgment nor self-protective softening.',
    spreadType: 'three-self-other-bridge',
    positionIndex: 0,
  },
  {
    id: 'other',
    label: 'The Other',
    meaning: 'The person, force, or circumstance on the other side of this dynamic, as it appears to the cards. The other position is not necessarily a literal other person — it may be a relationship pattern, an external circumstance, or a part of yourself that feels separate from the self you normally identify with.',
    spreadType: 'three-self-other-bridge',
    positionIndex: 1,
  },
  {
    id: 'bridge',
    label: 'The Bridge',
    meaning: 'What connects, reconciles, or transforms the relationship between the two. The possibility the spread is pointing toward — not a solution imposed from outside but the quality of energy or approach that could create something new from the tension between self and other.',
    spreadType: 'three-self-other-bridge',
    positionIndex: 2,
  },

  // Theme / Shadow / Gift
  {
    id: 'theme',
    label: 'The Theme',
    meaning: 'The central pattern — what this period of your life is teaching you, whether or not you have named it yet. The theme position reveals the larger arc of which your current circumstances are a specific expression, the lesson that keeps appearing in different forms until it is genuinely understood.',
    spreadType: 'three-theme-shadow-gift',
    positionIndex: 0,
  },
  {
    id: 'shadow',
    label: 'The Shadow',
    meaning: 'What has been operating unseen — the part of this pattern that lives below conscious awareness and shapes outcomes from there. The shadow position does not reveal anything shameful; it reveals what has been excluded from the light, and in that exclusion has accumulated the power that operates without your oversight.',
    spreadType: 'three-theme-shadow-gift',
    positionIndex: 1,
  },
  {
    id: 'gift',
    label: 'The Gift',
    meaning: 'What becomes available when the theme is engaged consciously and the shadow is met honestly. The gift is rarely obvious — it is usually the capacity, the quality, or the understanding that the entire pattern has been developing in you, and that is only accessible from the other side of honest engagement with both theme and shadow.',
    spreadType: 'three-theme-shadow-gift',
    positionIndex: 2,
  },

  // Celtic Cross — 10 positions
  {
    id: 'celtic-1-present',
    label: 'Present Situation',
    meaning: 'The heart of the reading — the energy at the center of what you are living through. This card contains everything: the condition, the quality, the essential nature of the moment you are in. Every other card in the Celtic Cross speaks in relation to this one.',
    spreadType: 'celtic-cross',
    positionIndex: 0,
  },
  {
    id: 'celtic-2-challenge',
    label: 'The Challenge',
    meaning: 'Crossed over the present — what crosses you. This may be an obstacle, a complicating force, or paradoxically, something that both challenges and supports you simultaneously. The crossing card is in dialogue with the center: it neither negates it nor affirms it but changes what the center means by being placed over it.',
    spreadType: 'celtic-cross',
    positionIndex: 1,
  },
  {
    id: 'celtic-3-unconscious',
    label: 'Unconscious Influence',
    meaning: 'What lies beneath conscious awareness and shapes events from below. You may not see this, but the cards do — and often what lives in this position is more responsible for the shape of the present situation than anything in the other positions. Meeting what is here with honesty is the most transformative work the Celtic Cross offers.',
    spreadType: 'celtic-cross',
    positionIndex: 2,
  },
  {
    id: 'celtic-4-recent-past',
    label: 'Recent Past',
    meaning: 'What has just moved through — the events, patterns, or energies that have led to this moment. The recent past position shows the trajectory you have been on, the conditions from which the present situation has emerged, the momentum that is still carrying you even if the events themselves are over.',
    spreadType: 'celtic-cross',
    positionIndex: 3,
  },
  {
    id: 'celtic-5-conscious-goal',
    label: 'Conscious Goal',
    meaning: 'What you believe you want, or what you are consciously working toward. The aspiration at the surface — which may or may not be aligned with the deeper goal revealed by the unconscious influence card. The distance between what you consciously want and what is in positions 3 and 8 tells you something important about yourself.',
    spreadType: 'celtic-cross',
    positionIndex: 4,
  },
  {
    id: 'celtic-6-near-future',
    label: 'Near Future',
    meaning: 'The next movement — what approaches in the immediate weeks ahead if the current trajectory continues. The near future is not fixed; it is the direction of travel as the cards currently read it, and it is entirely subject to the quality of awareness and choice that the rest of the reading calls forth.',
    spreadType: 'celtic-cross',
    positionIndex: 5,
  },
  {
    id: 'celtic-7-inner-state',
    label: 'Your Inner State',
    meaning: 'Who you are being in this situation — your relationship to yourself as you navigate what is present. This position reveals not how you present to others but how you are actually inhabiting this experience: the quality of your inner life, the state of your self-relationship, the inner posture from which you are meeting everything the other cards describe.',
    spreadType: 'celtic-cross',
    positionIndex: 6,
  },
  {
    id: 'celtic-8-environment',
    label: 'External Environment',
    meaning: 'The forces and people around you — the social, relational, and circumstantial field you are moving through. Position 8 shows how others see you or the situation, and what energies in the external environment are relevant to how the reading will ultimately resolve. The gap between positions 7 and 8 often reveals important information.',
    spreadType: 'celtic-cross',
    positionIndex: 7,
  },
  {
    id: 'celtic-9-hopes-fears',
    label: 'Hopes and Fears',
    meaning: 'The most complex position in the spread. Often a single card embodies what you most want and what you most dread simultaneously — because hope and fear are frequently two faces of the same deep investment. What you fear losing is often exactly what you most deeply hope for. This position deserves the longest meditation of any in the Celtic Cross.',
    spreadType: 'celtic-cross',
    positionIndex: 8,
  },
  {
    id: 'celtic-10-outcome',
    label: 'The Outcome',
    meaning: 'Where the current constellation of energies is pointing. Not fate — the direction of the current arc, the destination toward which all the other cards are moving if their energies remain as they are. Every card in the spread converges here: what the present holds, what the challenge demands, what the unconscious influences, what the environment provides, and what the inner state makes possible.',
    spreadType: 'celtic-cross',
    positionIndex: 9,
  },
]

// Celtic Cross positions for the CelticCrossReading component — uses gridArea for CSS grid layout.
export interface CelticCrossPosition {
  id: string
  number: number
  name: string
  description: string
  zone: 'cross' | 'staff'
  gridArea: string
}

export const CELTIC_CROSS_POSITIONS: CelticCrossPosition[] = [
  {
    id: 'present-situation',
    number: 1,
    name: 'Present Situation',
    description: 'The heart of the matter. What is present and central right now — the environment, the question, the dominant energy the querent is living inside. This card defines the field in which everything else plays out.',
    zone: 'cross',
    gridArea: 'p12',
  },
  {
    id: 'challenge',
    number: 2,
    name: 'Challenge',
    description: 'What crosses the situation. The obstacle, the tension, the force that complicates, opposes, or tests. In the traditional spread this card crosses card 1 at a 90° angle — the crossing is physical and symbolic. It may be a block, a gift disguised as resistance, or a necessary friction.',
    zone: 'cross',
    gridArea: 'p12',
  },
  {
    id: 'unconscious-influence',
    number: 3,
    name: 'Unconscious Influence',
    description: 'What lies beneath awareness. The foundation, the root cause, the buried motivation or pattern driving the situation from below the surface. This is what the querent may not see but which shapes everything above it.',
    zone: 'cross',
    gridArea: 'p3',
  },
  {
    id: 'recent-past',
    number: 4,
    name: 'Recent Past',
    description: 'What is passing away or has recently completed. An energy, relationship, or phase in retreat. Relevant because it explains how the present situation arrived — the momentum that carried the querent to this moment.',
    zone: 'cross',
    gridArea: 'p4',
  },
  {
    id: 'conscious-goal',
    number: 5,
    name: 'Conscious Goal',
    description: 'What the querent is hoping for, aiming toward, or consciously aware of as the desired outcome. The aspiration, the ideal, the direction of the wish. Not necessarily what will happen — what is wanted.',
    zone: 'cross',
    gridArea: 'p5',
  },
  {
    id: 'near-future',
    number: 6,
    name: 'Near Future',
    description: 'What is approaching — not the ultimate outcome, but the next development. The energy or event moving into view on the horizon. A marker of what comes next in the near term if current trajectories hold.',
    zone: 'cross',
    gridArea: 'p6',
  },
  {
    id: 'inner-state',
    number: 7,
    name: 'Inner State',
    description: "The querent's internal relationship to the situation — fears, attitudes, emotional position. How they feel about all of this inside, regardless of how they present it externally. The private face of the question.",
    zone: 'staff',
    gridArea: 'p7',
  },
  {
    id: 'external-environment',
    number: 8,
    name: 'External Environment',
    description: 'The people, forces, and energies surrounding the querent — the social and material context in which the situation is unfolding. What others bring, what the world is offering or withholding.',
    zone: 'staff',
    gridArea: 'p8',
  },
  {
    id: 'hopes-and-fears',
    number: 9,
    name: 'Hopes and Fears',
    description: 'The deepest hope, the deepest fear — often the same thing. What is most wanted and most dreaded simultaneously. The ambivalence at the center of the question, the double edge of the longing.',
    zone: 'staff',
    gridArea: 'p9',
  },
  {
    id: 'outcome',
    number: 10,
    name: 'Outcome',
    description: 'The most likely resolution or direction of movement if current trajectories continue. Not fate — a probable crystallization given what is already in motion. The place toward which the constellation is pointing.',
    zone: 'staff',
    gridArea: 'p10',
  },
]
