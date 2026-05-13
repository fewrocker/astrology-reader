import { Router } from 'express'
import type { Request, Response } from 'express'
import { gptRateLimit } from '../middleware/gptRateLimit.js'
import { handleGptRequest } from '../services/gpt.js'

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

  try {
    const result = await handleGptRequest(type, payload)
    res.json({ result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal_error'
    if (message === 'gpt_unavailable') {
      res.status(503).json({ error: 'gpt_unavailable' })
      return
    }
    if (message.startsWith('Unknown GPT type:')) {
      res.status(400).json({ error: message })
      return
    }
    console.error('[GPT route]', err)
    res.status(500).json({ error: 'internal_error' })
  }
})

export default router
