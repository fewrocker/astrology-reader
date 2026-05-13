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
