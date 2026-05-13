# feat-backend-monolith-express-sqlite

**Type** — Feature
**Originated by** — Carmack, Taleb
**User guidance** — (none)

---

## Problem / Opportunity

Six sprints have built a rich, personalized astrological tool: natal chart, transits, synastry, solar return, numerology, today view, dream journal, and — as of sprint-0006 — the Cosmic Journal. Every one of these features produces data that belongs to the user permanently. The Cosmic Journal is designed to accumulate meaning across months and years; its pattern detection activates only after 5+ entries. But today the entire accumulated history lives in a single browser's localStorage.

localStorage is not a persistence layer. It is a convenience cache that fails silently in four well-known modes: browser data clear (manual or automatic), device change, quota overflow (sprint-0006 added a warning banner for this — a bandage, not a cure), and private browsing session end. A user who builds 60 journal entries over three months and then buys a new laptop loses everything. There is no recovery path.

The `define-product.md` declaration "no login required: stateless experience, no accounts" was the right constraint for six sprints of frontend-only development. It is now the primary limiter on product quality. Without a backend, the Cosmic Journal cannot fulfill its core promise: accumulating meaning over time. Without a backend, the app cannot distinguish one user from another. Without a backend, every future feature that generates persistent personal data (chart interpretations, dream patterns, long-term transit histories) will re-encounter the same localStorage fragility.

The backend is not an enhancement to existing features. It is the substrate that makes existing features real.

---

## Vision

When this proposal is implemented, the app gains a single Node.js process that runs on one port and serves everything: the compiled React frontend from `dist/`, all API routes under `/api/*`, and the SQLite database file on the local filesystem. One `npm start`, one deploy, one dyno.

For developers: `npm run dev` starts both the Express server (port 3001) and the Vite dev server (port 5173) concurrently. The Vite dev server proxies `/api/*` to the Express server. There is no CORS configuration, no separate process management, no environment divergence between dev and production. The server speaks TypeScript (compiled via a separate `tsconfig.server.json` to `dist-server/`); the client speaks TypeScript (compiled via the existing `tsconfig.app.json` to `dist/`). The two share no compiled output but can share type definitions from a future `shared/types.ts` if needed.

For users: the auth surfaces (login/register modals) are additive — the full app works without an account exactly as it does today. A user who logs in finds their journal entries, dream sessions, and birth data stored durably, accessible from any device, surviving any browser clear. Their Cosmic Journal history is theirs, not their browser's.

The database is SQLite via `better-sqlite3`. This is a deliberate, explicit choice: the app runs on a single-server VPS, SQLite outperforms PostgreSQL for simple read/write workloads at this scale with zero operational overhead, and the migration path to PostgreSQL is straightforward if horizontal scaling ever materializes. The schema uses only portable SQL constructs so that migration is a schema dump and data export, not a rewrite.

The backend is the foundation every subsequent sprint builds on. Its security properties, data integrity guarantees, and API shape must be right from day one, because changing them after user data exists is expensive.

---

## Specifications

### 1. Server directory structure

The following files must be created. No additional files are required for the initial implementation.

```
server/
  index.ts
  db.ts
  middleware/
    auth.ts
  routes/
    auth.ts
    profile.ts
    entries.ts
```

### 2. Runtime and language

2.1. The server runs on Node.js 20 LTS.

2.2. All server files are written in TypeScript. They are compiled separately from the frontend using `tsconfig.server.json` (see spec 27), producing output in `dist-server/`.

2.3. The server does not import anything from `src/` (the React frontend). The client does not import anything from `server/`. The boundary is enforced by having two separate TypeScript compilation configurations with non-overlapping `include` globs.

### 3. Express application setup (`server/index.ts`)

3.1. The file creates a single Express application instance.

3.2. The app mounts `express.json()` as global body-parsing middleware. Maximum body size: `1mb`.

3.3. The app mounts `express-rate-limit` on `/api/auth/login` and `/api/auth/register`: 10 requests per IP per 15-minute window. On rate limit, respond with HTTP 429 and body `{ "error": "Too many requests, try again later." }`.

3.4. The app mounts the auth router at `/api/auth` (from `server/routes/auth.ts`).

3.5. The app mounts the profile router at `/api/profile`, protected by the JWT middleware from `server/middleware/auth.ts`.

3.6. The app mounts the entries router at `/api/entries`, protected by the JWT middleware.

3.7. The app serves the compiled frontend statically: `express.static(path.join(__dirname, '..', 'dist'))`. This path resolves correctly whether the server is run from the repo root or from `dist-server/`.

3.8. After all API routes, the app installs a catch-all SPA fallback: any GET request that does not match an API route and does not match a static file is served `dist/index.html`. This enables client-side routing (React Router, hash-based navigation) to work correctly for deep links and page refreshes.

3.9. The app listens on `process.env.PORT || 3001`. The port is logged to stdout on startup: `Server running on port {PORT}`.

3.10. In production (`NODE_ENV === 'production'`), the server must refuse to start if `JWT_SECRET` is absent or shorter than 32 characters. The startup failure must be explicit: `console.error('FATAL: JWT_SECRET must be set to a string of 32+ characters in production')` followed by `process.exit(1)`.

3.11. In development (`NODE_ENV !== 'production'`), if `JWT_SECRET` is absent, the server generates a random 64-character hex string at startup, uses it as the JWT secret, and logs a warning: `WARNING: JWT_SECRET not set — using ephemeral secret. Tokens will be invalidated on restart.` This prevents hardcoded fallback strings from silently persisting into production.

### 4. Database (`server/db.ts`)

4.1. The database is SQLite, accessed via the `better-sqlite3` package (synchronous API, no connection pool required).

4.2. The database file path is `process.env.DB_PATH || './data/astrology.db'`. The `data/` directory must be created if it does not exist (`fs.mkdirSync` with `{ recursive: true }`).

4.3. `server/db.ts` exports a single `db` instance (the result of `new Database(dbPath)`) and calls `db.pragma('journal_mode = WAL')` immediately after opening. WAL mode is required for concurrent read performance and is the recommended default for any SQLite application that may have simultaneous reads and writes.

4.4. `server/db.ts` exports an `initializeSchema()` function that runs the schema creation SQL using `db.exec()`. This function is called once at server startup in `server/index.ts` before the Express `listen()` call.

4.5. The `users` table schema:

```sql
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT,
  birth_date    TEXT,
  birth_time    TEXT,
  birth_place   TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
```

Notes on field types:
- `id`: INTEGER AUTOINCREMENT (SQLite integer primary key — use as `user_id` foreign key in entries).
- `email`: unique, stored as lowercase (enforced in application layer on register and login).
- `password_hash`: bcrypt output string, never plaintext.
- `full_name`: nullable; populated from the numerology screen's `userName` field.
- `birth_date`: TEXT in `YYYY-MM-DD` format.
- `birth_time`: TEXT in `HH:MM` 24h format.
- `birth_place`: TEXT containing a JSON-serialized `City` object (`{ name, country, lat, lng, tz }`). SQLite does not have a native JSONB type; the value is stored as a JSON string and parsed in the application layer. This matches the `City` type in `src/data/cityTypes.ts`.
- `created_at`: ISO 8601 UTC datetime string, generated by SQLite's `strftime` function.

4.6. The `entries` table schema:

```sql
CREATE TABLE IF NOT EXISTS entries (
  id          TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,
  date        TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  metadata    TEXT NOT NULL DEFAULT '{}',
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
```

Notes:
- `id`: TEXT (UUID v4) supplied by the client. The server never generates entry IDs. This is mandatory for idempotent migration and offline-safe writes (see spec 35–37).
- `kind`: `'journal'` or `'dream'`. The column is TEXT with no database-level check constraint; validation is in the application layer.
- `date`: TEXT in `YYYY-MM-DD` format. This is the event date (the date the life event occurred), not the creation timestamp.
- `body`: The free-text content of the entry.
- `metadata`: JSON string. For `kind = 'journal'`, this contains: `{ tags, numerologicalDay, gptAnnotation, dreamRef, title, time }`. For `kind = 'dream'`, this contains the full dream session payload. The schema is intentionally open — future `kind` values can store arbitrary structured data here without schema migrations.
- `created_at`: ISO 8601 UTC datetime string.

4.7. The entries index:

```sql
CREATE INDEX IF NOT EXISTS idx_entries_user_kind_date
  ON entries(user_id, kind, date DESC);
```

This index is created by `initializeSchema()` immediately after the table DDL. It covers the primary query pattern: fetch all entries for a user filtered by kind, ordered by date descending.

### 5. JWT middleware (`server/middleware/auth.ts`)

5.1. The middleware reads the `Authorization` header. The expected format is `Bearer <token>`. If the header is absent or malformed, respond with HTTP 401 and body `{ "error": "Authentication required." }`.

5.2. The middleware verifies the token using `jsonwebtoken.verify(token, JWT_SECRET)`. If verification fails (expired, invalid signature, malformed), respond with HTTP 401 and body `{ "error": "Invalid or expired token." }`.

5.3. On successful verification, the middleware attaches `req.user = { id: payload.sub, email: payload.email }` to the request object and calls `next()`. The `payload.sub` value is the user's integer ID (cast to number when reading, as `jsonwebtoken` may return it as a string).

5.4. TypeScript: extend Express's `Request` interface in a `server/types.d.ts` declaration file to add `user?: { id: number; email: string }`. This prevents TypeScript errors when reading `req.user` in route handlers.

### 6. Auth routes (`server/routes/auth.ts`)

All auth responses on success return HTTP 200 (or 201 for register) and a JSON body. All auth responses on error return an appropriate HTTP status code and `{ "error": "<message>" }`.

#### 6.1. POST /api/auth/register

Request body: `{ email: string, password: string, fullName?: string }`

Validation:
- `email`: must be a non-empty string containing `@`. Normalize to lowercase before storing or querying.
- `password`: must be at least 12 characters. If shorter, respond HTTP 400: `{ "error": "Password must be at least 12 characters." }`.
- If `email` already exists in the `users` table, respond HTTP 409: `{ "error": "An account with this email already exists." }`. Do not leak whether the email exists via timing differences — hash the password even on conflict to keep response time consistent.

On success:
1. Hash the password: `bcrypt.hash(password, 12)`.
2. Insert into `users` with `email`, `password_hash`, and optional `full_name`.
3. Sign a JWT: `jsonwebtoken.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d', algorithm: 'HS256' })`.
4. Respond HTTP 201: `{ "token": "<jwt>", "user": { "id": <int>, "email": "<email>", "fullName": <string|null> } }`.

#### 6.2. POST /api/auth/login

Request body: `{ email: string, password: string }`

Steps:
1. Normalize `email` to lowercase.
2. Query `users` by `email`. If not found, respond HTTP 401: `{ "error": "Invalid email or password." }`. Do not reveal whether the email exists.
3. Compare password with stored hash: `bcrypt.compare(password, user.password_hash)`. This is always called even if the user is not found (compare against a dummy hash) to prevent timing-based email enumeration.
4. If comparison fails, respond HTTP 401: `{ "error": "Invalid email or password." }`.
5. On success, sign a JWT (same parameters as register) and respond HTTP 200: `{ "token": "<jwt>", "user": { "id": <int>, "email": "<email>", "fullName": <string|null>, "birthDate": <string|null>, "birthTime": <string|null>, "birthPlace": <City|null> } }`.
6. `birthPlace` in the response is the JSON-parsed value of `users.birth_place` (or `null`).

#### 6.3. POST /api/auth/logout

This is a stateless JWT implementation — there is no server-side session to invalidate. The endpoint exists so the client has a consistent pattern and so future implementations can add token blocklisting without changing the client contract.

Response: HTTP 200, `{ "ok": true }`. The JWT middleware is NOT applied to this route; it must be callable even with an expired token so the client can signal logout regardless of token state.

#### 6.4. GET /api/auth/me

Protected by JWT middleware.

Queries `users` by `req.user.id`. If the user row is not found (deleted account edge case), respond HTTP 401: `{ "error": "User not found." }`.

On success, respond HTTP 200: `{ "user": { "id": <int>, "email": "<email>", "fullName": <string|null>, "birthDate": <string|null>, "birthTime": <string|null>, "birthPlace": <City|null> } }`.

This endpoint is called by `AuthContext.tsx` on mount to restore a session from a stored JWT. It must respond within normal server latency — no expensive computation.

### 7. Profile routes (`server/routes/profile.ts`)

Both routes are protected by JWT middleware.

#### 7.1. GET /api/profile

Queries `users` by `req.user.id` and returns the birth data fields.

Response HTTP 200:
```json
{
  "profile": {
    "email": "...",
    "fullName": "...",
    "birthDate": "YYYY-MM-DD",
    "birthTime": "HH:MM",
    "birthPlace": { "name": "...", "country": "...", "lat": 0, "lng": 0, "tz": "..." }
  }
}
```
All fields may be `null` if not yet set.

#### 7.2. PUT /api/profile

Request body (all fields optional — only supplied fields are updated):
```json
{
  "fullName": "...",
  "birthDate": "YYYY-MM-DD",
  "birthTime": "HH:MM",
  "birthPlace": { "name": "...", "country": "...", "lat": 0, "lng": 0, "tz": "..." }
}
```

Validation:
- `birthDate`, if supplied, must match `YYYY-MM-DD` format. Invalid: HTTP 400 `{ "error": "Invalid birthDate format. Expected YYYY-MM-DD." }`.
- `birthTime`, if supplied, must match `HH:MM` format. Invalid: HTTP 400 `{ "error": "Invalid birthTime format. Expected HH:MM." }`.
- `birthPlace`, if supplied, must be an object. It is JSON-serialized before storage.

On success: apply a SQL UPDATE for only the supplied fields, then respond HTTP 200 with the full updated profile (same shape as GET /api/profile response).

### 8. Entries routes (`server/routes/entries.ts`)

All routes are protected by JWT middleware.

#### 8.1. GET /api/entries

Query parameters:
- `kind` (optional): filter by entry kind (`'journal'` or `'dream'`). If omitted, return all entry kinds.
- `limit` (optional): integer, default 200, max 500. Entries beyond this limit are silently truncated. This prevents accidentally loading unbounded datasets.
- `before` (optional): ISO date string `YYYY-MM-DD`. If supplied, return only entries where `date < before`.

SQL:
```sql
SELECT id, kind, date, body, metadata, created_at
FROM entries
WHERE user_id = ?
  [AND kind = ? -- if kind param supplied]
  [AND date < ? -- if before param supplied]
ORDER BY date DESC
LIMIT ?
```

Each row's `metadata` field is JSON-parsed before serialization into the response.

Response HTTP 200:
```json
{
  "entries": [
    {
      "id": "uuid",
      "kind": "journal",
      "date": "YYYY-MM-DD",
      "body": "...",
      "metadata": { ... },
      "createdAt": "ISO8601"
    }
  ]
}
```

#### 8.2. POST /api/entries

Request body:
```json
{
  "id": "uuid-v4",
  "kind": "journal",
  "date": "YYYY-MM-DD",
  "body": "...",
  "metadata": { ... }
}
```

Validation:
- `id`: required, must be a non-empty string. The client generates this UUID.
- `kind`: required, must be `'journal'` or `'dream'`. Invalid: HTTP 400 `{ "error": "Invalid kind. Must be 'journal' or 'dream'." }`.
- `date`: required, must match `YYYY-MM-DD`. Invalid: HTTP 400 `{ "error": "Invalid date format. Expected YYYY-MM-DD." }`.
- `body`: required, must be a string (empty string is valid).
- `metadata`: optional object; defaults to `{}`.

SQL: `INSERT OR IGNORE INTO entries (id, user_id, kind, date, body, metadata) VALUES (?, ?, ?, ?, ?, ?)`.

The `INSERT OR IGNORE` clause is the idempotency mechanism: if a row with the same `id` already exists (duplicate upload, network retry), the insert is silently skipped. This is the correct behavior — the client-generated UUID guarantees the entry is the same content, and the server should not create duplicates.

Response HTTP 201: the full created entry row (including `createdAt`) in the same shape as a GET entries item. If the insert was ignored (duplicate), respond HTTP 200 with the existing entry fetched by `id`.

#### 8.3. DELETE /api/entries/:id

The `:id` is the UUID string.

SQL: `DELETE FROM entries WHERE id = ? AND user_id = ?`.

The `AND user_id = ?` clause is mandatory — it prevents a user from deleting another user's entries by guessing their UUIDs.

If the row does not exist (already deleted, or never existed, or belongs to another user): respond HTTP 404 `{ "error": "Entry not found." }`.

On success: HTTP 200 `{ "ok": true }`.

### 9. Error response shape

All error responses from all routes follow this shape exactly:

```json
{ "error": "<human-readable message>" }
```

No additional fields. No stack traces. No database error messages. No internal identifiers. All server-side errors (unexpected exceptions, database failures) are caught in a global error handler in `server/index.ts`, logged to stderr with stack trace, and returned to the client as HTTP 500 `{ "error": "Internal server error." }`.

The global error handler:
```ts
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error.' })
})
```

### 10. JWT configuration

10.1. Algorithm: HS256.
10.2. Expiry: `'30d'` (30 days from issuance).
10.3. Payload claims: `sub` (user integer ID, as string per JWT spec), `email` (user email string).
10.4. The secret is read from `process.env.JWT_SECRET` per the startup validation in spec 3.10–3.11.
10.5. No server-side token storage. Tokens are not invalidated on logout (stateless). A future sprint can add a blocklist table if server-side revocation is needed.

### 11. Password hashing

11.1. Library: `bcrypt` (the `bcryptjs` pure-JS variant is acceptable if native compilation causes issues in CI; both have identical API surface).
11.2. Cost factor: 12.
11.3. The hash is stored in `users.password_hash` only. It is never returned in any API response, never logged, never included in error messages.
11.4. On register, hash via `bcrypt.hash(password, 12)` (async, returns a Promise).
11.5. On login, compare via `bcrypt.compare(candidatePassword, storedHash)`.

### 12. Rate limiting

12.1. Library: `express-rate-limit`.
12.2. Applied to `/api/auth/login` and `/api/auth/register` only. All other routes are not rate-limited in this proposal (rate limiting GPT endpoints is a separate proposal).
12.3. Configuration: `windowMs: 15 * 60 * 1000` (15 minutes), `max: 10` (10 requests per window per IP).
12.4. `standardHeaders: true` — include `RateLimit-*` headers in responses.
12.5. `legacyHeaders: false` — do not include the deprecated `X-RateLimit-*` headers.

### 13. CORS

13.1. CORS configuration is NOT required in the production monolith. The Express server serves the frontend from `dist/` and the API from the same origin and port. The browser's same-origin policy applies; no CORS headers are needed.

13.2. CORS is NOT required in development either, because the Vite dev server proxies `/api/*` to the Express server (see spec 22). The browser makes requests to the Vite origin (5173); the proxy forwards them server-to-server to port 3001. From the browser's perspective, there is no cross-origin request.

13.3. If a future use case requires CORS (mobile app, third-party client), add the `cors` package and configure it explicitly at that time. Do not add a permissive `cors()` call now — it opens the API to any origin.

### 14. TypeScript server compilation (`tsconfig.server.json`)

Create `tsconfig.server.json` in the repo root:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "dist-server",
    "rootDir": "server",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["server/**/*"]
}
```

Notes:
- `module: "CommonJS"` because `better-sqlite3` is a CommonJS native module. ESM interop with native addons in Node.js 20 is still fragile; CommonJS is safer for the server bundle.
- `outDir: "dist-server"` separates server output from `dist/` (frontend output).
- `rootDir: "server"` ensures the compiled output mirrors `server/` structure inside `dist-server/`.

### 15. npm scripts

Add the following scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "concurrently \"npm run server:dev\" \"vite\"",
    "build": "tsc -b && vite build && tsc -p tsconfig.server.json",
    "start": "node dist-server/index.js",
    "server:dev": "node --watch --experimental-specifier-resolution=node -r ts-node/register server/index.ts",
    "preview": "vite preview"
  }
}
```

Alternatively, use `tsx` for the development server (simpler):

```json
{
  "scripts": {
    "dev": "concurrently \"npm run server:dev\" \"vite\"",
    "build": "tsc -b && vite build && tsc -p tsconfig.server.json",
    "start": "node dist-server/index.js",
    "server:dev": "tsx watch server/index.ts",
    "preview": "vite preview"
  }
}
```

The `tsx` variant is preferred: `tsx` is a zero-config TypeScript executor for Node.js that handles ESM/CJS interop without additional configuration. Install as a dev dependency.

`concurrently` is required as a dev dependency to run both servers in parallel from a single terminal. It must be installed separately from `tsx`.

### 16. Vite dev proxy (`vite.config.ts`)

Add `server.proxy` to `vite.config.ts`:

```ts
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['.ngrok-free.app'],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
})
```

The `build.outDir: 'dist'` is made explicit (it is the Vite default) to prevent confusion when the server references it in `express.static`.

### 17. Environment variables

The following environment variables must be documented in a `.env.example` file. The actual `.env` file must be in `.gitignore` (verify it is already there; add it if not).

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | Yes (production) | Ephemeral random (dev only) | HS256 signing secret, minimum 32 characters |
| `PORT` | No | `3001` | TCP port for the Express server |
| `DB_PATH` | No | `./data/astrology.db` | Filesystem path to the SQLite database file |
| `NODE_ENV` | No | `development` | Set to `production` in production deployments |

### 18. Package additions

Add to `dependencies` (required at runtime):

```json
{
  "express": "^4.21.0",
  "better-sqlite3": "^11.0.0",
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^2.4.3",
  "express-rate-limit": "^7.4.0"
}
```

Add to `devDependencies` (build/dev only):

```json
{
  "@types/express": "^4.17.21",
  "@types/better-sqlite3": "^7.6.11",
  "@types/jsonwebtoken": "^9.0.7",
  "@types/bcryptjs": "^2.4.6",
  "tsx": "^4.19.0",
  "concurrently": "^9.0.0"
}
```

Note: `bcryptjs` (pure JavaScript, no native compilation) is used instead of `bcrypt` (native C++) to avoid native build failures in CI and on platforms without build toolchains. The security properties are identical — only performance differs, and at cost factor 12 the difference is negligible.

### 19. Idempotency of entry creation

19.1. The `entries` table uses the client-generated UUID as the primary key (`id TEXT PRIMARY KEY`). The server never generates entry IDs.

19.2. `POST /api/entries` uses `INSERT OR IGNORE` semantics. If a row with the same `id` already exists, the insert is skipped and the existing row is returned. This makes the endpoint safe to call multiple times with the same payload — the result is always the same row in the database.

19.3. This idempotency guarantee is the foundation of the localStorage migration upload flow. Entries can be batch-posted multiple times without creating duplicates, even if the network times out between the server writing the row and the client receiving the 201.

### 20. Client-generated UUID convention

20.1. The client generates UUIDs for entries using `crypto.randomUUID()` at entry creation time. This is already the convention in `src/components/journal/types.ts` (`id: crypto.randomUUID()`).

20.2. The same UUID that exists in the client's `JournalEntry.id` or dream session record is sent in `POST /api/entries` as the `id` field. The server uses it as the primary key. This creates a stable, globally unique identifier that the client knows before any server round-trip.

20.3. Dream sessions (stored in localStorage under `dream-session-YYYY-MM-DD` keys today) do not currently have UUIDs. When uploading dream sessions to the server as `kind = 'dream'` entries, the migration code must generate a stable UUID for each session. Use the session's date as a deterministic seed if possible (e.g., using a UUID v5 namespace) to avoid generating a different UUID each time the migration runs.

### 21. Development workflow

21.1. `npm run dev` — starts the Express server on port 3001 (via `tsx watch`) and the Vite dev server on port 5173 concurrently. Both processes share the same terminal via `concurrently`, color-coded by process.

21.2. The SQLite database file is created at `./data/astrology.db` on first startup if it does not exist. The `data/` directory is created automatically.

21.3. `data/` must be in `.gitignore`. The database file is local state, not source code.

21.4. Changes to server TypeScript files cause the `tsx watch` process to restart automatically. Changes to frontend files trigger Vite HMR as before.

### 22. Production deploy

22.1. `npm run build` runs three steps in sequence:
1. `tsc -b` — compiles `tsconfig.app.json` (frontend TypeScript, type-check only for Vite builds).
2. `vite build` — produces `dist/` (the frontend bundle).
3. `tsc -p tsconfig.server.json` — compiles `server/` to `dist-server/`.

22.2. `npm start` runs `node dist-server/index.js`. This single command serves both the compiled frontend and the API.

22.3. On the deploy target, the environment variables `JWT_SECRET` and `NODE_ENV=production` must be set. `PORT` may be set if the default 3001 conflicts. `DB_PATH` should be set to a persistent volume path if the platform resets the local filesystem on deploy.

22.4. The `data/` directory (containing the SQLite file) must reside on a persistent volume in cloud deployments (Railway, Fly.io, Render). If the platform does not support persistent volumes (e.g., ephemeral filesystems), PostgreSQL migration must be performed at that time — but that is a separate sprint decision, not a constraint of this proposal.

### 23. `.gitignore` additions

Verify or add:
```
dist-server/
data/
.env
```

### 24. Three-layer architecture boundary

To preserve extractability and testability, server code must follow a strict three-layer boundary:

- **Routes** (`server/routes/*.ts`): handle HTTP request parsing, call service functions, return HTTP responses. No SQL. No business logic beyond input validation.
- **Services** (not a separate directory in v1 — inline in route files, but isolated as named functions): contain business logic. Accept plain data, return plain data. No `req`/`res` objects.
- **Database** (`server/db.ts`): exports the `db` instance and `initializeSchema()`. Route files call `db.prepare(...).run(...)` directly in v1. If query complexity grows, extract a `server/queries/` layer in a future sprint.

This is a convention, not a framework. In v1, services are named functions in route files (`function createUser(email, passwordHash)`, etc.). The rule: a function that touches the database must not touch `req` or `res`. A function that touches `req` must not call `db` directly — it calls a named service function instead.

### 25. `dreamRef` field forward compatibility

25.1. When uploading existing localStorage journal entries to the server, the `dreamRef` field (currently a raw string like `'dream-session-2025-05-13'`) must be stored in `metadata` with a typed wrapper: `{ type: 'local', key: 'dream-session-2025-05-13' }` rather than the raw string.

25.2. New entries created while authenticated, where a dream session has been migrated to the server as a `kind = 'dream'` entry, must store `dreamRef` as `{ type: 'server', id: '<uuid>' }`.

25.3. The `JournalEntry` type in `src/components/journal/types.ts` should be updated to reflect this: `dreamRef: { type: 'local'; key: string } | { type: 'server'; id: string } | null`. Existing localStorage entries with raw string `dreamRef` values must be migrated on read.

This change costs 20 lines and prevents a data migration later when the dream session localStorage keys become permanently meaningless for server-side entries.

### 26. Unauthenticated path preservation

26.1. The backend must not break the unauthenticated path. A user who never creates an account must get the full app experience. No feature is gated behind auth.

26.2. All API calls from the frontend must be wrapped in null-checks for the auth token. If the token is absent, API calls are skipped and the localStorage fallback is used.

26.3. The `AuthContext` must initialize with `user: null, token: null` as the default state, before any async auth check resolves.

26.4. The session restoration call (`GET /api/auth/me`) must have a hard timeout of 5 seconds. If the backend is unreachable or slow, the app must transition to unauthenticated state after the timeout and proceed normally. A non-blocking error indicator is acceptable; a loading spinner that never resolves is not.

---

## Out of Scope

This proposal does NOT cover:

- **OAuth / social login.** No Google, GitHub, or Apple sign-in. Email + password only.
- **Email delivery.** No password reset email, no verification email, no welcome email. The forgot-password flow shows a placeholder message; the actual reset mechanism ships in a later sprint.
- **Media / file uploads.** No profile photos, no image attachments on journal entries.
- **GPT proxy.** Moving OpenAI API calls to the server is the subject of a separate proposal (`feat-gpt-proxy-server-side`). The OpenAI key remains client-side for this sprint.
- **Account deletion endpoint.** Identified by Taleb as a necessary feature; deferred to the sprint that ships account settings UI.
- **Export of server-side data.** The `exportAllLocalStorage()` utility will need a server-side augmentation when authenticated; deferred to a follow-up proposal.
- **Token refresh.** The 30-day JWT simply expires. The client detects a 401 and prompts the user to log in again. Refresh token flows are not in scope.
- **Paid tiers, billing, subscriptions.** None.
- **PostgreSQL migration.** SQLite is the chosen database. Migration to PostgreSQL is a future concern if horizontal scaling is ever required.
- **API versioning.** All routes are unversioned (`/api/auth/*`, `/api/profile`, `/api/entries`). Versioning is introduced if and when a breaking API change is needed.
- **Rate limiting on non-auth routes.** GPT endpoint rate limiting belongs to the GPT proxy proposal.
- **Server-side JWT revocation / blocklist.** Logout is fire-and-forget; tokens expire naturally. A blocklist table is a future concern.

---

## Open Questions

**Q1: SQLite vs PostgreSQL — is this truly settled?**

This proposal commits to SQLite with `better-sqlite3`. The rationale: single-server VPS, simple read/write workloads, zero operational overhead, identical schema with minor syntax adjustments if migration is ever needed. The `birth_place` and `metadata` columns use TEXT (JSON-serialized) instead of JSONB — the application layer handles serialization/deserialization. `gen_random_uuid()` is not available in SQLite; UUIDs are client-generated and supplied in the INSERT. `TIMESTAMPTZ` is not available in SQLite; timestamps are stored as ISO 8601 TEXT strings and compared lexicographically (valid because ISO 8601 UTC strings sort correctly). The only remaining open question is the deploy target: if the chosen platform (Railway, Fly.io, Render) does not offer persistent volume storage, SQLite is not viable for production and PostgreSQL is required at that point. Confirm the deploy target before starting implementation.

**Q2: TypeScript compilation approach — `tsx` vs `ts-node` vs compile-first?**

This proposal recommends `tsx` for the dev server and `tsc -p tsconfig.server.json` for the production build. `tsx` is actively maintained, supports Node.js 20, and requires zero configuration. `ts-node` requires additional configuration for CommonJS/ESM interop. Compile-first (no runtime TypeScript executor) is the most stable production choice and is what this proposal uses for `npm start`. The open question is whether the team prefers `tsx` for dev or wants to use `nodemon` + pre-compiled output. `tsx` is simpler and the recommended choice.

**Q3: Should `POST /api/auth/logout` be protected by JWT middleware?**

This proposal leaves logout unprotected, allowing the client to call it with any token state (expired, invalid, or missing). This is intentional: the client should be able to signal logout regardless of token validity. The alternative — requiring a valid token to log out — means a user with an expired token cannot explicitly clear their server session and must wait for expiry. Since this implementation is stateless (no server-side session), the logout endpoint has no meaningful server-side effect in v1 regardless. Confirm this approach is acceptable or add optional token validation with graceful degradation.

**Q4: What is the correct persistent volume path on the target deploy platform?**

The `DB_PATH` environment variable defaults to `./data/astrology.db`, which is relative to the process working directory. On platforms with ephemeral filesystems, this path will be reset on each deploy. The correct path depends on the platform: Fly.io uses `/data`, Railway and Render have platform-specific volume mount paths. This must be resolved before the first production deploy. If the deploy target is not yet decided, use the default for now and document that `DB_PATH` must be set to a persistent volume path in production.
