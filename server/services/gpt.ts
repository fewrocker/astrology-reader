import OpenAI from 'openai'
import { getDb } from '../db.js'
import { calculateChart, getMoonInfo, getActiveTransitAspects } from '../engine/chartEngine.js'
import type { ServerChartData } from '../engine/chartEngine.js'
import { calculateAspects } from '../engine/aspectEngine.js'
import type { Aspect } from '../engine/aspectEngine.js'
import {
  calculatePersonalDay,
  calculateLifePath,
  calculateBirthdayNumber,
  calculatePersonalYear,
} from '../engine/numerologyEngine.js'
import { calculateSolarReturn, buildSolarReturnPrompt } from '../engine/solarReturnEngine.js'
import {
  calculateTransits, buildTransitPrompt, getTopActiveTransits,
  calculateCurrentPositions, calculateTransitAspects,
  type TransitData, type TransitPeriod,
} from '../engine/transitEngine.js'
import {
  calculateSynastry, buildSynastryPrompt, buildCoupleTransitPrompt,
  type SynastryData,
} from '../engine/synastryEngine.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TransitAspect {
  transitPlanet: string
  symbol: string
  natalPlanet: string
  orb: number
  nature: string
}

interface JournalEntry {
  date: string
  time: string
  body: string
  numerologicalDay: number
}

interface PatternSummary {
  tagGroup: string
  dominantPlanets: string[]
  dominantPhases: string[]
  dominantPersonalDays: number[]
  sampleSize: number
  entryDates: string[]
}

export interface PatternReading {
  tagGroup: string
  heading: string
  body: string
}

// ---------------------------------------------------------------------------
// OpenAI client + call infrastructure
// ---------------------------------------------------------------------------

let _client: OpenAI | null = null

function getClient(): OpenAI {
  if (!_client) _client = new OpenAI() // reads OPENAI_API_KEY from process.env
  return _client
}

class GptServiceError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'GptServiceError'
  }
}

const RETRYABLE = new Set([429, 503, 504])

async function retryWithBackoff<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      const isRetryable = err instanceof GptServiceError && RETRYABLE.has(err.status)
      if (!isRetryable) throw err
      if (attempt < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)))
      }
    }
  }
  throw lastError
}

async function callOpenAI(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options: { temperature?: number; max_tokens?: number } = {},
): Promise<string> {
  const client = getClient()
  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: options.temperature ?? 0.8,
      max_tokens: options.max_tokens ?? 2000,
    })
    return completion.choices[0]?.message?.content ?? ''
  } catch (err) {
    if (err instanceof OpenAI.APIError) {
      throw new GptServiceError(err.message, err.status ?? 500)
    }
    throw err
  }
}

// ---------------------------------------------------------------------------
// Shared birth context resolution
// ---------------------------------------------------------------------------

interface BirthContext {
  birthDate: string
  birthTime: string
  lat: number
  lng: number
  tz: string
  unknownTime: boolean
}

function resolveUserBirthContext(userId: number): BirthContext | null {
  try {
    const db = getDb()
    const row = db
      .prepare('SELECT birth_date, birth_time, birth_place FROM users WHERE id = ?')
      .get(userId) as { birth_date: string | null; birth_time: string | null; birth_place: string | null } | undefined

    if (!row?.birth_date || !row.birth_place) return null
    const place = JSON.parse(row.birth_place) as { lat?: number; lng?: number; tz?: string }
    if (typeof place.lat !== 'number' || typeof place.lng !== 'number' || !place.tz) return null

    return {
      birthDate: row.birth_date,
      birthTime: row.birth_time ?? '12:00',
      lat: place.lat,
      lng: place.lng,
      tz: place.tz,
      unknownTime: !row.birth_time,
    }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Shared utilities (ported from gptInterpretation.ts verbatim)
// ---------------------------------------------------------------------------

function houseSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

const MASTER_NUMBERS = new Set([11, 22, 33])

function isMaster(n: number): boolean {
  return MASTER_NUMBERS.has(n)
}

function masterLabel(n: number): string {
  if (!isMaster(n)) return ''
  const labels: Record<number, string> = {
    11: 'Master Intuitive',
    22: 'Master Builder',
    33: 'Master Teacher',
  }
  return ` [${labels[n]}]`
}

function buildDreamscapeContext(chart: ServerChartData): string {
  const neptune = chart.planets.find(p => p.name === 'Neptune')
  const moon = chart.planets.find(p => p.name === 'Moon')
  const showHouses = !chart.unknownTime
  const ascSign = showHouses ? chart.angles?.ascendant?.sign : undefined

  let ctx = '## Dreamscape Natal Blueprint (emphasize these in interpretation)\n'
  if (neptune) {
    ctx += `Neptune (dream ruler): ${neptune.sign}`
    if (showHouses && neptune.house) ctx += `, House ${neptune.house}`
    ctx += '\n'
  }
  if (moon) {
    ctx += `Moon (night mind): ${moon.sign}`
    if (showHouses && moon.house) ctx += `, House ${moon.house}`
    ctx += '\n'
  }
  if (showHouses) {
    const twelfthHousePlanets = chart.planets.filter(p => p.house === 12)
    if (twelfthHousePlanets.length > 0) {
      ctx += `12th house (unconscious realm): ${twelfthHousePlanets.map(p => `${p.name} in ${p.sign}`).join(', ')}\n`
    }
  }
  if (ascSign === 'Pisces') {
    ctx += 'Pisces Rising: naturally permeable to dreamspace and the collective unconscious\n'
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Per-type interpretation handlers
// All prompts are copied verbatim from the original gptInterpretation.ts.
// No prompt content is changed — this is a transport-layer migration only.
// ---------------------------------------------------------------------------

const VALID_TRANSIT_PERIODS = new Set(['daily', 'weekly', 'monthly'])

async function handleTransitInterpretation(
  payload: { transitPeriod?: string; targetMonth?: string; systemPrompt?: string },
  userId?: number,
): Promise<string> {
  let userPrompt: string | undefined

  // Authenticated path: compute prompt server-side from birth context
  // Only attempt if transitPeriod is a valid period keyword (not a legacy full-prompt string)
  const hasValidPeriod = payload.transitPeriod && VALID_TRANSIT_PERIODS.has(payload.transitPeriod)
  if (userId && hasValidPeriod) {
    const ctx = resolveUserBirthContext(userId)
    if (ctx) {
      const natalChart = calculateChart(
        ctx.birthDate,
        ctx.birthTime,
        ctx.lat,
        ctx.lng,
        ctx.tz,
        ctx.unknownTime,
      )
      const period = payload.transitPeriod as TransitPeriod
      const transitData = calculateTransits(natalChart, period, payload.targetMonth)
      userPrompt = buildTransitPrompt(natalChart, transitData, ctx.birthDate, period, payload.targetMonth)
    }
  }

  // Unauthenticated fallback: use client-provided systemPrompt (or legacy transitPeriod as prompt)
  if (!userPrompt) {
    // Support legacy callers that pass the full prompt string as transitPeriod
    userPrompt = payload.systemPrompt ?? (payload.transitPeriod && !hasValidPeriod ? payload.transitPeriod : undefined)
    if (!userPrompt) {
      throw new Error('Transit interpretation requires either a userId with birth context or a systemPrompt.')
    }
  }

  const result = await retryWithBackoff(() =>
    callOpenAI([
      {
        role: 'system',
        content: 'You are an expert astrologer who provides factual, precise, and honest transit readings grounded in traditional and modern astrological technique. State what the chart shows plainly — name favorable configurations and their real benefits, and name difficult ones with their real challenges. Do not sugar-coat, minimize tensions, or add generic encouragement. Treat the reader as someone who takes astrology seriously and wants the unvarnished picture. Reference dignities, debilities, sect, and aspect doctrine where relevant. Be direct, specific, and substantive — never cheerful for its own sake.',
      },
      { role: 'user', content: userPrompt },
    ], { temperature: 0.8, max_tokens: 2000 })
  )
  return result || 'Unable to generate interpretation.'
}

function buildNatalContextFromChart(chart: ServerChartData, birthDate: string, aspects?: Aspect[]): string {
  let ctx = `Born: ${birthDate}\n`
  for (const p of chart.planets) {
    ctx += `${p.name}: ${p.sign} ${p.degree}°${p.minute}'`
    if (!chart.unknownTime && p.house > 0) ctx += ` (House ${p.house})`
    if (p.retrograde) ctx += ' [Rx]'
    ctx += '\n'
  }
  ctx += `Ascendant: ${chart.angles.ascendant.sign} ${chart.angles.ascendant.degree}°\n`
  ctx += `Midheaven: ${chart.angles.midheaven.sign} ${chart.angles.midheaven.degree}°\n`
  if (aspects && aspects.length > 0) {
    ctx += '\n## Natal Aspects (tightest orb first)\n'
    ctx += aspects.slice(0, 7).map(a => `${a.planet1} ${a.symbol} ${a.planet2} (${a.orb}°, ${a.nature})`).join('\n')
    ctx += '\n'
  }
  return ctx
}

async function handleDreamInterpretation(payload: {
  dreamDescription: string
  natalContext: string
  transitSummary: string
  transitAspectsText: string
  skyContext: { moonSign: string; moonPhase: string; transits?: Array<{ transitPlanet: string; aspect: string; natalPlanet: string; orb: number }> } | null
  chartData: ServerChartData | null
}, userId?: number): Promise<string> {
  // --- Chart fallback: compute server-side if client didn't send it ---
  let chart: ServerChartData | null = payload.chartData
  let natalCtx = payload.natalContext

  if (!chart && userId) {
    try {
      const birthCtx = resolveUserBirthContext(userId)
      if (birthCtx) {
        const computed = calculateChart(
          birthCtx.birthDate,
          birthCtx.birthTime,
          birthCtx.lat,
          birthCtx.lng,
          birthCtx.tz,
          birthCtx.unknownTime,
        )
        chart = computed
        const natalAspects = calculateAspects(computed.planets)
        natalCtx = buildNatalContextFromChart(computed, birthCtx.birthDate, natalAspects)
      }
    } catch {
      // Non-fatal — proceed without chart if DB lookup fails
    }
  }

  // --- Sky context fallback: compute server-side if client didn't send it ---
  let skySection = ''
  if (payload.skyContext) {
    const transitLine = payload.skyContext.transits && payload.skyContext.transits.length > 0
      ? ' Active transits: ' + payload.skyContext.transits.map(t => `${t.transitPlanet} ${t.aspect} natal ${t.natalPlanet} (${t.orb}° orb)`).join(', ') + '.'
      : ''
    skySection = `\n\n## Sky Context at Time of Recording\nMoon in ${payload.skyContext.moonSign} (${payload.skyContext.moonPhase}).${transitLine}`
  } else if (chart) {
    try {
      const now = new Date()
      const moonInfo = getMoonInfo(now)
      const topTransits = getActiveTransitAspects(chart.planets, now, 2, 3)
      const transitLine = topTransits.length > 0
        ? ' Active transits: ' + topTransits.map(t =>
            `${t.transitPlanet} ${t.symbol} natal ${t.natalPlanet} (${t.orb}° orb)`
          ).join(', ') + '.'
        : ''
      skySection = `\n\n## Sky Context at Time of Recording\nMoon in ${moonInfo.sign} (${moonInfo.phase}).${transitLine}`
    } catch {
      // Non-fatal
    }
  }

  const dreamscapeSection = chart ? buildDreamscapeContext(chart) + '\n' : ''

  const prompt = `${dreamscapeSection}## Dreamer's Natal Chart\n${natalCtx}\n\n## Today's Astrological Picture\n${payload.transitSummary}\n\n## Active Transit Aspects Today\n${payload.transitAspectsText}${skySection}\n\n## The Dream\n${payload.dreamDescription}\n\nThe symbolic and emotional core of the dream is primary — explore the imagery, narrative, and feeling tone with depth and precision. If a natal placement or active transit directly and unmistakably illuminates a specific dream element, bring it in briefly and precisely. Do not scatter planet names throughout for their own sake. Astrology is a lens, not a mandate — use it surgically when the connection is undeniable. Be evocative, specific, and personal — 4 to 6 paragraphs in second person.`

  const result = await retryWithBackoff(() =>
    callOpenAI([
      {
        role: 'system',
        content: `You are a mystical astrologer and dream interpreter. You read the unconscious mind through the lens of the cosmos — connecting dream symbols, emotions, and narratives with current planetary transits and the dreamer's natal chart.\n\nWhen interpreting:\n- Explore the emotional and symbolic core of the dream first — this is the foundation\n- Only invoke astrology when the connection to a specific dream symbol is direct and unmistakable (e.g. Neptune prominent when the dream themes dissolution or illusion, Mars active when the dream is charged with conflict or will)\n- When you do reference astrology, be precise and specific — one clear astrological connection is worth more than five vague ones\n- Speak with psychological depth, poetic precision, and personal specificity\n- Address the dreamer directly in second person\n- Do not force planetary references or name planets for their own sake`,
      },
      { role: 'user', content: prompt },
    ], { temperature: 0.85, max_tokens: 1200 })
  )
  return result || 'Unable to generate dream interpretation.'
}

async function handleDreamDiscuss(payload: {
  dreamContext: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
}): Promise<string> {
  const result = await retryWithBackoff(() =>
    callOpenAI([
      {
        role: 'system',
        content: `You are a mystical astrologer and dream interpreter continuing a conversation about someone's dream and their natal chart. Use the full context below — the dreamer's chart, today's transits, and the original dream — to answer follow-up questions with depth and specificity. Stay in the dreamy, cosmic register. Be direct and personal.\n\n${payload.dreamContext}`,
      },
      ...payload.messages,
    ], { temperature: 0.85, max_tokens: 1000 })
  )
  return result || 'Unable to generate a response.'
}

async function handleAstroNumerologyCross(payload: {
  numbers: { lifePath: number; birthdayNumber: number; personalYear: number; expressionNumber?: number }
  chartData: ServerChartData
  userName: string | null
}, userId?: number): Promise<string> {
  const nameStr = payload.userName ? `Name: ${payload.userName}` : 'Name: not provided'
  const planetLines = payload.chartData.planets
    .filter(p => p.name !== 'NorthNode')
    .map(p => {
      const houseStr = !payload.chartData.unknownTime ? ` in the ${p.house}${houseSuffix(p.house)} house` : ''
      const rxStr = p.retrograde ? ' (retrograde)' : ''
      return `- ${p.name}: ${p.sign} ${p.degree}°${houseStr}${rxStr}`
    })
    .join('\n')

  const anglesStr = !payload.chartData.unknownTime
    ? `Ascendant: ${payload.chartData.angles.ascendant.sign}\nMidheaven: ${payload.chartData.angles.midheaven.sign}`
    : '(birth time unknown — houses not available)'

  // Attempt server-side verification of date-only numbers from stored birth_date.
  let serverNumerology: { lifePath: number; birthdayNumber: number; personalYear: number } | null = null
  if (userId) {
    const birthCtx = resolveUserBirthContext(userId)
    if (birthCtx) {
      serverNumerology = {
        lifePath: calculateLifePath(birthCtx.birthDate),
        birthdayNumber: calculateBirthdayNumber(birthCtx.birthDate),
        personalYear: calculatePersonalYear(birthCtx.birthDate),
      }
    }
  }

  const provenanceSuffix = serverNumerology ? ' (server-computed)' : ''
  const lifePathValue = serverNumerology ? serverNumerology.lifePath : payload.numbers.lifePath
  const birthdayValue = serverNumerology ? serverNumerology.birthdayNumber : payload.numbers.birthdayNumber
  const personalYearValue = serverNumerology ? serverNumerology.personalYear : payload.numbers.personalYear

  const expressionLine = payload.numbers.expressionNumber !== undefined
    ? `Expression Number: ${payload.numbers.expressionNumber}`
    : 'Expression Number: not provided (no birth name given)'

  const prompt = `You are synthesizing numerology and astrology into a single integrated reading for one specific person.

## Person
${nameStr}

## Numerology Profile
Life Path: ${lifePathValue}${provenanceSuffix}
Birthday Number: ${birthdayValue}${provenanceSuffix}
Personal Year: ${personalYearValue}${provenanceSuffix}
${expressionLine}

## Natal Chart
${planetLines}
${anglesStr}

Write 2–3 paragraphs that synthesize both systems for this specific person. Name where the numbers and chart resonate and amplify each other, and name where they create interesting tension or complexity. Be specific — reference actual placements, actual numbers, and what that combination reveals. Do not write generic number definitions. Do not write generic planet definitions. Write only about this person's specific combination. Examples of what good synthesis looks like: "Your Life Path 7 resonates with your Scorpio Moon — both point toward a life of depth, research, and hidden truths." Or: "Your 8 Life Path's drive for material mastery sits in interesting tension with your 12th house Saturn — this combination suggests someone who must do their inner work before the outer success becomes stable." Speak directly to the person in second person. Be direct, evocative, and substantive.`

  const result = await retryWithBackoff(() =>
    callOpenAI([
      {
        role: 'system',
        content: 'You are a master reader of both numerology and astrology — someone who holds both systems simultaneously and finds the living synthesis between them. You do not treat them as two separate readings placed side by side. You weave them together, finding where they echo and where they create productive tension. You are specific, personal, and direct. You never pad with generic definitions. You write as though you know this person.',
      },
      { role: 'user', content: prompt },
    ], { temperature: 0.85, max_tokens: 900 })
  )
  return result || 'Unable to generate cross-reading.'
}

async function handleDailySnapshot(payload: { prompt: string }): Promise<string> {
  const result = await retryWithBackoff(() =>
    callOpenAI([
      {
        role: 'system',
        content: 'You are an expert astrologer writing a personalized daily briefing. Be concise and direct — 2 to 3 sentences maximum. Name what is actually happening astrologically and what it means for this specific person today. Reference the actual planets and aspects. Do not be generic or vague. No cheerful filler.',
      },
      { role: 'user', content: payload.prompt },
    ], { temperature: 0.75, max_tokens: 300 })
  )
  return result || 'Unable to generate daily snapshot.'
}

async function handleNumerologyNarrative(payload: {
  numbers: {
    lifePath: number
    birthdayNumber: number
    personalYear: number
    expressionNumber?: number
    soulUrge?: number
  }
  userName: string | null
}, userId?: number): Promise<string> {
  // Attempt server-side verification of date-only numbers from stored birth_date.
  let serverNumerology: { lifePath: number; birthdayNumber: number; personalYear: number } | null = null
  if (userId) {
    const birthCtx = resolveUserBirthContext(userId)
    if (birthCtx) {
      serverNumerology = {
        lifePath: calculateLifePath(birthCtx.birthDate),
        birthdayNumber: calculateBirthdayNumber(birthCtx.birthDate),
        personalYear: calculatePersonalYear(birthCtx.birthDate),
      }
    }
  }

  const provenanceSuffix = serverNumerology ? ' (server-computed)' : ''
  const lifePathValue = serverNumerology ? serverNumerology.lifePath : payload.numbers.lifePath
  const birthdayValue = serverNumerology ? serverNumerology.birthdayNumber : payload.numbers.birthdayNumber
  const personalYearValue = serverNumerology ? serverNumerology.personalYear : payload.numbers.personalYear

  const nameIntro = payload.userName ? `Reading for: ${payload.userName}` : 'Reading for: unnamed person'
  const expressionLine = payload.numbers.expressionNumber !== undefined
    ? `Expression Number: ${payload.numbers.expressionNumber}${masterLabel(payload.numbers.expressionNumber)} — how gifts and personality express outward in the world`
    : 'Expression Number: not provided (no birth name given)'
  const soulUrgeLine = payload.numbers.soulUrge !== undefined
    ? `Soul Urge Number: ${payload.numbers.soulUrge}${masterLabel(payload.numbers.soulUrge)} — the inner desire, what the soul craves and is driven by`
    : 'Soul Urge Number: not provided'

  const hasMaster = [
    lifePathValue,
    birthdayValue,
    personalYearValue,
    payload.numbers.expressionNumber,
    payload.numbers.soulUrge,
  ].some(n => n !== undefined && isMaster(n as number))

  const prompt = `${nameIntro}

## Complete Numerological Profile

Life Path: ${lifePathValue}${masterLabel(lifePathValue)}${provenanceSuffix} — the fundamental nature, the overarching life theme and lesson
Birthday Number: ${birthdayValue}${masterLabel(birthdayValue)}${provenanceSuffix} — a specific natural talent, a gift brought into this life
Personal Year: ${personalYearValue}${masterLabel(personalYearValue)}${provenanceSuffix} — the current annual cycle, the dominant theme and energy of this year
${expressionLine}
${soulUrgeLine}

Write a cohesive 3-paragraph reading that treats these numbers as a single integrated portrait — not as definitions placed side by side. In each paragraph, show how the numbers interact: where they reinforce each other and create coherent themes, and where they create genuine tension or complexity that this person must navigate.${hasMaster ? ' Name any master numbers with appropriate weight — they carry double the vibration and double the burden.' : ''} Reference the actual numbers throughout — never speak in generic archetypes without grounding them in these specific digits. Speak in second person, directly to this person${payload.userName ? `, using their name (${payload.userName}) where it feels natural` : ''}. Be evocative but precise — this is a real reading, not a textbook.`

  const result = await retryWithBackoff(() =>
    callOpenAI([
      {
        role: 'system',
        content: 'You are a master numerologist who reads the full numerological profile as a single, integrated portrait — not as separate number definitions placed side by side. Every reading is personal, direct, and specific to this person\'s actual numbers and their interactions.',
      },
      { role: 'user', content: prompt },
    ], { temperature: 0.85, max_tokens: 1200 })
  )
  return result || 'Unable to generate numerology narrative.'
}

async function handleNumerologySkyChart(payload: {
  birthData: { name?: string; date: string }
  frequencyMap: Record<number, Array<{ label: string; eclipticDegree: number }>>
}): Promise<string> {
  const nameStr = payload.birthData.name ? `Name: ${payload.birthData.name}` : 'Name: not provided'

  const entriesByCount = Object.entries(payload.frequencyMap)
    .map(([num, pts]) => ({ num: Number(num), pts }))
    .filter(e => e.pts.length > 0)
    .sort((a, b) => b.pts.length - a.pts.length)

  const freqLines = entriesByCount
    .map(({ num, pts }) => {
      const sources = pts.map(p => `${p.label} (${Math.floor(p.eclipticDegree)}°)`).join(', ')
      return `  Number ${num}: ${pts.length}× — ${sources}`
    })
    .join('\n')

  const dominant = entriesByCount.slice(0, 3)
  const dominantLines = dominant
    .map(({ num, pts }) => `  ${num} (${pts.length}×): ${pts.map(p => p.label).join(', ')}`)
    .join('\n')

  const prompt = `${nameStr}
Birth date: ${payload.birthData.date}

## Sky Chart — Numerological Frequency Map
${freqLines}

## Dominant Numbers in the Sky
${dominantLines}

Write a 2–3 paragraph reading about what this numerical distribution across the sky reveals. Do not recite generic number meanings. Focus on: why do these particular numbers appear at these specific chart positions? What does it mean that ${dominant[0]?.num ?? 'this number'} is echoed by ${dominant[0]?.pts.map(p => p.label).join(', ')}? What does the full pattern suggest about this person's core nature and cosmic signature? Be personal, evocative, and specific to this person's actual distribution — not a textbook entry.`

  const result = await retryWithBackoff(() =>
    callOpenAI([
      {
        role: 'system',
        content: "You are a numerologist-astrologer who reads birth charts through numbers. When all chart points are reduced numerologically, you see a numerical sky — and you read what that sky says about a person's soul. You do not define numbers in isolation. You interpret the pattern: why these numbers, at these positions, in this person's chart. You speak personally, directly, and with poetic precision.",
      },
      { role: 'user', content: prompt },
    ], { temperature: 0.85, max_tokens: 900 })
  )
  return result || 'Unable to generate sky chart reading.'
}

async function handleTodaySynthesis(payload: {
  moon: { phaseName: string; moonSign: string; isVoid: boolean }
  aspects: Array<{
    transitPlanet: string; symbol: string; natalPlanet: string;
    orb: number; nature: string; natalHouse?: number | null; applying?: boolean
  }>
  personalDay: number
  personalDayArchetype: string
  // Enrichment fields — all optional for backward compatibility
  aspectBriefSentences?: string[]
  personalDayEssence?: string
  natalSunSign?: string
  natalMoonSign?: string
  natalMoonHouse?: number | null
  natalAscSign?: string
  natalMoonPhase?: string | null
  advanceCategory?: string | null
  advanceReason?: string | null
}, userId?: number): Promise<string> {
  // Cross-check client-provided personalDay against server-computed value when birth_date is available.
  let authorizedPersonalDay = payload.personalDay
  if (userId) {
    const birthCtx = resolveUserBirthContext(userId)
    if (birthCtx) {
      const serverPersonalDay = calculatePersonalDay(birthCtx.birthDate)
      if (serverPersonalDay !== payload.personalDay) {
        console.warn(`[handleTodaySynthesis] personalDay mismatch: client=${payload.personalDay}, server=${serverPersonalDay}, userId=${userId}`)
      }
      authorizedPersonalDay = serverPersonalDay
    }
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  // ─── Build prompt sections ────────────────────────────────────────────────

  const sections: string[] = [`Today is ${today}.`]

  // Section 1 — Natal Chart (when natal signs are present)
  if (payload.natalSunSign) {
    const moonHousePhrase = (payload.natalMoonHouse && payload.natalMoonHouse >= 1 && payload.natalMoonHouse <= 12)
      ? ` in the ${payload.natalMoonHouse}${ordinalSuffix(payload.natalMoonHouse)} house`
      : ''
    let natalSection = `## Natal Chart\nSun in ${payload.natalSunSign}, Moon in ${payload.natalMoonSign ?? ''}${moonHousePhrase}, Ascendant in ${payload.natalAscSign ?? ''}`
    if (payload.natalMoonPhase) {
      natalSection += `\nNatal Moon Phase: ${payload.natalMoonPhase}`
    }
    sections.push(natalSection)
  }

  // Section 2 — Personal Day
  let personalDaySection = `## Personal Day ${authorizedPersonalDay} — ${payload.personalDayArchetype}`
  if (payload.personalDayEssence) {
    personalDaySection += `\n${payload.personalDayEssence}`
  }
  sections.push(personalDaySection)

  // Section 3 — Today's Sky
  const voidNote = payload.moon.isVoid ? ', void of course — avoid committing to irreversible decisions' : ''
  let skySection = `## Today's Sky\nMoon: ${payload.moon.phaseName} in ${payload.moon.moonSign}${voidNote}`

  const transitLines = payload.aspects.slice(0, 3).map((a, i) => {
    const brief = payload.aspectBriefSentences?.[i]
    if (brief) return brief
    return `${a.transitPlanet} ${a.symbol} natal ${a.natalPlanet} (${a.nature}, ${a.orb.toFixed(1)}° orb)`
  })

  if (transitLines.length > 0) {
    skySection += `\n\nActive transits:\n${transitLines.join('\n')}`
  } else {
    skySection += '\n\nNo tight transit aspects active today.'
  }
  sections.push(skySection)

  // Section 4 — Advance Signal (only when category is non-null)
  if (payload.advanceCategory) {
    sections.push(`## Advance Signal\nToday is scored as a ${payload.advanceCategory} period: ${payload.advanceReason ?? ''}`)
  }

  // Closing instruction
  sections.push(
    'Write a 2-3 sentence personalized morning synthesis that integrates all of the above into a single coherent reading. Do not list the systems separately — find the sentence that names what today means when the natal chart, the personal day, the lunar quality, and the active transits are read together. Name specific natal placements and houses where relevant. Be direct, specific, and honest about what is genuinely supported today and what calls for care. Do not pad or encourage generically. Speak in second person.'
  )

  const prompt = sections.join('\n\n')

  const result = await retryWithBackoff(() =>
    callOpenAI([
      {
        role: 'system',
        content: 'You are an expert astrologer and numerologist writing a personalized morning synthesis. Weave the personal day number, moon phase, and transit aspects into a single cohesive 2-3 sentence reading. Be direct, specific, and personal — name actual energies. No generic encouragement. No filler. Speak to this person\'s day as it actually is.',
      },
      { role: 'user', content: prompt },
    ], { temperature: 0.8, max_tokens: 350 })
  )
  return result || 'Unable to generate morning synthesis.'
}

/** Return ordinal suffix for a house number (1→"st", 2→"nd", 3→"rd", 4+→"th"). */
function ordinalSuffix(n: number): string {
  if (n === 11 || n === 12 || n === 13) return 'th'
  switch (n % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

async function handleNumerologyDiscuss(payload: {
  numerologyContext: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
}): Promise<string> {
  const result = await retryWithBackoff(() =>
    callOpenAI([
      {
        role: 'system',
        content: `You are an expert numerologist and astrologer who holds both systems simultaneously — you see numbers and planetary energies as two languages describing the same soul. You are continuing a conversation with someone about their numerological profile. Use the full context below to answer follow-up questions with depth, specificity, and personal directness. Reference their actual numbers. Do not be generic. Stay personal and direct.\n\n${payload.numerologyContext}`,
      },
      ...payload.messages,
    ], { temperature: 0.85, max_tokens: 1000 })
  )
  return result || 'Unable to generate a response.'
}

async function handleAstroDiscuss(payload: {
  astroContext: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
}): Promise<string> {
  const result = await retryWithBackoff(() =>
    callOpenAI([
      {
        role: 'system',
        content: `You are an expert astrologer having a direct, honest conversation about someone's birth chart and transits. Answer using the astrological data below. Be factual and precise — state what is favorable clearly and state what is difficult without softening it. Reference specific planetary placements, dignities, and aspect doctrine. Do not default to reassurance or encouragement — instead give the person the real picture so they can make informed decisions. If an aspect is classically malefic, say so. If a placement is strong, say so. Keep responses focused and substantive (2-4 paragraphs unless they ask for detail).\n\n${payload.astroContext}`,
      },
      ...payload.messages,
    ], { temperature: 0.8, max_tokens: 1500 })
  )
  return result || 'Unable to generate a response.'
}

const VALID_JOURNAL_TAGS = new Set([
  'breakthrough', 'turning-point', 'grief', 'love', 'decision', 'creative-peak', 'dream', 'blocked',
])

async function handleJournalAnnotation(payload: {
  entry: JournalEntry
  topTransits: TransitAspect[]
  moonPhase: string
  moonSign: string
  chartData: ServerChartData
}, userId?: number): Promise<{ annotation: string; tags: string[] }> {
  const sun = payload.chartData.planets.find(p => p.name === 'Sun')
  const moon = payload.chartData.planets.find(p => p.name === 'Moon')
  const asc = payload.chartData.angles?.ascendant

  const natalContext = [
    sun ? `Sun in ${sun.sign}` : '',
    moon ? `Moon in ${moon.sign}` : '',
    asc ? `Ascendant in ${asc.sign}` : '',
  ].filter(Boolean).join(', ')

  // Prefer server-computed transits when userId and birth context are available
  let resolvedTransits = payload.topTransits
  if (userId) {
    const ctx = resolveUserBirthContext(userId)
    if (ctx) {
      try {
        const natalChart = calculateChart(
          ctx.birthDate,
          ctx.birthTime,
          ctx.lat,
          ctx.lng,
          ctx.tz,
          ctx.unknownTime,
        )
        const entryDate = payload.entry.date ? new Date(payload.entry.date) : undefined
        const serverTransits = getTopActiveTransits(natalChart, 5, 3, entryDate)
        resolvedTransits = serverTransits.map(t => ({
          transitPlanet: t.transitPlanet,
          symbol: t.symbol,
          natalPlanet: t.natalPlanet,
          orb: t.orb,
          nature: t.nature,
        }))
      } catch {
        // Non-fatal — fall back to client-provided transits
      }
    }
  }

  const transitLines = resolvedTransits.slice(0, 3).map(t =>
    `${t.transitPlanet} ${t.symbol} natal ${t.natalPlanet} (${t.orb.toFixed(1)}° orb, ${t.nature})`
  ).join('\n') || 'No tight transit aspects active.'

  const bodyText = payload.entry.body.trim()
    ? `"${payload.entry.body}"`
    : 'No text recorded — moment only.'

  const prompt = `Date: ${payload.entry.date}
Personal Day: ${payload.entry.numerologicalDay}
Moon: ${payload.moonPhase} in ${payload.moonSign}
Natal: ${natalContext}

Active transits:
${transitLines}

Journal entry:
${bodyText}

Return JSON with:
- "annotation": 2-3 sentences connecting what they wrote to the sky. Reference their actual words and the specific transits. Draw the thread between their experience and the planetary energies.
- "tags": array of 1-3 strings from: breakthrough, turning-point, grief, love, decision, creative-peak, dream, blocked`

  const result = await retryWithBackoff(() =>
    callOpenAI([
      {
        role: 'system',
        content: 'You are an astrologer reading a person\'s journal against the sky at that moment. Connect what they actually wrote to the planetary energies active at that time — not abstractly, but specifically: what in their words reflects what the planets were doing. Write 2-3 sentences. Be direct and personal. Do not mention astrology as a system. Return valid JSON only.',
      },
      { role: 'user', content: prompt },
    ], { temperature: 0.8, max_tokens: 350 })
  )

  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned) as { annotation?: unknown; tags?: unknown }
    const annotation = typeof parsed.annotation === 'string' && parsed.annotation.trim()
      ? parsed.annotation.trim()
      : 'The sky held a particular arrangement at this moment.'
    const tags = Array.isArray(parsed.tags)
      ? (parsed.tags as unknown[]).filter((t): t is string => typeof t === 'string' && VALID_JOURNAL_TAGS.has(t))
      : []
    return { annotation, tags }
  } catch {
    return {
      annotation: 'The sky held a particular arrangement at this moment.',
      tags: [],
    }
  }
}

async function handleCosmicPatternReading(payload: {
  patterns: PatternSummary[]
  chartData: ServerChartData
  totalEntryCount: number
}): Promise<PatternReading[]> {
  const sun = payload.chartData.planets.find(p => p.name === 'Sun')
  const moon = payload.chartData.planets.find(p => p.name === 'Moon')
  const asc = payload.chartData.angles?.ascendant

  const natalContext = [
    sun ? `Sun in ${sun.sign}` : '',
    moon ? `Moon in ${moon.sign}` : '',
    asc ? `Ascendant in ${asc.sign}` : '',
  ].filter(Boolean).join(', ')

  const patternLines = payload.patterns.map(p => {
    const dates = p.entryDates.slice(0, 5).join(', ')
    return `Category: ${p.tagGroup} (${p.sampleSize} entries, dates: ${dates})
Dominant planets: ${p.dominantPlanets.join(', ') || 'none identified'}
Dominant moon phases: ${p.dominantPhases.join(', ') || 'none identified'}
Dominant personal days: ${p.dominantPersonalDays.join(', ') || 'none identified'}`
  }).join('\n\n')

  const prompt = `Total journal entries: ${payload.totalEntryCount}
Natal chart: ${natalContext}

Patterns identified across life events:

${patternLines}

For each event category listed, write one named pattern with a 3-5 word heading and 1-2 sentences. Return your response as a JSON array with objects: { "tagGroup": "...", "heading": "...", "body": "..." }

Do not speak statistically. Speak in present tense. Name the pattern as a quality of this person — not as a count of data points. Use mirror-language: state what the pattern reveals about who this person is, not what their data shows. Do not use the word "data", "pattern", or "trend". Do not hedge. Write as though you have known this person for years.`

  const result = await retryWithBackoff(() =>
    callOpenAI([
      {
        role: 'system',
        content: 'You are reading a person\'s longitudinal life record through the cosmos. For each event category listed, write one named pattern with a 3-5 word heading and 1-2 sentences. Do not speak statistically. Speak in present tense. Name the pattern as a quality of this person — not as a count of data points. Use mirror-language: state what the pattern reveals about who this person is, not what their data shows. Do not use the word "data", "pattern", or "trend". Do not hedge. Write as though you have known this person for years. Return valid JSON array only.',
      },
      { role: 'user', content: prompt },
    ], { temperature: 0.85, max_tokens: 800 })
  )

  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned) as PatternReading[]
  } catch {
    return payload.patterns.map(p => ({
      tagGroup: p.tagGroup,
      heading: `${p.tagGroup.charAt(0).toUpperCase() + p.tagGroup.slice(1)} at Your Thresholds`,
      body: result.slice(0, 200),
    }))
  }
}

// ---------------------------------------------------------------------------
// Solar return handler
// ---------------------------------------------------------------------------

async function handleSolarReturnInterpretation(
  payload: { targetYear: number },
  userId?: number,
): Promise<string> {
  if (!userId) {
    throw new GptServiceError('Authentication required for solar return interpretation', 401)
  }

  const ctx = resolveUserBirthContext(userId)
  if (!ctx) {
    throw new GptServiceError('Birth data required for solar return interpretation', 422)
  }

  const natalChart = calculateChart(
    ctx.birthDate,
    ctx.birthTime,
    ctx.lat,
    ctx.lng,
    ctx.tz,
    ctx.unknownTime,
  )

  const { srMoment, srChart } = calculateSolarReturn(natalChart, ctx.lat, ctx.lng, payload.targetYear)
  const prompt = buildSolarReturnPrompt(natalChart, srChart, srMoment, ctx.birthDate)

  const result = await retryWithBackoff(() =>
    callOpenAI([
      {
        role: 'system',
        content: 'You are an expert astrologer providing precise, honest solar return readings. State what the chart shows directly — name the themes, challenges, and opportunities plainly without generic encouragement.',
      },
      { role: 'user', content: prompt },
    ], { temperature: 0.8, max_tokens: 2000 })
  )
  return result || 'Unable to generate solar return interpretation.'
}

// ---------------------------------------------------------------------------
// Synastry handlers
// ---------------------------------------------------------------------------

async function handleSynastryInterpretation(payload: {
  person1: { date: string; time: string | null; lat: number; lng: number; tz: string; name?: string }
  person2: { date: string; time: string | null; lat: number; lng: number; tz: string; name?: string }
}): Promise<string> {
  const { person1, person2 } = payload
  const chart1 = calculateChart(person1.date, person1.time ?? '12:00', person1.lat, person1.lng, person1.tz, !person1.time)
  const chart2 = calculateChart(person2.date, person2.time ?? '12:00', person2.lat, person2.lng, person2.tz, !person2.time)
  const synastryData = calculateSynastry(chart1, chart2)
  const prompt = buildSynastryPrompt(chart1, chart2, synastryData, person1.date, person2.date, person1.name, person2.name)
  return retryWithBackoff(() => callOpenAI([{ role: 'system', content: prompt }], { temperature: 0.85, max_tokens: 4000 }))
}

async function handleCoupleTransitInterpretation(payload: {
  person1: { date: string; time: string | null; lat: number; lng: number; tz: string; name?: string }
  person2: { date: string; time: string | null; lat: number; lng: number; tz: string; name?: string }
  period: string
  targetMonth?: string
}): Promise<string> {
  const { person1, person2 } = payload
  const chart1 = calculateChart(person1.date, person1.time ?? '12:00', person1.lat, person1.lng, person1.tz, !person1.time)
  const chart2 = calculateChart(person2.date, person2.time ?? '12:00', person2.lat, person2.lng, person2.tz, !person2.time)
  const synastryData = calculateSynastry(chart1, chart2)

  const transitPositions = calculateCurrentPositions(new Date())
  const transitAspects = calculateTransitAspects(transitPositions, synastryData.compositeChart.planets, payload.period as TransitPeriod, true)
  const transitData: TransitData = {
    period: payload.period as TransitPeriod,
    dateRange: {
      start: new Date().toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
    },
    currentPlanets: transitPositions,
    transitAspects,
    ingresses: [],
    retrogrades: [],
  }

  const prompt = buildCoupleTransitPrompt(chart1, chart2, synastryData, transitData, payload.period as TransitPeriod, person1.date, person2.date, payload.targetMonth, person1.name, person2.name)
  return retryWithBackoff(() => callOpenAI([{ role: 'system', content: prompt }], { temperature: 0.85, max_tokens: 3000 }))
}

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

export async function handleGptRequest(
  type: string,
  payload: Record<string, unknown>,
  userId?: number,
): Promise<unknown> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('gpt_unavailable')
  }

  switch (type) {
    case 'transit-interpretation':
      return handleTransitInterpretation(payload as Parameters<typeof handleTransitInterpretation>[0], userId)
    case 'dream-interpretation':
      return handleDreamInterpretation(payload as Parameters<typeof handleDreamInterpretation>[0], userId)
    case 'dream-discuss':
      return handleDreamDiscuss(payload as Parameters<typeof handleDreamDiscuss>[0])
    case 'astro-numerology-cross':
      return handleAstroNumerologyCross(payload as Parameters<typeof handleAstroNumerologyCross>[0], userId)
    case 'daily-snapshot':
      return handleDailySnapshot(payload as Parameters<typeof handleDailySnapshot>[0])
    case 'numerology-narrative':
      return handleNumerologyNarrative(payload as Parameters<typeof handleNumerologyNarrative>[0], userId)
    case 'numerology-sky-chart':
      return handleNumerologySkyChart(payload as Parameters<typeof handleNumerologySkyChart>[0])
    case 'today-synthesis':
      return handleTodaySynthesis(payload as Parameters<typeof handleTodaySynthesis>[0], userId)
    case 'numerology-discuss':
      return handleNumerologyDiscuss(payload as Parameters<typeof handleNumerologyDiscuss>[0])
    case 'astro-discuss':
      return handleAstroDiscuss(payload as Parameters<typeof handleAstroDiscuss>[0])
    case 'journal-annotation':
      return handleJournalAnnotation(payload as Parameters<typeof handleJournalAnnotation>[0], userId)
    case 'cosmic-pattern-reading':
      return handleCosmicPatternReading(payload as Parameters<typeof handleCosmicPatternReading>[0])
    case 'solar-return':
      return handleSolarReturnInterpretation(payload as Parameters<typeof handleSolarReturnInterpretation>[0], userId)
    case 'synastry-interpretation':
      return handleSynastryInterpretation(payload as Parameters<typeof handleSynastryInterpretation>[0])
    case 'couple-transit-interpretation':
      return handleCoupleTransitInterpretation(payload as Parameters<typeof handleCoupleTransitInterpretation>[0])
    default:
      throw new Error(`Unknown GPT type: ${type}`)
  }
}
