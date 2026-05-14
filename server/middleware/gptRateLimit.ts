import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { getDb } from '../db.js'

// Augment express res.locals so TypeScript knows about releaseSlot and userId
declare module 'express-serve-static-core' {
  interface Locals {
    releaseSlot?: () => void
    userId?: number
  }
}

type Tier = 'free' | 'basic' | 'advanced'

type RateLimitEntry = {
  count: number
  resetAt: number
  tier: Tier
}

// Keyed by user_id (authenticated) or IP (unauthenticated)
// Using separate maps so limits are independent — a user who is also on a shared IP
// does not consume IP-based quota for other unauthenticated users on that network.
const authenticated: Map<number, RateLimitEntry> = new Map()
// NOTE: Unauthenticated IP-based counters are intentionally NOT persisted to SQLite.
// IP limits losing state on server restart is an acceptable tradeoff for v1.
// Authenticated counts are the monetization-critical path and are persisted.
const unauthenticated: Map<string, RateLimitEntry> = new Map()

const TIER_LIMITS: Record<Tier, number> = {
  free: 3,
  basic: 20,
  advanced: 100,
}

// Prepared statements cached at module level for performance (spec §63).
// Initialized lazily on first use (after DB is ready).
let _getTierStmt: ReturnType<ReturnType<typeof getDb>['prepare']> | null = null
let _getUsageStmt: ReturnType<ReturnType<typeof getDb>['prepare']> | null = null
let _upsertUsageStmt: ReturnType<ReturnType<typeof getDb>['prepare']> | null = null
let _releaseUsageStmt: ReturnType<ReturnType<typeof getDb>['prepare']> | null = null

function getTierStmt() {
  if (!_getTierStmt) _getTierStmt = getDb().prepare('SELECT subscription_tier FROM users WHERE id = ?')
  return _getTierStmt
}
function getUsageStmt() {
  if (!_getUsageStmt) _getUsageStmt = getDb().prepare('SELECT count FROM gpt_usage WHERE user_id = ? AND date = ?')
  return _getUsageStmt
}
function upsertUsageStmt() {
  if (!_upsertUsageStmt) _upsertUsageStmt = getDb().prepare(
    `INSERT INTO gpt_usage (user_id, date, count)
     VALUES (?, ?, 1)
     ON CONFLICT (user_id, date)
     DO UPDATE SET count = count + 1
     WHERE count < ?`
  )
  return _upsertUsageStmt
}
function releaseUsageStmt() {
  if (!_releaseUsageStmt) _releaseUsageStmt = getDb().prepare(
    'UPDATE gpt_usage SET count = MAX(0, count - 1) WHERE user_id = ? AND date = ?'
  )
  return _releaseUsageStmt
}

/** Returns today's date in YYYY-MM-DD format (UTC). */
function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

function nextMidnightUTC(): number {
  const d = new Date()
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)
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

/**
 * Invalidate the in-memory rate limit cache entry for a user.
 * Called by the Stripe webhook handler after a tier elevation is written to the DB.
 * The next GPT call from this user will re-read their tier from the DB and start
 * a fresh in-memory entry at the new limit.
 * Safe to call multiple times — Map.delete is idempotent (spec §56).
 */
export function invalidateUserRateLimit(userId: number): void {
  authenticated.delete(userId)
}

export function gptRateLimit(req: Request, res: Response, next: NextFunction): void {
  // Localhost bypass — dev/test only. Gated behind NODE_ENV so that staging/production
  // behave identically to real users. Without this gate, X-Forwarded-For: 127.0.0.1
  // could bypass all limits in production (spec §12).
  if (process.env.NODE_ENV !== 'production' && LOCALHOST.has(req.ip ?? '')) {
    next()
    return
  }

  const userId = extractUserId(req)

  if (userId !== null) {
    // Expose userId to downstream route handlers (e.g. cosmic-pattern gate in gpt.ts)
    res.locals.userId = userId

    const now = Date.now()
    const today = todayUTC()
    let entry = authenticated.get(userId)

    if (!entry || now >= entry.resetAt) {
      // Entry missing or stale — do one synchronous DB read to get tier and
      // restore the current day's count after a server restart (spec §7, §8).
      // This DB read happens only once per user per day; subsequent calls use the cache.
      let tier: Tier = 'free'
      try {
        const row = getTierStmt().get(userId) as { subscription_tier: string } | undefined
        // Unrecognized tier values fall back to 'free' as a safety measure (spec §55).
        const raw = row?.subscription_tier ?? 'free'
        tier = (raw === 'free' || raw === 'basic' || raw === 'advanced') ? raw as Tier : 'free'
      } catch (err) {
        console.error('[gptRateLimit] Failed to read subscription_tier from DB — defaulting to free:', err)
      }

      let currentCount = 0
      try {
        const usageRow = getUsageStmt().get(userId, today) as { count: number } | undefined
        currentCount = usageRow?.count ?? 0
      } catch (err) {
        console.error('[gptRateLimit] Failed to read gpt_usage from DB — defaulting to 0:', err)
      }

      const resetAt = nextMidnightUTC()
      entry = { count: currentCount, resetAt, tier }
      authenticated.set(userId, entry)
    }

    const limit = TIER_LIMITS[entry.tier] ?? 3

    // Atomic DB increment — the WHERE count < limit clause makes the update a no-op
    // if the limit is already reached, enforcing the limit at the DB level (spec §9).
    // If the DB query itself fails, fail open (allow the call) to avoid blocking paying
    // users. A failed quota check that allows an extra call is better than one that
    // blocks a paying user (spec §53).
    let dbChanges = 1
    try {
      const result = upsertUsageStmt().run(userId, today, limit) as { changes: number }
      dbChanges = result.changes
    } catch (err) {
      console.error('[gptRateLimit] DB upsert for gpt_usage failed — failing open:', err)
    }

    if (dbChanges === 0) {
      // DB-level limit reached (atomically enforced via WHERE count < limit)
      res.status(429).json({
        error: 'rate_limit_exceeded',
        resetAt: new Date(entry.resetAt).toISOString(),
        limit,
        used: entry.count,
        tier: entry.tier,
        authenticated: true,
      })
      return
    }

    // Sync in-memory counter with DB
    entry.count++

    // Attach releaseSlot for downstream error handlers to call on OpenAI 5xx failures.
    // Captured as a closure over the current entry and today's date string (spec §10).
    const capturedEntry = entry
    const capturedToday = today
    res.locals.releaseSlot = () => {
      // Decrement in-memory entry
      if (capturedEntry.count > 0) capturedEntry.count--
      // Decrement DB row — MAX(0, count - 1) prevents negative counts (spec §10)
      try {
        releaseUsageStmt().run(userId, capturedToday)
      } catch (err) {
        console.error('[gptRateLimit] DB decrement for gpt_usage failed:', err)
      }
    }
  } else {
    // Per-IP limiting for unauthenticated users.
    // Known limitation: shared IP environments (corporate NAT, university WiFi) will
    // share the free quota. Session-based limiting is more equitable but adds state
    // management complexity. v1 uses per-IP; revisit if abuse patterns emerge.
    const ip = req.ip ?? 'unknown'
    const now = Date.now()
    let entry = unauthenticated.get(ip)

    if (!entry || now >= entry.resetAt) {
      const resetAt = nextMidnightUTC()
      entry = { count: 0, resetAt, tier: 'free' }
      unauthenticated.set(ip, entry)
    }

    const limit = TIER_LIMITS.free

    if (entry.count >= limit) {
      res.status(429).json({
        error: 'rate_limit_exceeded',
        resetAt: new Date(entry.resetAt).toISOString(),
        limit,
        used: entry.count,
        tier: 'free',
        authenticated: false,
      })
      return
    }

    entry.count++
  }

  next()
}
