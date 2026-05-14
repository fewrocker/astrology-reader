import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { getDb } from '../db.js'

type RateLimitEntry = { count: number; resetAt: number; tier: 'free' | 'basic' | 'advanced' }

// Keyed by user_id (authenticated) or IP (unauthenticated)
// Using separate maps so limits are independent — a user who is also on a shared IP
// does not consume IP-based quota for other unauthenticated users on that network.
const authenticated: Map<number, RateLimitEntry> = new Map()
const unauthenticated: Map<string, { count: number; resetAt: number }> = new Map()

const UNAUTH_LIMIT = parseInt(process.env.GPT_UNAUTH_DAILY_LIMIT ?? '5', 10)

const TIER_LIMITS: Record<'free' | 'basic' | 'advanced', number> = {
  free: parseInt(process.env.GPT_FREE_DAILY_LIMIT ?? '3', 10),
  basic: parseInt(process.env.GPT_BASIC_DAILY_LIMIT ?? '20', 10),
  advanced: parseInt(process.env.GPT_ADVANCED_DAILY_LIMIT ?? '100', 10),
}

function getUserTier(userId: number): 'free' | 'basic' | 'advanced' {
  try {
    const db = getDb()
    const row = db
      .prepare('SELECT subscription_tier FROM users WHERE id = ?')
      .get(userId) as { subscription_tier: string | null } | undefined
    const t = row?.subscription_tier
    if (t === 'basic' || t === 'advanced') return t
  } catch {
    // Fall through to free on any DB error
  }
  return 'free'
}

/**
 * Invalidate the in-memory rate limit entry for a user.
 * Called by the Stripe webhook handler after a successful tier upgrade so
 * the next GPT call re-reads the tier from the DB instead of using a stale entry.
 */
export function invalidateUserRateLimit(userId: number): void {
  authenticated.delete(userId)
}

function nextMidnightUTC(): number {
  const d = new Date()
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)
}

function checkAuthLimit(
  userId: number,
): { allowed: boolean; resetAt: number; limit: number; tier: 'free' | 'basic' | 'advanced' } {
  const now = Date.now()
  const entry = authenticated.get(userId)

  if (!entry || now >= entry.resetAt) {
    const tier = getUserTier(userId)
    const limit = TIER_LIMITS[tier]
    const resetAt = nextMidnightUTC()
    authenticated.set(userId, { count: 1, resetAt, tier })
    return { allowed: true, resetAt, limit, tier }
  }

  const limit = TIER_LIMITS[entry.tier]
  if (entry.count >= limit) {
    return { allowed: false, resetAt: entry.resetAt, limit, tier: entry.tier }
  }
  entry.count++
  return { allowed: true, resetAt: entry.resetAt, limit, tier: entry.tier }
}

function checkUnauthLimit(
  ip: string,
): { allowed: boolean; resetAt: number } {
  const now = Date.now()
  const entry = unauthenticated.get(ip)
  if (!entry || now >= entry.resetAt) {
    const resetAt = nextMidnightUTC()
    unauthenticated.set(ip, { count: 1, resetAt })
    return { allowed: true, resetAt }
  }
  if (entry.count >= UNAUTH_LIMIT) {
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
    const result = checkAuthLimit(userId)
    if (!result.allowed) {
      res.status(429).json({
        error: 'rate_limit_exceeded',
        resetAt: new Date(result.resetAt).toISOString(),
        limit: result.limit,
        tier: result.tier,
        authenticated: true,
      })
      return
    }
  } else {
    // Per-IP limiting for unauthenticated users.
    // Known limitation: shared IP environments (corporate NAT, university WiFi) will
    // share the quota. Session-based limiting is more equitable but adds state
    // management complexity. v1 uses per-IP; revisit if abuse patterns emerge.
    const ip = req.ip ?? 'unknown'
    const result = checkUnauthLimit(ip)
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
