# Issue Fix: Backend-Down Graceful Fallback

**Type:** Issue Fix
**Originated by:** Taleb, Jobs, Miyazaki

---

## Problem

`GET /api/auth/me` is called on `AuthContext` mount to restore an authenticated session from a stored JWT. If the backend is unreachable — routine maintenance, a deploy restart, a server crash, a network timeout — this call hangs indefinitely.

There is no timeout proposed in the sprint-0007 vision. The vision says "API calls from `authService.ts` must time out gracefully and fall back to the localStorage path," but the mechanism is unspecified.

The failure mode affects all users, not just authenticated ones. When `AuthContext` is waiting on `GET /api/auth/me`, the entire auth state is unresolved. Components that read from `AuthContext` cannot determine whether the user is authenticated or not. A natural implementation renders a loading state while this is pending. A backend TCP timeout can take 30–120 seconds. During this entire window, all users — including users who have never created an account and simply want to read their natal chart — see a blocked or loading interface.

The unauthenticated path is a core product guarantee from the vision: "A user who does not log in must still get the full app experience." That guarantee is violated when the backend is down, unless the auth check has a bounded time window and a definitive fallback.

## Expected Behavior

The session restoration fetch in `AuthContext` (the `GET /api/auth/me` call on mount) uses an `AbortController` with a **5-second timeout**:

```ts
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 5000)
try {
  const res = await fetch('/api/auth/me', { signal: controller.signal })
  // ...
} catch (err) {
  // timeout or network error — fall through to unauthenticated state
} finally {
  clearTimeout(timeout)
}
```

On timeout or any network error:

- **Users with no stored JWT:** The app assumes unauthenticated silently. No error displayed. The full app loads from localStorage as normal. No spinner persists.
- **Users with a stored JWT** (indicating they had previously logged in and are expecting their account data): A soft notification is shown: `"Could not reach the server — using local data for now."` The notification auto-dismisses after 6 seconds and uses the same gold/dark styling as `StorageWarningBanner` from sprint-0006 (`src/utils/storage.ts`) — gold border, dark background, the `✦` glyph, dismissible by click. The app loads `birthData` from localStorage and continues normally. The user's locally cached data is shown rather than a broken or empty state.

Under no circumstances does a backend outage leave the app displaying an infinite spinner or a locked loading state. The auth check is always resolved — with a session or without one — within 5 seconds of mount.

## Implementation Notes

- The `AbortController` timeout must be set up before the `fetch` call, not as a race with `Promise.race` — `AbortController` is the correct, native signal mechanism.
- The `StorageWarningBanner` component (or a lightweight equivalent using its CSS/styling tokens) should be reused for the "could not reach server" notification to maintain visual consistency.
- The `authService.ts` wrapper function for `GET /api/auth/me` must expose the timeout behavior, not hide it — the caller (AuthContext) should be aware that a `null` return means "unauthenticated or unreachable," not just "unauthenticated."

## Impact

**High (reliability + UX)** — backend outages must not degrade the unauthenticated experience, which serves all users.
**Effort** — Low (timeout is ~5 lines; the soft notification reuses an existing component pattern).

## Dependencies

- `StorageWarningBanner` visual style from sprint-0006 (`src/utils/storage.ts`, existing CSS tokens)
- `AuthContext.tsx` (new in sprint-0007)
- `authService.ts` (new in sprint-0007)

## Acceptance Criteria

- [ ] `GET /api/auth/me` call in `AuthContext` uses `AbortController` with a 5-second timeout
- [ ] On timeout or network error, auth state resolves to unauthenticated within 5 seconds
- [ ] No infinite spinner anywhere in the app due to backend unreachability
- [ ] Users without a stored JWT see no error or notification when the backend is down
- [ ] Users with a stored JWT see a soft, auto-dismissing notification ("Could not reach the server — using local data for now.") styled consistently with `StorageWarningBanner`
- [ ] The notification auto-dismisses after 6 seconds and is manually dismissible
- [ ] The unauthenticated path (chart, transits, numerology, journal, all pages) is fully functional with the backend down
