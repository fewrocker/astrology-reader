# Proposal: feat-oauth-signup

**Type:** Feature
**Originated by:** Jobs, Miyazaki, Carmack, Taleb

---

## User Guidance

> "I would also like to allow sign up using Google or Facebook"

---

## Problem / Opportunity

New users arriving at the auth modal (`src/components/auth/AuthModal.tsx`) currently face a single path: invent an email address–password pair they have never used with this product, satisfy a 12-character minimum, and remember it forever. This is the wrong gate for a motivated user.

The moment of highest motivation in the funnel is exactly when the `UpgradeModal` fires after a reading-limit hit. The user is emotionally present — they asked for a third reading, something landed for them, they want more. Sending them into a form that demands they create and memorize a new password is ten frictions stacked at the worst possible second. It is friction that does not serve the product's relationship with the user; it serves bureaucracy.

The relevant code surfaces today:

- `src/components/auth/AuthModal.tsx` — no OAuth buttons exist; the email form is the only path
- `server/routes/auth.ts` — `signToken` and `safeUser` are well-defined, but there is no OAuth callback handler anywhere in `server/routes/`
- `server/index.ts` — mounts `authRouter` at `/api/auth`; there is no `/api/auth/google` or `/api/auth/facebook` route
- `server/db.ts` — `users` table line 26: `password_hash TEXT NOT NULL` — this column is hard-`NOT NULL`, which means an OAuth user cannot be inserted without either a real password or a garbage placeholder hash
- `src/context/AuthContext.tsx` — `useEffect` on mount (lines 73–99) reads `localStorage.getItem(AUTH_TOKEN_KEY)` and calls `getSession()`, but it does not inspect `window.location.search` for an inbound `?token=` parameter from an OAuth callback redirect

There is no server mechanism for receiving an OAuth authorization code, exchanging it for a provider access token, fetching the provider's user identity, and issuing a JWT. There is no client mechanism for ingesting a JWT that arrives via query parameter rather than a JSON response body.

The gap is full: zero OAuth infrastructure exists on either side of the stack.

---

## Vision

The user is at the auth modal — either because they hit their reading limit and the upgrade flow guided them here, or because they clicked "Save your readings ✦" on the home screen. The modal opens. The first thing they see is a "Continue with Google" button. One click. Their browser navigates to Google's consent screen (already logged into Google on this device, as most users are). They tap their account. They are back in the app, authenticated, their JWT already in localStorage, the URL already cleaned. Three seconds. Zero passwords.

For a user who prefers email/password — or who does not have a Google or Facebook account — the form is right there, separated by a thin divider and a line of muted text. Nothing is hidden. Nothing is deprecated. The OAuth path is the front door; the email form is the side door. Both doors are real.

On the server, no Passport.js abstraction sits between the OAuth provider and the JWT. The server generates a random state value, sets it in a short-lived signed `HttpOnly` cookie, redirects the user to the provider's authorization URL, receives the authorization code on callback, exchanges the code for an access token by POSTing directly to the provider's token endpoint, fetches the user's profile from the provider's API, and issues the same JWT that the email/password flow issues. About 100 lines of straightforward code. No framework opinion layered on top.

The database accommodates OAuth users without encoding a fiction: `password_hash` becomes nullable, two new columns (`oauth_provider`, `oauth_subject`) record the provider identity, and a `CHECK` constraint ensures every row has at least one complete identity — either a password hash, or a provider+subject pair.

---

## Specifications

### 1. Database Migration — `server/db.ts`

The migration runs at startup in the same `getDb()` function, after the existing `CREATE TABLE IF NOT EXISTS` block. It uses SQLite's `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` syntax (safe because `better-sqlite3` ships with SQLite 3.44+, well past the 3.35 cutoff for this syntax).

**1.1** Make `password_hash` nullable.

SQLite does not support `ALTER COLUMN` to change nullability on an existing column. The safe, non-destructive path uses a four-step table migration executed inside a transaction:

```sql
BEGIN;
CREATE TABLE users_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,                         -- now nullable
  oauth_provider TEXT,
  oauth_subject TEXT,
  full_name TEXT,
  birth_date TEXT,
  birth_time TEXT,
  birth_place TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  CHECK (
    password_hash IS NOT NULL
    OR (oauth_provider IS NOT NULL AND oauth_subject IS NOT NULL)
  )
);
INSERT INTO users_new
  SELECT id, email, password_hash, NULL, NULL, full_name,
         birth_date, birth_time, birth_place, created_at
  FROM users;
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;
COMMIT;
```

This migration is idempotent-safe via a guard: before executing, check whether `oauth_provider` already exists in `pragma table_info(users)`. If it does, the migration has already run and the block is skipped. If it does not, the block executes. This replaces the `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` pattern, which cannot add a `CHECK` constraint to an existing table.

**1.2** After the migration guard, add a unique index to prevent duplicate OAuth identities:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth
  ON users(oauth_provider, oauth_subject)
  WHERE oauth_provider IS NOT NULL;
```

This index serves two purposes: enforces one account per provider identity, and makes the `oauth_provider + oauth_subject` lookup in the callback handler a constant-time operation.

**1.3** The `UserRow` interface in `server/routes/auth.ts` must be updated to reflect the new schema. Add `oauth_provider: string | null` and `oauth_subject: string | null` to the interface. The `safeUser()` function does not expose these fields to clients (they are internal identity credentials); no change to `safeUser()` is needed.

**1.4** The existing `/register` route inserts with `password_hash` as a positional parameter. No change to this insert is needed — the column remains nullable, and existing password-based registrations provide a non-null value. The `NOT NULL` constraint that previously existed at the column level is now enforced by the `CHECK` constraint, which is equivalent for password users.

---

### 2. Server OAuth Routes — `server/routes/oauth.ts` (new file)

This file is a new Express `Router` that handles the full OAuth code exchange for both Google and Facebook. It is mounted in `server/index.ts` at `/api/auth` alongside `authRouter`, so the full paths are `/api/auth/google`, `/api/auth/google/callback`, `/api/auth/facebook`, `/api/auth/facebook/callback`.

No Passport.js. No external OAuth abstraction library. The implementation uses Node's native `crypto` module for state generation and native `fetch` (Node 18+ ships `fetch` natively; the project's `server/routes/gpt.ts` already uses it via `node-fetch` or native fetch — match whichever pattern is established) for the token endpoint and profile API calls.

**2.1 Environment variables required**

The following variables must be present; the production guard in `server/index.ts` should be extended to check for them when `NODE_ENV === 'production'`:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`
- `OAUTH_REDIRECT_BASE` — the base URL for callback construction (e.g., `https://yourapp.com` in production; `http://localhost:3002` in dev). This avoids hardcoding the domain in the server.

**2.2 State cookie generation (shared by both providers)**

Before redirecting to either provider's authorization URL, the server:

1. Generates 16 cryptographically random bytes via `crypto.randomBytes(16).toString('hex')`, producing a 32-character hex state value.
2. Sets a response cookie: `Set-Cookie: oauth_state=<value>; HttpOnly; SameSite=Lax; Secure; Max-Age=600; Path=/`
   - `HttpOnly`: the client JavaScript cannot read this cookie. The state is server-side only.
   - `SameSite=Lax` (not `Strict`): OAuth callbacks are cross-origin top-level GET navigations. `SameSite=Strict` would suppress cookie transmission on the callback return, breaking state verification. `Lax` allows top-level navigations.
   - `Secure`: must be set in production (when `NODE_ENV === 'production'`). Omit in dev to allow `http://localhost`.
   - `Max-Age=600`: 10-minute TTL. If the user takes longer than 10 minutes to complete the OAuth flow, the state cookie has expired and the callback handler will correctly reject the response.
3. In development, `Secure` is omitted because localhost is not HTTPS.

**2.3 Google — initiation route**

`GET /api/auth/google`

Constructs the Google OAuth 2.0 authorization URL with these parameters:
- `client_id`: from `GOOGLE_CLIENT_ID`
- `redirect_uri`: `${OAUTH_REDIRECT_BASE}/api/auth/google/callback`
- `response_type`: `code`
- `scope`: `openid email profile`
- `state`: the generated state value (see 2.2)
- `access_type`: `online` (no refresh token needed; we are not storing Google tokens long-term)
- `prompt`: `select_account` (forces Google to show the account chooser even if the user has one account, which is the expected behavior for a "Continue with Google" button)

Sets the state cookie (2.2), then `res.redirect(authorizationUrl)`.

**2.4 Google — callback route**

`GET /api/auth/google/callback`

Receives `code`, `state`, and optionally `error` as query parameters.

Steps:
1. **Error check**: if `error` is present in the query (user denied consent), redirect to `/?oauth_error=denied`. The client handles this display.
2. **State verification**: read the `oauth_state` cookie from `req.cookies`. If the cookie is missing or does not match `req.query.state`, return 400 and redirect to `/?oauth_error=state_mismatch`. Delete the `oauth_state` cookie in either case (success or failure) by setting `Max-Age=0` on a cookie with the same name, path, and HttpOnly/SameSite attributes.
3. **Token exchange**: POST to `https://oauth2.googleapis.com/token` with:
   - `code`: the authorization code
   - `client_id`: `GOOGLE_CLIENT_ID`
   - `client_secret`: `GOOGLE_CLIENT_SECRET`
   - `redirect_uri`: same as in 2.3
   - `grant_type`: `authorization_code`
   
   Parse the JSON response. If the response status is not 2xx, redirect to `/?oauth_error=exchange_failed`. Log the provider error for debugging but do not expose it to the client URL.
4. **Profile fetch**: GET `https://www.googleapis.com/oauth2/v3/userinfo` with the `Authorization: Bearer <access_token>` header. The `openid` scope guarantees `sub`, `email`, and `email_verified` fields. The `profile` scope provides `name`.
5. **User lookup / creation** (see 2.6).
6. **JWT issuance and redirect** (see 2.7).

Requires `cookie-parser` middleware in `server/index.ts`. If not already present, it must be added before any route that reads `req.cookies`.

**2.5 Facebook — initiation route**

`GET /api/auth/facebook`

Constructs the Facebook OAuth authorization URL:
- Base: `https://www.facebook.com/v19.0/dialog/oauth`
- `client_id`: from `FACEBOOK_APP_ID`
- `redirect_uri`: `${OAUTH_REDIRECT_BASE}/api/auth/facebook/callback`
- `response_type`: `code`
- `scope`: `email,public_profile`
- `state`: the generated state value (see 2.2)

Sets the state cookie, then redirects.

**2.6 Facebook — callback route**

`GET /api/auth/facebook/callback`

Steps parallel to Google (2.4):
1. **Error check**: if `error` or `error_code` is present, redirect to `/?oauth_error=denied`.
2. **State verification**: same cookie-based check as Google.
3. **Token exchange**: POST to `https://graph.facebook.com/v19.0/oauth/access_token` with `client_id`, `client_secret` (from `FACEBOOK_APP_SECRET`), `redirect_uri`, and `code`.
4. **Profile fetch**: GET `https://graph.facebook.com/me?fields=id,name,email&access_token=<token>`. The `id` field is the Facebook-unique `sub` equivalent for provider identity. Note: not all Facebook accounts have a verified email; the `email` field may be absent if the user has not confirmed their email with Facebook. If `email` is absent, prompt the user to add one post-registration (out of scope for this sprint — see Open Questions).
5. **User lookup / creation** (see 2.6).
6. **JWT issuance and redirect** (see 2.7).

**2.6 User lookup / creation (shared logic)**

After obtaining provider identity (`provider`, `subject`, `email`, `name`), execute a single lookup-or-create flow in a SQLite transaction:

1. Look up by `oauth_provider = provider AND oauth_subject = subject`. If a row exists, this is a returning OAuth user — proceed directly to JWT issuance.
2. If no row found by provider+subject, look up by `email`. If a row exists with a matching email:
   - If the row was created via email/password (i.e., `oauth_provider IS NULL`), this is an existing password user signing in via OAuth for the first time. Update the row: set `oauth_provider = provider` and `oauth_subject = subject`. The user now has two identity paths. Their `password_hash` remains set.
   - If the row was created via a different OAuth provider (both `oauth_provider` and `oauth_subject` set but to a different provider), do not merge the accounts automatically. Redirect to `/?oauth_error=email_conflict`. The user must log in via their original method. Account linking is out of scope for this sprint.
3. If no row found by either provider+subject or email, create a new user:
   ```sql
   INSERT INTO users (email, password_hash, oauth_provider, oauth_subject, full_name)
   VALUES (?, NULL, ?, ?, ?)
   ```
   `password_hash` is `NULL` (valid because the `CHECK` constraint allows null password when provider+subject is set). `full_name` is populated from the provider's `name` field.

All three cases proceed to JWT issuance with the user's `id`.

**2.7 JWT issuance and handoff redirect**

After the user row is resolved, call the same `signToken(userId)` function defined in `server/routes/auth.ts`. To share this function without circular imports, either export it from a shared utility module (e.g., `server/utils/token.ts`) or duplicate the three-line function locally in `oauth.ts`. The former is the correct approach.

Redirect to:
```
/?token=<jwt>
```

The JWT is transiently visible in the URL. It contains only `userId` and `iat`/`exp` — no personally identifiable information, no tier, no email. The risk of brief URL exposure is acceptable for v1. The client removes it immediately via `history.replaceState` (see section 4).

Do not use a `Set-Cookie` header for the JWT handoff. The app's auth model is entirely localStorage-based JWT; introducing a session cookie for this one path would create a parallel auth mechanism that `AuthContext` does not know how to reconcile.

**2.8 Mounting in `server/index.ts`**

```ts
import oauthRouter from './routes/oauth.js';
// ...
app.use('/api/auth', oauthRouter);
```

Mounted at the same path as `authRouter` so that `/api/auth/google` and `/api/auth/google/callback` are natural sibling routes to `/api/auth/login` and `/api/auth/register`.

`cookie-parser` must be added before any route mount:
```ts
import cookieParser from 'cookie-parser';
app.use(cookieParser());
```

---

### 3. AuthContext JWT Handoff — `src/context/AuthContext.tsx`

The existing `useEffect` on mount (lines 73–99) checks `localStorage` for a token and calls `getSession()`. This flow is correct for email/password auth. For OAuth, the token arrives in the URL query string, not in localStorage.

**3.1 Token parameter detection**

Add a new block at the top of the mount `useEffect`, before the `localStorage.getItem` check:

```ts
const params = new URLSearchParams(window.location.search);
const oauthToken = params.get('token');
const oauthError = params.get('oauth_error');

if (oauthError) {
  // Surface the error to the user — implementation detail: set a state
  // variable that the AuthModal or a toast component reads.
  // Clean the URL regardless.
  history.replaceState(null, '', window.location.pathname);
  setIsLoading(false);
  return;
}

if (oauthToken) {
  localStorage.setItem(AUTH_TOKEN_KEY, oauthToken);
  // Clean the URL immediately so the token does not persist in browser history,
  // referrer headers, or analytics tools.
  history.replaceState(null, '', window.location.pathname);
  // Fall through to the normal session check below, which will now find
  // the token in localStorage and call getSession().
}
```

After this block, the existing `localStorage.getItem(AUTH_TOKEN_KEY)` check runs as normal. Because the token was just written to localStorage, `getSession()` will be called, the user will be populated in context, and the app will render as authenticated — exactly the same as a successful email/password login.

**3.2 `history.replaceState` semantics**

`replaceState(null, '', pathname)` replaces the current history entry without pushing a new one. The back button does not take the user to a URL containing the token. The token does not appear in any subsequent `document.referrer` if the user navigates to another page. The token does not appear in the browser's address bar after one render cycle.

The cleanup happens synchronously before `getSession()` is awaited, so there is no render where the token is visible in the URL while the app is mounted.

**3.3 OAuth error state**

The `oauth_error` query parameter carries one of: `denied`, `state_mismatch`, `exchange_failed`, `email_conflict`. The `AuthContext` should expose an `oauthError` string (or null) in its context value. The `AuthModal` component reads this value on mount: if non-null, it opens automatically and displays a brief error message in the appropriate tone.

- `denied`: "You chose not to connect. You can still sign in with email."
- `state_mismatch`: "Something went wrong with the sign-in link. Please try again."
- `exchange_failed`: "We couldn't complete the sign-in. Please try again or use email."
- `email_conflict`: "That email address is linked to a different sign-in method. Please use your original sign-in."

The `oauthError` state is cleared once the user acknowledges it (by closing the modal or successfully signing in).

**3.4 No changes to the `login` or `register` callbacks**

The OAuth path does not go through `AuthContext.login` or `AuthContext.register`. It writes directly to localStorage and relies on the mount `useEffect` to pick up the token. This keeps the `login` and `register` callbacks as pure email/password concerns. The `notifyLoggedIn` callback (already present, line 151) could be called after the OAuth token detection if migration-offer logic needs to fire — but this is an optional enhancement, not a requirement.

---

### 4. AuthModal UI — `src/components/auth/AuthModal.tsx`

The modal's current layout (from top to bottom inside `<div className="px-8 pt-8 pb-10">`):

1. Heading ("Return ✦" or "Open Your Account ✦")
2. Email field
3. Password field
4. Forgot password / spacer
5. Error display
6. Submit button ("Enter ✦" / "Begin ✦")
7. Tab-switch hint

The new layout inserts OAuth buttons between the heading and the email form, with a divider separating the two sections.

**4.1 New layout order**

1. Heading (unchanged)
2. **[NEW] Google button**
3. **[NEW] Facebook button**
4. **[NEW] Divider**
5. Email field
6. Password field
7. Forgot password / spacer
8. Error display
9. Submit button
10. Tab-switch hint

**4.2 Google button**

```tsx
<a
  href="/api/auth/google"
  className="flex items-center justify-center gap-3 w-full py-3 rounded-lg text-sm transition-all mb-3"
  style={{
    background: 'rgba(201,168,76,0.06)',
    border: '1px solid rgba(201,168,76,0.18)',
    color: '#e8dcc8',
  }}
  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.40)')}
  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.18)')}
>
  <GoogleIcon /> {/* SVG inline, 18px */}
  Continue with Google
</a>
```

Implemented as an `<a>` tag (full navigation), not a `<button>` that calls `window.location.href`. A full navigation is correct: the OAuth flow is a server redirect chain, not an XHR call. The React component should not use `onClick` + `window.location.href` because that pattern is fragile under React's synthetic event system.

**4.3 Facebook button**

Same structure as the Google button, with the Facebook icon, linking to `/api/auth/facebook`. Placed immediately below the Google button with `mb-3` bottom margin before the divider.

**4.4 Divider**

```tsx
<div className="flex items-center gap-3 mb-6">
  <div className="flex-1 h-px" style={{ background: 'rgba(201,168,76,0.12)' }} />
  <span className="text-xs" style={{ color: 'rgba(201,168,76,0.30)' }}>
    ✦
  </span>
  <div className="flex-1 h-px" style={{ background: 'rgba(201,168,76,0.12)' }} />
</div>
<p className="text-xs text-center mb-5" style={{ color: 'rgba(201,168,76,0.30)' }}>
  or arrive another way
</p>
```

The divider is purely visual: a 1px horizontal rule in very muted gold with the ✦ glyph centered. "or arrive another way" appears below the rule as a low-emphasis descriptor. It is not "OR" in all caps (a technical separator), but a phrase in the product's voice that acknowledges both paths without privileging either editorially while preserving the visual subordination of the form beneath.

**4.5 Visual hierarchy rationale**

The OAuth buttons are deliberately sized and styled to be slightly smaller and lower-contrast than the primary submit button ("Enter ✦" / "Begin ✦"). The submit button uses `background: '#c9a84c'` (solid gold). The OAuth buttons use `background: 'rgba(201,168,76,0.06)'` (near-transparent, like the input fields). The OAuth buttons are present and immediately accessible — they are at the top — but they are not rendered as the dominant visual element. The primary email form below the divider is in the product's own voice. The OAuth buttons are branded external doors. The visual treatment reflects this honestly.

**4.6 Button icons**

The Google "G" logo and Facebook "f" logo must be rendered as inline SVG, not loaded from external URLs. Loading brand assets from Google or Facebook CDN introduces external HTTP requests, creates a CORS surface, and makes the auth modal dependent on external resource availability. Both logos are small and well-known; their SVG representations are 10–15 lines each and can be defined as local React components (`<GoogleIcon />`, `<FacebookIcon />`).

**4.7 State behavior across tabs**

The OAuth buttons are shown on both the login and register tabs. There is no meaningful difference in the OAuth flow between "signing in" and "signing up" — the server creates a new account on first visit and finds the existing account on subsequent visits. The tab label ("Sign In" / "Create Account") refers only to the email/password path.

**4.8 `autoFocus` behavior**

The existing `useEffect` calls `emailRef.current?.focus()` after a 50ms timeout when the modal opens. This behavior is preserved. The OAuth buttons appearing above the email field do not receive autofocus — the email field remains the keyboard-navigation entry point for users who are on keyboard.

---

### 5. Error States

**5.1 Provider unavailable**

If the Google or Facebook authorization URL is unreachable (DNS failure, provider outage), the browser will display its own network error after following the `<a>` href. The server is not involved at this stage. The user sees a browser error page. Upon pressing Back, they return to the app. No special handling is required or possible at the initiation step.

If the provider is reachable for initiation but fails at the token exchange step (2.4 step 3, 2.5 step 3), the server catches the fetch error, logs it, and redirects to `/?oauth_error=exchange_failed`. The client displays the localized error string (see 3.3).

**5.2 Authorization code expired**

Authorization codes are short-lived (typically 60–600 seconds). If the callback URL is reached after the code has expired (e.g., the user went to Google, left the tab open for 20 minutes, came back and clicked "Allow"), the token exchange POST will return a 400 from the provider. The server treats this as an `exchange_failed` error.

**5.3 State cookie expired or absent**

If the user's OAuth state cookie has expired (10-minute TTL, see 2.2) before the callback is received, `req.cookies.oauth_state` will be undefined. The server redirects to `/?oauth_error=state_mismatch`. The user sees the "Something went wrong with the sign-in link" message and can try again.

**5.4 State mismatch (CSRF attempt)**

If the `state` query parameter in the callback does not match the `oauth_state` cookie — indicating either a genuine CSRF attack or a corrupted URL — the server rejects the request and redirects to `/?oauth_error=state_mismatch`. The `oauth_state` cookie is deleted in all cases.

**5.5 Email absent from provider (Facebook)**

Facebook accounts without a confirmed email return a profile object without an `email` field. The server must not attempt to insert a `NULL` email into the `users` table (`email TEXT UNIQUE NOT NULL` is a hard constraint). If `email` is absent, redirect to `/?oauth_error=no_email`. The client displays: "Your Facebook account does not have a confirmed email address. Please add one to Facebook first, or sign in with email." This is a known limitation of Facebook OAuth, not a bug.

**5.6 Email conflict**

If the provider returns an email that already exists in the `users` table under a different OAuth provider, the server redirects to `/?oauth_error=email_conflict`. The user is directed to sign in with their original method (see 3.3). No automatic account merging occurs.

**5.7 Database errors**

If the user lookup/creation transaction fails due to a database error, the server logs the error and redirects to `/?oauth_error=exchange_failed`. The generic error copy is shown. This is an exceptional path; no special recovery mechanism is needed beyond logging.

---

### 6. Fallback — Email/Password Remains Available

The email/password registration and login paths are unchanged. Existing users who registered with email/password before this feature was shipped continue to authenticate exactly as they did before. The `password_hash` column becoming nullable does not affect them — their rows have non-null `password_hash` values.

An existing email/password user who later signs in via Google (with the same email address) has their Google identity merged into their existing account (2.6, case 2). They now have two valid authentication paths. Their `password_hash` is not cleared; it remains set. They can sign in via either path.

A user who signed up via Google and later wants to add a password can do so via a future "add password" profile feature. This is explicitly out of scope for this sprint, but the schema accommodates it: `password_hash` is nullable for OAuth-only users, and setting it later requires only an `UPDATE users SET password_hash = ? WHERE id = ?`.

The "Forgot your password?" link in the login tab continues to display the existing placeholder message ("Password reset isn't available yet"). OAuth users who forget their password are unaffected — they can sign in via their OAuth provider.

---

## Out of Scope

- **Passport.js** — explicitly excluded. Direct OAuth2 code exchange is implemented instead.
- **Account linking UI** — a user cannot manually link a Google account to an existing email account through the app. The server handles automatic linking at login (same email, one OAuth identity), but no explicit "Link accounts" interface is built.
- **Adding a password to an OAuth-only account** — the profile settings do not gain a "Set password" field in this sprint.
- **Refresh tokens** — Google OAuth access tokens are short-lived. The server does not store Google access tokens or refresh tokens. The server needs only the access token long enough to fetch the user's profile (within the OAuth callback handler). After that, the provider token is discarded. Only the internal JWT is stored.
- **Provider token revocation** — the server does not listen for Google or Facebook token revocation events. If a user revokes the app's access in Google's account settings, nothing changes in this app's database. The user's internal JWT remains valid until it expires (30 days).
- **Additional providers** — Twitter/X, Apple, GitHub, and other OAuth providers are not included.
- **Email delivery / invite flows** — the OAuth flow is sign-in only; no welcome email is sent.
- **Mobile deep-link handling** — the OAuth redirect lands at the web origin (`/?token=...`). No native app deep-link scheme is involved.
- **Rate limiting OAuth endpoints** — the `/api/auth/google` and `/api/auth/facebook/callback` routes do not share the `authRateLimiter` middleware used by `/api/auth/login`. OAuth initiation is a redirect and incurs no significant server cost. The callback handler should have a separate, lighter rate limit (e.g., 20 requests per IP per minute) to prevent abuse of the code exchange step, but a production-hardened rate limit on OAuth endpoints is deferred.

---

## Open Questions

1. **Facebook without email — UX path**: When a Facebook user has no confirmed email, the current spec redirects to an error. An alternative is to prompt the user to enter their email address post-OAuth, creating a hybrid flow (OAuth for identity, manually-entered email for the account). This would require a new intermediate screen and is more complex. The error-redirect path is simpler and correct; the question is whether it is acceptable to block some percentage of Facebook users entirely.

2. **`cookie-parser` dependency**: The current server has no cookie-parsing middleware. Adding `cookie-parser` introduces a dependency. Alternatively, the state parameter could be stored in a short-lived in-memory `Map<string, { timestamp: number }>` in `oauth.ts` (keyed by state value, with a cleanup interval). This avoids the dependency but loses state on server restart. Given that OAuth flows complete in under 10 minutes and server restarts mid-flow are rare, the in-memory approach is viable. The cookie approach is cleaner. The team should decide which pattern fits the codebase's dependency philosophy.

3. **`OAUTH_REDIRECT_BASE` in development**: Developers running the server locally at `http://localhost:3002` must register `http://localhost:3002/api/auth/google/callback` as an authorized redirect URI in the Google Cloud Console and in Facebook's App Dashboard. This is a per-developer setup step that must be documented in `.env.example`. The question is whether to require each developer to set up their own OAuth app credentials or to share a single dev-mode OAuth app credential across the team.

4. **Tab behavior after OAuth error**: When `oauth_error` is detected on mount and the AuthModal auto-opens, which tab should be shown — "Sign In" or "Create Account"? The user's intent before the OAuth attempt is not preserved in the redirect. Defaulting to "Sign In" is reasonable but may be wrong for a user who clicked "Continue with Google" on the Register tab. No clean solution exists without encoding the originating tab in the `state` parameter, which is possible but adds complexity.

5. **History entry on iOS Safari**: `history.replaceState` behaves correctly on modern desktop browsers. On some versions of iOS Safari, manipulating the history state immediately after a page navigation has produced inconsistent behavior. The `?token=` URL should be tested on mobile Safari specifically to confirm that the `replaceState` cleanup works and that the token does not reappear on back-navigation.

6. **The `notifyLoggedIn` / migration flow for OAuth users**: The existing `notifyLoggedIn` callback in `AuthContext` checks for unmigrated local data (journal entries, birth data) and triggers a migration offer. OAuth-authenticated users should receive this same offer — they may have been using the app anonymously before signing in. The question is whether the mount `useEffect`'s OAuth token detection path should call `notifyLoggedIn` (or equivalent migration-check logic) after setting the user, or whether this is deferred to a follow-up task.

---

## Outcome

**Status:** done
**Completed:** 2026-05-14
**Branch:** sprint-0009-task-0003-feat-oauth-signup

### What was implemented

**server/db.ts** — SQLite table recreation migration: `password_hash` made nullable, `oauth_provider` and `oauth_subject` columns added, `CHECK` constraint enforces at least one identity (password or OAuth), idempotent guard via `pragma table_info(users)`, unique index on `(oauth_provider, oauth_subject) WHERE oauth_provider IS NOT NULL`.

**server/routes/oauth.ts** (new file) — Direct OAuth2 code exchange for Google and Facebook without Passport.js. Covers: state cookie generation (`HttpOnly; SameSite=Lax; Max-Age=600`), provider-specific initiation routes, callback handlers with state verification, token exchange via native `fetch` (Node 18+), profile fetch, `upsertOAuthUser` with three-path logic (provider+subject match, email link, new account creation), JWT handoff via `/?token=<jwt>` redirect. Routes are conditionally registered only if env vars are present, logging a warning otherwise.

**server/routes/auth.ts** — `UserRow.password_hash` made nullable, `oauth_provider` and `oauth_subject` fields added to interface, `signToken` exported for use by oauth.ts, login guard updated to check `!user.password_hash`.

**server/index.ts** — `cookie-parser` installed and wired before routes, `oauthRouter` mounted at `/api/auth`.

**src/context/AuthContext.tsx** — Mount-effect updated to detect `?token=` and `?oauth_error=` query params before the normal `getSession()` path. `oauthError` state and `dismissOauthError` callback added to context type and value.

**src/components/auth/AuthModal.tsx** — `GoogleIcon` and `FacebookIcon` inline SVG components added. OAuth buttons (`<a href>` for true navigation) placed above email form. Divider with `✦` glyph and "or arrive another way" copy separates the two sign-in paths. `oauthError` from context is displayed at top of modal. Close handler calls `dismissOauthError`.

### Build status
TypeScript compilation clean, Vite build successful (no errors).
