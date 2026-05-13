import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

type RateLimitEntry = { count: number; resetAt: number }

// Keyed by user_id (authenticated) or IP (unauthenticated)
// Using separate maps so limits are independent — a user who is also on a shared IP
// does not consume IP-based quota for other unauthenticated users on that network.
const authenticated: Map<number, RateLimitEntry> = new Map()
const unauthenticated: Map<string, RateLimitEntry> = new Map()

const AUTH_LIMIT = parseInt(process.env.GPT_AUTH_DAILY_LIMIT ?? '20', 10)
const UNAUTH_LIMIT = parseInt(process.env.GPT_UNAUTH_DAILY_LIMIT ?? '5', 10)

function nextMidnightUTC(): number {
  const d = new Date()
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)
}

function checkLimit<K>(
  map: Map<K, RateLimitEntry>,
  key: K,
  limit: number,
): { allowed: boolean; resetAt: number } {
  const now = Date.now()
  const entry = map.get(key)
  if (!entry || now >= entry.resetAt) {
    const resetAt = nextMidnightUTC()
    map.set(key, { count: 1, resetAt })
    return { allowed: true, resetAt }
  }
  if (entry.count >= limit) {
    return { allowed: false, resetAt: entry.resetAt }
  }
  entry.count++
  return { allowed: true, resetAt: entry.resetAt }
}

function extractUserId(req: Request): number | null {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  try {
    const secret = process.env.JWT_SECRET
    if (!secret) return null
    const payload = jwt.verify(token, secret) as { userId: number }
    return typeof payload.userId === 'number' ? payload.userId : null
  } catch {
    return null
  }
}

const LOCALHOST = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])

export function gptRateLimit(req: Request, res: Response, next: NextFunction): void {
  if (LOCALHOST.has(req.ip ?? '')) {
    next()
    return
  }

  const userId = extractUserId(req)

  if (userId !== null) {
    const result = checkLimit(authenticated, userId, AUTH_LIMIT)
    if (!result.allowed) {
      res.status(429).json({
        error: 'rate_limit_exceeded',
        resetAt: new Date(result.resetAt).toISOString(),
        limit: AUTH_LIMIT,
        authenticated: true,
      })
      return
    }
  } else {
    // Per-IP limiting for unauthenticated users.
    // Known limitation: shared IP environments (corporate NAT, university WiFi) will
    // share the 5-call quota. Session-based limiting is more equitable but adds state
    // management complexity. v1 uses per-IP; revisit if abuse patterns emerge.
    const ip = req.ip ?? 'unknown'
    const result = checkLimit(unauthenticated, ip, UNAUTH_LIMIT)
    if (!result.allowed) {
      res.status(429).json({
        error: 'rate_limit_exceeded',
        resetAt: new Date(result.resetAt).toISOString(),
        limit: UNAUTH_LIMIT,
        authenticated: false,
      })
      return
    }
  }

  next()
}
