import { Router } from 'express';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Rate limiting applied to login and register only
// GET /api/auth/me is NOT rate-limited (session restoration must always be reachable)
router.post('/login', authRateLimiter, async (req, res) => {
  // Implementation by feat-backend-monolith task
  res.status(501).json({ error: 'Not yet implemented' });
});

router.post('/register', authRateLimiter, async (req, res) => {
  // Implementation by feat-backend-monolith task
  res.status(501).json({ error: 'Not yet implemented' });
});

router.post('/logout', async (req, res) => {
  // No rate limit on logout
  res.json({ ok: true });
});

router.get('/me', async (req, res) => {
  // No rate limit on session restoration
  res.status(401).json({ error: 'Not authenticated' });
});

export default router;
