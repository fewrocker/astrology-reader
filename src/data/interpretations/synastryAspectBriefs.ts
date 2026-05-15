import type { AspectType } from '../../engine/aspects'

// ─── Primary brief table ─────────────────────────────────────────────────────
// Keys: `${p1}_${aspectType}_${p2}` where p1 and p2 are sorted alphabetically.
// All briefs are written in second-person relational voice, symmetric framing.

export const SYNASTRY_ASPECT_BRIEFS: Record<string, string> = {
  // ── Sun / Moon ──────────────────────────────────────────────────────────────
  'Moon_Conjunction_Sun':
    'one of you carries the light, the other feels it — your sense of self and their emotional world fuse into something neither could name alone.',
  'Moon_Opposition_Sun':
    'your vitality and their feeling nature pull across the axis — what animates you can unsettle them, and what they need can ask you to dim yourself.',
  'Moon_Trine_Sun':
    'your core energy and their inner life move with each other — no translation is required, the contact sustains itself.',
  'Moon_Square_Sun':
    'the drive to be yourself meets the need to feel safe, and neither yields easily — the friction asks something genuine from both sides.',
  'Moon_Sextile_Sun':
    'your identity and their emotional nature offer each other a clear channel — warmth passes between you when you choose to engage it.',

  // ── Sun / Venus ─────────────────────────────────────────────────────────────
  'Sun_Conjunction_Venus':
    'your sense of self and their capacity for affection occupy the same space — they find you beautiful in a way that feels confirming rather than flattering.',
  'Sun_Opposition_Venus':
    'what you are and what they love sit across from each other — the attraction is real but the fit requires negotiation that neither can avoid.',
  'Sun_Trine_Venus':
    'your identity and their affection move without friction — they receive you with warmth that costs neither of you anything.',
  'Sun_Square_Venus':
    'your drive to be yourself creates tension with what they value — admiration is present but it cannot settle into ease.',
  'Sun_Sextile_Venus':
    'your self-expression and their affection meet at an open angle — the connection offers something and waits for you both to reach toward it.',

  // ── Sun / Mars ──────────────────────────────────────────────────────────────
  'Mars_Conjunction_Sun':
    'desire and identity occupy the same point — the contact is immediate, charged, and leaves little room for neutrality between you.',
  'Mars_Opposition_Sun':
    'their drive meets your sense of self head-on — you may energize each other or exhaust each other, and the line between the two is not always clear.',
  'Mars_Trine_Sun':
    'their motivation and your identity move in the same direction — action between you feels natural, momentum builds without needing to be forced.',
  'Mars_Square_Sun':
    'their drive presses against what you are — there is energy here, but it requires conscious direction or it becomes friction that neither intended.',
  'Mars_Sextile_Sun':
    'their desire and your identity offer each other traction — the contact has spark when you both choose to engage rather than wait.',

  // ── Sun / Sun ───────────────────────────────────────────────────────────────
  'Sun_Conjunction_Sun':
    'your core identities occupy the same space — the recognition is immediate, almost uncanny, and the relationship carries the intensity of two people who see themselves in each other.',
  'Sun_Opposition_Sun':
    'your identities stand across the axis from each other — you are attracted to what you are not, and the relationship asks you both to remain yourselves while holding the other.',
  'Sun_Trine_Sun':
    'your ways of being in the world move easily together — there is no need to explain yourself; they understand the shape of who you are.',
  'Sun_Square_Sun':
    'your identities press against each other — you each carry something the other must reckon with, and growth between you tends to come through friction rather than ease.',
  'Sun_Sextile_Sun':
    'your core natures offer each other an opening — the resonance is there when you lean into it, a quiet compatibility that rewards attention.',

  // ── Moon / Moon ─────────────────────────────────────────────────────────────
  'Moon_Conjunction_Moon':
    'your emotional rhythms overlap — you instinctively know what the other needs, and the shared undercurrent can feel like coming home.',
  'Moon_Opposition_Moon':
    `your inner lives reach for different kinds of comfort — you can hold the other's needs without erasing your own, but it asks deliberate care.`,
  'Moon_Trine_Moon':
    'your emotional natures flow together without effort — moods pass between you naturally, and neither has to explain what they feel.',
  'Moon_Square_Moon':
    'your needs for comfort pull in different directions — neither is wrong, but the gap between them requires patience before it becomes understanding.',
  'Moon_Sextile_Moon':
    'your inner rhythms can meet each other when you invite it — the emotional compatibility is real and grows with attention.',

  // ── Moon / Venus ────────────────────────────────────────────────────────────
  'Moon_Conjunction_Venus':
    'your emotional need and their capacity for affection fuse — they feel loved when you feel secure, and the tenderness between you is natural.',
  'Moon_Opposition_Venus':
    'your need for emotional safety and their sense of beauty and love sit in tension — the warmth is present but the timing is often slightly off.',
  'Moon_Trine_Venus':
    'your inner life and their affection find each other without obstacle — they feel your need before you voice it, and you receive their warmth easily.',
  'Moon_Square_Venus':
    'what you need emotionally and what they offer as affection do not quite align — the care is real, but its form creates friction.',
  'Moon_Sextile_Venus':
    'your emotional nature and their warmth can meet each other when both engage — the softness here is available and worth cultivating.',

  // ── Moon / Mars ─────────────────────────────────────────────────────────────
  'Moon_Conjunction_Mars':
    'feeling and desire occupy the same point — the contact is electrically alive but can turn volatile; what moves you emotionally also ignites them physically.',
  'Moon_Opposition_Mars':
    'your emotional world and their drive pull against each other — passion and sensitivity occupy opposite ends and require conscious navigation.',
  'Moon_Trine_Mars':
    'your emotional nature and their desire flow together — the contact is warm, active, and sustaining rather than draining.',
  'Moon_Square_Mars':
    'their desire presses against your emotional nature — the friction can produce heat or hurt depending on how much care each of you brings.',
  'Moon_Sextile_Mars':
    'your feeling nature and their drive offer each other an opening — warmth and action can move together when you both lean in.',

  // ── Venus / Mars ────────────────────────────────────────────────────────────
  'Mars_Conjunction_Venus':
    'desire and affection meet at the same point — the attraction is immediate and physical, and the contact tends to generate its own momentum.',
  'Mars_Opposition_Venus':
    'their desire and your affection face each other across the axis — the pull is magnetic but the shapes are different, and negotiation is constant.',
  'Mars_Trine_Venus':
    'their drive and your warmth move with each other naturally — the attraction is alive and the connection sustains itself without needing force.',
  'Mars_Square_Venus':
    'desire presses against affection — there is real heat here, but its direction requires intention or the energy dissipates in friction.',
  'Mars_Sextile_Venus':
    'their desire and your affection can align when you both choose to engage — the connection has warmth and spark and rewards cultivation.',

  // ── Mercury / Mercury ───────────────────────────────────────────────────────
  'Mercury_Conjunction_Mercury':
    'your minds work along the same channels — ideas move between you quickly, and conversation can feel like thinking out loud with yourself.',
  'Mercury_Opposition_Mercury':
    'your ways of thinking face each other from opposite ends — you see things differently enough that the exchange is stimulating, but consensus takes work.',
  'Mercury_Trine_Mercury':
    'your thinking styles flow together — ideas land without needing to be argued, and the conversation between you is easy to sustain.',
  'Mercury_Square_Mercury':
    'your minds approach things from angles that create friction — disagreements are frequent, but so is the kind of thinking that only happens when you are challenged.',
  'Mercury_Sextile_Mercury':
    'your ways of communicating find each other without trouble — the mental connection is clear and grows with the conversations you choose to have.',

  // ── Moon / Saturn ───────────────────────────────────────────────────────────
  'Moon_Conjunction_Saturn':
    'your emotional nature meets their structure in the same place — one of you carries the need to feel, the other the impulse to contain; you may feel steadied and limited in the same breath.',
  'Moon_Opposition_Saturn':
    'your emotional world and their sense of structure pull across the axis — the contact can feel like being held and constrained at once.',
  'Moon_Square_Saturn':
    'your need for emotional freedom meets their structuring force at an angle — their boundaries land on your feelings as weight before they can become support.',
  'Moon_Trine_Saturn':
    'your emotional nature and their steadiness flow together — they can hold your inner world without crushing it, and you can soften their rigidity without erasing it.',

  // ── Saturn / Venus ──────────────────────────────────────────────────────────
  'Saturn_Conjunction_Venus':
    'their sense of structure and your affection share the same space — love here is serious, sometimes heavy, and tends to deepen slowly rather than arrive all at once.',
  'Saturn_Opposition_Venus':
    'their limits and your warmth pull against each other — what you offer as affection meets restraint, and what they provide as structure can feel like withholding.',
  'Saturn_Square_Venus':
    'their structure presses against your capacity for affection — the contact is real and lasting but often complicated by the feeling that love must be earned.',
  'Saturn_Trine_Venus':
    'their steadiness and your affection complement each other without struggle — the bond that forms here tends to last because it was built with care.',

  // ── Saturn / Sun ────────────────────────────────────────────────────────────
  'Saturn_Conjunction_Sun':
    'their structure meets your core identity at the same point — one of you carries weight the other must reckon with; the contact shapes character over time.',
  'Saturn_Opposition_Sun':
    'their limits face your vitality across the axis — the relationship asks the one being limited to hold their light, and the one limiting to examine what they fear.',
  'Saturn_Square_Sun':
    'their structuring force presses against your sense of self — there is seriousness here that can become support or suppression depending on what both of you bring.',
  'Saturn_Trine_Sun':
    'their steadiness and your identity find each other without friction — the grounding they offer helps you become more fully yourself rather than less.',

  // ── Jupiter / Moon ──────────────────────────────────────────────────────────
  'Jupiter_Conjunction_Moon':
    'their expansiveness meets your inner life at the same point — they make you feel that your emotional world is spacious rather than burdensome.',
  'Jupiter_Trine_Moon':
    'their generosity flows into your emotional nature without obstacle — they amplify what you feel in ways that feel sustaining rather than overwhelming.',
  'Jupiter_Sextile_Moon':
    'their faith and your feeling nature offer each other an opening — the contact can widen your inner world when both of you choose to engage it.',

  // ── Jupiter / Venus ─────────────────────────────────────────────────────────
  'Jupiter_Conjunction_Venus':
    'their expansiveness and your affection fuse — the warmth between you tends toward generosity and abundance, sometimes to excess.',
  'Jupiter_Trine_Venus':
    'their expansiveness flows through your affection without resistance — the contact produces a warmth that both of you find easy to sustain.',
  'Jupiter_Sextile_Venus':
    'their faith and your warmth can find each other — the connection opens into something larger when both of you lean toward it.',

  // ── Moon / Neptune ──────────────────────────────────────────────────────────
  'Moon_Conjunction_Neptune':
    'your emotional world and their dream nature fuse — the contact is profound and hard to hold; it can feel like merging with someone or losing yourself in them.',
  'Moon_Square_Neptune':
    'your emotional needs and their Neptune meet at an angle — what you feel becomes harder to read in their presence, and clarity requires more effort than it should.',
  'Moon_Trine_Neptune':
    'your inner life and their sensitivity flow together — the contact is gentle and intuitive, and what passes between you rarely needs to be spoken.',

  // ── Moon / Pluto ────────────────────────────────────────────────────────────
  'Moon_Conjunction_Pluto':
    'your emotional world and their transforming force occupy the same point — the contact is deep and irreversible; neither of you will leave it unchanged.',
  'Moon_Square_Pluto':
    'your emotional nature meets their depth and intensity at a friction point — the contact can feel consuming, illuminating, or both at once.',
  'Moon_Trine_Pluto':
    'your inner life and their depth move together without struggle — they reach the parts of you that most people cannot find, and you receive that without feeling threatened.',

  // ── NorthNode contacts ──────────────────────────────────────────────────────
  'NorthNode_Conjunction_Sun':
    'their life path and your core identity meet — the contact carries a sense of purpose, as though being together moves one or both of you toward something you were already reaching for.',
  'Moon_Conjunction_NorthNode':
    'your emotional nature and their karmic direction meet at the same point — you may feel you have come to help each other grow, and the feeling is hard to dismiss.',
  'NorthNode_Conjunction_Venus':
    'their karmic direction and your affection share the same space — the relationship feels fated in some way, as though love and growth are pointing toward the same destination.',
}

// ─── Planet archetype noun phrases (for fallback construction) ────────────────

const PLANET_ARCHETYPES: Record<string, string> = {
  Sun: 'core identity',
  Moon: 'emotional nature',
  Mercury: 'mind and communication',
  Venus: 'affection and values',
  Mars: 'drive and desire',
  Jupiter: 'expansion and faith',
  Saturn: 'structure and limits',
  Uranus: 'independence and disruption',
  Neptune: 'dreams and dissolution',
  Pluto: 'transformation and depth',
  NorthNode: 'karmic direction',
}

// ─── Aspect nature fallback clauses ─────────────────────────────────────────

const ASPECT_NATURE_CLAUSES: Record<string, string> = {
  Conjunction: 'their energies fuse — intensity and merger define the contact',
  Trine: 'ease flows between them — the connection requires no effort to sustain',
  Sextile: 'opportunity opens between them — the contact rewards those who engage it',
  Square: 'friction is present — the tension demands something from both',
  Opposition: 'they pull in opposite directions — the contact requires negotiation to become resource',
}

// ─── Brief truncation helper ─────────────────────────────────────────────────
// Intentionally NOT imported from transitAspectBriefs.ts per spec.

function truncateToLimit(text: string, limit: number): string {
  if (text.length <= limit) return text
  const sub = text.slice(0, limit)
  const lastPeriod = sub.lastIndexOf('.')
  if (lastPeriod > 0) return sub.slice(0, lastPeriod + 1)
  const lastSpace = sub.lastIndexOf(' ')
  if (lastSpace > 0) return sub.slice(0, lastSpace) + '.'
  return sub + '.'
}

// ─── Key builder ─────────────────────────────────────────────────────────────

function buildKey(p1: string, p2: string, aspectType: string): string {
  const [a, b] = [p1, p2].sort()
  const normalizedType = aspectType.charAt(0).toUpperCase() + aspectType.slice(1)
  return `${a}_${normalizedType}_${b}`
}

// ─── Public compute function ─────────────────────────────────────────────────

export function computeSynastryAspectBrief(
  person1Planet: string,
  aspectType: AspectType,
  person2Planet: string,
  _nature: 'harmonious' | 'challenging' | 'neutral',
): string {
  try {
    const key = buildKey(person1Planet, person2Planet, aspectType)
    const primary = SYNASTRY_ASPECT_BRIEFS[key]
    if (primary) return truncateToLimit(primary, 200)

    // Fallback: assemble from archetypes
    const a1 = PLANET_ARCHETYPES[person1Planet] ?? 'planetary force'
    const a2 = PLANET_ARCHETYPES[person2Planet] ?? 'planetary force'
    const normalizedType = aspectType.charAt(0).toUpperCase() + aspectType.slice(1)
    const clause = ASPECT_NATURE_CLAUSES[normalizedType] ?? 'the contact shapes the space between them'
    const fallback = `${a1} and ${a2} meet in ${aspectType.toLowerCase()} — ${clause}.`
    return truncateToLimit(fallback, 200)
  } catch {
    return 'a planetary contact between these two charts — its character is shaped by the aspect and the planets involved.'
  }
}
