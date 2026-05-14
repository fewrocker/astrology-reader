import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';
import type { TokenPayload } from '../middleware/auth.js';

const router = Router();

router.post('/event', (req: Request, res: Response): void => {
  const sessionId = req.cookies?.session_id as string | undefined;
  if (!sessionId) {
    // Should not happen if session middleware is correctly ordered, but guard anyway
    res.status(200).json({ ok: true });
    return;
  }

  const { event, properties } = req.body as { event?: unknown; properties?: unknown };

  if (typeof event !== 'string' || !event || event.length > 64) {
    res.status(400).json({ error: 'invalid_event' });
    return;
  }

  const propsJson =
    properties && typeof properties === 'object' && !Array.isArray(properties)
      ? JSON.stringify(properties)
      : null;

  // Best-effort user ID resolution from JWT
  let userId: number | null = null;
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const secret = process.env.JWT_SECRET;
      if (secret) {
        const payload = jwt.verify(token, secret) as TokenPayload;
        if (payload?.userId) userId = payload.userId;
      }
    }
  } catch { /* not authenticated — userId stays null */ }

  try {
    const db = getDb();
    db.prepare(
      'INSERT INTO events (session_id, user_id, event, properties) VALUES (?, ?, ?, ?)'
    ).run(sessionId, userId, event, propsJson);
  } catch (err) {
    console.error('[analytics] insert failed:', err);
    // Do not propagate to client
  }

  res.json({ ok: true });
});

export default router;
