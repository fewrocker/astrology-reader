import { ALL_TAROT_CARDS } from './cards'
import { GENERATED_TAROT_CARD_ART_MANIFEST } from './generatedCardArtManifest'
import type { TarotCard } from './types'

export interface TarotArtPromptSpec {
  cardId: string
  title: string
  prompt: string
  outputPath: string
  arcana: 'major' | 'minor'
}

const DECK_STYLE_BIBLE = [
  'vertical tarot card illustration for a premium bespoke deck',
  'luminous mystical editorial aesthetic',
  'dark cosmic atmosphere with refined gold line accents',
  'dreamlike celestial gradients and sacred geometry',
  'elegant painterly surrealism, not photorealistic',
  'visually readable at card size',
  'no letters, no captions, no watermark, no signatures',
  'composed to sit beautifully inside a tarot card frame',
].join(', ')

const MAJOR_ARCANA_PALETTES: Record<string, string> = {
  'the-fool': 'Color story: dawn cream, clear sky blue, pale gold, soft rose, fresh green accents. The palette should feel airy, innocent, and bright with real contrast.',
  'the-magician': 'Color story: mercury silver, electric white, rich crimson, obsidian, controlled gold. The palette should feel sharp, alchemical, and intentional.',
  'the-high-priestess': 'Color story: moon-silver, midnight indigo, pearl, soft violet, deep blue-black. The palette should feel nocturnal, secretive, and fluid.',
  'the-empress': 'Color story: lush green, rose blush, fertile gold, wheat, warm cream. The palette should feel sensual, abundant, and life-giving.',
  'the-emperor': 'Color story: iron red, terracotta, sandstone, bronze, charcoal. The palette should feel structured, martial, and sovereign.',
  'the-hierophant': 'Color story: ivory, old gold, muted burgundy, incense smoke, parchment beige. The palette should feel sacred, ceremonial, and institutional.',
  'the-lovers': 'Color story: warm coral, sunrise gold, soft green, luminous cream, and gentle blue accents. The palette should feel relational, harmonious, and awakened.',
  'the-chariot': 'Color story: royal blue, polished silver, black, white, decisive gold. The palette should feel driven, victorious, and high-contrast.',
  'strength': 'Color story: lion gold, honey, warm white, sunlit amber, soft carmine. The palette should feel heart-led, radiant, and calm under pressure.',
  'the-hermit': 'Color story: lantern gold, mountain grey, muted olive, smoke blue, winter ivory. The palette should feel quiet, sparse, and inwardly illuminated.',
  'wheel-of-fortune': 'Color story: lapis blue, saffron gold, storm grey, parchment, ember orange. The palette should feel rotational, fated, and dynamic.',
  'justice': 'Color story: balanced ivory, steel grey, ruby red, clean gold, midnight blue. The palette should feel precise, moral, and exact.',
  'the-hanged-man': 'Color story: sea green, pale aqua, silver mist, washed blue, halo gold. The palette should feel contemplative, inverted, and lucid.',
  'death': 'Color story: bone white, black velvet, deep plum, fading rose, phoenix gold. The palette should feel transformative, stark, and beautiful rather than horror-coded.',
  'temperance': 'Color story: iridescent teal, cream, pale gold, soft rainbow prism notes, warm stone. The palette should feel blended, healing, and balanced.',
  'the-devil': 'Color story: black, ember red, tarnished gold, bruise purple, shadow brown. The palette should feel seductive, heavy, and psychologically charged.',
  'the-tower': 'Color story: lightning white, charcoal, fire orange, molten gold, storm blue-black. The palette should feel explosive, destabilized, and vivid.',
  'the-star': 'Color story: crystalline blue, silver, pale aqua, soft white, celestial gold. The palette should feel hopeful, open, and clean.',
  'the-moon': 'Color story: ultramarine, violet-grey, pearl, shadow teal, muted silver. The palette should feel dreamlike, tidal, and uncertain.',
  'the-sun': 'Color story: radiant yellow, marigold, clear sky blue, white, lively orange. The palette should feel joyful, alive, and unmistakably solar.',
  'judgement': 'Color story: cloud white, resurrection gold, rose dawn, cool stone, trumpet silver. The palette should feel awakening, elevated, and clarifying.',
  'the-world': 'Color story: laurel green, cosmic blue, gold, earth brown, luminous cream. The palette should feel complete, integrated, and celebratory.',
}

const MAJOR_ARCANA_DETAIL_ACCENTS: Record<string, string> = {
  'the-fool': 'Detail accents: a small white flower, a cliff edge, a tiny traveling satchel, distant mountain light.',
  'the-magician': 'Detail accents: one raised wand, a table of elemental tools, a lemniscate motif, roses and lilies worked subtly into the scene.',
  'the-high-priestess': 'Detail accents: twin pillars, a crescent moon, a veiled threshold, a suggestion of pomegranates or sacred script patterns.',
  'the-empress': 'Detail accents: a starry crown, wheat or grain textures, flowing fabric, a fertile garden or river detail.',
  'the-emperor': 'Detail accents: ram motifs, a stone throne, mountain architecture, a scepter or orb rendered with restraint.',
  'the-hierophant': 'Detail accents: twin keys, ritual steps, a sacred hand gesture, temple ornament or liturgical textile detail.',
  'the-lovers': 'Detail accents: an angelic canopy, a tree of knowledge, a tree of flame or life, mirrored ground patterns suggesting choice and union.',
  'the-chariot': 'Detail accents: paired sphinxes or steeds, a starry canopy, armored detailing, a city or roadway receding behind.',
  'strength': 'Detail accents: an infinity motif, a lion presence, floral garland details, a calm hand-to-beast relationship rather than combat.',
  'the-hermit': 'Detail accents: a lantern, snowy mountain ridges, a staff, a narrow solitary path or wind-carved stone.',
  'wheel-of-fortune': 'Detail accents: a turning wheel, abstract celestial ornament, cloud forms, guardian creatures or directional emblems in miniature.',
  'justice': 'Detail accents: scales, an upright sword, balanced architectural symmetry, veil or curtain details behind the figure.',
  'the-hanged-man': 'Detail accents: a living tree branch, a radiant halo, crossed leg geometry, serene stillness, and an inverted perspective motif.',
  'death': 'Detail accents: a white horse, a fallen crown or banner, river or horizon imagery, a rising sun beyond transformation.',
  'temperance': 'Detail accents: two chalices, flowing water between vessels, one foot on land and one near water, a distant path or sunrise.',
  'the-devil': 'Detail accents: chains, a dark pedestal, horned geometry, torchlight or ember glow contained within shadow.',
  'the-tower': 'Detail accents: a falling crown, fractured stone, lightning strike branches, figures or fragments descending through storm.',
  'the-star': 'Detail accents: pouring water, a large guiding star with smaller stars, shoreline texture, healing night air.',
  'the-moon': 'Detail accents: twin towers, a moon face or lunar disc, a path into the distance, water with a crustacean or reflective ripple forms.',
  'the-sun': 'Detail accents: sunflowers, a radiant solar disc, a white horse, a victory banner, and sparkling daylight textures.',
  'judgement': 'Detail accents: a trumpet, radiant beams, awakening silhouettes, open sky, and stone platform motifs rendered symbolically.',
  'the-world': 'Detail accents: a laurel wreath, four directional beings or emblems, a radiant central archetypal presence, and cosmic framing around the border.',
}

const SUIT_DIRECTION: Record<string, string> = {
  wands: 'Wands suit language: ember, copper, solar flame, kinetic diagonals, heat shimmer, bold ignition.',
  cups: 'Cups suit language: moonlit blue, liquid glass, tides, reflective water, emotional softness, silver glow.',
  swords: 'Swords suit language: pale steel, wind currents, sharp symmetry, cool radiance, clarity, tension.',
  pentacles: 'Pentacles suit language: brass, stone, moss-gold, earth geometry, roots, harvest, material beauty.',
}

const SUIT_PALETTES: Record<string, string> = {
  wands: 'Primary palette family: ember orange, copper, scorched sienna, sun gold, volcanic black.',
  cups: 'Primary palette family: moonlit blue, silver, sea teal, pearl, deep indigo.',
  swords: 'Primary palette family: steel grey, winter blue, white, storm slate, restrained silver.',
  pentacles: 'Primary palette family: moss green, brass, ochre, bark brown, fertile black-green.',
}

const MINOR_NUMBER_PALETTES: Record<number, string> = {
  1: 'Palette emphasis: clean emergence, brighter highlights, uncluttered contrast, one dominant glow color.',
  2: 'Palette emphasis: dual-color tension or mirroring, two balanced tonal anchors.',
  3: 'Palette emphasis: expanding triad of hues, visible movement from one tone into another.',
  4: 'Palette emphasis: restrained stable palette, fewer hues, grounded tonal architecture.',
  5: 'Palette emphasis: sharp contrast, one disrupted accent color, emotional instability in the palette.',
  6: 'Palette emphasis: harmonized tones, softened contrast, restorative color relationships.',
  7: 'Palette emphasis: guarded contrast, strategic shadows, a more tensioned midtone range.',
  8: 'Palette emphasis: rhythmic repeated color beats, focused movement through narrow palette control.',
  9: 'Palette emphasis: saturated fullness, richer tonal depth, emotionally dense color field.',
  10: 'Palette emphasis: maximal fullness inside the suit palette, heavy accumulation, dramatic density.',
  11: 'Palette emphasis: fresher and younger within the suit palette, one curious accent color.',
  12: 'Palette emphasis: forward-driving directional contrast, stronger motion between light and dark.',
  13: 'Palette emphasis: lush mature richness, velvety tonal control, magnetic central glow.',
  14: 'Palette emphasis: authoritative depth, regal contrast, stable commanding color balance.',
}

const MINOR_NUMBER_DIRECTION: Record<number, string> = {
  1: 'Ace energy: singular emergence, pristine force, one iconic focal symbol, origin-point clarity.',
  2: 'Two energy: polarity, mirroring, balance versus tension, two-part composition.',
  3: 'Three energy: expansion, growth, triangulation, visible motion outward.',
  4: 'Four energy: structure, containment, foundation, stable geometry.',
  5: 'Five energy: disruption, instability, asymmetry, dynamic fracture.',
  6: 'Six energy: restoration, harmony, reciprocity, balanced flow.',
  7: 'Seven energy: threshold, test, strategic tension, guarded movement.',
  8: 'Eight energy: movement, refinement, focused momentum, patterned repetition.',
  9: 'Nine energy: culmination, saturation, almost-complete emotional or symbolic fullness.',
  10: 'Ten energy: completion, overflow, burden or totality, dense final arrangement.',
  11: 'Page energy: youthful messenger, new learning, curious initiation within the suit.',
  12: 'Knight energy: directed motion, force, pursuit, dynamic travel within the suit.',
  13: 'Queen energy: mature inner mastery, magnetic stillness, embodied sovereignty within the suit.',
  14: 'King energy: outward mastery, command, stable authority within the suit.',
}

function majorArcanaDirection(card: TarotCard): string {
  const loversSafetyDirection = card.id === 'the-lovers'
    ? 'Represent union through symbolic forms such as mirrored figures, celestial symmetry, a garden threshold, or paired archetypal silhouettes. Avoid erotic cues, nudity, exposed bodies, or sensual emphasis.'
    : ''
  const hangedManSafetyDirection = card.id === 'the-hanged-man'
    ? 'Represent this card as a calm sacred pause and a change in perspective through an inverted figure resting from one leg on a living branch. Avoid distress, injury, restraint, punishment, self-harm, or violent imagery.'
    : ''
  const sunSafetyDirection = card.id === 'the-sun'
    ? 'Emphasize sunlight, vitality, celebration, a white horse, banner, and sunflowers. Avoid child nudity or exposed bodies.'
    : ''
  const judgementSafetyDirection = card.id === 'judgement'
    ? 'Represent awakening through symbolic silhouettes, radiant ascent, trumpet-call energy, and spiritual renewal. Avoid exposed bodies, erotic cues, or literal coffin emergence.'
    : ''
  const worldSafetyDirection = card.id === 'the-world'
    ? 'Represent completion through a draped radiant central archetype or symbolic presence inside a laurel wreath. Avoid nudity or sensual body emphasis.'
    : ''
  const wheelSafetyDirection = card.id === 'wheel-of-fortune'
    ? 'Do not include any letters, words, runes, glyph text, inscriptions, or readable markings on the wheel or border. Use only abstract symbolic ornament.'
    : ''

  return [
    `Major Arcana focus: ${card.name}.`,
    MAJOR_ARCANA_PALETTES[card.id] ?? 'Color story: distinct, memorable, and unique to this archetype.',
    MAJOR_ARCANA_DETAIL_ACCENTS[card.id] ?? 'Add 2-3 small traditional tarot details that enrich the card without overcrowding the composition.',
    `Symbolic theme: ${card.symbolicTheme}.`,
    `Keywords: ${card.keywords.join(', ')}.`,
    `Emotional tone: ${card.emotionalMeaning}`,
    card.rulingPlanet ? `Astrology layer: ${card.rulingPlanet}${card.rulingSign ? ` with ${card.rulingSign} resonance` : ''}.` : '',
    'Use a singular iconic tableau with strong silhouette and archetypal gravity.',
    loversSafetyDirection,
    hangedManSafetyDirection,
    sunSafetyDirection,
    judgementSafetyDirection,
    worldSafetyDirection,
    wheelSafetyDirection,
    'Add 2-3 smaller secondary details tied to the classic tarot image language, but keep the composition elegant and readable rather than busy.',
    'Do not reuse a generic shared background color from other cards; make this card immediately distinguishable by palette at a glance.',
    'Make the image feel mythic, insightful, and unmistakably this card rather than generic fantasy art.',
  ].filter(Boolean).join(' ')
}

function minorArcanaDirection(card: TarotCard): string {
  const suitDirection = card.suit ? SUIT_DIRECTION[card.suit] : ''
  const suitPalette = card.suit ? SUIT_PALETTES[card.suit] : ''
  const numberDirection = MINOR_NUMBER_DIRECTION[card.number] ?? 'Express the card rank through composition and emotional atmosphere.'
  const numberPalette = MINOR_NUMBER_PALETTES[card.number] ?? 'Use palette variation that matches the rank-specific emotional rhythm.'

  return [
    `Minor Arcana focus: ${card.name}.`,
    suitDirection,
    suitPalette,
    numberDirection,
    numberPalette,
    `Symbolic theme: ${card.symbolicTheme}.`,
    `Keywords: ${card.keywords.join(', ')}.`,
    `Emotional tone: ${card.emotionalMeaning}`,
    'Within the consistent suit system, this card still needs its own distinct color balance and atmospheric identity.',
    'Maintain strong deck consistency with the other minor arcana cards through repeated framing, palette discipline, and clean symbolic composition.',
  ].filter(Boolean).join(' ')
}

export function buildTarotCardArtPrompt(card: TarotCard): string {
  const promptLead = card.id === 'the-hanged-man'
    ? 'Create a fixed tarot card artwork for an inverted serene seeker archetype from the Major Arcana, shown upside down from one leg on a living tree branch.'
    : `Create a fixed tarot card artwork for ${card.name}.`
  const cardSpecificDirection = card.arcana === 'major'
    ? majorArcanaDirection(card)
    : minorArcanaDirection(card)

  return [
    promptLead,
    DECK_STYLE_BIBLE,
    cardSpecificDirection,
    'Composition rules: centered focal hierarchy, generous negative space, elegant ornate border rhythm, premium print-worthy finish, readable on mobile and desktop when enlarged.',
    'Color rules: the palette is part of the card identity, not an afterthought. Use clearly distinguishable hues per card while preserving overall deck cohesion.',
    'Avoid clutter, text, logos, extra hands, extra limbs, collage artifacts, flat stock-art framing, or modern UI-looking illustration.',
  ].join(' ')
}

export function buildTarotArtPromptSpecs(): TarotArtPromptSpec[] {
  return ALL_TAROT_CARDS.map(card => ({
    cardId: card.id,
    title: card.name,
    prompt: buildTarotCardArtPrompt(card),
    outputPath: `/tarot/generated/${card.id}.png`,
    arcana: card.arcana,
  }))
}

export function getTarotCardArtUrl(cardId: string): string | null {
  return GENERATED_TAROT_CARD_ART_MANIFEST[cardId] ?? null
}

export function hasTarotCardArt(cardId: string): boolean {
  return cardId in GENERATED_TAROT_CARD_ART_MANIFEST
}
