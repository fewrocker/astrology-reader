import { Router } from 'express'
import type { Request, Response } from 'express'
import { gptRateLimit } from '../middleware/gptRateLimit.js'
import { handleGptRequest } from '../services/gpt.js'
import { getDb } from '../db.js'

const router = Router()

router.post('/interpret', gptRateLimit, async (req: Request, res: Response) => {
  const { type, payload } = req.body as { type?: string; payload?: Record<string, unknown> }

  if (typeof type !== 'string' || !type) {
    res.status(400).json({ error: 'Missing or invalid "type" field' })
    return
  }
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    res.status(400).json({ error: 'Missing or invalid "payload" field' })
    return
  }

  // Feature gate: cosmic-pattern-reading is an advanced-tier feature only (spec §16).
  // This check runs after gptRateLimit has already incremented the counter.
  // If the user lacks the required tier, we release the slot before returning 403.
  if (type === 'cosmic-pattern-reading') {
    const userId = res.locals.userId
    if (!userId) {
      res.locals.releaseSlot?.()
      res.status(401).json({ error: 'authentication_required' })
      return
    }
    const row = getDb()
      .prepare('SELECT subscription_tier FROM users WHERE id = ?')
      .get(userId) as { subscription_tier: string } | undefined
    if (row?.subscription_tier !== 'advanced') {
      res.locals.releaseSlot?.()
      res.status(403).json({ error: 'advanced_tier_required', feature: 'cosmic-pattern-reading' })
      return
    }
  }

  try {
    const result = await handleGptRequest(type, payload)
    res.json({ result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal_error'
    if (message === 'gpt_unavailable') {
      // OpenAI 5xx — release the slot so the user's quota is not consumed (spec §17)
      res.locals.releaseSlot?.()
      res.status(503).json({ error: 'gpt_unavailable' })
      return
    }
    // 4xx errors (malformed request, unknown type) — do NOT release slot;
    // the user consumed a legitimate call attempt (spec §17)
    if (message.startsWith('Unknown GPT type:')) {
      res.status(400).json({ error: message })
      return
    }
    // Unexpected 5xx — release slot (infrastructure error, not user fault)
    console.error('[GPT route]', err)
    res.locals.releaseSlot?.()
    res.status(500).json({ error: 'internal_error' })
  }
})

export default router
