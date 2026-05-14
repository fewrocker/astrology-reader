# Sprint 0013 — Review Plan

Use this guide to manually verify each delivered feature in the running app. Start the app locally (`npm run dev` from the project root) before beginning.

---

## Feature 1: Persistent Reading-Limit Display in Header

**What was delivered:** Free users now see a reading count inline next to the `✦` glyph in the header, without needing to click the dropdown.

**Where to go:** Log in as a free-tier user. Look at the top-right corner of the app — the star glyph `✦`.

**How to test it:**
1. Log in with a free account that has not done any readings today (or clear the server's `gpt_usage` for the account).
2. Notice the `✦` glyph shows nothing extra — just the star. Open the dropdown to confirm it says "3 readings left today."
3. Do one reading (e.g., run a transit interpretation).
4. Return to the home screen and look at the `✦` glyph — still no inline label (2 left is above the threshold).
5. Do a second reading.
6. Now check the header — the glyph should show `"1 left"` inline, before the star.
7. Do a third reading (or trigger the 429 limit). Check the header — it should show `"0 left"` inline.

**What to expect:** The inline count appears at `remaining <= 1` for free users. The dropdown still works normally. Paid users see no inline label.

---

## Feature 2: Home Screen Reading Progression Copy

**What was delivered:** The home screen now shows a progression of ambient text and nudges as a free user consumes their daily readings — instead of a generic spacer.

**Where to go:** Log in as a free-tier user → navigate to the home screen (the screen with the chart form, or after entering a birth chart, the reading launch screen).

**How to test it:**
1. With 0 readings used today, look below the main content: you should see `"3 readings free today."` in faint gold text.
2. Do one reading, then return home: the text should change to `"2 readings left in your sky today."`
3. Do a second reading, then return home: the text should change to a clickable button `"You've come back twice today. One more reading awaits. ✦"` — clicking it should open the upgrade modal.
4. After hitting the daily limit (3 readings), the home screen should show the existing limit-reached section.

**What to expect:** Each state appears at the right count. The texts for 0 and 1 readings are non-interactive (`<p>` tags, no click). The text for 2 readings is a button. The count does not require a page reload — it updates in the same session.

---

## Feature 3: Conversion Funnel Analytics

**What was delivered:** The upgrade modal, auth modal, and server now emit and expose funnel analytics events.

**Where to go:** Test the funnel events by opening the upgrade modal and going through the auth flow. Query the server endpoint for results.

**How to test it:**

*Client events:*
1. As a free authenticated user who has hit the limit (or any user), trigger the `UpgradeModal` to open (run 3 readings, or click an upgrade CTA if visible).
2. When the upgrade modal opens, a `upgrade_modal_seen` event should fire.
3. Click a tier CTA (e.g., "Open Basic") — a `upgrade_cta_clicked` event fires.
4. Click the `×` or "Continue with free" to close — an `upgrade_dismissed` event fires.
5. Open the modal again, click a CTA — the `AuthModal` opens. An `auth_modal_seen` event fires.
6. Switch between the Login and Register tabs — each switch fires `auth_tab_switched`.
7. Close the auth modal without completing — `auth_modal_dismissed` fires.

*Server endpoint:*
8. Query: `curl -H "x-analytics-secret: <your_secret>" "http://localhost:3001/api/analytics/funnel?from=2026-05-14&to=2026-05-14"`
9. You should get a JSON response with counts for all 17 funnel events including the ones you just triggered.

**What to expect:** The funnel endpoint returns JSON with `from`, `to`, and `counts` keys. Every event name appears in `counts` even if the count is 0. The events you triggered should show counts > 0. A missing or wrong `x-analytics-secret` header returns 403.

---

## Feature 4: Upgrade Modal Checkout Race Fix

**What was delivered:** An unauthenticated user who completes auth inside the upgrade modal now proceeds directly to checkout without being trapped in a sign-in loop.

**Where to go:** Log out of the app. Trigger the upgrade modal by hitting the reading limit (as an unauthenticated user, make 3 readings — the anonymous IP limit applies).

**How to test it:**
1. Make sure you are logged out.
2. Do 3 readings to hit the free limit. The `UpgradeModal` appears.
3. Click "Open Basic" (or any CTA).
4. The `AuthModal` opens on the Register tab.
5. Register a new account (or log in to an existing one).
6. After successful auth, the `AuthModal` closes.
7. The checkout ceremony should begin immediately — the app shows the loading/ceremony state.
8. Crucially: the `AuthModal` should NOT reopen after auth completes.

**What to expect:** After login/register inside the upgrade modal, the user proceeds directly to the Stripe checkout ceremony. No sign-in loop. No second auth modal appearance.

---

## Internal Changes (No Navigation Steps)

- **JWT key fix (task-0001):** Authenticated users now send the correct `Authorization` header on all GPT calls. Visible as: rate limits are now account-based (not IP-based) for logged-in users; `gpt_limit_hit` analytics events now show `authenticated: true` for logged-in users.
- **SEO meta tags (task-0002):** Paste `https://astralchart.app` into Slack or iMessage — a full preview card with title, description, and OG image should appear. The browser tab shows a gold `✦` favicon instead of the Vite placeholder.
- **todayUsed fix (task-0003):** The reading counter updates within the same session. After each reading, the home screen nudge and header counter both reflect the new count without a reload.
