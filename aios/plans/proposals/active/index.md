# Active Proposals — Index

_Sprint 0013 proposals. Production-Readiness sprint — conversion funnel, analytics, and UX clarity._

---

## Issue Fixes

| Proposal | Originated by | Summary |
|---|---|---|
| `issue-analytics-jwt-key-mismatch` | Carmack, Taleb | `gptInterpretation.ts` uses wrong localStorage key (`astral-chart-jwt` instead of `astral-auth-token`) — all GPT requests sent without auth header, breaking tier enforcement and analytics attribution |
| `issue-index-html-missing-meta` | Jobs, Carmack, Miyazaki, Taleb | `index.html` has no description, OG tags, Twitter Card, or real favicon — every shared link produces a blank preview card |
| `issue-todayused-counter-staleness` | All voices | `todayUsed` never increments after readings in a session; `SessionBadge` shows frozen count, `HomeScreen` nudge never fires |

---

## Code Enhancements

| Proposal | Originated by | Summary |
|---|---|---|
| `code-upgrade-modal-checkout-race` | Carmack, Taleb | Stale `authenticated` prop closure in `handleAuthComplete → handleCheckout`; 300ms band-aid does not close the race; `ceremonyStartedAt` useState bug |

---

## Features

| Proposal | Originated by | Summary |
|---|---|---|
| `feat-conversion-funnel-analytics` | All voices | Add `track()` to UpgradeModal and AuthModal + read-only `GET /api/analytics/funnel` endpoint with date-range filtering |
| `feat-persistent-reading-limit-display` | All voices | Always-visible reading counter in header + HomeScreen nudge for all `todayUsed` states + UpgradeModal copy improvements |
