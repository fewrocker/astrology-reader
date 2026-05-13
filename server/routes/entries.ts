import { Router, Request, Response } from 'express';
import { getDb } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

interface EntryRow {
  id: string;
  user_id: number;
  kind: string;
  date: string;
  body: string;
  metadata: string | null;
  created_at: string;
}

const router = Router();

router.use(requireAuth);

router.get('/', (req: Request, res: Response): void => {
  const { userId } = req as AuthenticatedRequest;
  const { kind } = req.query as { kind?: string };

  const db = getDb();

  let rows: EntryRow[];
  if (kind === 'journal' || kind === 'dream') {
    rows = db
      .prepare(
        'SELECT * FROM entries WHERE user_id = ? AND kind = ? ORDER BY date DESC'
      )
      .all(userId, kind) as EntryRow[];
  } else {
    rows = db
      .prepare('SELECT * FROM entries WHERE user_id = ? ORDER BY date DESC')
      .all(userId) as EntryRow[];
  }

  res.json(
    rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      date: r.date,
      body: r.body,
      metadata: r.metadata ? JSON.parse(r.metadata) : null,
      createdAt: r.created_at,
    }))
  );
});

router.post('/', (req: Request, res: Response): void => {
  const { userId } = req as AuthenticatedRequest;
  const { id, kind, date, body, metadata } = req.body as {
    id?: string;
    kind?: string;
    date?: string;
    body?: string;
    metadata?: unknown;
  };

  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'id is required' });
    return;
  }
  if (!kind || (kind !== 'journal' && kind !== 'dream')) {
    res.status(400).json({ error: 'kind must be "journal" or "dream"' });
    return;
  }
  if (!date || typeof date !== 'string') {
    res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });
    return;
  }

  const db = getDb();

  db.prepare(
    `INSERT OR IGNORE INTO entries (id, user_id, kind, date, body, metadata)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    userId,
    kind,
    date,
    body ?? '',
    metadata !== undefined ? JSON.stringify(metadata) : null
  );

  const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(id) as EntryRow;

  res.status(201).json({
    id: entry.id,
    kind: entry.kind,
    date: entry.date,
    body: entry.body,
    metadata: entry.metadata ? JSON.parse(entry.metadata) : null,
    createdAt: entry.created_at,
  });
});

router.delete('/:id', (req: Request, res: Response): void => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;

  const db = getDb();

  const entry = db
    .prepare('SELECT id, user_id FROM entries WHERE id = ?')
    .get(id) as Pick<EntryRow, 'id' | 'user_id'> | undefined;

  if (!entry) {
    res.status(404).json({ error: 'Entry not found' });
    return;
  }

  if (entry.user_id !== userId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  db.prepare('DELETE FROM entries WHERE id = ?').run(id);
  res.json({ ok: true });
});

export default router;
