import { getDb } from '../db.js'

type Tier = 'free' | 'basic' | 'advanced'

const TAROT_FREE_DAILY_CARD_LIMIT =
  process.env.NODE_ENV === 'production'
    ? parseInt(process.env.TAROT_FREE_DAILY_CARD_LIMIT ?? '1', 10)
    : parseInt(process.env.TAROT_FREE_DAILY_CARD_LIMIT ?? '10000', 10)

const TAROT_FREE_WEEKLY_THREE_CARD_LIMIT =
  process.env.NODE_ENV === 'production'
    ? parseInt(process.env.TAROT_FREE_WEEKLY_THREE_CARD_LIMIT ?? '1', 10)
    : parseInt(process.env.TAROT_FREE_WEEKLY_THREE_CARD_LIMIT ?? '10000', 10)

// Prepared statements cached at module level, lazy-initialized after DB is ready.
let _getTierStmt: ReturnType<ReturnType<typeof getDb>['prepare']> | null = null
let _getDailyStmt: ReturnType<ReturnType<typeof getDb>['prepare']> | null = null
let _getWeeklyStmt: ReturnType<ReturnType<typeof getDb>['prepare']> | null = null
let _upsertDailyStmt: ReturnType<ReturnType<typeof getDb>['prepare']> | null = null
let _upsertWeeklyStmt: ReturnType<ReturnType<typeof getDb>['prepare']> | null = null

function getTierStmt() {
  if (!_getTierStmt) _getTierStmt = getDb().prepare('SELECT subscription_tier FROM users WHERE id = ?')
  return _getTierStmt
}

function getDailyStmt() {
  if (!_getDailyStmt) _getDailyStmt = getDb().prepare(
    'SELECT daily_cards FROM tarot_usage WHERE user_id = ? AND date = ?'
  )
  return _getDailyStmt
}

function getWeeklyStmt() {
  if (!_getWeeklyStmt) _getWeeklyStmt = getDb().prepare(
    'SELECT COALESCE(SUM(weekly_three_card), 0) AS total FROM tarot_usage WHERE user_id = ? AND week_start = ?'
  )
  return _getWeeklyStmt
}

function upsertDailyStmt() {
  if (!_upsertDailyStmt) _upsertDailyStmt = getDb().prepare(`
    INSERT INTO tarot_usage (user_id, date, week_start, daily_cards, weekly_three_card)
    VALUES (?, ?, ?, 1, 0)
    ON CONFLICT (user_id, date)
    DO UPDATE SET daily_cards = daily_cards + 1
    WHERE daily_cards < ?
  `)
  return _upsertDailyStmt
}

function upsertWeeklyIncrementStmt() {
  if (!_upsertWeeklyStmt) _upsertWeeklyStmt = getDb().prepare(`
    INSERT INTO tarot_usage (user_id, date, week_start, daily_cards, weekly_three_card)
    VALUES (?, ?, ?, 0, 1)
    ON CONFLICT (user_id, date)
    DO UPDATE SET weekly_three_card = weekly_three_card + 1
  `)
  return _upsertWeeklyStmt
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

function currentWeekStartUTC(): string {
  const d = new Date()
  const day = d.getUTCDay() // 0=Sunday, 1=Monday ... 6=Saturday
  const daysToMonday = day === 0 ? 6 : day - 1
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - daysToMonday))
  return monday.toISOString().slice(0, 10)
}

function nextMidnightUTC(): string {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)).toISOString()
}

function nextMondayMidnightUTC(): string {
  const weekStart = currentWeekStartUTC()
  const [y, m, day] = weekStart.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, day + 7)).toISOString()
}

function getUserTier(userId: number): Tier {
  try {
    const row = getTierStmt().get(userId) as { subscription_tier: string } | undefined
    const raw = row?.subscription_tier ?? 'free'
    return (raw === 'free' || raw === 'basic' || raw === 'advanced') ? raw as Tier : 'free'
  } catch (err) {
    console.error('[tarotGate] Failed to read subscription_tier — defaulting to free:', err)
    return 'free'
  }
}

export interface TarotGateResult {
  allowed: boolean
  remaining: number
  resetAt: string
}

/**
 * Check if user may draw a single daily card. Increments counter if allowed.
 * Free tier: 1 draw/day. Advanced/basic: unlimited.
 */
export function checkDailyCardLimit(userId: number): TarotGateResult {
  const tier = getUserTier(userId)
  const resetAt = nextMidnightUTC()

  if (tier !== 'free') {
    return { allowed: true, remaining: Infinity, resetAt }
  }

  const limit = TAROT_FREE_DAILY_CARD_LIMIT
  const today = todayUTC()
  const weekStart = currentWeekStartUTC()

  let dbChanges = 1
  try {
    const result = upsertDailyStmt().run([userId, today, weekStart, limit]) as { changes: number }
    dbChanges = result.changes
  } catch (err) {
    console.error('[tarotGate] DB upsert for daily_cards failed — failing open:', err)
    return { allowed: true, remaining: 1, resetAt }
  }

  if (dbChanges === 0) {
    const row = getDailyStmt().get([userId, today]) as { daily_cards: number } | undefined
    const used = row?.daily_cards ?? limit
    return { allowed: false, remaining: Math.max(0, limit - used), resetAt }
  }

  const row = getDailyStmt().get([userId, today]) as { daily_cards: number } | undefined
  const used = row?.daily_cards ?? 1
  return { allowed: true, remaining: Math.max(0, limit - used), resetAt }
}

/**
 * Check if user may draw a three-card reading this week. Increments counter if allowed.
 * Free tier: 1 draw/week (aggregated across all days of the ISO week). Advanced/basic: unlimited.
 */
export function checkWeeklyThreeCardLimit(userId: number): TarotGateResult {
  const tier = getUserTier(userId)
  const weekStart = currentWeekStartUTC()
  const resetAt = nextMondayMidnightUTC()

  if (tier !== 'free') {
    return { allowed: true, remaining: Infinity, resetAt }
  }

  const limit = TAROT_FREE_WEEKLY_THREE_CARD_LIMIT

  // Check current weekly aggregate across all rows sharing this week_start.
  // SQLite is single-writer so the read-then-write is safe without a transaction.
  const weekRow = getWeeklyStmt().get([userId, weekStart]) as { total: number } | undefined
  const currentTotal = weekRow?.total ?? 0

  if (currentTotal >= limit) {
    return { allowed: false, remaining: 0, resetAt }
  }

  // Allowed — increment today's row (or create it)
  try {
    upsertWeeklyIncrementStmt().run([userId, todayUTC(), weekStart])
  } catch (err) {
    console.error('[tarotGate] DB upsert for weekly_three_card failed — failing open:', err)
  }

  return { allowed: true, remaining: Math.max(0, limit - currentTotal - 1), resetAt }
}

/**
 * Check if user may access Celtic Cross (Advanced-only entitlement gate, no counter).
 */
export function checkCelticCrossAccess(userTier: string): boolean {
  return userTier === 'advanced' || userTier === 'basic'
}

// Exported helpers for the usage endpoint
export { currentWeekStartUTC, nextMidnightUTC, nextMondayMidnightUTC, getUserTier, TAROT_FREE_DAILY_CARD_LIMIT, TAROT_FREE_WEEKLY_THREE_CARD_LIMIT }
