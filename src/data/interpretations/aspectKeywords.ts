import type { TransitAspect } from '../../engine/transits'
import { getAspectPerfectionBrief } from './transitEvents'
import type { AspectType } from '../../engine/aspects'
import type { PlanetName } from '../../engine/types'

// ─── Shared aspect vocabulary ────────────────────────────────────────────────

/**
 * One-word keyword for each transit planet × nature combination.
 * Extracted from TodayPage.tsx — single source of truth for this vocabulary.
 */
export const ASPECT_KEYWORDS: Record<string, Record<string, string>> = {
  Sun: { harmonious: 'Vitality', challenging: 'Ego tension', neutral: 'Identity' },
  Moon: { harmonious: 'Flow', challenging: 'Emotional', neutral: 'Intuition' },
  Mercury: { harmonious: 'Clarity', challenging: 'Discord', neutral: 'Communication' },
  Venus: { harmonious: 'Harmony', challenging: 'Friction', neutral: 'Connection' },
  Mars: { harmonious: 'Drive', challenging: 'Tension', neutral: 'Action' },
  Jupiter: { harmonious: 'Expansion', challenging: 'Excess', neutral: 'Growth' },
  Saturn: { harmonious: 'Structure', challenging: 'Pressure', neutral: 'Discipline' },
  Uranus: { harmonious: 'Innovation', challenging: 'Disruption', neutral: 'Change' },
  Neptune: { harmonious: 'Inspiration', challenging: 'Confusion', neutral: 'Mysticism' },
  Pluto: { harmonious: 'Transformation', challenging: 'Intensity', neutral: 'Power' },
  NorthNode: { harmonious: 'Purpose', challenging: 'Karma', neutral: 'Destiny' },
}

/**
 * Human verb form for each aspect type.
 * Used in the key aspect sentence: "{TransitPlanet} {verb} your natal {NatalPlanet}"
 */
export const ASPECT_VERB: Record<string, string> = {
  'conjunction': 'conjunct',
  'sextile': 'sextiling',
  'square': 'squaring',
  'trine': 'trining',
  'opposition': 'opposing',
  'semi-sextile': 'in semi-sextile with',
  'quincunx': 'in quincunx with',
}

/**
 * Action phrase lookup table: transitPlanet × nature → one-line interpretive phrase.
 * These phrases are the visible face of the key aspect pill — honest, specific, non-generic.
 */
export const TRANSIT_PLANET_PHRASES: Record<string, Record<'harmonious' | 'challenging' | 'neutral', string>> = {
  Sun: {
    harmonious: 'confidence rises — let your presence lead',
    challenging: 'ego asks for space; watch for self-assertion tipping into friction',
    neutral: 'identity is in focus; notice how you present yourself',
  },
  Moon: {
    harmonious: 'emotions run quietly supportive today',
    challenging: 'feelings are close to the surface; tread gently inward',
    neutral: 'inner tides are shifting; check in with yourself',
  },
  Mercury: {
    harmonious: 'words land well; a good day for the conversation you\'ve been putting off',
    challenging: 'friction in thought and speech; choose words with care',
    neutral: 'the mind is active; observe before concluding',
  },
  Venus: {
    harmonious: 'warmth flows without effort today',
    challenging: 'what you want and what you\'re getting may not match; notice where',
    neutral: 'values are in view; what matters most right now?',
  },
  Mars: {
    harmonious: 'directed energy — act on what matters',
    challenging: 'a day for assertion, not accommodation',
    neutral: 'energy is available; channel it before it channels you',
  },
  Jupiter: {
    harmonious: 'say yes to more; generosity opens doors',
    challenging: 'ambition runs high; distinguish vision from overreach',
    neutral: 'expansion is possible; take one step toward it',
  },
  Saturn: {
    harmonious: 'structure rewards patience; slow progress is still progress',
    challenging: 'pressure is real, and it is purposeful',
    neutral: 'accountability is the theme; what responsibility is waiting?',
  },
  Uranus: {
    harmonious: 'an unexpected opening; stay loose',
    challenging: 'disruption arrives without warning; breathe before reacting',
    neutral: 'something is shifting; let it',
  },
  Neptune: {
    harmonious: 'intuition is sharpened; trust a feeling today',
    challenging: 'boundaries are blurry; not everything is as it appears',
    neutral: 'imagination runs high; useful for creativity, less so for decisions',
  },
  Pluto: {
    harmonious: 'deep value surfaces; notice what you truly want',
    challenging: 'power dynamics are active; choose conscious engagement over reaction',
    neutral: 'something beneath the surface is moving',
  },
  NorthNode: {
    harmonious: 'aligned with your path; a day to lean forward',
    challenging: 'growth feels uncomfortable; that is the point',
    neutral: 'purpose is nudging you; pay attention to what comes up',
  },
}

/**
 * Assembles a one-line key aspect sentence from a TransitAspect.
 *
 * Template: "{TransitPlanet} {aspectVerb} your natal {NatalPlanet} — {actionPhrase}"
 *
 * Falls back gracefully:
 * - Unknown aspect type → raw type string as verb
 * - Missing phrase table entry → ASPECT_BRIEFS fallback via getAspectPerfectionBrief
 * - Both miss → raw symbol format (pre-feature behavior)
 */
export function buildKeyAspectSentence(aspect: TransitAspect): string {
  const verb = ASPECT_VERB[aspect.type] ?? aspect.type

  const nature = aspect.nature as 'harmonious' | 'challenging' | 'neutral'
  const phraseEntry = TRANSIT_PLANET_PHRASES[aspect.transitPlanet]
  const actionPhrase = phraseEntry?.[nature]
    ?? getAspectPerfectionBrief(aspect.type as AspectType, aspect.natalPlanet as PlanetName | 'NorthNode')
    || `${aspect.transitPlanet} ${aspect.symbol} natal ${aspect.natalPlanet}`

  return `${aspect.transitPlanet} ${verb} your natal ${aspect.natalPlanet} — ${actionPhrase}`
}
