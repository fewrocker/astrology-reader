// Matches the key used by authService.ts and AuthContext.tsx
const JWT_KEY = 'astral-auth-token'
const ENDPOINT = '/api/analytics/event'

export function track(event: string, properties?: Record<string, unknown>): void {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  try {
    const token = localStorage.getItem(JWT_KEY)
    if (token) headers['Authorization'] = `Bearer ${token}`
  } catch { /* localStorage unavailable */ }

  fetch(ENDPOINT, {
    method: 'POST',
    headers,
    credentials: 'include', // send session_id cookie
    body: JSON.stringify({ event, properties }),
  }).catch(() => { /* analytics failures are silent */ })
}
