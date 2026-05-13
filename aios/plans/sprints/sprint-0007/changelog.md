# Sprint 0007 Changelog

**Status:** complete
**Branch merged:** sprint-0007 → master (`a747ccd`)
**Tasks completed:** 9 / 9

---

## Completed Tasks

### issue-backend-down-graceful-fallback
**Proposal:** issue-backend-down-graceful-fallback
**Problem:** When the Express server was unreachable, API calls silently hung or produced cryptic errors with no feedback to the user.
**Solution:** Added a 5-second timeout to `auth/me` and all authenticated requests. A `NetworkWarningBanner` component now appears at the top of the app when the server cannot be reached, with a clear offline message. The app continues to function in read-only local mode.

---

### issue-jwt-secret-env-guard
**Proposal:** issue-jwt-secret-env-guard
**Problem:** The server could start in production with an empty or short `JWT_SECRET`, silently generating insecure tokens.
**Solution:** Added a startup guard in `server/index.ts` that logs a fatal error and exits with code 1 in production if `JWT_SECRET` is missing or shorter than 32 characters. In development, an ephemeral random secret is generated with a warning.

---

### issue-login-rate-limiting
**Proposal:** issue-login-rate-limiting
**Problem:** The `/api/auth/login` and `/api/auth/register` endpoints had no rate limiting, making them vulnerable to credential-stuffing and brute-force attacks.
**Solution:** Added an `express-rate-limit` middleware capped at 10 requests per 15 minutes per IP on auth routes. Returns a structured 429 with retry timing.

---

### code-vite-api-proxy-and-reducer-action
**Proposal:** code-vite-api-proxy-and-reducer-action
**Problem:** The Vite dev server had no proxy configuration, causing CORS issues when calling the Express backend in development. Auth state transitions were also handled inconsistently across components.
**Solution:** Added a `/api` proxy in `vite.config.ts` pointing to `localhost:3001`. Standardised auth state changes through explicit reducer actions (`LOGIN`, `LOGOUT`, `SESSION_LOADED`) so state transitions are traceable.

---

### feat-auth-frontend-experience
**Proposal:** feat-auth-frontend-experience
**What it is:** A complete login and registration experience with persistent JWT sessions.
**Problem / Opportunity:** The app had no user accounts. Data was only stored locally; nothing persisted across devices and there was no way to identify users for server-side features.
**Solution:** Added `AuthContext` with login/register/logout flows using JWT tokens stored in localStorage. A `SessionBadge` in the header shows the current user. A modal overlay handles login/register without navigating away from the current view. An `AuthProvider` wraps the app and restores the session on load.
**How to use it:** Click the session badge in the top-right corner to open the login / register modal.

---

### feat-backend-monolith-express-sqlite
**Proposal:** feat-backend-monolith-express-sqlite
**What it is:** A full Express + SQLite backend with migrations, JWT authentication, and REST endpoints for user data.
**Problem / Opportunity:** The app had no persistence layer — all data lived in browser localStorage with no way to sync, back up, or restore across sessions.
**Solution:** Built a Node.js/Express server (`server/`) with three-layer architecture (route → service → db). SQLite manages users, journal entries, and birth profile via auto-run migrations. Auth endpoints (`/api/auth/register`, `/api/auth/login`, `/api/auth/me`) issue and validate JWTs. Profile and journal entries sync to the server when authenticated. The server also serves the built frontend in production.
**How to use it:** Register an account to have your data saved server-side. On subsequent visits, your session is restored automatically.

---

### feat-gpt-server-proxy
**Proposal:** feat-gpt-server-proxy
**What it is:** All GPT/OpenAI calls now go through the server — users no longer need to provide an API key.
**Problem / Opportunity:** Every GPT feature required users to paste their own OpenAI API key into the UI. The key was stored in `localStorage`, exposing it to any JavaScript running on the page. This was both a security risk and a major onboarding barrier.
**Solution:** Moved all 12 GPT call types to `server/routes/gpt.ts` → `server/services/gpt.ts`. The server reads `OPENAI_API_KEY` from the environment. The client now calls `POST /api/gpt/interpret` with a `type` discriminator and typed payload — no prompt strings are sent from the client (preventing prompt injection). Rate limiting: authenticated users get 20 calls/day; unauthenticated users get 5 calls/day per IP. After the 3rd unauthenticated call, a quiet nudge encourages account creation. The "Add your API key" UI has been removed from all components.
**How to use it:** All GPT features (transit readings, dream interpretations, numerology narratives, journal annotations, etc.) work automatically — no configuration needed.

---

### feat-localstorage-migration-flow
**Proposal:** feat-localstorage-migration-flow
**What it is:** When a user signs in for the first time, their existing locally-stored data is offered for migration to their server account.
**Problem / Opportunity:** Users who had used the app before registering would lose all their journal entries, birth data, and dream sessions upon logging in, since server data starts empty.
**Solution:** On login, the app detects existing local data and presents a warm migration banner offering to upload it to the server account. The user can confirm or dismiss. Migrated entries are synced to the backend and the local copies are preserved as a fallback.
**How to use it:** Log in or register — if you have local data, a banner will appear offering to migrate it to your account.

---

### feat-optimistic-journal-save
**Proposal:** feat-optimistic-journal-save
**What it is:** Journal entries appear instantly in the UI while the server save happens in the background.
**Problem / Opportunity:** Journal writes showed a loading state while waiting for the server, making the UI feel slow and unresponsive.
**Solution:** Journal entry saves are now optimistic — the entry appears immediately in the list with a syncing indicator. The server call happens in the background; if it fails, the entry is marked with a failure indicator and the user can retry. Successful syncs update the entry's server ID in place.
**How to use it:** Write a journal entry and submit — it appears instantly. A small sync indicator shows whether the save has confirmed with the server.

---

## Build Validation

- **TypeScript:** ✅ clean (`npx tsc --noEmit`)
- **Production build:** ✅ passes (`npm run build` — 724 kB bundle, 8.3s)

## Conflict Resolutions

6 merge events required manual conflict resolution. Key decisions:
- `server/index.ts`: all routes combined (auth + profile + entries + gpt + SPA fallback + trust proxy)
- `AuthContext.tsx`: task-0005's full implementation base + task-0008's migration state fields
- `server/routes/auth.ts`: task-0006's full bcrypt/SQLite implementation over task-0003's stubs
- GPT route files: fixed `.js` import extensions for NodeNext ESM compatibility
- Removed stale `getStoredApiKey` imports (eliminated by task-0007)
