import type { AspectType } from '../../engine/aspects'
import type { PlanetName } from '../../engine/types'

// ─── Aspect perfection brief interpretations ────────────────────────────────

const ASPECT_BRIEFS: Record<AspectType, Record<string, string>> = {
  conjunction: {
    default: 'Merged energy — intensity, new beginnings, powerful focus',
    Sun: 'Identity and purpose amplified',
    Moon: 'Emotions fused with transit energy',
    Mercury: 'Thinking infused with new influence',
    Venus: 'Love and values highlighted',
    Mars: 'Drive and action supercharged',
    Jupiter: 'Expansion and opportunity activated',
    Saturn: 'Structure and discipline demanded',
    Uranus: 'Sudden awakening or disruption',
    Neptune: 'Spiritual sensitivity heightened',
    Pluto: 'Deep transformation triggered',
  },
  sextile: {
    default: 'Opportunity flows — take action to benefit',
    Sun: 'Easy self-expression, supportive connections',
    Moon: 'Emotional ease and natural flow',
    Mercury: 'Smooth communication, helpful ideas',
    Venus: 'Social harmony, creative openings',
    Mars: 'Productive energy, effective action',
    Jupiter: 'Lucky breaks, growth opportunities',
    Saturn: 'Steady progress, practical support',
    Uranus: 'Inspiring insights, welcome changes',
    Neptune: 'Intuitive guidance, creative flow',
    Pluto: 'Empowering connections, subtle transformation',
  },
  square: {
    default: 'Tension demands action — growth through challenge',
    Sun: 'Identity crisis or ego friction',
    Moon: 'Emotional stress, internal conflict',
    Mercury: 'Miscommunication, mental pressure',
    Venus: 'Relationship tension, value conflicts',
    Mars: 'Frustration, conflict, impulsive energy',
    Jupiter: 'Excess, overcommitment, faith tested',
    Saturn: 'Restrictions, delays, responsibility weighs heavy',
    Uranus: 'Disruption, restlessness, need for freedom',
    Neptune: 'Confusion, disillusionment, unclear boundaries',
    Pluto: 'Power struggles, compulsive drives',
  },
  trine: {
    default: 'Harmonious flow — natural ease and talent activated',
    Sun: 'Confidence and vitality boosted',
    Moon: 'Emotional comfort and security',
    Mercury: 'Clear thinking, effortless communication',
    Venus: 'Love flows easily, beauty and pleasure',
    Mars: 'Smooth assertion, physical vitality',
    Jupiter: 'Good fortune, generosity, growth',
    Saturn: 'Solid foundations, earned rewards',
    Uranus: 'Exciting positive changes, innovation',
    Neptune: 'Spiritual insight, creative inspiration',
    Pluto: 'Empowerment, regeneration, deep flow',
  },
  opposition: {
    default: 'Awareness through polarity — relationship mirrors',
    Sun: 'Others challenge your identity',
    Moon: 'Emotional polarization, relationship needs',
    Mercury: 'Opposing viewpoints, negotiation required',
    Venus: 'Relationship dynamics highlighted',
    Mars: 'Direct confrontation, projection',
    Jupiter: 'Over-promising, ideological clashes',
    Saturn: 'Authority confrontation, boundary testing',
    Uranus: 'Independence vs. connection standoff',
    Neptune: 'Projections exposed, boundary dissolution',
    Pluto: 'Power dynamics reach a climax',
  },
  'semi-sextile': {
    default: 'Gentle adjustment — subtle awareness shift',
    Sun: 'Minor course corrections',
    Moon: 'Slight emotional recalibration',
  },
  quincunx: {
    default: 'Awkward tension — adjustment without obvious resolution',
    Sun: 'Identity requires uncomfortable adaptation',
    Moon: 'Emotional unease, something feels off',
    Mercury: 'Mental disconnect that needs bridging',
    Venus: 'Values require realignment',
    Mars: 'Energy misdirected, needs recalibration',
    Jupiter: 'Growth blocked by mismatched expectations',
    Saturn: 'Structural adjustment under stress',
    Uranus: 'Change forced in unexpected direction',
    Neptune: 'Confusion that can\'t be ignored',
    Pluto: 'Transformation through discomfort',
  },
}


export function getAspectPerfectionBrief(
  aspectType: AspectType,
  natalPlanet: string,
): string {
  const briefs = ASPECT_BRIEFS[aspectType]
  if (!briefs) return ''
  return briefs[natalPlanet] ?? briefs.default ?? ''
}

// ─── Sign ingress interpretations ───────────────────────────────────────────

const INGRESS_BRIEFS: Record<string, string> = {
  Sun: 'The Sun illuminates new themes and shifts your focus',
  Moon: 'The Moon\'s emotional tone changes',
  Mercury: 'Communication, thinking, and commerce shift style',
  Venus: 'Love language, aesthetic preferences, and social energy shift',
  Mars: 'Your drive, assertiveness, and passion redirect',
  Jupiter: 'Expansion, optimism, and growth opportunities shift territory',
  Saturn: 'Structure, discipline, and life lessons move to new ground',
  Uranus: 'Innovation and disruption target new life areas',
  Neptune: 'Dreams, illusions, and spiritual themes evolve',
  Pluto: 'Transformation and power dynamics enter new territory',
}

export function getIngressBrief(planet: PlanetName, toSign: string): string {
  const base = INGRESS_BRIEFS[planet] ?? `${planet} shifts energy`
  return `${base} — ${planet} enters ${toSign}`
}

// ─── Retrograde station interpretations ─────────────────────────────────────

const STATION_BRIEFS: Record<string, { retrograde: string; direct: string }> = {
  Mercury: {
    retrograde: 'Review communications, back up data, expect delays',
    direct: 'Communication clears, stalled plans can move forward',
  },
  Venus: {
    retrograde: 'Reassess relationships and finances, old flames may reappear',
    direct: 'Romantic clarity returns, purchases and partnerships resume',
  },
  Mars: {
    retrograde: 'Energy turns inward, avoid starting new battles',
    direct: 'Drive and ambition reignite, projects gain momentum',
  },
  Jupiter: {
    retrograde: 'Reflect on beliefs and long-term vision',
    direct: 'Growth and optimism resume, opportunities unlock',
  },
  Saturn: {
    retrograde: 'Review responsibilities and life structures',
    direct: 'Commitments solidify, delayed progress resumes',
  },
  Uranus: {
    retrograde: 'Internal revolution, processing needed changes',
    direct: 'Breakthroughs externalize, freedom expressed',
  },
  Neptune: {
    retrograde: 'Illusions lift, inner clarity emerges',
    direct: 'Dreams and ideals reconnect with reality',
  },
  Pluto: {
    retrograde: 'Deep internal transformation, shadow work',
    direct: 'Transformation externalizes, empowerment rises',
  },
}

export function getStationBrief(planet: PlanetName, stationType: 'retrograde' | 'direct'): string {
  const data = STATION_BRIEFS[planet]
  if (!data) return `${planet} stations ${stationType}`
  return data[stationType]
}

// ─── Lunar phase interpretations ────────────────────────────────────────────

const LUNAR_PHASE_BRIEFS: Record<string, string> = {
  'New Moon': 'Plant seeds, set intentions, begin new chapters',
  'First Quarter': 'Take decisive action, push through resistance',
  'Full Moon': 'Harvest results, gain clarity, release what\'s complete',
  'Last Quarter': 'Reflect, forgive, clear space for the new cycle',
}

export function getLunarPhaseBrief(phase: string): string {
  return LUNAR_PHASE_BRIEFS[phase] ?? phase
}

// ─── Event type display info ────────────────────────────────────────────────

export const EVENT_TYPE_INFO: Record<string, { icon: string; color: string; label: string }> = {
  'aspect-perfection': { icon: '✦', color: 'text-mystic-gold', label: 'Exact Aspect' },
  'sign-ingress': { icon: '→', color: 'text-mystic-purple', label: 'Sign Change' },
  'retrograde-station': { icon: '℞', color: 'text-red-400', label: 'Station' },
  'lunar-phase': { icon: '◐', color: 'text-blue-400', label: 'Lunar Phase' },
  'moon-sign-change': { icon: '☽', color: 'text-mystic-muted', label: 'Moon Sign' },
}
