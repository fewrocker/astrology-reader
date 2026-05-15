import type { InterpretationEntry } from './types'

// ---------- natal retrograde interpretations ----------

/**
 * When a planet is retrograde at birth, its energy is turned inward.
 * These interpretations explain how each planet's retrograde status
 * affects the native's personality and life experience.
 * Sun and Moon are never retrograde — only 8 planets here.
 */
export const NATAL_RETROGRADE: Record<string, InterpretationEntry> = {
  Mercury: {
    brief: 'Deep thinker who revisits and refines ideas',
    detail: 'With Mercury retrograde in your birth chart, your mind works in a reflective, non-linear way. You process information deeply rather than quickly, often revisiting ideas and conversations long after they happen. You may have a gift for editing, research, or uncovering hidden meanings in communication. Early in life you might have felt misunderstood or struggled to express your thoughts, but over time you develop a rich inner dialogue and an unusually thorough way of thinking. You excel at seeing what others miss.',
  },
  Venus: {
    brief: 'Deeply private in love with unconventional values',
    detail: 'Venus retrograde at birth gives you an intensely private approach to love and relationships. You may feel that your values, tastes, or romantic desires don\'t quite match what\'s expected of you. Past-life astrologers say this placement carries unfinished relationship karma — you might re-encounter significant people or revisit old emotional patterns. You love deeply but may take longer to open up. Your sense of beauty is unique and often ahead of its time. Self-worth is an ongoing journey that deepens with maturity.',
  },
  Mars: {
    brief: 'Internalizes drive and processes anger slowly',
    detail: 'Mars retrograde in your natal chart means your assertive energy flows inward rather than outward. You may take longer to act on anger or desire, processing these impulses internally before responding. This can make you appear calm or passive to others, but inside you carry a powerful reservoir of motivation. You may struggle with expressing frustration directly and might internalize conflicts. Your drive often manifests through sustained inner determination rather than outward aggression. Physical energy may come in bursts rather than a steady stream.',
  },
  Jupiter: {
    brief: 'Finds growth through inner wisdom rather than external expansion',
    detail: 'With Jupiter retrograde at birth, your path to growth, meaning, and abundance runs through inner exploration rather than external seeking. While others chase outward success and recognition, you find your deepest fulfillment through philosophical reflection, spiritual practice, or quiet personal development. You may question mainstream beliefs and develop your own unique worldview. Opportunities may come later in life or through unexpected channels. Your optimism is earned through experience rather than given freely.',
  },
  Saturn: {
    brief: 'Sets internal standards higher than any external authority',
    detail: 'Saturn retrograde in your birth chart means you are your own strictest teacher. External rules and authority figures matter less to you than the standards you set for yourself — which are often impossibly high. You may have felt a heavy sense of responsibility from a young age, or experienced authority figures as absent rather than overbearing. Your discipline is self-generated, and your life lessons tend to be deeply personal rather than imposed by circumstances. Over time, you learn to soften the inner critic and recognize just how much you\'ve already accomplished.',
  },
  Uranus: {
    brief: 'Revolutionary spirit expressed through internal transformation',
    detail: 'Uranus retrograde at birth turns the planet of revolution inward. Your desire for freedom and change operates beneath the surface — you may appear conventional while harboring deeply unconventional ideas and impulses. Your breakthroughs happen internally before they manifest externally. You question social norms privately and may feel like a quiet rebel. Your unique genius reveals itself gradually, and your innovations tend to be deeply considered rather than impulsive. You march to your own drum, but quietly.',
  },
  Neptune: {
    brief: 'Vivid inner world with deep spiritual sensitivity',
    detail: 'With Neptune retrograde in your birth chart, your spiritual and imaginative life is extraordinarily rich and internalized. You may experience vivid dreams, strong intuition, or a deep connection to the unseen that you keep private. The boundary between your inner world and outer reality can feel especially fluid. You may be naturally skeptical of spiritual trends while being deeply spiritual yourself. Creative inspiration comes from within rather than from external muses. Learning to trust your own vision without external validation is part of your journey.',
  },
  Pluto: {
    brief: 'Transforms from within through deep psychological work',
    detail: 'Pluto retrograde at birth indicates that your transformative power operates from the inside out. Rather than seeking to change the world around you, you instinctively work on your own psychological depths. You may be drawn to therapy, shadow work, or deep introspection from an early age. Power dynamics play out internally — you wrestle with your own intensity, control patterns, and desire for regeneration. Your personal transformations are profound but mostly invisible to others. When you finally emerge from a Pluto transit or life phase, the change is complete and irreversible.',
  },
  Chiron: {
    brief: 'The wound turns inward — the healing journey longer, more solitary, more profound',
    detail: 'With Chiron retrograde in your birth chart, the wound-and-wisdom journey is primarily internal — longer to begin, more private in its unfolding, and often invisible to those around you. You may spend years carrying the original wounding territory before the impulse to heal it fully awakens; this is not delay but depth. The work that happens in the interior before it surfaces is the very substance of the wisdom you eventually carry. When this healing finally moves outward, what others receive from you has been earned in solitude they cannot easily replicate.',
  },
  Ceres: {
    brief: 'The nourishment cycle turns inward — giving and receiving care both require inner work',
    detail: 'With Ceres retrograde at birth, the cycle of nourishment and loss moves primarily through the interior — the grief is more private, the relationship to receiving care more complicated, the path back from loss more internally navigated than outwardly supported. You may find it easier to give nourishment than to receive it, or carry a complex relationship to the acts of being tended. The renewal still comes; it simply arrives through an inward passage rather than an outward one. What you learn to nourish most completely, over time, is yourself.',
  },
  Pallas: {
    brief: 'Strategic intelligence turns inward — perceptions deeper, expression of them slower to surface',
    detail: 'With Pallas retrograde at birth, the strategic intelligence is primarily interior — your perceptions are often deep and accurate before you can articulate them, and the gap between what you understand and what you express can feel significant. You may have been underestimated in environments that reward quick, outward thinking, while carrying a more thorough and far-reaching intelligence beneath the surface. Over time, this becomes an asset: the insights that emerge from your slower processing are more fully formed, less easily disrupted, and often more precise than the quick conclusions of those around you.',
  },
  Juno: {
    brief: 'The bond question turns inward — relationship patterns work through a longer, deeper process',
    detail: 'With Juno retrograde in your birth chart, the work of commitment is primarily interior — you process your relationship patterns deeply and privately, often carrying the understanding of a past bond long after others might have moved on. You may be drawn back to unresolved relationship questions, or find that past partnerships teach you their lessons belatedly, when you finally have the distance to see clearly. This is not an obstacle to partnership — it is a different timeline. The commitment you eventually make carries the weight of what was genuinely worked through.',
  },
  Vesta: {
    brief: 'The sacred flame burns in private — devotion internalized, deeper, less publicly expressed',
    detail: 'With Vesta retrograde at birth, the devotion is primarily interior — the flame of sacred dedication burns in a place that others rarely see, and the work of genuine commitment happens in private before it ever becomes visible. You may struggle to externalize your deepest vocational sense, or carry a devotion to something that the world cannot easily receive or recognize. This is not absence of dedication — it is dedication of a particularly interior kind. What you tend in private is often more sustaining than anything you could show.',
  },
}

// ---------- transit retrograde interpretations ----------

/**
 * Brief context for when a planet is currently retrograde in transit.
 * These provide general meaning — the house overlay is handled by GPT context.
 */
export const TRANSIT_RETROGRADE: Record<string, InterpretationEntry> = {
  Mercury: {
    brief: 'Communication and technology need extra care',
    detail: 'Mercury retrograde is a time for review, reflection, and revision. Miscommunications, tech glitches, and travel delays are common themes. This is an excellent period to revisit old projects, reconnect with people from your past, and rethink plans rather than launching new ones. Double-check important messages and back up your data.',
  },
  Venus: {
    brief: 'Love and finances call for reflection, not action',
    detail: 'Venus retrograde invites you to reassess your relationships, values, and finances. Old flames may reappear, and you might question what — and who — you truly value. This is not the best time for major purchases, cosmetic changes, or new relationships, but it\'s perfect for healing old wounds and reconnecting with what genuinely brings you joy.',
  },
  Mars: {
    brief: 'Energy and motivation turn inward — pace yourself',
    detail: 'Mars retrograde slows your drive and redirects it inward. You may feel frustrated by delays, low energy, or a sense that your efforts aren\'t producing results. Avoid starting fights or major competitive ventures. Instead, use this time to refine your strategies, revisit fitness goals, and address any simmering anger or resentment you\'ve been avoiding.',
  },
  Jupiter: {
    brief: 'Growth comes through inner wisdom, not outward expansion',
    detail: 'Jupiter retrograde is a time to process and integrate the growth you\'ve already experienced rather than chasing new opportunities. Reflect on your beliefs, education, and long-term vision. Travel plans may shift, and legal matters could stall. The rewards of this period come through philosophical depth and spiritual maturation rather than external gains.',
  },
  Saturn: {
    brief: 'Revisit structures and responsibilities you\'ve built',
    detail: 'Saturn retrograde asks you to review the structures, commitments, and boundaries in your life. Are your foundations solid? Are you carrying responsibilities that no longer serve you? This is a time for internal discipline and honest assessment of your long-term goals. You may feel the weight of past decisions but gain clarity on where to rebuild.',
  },
  Uranus: {
    brief: 'Inner revolution brewing beneath the surface',
    detail: 'Uranus retrograde turns the desire for change inward. Rather than external upheaval, you\'re processing shifts in consciousness and identity. Old patterns you thought you\'d moved past may resurface for final integration. The breakthroughs of this period are internal — sudden insights, changed perspectives, and quiet liberation from old limitations.',
  },
  Neptune: {
    brief: 'Illusions clear as inner vision sharpens',
    detail: 'Neptune retrograde lifts the fog and allows you to see more clearly, especially regarding situations where you\'ve been deceiving yourself or being deceived. Dreams and intuition may intensify. This is a powerful time for spiritual practice, creative work, and healing addiction or escapist patterns. Reality becomes easier to face.',
  },
  Pluto: {
    brief: 'Deep inner transformation and power reclamation',
    detail: 'Pluto retrograde brings the process of transformation underground. You may find yourself examining power dynamics, control patterns, and deep psychological material that\'s been hidden. This is a potent time for therapy, shadow work, and releasing what no longer serves your evolution. The changes you make now are permanent and profound.',
  },
}

// ---------- retrograde summary narratives ----------

/**
 * Summary text based on the count of natal retrograde planets.
 */
export function getRetrogradeSummary(retrogradeCount: number, retrogradePlanets: string[]): { headline: string; narrative: string } {
  if (retrogradeCount === 0) {
    return {
      headline: 'All Planets Direct',
      narrative: 'You have no retrograde planets in your birth chart. Your planetary energies flow outward naturally and directly. You tend to express yourself straightforwardly and engage with life\'s lessons in a forward-moving way. You process experiences in real time and generally prefer action over reflection.',
    }
  }

  if (retrogradeCount === 1) {
    return {
      headline: `1 Retrograde Planet — ${retrogradePlanets[0]}`,
      narrative: `With one retrograde planet, you have a single area of life where energy naturally turns inward. ${retrogradePlanets[0]} retrograde adds depth and introspection to that planet's domain — you process its themes more privately and reflectively than most. This focused internalization can become a quiet strength as you develop a uniquely personal relationship with ${retrogradePlanets[0]}'s energy.`,
    }
  }

  if (retrogradeCount <= 3) {
    const names = retrogradePlanets.join(' and ')
    return {
      headline: `${retrogradeCount} Retrograde Planets`,
      narrative: `With ${names} retrograde in your birth chart, several areas of your life carry an inward, reflective quality. You tend to process experiences deeply before acting on them, and your inner world is richer than what you show on the surface. You may feel like a "late bloomer" in the areas these planets govern, but the understanding you eventually develop is profound and hard-earned.`,
    }
  }

  // 4+
  const names = retrogradePlanets.slice(0, -1).join(', ') + ' and ' + retrogradePlanets[retrogradePlanets.length - 1]
  return {
    headline: `${retrogradeCount} Retrograde Planets — Rich Inner World`,
    narrative: `With ${names} all retrograde at your birth, you carry a powerful inward orientation. Your inner world is exceptionally rich, and you process most of life's major themes through deep reflection before external expression. You may sometimes feel out of step with the pace of the world around you, as if you're operating on a different timeline. This is not a disadvantage — it means your insights, when they emerge, carry unusual depth and authenticity. Many people with multiple retrogrades become wise counselors, therapists, artists, or spiritual seekers because of this profound inner awareness.`,
  }
}
