export interface TransitAdaptation {
  planet: string
  condition: 'retrograde' | 'direct' | 'any'
  emphasis: string
}

export const TRANSIT_ADAPTATIONS: Record<string, TransitAdaptation[]> = {
  'the-hermit': [
    {
      planet: 'Mercury',
      condition: 'retrograde',
      emphasis: 'withdrawal, internal review, silence as wisdom — the Hermit\'s lamp turns inward during Mercury\'s backward walk, illuminating what the forward motion of life usually obscures',
    },
    {
      planet: 'Saturn',
      condition: 'any',
      emphasis: 'patient mastery, the discipline of chosen solitude, the long game of inner development',
    },
  ],
  'the-tower': [
    {
      planet: 'Uranus',
      condition: 'any',
      emphasis: 'sudden liberation through disruption, ego structures collapsing to reveal truth — Uranus and the Tower speak with one voice: what cannot hold must fall, and the falling is the gift',
    },
    {
      planet: 'Mars',
      condition: 'any',
      emphasis: 'forceful clearing, the energy of breakthrough cutting through what has become calcified',
    },
    {
      planet: 'Pluto',
      condition: 'any',
      emphasis: 'deep structural transformation, the Tower as Pluto\'s instrument — dismantling the false edifice so the authentic can emerge from the rubble',
    },
  ],
  'the-moon': [
    {
      planet: 'Neptune',
      condition: 'any',
      emphasis: 'heightened intuition, the veil between conscious and unconscious at its thinnest — Neptune and the Moon dissolve the boundary between dream and waking',
    },
    {
      planet: 'Neptune',
      condition: 'retrograde',
      emphasis: 'illusions returning to clarity, the fog lifting to reveal what it had been concealing — insight arrives quietly where confusion once lived',
    },
  ],
  'the-magician': [
    {
      planet: 'Mercury',
      condition: 'direct',
      emphasis: 'full command of communication and strategy — the Magician\'s tools are sharpened, the timing precise, the spell ready to be cast',
    },
    {
      planet: 'Mercury',
      condition: 'retrograde',
      emphasis: 'review before action — the Magician\'s power turns toward revision, refinement, and the excavation of overlooked resources',
    },
  ],
  'the-chariot': [
    {
      planet: 'Mars',
      condition: 'direct',
      emphasis: 'decisive momentum, the will fully aligned with action — Mars drives the Chariot forward with purpose and precision',
    },
    {
      planet: 'Mars',
      condition: 'retrograde',
      emphasis: 'inner drive redirected inward, reviewing what you are charging toward and why — the pause before the surge',
    },
  ],
  'the-star': [
    {
      planet: 'Uranus',
      condition: 'any',
      emphasis: 'awakening to a larger vision, hope as innovation — Uranus and the Star together signal the breakthrough of a new understanding into a life that was ready for it',
    },
    {
      planet: 'Neptune',
      condition: 'any',
      emphasis: 'spiritual renewal, the healing that arrives through surrender — Neptune dissolves the wound so the Star\'s medicine can reach it',
    },
  ],
  'the-high-priestess': [
    {
      planet: 'Moon',
      condition: 'any',
      emphasis: 'deepened intuition, the unconscious speaking with unusual clarity — follow what you know without knowing how you know it',
    },
    {
      planet: 'Neptune',
      condition: 'retrograde',
      emphasis: 'inner knowing surfacing as Neptune moves inward — the High Priestess reveals what has been veiled even from yourself',
    },
  ],
  'the-devil': [
    {
      planet: 'Saturn',
      condition: 'any',
      emphasis: 'the structures of limitation examined directly — Saturn and the Devil ask together: which constraints are necessary and which have you mistaken for necessity?',
    },
    {
      planet: 'Pluto',
      condition: 'any',
      emphasis: 'the shadow material surfacing for transformation — Pluto forces what the Devil conceals into the open',
    },
  ],
  'the-emperor': [
    {
      planet: 'Saturn',
      condition: 'any',
      emphasis: 'disciplined authority, the architecture of earned power — Saturn and the Emperor build together what cannot be built quickly',
    },
    {
      planet: 'Mars',
      condition: 'direct',
      emphasis: 'decisive leadership, the Emperor\'s will moving into action with force and clarity',
    },
  ],
  'wheel-of-fortune': [
    {
      planet: 'Jupiter',
      condition: 'any',
      emphasis: 'expansion amplified, fortune turning in a favorable direction — Jupiter and the Wheel together suggest the cycle is turning upward',
    },
    {
      planet: 'Uranus',
      condition: 'any',
      emphasis: 'sudden shifts of fortune, change arriving faster than expected — the Wheel accelerated by Uranian disruption',
    },
  ],
  'death': [
    {
      planet: 'Pluto',
      condition: 'any',
      emphasis: 'deep transformation demanded and delivered — Pluto\'s power meets Death\'s necessity: what is ending is ending completely, and the ground will be richer for it',
    },
    {
      planet: 'Saturn',
      condition: 'any',
      emphasis: 'the weight of necessary endings, the discipline of letting go on schedule rather than on preference',
    },
  ],
  'judgment': [
    {
      planet: 'Pluto',
      condition: 'any',
      emphasis: 'the summons amplified — Pluto\'s transformative power aligns with Judgment\'s call to rise, making the invitation impossible to ignore',
    },
    {
      planet: 'Saturn',
      condition: 'any',
      emphasis: 'the reckoning has a timeline — Saturn and Judgment together signal that the moment of accounting is not abstract but imminent',
    },
  ],
  'the-hanged-man': [
    {
      planet: 'Neptune',
      condition: 'any',
      emphasis: 'surrender deepened into revelation — Neptune amplifies the Hanged Man\'s gift of perception through release',
    },
    {
      planet: 'Neptune',
      condition: 'retrograde',
      emphasis: 'inner spiritual review, the suspension becoming a cocoon — what emerges from this pause will not look like what entered it',
    },
  ],
  'temperance': [
    {
      planet: 'Jupiter',
      condition: 'any',
      emphasis: 'the alchemy of expansion meeting balance — Jupiter\'s generosity tempered by Temperance\'s wisdom, producing growth without overwhelm',
    },
    {
      planet: 'Saturn',
      condition: 'any',
      emphasis: 'patience as spiritual practice — Saturn and Temperance together ask for the long work of integration rather than the quick fix',
    },
  ],
  'the-lovers': [
    {
      planet: 'Venus',
      condition: 'any',
      emphasis: 'the heart\'s intelligence sharpened — Venus and the Lovers together amplify the call to choose from love rather than strategy',
    },
    {
      planet: 'Mercury',
      condition: 'any',
      emphasis: 'clarity in relationship and values — the Lovers\' choice becomes clearer as Mercury illuminates what actually matters to you',
    },
  ],
}
