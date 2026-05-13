# feat-auth-frontend-experience

**Type:** Feature
**Originated by:** Jobs, Miyazaki, Carmack
**User guidance:** (none)

---

## Problem / Opportunity

Six sprints have accumulated something the app itself cannot protect. The Cosmic Journal now stores months of deeply personal life entries. The natal chart is computed from data the user typed once and will not want to re-enter. Dream sessions, transit readings, numerology names — all of it resides in a single browser's localStorage. One cache clear, one device switch, one browser update that resets site data: the user loses everything they have built with this product.

The app also currently has no identity layer. It cannot distinguish between two different people opening it on the same laptop. It cannot distinguish the user's own session yesterday from their session today. Every feature that has shipped assumes a single unnamed person on a single unnamed device. That assumption served six sprints of feature development. It now constrains what the product can become.

Sprint 0007 introduces a backend, and the frontend must meet it with the right surface. The risk in doing this carelessly is severe: authentication, handled wrong, turns a mystical arrival into a form-filling exercise. The user who has spent three months journaling their chart transitions encounters a standard SaaS login modal — white background, "Create Account", email validation errors in red — and the spell the app has spent six sprints casting breaks in thirty seconds.

The specific surfaces that need to exist on the frontend:

1. An auth context and hook that the rest of the app can consume without coupling to implementation details.
2. An API service layer that handles network fragility gracefully, so the app never hangs or crashes when the backend is unreachable.
3. A login/register modal that speaks in the app's own voice — dark, intimate, celestial in its copy choices.
4. A session indicator in the header that is present but not loud — a signature, not a status bar.
5. A soft, dismissible nudge in `CachedDataLanding` for users who have accumulated data but no account.
6. A silent, non-blocking save of birth data to the backend when an authenticated user completes the form wizard.

Each of these must work correctly, but more importantly, they must feel like they belong to the same product that greets users with "Mapping the heavens at the moment of your birth."

---

## Vision

### The First Encounter

A user who has been using the app for two months — 25 journal entries, a birth chart they trust, a dream log — opens `CachedDataLanding` one afternoon. Everything is the same as always. The buttons are where they expect them. Then, at the bottom of the nav panel, below all the main actions and separated by the thinnest of lines, a single quiet line: "✦ Protect your cosmic record." The visual weight is that of a footnote, not a banner. The gold glyph gives it presence without aggression. The user has never seen this line before. They read it and feel something: their data is meaningful enough that it deserves protection.

They tap it.

### The Modal

The screen behind dims, but not to black — to the same deep charcoal the app uses for all its surface elements (`bg-mystic-surface`). A modal rises, not from the bottom but from center, as if the page is opening rather than overlaying. The heading reads "Open Your Account ✦" — not "Create Account", not "Sign Up". There is a gold glyph in the heading. The font is the app's serif heading typeface.

Two fields: email, and below it, a field labeled "a word only you know" — not "Password". The border of that second field is dim. When the user focuses it, the border glows the same gold as the ✦ in the navigation: `#c9a84c`. There is no strength meter with red and green bars. There is an eye icon in the corner of the password field, styled in the app's muted palette, that reveals the characters when held. Below the fields, small and honest: "Forgot your password? Password reset will be available soon — reach us at [email] if you need immediate help." Not a link that goes nowhere. An honest placeholder.

Below the password field: "Minimum 12 characters." Not enforced with aggressive real-time error states. A quiet hint.

The submit button says "Begin ✦". It uses the same gold fill as "Read My Chart ✦" in `CachedDataLanding`. The app already taught the user that gold buttons are the primary action. This is the same language.

Below the button, the smallest text on the page: "Already have an account? Return ✦." That word — Return — is the tab toggle. Clicking it transforms the modal: the heading becomes "Return ✦", the password field loses its hint text, the submit button becomes "Enter ✦", and the toggle beneath becomes "First time? Open Your Account ✦." The modal does not close and reopen. It breathes.

### After Login

The modal closes. The page is unchanged — but in the app header, next to "Your birth chart, decoded", a small ✦ that was dim a moment ago now glows softly gold. Hovering it on desktop, tapping it on mobile, reveals the user's first name — drawn from `birthData.userName` if it was set in the numerology step, otherwise the word before the `@` in their email, title-cased — and below it, a single option: "Sign Out". No account management. No email display. No settings panel. A name and an exit. Like a signature at the bottom of a letter.

The first time the user completes the form wizard while authenticated, their birth data is already on the server before they see the loading screen. They did not click "Save". They did not confirm. It happened, silently, the way a trusted tool saves your work. The only time they will know it happened is if it fails — and even then, it will say "Couldn't save to your account — local copy is safe," and then that message will disappear after four seconds.

### The CLEAR_CACHE Fork

When an authenticated user clicks "Enter New Birth Data", the behavior must diverge from the unauthenticated path. Today, `CLEAR_CACHE` destroys all localStorage data and resets the app. For a logged-in user, that button has two different possible meanings that look identical from the outside: "I want to start over on this device only" and "I want to change my birth data and update my account." These are not the same action. They should not be the same button with the same label.

The authenticated confirmation presents two explicit options: "Sign out and clear this device" (keeps server data intact, logs out locally) and "Update my birth data" (proceeds to the form, saves new data to both localStorage and the server on completion, must call the logout/re-auth flow if birth data identity changes). The unauth path remains unchanged.

---

## Specifications

### 1. `src/context/AuthContext.tsx`

1.1. Export a `React.createContext` with a provider named `AuthProvider`. The context value matches this interface:

```ts
interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  displayName: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>
  register: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>
  logout: () => Promise<void>
}

interface AuthUser {
  id: number
  email: string
}
```

1.2. `isAuthenticated` is derived as `user !== null && token !== null`. It is not stored separately; it is computed from the two primitives.

1.3. `isLoading` is `true` only during the initial session restoration check on mount (the `GET /api/auth/me` call). It becomes `false` as soon as that call resolves or times out. Components must not render authenticated-only UI while `isLoading` is `true`.

1.4. The `displayName` derivation rule: if `birthData.userName` is set and non-empty in the app state at time of auth resolution, use it. Otherwise, take the portion of `user.email` before the first `@` character and apply title-case (capitalize first letter, lowercase rest). Example: `"sofia_dreams@mail.com"` → `"Sofia_dreams"` — but a cleaner implementation splits on `.` or `_` and capitalizes each word: `"Sofia"`. No raw email address is ever surfaced in any UI element. `displayName` is recomputed whenever `birthData.userName` changes (Numerology page sets it via `SET_USER_NAME`).

1.5. JWT storage key: `'astral-auth-token'` in `localStorage`. This key is the single canonical location. No other file stores or reads auth tokens. On `login()` and `register()` success, the token is written here. On `logout()`, it is removed.

1.6. Session restoration on mount: `AuthProvider` calls `authService.getMe()` inside a `useEffect` with an empty dependency array. `authService.getMe()` reads the stored token from `localStorage`. If no token exists, it resolves immediately with `null` and `isLoading` becomes `false`. If a token exists, it calls `GET /api/auth/me` with a 5-second hard timeout (via `AbortController`). On a 200 response, it dispatches the app-level `LOAD_BIRTH_DATA_FROM_SERVER` action with the returned birth data. On timeout or any error, it sets `user` to `null`, clears the token, and sets `isLoading` to `false` — the app falls back to the localStorage path with no visible error for unauthenticated users. Authenticated users who triggered the timeout see a soft banner: "Could not reach the server — your data is safe locally."

1.7. `logout()` calls `authService.logout()` (which calls `POST /api/auth/logout`), removes `'astral-auth-token'` from localStorage, sets `user` and `token` to `null`. It does not call `CLEAR_CACHE` or touch any birth data in localStorage.

1.8. A `useAuth()` hook is exported that reads from the context. Every component that consumes it must handle the `user === null` case explicitly. The TypeScript type of `user` is `AuthUser | null` — accessing `user.id` without a null check is a type error.

1.9. `AuthProvider` wraps `AppProvider` in the React tree — it is mounted at the root level in `App.tsx` so that `AuthContext` is available to all components including `AppContent`.

---

### 2. `src/services/authService.ts`

2.1. All functions in `authService.ts` go through a thin internal `apiClient` function with this signature:

```ts
async function apiClient<T>(
  path: string,
  options?: RequestInit & { timeoutMs?: number }
): Promise<{ ok: true; data: T } | { ok: false; error: 'offline' | 'unauthorized' | 'server-error' }>
```

2.2. `apiClient` injects the `Authorization: Bearer <token>` header automatically by reading `localStorage.getItem('astral-auth-token')`. It does not need the caller to pass the token.

2.3. Default timeout is 10 seconds, implemented with `AbortController`. The session restoration call (`getMe`) uses a 5-second timeout passed via `timeoutMs`. If the signal fires before the response arrives, the returned object is `{ ok: false, error: 'offline' }`.

2.4. HTTP 401 responses return `{ ok: false, error: 'unauthorized' }`. HTTP 5xx responses return `{ ok: false, error: 'server-error' }`. Network errors (including `AbortError`) return `{ ok: false, error: 'offline' }`. No raw exceptions escape the function boundary.

2.5. Base URL resolution: in development (detected by `import.meta.env.DEV`), use an empty string so calls go to the Vite proxy at `/api/*`. In production, also use an empty string — the Express server serves both the static assets and the API at the same origin.

2.6. Exported functions:

- `authService.login(email, password)` — `POST /api/auth/login`, returns `{ ok: true; user: AuthUser; token: string }` or typed error.
- `authService.register(email, password)` — `POST /api/auth/register`, returns `{ ok: true; user: AuthUser; token: string }` or typed error.
- `authService.logout()` — `POST /api/auth/logout`. On any error, resolves successfully anyway — local logout proceeds regardless of server response.
- `authService.getMe()` — `GET /api/auth/me` with 5s timeout, returns `{ ok: true; user: AuthUser; birthData: BirthData | null }` or typed error.
- `authService.saveProfile(birthData: BirthData)` — `PUT /api/profile` with the birth data serialized. Returns typed result.

2.7. No component in the app calls `fetch()` directly. All network requests go through `authService` which goes through `apiClient`.

---

### 3. `src/components/auth/AuthModal.tsx`

3.1. A single component that renders both the login and register forms. The active mode is controlled by a `mode: 'login' | 'register'` prop and a local state toggle for the user to switch between modes without the modal closing.

3.2. The modal renders as a centered fixed overlay. The overlay background is `rgba(10, 10, 15, 0.85)` (the app's `bg-mystic-bg` with 85% opacity). The modal card background is `bg-mystic-surface` (same as other panels in the app). No white backgrounds at any layer.

3.3. Modal heading: `"Return ✦"` when `mode === 'login'`, `"Open Your Account ✦"` when `mode === 'register'`. Rendered in `font-heading` at `text-2xl text-mystic-gold`.

3.4. Fields:
- Email: label "email", input type `email`, `autoComplete="email"`. Gold border (`border-mystic-gold/60`) on focus. Background `bg-mystic-bg/60` (dark, not white).
- Password: label `"a word only you know"`, input type `password` (toggled to `text` via eye icon), `autoComplete="current-password"` for login, `autoComplete="new-password"` for register. Same focus border style. Eye icon button in the right corner, styled `text-mystic-muted hover:text-mystic-gold`. No red/green strength bars.
- Register-only hint below password field: `"Minimum 12 characters"` in `text-mystic-muted text-xs`.

3.5. Submit button: `"Enter ✦"` for login, `"Begin ✦"` for register. Full-width, `bg-mystic-gold text-mystic-bg font-heading rounded-lg`. Disabled and shows a dimmed spinning ✦ while the API call is in flight.

3.6. Mode toggle: below the submit button, a single line of muted text. For register mode: `"Already have an account? Return ✦"` where "Return ✦" is a gold underlined inline button that sets mode to `'login'`. For login mode: `"First time? Open Your Account ✦"` where "Open Your Account ✦" sets mode to `'register'`. No page navigation. No modal close. Smooth transition via CSS opacity or React state swap.

3.7. "Forgot your password?" link: rendered in `text-mystic-muted/60 text-xs` below the mode toggle, only in login mode. Clicking it replaces the form content with a simple message (same modal, no navigation): "Password reset will be available soon. If you need immediate help, contact us at [email]." A "← Back" link in `text-mystic-gold text-xs` returns to the login form.

3.8. Error display: a single line above the submit button, rendered in a warm amber or soft rose — not harsh red. `text-sm`. Displays the human-readable interpretation of the error shape:
- `'offline'` → "Could not reach the server — check your connection and try again."
- `'unauthorized'` → "Those details don't match — please try again."
- `'server-error'` → "Something went wrong on our end — please try again in a moment."
No stack traces. No HTTP status codes. No technical vocabulary.

3.9. The modal is dismissible by clicking the overlay background or pressing Escape. It does not dismiss on submit while the request is in flight.

3.10. On successful login or register, the modal calls `onSuccess()` (prop) and closes. The `AuthProvider` updates its state. No page reload.

---

### 4. Session Badge in the Header

4.1. The header in `AppContent` currently renders:

```tsx
<header ...>
  <h1 className="font-heading text-4xl md:text-5xl text-mystic-gold mb-2">Astral Chart</h1>
  <p className="text-mystic-muted text-sm tracking-wide">Your birth chart, decoded</p>
</header>
```

4.2. A ✦ glyph is added to the right of the subtitle line `"Your birth chart, decoded"`. It is positioned inline using `flex items-center justify-center gap-2` on the subtitle's container. The glyph is rendered as a `<button>` element (for accessibility and tab focus) with `aria-label` reflecting auth state.

4.3. Visual states:
- Unauthenticated or `isLoading`: `text-mystic-muted/30` — the glyph is visible but dim, not gold. It does not respond to hover in a meaningful way. It is not interactive when unauth (or disabled when `isLoading`).
- Authenticated: `text-mystic-gold` — the glyph glows gold. It has a `hover:drop-shadow-[0_0_6px_rgba(201,168,76,0.7)]` effect that makes it pulse gently on hover.

4.4. When the authenticated ✦ is clicked or hovered (desktop: hover shows on mouse enter; mobile: tap toggles), a small dropdown panel appears below it. The panel contains:
- The user's `displayName` in `font-heading text-sm text-mystic-gold`.
- A "Sign Out" button in `text-mystic-muted text-xs hover:text-mystic-text`. Clicking it calls `auth.logout()` and closes the panel.
- Nothing else. No settings link, no email display, no account options.

4.5. The dropdown panel uses `bg-mystic-surface border border-mystic-border rounded-lg p-3` with a small drop shadow. It is positioned absolutely below the ✦ glyph. It closes on click-outside (a standard `useEffect` listener on the document).

4.6. When `isLoading` is `true` (session restoration in progress), the ✦ renders at its dim state. No spinner or loading indicator in the header — the check is fast (5-second max) and users who arrive without a stored token will never see a loading state at all.

---

### 5. `CachedDataLanding` Nudge

5.1. A single muted line is rendered at the bottom of the nav panel in `CachedDataLanding`, below all existing buttons and above the closing `</div>` of the panel. It is separated from the "Enter New Birth Data" button by a `border-t border-mystic-border/30 pt-4 mt-2` container.

5.2. The nudge renders only when all of the following are true:
- `useAuth().isAuthenticated` is `false` (user is not logged in).
- At least one of: (a) there is at least one entry in `localStorage.getItem('cosmic-journal-entries')` (parsed, `length > 0`), or (b) the birth data cache creation date (inferred from `birthData.date` stored timestamp, or a `localStorage.getItem('astral-first-seen')` key set on first load) indicates the user has been using the app for more than 7 days.
- The user has not dismissed it within the current dismissal window.

5.3. Dismissal: a small `×` button (`text-mystic-muted/50 text-xs hover:text-mystic-muted`) in the top-right corner of the nudge line dismisses it. Dismissal is persisted to `localStorage.setItem('astral-auth-nudge-dismissed', JSON.stringify({ at: new Date().toISOString(), journalCount: N }))` where `N` is the entry count at time of dismissal. The nudge does not reappear until the current journal entry count exceeds `N + 10`. There is no time-based re-show — only activity-based.

5.4. The nudge copy: `"✦ Protect your cosmic record"` rendered in `text-mystic-muted/60 text-xs`. The ✦ is `text-mystic-gold/50`. The entire line is a button (not a styled anchor) that opens `AuthModal` in `'register'` mode. No underline on hover. The entire line brightens slightly: `hover:text-mystic-muted/80`.

5.5. The nudge does not render a banner, a card, a modal, or a floating element. It is a single short line. Its visual weight is subordinate to every existing button in the panel.

---

### 6. `FormWizard.tsx` — Silent Profile Save

6.1. In `handleNext()` within `FormWizard.tsx`, when `formStep === STEPS.length - 1` (the final step — currently step 2, "Place"), the existing behavior dispatches `SET_VIEW: 'loading'`. This behavior is preserved unchanged for all users.

6.2. Additionally, when `formStep === STEPS.length - 1` and `useAuth().isAuthenticated` is `true`, a fire-and-forget call to `authService.saveProfile(birthData)` is initiated before dispatching `SET_VIEW: 'loading'`. It is not `await`ed. The `SET_VIEW` dispatch happens immediately regardless of the API call outcome.

6.3. If `authService.saveProfile()` resolves with `{ ok: false }`, a non-blocking notification is rendered using the existing `StorageWarningBanner` infrastructure: `dispatch({ type: 'SET_STORAGE_WARNING', message: "Couldn't save to your account — local copy is safe." })`. The banner's existing 4-second auto-dismiss behavior applies. No other action is taken.

6.4. If `authService.saveProfile()` resolves with `{ ok: true }`, nothing happens in the UI. The user sees no confirmation. This is intentional.

6.5. The `useAuth()` hook is consumed inside `FormWizard`. TypeScript requires an explicit null-check before accessing `auth.user?.id` in any analytics or logging code that may be added later. The form itself does not change structurally — auth is a transparent layer applied at completion.

---

### 7. `CLEAR_CACHE` Behavior for Authenticated Users

7.1. In `CachedDataLanding`, the "Enter New Birth Data" button currently dispatches `{ type: 'CLEAR_CACHE' }` directly. When `useAuth().isAuthenticated` is `true`, clicking this button instead opens a confirmation modal (or inline confirmation panel within the existing card) with two distinct options:

**Option A — "Sign out and clear this device"**
Descriptive text: "Your chart and journal entries remain safe in your account. This device will be cleared and you'll be signed out." Action: call `auth.logout()`, then dispatch `CLEAR_CACHE`. The server data is untouched. Local data is wiped. The user is returned to the empty form.

**Option B — "Update my birth data"**
Descriptive text: "Re-enter your birth details. Your account will be updated when you complete the new chart." Action: dispatch `{ type: 'SET_STEP', step: 0 }` and `{ type: 'SET_VIEW', view: 'form' }` without clearing localStorage — the form opens fresh, and on completion (`handleNext` at final step), the new birth data is saved to `/api/profile` silently per spec 6.2. This option does not log the user out.

7.2. A "Cancel" link closes the confirmation without action.

7.3. When `useAuth().isAuthenticated` is `false`, "Enter New Birth Data" dispatches `CLEAR_CACHE` directly as today, with no confirmation.

7.4. The `CLEAR_CACHE` reducer action gains awareness: if the application ever dispatches `CLEAR_CACHE` while `authUser` is non-null (which should not happen via UI per 7.1, but may happen programmatically), the reducer logs a warning to the console. It does not block the action — CLEAR_CACHE always clears localStorage. But the logout endpoint should have been called first.

---

### 8. Unauthenticated Path Guarantee

8.1. Every component that reads from `useAuth()` must be able to render correctly when `user` is `null` and `token` is `null`. No component may assume the user is authenticated without first checking `isAuthenticated`.

8.2. TypeScript enforces this: `AuthContextValue.user` is typed as `AuthUser | null`. Accessing `.id`, `.email`, or any field on `user` without a preceding null check produces a TypeScript error at compile time.

8.3. All features — natal chart, transit readings, synastry, solar return, numerology, Cosmic Journal, Dream Journal, Today page — remain fully accessible when unauthenticated. The auth layer is additive. No feature is gated.

8.4. Components that are auth-aware (the session badge, the CachedDataLanding nudge, the FormWizard save, the CLEAR_CACHE fork) use conditional rendering or conditional branching. They do not throw or log errors when unauth.

---

### 9. Error States and Network Failure

9.1. When `authService.getMe()` times out or returns `{ ok: false, error: 'offline' }` and the user had a stored token (meaning they had a session that could not be verified), a `SET_STORAGE_WARNING` action is dispatched with the message: `"Could not reach the server — your data is safe locally."` The existing `StorageWarningBanner` displays it.

9.2. When any auth action (login, register) returns an offline error, the AuthModal shows the inline error per spec 3.8. The token is not stored. The user remains unauthenticated.

9.3. The app must never show a perpetual spinner due to backend unreachability. `isLoading` in `AuthContext` has a maximum duration equal to the `getMe` timeout (5 seconds). After that, `isLoading` is `false` regardless of network state.

9.4. Network failures in `authService.saveProfile()` (triggered from FormWizard) do not block chart calculation. The failure is surfaced as a non-blocking notification (spec 6.3) and then discarded. The user proceeds to their chart reading.

---

### 10. Password Policy

10.1. Client-side: the AuthModal enforces a minimum of 12 characters before enabling the submit button. The enforcement is not aggressive — the hint text "Minimum 12 characters" is always visible in register mode. The submit button becomes enabled only when the password field length is ≥ 12. No other client-side rules (no "must contain uppercase", no special character requirements in the UI).

10.2. Server-side: the server enforces minimum length independently. A password that somehow bypasses client validation is rejected by the server with a 400 response, which surfaces as a server error in the AuthModal.

10.3. No password strength meter. No red/green bars. No gamification of security choices. The design principle: one clear rule, stated once, enforced quietly.

---

## Out of Scope

- **Profile settings page.** Users cannot edit their email, password, or display name from a settings UI in this sprint. Birth data is updated by re-entering it through the form wizard.
- **Password reset flow.** Email delivery (SMTP or transactional email service) is a separate sprint. The "Forgot your password?" placeholder is present (spec 3.7) but functional reset is not implemented.
- **Social auth.** No OAuth providers (Google, Apple, etc.) in this sprint. Email + password only.
- **Partner data migration.** `partnerBirthData` in `appState.ts` is session-specific and temporary by design. It is not saved to the backend in this sprint.
- **Account management UI.** No page for changing email, deleting account, or viewing account info. Sign Out is the only account action available from the UI.
- **Refresh token rotation.** The JWT is a 30-day bearer token. Silent refresh and refresh token infrastructure is deferred to a later sprint when token expiry becomes a user-reported pain point.

---

## Open Questions

**HttpOnly cookies vs. localStorage for JWT storage.**
The current spec stores the JWT in `localStorage` under `'astral-auth-token'`. This is simpler to implement — the `apiClient` can read it synchronously without coordination with the server — but it is vulnerable to XSS attacks. An attacker who can run JavaScript on the page can steal the token.

The alternative is an HttpOnly cookie set by the server (`Set-Cookie: token=...; HttpOnly; Secure; SameSite=Strict`). The client cannot read this cookie at all — the browser sends it automatically on same-origin requests. This eliminates the XSS token theft vector. However, it requires:
- The Express server to set cookies on login/register responses.
- CSRF protection (a `SameSite=Strict` cookie mitigates most CSRF, but the tradeoff needs to be documented).
- The `apiClient` to use `credentials: 'include'` on all fetch calls.
- No client-side token reading — `AuthContext` would need to infer auth state from the `/api/auth/me` response, not from localStorage.

The proposal currently specifies localStorage for implementation simplicity. If the team decides HttpOnly cookies are the right default (they are more secure), the spec in section 1.5, section 2.2, and section 2.3 must be revised accordingly before implementation begins. This decision should be made once and documented — not revisited per-component.
