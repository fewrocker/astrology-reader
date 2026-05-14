import { AUTH_TOKEN_KEY } from './authService'

const ENDPOINT = '/api/analytics/event'

export function track(event: string, properties?: Record<string, unknown>): void {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (token) headers['Authorization'] = `Bearer ${token}`
  } catch { /* localStorage unavailable */ }

  fetch(ENDPOINT, {
    method: 'POST',
    headers,
    credentials: 'include', // send session_id cookie
    body: JSON.stringify({ event, properties }),
  }).catch(() => { /* analytics failures are silent */ })
}
