import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { getDb } from './db.js';
import authRouter from './routes/auth.js';
import profileRouter from './routes/profile.js';
import entriesRouter from './routes/entries.js';
import gptRouter from './routes/gpt.js';
import analyticsRouter from './routes/analytics.js';

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

// Warm up DB and run migrations at startup
getDb();

// Purge events older than 90 days — runs daily at server startup
setInterval(() => {
  try {
    const db = getDb();
    const result = db
      .prepare("DELETE FROM events WHERE created_at < datetime('now', '-90 days')")
      .run();
    if (result.changes > 0) {
      console.log(`[analytics] purged ${result.changes} events older than 90 days`);
    }
  } catch (err) {
    console.error('[analytics] purge failed:', err);
  }
}, 24 * 60 * 60 * 1000); // 24 hours

const app = express();

app.set('trust proxy', 1);
app.use(express.json());
app.use(cookieParser());

// Session cookie middleware — sets a persistent session_id cookie on all /api/* requests
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) return next();
  if (!req.cookies?.session_id) {
    const sessionId = crypto.randomUUID();
    res.cookie('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    });
  }
  next();
});

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/entries', entriesRouter);
app.use('/api/gpt', gptRouter);
app.use('/api/analytics', analyticsRouter);

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
