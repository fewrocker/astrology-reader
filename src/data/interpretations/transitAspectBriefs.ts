import type { PlanetName } from '../../engine/types'
import type { AspectType } from '../../engine/aspects'
import { getPlanetInHouseInterpretation } from './index'
import { getHouseTheme } from './houseThemes'
import { getAspectPerfectionBrief } from './transitEvents'

// ─── Internal planet archetype verb phrase table ─────────────────────────────
// 10 transit planets × 3 natures (harmonious, challenging, neutral) = 30 entries.
// An additional "applying" vs "separating" variant doubles expressiveness.

type Nature = 'harmonious' | 'challenging' | 'neutral'

interface PlanetPhrases {
  harmonious: { applying: string; separating: string }
  challenging: { applying: string; separating: string }
  neutral: { applying: string; separating: string }
}

const TRANSIT_PLANET_PHRASES: Record<string, PlanetPhrases> = {
  Sun: {
    harmonious: { applying: 'illuminating',         separating: 'having illuminated' },
    challenging: { applying: 'straining',            separating: 'having strained' },
    neutral:     { applying: 'moving through',       separating: 'passing through' },
  },
  Moon: {
    harmonious: { applying: 'flowing into',          separating: 'having flowed through' },
    challenging: { applying: 'stirring tension in',  separating: 'having stirred' },
    neutral:     { applying: 'moving through',       separating: 'passing through' },
  },
  Mercury: {
    harmonious: { applying: 'quickening',            separating: 'having quickened' },
    challenging: { applying: 'disrupting',           separating: 'having disrupted' },
    neutral:     { applying: 'activating',           separating: 'having activated' },
  },
  Venus: {
    harmonious: { applying: 'sweetening',            separating: 'having sweetened' },
    challenging: { applying: 'complicating',         separating: 'having complicated' },
    neutral:     { applying: 'touching',             separating: 'having touched' },
  },
  Mars: {
    harmonious: { applying: 'energizing',            separating: 'having energized' },
    challenging: { applying: 'pressing hard on',     separating: 'having pressed on' },
    neutral:     { applying: 'activating',           separating: 'having activated' },
  },
  Jupiter: {
    harmonious: { applying: 'expanding',             separating: 'having expanded' },
    challenging: { applying: 'overextending',        separating: 'having overextended' },
    neutral:     { applying: 'broadening',           separating: 'having broadened' },
  },
  Saturn: {
    harmonious: { applying: 'steadying',             separating: 'having steadied' },
    challenging: { applying: 'pressing on',          separating: 'having pressed on' },
    neutral:     { applying: 'transiting through',   separating: 'having transited through' },
  },
  Uranus: {
    harmonious: { applying: 'awakening',             separating: 'having awakened' },
    challenging: { applying: 'disrupting',           separating: 'having disrupted' },
    neutral:     { applying: 'unsettling',           separating: 'having unsettled' },
  },
  Neptune: {
    harmonious: { applying: 'inspiring',             separating: 'having inspired' },
    challenging: { applying: 'dissolving',           separating: 'having dissolved' },
    neutral:     { applying: 'softening',            separating: 'having softened' },
  },
  Pluto: {
    harmonious: { applying: 'empowering',            separating: 'having empowered' },
    challenging: { applying: 'transforming',         separating: 'having transformed' },
    neutral:     { applying: 'intensifying',         separating: 'having intensified' },
  },
}

// ─── Brief truncation helper ─────────────────────────────────────────────────

function truncateToLimit(text: string, limit: number): string {
  if (text.length <= limit) return text
  // Trim at nearest sentence boundary before the limit
  const sub = text.slice(0, limit)
  const lastPeriod = sub.lastIndexOf('.')
  if (lastPeriod > 0) return sub.slice(0, lastPeriod + 1)
  // No sentence boundary — just trim cleanly at a word boundary
  const lastSpace = sub.lastIndexOf(' ')
  if (lastSpace > 0) return sub.slice(0, lastSpace) + '.'
  return sub + '.'
}

// ─── Public function ─────────────────────────────────────────────────────────

/**
 * Compute a one-to-two sentence inline brief for a transit aspect row.
 *
 * Primary path (house known, 1–12):
 *   "[Transit planet archetype] [aspect-nature verb phrase] your [house name] — [abbreviated house brief]."
 *
 * Fallback path (house null, 0, or planet not found):
 *   Returns the existing generic text from getAspectPerfectionBrief.
 *
 * Never throws. Always returns a non-empty string.
 */
export function computeTransitAspectBrief(
  transitPlanet: PlanetName | 'NorthNode',
  aspectType: AspectType,
  natalPlanet: PlanetName | 'NorthNode',
  natalHouse: number | null,
  nature: Nature,
  applying?: boolean,
): string {
  try {
    // Fallback for NorthNode as transit planet — no archetype table entry
    const phrases = TRANSIT_PLANET_PHRASES[transitPlanet as string]

    // Guard: house must be 1–12 and transit planet must have archetype phrases
    if (!natalHouse || natalHouse < 1 || natalHouse > 12 || !phrases) {
      return getAspectPerfectionBrief(aspectType, natalPlanet) || fallbackSentence(nature)
    }

    const houseTheme = getHouseTheme(natalHouse)
    if (!houseTheme) {
      return getAspectPerfectionBrief(aspectType, natalPlanet) || fallbackSentence(nature)
    }

    const phrasePair = phrases[nature]
    const verbPhrase = applying !== false ? phrasePair.applying : phrasePair.separating

    // Optionally use getPlanetInHouseInterpretation for depth
    const houseInterp = getPlanetInHouseInterpretation(natalPlanet, natalHouse)
    const contextBrief = houseInterp?.brief ?? houseTheme.brief

    // Compose the sentence:
    // "Saturn pressing on your House of Home — [context about Moon in 4th house]."
    const composed = `${transitPlanet} ${verbPhrase} your ${houseTheme.name} — ${contextBrief}`

    // Apply 200-character limit
    const trimmed = truncateToLimit(composed, 200)
    if (trimmed.length > 0) return trimmed

    // Should never reach here, but be defensive
    return getAspectPerfectionBrief(aspectType, natalPlanet) || fallbackSentence(nature)
  } catch {
    // Last-resort fallback — never throw
    return fallbackSentence(nature)
  }
}

function fallbackSentence(nature: Nature): string {
  if (nature === 'harmonious') return 'A harmonious connection supporting ease and flow.'
  if (nature === 'challenging') return 'A challenging aspect calling for growth through tension.'
  return 'A planetary contact activating this area of life.'
}
