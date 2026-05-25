import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getDb } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { writeRateLimiter } from '../middleware/rateLimiter.js';

interface ReadingRow {
  id: string;
  user_id: number;
  reading_type: string;
  spread_mode: string | null;
  first_card_name: string;
  intent_preview: string | null;
  cards: string;
  synthesis: string | null;
  schema_version: number;
  journal_entry_id: string | null;
  created_at: string;
}

const router = Router();
router.use(requireAuth);

function getSubscriptionTier(userId: number): string {
  const row = getDb()
    .prepare('SELECT subscription_tier FROM users WHERE id = ?')
    .get(userId) as { subscription_tier: string } | undefined;
  return row?.subscription_tier ?? 'free';
}

// POST /api/readings — save a reading
router.post('/', writeRateLimiter, (req: Request, res: Response): void => {
  const { userId } = req as AuthenticatedRequest;

  if (getSubscriptionTier(userId) !== 'advanced') {
    res.status(403).json({ error: 'subscription_required', feature: 'saved_readings' });
    return;
  }

  const { readingType, spreadMode, firstCardName, intentPreview, cards, synthesis } = req.body as {
    readingType?: string;
    spreadMode?: string | null;
    firstCardName?: string;
    intentPreview?: string | null;
    cards?: unknown[];
    synthesis?: unknown;
  };

  if (!readingType || !['single', 'three-card', 'celtic-cross'].includes(readingType)) {
    res.status(400).json({ error: 'readingType must be single, three-card, or celtic-cross' });
    return;
  }
  if (!firstCardName || typeof firstCardName !== 'string') {
    res.status(400).json({ error: 'firstCardName is required' });
    return;
  }
  if (!Array.isArray(cards) || cards.length === 0) {
    res.status(400).json({ error: 'cards must be a non-empty array' });
    return;
  }
  if ((readingType === 'three-card' || readingType === 'celtic-cross') && !spreadMode) {
    res.status(400).json({ error: 'spreadMode is required for three-card and celtic-cross readings' });
    return;
  }

  const id = crypto.randomUUID();
  const db = getDb();

  db.prepare(`
    INSERT OR IGNORE INTO readings
      (id, user_id, reading_type, spread_mode, first_card_name, intent_preview, cards, synthesis, schema_version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    id,
    userId,
    readingType,
    spreadMode ?? null,
    firstCardName,
    intentPreview ?? null,
    JSON.stringify(cards),
    synthesis !== undefined ? JSON.stringify(synthesis) : null
  );

  const row = db.prepare('SELECT created_at FROM readings WHERE id = ?').get(id) as Pick<ReadingRow, 'created_at'> | undefined;
  res.status(201).json({ id, createdAt: row?.created_at ?? new Date().toISOString() });
});

// GET /api/readings — list slim objects
router.get('/', (req: Request, res: Response): void => {
  const { userId } = req as AuthenticatedRequest;

  if (getSubscriptionTier(userId) !== 'advanced') {
    res.status(403).json({ error: 'subscription_required', feature: 'saved_readings' });
    return;
  }

  const limit = Math.min(parseInt((req.query.limit as string) ?? '50', 10) || 50, 100);
  const offset = Math.max(parseInt((req.query.offset as string) ?? '0', 10) || 0, 0);

  const db = getDb();

  const rows = db.prepare(`
    SELECT id, reading_type, spread_mode, first_card_name, intent_preview, created_at
    FROM readings
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, limit, offset) as Pick<ReadingRow, 'id' | 'reading_type' | 'spread_mode' | 'first_card_name' | 'intent_preview' | 'created_at'>[];

  const { count } = db.prepare(
    'SELECT COUNT(*) as count FROM readings WHERE user_id = ?'
  ).get(userId) as { count: number };

  res.json({
    items: rows.map(r => ({
      id: r.id,
      readingType: r.reading_type,
      spreadMode: r.spread_mode,
      firstCardName: r.first_card_name,
      intentPreview: r.intent_preview,
      createdAt: r.created_at,
    })),
    total: count,
    limit,
    offset,
  });
});

// GET /api/readings/:id — full reading
router.get('/:id', (req: Request, res: Response): void => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;

  if (getSubscriptionTier(userId) !== 'advanced') {
    res.status(403).json({ error: 'subscription_required', feature: 'saved_readings' });
    return;
  }

  const row = getDb()
    .prepare('SELECT * FROM readings WHERE id = ? AND user_id = ?')
    .get(id, userId) as ReadingRow | undefined;

  if (!row) {
    res.status(404).json({ error: 'Reading not found' });
    return;
  }

  res.json({
    id: row.id,
    readingType: row.reading_type,
    spreadMode: row.spread_mode,
    firstCardName: row.first_card_name,
    intentPreview: row.intent_preview,
    cards: JSON.parse(row.cards),
    synthesis: row.synthesis ? JSON.parse(row.synthesis) : null,
    schemaVersion: row.schema_version,
    journalEntryId: row.journal_entry_id,
    createdAt: row.created_at,
  });
});

// DELETE /api/readings/:id — hard delete
router.delete('/:id', writeRateLimiter, (req: Request, res: Response): void => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;

  const db = getDb();

  const row = db.prepare(
    'SELECT id, user_id FROM readings WHERE id = ?'
  ).get(id) as Pick<ReadingRow, 'id' | 'user_id'> | undefined;

  if (!row) {
    res.status(404).json({ error: 'Reading not found' });
    return;
  }
  if (row.user_id !== userId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  db.prepare('DELETE FROM readings WHERE id = ?').run(id);
  res.json({ ok: true });
});

export default router;
