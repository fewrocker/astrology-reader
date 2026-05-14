# Sprint 0009 — Review Plan

This guide tells you exactly how to verify each feature delivered in sprint-0009. Follow these steps in the running app.

---

## Setup Before Testing

1. Copy `.env.example` to `.env` and fill in:
   - `STRIPE_SECRET_KEY` — from Stripe dashboard (use test key)
   - `STRIPE_WEBHOOK_SECRET` — from Stripe webhook settings
   - `STRIPE_BASIC_PRICE_ID` and `STRIPE_ADVANCED_PRICE_ID` — your Stripe test price IDs
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from Google Cloud Console
   - `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` — from Meta Developer Console

2. Start the server: `npm run server`
3. Start the client: `npm run dev`
4. Open `http://localhost:5173`

---

## Feature 1 — Funnel Analytics

**Where to go:** Developer Tools → Network tab → filter by `/api/analytics`

**How to test it:**
1. Open the app in an incognito window
2. Watch the Network tab — a `POST /api/analytics/event` with `{ event: "page_view" }` should fire within 1 second
3. Enter birth data and watch for `form_started` and `form_completed` events
4. Open any reading — watch for `reading_viewed` with the reading type in properties
5. Check the server console for the session cookie being set on first request

**What to expect:**
- Events fire without blocking the UI (fire-and-forget)
- A `session_id` cookie is present in the browser (check Application → Cookies)
- Events appear in the SQLite database: `sqlite3 data/astrology.db "SELECT event, created_at FROM events ORDER BY created_at DESC LIMIT 20"`

---

## Feature 2 — Google + Facebook OAuth Sign-In

**Where to go:** Click any "Save your readings ✦" nudge or the account icon → sign in modal

**How to test it:**
1. Open the auth modal (click the nudge on the home screen after entering birth data)
2. Verify "Continue with Google" appears AT THE TOP of the modal, above the email form
3. Verify a ✦ divider with "or arrive another way" text appears between OAuth buttons and the email form
4. Click "Continue with Google" — you should be redirected to Google's login page
5. Complete Google sign-in — you should return to the app, logged in, with your Google display name in the header badge

**What to expect:**
- No password required — one click and you're in
- The `?token=` param is cleaned from the URL after login (address bar shows just `/`)
- Your account is created with `subscription_tier = 'free'`

---

## Feature 3 — Stripe Checkout + Upgrade Modal

**Where to go:** Use the app until you hit the 3-reading free limit (or temporarily lower the limit in `.env` for testing)

**How to test it:**
1. Make 3 GPT-powered readings as a free user (daily transit, synastry, numerology, etc.)
2. Attempt a 4th reading — the UpgradeModal should appear
3. Verify the modal uses the dark mystic palette (not a white pricing table)
4. Verify the three tiers are described in prose sentences (not checkmark bullets)
5. Click "Start Basic" — watch for a 2-second transition state with "Opening your account with the sky."
6. Complete Stripe test checkout (use card number `4242 4242 4242 4242`, any future date, any CVC)
7. Return to the app — you should see "The sky is wider now. ✦" on the home screen
8. Attempt another reading — it should succeed

**What to expect:**
- The UpgradeModal feels like the product, not a SaaS page
- The payment ceremony (2-second hold before redirect) is visible
- After payment, the account badge shows "Basic ✦" instead of a reading count
- Stripe webhook fires and updates `subscription_tier` to `basic` in the database

---

## Feature 4 — Subscription Tiers

**Where to go:** Account badge in the top-right header (the ✦ glyph)

**How to test it:**
1. As a free user (unauthenticated or fresh account): enter birth data, make 1 reading
2. Click the ✦ badge → open the account dropdown
3. Verify "2 readings left today" appears (or whatever your remaining count is)
4. Make 2 more readings — verify the count updates
5. Restart the server: `npm run server`
6. Make another reading — verify the limit is still enforced (counter persisted to DB, not lost on restart)
7. As a Basic or Advanced user: verify the dropdown shows "Basic ✦" or "Advanced ✦" instead of a count

**What to expect:**
- Reading counts survive server restarts
- The count updates in real time after each reading
- Paid users see their tier label, not a countdown

---

## Feature 5 — First-Visit Welcome + Usage-Aware Nudge

**Where to go:** Home screen (after entering birth data for the first time)

**How to test it:**
1. Clear localStorage and enter birth data fresh
2. Look below the identity line (Sun ♏ Scorpio · ♎ Rising · Moon ♓) — you should see: "Your chart is ready. Everything you explore from here is yours."
3. Reload the page — the welcome sentence should NOT appear again
4. As an unauthenticated user who has made 2 readings: verify the nudge copy changes to reflect remaining reads

**What to expect:**
- Welcome sentence appears exactly once per device, immediately after first form completion
- The auth nudge is not generic — it responds to how many readings you've used today

---

## Internal Changes (No Navigation Required)

- **Server hardening:** The app now sends security headers (visible in DevTools → Network → Response Headers — look for `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`)
- **Request logging:** Server console now shows each incoming request with method, path, and response time
- **Body limit:** Requests over 50kb will receive a 413 response (not a crash)
- **Error handler:** Unhandled server errors return `{ error: "internal_error" }` instead of leaking stack traces
