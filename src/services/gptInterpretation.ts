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
          content: 'You are an expert astrologer who provides factual, precise, and honest transit readings grounded in traditional and modern astrological technique. State what the chart shows plainly — name favorable configurations and their real benefits, and name difficult ones with their real challenges. Do not sugar-coat, minimize tensions, or add generic encouragement. Treat the reader as someone who takes astrology seriously and wants the unvarnished picture. Reference dignities, debilities, sect, and aspect doctrine where relevant. Be direct, specific, and substantive — never cheerful for its own sake.',
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
          content: `You are an expert astrologer having a direct, honest conversation about someone's birth chart and transits. Answer using the astrological data below. Be factual and precise — state what is favorable clearly and state what is difficult without softening it. Reference specific planetary placements, dignities, and aspect doctrine. Do not default to reassurance or encouragement — instead give the person the real picture so they can make informed decisions. If an aspect is classically malefic, say so. If a placement is strong, say so. Keep responses focused and substantive (2-4 paragraphs unless they ask for detail).\n\n${astroContext}`,
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
