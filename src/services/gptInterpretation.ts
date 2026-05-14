import type { ChartData } from '../engine/types'
import type { JournalEntry, JournalTag } from '../components/journal/types'
import type { TransitAspect } from '../engine/transits'
import { GPT_RATE_LIMIT, GPT_RATE_LIMIT_UNAUTH, GPT_SERVER_ERROR, GPT_OFFLINE, GPT_NUDGE } from './gptErrors'
import { track } from './analytics'

// JWT key used by auth service — injected as Authorization header when present
const JWT_STORAGE_KEY = 'astral-chart-jwt'

// Session-level GPT call counter for unauthenticated nudge (spec section 9)
let _sessionCalls = 0

function isAuthenticated(): boolean {
  try {
    return !!localStorage.getItem(JWT_STORAGE_KEY)
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
    const token = localStorage.getItem(JWT_STORAGE_KEY)
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
      hasToken = true
    }
  } catch {
    // localStorage unavailable (SSR or permissions) — proceed without auth header
  }

  let response: Response
  try {
    response = await fetch('/api/gpt/interpret', {
      method: 'POST',
      headers,
      body: JSON.stringify({ type, payload }),
    })
  } catch {
    throw new Error(GPT_OFFLINE)
  }

  if (response.status === 429) {
    let unauthenticated = !hasToken
    try {
      const body = await response.json() as { authenticated?: boolean }
      unauthenticated = body.authenticated === false
    } catch { /* ignore — fall back to header-based detection */ }
    track('gpt_limit_hit', { authenticated: !unauthenticated, gpt_type: type })
    throw new Error(unauthenticated ? GPT_RATE_LIMIT_UNAUTH : GPT_RATE_LIMIT)
  }

  if (!response.ok) {
    throw new Error(GPT_SERVER_ERROR)
  }

  const data = await response.json() as { result: unknown }
  _sessionCalls++
  track('gpt_request_made', { gpt_type: type })
  return data.result
}

export async function getGptInterpretation(systemPrompt: string): Promise<string> {
  try {
    const result = await callProxy('transit-interpretation', { systemPrompt })
    return (result as string) || 'Unable to generate interpretation.'
  } catch (err) {
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
  aspects: Array<{ transitPlanet: string; symbol: string; natalPlanet: string; orb: number; nature: string }>,
  personalDay: number,
  personalDayArchetype: string,
): Promise<string> {
  try {
    const result = await callProxy('today-synthesis', {
      moon,
      aspects,
      personalDay,
      personalDayArchetype,
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
