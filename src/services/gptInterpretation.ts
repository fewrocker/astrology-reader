const API_KEY_STORAGE = 'astral-chart-openai-key'
const API_URL = 'https://api.openai.com/v1/chat/completions'
const DEFAULT_KEY = 'REDACTED'

export function getStoredApiKey(): string {
  try {
    return localStorage.getItem(API_KEY_STORAGE) ?? DEFAULT_KEY
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

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert astrologer who provides warm, insightful, and personalized transit readings. Your interpretations blend traditional and modern astrology. You are compassionate and empowering in your guidance.',
        },
        {
          role: 'user',
          content: systemPrompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const msg = (errorData as { error?: { message?: string } })?.error?.message || response.statusText
    throw new Error(`OpenAI API error: ${msg}`)
  }

  const data = await response.json() as {
    choices: { message: { content: string } }[]
  }

  return data.choices[0]?.message?.content ?? 'Unable to generate interpretation.'
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
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

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a warm, knowledgeable astrologer having a personal conversation with someone about their birth chart and astrological transits. Answer their questions using the astrological data provided below. Be insightful, specific, and reference actual planetary placements. Keep responses conversational and not too long (2-4 paragraphs unless they ask for detail).\n\n${astroContext}`,
        },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.8,
      max_tokens: 1500,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const msg = (errorData as { error?: { message?: string } })?.error?.message || response.statusText
    throw new Error(`OpenAI API error: ${msg}`)
  }

  const data = await response.json() as {
    choices: { message: { content: string } }[]
  }

  return data.choices[0]?.message?.content ?? 'Unable to generate a response.'
}
