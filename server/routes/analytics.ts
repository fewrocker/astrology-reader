import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';
import type { TokenPayload } from '../middleware/auth.js';

const router = Router();

/**
 * Canonical conversion funnel event list.
 * Order is intentional: it represents the user journey from first page view
 * through upgrade checkout. Each event name in this array will appear as a
 * key in the /funnel response even if its count is zero.
 */
const FUNNEL_EVENTS = [
  'page_view',
  'form_started',
  'form_completed',
  'gpt_request_made',
  'gpt_limit_hit',
  'upgrade_modal_seen',
  'upgrade_cta_clicked',
  'upgrade_checkout_started',
  'upgrade_checkout_failed',
  'upgrade_dismissed',
  'auth_modal_seen',
  'auth_nudge_seen',
  'auth_nudge_clicked',
  'auth_modal_dismissed',
  'auth_tab_switched',
  'signup_completed',
  'login_completed',
] as const;

/**
 * GET /api/analytics/funnel
 *
 * Admin endpoint that returns aggregate event counts for the conversion funnel
 * over a configurable date range. Requires the x-analytics-secret header to
 * match the ANALYTICS_ADMIN_SECRET environment variable.
 *
 * Query params:
 *   from  — ISO-8601 date (YYYY-MM-DD), defaults to 7 days ago UTC
 *   to    — ISO-8601 date (YYYY-MM-DD), defaults to today UTC
 *
 * Response: { from, to, counts: { event_name: count, ... } }
 *
 * Limitation: returns aggregate counts only. Per-user or per-session funnel
 * correlation (e.g. "fraction of users who saw upgrade_modal_seen and also
 * had signup_completed") requires a future by=session or by=user mode.
 * The session_id cookie persists across Stripe redirects and can be used to
 * stitch anonymous pre-auth events to post-auth events when needed.
 */
router.get('/funnel', (req: Request, res: Response): void => {
  // Guard: env var must be present and non-empty. Return 503 (not 401/403)
  // to distinguish "endpoint not configured" from "wrong secret" — prevents
  // silent fail-open behavior when the var is absent from a deployment.
  const adminSecret = process.env.ANALYTICS_ADMIN_SECRET;
  if (!adminSecret) {
    res.status(503).json({ error: 'endpoint_not_configured' });
    return;
  }

  const providedSecret = req.headers['x-analytics-secret'];
  if (providedSecret !== adminSecret) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }

  // Parse optional from/to query params; default to last 7 days UTC.
  const now = new Date();
  const defaultTo = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const defaultFrom = sevenDaysAgo.toISOString().slice(0, 10);

  const fromDate = typeof req.query.from === 'string' && req.query.from ? req.query.from : defaultFrom;
  const toDate = typeof req.query.to === 'string' && req.query.to ? req.query.to : defaultTo;

  // Inclusive bounds: from 00:00:00 to 23:59:59 of the to date.
  const fromTs = `${fromDate}T00:00:00`;
  const toTs = `${toDate}T23:59:59`;

  try {
    const db = getDb();
    // Per-event loop rather than GROUP BY for clarity and extensibility.
    // The idx_events_event_created composite index covers this query pattern exactly.
    const stmt = db.prepare(
      'SELECT COUNT(*) as n FROM events WHERE event = ? AND created_at >= ? AND created_at <= ?'
    );

    const counts: Record<string, number> = {};
    for (const eventName of FUNNEL_EVENTS) {
      const row = stmt.get(eventName, fromTs, toTs) as { n: number };
      counts[eventName] = row.n;
    }

    res.json({ from: fromDate, to: toDate, counts });
  } catch (err) {
    console.error('[analytics/funnel] query failed:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

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
