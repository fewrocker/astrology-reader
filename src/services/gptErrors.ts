// Legacy string constants — preserved for backward compatibility (spec §33).
// Components that call isGptError() against these strings must not break.
export const GPT_RATE_LIMIT = 'Daily reading limit reached — try again tomorrow.'
export const GPT_RATE_LIMIT_UNAUTH = 'Daily reading limit reached — try again tomorrow. ✦ Sign up for a free account to get 20 readings per day.'
export const GPT_SERVER_ERROR = "Couldn't generate interpretation — using a cached reading if available."
export const GPT_OFFLINE = "Couldn't connect to the server — interpretation unavailable offline."
export const GPT_NUDGE = '✦ Create an account for 20 daily readings.'

const GPT_ERROR_STRINGS = new Set([GPT_RATE_LIMIT, GPT_RATE_LIMIT_UNAUTH, GPT_SERVER_ERROR, GPT_OFFLINE])

export function isGptError(text: string): boolean {
  return GPT_ERROR_STRINGS.has(text)
}

export function getGptErrorMessage(text: string): string {
  if (text === GPT_RATE_LIMIT || text === GPT_RATE_LIMIT_UNAUTH) {
    return 'The stars are pausing — try again in a moment.'
  }
  if (text === GPT_OFFLINE) {
    return 'No connection to the sky. Check your network.'
  }
  return 'The reading could not be retrieved — try again.'
}

// Structured rate limit error type — carries the full 429 payload (spec §32).
export interface GptRateLimitError {
  type: 'rate_limit_exceeded'
  tier: 'free' | 'basic' | 'advanced'
  limit: number
  used: number
  resetAt: string // ISO 8601
  authenticated: boolean
}

/**
 * Parse a raw JSON value from a 429 response body into a typed GptRateLimitError.
 * Returns null if the value does not conform to the expected shape (spec §34).
 */
export function parseRateLimitError(json: unknown): GptRateLimitError | null {
  if (typeof json !== 'object' || json === null) return null
  const j = json as Record<string, unknown>
  if (j['error'] !== 'rate_limit_exceeded') return null
  if (typeof j['tier'] !== 'string') return null
  if (typeof j['limit'] !== 'number') return null
  if (typeof j['resetAt'] !== 'string') return null
  const tier = j['tier'] as string
  if (tier !== 'free' && tier !== 'basic' && tier !== 'advanced') return null
  return {
    type: 'rate_limit_exceeded',
    tier: tier as 'free' | 'basic' | 'advanced',
    limit: j['limit'] as number,
    used: typeof j['used'] === 'number' ? j['used'] as number : 0,
    resetAt: j['resetAt'] as string,
    authenticated: typeof j['authenticated'] === 'boolean' ? j['authenticated'] as boolean : false,
  }
}
