import type { TransitPeriod, TransitAspect, TransitPosition } from './transits'
import { calculateCurrentPositions, calculateTransitAspects, assignTransitHouses, getRetrogradeStatus } from './transits'
import type { ChartData, PlanetName } from './types'
import { ASPECT_DEFINITIONS } from './aspects'
import type { AspectType } from './aspects'
import { TRANSIT_RETROGRADE } from '../data/interpretations/retrogrades'
import { TRANSIT_PLANET_PHRASES } from '../data/interpretations/transitAspectBriefs'
import { getHouseTheme } from '../data/interpretations/houseThemes'
// ─── Types ───────────────────────────────────────────────────────────────────

export type MarkerCategory = 'power' | 'favorable' | 'challenging' | 'shift' | 'neutral'

export interface SnapshotScore {
  category: MarkerCategory
  coShift: boolean          // true when shift co-occurs with favorable or challenging
  intensity: number         // 0.0–1.0, drives dot size and glow strength
  reason: string            // one-line human sentence for tooltip and banner
  bannerBoldFragment?: string // token to bold in the banner (e.g. planet name); falls back to first word
  guidance?: string         // navigational sentence shown in banner only (not tooltip)
  shiftPlanet?: string      // planet name when coShift or category === 'shift'
  shiftDirection?: 'retrograde' | 'direct'
  triggerAspect?: {         // the specific aspect that drove the score, for tooltip specificity
    transitPlanet: string
    natalPlanet: string
    type: string
    orb: number
  }
}

export interface AdvanceSnapshot {
  offset: number
  date: Date
  dateStr: string
  transitPlanets: TransitPosition[]
  housedTransitPlanets: TransitPosition[]
  transitAspects: TransitAspect[]
  retrogrades: { planet: PlanetName; isRetro: boolean; status: string }[]
  score: SnapshotScore     // pre-computed once in preCalculateSnapshots
}

export interface AdvanceConfig {
  unit: string
  unitPlural: string
  max: number
  msPerStep: number
}

export const ADVANCE_CONFIG: Record<TransitPeriod, AdvanceConfig> = {
  daily: { unit: 'day', unitPlural: 'days', max: 30, msPerStep: 86400000 },
  weekly: { unit: 'week', unitPlural: 'weeks', max: 52, msPerStep: 7 * 86400000 },
  monthly: { unit: 'month', unitPlural: 'months', max: 36, msPerStep: 30.44 * 86400000 }, // average month
}

// ─── Orb Thresholds ──────────────────────────────────────────────────────────

export const ORB_THRESHOLDS: Record<TransitPeriod, {
  angleContact: number
  applyingTight: number
  energyMinAspects: number
}> = {
  daily:   { angleContact: 1.0, applyingTight: 1.5, energyMinAspects: 2 },
  weekly:  { angleContact: 2.0, applyingTight: 3.0, energyMinAspects: 2 },
  monthly: { angleContact: 3.0, applyingTight: 4.0, energyMinAspects: 2 },
}

// Threshold for hysteresis post-processing (spec 14.4)
export const MARKER_HYSTERESIS_ORB = 0.5

/** Slow planets for angle-contact trigger (Jupiter excluded intentionally). */
export const SLOW_PLANETS_FOR_BANNER = new Set<PlanetName>(['Saturn', 'Uranus', 'Neptune', 'Pluto'])

/** Planets used in combination-weight scoring — includes Jupiter unlike SLOW_PLANETS_FOR_BANNER. */
export const COMBINATION_PLANETS = new Set<string>(['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'])

/** Minimum combined weight for a constellation to fire a favorable/challenging marker. */
export const COMBINATION_WEIGHT_THRESHOLD = 3.0

/** Reference weight for normalizing intensity (Pluto + Saturn at zero orb). */
export const COMBINATION_WEIGHT_NORMALIZE = 12

/** Verb to use in banner text per aspect type. */
export const ASPECT_VERB_BANNER: Record<AspectType, string> = {
  conjunction: 'reaches',
  opposition: 'opposes',
  square: 'presses',
  trine: 'flows through',
  sextile: 'opens to',
  'semi-sextile': 'touches',
  quincunx: 'adjusts toward',
}

/** Planet weight for identifying the trigger aspect (slow planets outrank fast). */
export const PLANET_WEIGHT: Partial<Record<string, number>> = {
  Pluto: 9, Neptune: 8, Uranus: 7, Saturn: 6, Jupiter: 5,
  Mars: 4, Sun: 3, Venus: 2, Mercury: 2, Moon: 1,
}

// ─── House ordinal helper ─────────────────────────────────────────────────────

function houseOrdinal(n: number): string {
  const suffix = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (suffix[(v - 20) % 10] ?? suffix[v] ?? suffix[0])
}

// ─── House-anchored aspect interpretation tables ──────────────────────────────

/** Context phrase suffix for aspect reason strings. Key: "${planet}|${nature}|${house}". */
const ASPECT_HOUSE_CONTEXT: Partial<Record<string, string>> = {
  // Saturn + challenging
  'Saturn|challenging|1':  'how you carry yourself and project into the world is being pressure-tested — what you\'ve assumed about your own presentation may not hold.',
  'Saturn|challenging|2':  'your relationship with money, security, and self-worth is being scrutinized — what has felt solid financially or internally may need honest reassessment.',
  'Saturn|challenging|3':  'communication and day-to-day thinking are meeting friction — messages need care, and overpromising will catch up with you.',
  'Saturn|challenging|4':  'your foundations — home, family, and emotional roots — are being pressure-tested — what has felt stable may need to be rebuilt on firmer ground.',
  'Saturn|challenging|5':  'creative expression and the ability to access joy are meeting resistance — pleasure that came easily now requires deliberate effort.',
  'Saturn|challenging|6':  'daily routines, work habits, and health practices are being held to account — what isn\'t sustainable will become apparent.',
  'Saturn|challenging|7':  'a committed relationship or important one-on-one dynamic is being examined for durability — what isn\'t working can\'t be deferred.',
  'Saturn|challenging|8':  'shared resources, debts, or deep emotional entanglements are surfacing for reckoning — transparency is necessary even when inconvenient.',
  'Saturn|challenging|9':  'long-held beliefs or your sense of life\'s meaning are meeting a reality check — certainty may dissolve before it can be rebuilt.',
  'Saturn|challenging|10': 'career standing, public reputation, or ambitions are under scrutiny — the work you\'ve done will be weighed and gaps will show.',
  'Saturn|challenging|11': 'friendships, networks, or long-term goals are being tested — some connections won\'t hold the weight you\'ve placed on them.',
  'Saturn|challenging|12': 'unconscious patterns or spiritual avoidances are surfacing — what you\'ve been postponing internally can\'t be indefinitely deferred.',
  // Saturn + harmonious
  'Saturn|harmonious|1':  'the structure you\'ve been building within yourself is becoming visible — others are beginning to see the person you\'ve been developing.',
  'Saturn|harmonious|2':  'patient work on finances or self-worth is beginning to pay off — resources are steadying, and what you\'ve built has real footing.',
  'Saturn|harmonious|3':  'clear communication and consistent learning are producing results — this is a good time for serious writing, study, or difficult conversations.',
  'Saturn|harmonious|4':  'foundations at home are stabilizing — family bonds or domestic arrangements that required work are settling into something durable.',
  'Saturn|harmonious|5':  'creative efforts made with discipline are finding expression — what you\'ve practiced is ready to be shared.',
  'Saturn|harmonious|6':  'healthy routines and work habits established over time are paying off — your consistency is building something real.',
  'Saturn|harmonious|7':  'a partnership built on maturity and mutual respect is strengthening — boundaries that felt limiting may now feel like structure.',
  'Saturn|harmonious|8':  'work done on shared finances or deep emotional patterns is yielding stability — trust earned over time is real.',
  'Saturn|harmonious|9':  'beliefs grounded in experience are crystallizing — wisdom earned through difficulty is becoming clear and available.',
  'Saturn|harmonious|10': 'career efforts and long-term professional commitments are being recognized — this is a window to take the next professional step.',
  'Saturn|harmonious|11': 'long-term goals and social contributions built steadily are gaining traction — the community work you\'ve done is finding its footing.',
  'Saturn|harmonious|12': 'inner work and spiritual practice are quietly bearing fruit — solitude and reflection are producing real clarity.',
  // Jupiter + harmonious
  'Jupiter|harmonious|1':  'confidence and presence are expanding — you\'re more compelling to others than usual, and new doors are opening around identity and self-expression.',
  'Jupiter|harmonious|2':  'financial opportunities and resource expansion are opening — this is a good window for income growth, investment, or asking for what you\'re worth.',
  'Jupiter|harmonious|3':  'ideas are flowing and communication is fortunate — send the pitch, have the conversation, reach out to someone you\'ve been meaning to contact.',
  'Jupiter|harmonious|4':  'home life is brightening and family relationships have room to grow — improving your living situation or healing family dynamics is supported.',
  'Jupiter|harmonious|5':  'creative energy and romantic openings are available — reach toward what brings you joy, express yourself, and allow pleasure rather than deferring it.',
  'Jupiter|harmonious|6':  'health and daily work conditions have potential to improve — a better routine or work environment is within reach.',
  'Jupiter|harmonious|7':  'partnership opportunities are available — if a relationship has been stagnant, this is a window for growth; new partnerships can form with real momentum.',
  'Jupiter|harmonious|8':  'shared resources or financial partnership is favorable — debt reduction, investment collaboration, or unexpected income may appear.',
  'Jupiter|harmonious|9':  'travel, higher learning, and philosophical expansion are opening — pursue the trip, the course, or the teacher you\'ve been drawn to.',
  'Jupiter|harmonious|10': 'career advancement and professional recognition are available — ask for the promotion, launch the project, take the next public step.',
  'Jupiter|harmonious|11': 'social networks and future-oriented goals are expanding — the group you want to be part of, or the aspiration you\'ve held, has wind behind it.',
  'Jupiter|harmonious|12': 'spiritual depth and inner peace are accessible — retreat, creative solitude, or healing work will carry unusual richness.',
  // Jupiter + challenging
  'Jupiter|challenging|1':  'overconfidence or overextension in how you present yourself — you may be promising more than current foundations support.',
  'Jupiter|challenging|2':  'financial overextension is a risk — the abundance seems real but may be borrowed or premature; ground any big spending decisions.',
  'Jupiter|challenging|3':  'ideas and communications are overreaching — enthusiasm is running ahead of follow-through; slow down before committing.',
  'Jupiter|challenging|4':  'home or family matters are inflating beyond their actual stability — a move or domestic change may look better than it is.',
  'Jupiter|challenging|5':  'pleasure and romance are tempting toward excess — what feels like an open window may have conditions not yet visible.',
  'Jupiter|challenging|6':  'health habits or work commitments may be overextended — more is not always more right now.',
  'Jupiter|challenging|7':  'a relationship or partnership may feel expansive but is also revealing its strains — don\'t mistake chemistry for compatibility.',
  'Jupiter|challenging|8':  'financial entanglements or shared debts are amplifying — clarity and caution are needed before deepening shared resources.',
  'Jupiter|challenging|9':  'beliefs are expanding but may be outrunning actual evidence — stay curious rather than becoming certain.',
  'Jupiter|challenging|10': 'career ambitions are running high but may exceed what current structures can support — plan, but don\'t overcommit publicly.',
  'Jupiter|challenging|11': 'social expansion and group involvement are pulling in multiple directions — not every invitation or alliance is equally solid.',
  'Jupiter|challenging|12': 'spiritual or escapist tendencies may be inflating — examine what you\'re avoiding by retreating.',
  // Pluto + challenging
  'Pluto|challenging|1':  'how you define and present yourself is undergoing deep, irreversible restructuring — old identities are breaking down, and a more authentic version is forcing its way through.',
  'Pluto|challenging|2':  'deep financial patterns or inherited attitudes about money and worth are being dismantled — what felt secure may not be, and rebuilding requires honesty about real value.',
  'Pluto|challenging|3':  'the way you think and communicate is being fundamentally reorganized — patterns of mind long taken for granted are being stripped and rebuilt.',
  'Pluto|challenging|4':  'the foundations of your private life — home, family lineage, emotional security — are being permanently transformed; what can\'t be rebuilt on honest ground is falling.',
  'Pluto|challenging|5':  'your relationship with creativity and self-expression is undergoing deep transformation — old pleasures may lose meaning as more authentic ones push forward.',
  'Pluto|challenging|6':  'daily structures, health, and work patterns are being fundamentally disrupted — what isn\'t serving your evolution is being stripped away.',
  'Pluto|challenging|7':  'a pivotal relationship is being transformed — power dynamics are surfacing, and both must evolve or the bond cannot continue in its current form.',
  'Pluto|challenging|8':  'deep psychological material or intimate dynamics are surfacing for permanent transformation — avoidance is no longer possible.',
  'Pluto|challenging|9':  'core beliefs and philosophical frameworks are being dismantled at the root — what you were certain was true is being tested.',
  'Pluto|challenging|10': 'career trajectory and professional power dynamics are undergoing permanent transformation — the work you do in the world is being fundamentally reshaped.',
  'Pluto|challenging|11': 'social networks and long-term aspirations are being transformed — alliances that no longer reflect who you\'re becoming cannot be maintained.',
  'Pluto|challenging|12': 'unconscious patterns and spiritual foundations are being dissolved and rebuilt — what operated in the shadows is surfacing for permanent transformation.',
  // Pluto + harmonious
  'Pluto|harmonious|1':  'a deep transformation of how you present yourself is becoming integrated — the person you\'ve been becoming is now more fully visible and coherent.',
  'Pluto|harmonious|2':  'resources and self-worth that have been through significant change are stabilizing into a more authentic form — what you truly value is clearer now.',
  'Pluto|harmonious|3':  'how you think and communicate has been deepened by experience — insights previously difficult to articulate are now coming through clearly.',
  'Pluto|harmonious|4':  'private life and inner foundations that have been through transformation are settling into something more honest and durable.',
  'Pluto|harmonious|5':  'creative and expressive channels that have been through deep change are opening with unusual depth and authenticity.',
  'Pluto|harmonious|6':  'work and health patterns that have been fundamentally reorganized are beginning to produce results aligned with your real priorities.',
  'Pluto|harmonious|7':  'a relationship that has been through significant transformation is now more authentic — the work done together is creating something real.',
  'Pluto|harmonious|8':  'psychological depth and shared resources that have been through intense examination are yielding clarity and a sense of genuine power.',
  'Pluto|harmonious|9':  'beliefs tested by transformation are now more grounded and integrated — wisdom earned through difficulty is available and clear.',
  'Pluto|harmonious|10': 'career and public identity reshaped through significant change are stabilizing into something more authentic and durable.',
  'Pluto|harmonious|11': 'social connections and aspirations transformed by deep change are now more aligned with who you actually are.',
  'Pluto|harmonious|12': 'unconscious patterns surfaced through inner work are beginning to integrate — spiritual depth built through transformation is real.',
  // Uranus + challenging
  'Uranus|challenging|1':  'a sudden, disruptive shift in how you see yourself and how others see you — the identity that felt stable is fragmenting as a freer version pushes through.',
  'Uranus|challenging|2':  'financial instability or sudden shifts in income and material security — what felt reliable is proving variable; adaptability matters more than planning.',
  'Uranus|challenging|3':  'communication patterns are disrupted and thoughts are restless — ideas arrive suddenly and conversations can escalate unexpectedly.',
  'Uranus|challenging|4':  'home life is being disrupted — a move, family upheaval, or sudden change to your private foundations is arriving, wanted or not.',
  'Uranus|challenging|5':  'creative and romantic life is being shaken loose from patterns — what you thought you wanted in pleasure and love may suddenly feel too small.',
  'Uranus|challenging|6':  'routines and work situations are being disrupted — inflexibility will be costly; agility and willingness to adapt are the assets here.',
  'Uranus|challenging|7':  'a key relationship is encountering sudden change or rupture — the dynamic that has been stable may no longer hold in its current form.',
  'Uranus|challenging|8':  'financial entanglements or psychological patterns are suddenly surfacing — what has been kept hidden is coming into the light.',
  'Uranus|challenging|9':  'beliefs and philosophical certainties are being shocked — what you were sure of is being revealed as incomplete or limiting.',
  'Uranus|challenging|10': 'career and public standing are encountering sudden disruption — the trajectory assumed may shift without warning.',
  'Uranus|challenging|11': 'social networks and future aspirations are being disrupted — alliances that felt solid may prove unstable; unexpected connections arrive.',
  'Uranus|challenging|12': 'hidden patterns or unconscious content is suddenly surfacing — what has been suppressed is breaking through, disrupting assumed inner stability.',
  // Uranus + harmonious
  'Uranus|harmonious|1':  'a liberating shift in identity is available — aspects of yourself you\'ve been suppressing are ready to emerge, and others will receive them well.',
  'Uranus|harmonious|2':  'innovative approaches to finances or material life are opening — unusual or unexpected sources of income or value are available.',
  'Uranus|harmonious|3':  'mental agility and original thinking are at a peak — ideas that arrive now are worth following, and unconventional communication will land.',
  'Uranus|harmonious|4':  'a refreshing change to home life or family dynamics is available — reorganizing or renegotiating domestic roles is supported.',
  'Uranus|harmonious|5':  'creative breakthroughs and surprising romantic openings are available — allow yourself to be less conventional in how you express and enjoy life.',
  'Uranus|harmonious|6':  'a liberating change to daily routines or work structure is available — this is a good time to adopt new practices or restructure how you work.',
  'Uranus|harmonious|7':  'a relationship is evolving in a more authentic and free direction — unusual connections or renewed independence within a bond is available.',
  'Uranus|harmonious|8':  'psychological insight and financial innovation are opening — new perspectives on shared resources or inner dynamics arrive with unusual clarity.',
  'Uranus|harmonious|9':  'a breakthrough in beliefs or a sudden opportunity for expanded learning or travel is available — the horizon is wider than it has appeared.',
  'Uranus|harmonious|10': 'a liberating career shift or unconventional path to professional recognition is opening — the unexpected opportunity is worth serious consideration.',
  'Uranus|harmonious|11': 'new social connections and future-oriented breakthroughs are available — the group or movement you\'ve been seeking is more accessible.',
  'Uranus|harmonious|12': 'inner liberation from old patterns is available — spiritual insights or creative breakthroughs arising from solitude and reflection are genuine.',
  // Neptune + challenging
  'Neptune|challenging|1':  'your sense of self and how others perceive you is becoming blurred — what you project may not match what others receive, and assumption-checking is necessary.',
  'Neptune|challenging|4':  'the emotional foundations of home and family are softening into uncertainty — what you\'ve assumed about belonging or roots may dissolve before it can be seen clearly.',
  'Neptune|challenging|7':  'a relationship is losing definition — what seemed clear about the bond or the other person is proving more ambiguous than assumed.',
  'Neptune|challenging|10': 'professional direction and public identity are entering a period of dissolution — what you\'ve built your reputation on may be shifting.',
  // Neptune + harmonious
  'Neptune|harmonious|5':  'creative and imaginative capacity is heightened — this is a window for artistic work, spiritual practice, or experiences of genuine beauty.',
  'Neptune|harmonious|7':  'a relationship deepens into something more spiritually resonant — the ordinary becomes meaningful, and connection carries unusual depth.',
  'Neptune|harmonious|9':  'philosophical and spiritual insight is flowing with unusual clarity — the meaning you\'ve been seeking is closer than usual.',
  'Neptune|harmonious|12': 'the boundary between conscious and unconscious is thinning productively — dreams, meditation, and creative solitude are especially rich.',
}

/** Guidance phrase by "${planet}|${nature}" with optional house overrides. */
const ASPECT_GUIDANCE: Partial<Record<string, string>> = {
  // By planet + nature (applies across all houses unless house-specific override added)
  'Saturn|challenging':   'Face the pattern directly rather than managing around it — what gets examined and restructured now builds a foundation that actually holds.',
  'Saturn|harmonious':    'Commit to the structure you\'ve been building — this is a window for patient, deliberate progress that produces results that last.',
  'Jupiter|harmonious':   'Initiate, reach out, ask, say yes to the opportunity — the window is open and action taken now has genuine momentum behind it.',
  'Jupiter|challenging':  'Pause before overcommitting — the enthusiasm is real but the picture isn\'t complete yet; investigate before expanding.',
  'Pluto|challenging':    'Go toward what is being revealed rather than away from it — the transformation is happening regardless, and facing it directly reduces the cost.',
  'Pluto|harmonious':     'Act from the deeper version of yourself that difficulty has revealed — this is a window to integrate transformation rather than just survive it.',
  'Uranus|challenging':   'Stay flexible and don\'t force the disruption into a predetermined shape — what breaks is creating room, even if that isn\'t apparent yet.',
  'Uranus|harmonious':    'Take the unconventional step — the window for change without penalty is open, and playing it safe will feel like a missed opportunity.',
  'Neptune|challenging':  'Verify rather than assume — clarity is harder than usual, and decisions made on feeling alone may need revisiting.',
  'Neptune|harmonious':   'Make space for creative and spiritual work — what arrives through imagination and inner listening now carries unusual depth.',
  'Mars|challenging':     'Don\'t escalate conflict or push through resistance by force — the friction here needs to be worked with, not overcome.',
  'Mars|harmonious':      'Direct the energy toward something concrete — the drive available now benefits from a clear target and purposeful action.',
  'Venus|harmonious':     'Reach toward connection, pleasure, and beauty — this is a window for what genuinely brings you alive, and it doesn\'t need justification.',
  'Venus|challenging':    'Resist the temptation to resolve tension through pleasing others — what needs addressing isn\'t going to settle on its own.',
  'Sun|harmonious':       'Take the step toward visibility — this is a window for presence, creative expression, and being seen as you actually are.',
  'Sun|challenging':      'Notice where ego investment is clouding clarity — the friction is pointing to something worth examining rather than defending.',
  'Mercury|harmonious':   'Say what you mean clearly and promptly — conversations opened now are easier to navigate than they\'ve been.',
  'Mercury|challenging':  'Slow down communications — what seems clear to you may not be landing as intended; reread before sending.',
  'Moon|harmonious':      'Trust your emotional instincts — the feeling you have about this is more reliable than usual.',
  'Moon|challenging':     'Give yourself space before reacting — the emotional intensity is informative but not directive.',
  'Chiron|challenging':   'The wound surfacing isn\'t asking to be fixed — it\'s asking to be seen. Witnessing it without judgment is the practice.',
  'Chiron|harmonious':    'A healing integration is available — something that has been painful is shifting toward understanding.',
}

// ─── Power day interpretation tables ─────────────────────────────────────────

/** Reason and guidance phrases for angle-contact power days. Key: "${planet}|${aspectType}|${angle}". */
const POWER_DAY_PHRASES: Partial<Record<string, { reason: string; guidance: string }>> = {
  // Saturn
  'Saturn|conjunction|ASC': {
    reason:   'Saturn arrives at your Ascendant — the way you carry yourself in the world is being restructured, and what others have assumed about you may not hold.',
    guidance: 'Let the old presentation go deliberately rather than waiting for it to be stripped away — what you build in its place will be more authentically yours.',
  },
  'Saturn|conjunction|MC': {
    reason:   'Saturn reaches your Midheaven — career direction and public responsibility are being weighed and reshaped.',
    guidance: 'Be honest about what you\'re actually building professionally — the ambitions that survive this scrutiny are the ones worth keeping.',
  },
  'Saturn|opposition|ASC': {
    reason:   'Saturn pressing opposite your Ascendant — key relationships and the way others perceive you are being tested for authenticity.',
    guidance: 'Face the relational pattern being highlighted rather than managing around it — what emerges from honest engagement will be more durable.',
  },
  'Saturn|opposition|MC': {
    reason:   'Saturn pressing opposite your Midheaven — the gap between private reality and public ambition is becoming visible.',
    guidance: 'Bring your inner life and outer commitments into alignment — the dissonance you\'ve been carrying is asking to be resolved.',
  },
  'Saturn|square|ASC': {
    reason:   'Saturn pressing on your Ascendant axis — how you project into the world and how others receive you is under significant pressure.',
    guidance: 'Work with the friction rather than against it — the identity being stress-tested is becoming something more solid.',
  },
  'Saturn|square|MC': {
    reason:   'Saturn pressing on your Midheaven — the career structure you\'ve built is being stress-tested for whether it can hold what you\'re building toward.',
    guidance: 'Address the gap between ambition and foundation rather than pushing through it — what you consolidate now will support what comes next.',
  },
  'Saturn|trine|ASC': {
    reason:   'Saturn flowing toward your Ascendant — disciplined work on how you carry yourself is producing visible, durable results.',
    guidance: 'Commit to the identity work you\'ve been doing — this is a window where steady effort produces recognition that lasts.',
  },
  'Saturn|trine|MC': {
    reason:   'Saturn supporting your Midheaven — the effort invested in your career is crystallizing into tangible recognition.',
    guidance: 'Take the next professional step with confidence — the groundwork you\'ve laid is ready to support it.',
  },
  'Saturn|sextile|ASC': {
    reason:   'Saturn opening toward your Ascendant — a window to solidify the image you project with real, lasting structure.',
    guidance: 'Act on the identity change you\'ve been considering — the conditions are favorable and the timing is practical.',
  },
  'Saturn|sextile|MC': {
    reason:   'Saturn opening toward your Midheaven — a practical opportunity to advance professional standing through steady, disciplined work.',
    guidance: 'Make the deliberate professional move — the opening is available and steady effort will be recognized.',
  },
  // Jupiter
  'Jupiter|conjunction|ASC': {
    reason:   'Jupiter arrives at your Ascendant — a significant expansion of confidence, presence, and how the world receives you.',
    guidance: 'Step into more visible territory — the door is open wider than usual and hesitation is the main obstacle.',
  },
  'Jupiter|conjunction|MC': {
    reason:   'Jupiter reaches your Midheaven — a notable expansion of career opportunity and public recognition is available.',
    guidance: 'Ask for the promotion, launch the project, say yes to the public step — the professional window is genuinely open.',
  },
  'Jupiter|opposition|ASC': {
    reason:   'Jupiter opposite your Ascendant — relationship and partnership expansion is pulling you toward others in significant ways.',
    guidance: 'Lean into partnership and collaboration — the growth available now comes through others, not despite them.',
  },
  'Jupiter|opposition|MC': {
    reason:   'Jupiter opposite your Midheaven — private life and foundational matters are expanding in ways that affect your public direction.',
    guidance: 'Let the growth in your personal life inform your professional direction — the inner expansion is the foundation.',
  },
  'Jupiter|square|ASC': {
    reason:   'Jupiter pressing on your Ascendant — expansion of identity and self-presentation may be outrunning current foundations.',
    guidance: 'Check that your confidence is backed by substance — the opportunity is real but overextension has a cost.',
  },
  'Jupiter|square|MC': {
    reason:   'Jupiter pressing on your Midheaven — career ambitions are expanding rapidly but may exceed what current structures can support.',
    guidance: 'Pursue the ambition with one eye on sustainability — plan fully before overcommitting publicly.',
  },
  'Jupiter|trine|ASC': {
    reason:   'Jupiter flowing toward your Ascendant — expansion of presence, confidence, and self-expression is available with natural ease.',
    guidance: 'Take up more space and initiate — the ease available now is genuine and the window won\'t stay this wide.',
  },
  'Jupiter|trine|MC': {
    reason:   'Jupiter supporting your Midheaven — career expansion and professional recognition are available with unusually little resistance.',
    guidance: 'Advance the professional goal you\'ve been holding back — the conditions are favorable and the timing is right.',
  },
  'Jupiter|sextile|ASC': {
    reason:   'Jupiter opening toward your Ascendant — an accessible window for expanding how you present and carry yourself.',
    guidance: 'Reach toward the opportunity for personal growth — the opening is modest but real and worth taking.',
  },
  'Jupiter|sextile|MC': {
    reason:   'Jupiter opening toward your Midheaven — a practical career or reputation opportunity is available through consistent, visible effort.',
    guidance: 'Make the professional move you\'ve been considering — the conditions are supportive and the timing is favorable.',
  },
  // Pluto
  'Pluto|conjunction|ASC': {
    reason:   'Pluto arrives at your Ascendant — a fundamental, irreversible transformation of how you project yourself into the world is underway.',
    guidance: 'Go toward the transformation rather than managing it from a distance — what you let go of now creates the space for what you actually want to become.',
  },
  'Pluto|conjunction|MC': {
    reason:   'Pluto reaches your Midheaven — career identity and public role are undergoing fundamental, permanent restructuring.',
    guidance: 'Don\'t defend the old professional identity — the transformation points toward something more aligned with your actual power.',
  },
  'Pluto|opposition|ASC': {
    reason:   'Pluto opposite your Ascendant — deep transformation in close relationships and the way others hold power with you.',
    guidance: 'Address the power dynamics surfacing in your closest relationships — avoidance will cost more than honest engagement.',
  },
  'Pluto|opposition|MC': {
    reason:   'Pluto opposite your Midheaven — deep transformation of private foundations is reshaping your public direction.',
    guidance: 'Let the inner transformation inform what you build publicly — the work done in private is the real career move.',
  },
  'Pluto|square|ASC': {
    reason:   'Pluto pressing on your Ascendant — the identity you\'ve carried into the world is being stripped and rebuilt at depth.',
    guidance: 'Release what you\'ve outgrown rather than defending it — the version of yourself pushing through is more true.',
  },
  'Pluto|square|MC': {
    reason:   'Pluto pressing on your Midheaven — career trajectory and public identity are being permanently reshaped by deep pressure.',
    guidance: 'Face the professional transformation directly — what survives this pressure is what you\'re actually built to do.',
  },
  'Pluto|trine|ASC': {
    reason:   'Pluto supporting your Ascendant — the deep transformation you\'ve been undergoing is integrating into how you carry yourself.',
    guidance: 'Act from the more powerful version of yourself that has emerged — the integration is real and the expression of it will land.',
  },
  'Pluto|trine|MC': {
    reason:   'Pluto flowing toward your Midheaven — transformation already underway is now available to express through career and public life.',
    guidance: 'Bring your depth into your professional work — what has been revealed internally is your actual advantage.',
  },
  'Pluto|sextile|ASC': {
    reason:   'Pluto opening toward your Ascendant — a window to express transformed self-understanding in how you present to the world.',
    guidance: 'Take one concrete step toward the person you\'ve been becoming — the integration available now is worth acting on.',
  },
  'Pluto|sextile|MC': {
    reason:   'Pluto opening toward your Midheaven — a window to bring deep personal transformation into professional expression.',
    guidance: 'Let the inner work shape the outer work — the professional move that reflects who you\'ve become is the right one.',
  },
  // Uranus
  'Uranus|conjunction|ASC': {
    reason:   'Uranus arrives at your Ascendant — a sudden, liberating disruption of how you carry yourself and who you present to the world.',
    guidance: 'Allow the change rather than managing it back into the familiar — what breaks loose is asking to be more freely expressed.',
  },
  'Uranus|conjunction|MC': {
    reason:   'Uranus reaches your Midheaven — a sudden, unexpected disruption or liberation of career direction and public identity.',
    guidance: 'Stay open to the unconventional path that is emerging — the surprise is the direction, not an obstacle to it.',
  },
  'Uranus|opposition|ASC': {
    reason:   'Uranus opposite your Ascendant — relationships are bringing sudden change, liberation, or disruption to how you relate.',
    guidance: 'Let the relationship changes happen rather than forcing them back into the old shape — freedom coming through others is still freedom.',
  },
  'Uranus|opposition|MC': {
    reason:   'Uranus opposite your Midheaven — a sudden shift from the private or foundational side of life is disrupting your public trajectory.',
    guidance: 'Trust that the disruption is clarifying — what needs to change about your public direction is being shown from the inside out.',
  },
  'Uranus|square|ASC': {
    reason:   'Uranus pressing on your Ascendant — sudden, unpredictable changes to identity and self-presentation are breaking old patterns.',
    guidance: 'Stay flexible rather than insisting on stability — the friction is pushing you toward a freer version of yourself.',
  },
  'Uranus|square|MC': {
    reason:   'Uranus pressing on your Midheaven — career direction is encountering sudden, disruptive pressure from an unexpected angle.',
    guidance: 'Respond to the disruption creatively rather than defensively — the unconventional path opening may be more right than the one being disrupted.',
  },
  'Uranus|trine|ASC': {
    reason:   'Uranus flowing toward your Ascendant — a liberating shift in how you carry yourself and express your identity is available with unusual ease.',
    guidance: 'Take the unconventional step — the window for change without major disruption is open and won\'t stay this clean.',
  },
  'Uranus|trine|MC': {
    reason:   'Uranus supporting your Midheaven — a liberating shift in career direction or public identity is available without major disruption.',
    guidance: 'Move toward the professional change you\'ve been considering — the conditions for an unconventional step are favorable.',
  },
  'Uranus|sextile|ASC': {
    reason:   'Uranus opening toward your Ascendant — a window for a liberating, low-disruption change to how you present yourself.',
    guidance: 'Try the unconventional expression — the small step toward a freer self-presentation is easier now than usual.',
  },
  'Uranus|sextile|MC': {
    reason:   'Uranus opening toward your Midheaven — a modest but real opportunity for an unexpected or unconventional career move.',
    guidance: 'Consider the professional path that seemed too unusual — the opening is real even if the logic isn\'t conventional.',
  },
}

/** House domain phrase for each natal angle. */
const ANGLE_DOMAIN: Record<'ASC' | 'MC', string> = {
  ASC: 'a significant moment for identity and how the world first meets you',
  MC: 'a significant moment for career decisions and public commitments',
}

// ─── Angular difference helper ────────────────────────────────────────────────

/**
 * Normalize angular difference between two ecliptic longitudes to [0, 180].
 */
function angularDiff(lon1: number, lon2: number): number {
  let diff = Math.abs(lon1 - lon2) % 360
  if (diff > 180) diff = 360 - diff
  return diff
}

// ─── Scoring functions ────────────────────────────────────────────────────────

/**
 * Compute constellation combined weight for a set of aspects.
 * sum(PLANET_WEIGHT[planet] × (1 − orb/maxOrb)) across all aspects.
 * Slow planets dominate due to higher weight values; fast-planet noise stays below threshold.
 */
export function computeCombinedWeight(aspects: TransitAspect[], maxOrb: number): number {
  return aspects.reduce((sum, a) => {
    const w = PLANET_WEIGHT[a.transitPlanet as string] ?? 1
    return sum + w * (1 - a.orb / maxOrb)
  }, 0)
}


/**
 * Check whether a transit planet longitude forms a recognized aspect
 * within the given max orb to an angle longitude.
 */
export function detectAngleContact(
  transitLon: number,
  angleLon: number,
  maxOrb: number,
): { aspectType: AspectType; orb: number } | null {
  const angle = angularDiff(transitLon, angleLon)
  let best: { aspectType: AspectType; orb: number } | null = null

  for (const def of ASPECT_DEFINITIONS) {
    const orb = Math.abs(angle - def.angle)
    if (orb <= maxOrb) {
      if (!best || orb < best.orb) {
        best = { aspectType: def.name, orb: Math.round(orb * 100) / 100 }
      }
    }
  }

  return best
}

/**
 * Build the reason and guidance for a power-day score.
 */
function buildPowerReason(
  planet: PlanetName,
  aspectType: AspectType,
  angleKey: 'ASC' | 'MC',
): { reason: string; bannerBoldFragment: string; guidance?: string } {
  const key = `${planet}|${aspectType}|${angleKey}`
  const entry = POWER_DAY_PHRASES[key]
  if (entry) return { ...entry, bannerBoldFragment: planet }

  // Fallback: use verb table and angle domain
  const angleName = angleKey === 'ASC' ? 'your Ascendant' : 'your Midheaven'
  const verb = ASPECT_VERB_BANNER[aspectType] ?? 'contacts'
  const domain = ANGLE_DOMAIN[angleKey]
  return {
    reason: `${planet} ${verb} ${angleName} — ${domain}.`,
    bannerBoldFragment: planet,
  }
}

/**
 * Build the reason and guidance for a favorable/challenging score.
 */
function buildAspectReason(
  tightest: TransitAspect,
  category: 'favorable' | 'challenging',
): { reason: string; bannerBoldFragment: string; guidance?: string } {
  const planet = tightest.transitPlanet as string
  const natalPlanet = tightest.natalPlanet as string
  const house = tightest.natalHouse
  const nature = tightest.nature === 'harmonious' ? 'harmonious' : 'challenging'
  const applying = tightest.applying

  // Verb phrase from archetype table
  const phrases = TRANSIT_PLANET_PHRASES[planet]

  if (house && house >= 1 && house <= 12 && phrases) {
    const houseTheme = getHouseTheme(house)
    const phrasePair = phrases[nature as 'harmonious' | 'challenging'] ?? phrases.neutral
    const verbPhrase = applying ? phrasePair.applying : phrasePair.separating
    const ordHouse = houseOrdinal(house)
    const houseShortName = houseTheme.name.replace('House of ', '').toLowerCase()

    const contextKey = `${planet}|${nature}|${house}`
    const contextPhrase = ASPECT_HOUSE_CONTEXT[contextKey]
      ?? `${houseTheme.theme.toLowerCase()} themes are ${nature === 'harmonious' ? 'supported and opening' : 'under pressure and active'}.`

    const reason = `${planet} ${verbPhrase} your ${natalPlanet} in your ${ordHouse} house (${houseShortName}) — ${contextPhrase}`

    const guidanceKey = `${planet}|${nature}`
    const guidance = ASPECT_GUIDANCE[guidanceKey]

    return { reason, bannerBoldFragment: planet, guidance }
  }

  // Fallback (no house data or unrecognized planet)
  const domainMap: Partial<Record<string, string>> = {
    Pluto: 'transformation and power', Neptune: 'inspiration and surrender',
    Uranus: 'disruption and revelation', Saturn: 'structure and discipline',
    Jupiter: 'expansion and opportunity', Mars: 'drive and assertion',
    Sun: 'vitality and purpose', Venus: 'connection and beauty',
    Mercury: 'communication and thought', Moon: 'feeling and instinct',
  }
  const type = tightest.type
  const domain = domainMap[planet] ?? 'planetary energy'

  const reason = category === 'favorable'
    ? `${planet} ${type} your natal ${natalPlanet} — a window of ${domain}.`
    : `${planet} ${type} your natal ${natalPlanet} — tension around ${domain}.`

  return { reason, bannerBoldFragment: planet }
}

/**
 * scoreSnapshot — pure scoring function for a single snapshot.
 * spec 1.3–1.12
 */
export function scoreSnapshot(
  snapshot: AdvanceSnapshot,
  prev: AdvanceSnapshot | null,
  chartData: ChartData,
  period: TransitPeriod,
): SnapshotScore {
  const neutral: SnapshotScore = { category: 'neutral', intensity: 0, reason: '', coShift: false }

  // spec 1.4 / 12.1: offset 0 is always neutral
  if (snapshot.offset === 0) return neutral

  const orbs = ORB_THRESHOLDS[period]

  // ── Detect station crossing (spec 1.5 priority 2, spec 1.10) ─────────────
  let stationPlanet: string | undefined
  let stationDirection: 'retrograde' | 'direct' | undefined

  if (prev) {
    for (const curr of snapshot.retrogrades) {
      const prevR = prev.retrogrades.find(r => r.planet === curr.planet)
      if (prevR && prevR.isRetro !== curr.isRetro) {
        stationPlanet = curr.planet
        stationDirection = curr.isRetro ? 'retrograde' : 'direct'
        break
      }
    }
  }

  // ── Priority 1: power — slow planet within angleContact orb of natal angle ─
  if (!chartData.unknownTime) {
    const angleEntries: { key: 'ASC' | 'MC'; lon: number }[] = [
      { key: 'ASC', lon: chartData.angles.ascendant.longitude },
      { key: 'MC', lon: chartData.angles.midheaven.longitude },
    ]

    let bestContact: {
      planet: PlanetName
      angleKey: 'ASC' | 'MC'
      aspectType: AspectType
      orb: number
    } | null = null

    for (const tp of snapshot.transitPlanets) {
      if (!SLOW_PLANETS_FOR_BANNER.has(tp.name as PlanetName)) continue
      for (const { key, lon } of angleEntries) {
        const contact = detectAngleContact(tp.longitude, lon, orbs.angleContact)
        if (contact && (!bestContact || contact.orb < bestContact.orb)) {
          bestContact = {
            planet: tp.name as PlanetName,
            angleKey: key,
            aspectType: contact.aspectType,
            orb: contact.orb,
          }
        }
      }
    }

    if (bestContact) {
      const intensity = Math.max(0, 1.0 - (bestContact.orb / orbs.angleContact))
      const { reason, bannerBoldFragment, guidance } = buildPowerReason(bestContact.planet, bestContact.aspectType, bestContact.angleKey)

      // coShift check: if there's also a station
      const coShift = !!stationPlanet
      return {
        category: 'power',
        coShift,
        intensity,
        reason,
        bannerBoldFragment,
        guidance,
        shiftPlanet: coShift ? stationPlanet : undefined,
        shiftDirection: coShift ? stationDirection : undefined,
        triggerAspect: {
          transitPlanet: bestContact.planet,
          natalPlanet: bestContact.angleKey === 'ASC' ? 'Ascendant' : 'Midheaven',
          type: bestContact.aspectType,
          orb: bestContact.orb,
        },
      }
    }
  }

  // ── Priority 2: shift — station crossing (when no power) ─────────────────
  if (stationPlanet && stationDirection) {
    // check if favorable or challenging co-occur via combination weight
    const tightApplyingHarmonious = snapshot.transitAspects.filter(
      a => a.applying && a.orb <= orbs.applyingTight && a.nature === 'harmonious'
    )
    const tightApplyingChallenging = snapshot.transitAspects.filter(
      a => a.applying && a.orb <= orbs.applyingTight && a.nature === 'challenging'
    )

    const harmoniousWeight = computeCombinedWeight(tightApplyingHarmonious, orbs.applyingTight)
    const challengingWeight = computeCombinedWeight(tightApplyingChallenging, orbs.applyingTight)

    const harmSlowPlanet = tightApplyingHarmonious.some(a => COMBINATION_PLANETS.has(a.transitPlanet as string))
    const challSlowPlanet = tightApplyingChallenging.some(a => COMBINATION_PLANETS.has(a.transitPlanet as string))

    const isFavorable = harmoniousWeight >= (harmSlowPlanet ? COMBINATION_WEIGHT_THRESHOLD : COMBINATION_WEIGHT_THRESHOLD * 2)
    const isChallenging = challengingWeight >= (challSlowPlanet ? COMBINATION_WEIGHT_THRESHOLD : COMBINATION_WEIGHT_THRESHOLD * 2)

    if (isFavorable || isChallenging) {
      // Primary category is favorable/challenging, coShift = true
      const primaryCategory = isFavorable ? 'favorable' : 'challenging'
      const aspects = isFavorable ? tightApplyingHarmonious : tightApplyingChallenging
      const combinedWeight = isFavorable ? harmoniousWeight : challengingWeight
      const tightest = [...aspects].sort((a, b) =>
        (PLANET_WEIGHT[b.transitPlanet as string] ?? 0) - (PLANET_WEIGHT[a.transitPlanet as string] ?? 0)
      )[0]
      const intensity = Math.min(1, combinedWeight / COMBINATION_WEIGHT_NORMALIZE)

      const { reason: coShiftReason, bannerBoldFragment: coShiftBold, guidance: coShiftGuidance } = buildAspectReason(tightest, primaryCategory)
      return {
        category: primaryCategory,
        coShift: true,
        intensity,
        reason: coShiftReason,
        bannerBoldFragment: coShiftBold,
        guidance: coShiftGuidance,
        shiftPlanet: stationPlanet,
        shiftDirection: stationDirection,
        triggerAspect: {
          transitPlanet: tightest.transitPlanet,
          natalPlanet: tightest.natalPlanet,
          type: tightest.type,
          orb: tightest.orb,
        },
      }
    }

    // Pure shift — find nearest natal planet to station degree for context
    const stationTransitPlanet = snapshot.transitPlanets.find(tp => tp.name === stationPlanet)
    const stationLon = stationTransitPlanet?.longitude

    let nearestNatal: { name: string; house: number; diff: number } | null = null
    if (stationLon !== undefined) {
      for (const p of chartData.planets) {
        const diff = angularDiff(stationLon, p.longitude)
        if (diff <= 2.0) {
          if (!nearestNatal || diff < nearestNatal.diff) {
            nearestNatal = { name: p.name as string, house: p.house, diff }
          }
        }
      }
    }

    let shiftReason = `${stationPlanet} stations ${stationDirection}`
    if (nearestNatal) {
      const housePart = !chartData.unknownTime && nearestNatal.house > 0
        ? ` in your ${houseOrdinal(nearestNatal.house)} house`
        : ''
      shiftReason += `, holding near your natal ${nearestNatal.name}${housePart}`
    }
    const retroBrief = stationDirection === 'retrograde'
      ? TRANSIT_RETROGRADE[stationPlanet]?.brief
      : undefined
    shiftReason += retroBrief ? `. ${retroBrief}` : '.'

    return {
      category: 'shift',
      coShift: false,
      intensity: 0.8,
      reason: shiftReason,
      bannerBoldFragment: stationPlanet,
      shiftPlanet: stationPlanet,
      shiftDirection: stationDirection,
    }
  }

  // ── Priority 3: favorable — constellation-weight scoring ─────────────────
  // When a COMBINATION_PLANETS member (including Jupiter) is present, the base threshold applies.
  // Fast-planet-only clusters require twice the threshold to reduce noise.
  {
    const tightApplyingHarmonious = snapshot.transitAspects.filter(
      a => a.applying && a.orb <= orbs.applyingTight && a.nature === 'harmonious'
    )
    const combinedWeight = computeCombinedWeight(tightApplyingHarmonious, orbs.applyingTight)
    const hasSlowPlanet = tightApplyingHarmonious.some(a => COMBINATION_PLANETS.has(a.transitPlanet as string))
    const favorableThreshold = hasSlowPlanet ? COMBINATION_WEIGHT_THRESHOLD : COMBINATION_WEIGHT_THRESHOLD * 2

    if (combinedWeight >= favorableThreshold) {
      const tightest = [...tightApplyingHarmonious].sort((a, b) =>
        (PLANET_WEIGHT[b.transitPlanet as string] ?? 0) - (PLANET_WEIGHT[a.transitPlanet as string] ?? 0)
      )[0]
      const intensity = Math.min(1, combinedWeight / COMBINATION_WEIGHT_NORMALIZE)

      const { reason: favReason, bannerBoldFragment: favBold, guidance: favGuidance } = buildAspectReason(tightest, 'favorable')
      return {
        category: 'favorable',
        coShift: false,
        intensity,
        reason: favReason,
        bannerBoldFragment: favBold,
        guidance: favGuidance,
        triggerAspect: {
          transitPlanet: tightest.transitPlanet,
          natalPlanet: tightest.natalPlanet,
          type: tightest.type,
          orb: tightest.orb,
        },
      }
    }
  }

  // ── Priority 4: challenging — constellation-weight scoring ────────────────
  {
    const tightApplyingChallenging = snapshot.transitAspects.filter(
      a => a.applying && a.orb <= orbs.applyingTight && a.nature === 'challenging'
    )
    const combinedWeight = computeCombinedWeight(tightApplyingChallenging, orbs.applyingTight)
    const hasSlowPlanet = tightApplyingChallenging.some(a => COMBINATION_PLANETS.has(a.transitPlanet as string))
    const challengingThreshold = hasSlowPlanet ? COMBINATION_WEIGHT_THRESHOLD : COMBINATION_WEIGHT_THRESHOLD * 2

    if (combinedWeight >= challengingThreshold) {
      const tightest = [...tightApplyingChallenging].sort((a, b) =>
        (PLANET_WEIGHT[b.transitPlanet as string] ?? 0) - (PLANET_WEIGHT[a.transitPlanet as string] ?? 0)
      )[0]
      const intensity = Math.min(1, combinedWeight / COMBINATION_WEIGHT_NORMALIZE)

      const { reason: chalReason, bannerBoldFragment: chalBold, guidance: chalGuidance } = buildAspectReason(tightest, 'challenging')
      return {
        category: 'challenging',
        coShift: false,
        intensity,
        reason: chalReason,
        bannerBoldFragment: chalBold,
        guidance: chalGuidance,
        triggerAspect: {
          transitPlanet: tightest.transitPlanet,
          natalPlanet: tightest.natalPlanet,
          type: tightest.type,
          orb: tightest.orb,
        },
      }
    }
  }

  return neutral
}

// ─── Shared pre-calculation core ─────────────────────────────────────────────

/**
 * Shared advance pre-calculation loop.
 *
 * Encapsulates the three invariant phases that both `preCalculateSnapshots` and
 * `preCalculateCoupleSnapshots` share:
 *   1. Date-offset loop with monthly noon normalization.
 *   2. Hysteresis pass (spec 14.4).
 *   3. Two-phase density cap with category reservation (spec 1.13).
 *
 * @param period      Transit period driving the step size / noon-normalization logic.
 * @param baseDate    Origin date for offset 0.
 * @param config      Explicit config (allows callers to supply a custom max without
 *                    modifying ADVANCE_CONFIG — needed by SR advance preview).
 * @param buildSnapshot  Pure function that constructs every field of S except `score`
 *                       for a given resolved date and offset index.
 * @param scoreFunc   Pure function that computes SnapshotScore given the fully
 *                    constructed (but not yet scored) snapshot and the previous
 *                    snapshot (needed for station-crossing detection).
 */
export function runAdvancePreCalculation<S extends AdvanceSnapshot>(
  period: TransitPeriod,
  baseDate: Date,
  config: { max: number; msPerStep: number },
  buildSnapshot: (date: Date, offset: number) => Omit<S, 'score'>,
  scoreFunc: (snap: S, prev: S | null) => SnapshotScore,
): S[] {
  const neutral: SnapshotScore = { category: 'neutral', intensity: 0, reason: '', coShift: false }
  const snapshots: S[] = []

  for (let i = 0; i <= config.max; i++) {
    let targetDate: Date

    if (period === 'monthly') {
      // Use noon (12:00:00) for all offsets ≥ 1 to prevent Moon position inconsistency (spec 1.11).
      // Note: JavaScript normalizes out-of-range dates (e.g., Feb 31 → Mar 3).
      // This is a known limitation — the marker for any normalized date reflects
      // the actual computed date (snapshot.dateStr is derived from resolved targetDate),
      // so label and ephemeris remain consistent even if slider implies a different calendar date.
      targetDate = i === 0
        ? new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate())
        : new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate(), 12, 0, 0)
    } else {
      targetDate = new Date(baseDate.getTime() + i * config.msPerStep)
    }

    // Build everything except score, then attach placeholder score
    const partial = buildSnapshot(targetDate, i)
    const snap = { ...partial, score: neutral } as S

    // Compute score immediately (spec 1.12) — passing prev snapshot for station detection
    const prev = snapshots[i - 1] ?? null
    snap.score = scoreFunc(snap, prev)

    snapshots.push(snap)
  }

  // ── Post-processing: hysteresis pass (spec 14.4) ──────────────────────────
  // If consecutive snapshots i-1 and i+1 both score the same non-neutral category
  // but snapshot i does not, and the orb difference is small, inherit i-1's category.
  for (let i = 1; i < snapshots.length - 1; i++) {
    const prev = snapshots[i - 1]
    const curr = snapshots[i]
    const next = snapshots[i + 1]

    if (
      curr.score.category === 'neutral' &&
      prev.score.category !== 'neutral' &&
      prev.score.category === next.score.category &&
      prev.score.triggerAspect && curr.transitAspects.length > 0
    ) {
      // Check orb difference between i-1 and i for the trigger aspect
      const triggerPlanet = prev.score.triggerAspect.transitPlanet
      const triggerNatal = prev.score.triggerAspect.natalPlanet
      const prevOrb = prev.score.triggerAspect.orb
      const currAspect = curr.transitAspects.find(
        a => a.transitPlanet === triggerPlanet && a.natalPlanet === triggerNatal
      )
      if (currAspect && Math.abs(currAspect.orb - prevOrb) < MARKER_HYSTERESIS_ORB) {
        snapshots[i] = { ...curr, score: { ...prev.score } }
      }
    }
  }

  // ── Global density cap: max 20% of positions marked (spec 1.13) ──────────
  const nonNeutral = snapshots.filter(s => s.score.category !== 'neutral' && s.offset > 0)
  const maxMarkers = Math.ceil(config.max * 0.2)

  if (nonNeutral.length > maxMarkers) {
    // Phase 1: reserve the highest-intensity marker per non-neutral category present.
    // Iterates NON_NEUTRAL_CATEGORIES in fixed order so reservation is deterministic
    // regardless of the order categories happen to appear in the snapshot array.
    const NON_NEUTRAL_CATEGORIES: Exclude<MarkerCategory, 'neutral'>[] = [
      'power', 'favorable', 'challenging', 'shift',
    ]
    const reservedOffsets = new Set<number>()
    for (const cat of NON_NEUTRAL_CATEGORIES) {
      const best = nonNeutral
        .filter(s => s.score.category === cat)
        .sort((a, b) => b.score.intensity - a.score.intensity)[0]
      if (best) reservedOffsets.add(best.offset)
    }

    // Phase 2: fill remaining capacity from non-reserved markers by intensity
    const remaining = nonNeutral
      .filter(s => !reservedOffsets.has(s.offset))
      .sort((a, b) => b.score.intensity - a.score.intensity)
    const fillCount = maxMarkers - reservedOffsets.size
    for (let i = 0; i < fillCount && i < remaining.length; i++) {
      reservedOffsets.add(remaining[i].offset)
    }

    for (let i = 0; i < snapshots.length; i++) {
      if (snapshots[i].score.category !== 'neutral' && !reservedOffsets.has(snapshots[i].offset)) {
        snapshots[i] = {
          ...snapshots[i],
          score: neutral,
        }
      }
    }
  }

  return snapshots
}

// ─── Pre-calculator ──────────────────────────────────────────────────────────

export function preCalculateSnapshots(
  chartData: ChartData,
  period: TransitPeriod,
  baseDate: Date,
): AdvanceSnapshot[] {
  const config = ADVANCE_CONFIG[period]

  return runAdvancePreCalculation<AdvanceSnapshot>(
    period,
    baseDate,
    config,
    (date, offset) => {
      const transitPlanets = calculateCurrentPositions(date)
      const transitAspects = calculateTransitAspects(transitPlanets, chartData.planets, period)
      const retrogrades = getRetrogradeStatus(date)
      const housedTransitPlanets = assignTransitHouses(transitPlanets, chartData.houses)
      return {
        offset,
        date,
        dateStr: date.toISOString().split('T')[0],
        transitPlanets,
        housedTransitPlanets,
        transitAspects,
        retrogrades,
      }
    },
    (snap, prev) => scoreSnapshot(snap, prev, chartData, period),
  )
}
