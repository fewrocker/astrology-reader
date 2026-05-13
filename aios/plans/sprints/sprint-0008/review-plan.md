# Sprint 0008 Review Plan

This guide tells you exactly how to verify each feature delivered in sprint-0008. Work through each section in order. No technical knowledge required — just follow the steps and confirm what you see matches what's described.

---

## ✨ Home Screen Redesign

**What was delivered:** The home screen now greets you as a person, with your birth identity displayed naturally, the Daily Snapshot embedded in the left panel, and one "Get Your Readings ✦" button replacing nine separate buttons.

**Where to go:** Open the app and enter (or re-enter) your birth data through the form.

**How to test it:**
1. Open the app. If you have cached birth data, you see the home screen. If not, complete the form wizard (date, time, place).
2. After the form wizard finishes, confirm you land on the **home screen** — NOT the birth chart. This is the post-form navigation fix.
3. Look at the left panel. You should see your birth identity displayed as a single line like "Sun in ♏ Scorpio · ♎ Libra Rising · Moon in ♓ Pisces" — not a table of labels and values.
4. Below the identity line, confirm you see a small "Change birth information" link.
5. If you are NOT logged in, confirm you see a quiet line like "Save your readings ✦" near the birth block.
6. Confirm the Daily Snapshot card is INSIDE the left panel — not below both panels at the bottom of the page.
7. Confirm there is ONE prominent gold "Get Your Readings ✦" button at the bottom of the left panel.
8. Confirm there are NO individual feature buttons (no "Read My Chart", no "Daily Reading", etc.) on the home screen.
9. The right panel (sky chart) should be unchanged — still beautiful.

**What to expect:** A clean, welcoming dashboard. The Daily Snapshot tells you today's moon phase and energy. The identity line feels like a greeting. One button is your portal to everything.

---

## ✨ Readings Navigation Modal

**What was delivered:** A "Get Your Readings ✦" modal that organizes all ten features into three named groups.

**Where to go:** Home screen → tap "Get Your Readings ✦" button.

**How to test it:**
1. From the home screen, tap the gold "Get Your Readings ✦" button.
2. A modal overlay should appear. Confirm it has **three distinct sections**:
   - **You** — Birth Chart, Numerology
   - **Transits** — Daily Reading, Weekly Reading, Monthly Reading, Year Ahead, Couple Synastry
   - **Journals** — Cosmic Journal, Dream Interpretation, Today
3. Confirm each item shows: a glyph/symbol on the left, a bold label, and a short one-line description underneath.
4. Tap "Birth Chart" — confirm the app navigates to the birth chart and the modal closes.
5. Return home (using the back button in the chart). Open the modal again.
6. Tap "Daily Reading" — confirm it opens the daily transit reading.
7. Return home. Open the modal. Tap "Dream Interpretation" — confirm the dream entry modal opens.
8. Close the modal by: (a) clicking the backdrop/background — confirm it closes. (b) pressing Escape — confirm it closes.
9. On mobile (or narrow window), confirm the modal is scrollable — you can reach all three groups without items being cut off.

**What to expect:** A layered, beautiful navigation menu. Groups are clearly separated. Each item feels intentional. Opening it feels like choosing from a fine menu, not clicking a settings panel.

---

## ✨ Split-Render AI Screens (Instant Page Loads)

**What was delivered:** Five screens now show their data immediately — planet tables, compatibility scores, charts — while only the written interpretation streams in with a themed animation.

**Where to go:** Use the Readings Modal to open any of: Daily Reading, Weekly Reading, Monthly Reading, Year Ahead, Couple Synastry, Numerology, Today.

**How to test it:**
1. Open the modal and select **Daily Reading**.
   - The transit table and planet positions should appear **instantly** (within 1 second).
   - Where the written interpretation will appear, you should see a pulsing shimmer with text like "Consulting the stars…" or "Mapping the sky for your chart…"
   - After a few seconds, the written interpretation should fill in, replacing the shimmer.
2. Navigate back home. Open **Couple Synastry** (enter a partner's birth data if prompted).
   - Compatibility scores and cross-aspects table should appear instantly.
   - The interpretation slot shows "Reading your celestial bond…" while the GPT call completes.
3. Open **Numerology**.
   - Core numbers (Life Path, Personal Year, etc.) appear instantly.
   - The narrative slot shows "Decoding your frequencies…"
4. Open **Today**.
   - Moon phase, energy rating, and transit pills appear instantly.
   - GPT slot shows "Reading today's sky for you…"
5. For any screen, confirm: there is NO full-page blank spinner lasting more than 1 second. Data is always visible.

**What to expect:** Every reading feels fast. You see your data the moment you arrive. The interpretation animates in elegantly — it feels like the sky is composing your reading, not like the browser is thinking.

---

## 🏗 Internal Changes

The following improvements were made to the codebase but have no visible UI changes you need to verify:

- **App.tsx component extraction** — `CachedDataLanding` was moved to `src/components/home/HomeScreen.tsx`. The app behavior is identical; the code is now organized.
- **Hover states cleanup** — All navigation button hover effects are now handled by CSS classes instead of JavaScript event handlers. Hover behavior looks the same.
- **State cleanup** — A redundant internal loading flag was removed. No visible change.
- **GPT error handling** — A shared helper was added for consistent error state detection across all AI screens.
