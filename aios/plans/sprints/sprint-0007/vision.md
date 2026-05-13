# Sprint 0007 Vision

## Sprint Focus

This sprint introduces a backend layer to the app for the first time: a Node.js/Express server bundled as a monolith with the existing React frontend, a PostgreSQL (or SQLite) database for persistence, and JWT-based user authentication. When a user logs in, their birth data (date, birth time, birth place, full name from numerology) is saved to their account. All user-generated entries — starting with Cosmic Journal entries — are persisted server-side so data survives device changes, browser clears, and localStorage quota limits. The app transitions from a stateless per-device tool into a real personal account with history that follows the user.

## Why Now

Six sprints have built a rich, deeply personalized feature set: natal chart, transits, synastry, solar return, numerology, today view, dream journal, and — as of sprint-0006 — the Cosmic Journal. Every one of these features produces data that belongs to the user long-term. The Cosmic Journal in particular is explicitly designed to accumulate meaning over time; its pattern detection activates only after 5+ entries. But today all of that data lives in a single device's localStorage: one browser clear, one device switch, or one storage quota overflow (which sprint-0006 added a guard for, but not a cure) destroys the user's entire history.

The localStorage quota guard added in sprint-0006 (`src/utils/storage.ts`, `StorageWarningBanner`) is a bandage — it warns users when storage is full but cannot expand capacity. The Cosmic Journal will generate the most valuable long-form data this app has ever stored, and it sits on the most fragile substrate available. The product has earned its backend now. Every subsequent sprint that adds features assumes durable user identity.

The `define-product.md` originally declared "No login required: stateless experience, no accounts" — that constraint served the MVP well. Six sprints later, the product has outgrown it. The guidelines file (`aios/guidelines.md`) explicitly supersedes it: backend + auth is the directive for sprint-0007.

## Where to Look

### Frontend surfaces to modify

- `src/context/appState.ts` — the central state store. Currently holds `BirthData` (date, time, city, focusAreas, userName), all chart/transit results, and acts as the source of truth loaded from localStorage on boot. Backend auth replaces the localStorage source of truth for birth data and journal entries; the reducer gains an `authUser` slice.
- `src/App.tsx` — the top-level shell. The `CachedDataLanding` component is the "welcome back" screen shown when birth data is cached locally. This is where a Login/Sign-up button and user session display belong. The `CLEAR_CACHE` action currently logs the user out; it must also call the backend logout endpoint.
- `src/components/form/FormWizard.tsx` — the multi-step birth data form. On submit (step 4), birth data should be saved to the backend (if logged in) rather than only to localStorage.
- `src/components/journal/CosmicJournalPage.tsx` and `src/components/journal/types.ts` — the journal currently reads/writes from `localStorage` at `JOURNAL_STORAGE_KEY = 'cosmic-journal-entries'`. The save/load functions in `CosmicJournalPage.tsx` (`loadEntries()`, `saveEntries()`) need to call backend API endpoints when the user is authenticated.
- `src/components/dream/DreamModal.tsx` — dream sessions are stored as `dream-session-YYYY-MM-DD` keys in localStorage. These are `entries` with `kind = 'dream'` in the backend model.
- `src/utils/storage.ts` — the export-all-data utility should include a "sync to server" path when authenticated.

### New frontend code to write

- `src/services/authService.ts` — register, login, logout, get session, save birth data, save/load journal entries (wrapping `fetch` calls to the backend API).
- `src/context/AuthContext.tsx` (or extend `AppContext`) — holds `{ user: AuthUser | null, token: string | null }` with a `useAuth()` hook. Persists the JWT to localStorage so the session survives page refresh.
- `src/components/auth/LoginModal.tsx` and `src/components/auth/RegisterModal.tsx` — minimal modal forms: email + password. No social auth, no magic links in this sprint.

### Backend to create (new directory: `server/`)

- `server/index.ts` — Express app entry point; serves the static Vite build from `dist/` and mounts all API routes. One process, one deploy.
- `server/routes/auth.ts` — POST `/api/auth/register`, POST `/api/auth/login`, POST `/api/auth/logout`, GET `/api/auth/me`
- `server/routes/profile.ts` — GET/PUT `/api/profile` (birth date, birth time, birth place JSON, full name)
- `server/routes/entries.ts` — GET `/api/entries`, POST `/api/entries`, DELETE `/api/entries/:id` (journal entries and dream sessions share this table, distinguished by `kind`)
- `server/db.ts` — database connection (pg or better-sqlite3). Schema: `users` table + `entries` table.
- `server/middleware/auth.ts` — JWT verification middleware applied to all `/api/profile` and `/api/entries` routes.

## Quality Bar

"Deep, not shallow" for this sprint means:

1. **No data loss during migration.** Existing localStorage data (journal entries, dream sessions, birth data) must be migrated to the backend on first login. The app should detect un-synced localStorage entries and offer a one-click "Upload my existing data" flow before clearing local storage. Do not silently discard a user's Cosmic Journal history when they create an account.

2. **Secure auth, not toy auth.** Passwords must be hashed with bcrypt (never stored plain). JWTs must have a reasonable expiry (e.g., 30 days) and the secret key must come from environment variables, never hardcoded. The `/api/auth/me` endpoint must validate the token on every request.

3. **Unauthenticated path stays intact.** A user who does not log in must still get the full app experience, with localStorage as before. Auth is additive, not required. The `CachedDataLanding` shows a subtle "Save to account ✦" prompt for users who have data but no account; it does not gate any features.

4. **Offline tolerance.** The frontend must not crash or hang if the backend is unreachable. API calls from `authService.ts` must time out gracefully and fall back to the localStorage path with a visible but non-blocking error.

5. **Monolith deploy means one `npm start`.** `server/index.ts` must serve the built React app from `dist/` (via `express.static`). The Vite dev proxy (`vite.config.ts` already has `server.allowedHosts`) should proxy `/api/*` to the Express server in development. No separate frontend and backend deploy processes — one dyno, one process, one port.

6. **Schema is forward-compatible.** The `entries` table uses a `kind` column (e.g., `'journal'`, `'dream'`) and a `text`/`body` column, plus a `metadata` JSONB column for kind-specific fields (tags, gptAnnotation, dreamRef, numerologicalDay). This lets future sprints add new entry kinds without schema migrations.

## What This Sprint Is NOT

- **Not a UI redesign.** The mystic dark theme, all existing pages, and all navigation buttons remain unchanged. Auth surfaces (login modal, register modal, user badge in header) are additive overlays, not replacements.
- **Not a new astrological feature.** No new chart calculations, transit logic, numerology layers, or GPT prompts for astrological content. Every engineer-hour goes to the backend layer.
- **Not social.** No public profiles, no sharing, no following, no collaborative features. All user data is private and only accessible to the authenticated user.
- **Not a password reset flow.** Implementing email delivery (SMTP or transactional email) adds significant scope. A clear "forgot password" placeholder is acceptable; the actual reset flow ships in a later sprint.
- **Not a paid tier.** No billing, subscriptions, or feature gating in this sprint.
- **Not a mobile app backend.** The API is designed for the web app only. No API versioning, no OAuth client IDs, no mobile-specific endpoints.

## Architecture Notes

### Stack recommendation

The existing app is Vite + React 18 + TypeScript with no backend. The monolith approach fits best as:

- **Runtime:** Node.js 20 LTS
- **Framework:** Express (already familiar from the ecosystem; minimal surface area; or Fastify for slightly better TypeScript ergonomics — either works)
- **Database:** PostgreSQL in production (via `pg` driver), SQLite (via `better-sqlite3`) for local development — or just PostgreSQL everywhere to avoid divergence. Given the guidelines say "simple," SQLite-only is acceptable for v1 if deploy target is a single-server VPS.
- **Auth:** `jsonwebtoken` for JWT signing/verification, `bcrypt` for password hashing
- **Build integration:** The `build` script in `package.json` runs `tsc -b && vite build`, producing `dist/`. The Express server serves `dist/` statically and handles all non-`/api/*` routes with `dist/index.html` (SPA fallback). A new `server:start` script runs `node dist-server/index.js` (the compiled backend).
- **Dev setup:** `vite.config.ts` gains a `server.proxy` entry routing `/api/*` to `http://localhost:3001`. The Express server runs on port 3001 in dev; Vite dev server runs on 5173. In production, Express runs on a single port serving everything.

### Directory layout to introduce

```
server/
  index.ts          — Express app + static serve
  db.ts             — DB connection pool, schema init
  middleware/
    auth.ts         — JWT verify middleware
  routes/
    auth.ts         — /api/auth/*
    profile.ts      — /api/profile
    entries.ts      — /api/entries/*
```

### Database schema (minimal)

```sql
CREATE TABLE users (
  id          SERIAL PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name   TEXT,
  birth_date  TEXT,          -- YYYY-MM-DD
  birth_time  TEXT,          -- HH:MM
  birth_place JSONB,         -- City object (name, country, lat, lng, tz)
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,  -- 'journal' | 'dream'
  date        TEXT NOT NULL,  -- YYYY-MM-DD (event date)
  body        TEXT NOT NULL DEFAULT '',
  metadata    JSONB,          -- tags, gptAnnotation, dreamRef, numerologicalDay, etc.
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

## Data Migration Plan Note

When a user registers or logs in for the first time in a browser that already has local data:

1. **Detect:** On successful login, `authService.ts` checks localStorage for `cosmic-journal-entries` (journal), `dream-session-*` keys (dreams), and `astral-chart-birth-data` (birth data).
2. **Offer:** If any local data exists that has not yet been synced (no `_synced` marker), show a non-blocking banner: "You have local data — upload it to your account?" with Upload and Skip buttons.
3. **Upload:** If accepted, batch-POST all local entries to `/api/entries` and PUT birth data to `/api/profile`. Mark localStorage data with `_synced: true` or clear it after successful upload.
4. **Do not auto-clear:** Never silently delete localStorage data. Only clear it once the server confirms receipt (HTTP 201 / 200 responses). On upload failure, keep localStorage intact and warn the user.

This ensures the months of Cosmic Journal entries a user has built before sprint-0007 ships are not lost the moment they create an account.
