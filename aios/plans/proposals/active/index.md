# Active Proposals Index

Generated for sprint-0007.

## Issue Fixes

- **issue-backend-down-graceful-fallback** — Server must time out in 5s and fall back to localStorage so backend outages never block the app. (Taleb, Jobs, Miyazaki)
- **issue-jwt-secret-env-guard** — Hard-fail at startup if JWT_SECRET is absent or too short in production. (Taleb)
- **issue-login-rate-limiting** — Rate limit auth routes (10 req/IP/15 min) to prevent brute-force attacks on private journal data. (Taleb)

## Code Enhancements

- **code-vite-api-proxy-and-reducer-action** — Vite dev proxy for /api/* + LOAD_BIRTH_DATA_FROM_SERVER reducer action. (Carmack, Taleb)

## Features

- **feat-auth-frontend-experience** — Full frontend auth: AuthContext, mystic modal, session glyph, nudge, FormWizard silent save. (Jobs, Miyazaki, Carmack)
- **feat-backend-monolith-express-sqlite** — Complete server/ directory: Express + SQLite, all routes, JWT, bcrypt, monolith deploy. (Carmack, Taleb)
- **feat-gpt-server-proxy** — Move OpenAI calls to server-side /api/gpt/interpret; remove API key UI; per-user rate limiting. (Carmack, Taleb)
- **feat-localstorage-migration-flow** — "Carry it with me" migration flow with idempotent upload and dreamRef type change. (Jobs, Carmack, Miyazaki, Taleb)
- **feat-optimistic-journal-save** — Write journal/dream saves to localStorage first, sync in background; faint indicator on failed-sync entries. (Miyazaki, Carmack, Jobs)
