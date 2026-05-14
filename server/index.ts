import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { getDb } from './db.js';
import authRouter from './routes/auth.js';
import profileRouter from './routes/profile.js';
import entriesRouter from './routes/entries.js';
import gptRouter from './routes/gpt.js';
import stripeRouter from './routes/stripe.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV !== 'production';
let JWT_SECRET = process.env.JWT_SECRET ?? '';

if (!isDev && JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be at least 32 characters in production');
  process.exit(1);
}

if (!JWT_SECRET) {
  const ephemeral = crypto.randomBytes(32).toString('hex');
  console.warn(
    'WARNING: JWT_SECRET not set — using ephemeral secret. Tokens will be invalidated on restart.'
  );
  process.env.JWT_SECRET = ephemeral;
  JWT_SECRET = ephemeral;
}

if (!isDev && !process.env.STRIPE_WEBHOOK_SECRET) {
  console.error('FATAL: STRIPE_WEBHOOK_SECRET must be set in production — webhook endpoint is insecure without it');
  process.exit(1);
}

// Warm up DB and run migrations at startup
getDb();

const app = express();

app.set('trust proxy', 1);

// CRITICAL: Stripe webhook route MUST be registered BEFORE express.json().
// The webhook handler uses express.raw() so Stripe can verify the request signature
// against the raw body bytes. Once express.json() has consumed the body, verification fails.
app.use('/api/stripe', stripeRouter);

app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/entries', entriesRouter);
app.use('/api/gpt', gptRouter);

// Serve compiled frontend in production (dist/ lives one level above server/)
const distDir = path.resolve(__dirname, '../dist');
app.use(express.static(distDir));

// SPA fallback for non-API GET requests
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

const PORT = parseInt(process.env.PORT ?? '3002', 10);
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
