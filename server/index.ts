import express from 'express';
import crypto from 'crypto';
import authRouter from './routes/auth';

// JWT secret validation — must happen before anything else
const JWT_SECRET = process.env.JWT_SECRET;
const NODE_ENV = process.env.NODE_ENV || 'development';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  if (NODE_ENV !== 'development') {
    console.error('FATAL: JWT_SECRET must be set to at least 32 characters in production.');
    console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
  } else {
    const ephemeralSecret = crypto.randomBytes(32).toString('hex');
    process.env.JWT_SECRET = ephemeralSecret;
    console.warn('WARNING: JWT_SECRET not set. Using ephemeral secret for development — all sessions will be invalidated on server restart.');
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
