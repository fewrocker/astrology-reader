const API_KEY_STORAGE = 'astral-chart-openai-key'
const API_URL = 'https://api.openai.com/v1/chat/completions'
const DEFAULT_KEY = import.meta.env.VITE_OPENAI_API_KEY ?? ''

export function getStoredApiKey(): string {
  try {
    return localStorage.getItem(API_KEY_STORAGE) || DEFAULT_KEY
  } catch {
    return DEFAULT_KEY
  }
}

export function storeApiKey(key: string): void {
  try {
    localStorage.setItem(API_KEY_STORAGE, key)
  } catch {
    // silently ignore
  }
}

class OpenAIError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'OpenAIError'
  }
}

const RETRYABLE_STATUSES = new Set([429, 503, 504])

async function retryWithBackoff<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      const isRetryable =
        err instanceof TypeError ||
        (err instanceof OpenAIError && RETRYABLE_STATUSES.has(err.status))
      if (!isRetryable) throw err
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
      }
    }
  }
  throw lastError
}

async function callOpenAI(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  options: { model?: string; temperature?: number; max_tokens?: number } = {},
): Promise<string> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model ?? 'gpt-4o-mini',
      messages,
      temperature: options.temperature ?? 0.8,
      max_tokens: options.max_tokens ?? 2000,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const msg = (errorData as { error?: { message?: string } })?.error?.message || response.statusText
    throw new OpenAIError(`OpenAI API error: ${msg}`, response.status)
  }

  const data = await response.json() as { choices: { message: { content: string } }[] }
  return data.choices[0]?.message?.content ?? ''
}

/**
 * Call OpenAI Chat API to interpret transit data.
 * Returns the interpretation text.
 */
export async function getGptInterpretation(
  systemPrompt: string,
  apiKey: string,
): Promise<string> {
  if (!apiKey) {
    throw new Error('OpenAI API key is required for transit interpretations.')
  }

  const result = await retryWithBackoff(() =>
    callOpenAI(apiKey, [
      {
        role: 'system',
        content: 'You are an expert astrologer who provides factual, precise, and honest transit readings grounded in traditional and modern astrological technique. State what the chart shows plainly — name favorable configurations and their real benefits, and name difficult ones with their real challenges. Do not sugar-coat, minimize tensions, or add generic encouragement. Treat the reader as someone who takes astrology seriously and wants the unvarnished picture. Reference dignities, debilities, sect, and aspect doctrine where relevant. Be direct, specific, and substantive — never cheerful for its own sake.',
      },
      { role: 'user', content: systemPrompt },
    ], { temperature: 0.8, max_tokens: 2000 })
  )
  return result || 'Unable to generate interpretation.'
}

export async function getDreamInterpretation(
  dreamDescription: string,
  natalContext: string,
  transitSummary: string,
  transitAspectsText: string,
  apiKey: string,
): Promise<string> {
  if (!apiKey) throw new Error('OpenAI API key is required.')

  const prompt = `## Dreamer's Natal Chart\n${natalContext}\n\n## Today's Astrological Picture\n${transitSummary}\n\n## Active Transit Aspects Today\n${transitAspectsText}\n\n## The Dream\n${dreamDescription}\n\nProvide a deep, personalized dream interpretation that weaves together the dream's symbols with the active planetary energies. Connect specific dream elements to transit planets and natal placements. Be evocative, specific, and insightful — 4 to 6 paragraphs. Speak directly to the dreamer in second person.`

  const result = await retryWithBackoff(() =>
    callOpenAI(apiKey, [
      {
        role: 'system',
        content: `You are a mystical astrologer and dream interpreter. You read the unconscious mind through the lens of the cosmos — connecting dream symbols, emotions, and narratives with current planetary transits and the dreamer's natal chart.\n\nWhen interpreting:\n- Connect specific dream symbols to relevant planetary archetypes and active transits (Mars = conflict/drive, Neptune = dissolution/illusion/dreams, Moon = emotion/memory, Mercury = mind/communication, Saturn = limits/structure, etc.)\n- Reference the dreamer's natal placements to personalize the reading — show how the dream echoes their chart\n- Weave between psychological depth and cosmic synchronicity\n- Speak with poetic precision — evocative but grounded in actual astrological doctrine\n- Be specific about which planets and aspects are speaking through the dream imagery\n- Do not be generic — every interpretation must be personal to this chart and this transit moment`,
      },
      { role: 'user', content: prompt },
    ], { temperature: 0.85, max_tokens: 1200 })
  )
  return result || 'Unable to generate dream interpretation.'
}

export async function getDreamDiscussResponse(
  dreamContext: string,
  messages: ChatMessage[],
  apiKey: string,
): Promise<string> {
  if (!apiKey) throw new Error('OpenAI API key is required.')

  const result = await retryWithBackoff(() =>
    callOpenAI(apiKey, [
      {
        role: 'system',
        content: `You are a mystical astrologer and dream interpreter continuing a conversation about someone's dream and their natal chart. Use the full context below — the dreamer's chart, today's transits, and the original dream — to answer follow-up questions with depth and specificity. Stay in the dreamy, cosmic register. Be direct and personal.\n\n${dreamContext}`,
      },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ], { temperature: 0.85, max_tokens: 1000 })
  )
  return result || 'Unable to generate a response.'
}

export async function getDailySnapshotInterpretation(
  prompt: string,
  apiKey: string,
): Promise<string> {
  if (!apiKey) {
    throw new Error('OpenAI API key is required.')
  }

  const result = await retryWithBackoff(() =>
    callOpenAI(apiKey, [
      {
        role: 'system',
        content:
          'You are an expert astrologer writing a personalized daily briefing. Be concise and direct — 2 to 3 sentences maximum. Name what is actually happening astrologically and what it means for this specific person today. Reference the actual planets and aspects. Do not be generic or vague. No cheerful filler.',
      },
      { role: 'user', content: prompt },
    ], { temperature: 0.75, max_tokens: 300 })
  )
  return result || 'Unable to generate daily snapshot.'
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
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

export async function generateNumerologyNarrative(
  numbers: {
    lifePath: number
    birthdayNumber: number
    personalYear: number
    expressionNumber?: number
    soulUrge?: number
  },
  userName: string | undefined,
  apiKey: string,
): Promise<string> {
  if (!apiKey) throw new Error('OpenAI API key is required.')

  const nameIntro = userName ? `Reading for: ${userName}` : 'Reading for: unnamed person'
  const expressionLine = numbers.expressionNumber !== undefined
    ? `Expression Number: ${numbers.expressionNumber}${masterLabel(numbers.expressionNumber)} — how gifts and personality express outward in the world`
    : 'Expression Number: not provided (no birth name given)'
  const soulUrgeLine = numbers.soulUrge !== undefined
    ? `Soul Urge Number: ${numbers.soulUrge}${masterLabel(numbers.soulUrge)} — the inner desire, what the soul craves and is driven by`
    : 'Soul Urge Number: not provided'

  const prompt = `${nameIntro}

## Complete Numerological Profile

Life Path: ${numbers.lifePath}${masterLabel(numbers.lifePath)} — the fundamental nature, the overarching life theme and lesson
Birthday Number: ${numbers.birthdayNumber}${masterLabel(numbers.birthdayNumber)} — a specific natural talent, a gift brought into this life
Personal Year: ${numbers.personalYear}${masterLabel(numbers.personalYear)} — the current annual cycle, the dominant theme and energy of this year
${expressionLine}
${soulUrgeLine}

Write a cohesive 3-paragraph reading that treats these numbers as a single integrated portrait — not as definitions placed side by side. In each paragraph, show how the numbers interact: where they reinforce each other and create coherent themes, and where they create genuine tension or complexity that this person must navigate.${isMaster(numbers.lifePath) || isMaster(numbers.birthdayNumber) || isMaster(numbers.personalYear) || (numbers.expressionNumber !== undefined && isMaster(numbers.expressionNumber)) || (numbers.soulUrge !== undefined && isMaster(numbers.soulUrge)) ? ' Name any master numbers with appropriate weight — they carry double the vibration and double the burden.' : ''} Reference the actual numbers throughout — never speak in generic archetypes without grounding them in these specific digits. Speak in second person, directly to this person${userName ? `, using their name (${userName}) where it feels natural` : ''}. Be evocative but precise — this is a real reading, not a textbook.`

  const result = await retryWithBackoff(() =>
    callOpenAI(apiKey, [
      {
        role: 'system',
        content: 'You are a master numerologist who reads the full numerological profile as a single, integrated portrait — not as separate number definitions placed side by side. Every reading is personal, direct, and specific to this person\'s actual numbers and their interactions.',
      },
      { role: 'user', content: prompt },
    ], { temperature: 0.85, max_tokens: 1200 })
  )
  return result || 'Unable to generate numerology narrative.'
}

export async function getNumerologyDiscussResponse(
  numerologyContext: string,
  messages: ChatMessage[],
  apiKey: string,
): Promise<string> {
  if (!apiKey) throw new Error('OpenAI API key is required.')

  const result = await retryWithBackoff(() =>
    callOpenAI(apiKey, [
      {
        role: 'system',
        content: `You are an expert numerologist and astrologer who holds both systems simultaneously — you see numbers and planetary energies as two languages describing the same soul. You are continuing a conversation with someone about their numerological profile. Use the full context below to answer follow-up questions with depth, specificity, and personal directness. Reference their actual numbers. Do not be generic. Stay personal and direct.\n\n${numerologyContext}`,
      },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ], { temperature: 0.85, max_tokens: 1000 })
  )
  return result || 'Unable to generate a response.'
}

/**
 * Send a discuss chat request with full astrological context.
 * Supports multi-turn conversation by passing previous messages.
 */
export async function getDiscussResponse(
  astroContext: string,
  messages: ChatMessage[],
  apiKey: string,
): Promise<string> {
  if (!apiKey) {
    throw new Error('OpenAI API key is required.')
  }

  const result = await retryWithBackoff(() =>
    callOpenAI(apiKey, [
      {
        role: 'system',
        content: `You are an expert astrologer having a direct, honest conversation about someone's birth chart and transits. Answer using the astrological data below. Be factual and precise — state what is favorable clearly and state what is difficult without softening it. Reference specific planetary placements, dignities, and aspect doctrine. Do not default to reassurance or encouragement — instead give the person the real picture so they can make informed decisions. If an aspect is classically malefic, say so. If a placement is strong, say so. Keep responses focused and substantive (2-4 paragraphs unless they ask for detail).\n\n${astroContext}`,
      },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ], { temperature: 0.8, max_tokens: 1500 })
  )
  return result || 'Unable to generate a response.'
}
