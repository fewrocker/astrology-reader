import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { getDb } from './db.js';
import authRouter from './routes/auth.js';
import profileRouter from './routes/profile.js';
import entriesRouter from './routes/entries.js';
import gptRouter from './routes/gpt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV !== 'production';
let JWT_SECRET = process.env.JWT_SECRET ?? '';

// --- Env var guards ---
// In production, refuse to start without required secrets.
// In dev, warn but continue.

if (!isDev && JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be at least 32 characters in production');
  process.exit(1);
}

if (!isDev && !process.env.STRIPE_SECRET_KEY) {
  console.error('FATAL: STRIPE_SECRET_KEY must be set in production');
  process.exit(1);
}

if (!isDev && !process.env.STRIPE_WEBHOOK_SECRET) {
  console.error('FATAL: STRIPE_WEBHOOK_SECRET must be set in production');
  process.exit(1);
}

if (!JWT_SECRET) {
  const ephemeral = crypto.randomBytes(32).toString('hex');
  console.warn(
    'WARNING: Using ephemeral JWT_SECRET. All sessions will be invalidated on restart.' +
    ' Set JWT_SECRET in .env for persistent sessions.' +
    ' In staging/production environments, this will log out paying users on every deploy.'
  );
  process.env.JWT_SECRET = ephemeral;
  JWT_SECRET = ephemeral;
}

// Warm up DB and run migrations at startup
getDb();

const app = express();

app.set('trust proxy', 1);

// Security headers (helmet) — must come before all routes
app.use(helmet());

// Gzip compression for API responses — must come before routes
// Note: express.static handles its own compression independently
app.use(compression());

// Request logging: 'combined' (Apache format) in production, 'dev' (colorized) in development
app.use(morgan(isDev ? 'dev' : 'combined'));

// NOTE: Any future Stripe webhook routes (feat-stripe-checkout) MUST be mounted
// BEFORE this express.json() middleware, using express.raw({ type: 'application/json' })
// so that Stripe signature verification can access the raw request body.
app.use(express.json({ limit: '50kb' }));

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

// Global async error handler — MUST be registered after all routes.
// Catches any Error passed via next(err) or thrown synchronously in route handlers.
// Ensures stack traces are never sent to clients.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'internal_error' });
});

const PORT = parseInt(process.env.PORT ?? '3002', 10);
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
