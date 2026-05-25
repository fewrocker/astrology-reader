export type SpreadType =
  | 'single'
  | 'three-past-present-future'
  | 'three-situation-challenge-advice'
  | 'three-mind-heart-action'
  | 'three-self-other-bridge'
  | 'three-theme-shadow-gift'
  | 'celtic-cross'

export interface SpreadPosition {
  spreadType: SpreadType
  positionIndex: number
  label: string
  meaning: string
}

export const SPREAD_POSITIONS: Record<SpreadType, SpreadPosition[]> = {
  'single': [
    {
      spreadType: 'single',
      positionIndex: 0,
      label: 'Your Card',
      meaning: 'The single card drawn speaks to the heart of your question or the energy present in this moment. It is the oracle\'s complete message — not a fragment but a whole truth distilled into one image.',
    },
  ],
  'three-past-present-future': [
    {
      spreadType: 'three-past-present-future',
      positionIndex: 0,
      label: 'Past',
      meaning: 'The energy, event, or pattern that led you here. This card holds the root of what you are navigating — the history that shaped the present moment.',
    },
    {
      spreadType: 'three-past-present-future',
      positionIndex: 1,
      label: 'Present',
      meaning: 'The current situation, feeling, or dynamic at the center of your experience. This card reflects what is alive right now — the terrain you stand on.',
    },
    {
      spreadType: 'three-past-present-future',
      positionIndex: 2,
      label: 'Future',
      meaning: 'The likely trajectory or invitation emerging from the present. This card illuminates where the path is leading — the energy coming into form if current patterns continue.',
    },
  ],
  'three-situation-challenge-advice': [
    {
      spreadType: 'three-situation-challenge-advice',
      positionIndex: 0,
      label: 'Situation',
      meaning: 'The core of what you are facing — the circumstance, question, or dynamic at the center of your reading. This card names the field you are navigating.',
    },
    {
      spreadType: 'three-situation-challenge-advice',
      positionIndex: 1,
      label: 'Challenge',
      meaning: 'The obstacle, tension, or shadow dimension of this situation. This card does not judge — it illuminates what is blocking, complicating, or asking for honest confrontation.',
    },
    {
      spreadType: 'three-situation-challenge-advice',
      positionIndex: 2,
      label: 'Advice',
      meaning: 'The oracle\'s guidance for moving through the situation with wisdom. This card suggests an approach, a stance, or an action that aligns with your deepest knowing.',
    },
  ],
  'three-mind-heart-action': [
    {
      spreadType: 'three-mind-heart-action',
      positionIndex: 0,
      label: 'Mind',
      meaning: 'What your thinking mind is processing — the beliefs, patterns of reasoning, or mental narratives at work beneath the surface of this situation.',
    },
    {
      spreadType: 'three-mind-heart-action',
      positionIndex: 1,
      label: 'Heart',
      meaning: 'What your feeling self knows — the emotional truth, desire, wound, or longing that lives beneath what you consciously acknowledge. The body\'s wisdom.',
    },
    {
      spreadType: 'three-mind-heart-action',
      positionIndex: 2,
      label: 'Action',
      meaning: 'What you are being called to do, embody, or release. This card speaks not to analysis but to movement — the next concrete or symbolic step your path requires.',
    },
  ],
  'three-self-other-bridge': [
    {
      spreadType: 'three-self-other-bridge',
      positionIndex: 0,
      label: 'Self',
      meaning: 'Your own position in this dynamic — your needs, projections, blind spots, and strengths as they relate to the relationship or encounter at the center of your reading.',
    },
    {
      spreadType: 'three-self-other-bridge',
      positionIndex: 1,
      label: 'Other',
      meaning: 'The energy, perspective, or position of the other person or force in this dynamic. This card invites you to see through a lens that is not your own.',
    },
    {
      spreadType: 'three-self-other-bridge',
      positionIndex: 2,
      label: 'Bridge',
      meaning: 'What can connect, heal, or transform the relationship between self and other. The third card holds the possibility — the gesture, understanding, or shift that opens new ground.',
    },
  ],
  'three-theme-shadow-gift': [
    {
      spreadType: 'three-theme-shadow-gift',
      positionIndex: 0,
      label: 'Theme',
      meaning: 'The central archetype or lesson that this moment in your life is organized around. This card names the larger pattern you are in relationship with.',
    },
    {
      spreadType: 'three-theme-shadow-gift',
      positionIndex: 1,
      label: 'Shadow',
      meaning: 'The hidden, avoided, or unconscious dimension of this theme. The shadow is not the enemy — it is the part of yourself asking to be seen and integrated.',
    },
    {
      spreadType: 'three-theme-shadow-gift',
      positionIndex: 2,
      label: 'Gift',
      meaning: 'What this period is offering you when met with awareness and courage. The gift is not given automatically — it is uncovered through your relationship with both the theme and the shadow.',
    },
  ],
  'celtic-cross': [
    {
      spreadType: 'celtic-cross',
      positionIndex: 0,
      label: 'Present',
      meaning: 'The heart of the matter — the central situation, question, or energy at the core of your reading. Everything else in this spread circles this card.',
    },
    {
      spreadType: 'celtic-cross',
      positionIndex: 1,
      label: 'Challenge',
      meaning: 'What crosses you — the immediate obstacle, complication, or tension intersecting with the present situation. This card does not oppose the present; it completes it.',
    },
    {
      spreadType: 'celtic-cross',
      positionIndex: 2,
      label: 'Foundation',
      meaning: 'The root beneath the situation — what formed the ground from which the present has grown. Formative events, deep patterns, or foundational beliefs that support or undermine.',
    },
    {
      spreadType: 'celtic-cross',
      positionIndex: 3,
      label: 'Recent Past',
      meaning: 'What is just behind you — the events, energies, or decisions of the recent past that are still influencing the present moment and feeding the current situation.',
    },
    {
      spreadType: 'celtic-cross',
      positionIndex: 4,
      label: 'Crown',
      meaning: 'What is possible — the highest potential outcome or the energy you are reaching toward. This card speaks of aspiration, ideal outcomes, and what consciousness you are growing into.',
    },
    {
      spreadType: 'celtic-cross',
      positionIndex: 5,
      label: 'Near Future',
      meaning: 'What is coming into form — the energy moving toward you in the near term. Not a fixed fate, but the trajectory of current forces if they continue unchallenged.',
    },
    {
      spreadType: 'celtic-cross',
      positionIndex: 6,
      label: 'Self',
      meaning: 'How you see yourself in this situation — your self-concept, your psychological stance, and the inner resources or limitations you bring to the challenge.',
    },
    {
      spreadType: 'celtic-cross',
      positionIndex: 7,
      label: 'External Forces',
      meaning: 'The environment around you — people, circumstances, and social forces that are shaping this situation from the outside. What the world is bringing to your door.',
    },
    {
      spreadType: 'celtic-cross',
      positionIndex: 8,
      label: 'Hopes & Fears',
      meaning: 'Your inner ambivalence — what you both desire and dread about this situation. Often hopes and fears live in the same space; this card names that dual nature.',
    },
    {
      spreadType: 'celtic-cross',
      positionIndex: 9,
      label: 'Outcome',
      meaning: 'The likely culmination of the forces at work — where this path leads if current patterns and choices continue. The final card speaks of synthesis, completion, and consequence.',
    },
  ],
}
