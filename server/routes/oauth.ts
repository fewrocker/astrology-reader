import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getDb } from '../db.js';
import { signToken } from './auth.js';

const router = Router();

const isDev = process.env.NODE_ENV !== 'production';
const BASE_URL = process.env.OAUTH_REDIRECT_BASE ?? 'http://localhost:3002';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? '';
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID ?? '';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET ?? '';

const GOOGLE_REDIRECT_URI = `${BASE_URL}/api/auth/google/callback`;
const FACEBOOK_REDIRECT_URI = `${BASE_URL}/api/auth/facebook/callback`;

function setStateCookie(res: Response, state: string): void {
  const cookieOpts = [
    `oauth_state=${state}`,
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=600',
    'Path=/',
  ];
  if (!isDev) {
    cookieOpts.push('Secure');
  }
  res.setHeader('Set-Cookie', cookieOpts.join('; '));
}

function clearStateCookie(res: Response): void {
  const cookieOpts = [
    'oauth_state=',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    'Path=/',
  ];
  if (!isDev) {
    cookieOpts.push('Secure');
  }
  res.setHeader('Set-Cookie', cookieOpts.join('; '));
}

interface OAuthUserInfo {
  provider: string;
  subject: string;
  email: string | null;
  name: string | null;
}

function upsertOAuthUser(info: OAuthUserInfo): number | null {
  const db = getDb();

  // 1. Look up by provider + subject
  const byProvider = db
    .prepare('SELECT id, email, oauth_provider, oauth_subject FROM users WHERE oauth_provider = ? AND oauth_subject = ?')
    .get(info.provider, info.subject) as { id: number; email: string; oauth_provider: string | null; oauth_subject: string | null } | undefined;

  if (byProvider) {
    return byProvider.id;
  }

  // 2. Look up by email
  if (info.email) {
    const byEmail = db
      .prepare('SELECT id, email, oauth_provider, oauth_subject FROM users WHERE email = ?')
      .get(info.email.trim().toLowerCase()) as { id: number; email: string; oauth_provider: string | null; oauth_subject: string | null } | undefined;

    if (byEmail) {
      if (byEmail.oauth_provider !== null && byEmail.oauth_provider !== info.provider) {
        // Email tied to a different OAuth provider — conflict
        return null;
      }
      // Link this OAuth identity to the existing account
      db.prepare('UPDATE users SET oauth_provider = ?, oauth_subject = ? WHERE id = ?')
        .run(info.provider, info.subject, byEmail.id);
      return byEmail.id;
    }
  }

  // 3. No email available — cannot create user without email
  if (!info.email) {
    return null;
  }

  // 4. Create new OAuth user
  const result = db
    .prepare('INSERT INTO users (email, password_hash, oauth_provider, oauth_subject, full_name) VALUES (?, NULL, ?, ?, ?)')
    .run(info.email.trim().toLowerCase(), info.provider, info.subject, info.name ?? null);

  return result.lastInsertRowid as number;
}

// ── Google ──────────────────────────────────────────────────────────────────

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  router.get('/google', (_req: Request, res: Response): void => {
    const state = crypto.randomBytes(16).toString('hex');
    setStateCookie(res, state);

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account',
    });

    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  });

  router.get('/google/callback', async (req: Request, res: Response): Promise<void> => {
    const { code, state, error } = req.query as Record<string, string>;

    if (error) {
      clearStateCookie(res);
      res.redirect('/?oauth_error=denied');
      return;
    }

    const cookieHeader = req.headers.cookie ?? '';
    const cookieMatch = cookieHeader.split(';').map(c => c.trim()).find(c => c.startsWith('oauth_state='));
    const storedState = cookieMatch ? cookieMatch.slice('oauth_state='.length) : undefined;

    clearStateCookie(res);

    if (!storedState || storedState !== state) {
      res.redirect('/?oauth_error=state_mismatch');
      return;
    }

    try {
      // Exchange code for tokens
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: GOOGLE_REDIRECT_URI,
          grant_type: 'authorization_code',
        }).toString(),
      });

      if (!tokenRes.ok) {
        console.error('Google token exchange failed:', tokenRes.status, await tokenRes.text());
        res.redirect('/?oauth_error=exchange_failed');
        return;
      }

      const tokenData = await tokenRes.json() as { access_token?: string };
      if (!tokenData.access_token) {
        console.error('Google token exchange: no access_token in response');
        res.redirect('/?oauth_error=exchange_failed');
        return;
      }

      // Fetch profile
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!profileRes.ok) {
        console.error('Google userinfo fetch failed:', profileRes.status);
        res.redirect('/?oauth_error=exchange_failed');
        return;
      }

      const profile = await profileRes.json() as { sub: string; email?: string; name?: string; email_verified?: boolean };

      const userId = upsertOAuthUser({
        provider: 'google',
        subject: profile.sub,
        email: profile.email ?? null,
        name: profile.name ?? null,
      });

      if (userId === null) {
        res.redirect('/?oauth_error=email_conflict');
        return;
      }

      const jwt = signToken(userId);
      res.redirect(`/?token=${jwt}`);
    } catch (err) {
      console.error('Google OAuth callback error:', err);
      res.redirect('/?oauth_error=exchange_failed');
    }
  });
} else {
  console.warn('WARNING: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set — Google OAuth routes disabled');
}

// ── Facebook ─────────────────────────────────────────────────────────────────

if (FACEBOOK_APP_ID && FACEBOOK_APP_SECRET) {
  router.get('/facebook', (_req: Request, res: Response): void => {
    const state = crypto.randomBytes(16).toString('hex');
    setStateCookie(res, state);

    const params = new URLSearchParams({
      client_id: FACEBOOK_APP_ID,
      redirect_uri: FACEBOOK_REDIRECT_URI,
      response_type: 'code',
      scope: 'email,public_profile',
      state,
    });

    res.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`);
  });

  router.get('/facebook/callback', async (req: Request, res: Response): Promise<void> => {
    const { code, state, error, error_code } = req.query as Record<string, string>;

    if (error || error_code) {
      clearStateCookie(res);
      res.redirect('/?oauth_error=denied');
      return;
    }

    const cookieHeader = req.headers.cookie ?? '';
    const cookieMatch = cookieHeader.split(';').map(c => c.trim()).find(c => c.startsWith('oauth_state='));
    const storedState = cookieMatch ? cookieMatch.slice('oauth_state='.length) : undefined;

    clearStateCookie(res);

    if (!storedState || storedState !== state) {
      res.redirect('/?oauth_error=state_mismatch');
      return;
    }

    try {
      // Exchange code for access token
      const tokenParams = new URLSearchParams({
        client_id: FACEBOOK_APP_ID,
        client_secret: FACEBOOK_APP_SECRET,
        redirect_uri: FACEBOOK_REDIRECT_URI,
        code,
      });

      const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${tokenParams.toString()}`);

      if (!tokenRes.ok) {
        console.error('Facebook token exchange failed:', tokenRes.status, await tokenRes.text());
        res.redirect('/?oauth_error=exchange_failed');
        return;
      }

      const tokenData = await tokenRes.json() as { access_token?: string };
      if (!tokenData.access_token) {
        console.error('Facebook token exchange: no access_token in response');
        res.redirect('/?oauth_error=exchange_failed');
        return;
      }

      // Fetch profile
      const profileRes = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(tokenData.access_token)}`
      );

      if (!profileRes.ok) {
        console.error('Facebook profile fetch failed:', profileRes.status);
        res.redirect('/?oauth_error=exchange_failed');
        return;
      }

      const profile = await profileRes.json() as { id: string; name?: string; email?: string };

      if (!profile.email) {
        res.redirect('/?oauth_error=no_email');
        return;
      }

      const userId = upsertOAuthUser({
        provider: 'facebook',
        subject: profile.id,
        email: profile.email,
        name: profile.name ?? null,
      });

      if (userId === null) {
        res.redirect('/?oauth_error=email_conflict');
        return;
      }

      const jwt = signToken(userId);
      res.redirect(`/?token=${jwt}`);
    } catch (err) {
      console.error('Facebook OAuth callback error:', err);
      res.redirect('/?oauth_error=exchange_failed');
    }
  });
} else {
  console.warn('WARNING: FACEBOOK_APP_ID or FACEBOOK_APP_SECRET not set — Facebook OAuth routes disabled');
}

export default router;
