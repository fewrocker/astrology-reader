import type { ChartData } from '../engine/types'
import type { JournalEntry, JournalTag } from '../components/journal/types'
import type { TransitAspect } from '../engine/transits'
import type { CelticSynthesisPayload, SynthesisChapter } from '../components/tarot/types'
import { GPT_SERVER_ERROR, GPT_OFFLINE, GPT_TIMEOUT, GPT_NUDGE } from './gptErrors'
import { track } from './analytics'
import { AUTH_TOKEN_KEY } from './authService'

const GPT_REQUEST_TIMEOUT_MS = 30_000

// ─── Rate limit signal ────────────────────────────────────────────────────────

export interface RateLimitInfo {
  resetAt: string
  authenticated: boolean
  tier: 'free' | 'basic' | 'advanced'
}

/**
 * Thrown when the server returns 429. Callers can catch this to open UpgradeModal
 * instead of rendering an inline error string in the reading result.
 */
export class RateLimitError extends Error {
  readonly info: RateLimitInfo
  constructor(info: RateLimitInfo) {
    super('rate_limit_exceeded')
    this.name = 'RateLimitError'
    this.info = info
  }
}

// Session-level GPT call counter for unauthenticated nudge (spec section 9)
let _sessionCalls = 0

function isAuthenticated(): boolean {
  try {
    return !!localStorage.getItem(AUTH_TOKEN_KEY)
  } catch {
    return false
  }
}

// Returns nudge message for unauthenticated users who have made ≥3 GPT calls this session
export function getGptNudge(): string | null {
  if (isAuthenticated()) return null
  if (_sessionCalls >= 3) return GPT_NUDGE
  return null
}

async function callProxy(type: string, payload: object): Promise<unknown> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  let hasToken = false
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
      hasToken = true
    }
  } catch {
    // localStorage unavailable (SSR or permissions) — proceed without auth header
  }

  let response: Response
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), GPT_REQUEST_TIMEOUT_MS)
  try {
    response = await fetch('/api/gpt/interpret', {
      method: 'POST',
      headers,
      body: JSON.stringify({ type, payload }),
      signal: controller.signal,
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(GPT_TIMEOUT)
    }
    throw new Error(GPT_OFFLINE)
  } finally {
    clearTimeout(timeoutId)
  }

  if (response.status === 429) {
    let authenticated = hasToken
    let resetAt = new Date(Date.now() + 86400000).toISOString()
    let tier: 'free' | 'basic' | 'advanced' = 'free'
    try {
      const body = await response.json() as { authenticated?: boolean; resetAt?: string; tier?: string }
      if (body.authenticated === false) authenticated = false
      if (body.resetAt) resetAt = body.resetAt
      if (body.tier === 'basic' || body.tier === 'advanced') tier = body.tier
    } catch { /* fall back to defaults */ }
    track('gpt_limit_hit', { authenticated, gpt_type: type })
    throw new RateLimitError({ resetAt, authenticated, tier })
  }

  if (!response.ok) {
    throw new Error(GPT_SERVER_ERROR)
  }

  const data = await response.json() as { result: unknown }
  _sessionCalls++
  track('gpt_request_made', { gpt_type: type })
  return data.result
}

export async function getGptInterpretation(
  period: string,
  targetMonth?: string,
): Promise<string> {
  try {
    const result = await callProxy('transit-interpretation', { transitPeriod: period, targetMonth })
    return (result as string) || 'Unable to generate interpretation.'
  } catch (err) {
    if (err instanceof RateLimitError) throw err
    return err instanceof Error ? err.message : GPT_SERVER_ERROR
  }
}

export async function getDreamInterpretation(
  dreamDescription: string,
  natalContext: string,
  transitSummary: string,
  transitAspectsText: string,
  skyContext?: { moonSign: string; moonPhase: string; transits?: Array<{ transitPlanet: string; aspect: string; natalPlanet: string; orb: number }> },
  chartData?: ChartData,
): Promise<string> {
  try {
    const result = await callProxy('dream-interpretation', {
      dreamDescription,
      natalContext,
      transitSummary,
      transitAspectsText,
      skyContext: skyContext ?? null,
      chartData: chartData ?? null,
    })
    return (result as string) || 'Unable to generate dream interpretation.'
  } catch (err) {
    return err instanceof Error ? err.message : GPT_SERVER_ERROR
  }
}

export async function getDreamDiscussResponse(
  dreamContext: string,
  messages: ChatMessage[],
): Promise<string> {
  try {
    const result = await callProxy('dream-discuss', { dreamContext, messages })
    return (result as string) || 'Unable to generate a response.'
  } catch (err) {
    return err instanceof Error ? err.message : GPT_SERVER_ERROR
  }
}

export async function generateAstroNumerologyCrossReading(
  numbers: { lifePath: number; birthdayNumber: number; personalYear: number; expressionNumber?: number },
  chartData: { planets: Array<{ name: string; sign: string; house: number; retrograde: boolean; degree: number }>; angles: { ascendant: { sign: string }; midheaven: { sign: string } }; unknownTime: boolean },
  userName: string | undefined,
): Promise<string> {
  try {
    const result = await callProxy('astro-numerology-cross', {
      numbers,
      chartData,
      userName: userName ?? null,
    })
    return (result as string) || 'Unable to generate cross-reading.'
  } catch (err) {
    return err instanceof Error ? err.message : GPT_SERVER_ERROR
  }
}

export async function getDailySnapshotInterpretation(prompt: string): Promise<string> {
  try {
    const result = await callProxy('daily-snapshot', { prompt })
    return (result as string) || 'Unable to generate daily snapshot.'
  } catch (err) {
    return err instanceof Error ? err.message : GPT_SERVER_ERROR
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function generateNumerologyNarrative(
  numbers: {
    lifePath: number
    birthdayNumber: number
    personalYear: number
    expressionNumber?: number
    soulUrge?: number
  },
  userName: string | undefined,
): Promise<string> {
  try {
    const result = await callProxy('numerology-narrative', {
      numbers,
      userName: userName ?? null,
    })
    return (result as string) || 'Unable to generate numerology narrative.'
  } catch (err) {
    return err instanceof Error ? err.message : GPT_SERVER_ERROR
  }
}

export async function generateNumerologySkyChartReading(
  birthData: { name?: string; date: string },
  frequencyMap: Record<number, Array<{ label: string; eclipticDegree: number }>>,
): Promise<string> {
  try {
    const result = await callProxy('numerology-sky-chart', { birthData, frequencyMap })
    return (result as string) || 'Unable to generate sky chart reading.'
  } catch (err) {
    return err instanceof Error ? err.message : GPT_SERVER_ERROR
  }
}

export async function getTodayPageInterpretation(
  moon: { phaseName: string; moonSign: string; isVoid: boolean },
  aspects: Array<{
    transitPlanet: string; symbol: string; natalPlanet: string;
    orb: number; nature: string; natalHouse: number | null; applying?: boolean
  }>,
  aspectBriefSentences: string[],
  personalDay: number,
  personalDayArchetype: string,
  personalDayEssence: string,
  natalSunSign: string,
  natalMoonSign: string,
  natalMoonHouse: number | null,
  natalAscSign: string,
  natalMoonPhase: string | null,
  advanceCategory: string | null,
  advanceReason: string | null,
): Promise<string> {
  // Derive the client's local date as YYYY-MM-DD so the server uses the user's
  // wall-clock date rather than its own UTC clock.
  const localDate = new Date().toLocaleDateString('en-CA')
  try {
    const result = await callProxy('today-synthesis', {
      moon,
      aspects,
      aspectBriefSentences,
      personalDay,
      personalDayArchetype,
      localDate,
      personalDayEssence,
      natalSunSign,
      natalMoonSign,
      natalMoonHouse,
      natalAscSign,
      natalMoonPhase,
      advanceCategory,
      advanceReason,
    })
    return (result as string) || 'Unable to generate morning synthesis.'
  } catch (err) {
    return err instanceof Error ? err.message : GPT_SERVER_ERROR
  }
}

export async function getNumerologyDiscussResponse(
  numerologyContext: string,
  messages: ChatMessage[],
): Promise<string> {
  try {
    const result = await callProxy('numerology-discuss', { numerologyContext, messages })
    return (result as string) || 'Unable to generate a response.'
  } catch (err) {
    return err instanceof Error ? err.message : GPT_SERVER_ERROR
  }
}

export async function getDiscussResponse(
  astroContext: string,
  messages: ChatMessage[],
): Promise<string> {
  try {
    const result = await callProxy('astro-discuss', { astroContext, messages })
    return (result as string) || 'Unable to generate a response.'
  } catch (err) {
    return err instanceof Error ? err.message : GPT_SERVER_ERROR
  }
}

export async function generateJournalEntryAnnotation(
  entry: JournalEntry,
  topTransits: TransitAspect[],
  moonPhase: string,
  moonSign: string,
  chartData: ChartData,
): Promise<{ annotation: string; tags: JournalTag[] }> {
  try {
    const result = await callProxy('journal-annotation', {
      entry: { date: entry.date, time: entry.time, body: entry.body, numerologicalDay: entry.numerologicalDay },
      topTransits: topTransits.map(t => ({
        transitPlanet: t.transitPlanet,
        symbol: t.symbol,
        natalPlanet: t.natalPlanet,
        orb: t.orb,
        nature: t.nature,
      })),
      moonPhase,
      moonSign,
      chartData: {
        planets: chartData.planets,
        angles: chartData.angles,
      },
    })
    const data = result as { annotation?: string; tags?: JournalTag[] }
    return {
      annotation: (data.annotation ?? '').trim() || 'The sky held a particular arrangement at this moment.',
      tags: Array.isArray(data.tags) ? data.tags : [],
    }
  } catch (err) {
    return { annotation: err instanceof Error ? err.message : GPT_SERVER_ERROR, tags: [] }
  }
}

export interface PatternSummary {
  tagGroup: JournalTag
  dominantPlanets: string[]
  dominantPhases: string[]
  dominantPersonalDays: number[]
  sampleSize: number
  entryDates: string[]
}

export interface PatternReading {
  tagGroup: JournalTag
  heading: string
  body: string
}

export async function generateCosmicPatternReading(
  patterns: PatternSummary[],
  chartData: ChartData,
  totalEntryCount: number,
): Promise<PatternReading[]> {
  const result = await callProxy('cosmic-pattern-reading', {
    patterns,
    chartData: {
      planets: chartData.planets,
      angles: chartData.angles,
      unknownTime: chartData.unknownTime,
    },
    totalEntryCount,
  })
  return Array.isArray(result) ? (result as PatternReading[]) : []
}

export async function getSolarReturnInterpretation(targetYear: number): Promise<string> {
  try {
    const result = await callProxy('solar-return', { targetYear })
    return (result as string) || 'Unable to generate solar return interpretation.'
  } catch (err) {
    if (err instanceof RateLimitError) throw err
    return err instanceof Error ? err.message : GPT_SERVER_ERROR
  }
}

export async function getSynastryInterpretation(
  person1: { date: string; time: string | null; lat: number; lng: number; tz: string; name?: string },
  person2: { date: string; time: string | null; lat: number; lng: number; tz: string; name?: string },
): Promise<string> {
  try {
    const result = await callProxy('synastry-interpretation', { person1, person2 })
    return (result as string) || 'Unable to generate synastry interpretation.'
  } catch (err) {
    if (err instanceof RateLimitError) throw err
    return err instanceof Error ? err.message : GPT_SERVER_ERROR
  }
}

export async function getCoupleTransitInterpretation(
  person1: { date: string; time: string | null; lat: number; lng: number; tz: string; name?: string },
  person2: { date: string; time: string | null; lat: number; lng: number; tz: string; name?: string },
  period: string,
  targetMonth?: string,
): Promise<string> {
  try {
    const result = await callProxy('couple-transit-interpretation', { person1, person2, period, targetMonth })
    return (result as string) || 'Unable to generate synastry interpretation.'
  } catch (err) {
    if (err instanceof RateLimitError) throw err
    return err instanceof Error ? err.message : GPT_SERVER_ERROR
  }
}

// ---------------------------------------------------------------------------
// Tarot payload types (mirror of server/services/gptTarot.ts)
// ---------------------------------------------------------------------------

export interface TarotCardPayload {
  id: string
  name: string
  arcana: 'major' | 'minor'
  suit?: string
  number: number
  element: string | null
  reversed: boolean
  coreMeaning: string
  symbolicTheme: string
  emotionalMeaning: string
  practicalGuidance: string
  reflectionQuestion: string
  numerologyResonance: string
  astroHeadline: string
  transitInfluence: string
  lunarPhaseNote: string | null
}

export interface SpreadPositionPayload {
  index: number
  label: string
  meaning: string
}

export interface ThreeCardSignals {
  dominantArcana: 'major-heavy' | 'minor-heavy' | 'balanced'
  majorArcanaCount: number
  elementDistribution: Record<string, number>
  polarityCount: { upright: number; reversed: number }
  hasFoolOrWorld: boolean
  dominantSuit: string | null
  numeralProgression: string | null
}

export interface TarotSingleSynthesisPayload {
  card: TarotCardPayload
  position: SpreadPositionPayload | null
  userIntention: string | null
  natalSunSign: string
  natalMoonSign: string
  natalAscSign: string
  personalDay: number
  personalYear: number
  advanceCategory: string | null
  advanceReason: string | null
  moonPhaseName: string
  moonSign: string
  spreadMode: string | null
  localDate: string
}

export interface TarotThreeSynthesisPayload {
  cards: [TarotCardPayload, TarotCardPayload, TarotCardPayload]
  positions: [SpreadPositionPayload, SpreadPositionPayload, SpreadPositionPayload]
  spreadMode: string
  signals: ThreeCardSignals
  userIntention: string | null
  natalSunSign: string
  natalMoonSign: string
  natalAscSign: string
  personalDay: number
  advanceCategory: string | null
  moonPhaseName: string
  moonSign: string
  localDate: string
}

export interface TarotCelticSynthesisPayload {
  cards: TarotCardPayload[]
  positions: SpreadPositionPayload[]
  userIntention: string | null
  natalSunSign: string
  natalMoonSign: string
  natalAscSign: string
  natalMoonPhase: string | null
  personalDay: number
  personalYear: number
  lifePathNumber: number
  advanceCategory: string | null
  advanceReason: string | null
  moonPhaseName: string
  moonSign: string
  localDate: string
}

// ---------------------------------------------------------------------------
// Tarot synthesis client functions
// ---------------------------------------------------------------------------

export async function getTarotSingleSynthesis(
  payload: TarotSingleSynthesisPayload,
): Promise<string> {
  try {
    const result = await callProxy('tarot-single-synthesis', payload)
    return (result as string) || 'Unable to generate synthesis.'
  } catch (err) {
    if (err instanceof RateLimitError) throw err
    return err instanceof Error ? err.message : GPT_SERVER_ERROR
  }
}

export async function getTarotThreeSynthesis(
  payload: TarotThreeSynthesisPayload,
): Promise<string> {
  try {
    const result = await callProxy('tarot-three-synthesis', payload)
    return (result as string) || 'Unable to generate synthesis.'
  } catch (err) {
    if (err instanceof RateLimitError) throw err
    return err instanceof Error ? err.message : GPT_SERVER_ERROR
  }
}

// Parses GPT response into chapters.
// The server returns a plain string with sections delimited by numbered headings.
function parseCelticChapters(raw: unknown): SynthesisChapter[] {
  if (!raw || typeof raw !== 'string') return []
  const sections = raw.split(/\n(?=\d+\.\s)/).map(s => s.trim()).filter(Boolean)
  return sections.map(section => {
    const newline = section.indexOf('\n')
    if (newline === -1) return { heading: section, body: '' }
    const heading = section.slice(0, newline).replace(/^\d+\.\s+/, '').trim()
    const body = section.slice(newline + 1).trim()
    return { heading, body }
  })
}

export async function getTarotCelticSynthesis(
  payload: CelticSynthesisPayload,
): Promise<SynthesisChapter[]> {
  const result = await callProxy('tarot-celtic-synthesis', payload)
  const chapters = parseCelticChapters(result)
  if (chapters.length === 0) throw new Error('Empty synthesis response')
  return chapters
}

export async function getTarotDiscussResponse(
  discussContext: string,
  messages: ChatMessage[],
): Promise<string> {
  try {
    const result = await callProxy('tarot-discuss', { discussContext, messages })
    return (result as string) || 'Unable to generate a response.'
  } catch (err) {
    return err instanceof Error ? err.message : GPT_SERVER_ERROR
  }
}

export function buildTarotDiscussContext(
  readingType: 'single-card' | 'three-card' | 'celtic-cross',
  spreadMode: string | null,
  cards: TarotCardPayload[],
  positions: SpreadPositionPayload[],
  synthesis: string | null,
  natal: { sunSign: string; moonSign: string; ascSign: string; lifePathNumber: number; personalYear: number; personalDay: number },
  sky: { moonPhaseName: string; moonSign: string; advanceCategory: string | null; topTransits: string[] },
  userIntention: string | null,
): string {
  const intentionLine = userIntention
    ? `READING INTENTION: "${userIntention}"`
    : 'READING INTENTION: Open reading — no specific question'

  const cardLines = cards.slice(0, 10).map((card, i) => {
    const pos = positions[i]
    const rev = card.reversed ? 'reversed' : 'upright'
    return `${i + 1}. ${pos.label}: ${card.name} (${rev}) — ${card.symbolicTheme}. ${card.coreMeaning}. Sky: ${card.astroHeadline}`
  }).join('\n')

  const synthesisSection = synthesis
    ? `GPT SYNTHESIS:\n${synthesis}`
    : 'GPT SYNTHESIS: Not yet loaded.'

  const transitsLine = sky.topTransits.length > 0
    ? sky.topTransits.slice(0, 2).join('; ')
    : 'No tight transit aspects.'

  const advanceLine = sky.advanceCategory ? ` ${sky.advanceCategory} period.` : ''

  return [
    intentionLine,
    '',
    `CARDS DRAWN (${spreadMode ?? readingType.toUpperCase()}):`,
    cardLines,
    '',
    synthesisSection,
    '',
    'NATAL CHART:',
    `Sun in ${natal.sunSign}, Moon in ${natal.moonSign}, Ascendant in ${natal.ascSign}`,
    `Life Path: ${natal.lifePathNumber}, Personal Year: ${natal.personalYear}, Personal Day: ${natal.personalDay}`,
    '',
    'CURRENT SKY:',
    `${sky.moonPhaseName} Moon in ${sky.moonSign}.${advanceLine} ${transitsLine}`,
    '',
    `READING TYPE: ${readingType}`,
    spreadMode ? `SPREAD MODE: ${spreadMode}` : '',
  ].filter(line => line !== undefined).join('\n').trim()
}
