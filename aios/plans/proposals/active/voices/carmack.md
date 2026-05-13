# John Carmack — Sprint 0007 Proposal Voice

Sprint 0006 shipped cleanly. The Cosmic Journal is live, the sky computation is correct for historical dates, the energy rating deduplication is done, and the localStorage guard exists. Good. Now sprint-0007 introduces a backend for the first time, and this is where architectural decisions made in a hurry will haunt you for the life of the product. Let me be precise about what the actual hard problems are.

---

## Architecture: What to Actually Build

The vision correctly lands on a Node.js/Express monolith. That's the right call. Don't second-guess it. One process, one port, one deploy, `dist/` served statically by Express, `/api/*` handled by Express routes. This is not a microservices problem. It's a small personal app that needs user accounts and a database. Keep it simple.

**SQLite vs PostgreSQL:** Go SQLite with `better-sqlite3` for v1. The vision hedges on this and it shouldn't. The app runs on a single-server VPS. SQLite on a single machine outperforms PostgreSQL for simple read/write workloads when there's no horizontal scale requirement. `better-sqlite3` is synchronous by design — no async/await surface, no connection pool to manage, no separate process, no network socket. The migration path to PostgreSQL is straightforward if you ever need it: the schema is tiny and the queries are simple. Starting with PostgreSQL because "production" adds operational complexity for zero benefit at this scale. Pick SQLite. Make it a conscious decision, document it, move on.

**JWT secret management:** This is the first place this sprint can go badly. The JWT secret must come from an environment variable (`JWT_SECRET`). If it's hardcoded anywhere — even in a comment, even in a `.env.example` — someone will copy it into production. The server startup should fail loudly if `JWT_SECRET` is not set and `NODE_ENV !== 'development'`. In dev, generate a random secret at startup and log a warning. Do not use a hardcoded fallback in any code path that runs in production. This is non-negotiable.

**Token expiry:** 30 days is fine. Use `jsonwebtoken` with `{ expiresIn: '30d' }`. The `/api/auth/me` endpoint validates the token on every request — that's the right model. Don't store tokens server-side (no session table). The token is the session.

**Password hashing:** `bcrypt` with cost factor 12. Not 10 (too fast on modern hardware), not 14 (too slow for a responsive login). 12 is the current production default. The hash lives in the `users.password_hash` column, never in a log, never in an error message, never returned in an API response.

---

## The Real Technical Risks

### Risk 1: The localStorage-to-Server Migration Will Destroy Data If You Get the Order Wrong

The vision describes the migration flow correctly at a high level, but the implementation has a subtle failure mode that will burn users. Here's the sequence that kills data:

1. User logs in
2. Frontend detects local journal entries
3. User clicks "Upload"
4. Frontend batch-POSTs entries to `/api/entries`
5. **Server returns 201**
6. **Frontend clears localStorage** — this is the only safe moment to clear

The failure mode: if step 6 happens before step 5 confirms, or if the frontend clears on any network response (including 4xx/5xx), the data is gone. The `_synced: true` marker approach in the vision is better than clearing, but it has its own problem: if the marker write fails (quota error), you get duplicate entries on the next sync attempt. 

The correct implementation: don't clear localStorage on upload success. Instead, mark each entry with `_synced: true` server-side UUID (the ID assigned by the server). On future loads, when authenticated, load from the server and use server IDs as the source of truth. Let localStorage atrophy naturally — it becomes stale read-only backup. Only clear it on explicit user action ("Clear local data") after verifying the server has everything. This is more conservative than the vision's approach but eliminates the data loss failure mode entirely.

Also: the batch upload endpoint must be idempotent. If the client retries (network timeout between POST and 201 response), you must not create duplicates. Use the client-generated UUID (`id` field in `JournalEntry`) as the deduplication key on the server — `INSERT OR IGNORE` in SQLite, `INSERT ... ON CONFLICT DO NOTHING` in the schema. This makes retries safe.

### Risk 2: The OpenAI API Key Is Currently Exposed on the Client

`src/services/gptInterpretation.ts` stores the OpenAI API key in localStorage and calls `api.openai.com` directly from the browser. This is a known limitation of a frontend-only app. But now that a backend exists, this is the sprint to fix it. Every GPT call should go through the backend:

1. Client calls `POST /api/gpt/interpret` with the prompt payload
2. Server holds `OPENAI_API_KEY` in environment variable
3. Server proxies to OpenAI and returns the result

The client never touches the OpenAI key. The API key storage in localStorage, the `getStoredApiKey()` function, the key setup UI — all of this goes away. Users no longer need to supply their own API key. The server owns the key.

This is not explicitly in the sprint vision but it's the natural completion of introducing a backend. Shipping a backend that still requires users to paste in their OpenAI API key is a missed opportunity and leaves a security-unfriendly pattern (localStorage key storage) intact. This is the clean break point.

If cost is a concern, rate-limit GPT endpoints per user on the server side — simple in-memory counter per `user_id` per day is enough for v1.

### Risk 3: The `dreamRef` Field Couples Journal to localStorage Dream Sessions

`JournalEntry.dreamRef` stores a localStorage key (`dream-session-YYYY-MM-DD`). When journal entries migrate to the server, `dreamRef` becomes a dangling reference to a localStorage key that may or may not still exist on the current device. If the user logs in on a new device, all `dreamRef` links are broken — silently, because the code just checks `localStorage.getItem(dreamRef)` and returns null on miss.

The correct fix during this sprint: dream sessions need to move to the `entries` table with `kind = 'dream'`. The `dreamRef` field on journal entries should become a UUID reference to the dream entry's server-side ID, not a localStorage key string. During migration, when uploading dream sessions, generate a UUID for each and update the corresponding journal entries' `dreamRef` to point to the new UUID.

If dream session migration is out of scope for this sprint (it's complex), at minimum: change `dreamRef` to store `{ type: 'localStorage', key: string } | { type: 'server', id: string }` so the field format is forward-compatible when dream sessions do migrate. A stringly-typed localStorage key baked into every server-side journal entry is a schema smell that will require a migration later.

### Risk 4: AppState.ts Is Now Two Different Things

`src/context/appState.ts` currently handles two concerns: (1) birth data persistence to localStorage and (2) app view state/reducer. When auth is introduced, birth data has a new source of truth (the server), but the reducer still writes to localStorage on `UPDATE_BIRTH_DATA` → `saveBirthData()`. The sequence during login will be ambiguous: does birth data come from the server response or from localStorage? Which wins if they differ?

The answer needs to be explicit in code: on login, server birth data overwrites localStorage. The `SET_AUTH_USER` action (new) should accept `{ user, birthData }` and dispatch a `LOAD_BIRTH_DATA_FROM_SERVER` action that replaces `state.birthData` without writing to localStorage. The `saveBirthData()` function in localStorage should only be called when the user is not authenticated (localStorage fallback path) or when explicitly told to sync to localStorage as backup.

Right now this coupling is implicit. Making it explicit before writing 2000 lines of backend code will prevent a class of "my profile shows wrong data" bugs.

---

## Existing Code Smells That Will Cause Problems

**1. No fetch abstraction.** The frontend currently has zero `fetch()` calls — all computation is local. `authService.ts` will be the first place network requests appear. Don't scatter raw `fetch()` calls across authService. Build a thin `apiClient.ts` that handles: base URL resolution (localhost:3001 in dev, `/api` in prod), JWT Authorization header injection from the stored token, timeout (important for offline tolerance — the vision requires graceful degradation), and standardized error shapes. Every endpoint in authService goes through this client. This pays for itself immediately when you need to add request logging or handle 401s globally (token expired → force logout).

**2. The `saveEntries` function in `CosmicJournalPage.tsx` re-implements quota error detection.** Lines 48-50 catch `QuotaExceededError` by string matching on `e.message` instead of using the `isQuotaError()` utility already in `src/utils/storage.ts`. This is exactly the pattern sprint-0006 created `isQuotaError()` to eliminate. Fix it in the same PR as the backend work — it's a one-line import change.

**3. The PatternPanel computes transit aspects live for historical entries.** `PatternPanel.tsx` calls `getTopActiveTransits(chartData, 20, 10, entryDate)` per entry in the `processNext` loop (line 185). This was an architectural concern I flagged in sprint-0006 analysis: recomputing sky snapshots from stored entries at read time instead of storing them at write time. For 50+ entries, this is 50 × 10 planet position lookups running via `requestAnimationFrame` — it works, but it means the pattern panel's accuracy depends on the runtime engine state rather than the stored snapshot. When entries live on the server, this computation happens on the client against the live engine, which is correct — but it means the pattern data is only as good as the browser's IANA timezone database for historical dates. Consider storing the top transit aspects in `metadata` JSONB at write time and reading from stored data in PatternPanel. This makes patterns deterministic and server-renderable.

**4. `buildInitialState()` runs synchronous localStorage reads at module load time.** Lines 278-309 in `appState.ts` call `loadCachedBirthData()`, `loadCachedChartResults()`, `loadCachedTransitResults()`, and `loadCachedSynastryResults()` synchronously before any React tree renders. When the app is authenticated, the initial state should load from the server — but the current pattern has `initialState` as a module-level constant populated synchronously. You can't `await` a server fetch at module load time. The fix: make `buildInitialState()` return a promise or move to an async initialization hook. For sprint-0007, the practical path is: load from localStorage first (as today), then dispatch `LOAD_BIRTH_DATA_FROM_SERVER` after the auth token is validated, overwriting the initial state. Two-phase initialization is fine for a personal app. Just make it explicit.

---

## Dev Setup: The Vite Proxy Is Missing

`vite.config.ts` has `server.allowedHosts: ['.ngrok-free.app']` but no `server.proxy` configuration. The vision correctly identifies that dev needs `/api/*` proxied to `http://localhost:3001`. Without this, every `fetch('/api/auth/login')` from the Vite dev server on port 5173 hits the wrong host. Add:

```ts
server: {
  allowedHosts: ['.ngrok-free.app'],
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
    },
  },
},
```

This is a 5-line addition that unblocks all local development of the backend. It's easy to forget and will cause confusing CORS errors when the first backend route is tested.

---

## Database Schema: One Fix

The vision's schema is correct. One addition: add a unique constraint on `(user_id, id)` for the entries table, and use the client-generated UUID as the primary key (already in the vision). Also add an index on `(user_id, kind, date)` — you will query entries by user + kind + date range, and without an index on a table that could have thousands of rows, that's a full table scan. SQLite will handle it fine for hundreds of rows, but adding the index costs nothing and the query pattern is obvious from day one.

```sql
CREATE INDEX IF NOT EXISTS idx_entries_user_kind_date 
  ON entries(user_id, kind, date DESC);
```

---

## Proposals

### feat-backend-monolith-express-sqlite
**Type:** feat  
Introduce the `server/` directory with Express + better-sqlite3: entry point, DB init with schema, auth routes (register/login/logout/me), profile routes (get/put birth data), entries routes (get/post/delete). One `npm start` runs the server that also serves the built React app from `dist/`. Includes `tsconfig.server.json` for separate server compilation to `dist-server/`.

### feat-auth-context-jwt
**Type:** feat  
Create `src/context/AuthContext.tsx` with `useAuth()` hook, holding `{ user, token }`. JWT persisted to localStorage under a dedicated key. Provides `login()`, `register()`, `logout()` functions that call `authService.ts`. On mount, validates stored token against `/api/auth/me` and dispatches `LOAD_BIRTH_DATA_FROM_SERVER` if valid. Session expiry and 401 responses trigger automatic logout.

### feat-auth-modals-login-register
**Type:** feat  
Minimal `LoginModal.tsx` and `RegisterModal.tsx`: email + password fields, validation, submit to authService, error display. A "Save to account ✦" badge appears in `CachedDataLanding` for unauthenticated users with local data. Auth is additive — no feature gating, no required login. Logout clears token from localStorage but does not clear birth data or journal entries from localStorage (offline path stays intact).

### feat-gpt-proxy-server-side
**Type:** feat  
Move all OpenAI API calls from client-side `gptInterpretation.ts` to server-side `/api/gpt/*` endpoints. Server holds `OPENAI_API_KEY` in environment. Client calls `/api/gpt/interpret` with prompt payload; server proxies to OpenAI and returns result. Remove `getStoredApiKey()`, `storeApiKey()`, and the API key UI from the frontend. Add per-user rate limiting (simple in-memory counter, 20 GPT calls/day/user). Unauthenticated users get a lower limit or a prompt to create an account.

### feat-localstorage-migration-upload-flow
**Type:** feat  
On first login in a browser with existing local data, detect unsynced journal entries, dream sessions, and birth data. Show a non-blocking banner: "Upload your history to your account?" with Upload and Skip buttons. Batch-POST entries using client UUIDs as idempotent deduplication keys (`INSERT OR IGNORE`). PUT birth data to `/api/profile`. Never clear localStorage on upload — only mark entries with their server-assigned confirmation (server echoes back the UUID). If upload fails, keep localStorage intact and show error. Dream sessions upload as `kind = 'dream'` entries.

### feat-api-client-fetch-abstraction
**Type:** feat  
Create `src/services/apiClient.ts`: thin wrapper around `fetch` that injects the Authorization header from the stored JWT, resolves the correct base URL (empty string in prod, `http://localhost:3001` in dev via Vite proxy), enforces a 10-second timeout via `AbortController`, and returns typed error objects instead of thrown exceptions. All `authService.ts` methods go through this client. Catches offline/unreachable states and returns a typed `{ ok: false, error: 'offline' }` result so components can fall back to localStorage without crashing.

### issue-dream-ref-forward-compatible-format
**Type:** issue  
`JournalEntry.dreamRef` currently stores a raw localStorage key string (`dream-session-YYYY-MM-DD`). When dream sessions migrate to the server, this field becomes a dangling reference. Change the type to `{ type: 'local', key: string } | { type: 'server', id: string } | null` before entries reach the server. Existing localStorage entries get `{ type: 'local', key: '...' }` during the migration upload. New entries on authenticated sessions get `{ type: 'server', id: '...' }`. This is a 20-line change that prevents a schema migration later.

### issue-journal-save-entries-uses-wrong-quota-guard
**Type:** issue  
`saveEntries()` in `CosmicJournalPage.tsx` (lines 44-52) catches `QuotaExceededError` by checking `e.name` and `e.message` with string matching — bypassing the `isQuotaError()` utility already in `src/utils/storage.ts`. Replace with `import { isQuotaError } from '../../utils/storage'` and call it. This is a one-line fix that makes quota detection consistent across all save sites.

### code-vite-proxy-api-dev
**Type:** code  
Add `server.proxy` configuration to `vite.config.ts` routing `/api/*` to `http://localhost:3001`. Without this, all backend API calls from the Vite dev server fail with connection refused or CORS errors. Required prerequisite for any local backend development. Also add `build.outDir: 'dist'` explicitly (it's the default but making it explicit prevents confusion when the server references it).

### code-birth-data-server-overwrite-path
**Type:** code  
Add a `LOAD_BIRTH_DATA_FROM_SERVER` action to `appReducer` in `appState.ts` that sets `state.birthData` without triggering the `saveBirthData()` localStorage write. Currently `UPDATE_BIRTH_DATA` always saves to localStorage. When authenticated, birth data loaded from the server must overwrite the reducer state without re-persisting to localStorage (which could create a stale localStorage copy that wins on next cold load if the server is unreachable). Explicit action, explicit intent, no ambiguity.

### code-entries-db-index
**Type:** code  
Add `CREATE INDEX IF NOT EXISTS idx_entries_user_kind_date ON entries(user_id, kind, date DESC)` to `server/db.ts` schema initialization. The entries table will be queried by user + kind + date range on every journal and dream page load. Index it from day one rather than adding it as a "performance fix" when the table has 10,000 rows and query time becomes visible.
