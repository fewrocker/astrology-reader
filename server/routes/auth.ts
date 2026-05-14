import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';
import { requireAuth, AuthenticatedRequest, TokenPayload } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  full_name: string | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string | null;
  created_at: string;
  subscription_tier: string;
  stripe_customer_id: string | null;
}

const TIER_LIMITS: Record<string, number> = { free: 3, basic: 20, advanced: 100 };

const router = Router();

function signToken(userId: number): string {
  const secret = process.env.JWT_SECRET!;
  const payload: TokenPayload = { userId };
  return jwt.sign(payload, secret, { expiresIn: '30d' });
}

function safeUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    birthDate: user.birth_date,
    birthTime: user.birth_time,
    // Existing rows that pre-date the migration have subscription_tier = null in SQLite
    // (SQLite does not backfill existing rows when adding a column with DEFAULT).
    // The ?? 'free' guard makes this safe (spec §21).
    subscriptionTier: (user.subscription_tier ?? 'free') as 'free' | 'basic' | 'advanced',
    birthPlace: user.birth_place ? JSON.parse(user.birth_place) : null,
    createdAt: user.created_at,
  };
}

const SELECT_USER_COLS = 'id, email, password_hash, full_name, birth_date, birth_time, birth_place, created_at, subscription_tier, stripe_customer_id';

router.post('/register', authRateLimiter, (req: Request, res: Response): void => {
  const { email, password, fullName } = req.body as {
    email?: string;
    password?: string;
    fullName?: string;
  };

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({ error: 'Valid email is required' });
    return;
  }

  if (!password || typeof password !== 'string' || password.length < 12 || password.length > 1024) {
    res.status(400).json({ error: 'Password must be between 12 and 1024 characters' });
    return;
  }

  const db = getDb();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const passwordHash = bcrypt.hashSync(password, 12);

  const result = db
    .prepare(
      'INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)'
    )
    .run(email.trim().toLowerCase(), passwordHash, fullName ?? null);

  const userId = result.lastInsertRowid as number;
  const user = db.prepare(`SELECT ${SELECT_USER_COLS} FROM users WHERE id = ?`).get(userId) as UserRow;

  res.status(201).json({ token: signToken(userId), user: safeUser(user) });
});

router.post('/login', authRateLimiter, (req: Request, res: Response): void => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const db = getDb();
  const user = db
    .prepare(`SELECT ${SELECT_USER_COLS} FROM users WHERE email = ?`)
    .get(email.trim().toLowerCase()) as UserRow | undefined;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  res.json({ token: signToken(user.id), user: safeUser(user) });
});

router.post('/logout', (_req: Request, res: Response): void => {
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req: Request, res: Response): void => {
  const { userId } = req as AuthenticatedRequest;
  const db = getDb();
  const user = db.prepare(`SELECT ${SELECT_USER_COLS} FROM users WHERE id = ?`).get(userId) as UserRow | undefined;

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({ user: safeUser(user) });
});

/**
 * GET /api/auth/usage — returns today's GPT usage count and tier limit.
 * Used by AuthContext to populate todayUsed and drive tier-aware UI nudges.
 */
router.get('/usage', requireAuth, (req: Request, res: Response): void => {
  const { userId } = req as AuthenticatedRequest;
  const today = new Date().toISOString().slice(0, 10);
  const db = getDb();

  const userRow = db.prepare('SELECT subscription_tier FROM users WHERE id = ?').get(userId) as { subscription_tier: string } | undefined;
  const tier = (userRow?.subscription_tier ?? 'free') as 'free' | 'basic' | 'advanced';
  const limit = TIER_LIMITS[tier] ?? 3;

  const usageRow = db.prepare('SELECT count FROM gpt_usage WHERE user_id = ? AND date = ?').get(userId, today) as { count: number } | undefined;
  const todayUsed = usageRow?.count ?? 0;

  // resetAt = next midnight UTC
  const d = new Date();
  const resetAt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)).toISOString();

  res.json({ todayUsed, limit, tier, resetAt });
});

export default router;
