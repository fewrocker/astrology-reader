import { Router, Request, Response } from 'express';
import { getDb } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

interface UserRow {
  id: number;
  email: string;
  full_name: string | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string | null;
  created_at: string;
}

const router = Router();

router.use(requireAuth);

router.get('/', (req: Request, res: Response): void => {
  const { userId } = req as AuthenticatedRequest;
  const db = getDb();

  const user = db
    .prepare(
      'SELECT id, email, full_name, birth_date, birth_time, birth_place, created_at FROM users WHERE id = ?'
    )
    .get(userId) as UserRow | undefined;

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    birthDate: user.birth_date,
    birthTime: user.birth_time,
    birthPlace: user.birth_place ? JSON.parse(user.birth_place) : null,
    createdAt: user.created_at,
  });
});

router.put('/', (req: Request, res: Response): void => {
  const { userId } = req as AuthenticatedRequest;
  const { fullName, birthDate, birthTime, birthPlace } = req.body as {
    fullName?: string | null;
    birthDate?: string | null;
    birthTime?: string | null;
    birthPlace?: unknown | null;
  };

  const db = getDb();

  db.prepare(
    `UPDATE users SET
       full_name   = COALESCE(?, full_name),
       birth_date  = COALESCE(?, birth_date),
       birth_time  = COALESCE(?, birth_time),
       birth_place = COALESCE(?, birth_place)
     WHERE id = ?`
  ).run(
    fullName ?? null,
    birthDate ?? null,
    birthTime ?? null,
    birthPlace !== undefined && birthPlace !== null ? JSON.stringify(birthPlace) : null,
    userId
  );

  const user = db
    .prepare(
      'SELECT id, email, full_name, birth_date, birth_time, birth_place, created_at FROM users WHERE id = ?'
    )
    .get(userId) as UserRow;

  res.json({
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    birthDate: user.birth_date,
    birthTime: user.birth_time,
    birthPlace: user.birth_place ? JSON.parse(user.birth_place) : null,
    createdAt: user.created_at,
  });
});

export default router;
