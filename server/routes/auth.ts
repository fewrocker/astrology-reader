import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';
import { requireAuth, AuthenticatedRequest, TokenPayload } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { invalidateUserRateLimit } from '../middleware/gptRateLimit.js';
import stripeClient, { getTierFromPriceId } from '../services/stripe.js';

export interface UserRow {
  id: number;
  email: string;
  password_hash: string | null;
  oauth_provider: string | null;
  oauth_subject: string | null;
  full_name: string | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string | null;
  created_at: string;
  subscription_tier: string | null;
  stripe_customer_id: string | null;
}

const router = Router();

export function signToken(userId: number): string {
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
    birthPlace: user.birth_place ? JSON.parse(user.birth_place) : null,
    createdAt: user.created_at,
    subscriptionTier: (user.subscription_tier ?? 'free') as 'free' | 'basic' | 'advanced',
    // stripe_customer_id is intentionally NOT exposed to the client
  };
}

const USER_SELECT = 'SELECT id, email, password_hash, full_name, birth_date, birth_time, birth_place, created_at, subscription_tier, stripe_customer_id FROM users';

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
  const user = db.prepare(`${USER_SELECT} WHERE id = ?`).get(userId) as UserRow;

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
    .prepare(`${USER_SELECT} WHERE email = ?`)
    .get(email.trim().toLowerCase()) as UserRow | undefined;

  if (!user || !user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  res.json({ token: signToken(user.id), user: safeUser(user) });
});

router.post('/logout', (_req: Request, res: Response): void => {
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const db = getDb();
  let user = db.prepare(`${USER_SELECT} WHERE id = ?`).get(userId) as UserRow | undefined;

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Stripe reconciliation: if user has a stripe_customer_id but shows free tier,
  // check Stripe for any active subscriptions — catches webhook delivery failures.
  if (user.stripe_customer_id && (user.subscription_tier === 'free' || !user.subscription_tier)) {
    try {
      const subs = await stripeClient.subscriptions.list({
        customer: user.stripe_customer_id,
        status: 'active',
        limit: 1,
      });
      if (subs.data.length > 0) {
        const priceId = subs.data[0].items.data[0]?.price?.id ?? '';
        const tier = getTierFromPriceId(priceId);
        if (tier) {
          db.prepare("UPDATE users SET subscription_tier = ? WHERE id = ? AND subscription_tier != ?")
            .run(tier, user.id, tier);
          user = { ...user, subscription_tier: tier };
          invalidateUserRateLimit(user.id);
        }
      }
    } catch (err) {
      // Non-blocking: Stripe API error must not fail authentication
      console.error('[auth/me] Stripe reconciliation error (non-fatal):', err);
    }
  }

  res.json({ user: safeUser(user) });
});

export default router;
