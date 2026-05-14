import { AUTH_TOKEN_KEY } from './authService'

const ENDPOINT = '/api/analytics/event'

/**
 * Canonical event schema — property keys must be camelCase, tier values must
 * be lowercase string literals ('free' | 'basic' | 'advanced').
 *
 * upgrade_modal_seen:       { currentTier: string, authenticated: boolean, intendedTier: string | null, heading: string }
 * upgrade_cta_clicked:      { tier: string, currentTier: string, authenticated: boolean, intendedTier: string | null }
 * upgrade_checkout_started: { tier: string, currentTier: string, authenticated: boolean }
 * upgrade_checkout_failed:  { tier: string, currentTier: string, authenticated: boolean, reason: 'server_error' | 'no_url' | 'network_error' }
 * upgrade_dismissed:        { currentTier: string, authenticated: boolean, intendedTier: string | null, checkoutState: 'idle' | 'ceremony' | 'error' }
 * auth_modal_seen:          { initialTab: 'login' | 'register' }
 * auth_modal_dismissed:     { tab: 'login' | 'register' }
 * auth_tab_switched:        { from: 'login' | 'register', to: 'login' | 'register' }
 * gpt_request_made:         { readingType: string, tier: string, authenticated: boolean } (existing — do not change)
 * gpt_limit_hit:            { tier: string, authenticated: boolean } (existing — do not change)
 */
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
