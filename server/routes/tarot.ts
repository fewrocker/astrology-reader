import { Router, Request, Response } from 'express'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js'
import {
  checkDailyCardLimit,
  checkWeeklyThreeCardLimit,
  checkCelticCrossAccess,
  getUserTier,
  currentWeekStartUTC,
  nextMidnightUTC,
  nextMondayMidnightUTC,
  TAROT_FREE_DAILY_CARD_LIMIT,
  TAROT_FREE_WEEKLY_THREE_CARD_LIMIT,
} from '../middleware/tarotGate.js'
import { getDb } from '../db.js'

const router = Router()

/**
 * POST /api/tarot/check-limit
 * Checks and increments a tarot usage counter.
 * Returns { allowed, remaining } — if allowed is false, the ritual must not begin.
 */
router.post('/check-limit', requireAuth, (req: Request, res: Response): void => {
  const { userId } = req as AuthenticatedRequest
  const { limitType } = req.body as { limitType?: string }

  if (limitType === 'daily-card') {
    const result = checkDailyCardLimit(userId)
    if (!result.allowed) {
      res.status(429).json({
        error: 'tarot_daily_card_limit',
        gate: 'daily_card',
        allowed: false,
        remaining: result.remaining,
        resetAt: result.resetAt,
      })
      return
    }
    res.json({ allowed: true, remaining: result.remaining, resetAt: result.resetAt })
    return
  }

  if (limitType === 'weekly-three-card') {
    const result = checkWeeklyThreeCardLimit(userId)
    if (!result.allowed) {
      res.status(429).json({
        error: 'tarot_weekly_three_card_limit',
        gate: 'weekly_three_card',
        allowed: false,
        remaining: result.remaining,
        resetAt: result.resetAt,
      })
      return
    }
    res.json({ allowed: true, remaining: result.remaining, resetAt: result.resetAt })
    return
  }

  res.status(400).json({ error: 'invalid_limit_type', message: 'limitType must be daily-card or weekly-three-card' })
})

/**
 * GET /api/tarot/usage
 * Returns the current user's tarot usage status for client-side soft checks.
 * Read-only — does not increment any counters.
 */
router.get('/usage', requireAuth, (req: Request, res: Response): void => {
  const { userId } = req as AuthenticatedRequest
  const db = getDb()

  const tier = getUserTier(userId)
  const today = new Date().toISOString().slice(0, 10)
  const weekStart = currentWeekStartUTC()

  const dailyRow = db
    .prepare('SELECT daily_cards FROM tarot_usage WHERE user_id = ? AND date = ?')
    .get(userId, today) as { daily_cards: number } | undefined
  const dailyCardDrawsUsed = dailyRow?.daily_cards ?? 0

  const weeklyRow = db
    .prepare('SELECT COALESCE(SUM(weekly_three_card), 0) AS total FROM tarot_usage WHERE user_id = ? AND week_start = ?')
    .get(userId, weekStart) as { total: number } | undefined
  const weeklyThreeCardUsed = weeklyRow?.total ?? 0

  const isAdvanced = tier !== 'free'

  res.json({
    dailyCardDrawsUsed,
    dailyCardDrawsLimit: isAdvanced ? null : TAROT_FREE_DAILY_CARD_LIMIT,
    weeklyThreeCardUsed,
    weeklyThreeCardLimit: isAdvanced ? null : TAROT_FREE_WEEKLY_THREE_CARD_LIMIT,
    celticCrossEnabled: checkCelticCrossAccess(tier),
    savedReadingsEnabled: isAdvanced,
    tier: isAdvanced ? 'advanced' : 'free',
    dailyResetAt: nextMidnightUTC(),
    weeklyResetAt: nextMondayMidnightUTC(),
  })
})

export default router
