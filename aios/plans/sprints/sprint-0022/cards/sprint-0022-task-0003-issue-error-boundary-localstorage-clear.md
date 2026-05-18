# Issue Fix: `ErrorBoundary.handleStartOver` Destroys Journal Data via `localStorage.clear()`

**Type:** Issue Fix
**Originated by:** Taleb

---

## Problem

`src/components/ErrorBoundary.tsx` line 28:

```ts
handleStartOver = () => {
  localStorage.clear()
  window.location.reload()
}
```

The ErrorBoundary is the user's only recovery path when a rendering error occurs — typically caused by stale or corrupted localStorage values such as a cached chart result from a prior schema version. Clicking "Start Over" is the expected and correct user action. The problem is that `localStorage.clear()` deletes every key in origin storage without discrimination.

The following user data is permanently destroyed:

- **`cosmic-journal-entries`** (`JOURNAL_STORAGE_KEY` in `src/components/journal/types.ts`) — the full array of journal entries written by the user, including title, body, tags, GPT annotation, and dream references. For an unauthenticated user, these entries exist nowhere else. For an authenticated user whose most recent background sync failed silently (`_syncFailed: true` on the entry), the server copy is out of date and the unsynced entries are gone.
- **`dream-session-{YYYY-MM-DD}`** keys (prefix `dream-session-`, constant `DREAM_SESSION_KEY_PREFIX` in `src/context/appState.ts`) — full GPT dream interpretation sessions linked to journal entries via `DreamRef`. These are referenced by journal entries; severing the reference orphans the entry's dream context permanently.
- **`astral-chart-birth-data`** (`BIRTH_DATA_CACHE_KEY` in `src/context/appState.ts`) — the user's birth date, time, and place. Losing this forces re-entry of the chart foundation. While recoverable by the user, it is not "cache" data in any meaningful sense; it is the user's primary identity record in the app.
- **`astral-auth-token`** (`AUTH_TOKEN_KEY` in `src/services/authService.ts`) — the authentication JWT, silently logging the user out with no explanation.
- **`astral-migration-offered` / `astral-migration-declined`** — flags that gate whether the migration banner is shown. Clearing these causes authenticated users to be shown the data migration prompt again on next load, potentially triggering duplicate upload logic.

The fallback message displayed to the user reads:

> "An unexpected error occurred. Your chart data is safe."

This is false. `localStorage.clear()` executes on the next user interaction. Journal entries, dream sessions, and birth data are not safe.

The actual cause of the rendering error — almost always a corrupted chart result cache key — is one of: `astral-chart-results`, `astral-chart-transit-results`, `astral-chart-synastry-results`, or a stale `daily-snapshot-*` entry. Clearing everything else is not necessary to resolve the error and constitutes silent, irreversible data destruction.

---

## Expected Behavior

`handleStartOver` must perform targeted key removal, clearing only the keys that can cause rendering errors, while preserving all user-authored data and session state.

**Keys to clear (chart computation cache — safe to discard):**

| Key | Constant | Location |
|---|---|---|
| `astral-chart-results` | `CHART_RESULTS_CACHE_KEY` | `src/context/appState.ts` |
| `astral-chart-transit-results` | `TRANSIT_RESULTS_CACHE_KEY` | `src/context/appState.ts` |
| `astral-chart-partner-data` | `PARTNER_DATA_CACHE_KEY` | `src/context/appState.ts` |
| `astral-chart-synastry-results` | `SYNASTRY_RESULTS_CACHE_KEY` | `src/context/appState.ts` |
| All keys matching prefix `daily-snapshot-` | `CACHE_PREFIX` | `src/components/reading/DailySnapshotCard.tsx` |
| All keys matching prefix `advance-today-signal-` | written in `src/components/reading/AdvanceTab.tsx` | `src/components/reading/AdvanceTab.tsx` |

**Keys to preserve (user-authored data and session — must not be touched):**

| Key / Prefix | Data |
|---|---|
| `cosmic-journal-entries` | All journal entries written by the user |
| `dream-session-*` | Dream interpretation sessions linked from journal entries |
| `astral-chart-birth-data` | User's birth date, time, and city — primary identity record |
| `astral-auth-token` | Authentication JWT — clearing this silently logs the user out |
| `astral-migration-offered` / `astral-migration-declined` | Migration gate flags |
| `payment_welcomed` | Payment onboarding flag |

The implementation must enumerate all localStorage keys and remove only those that match the clear-list, using prefix matching where appropriate (`daily-snapshot-`, `advance-today-signal-`). It must not use `localStorage.clear()`.

The fallback message must be corrected. The accurate claim is that journal entries and birth data are safe. "Your chart data is safe" is misleading because "chart data" is precisely what is being cleared. A more accurate message: "An unexpected error occurred. Clearing cached chart data and restarting — your journal and birth data are preserved."

---

## Implementation Summary

**Modified file:** `src/components/ErrorBoundary.tsx`

Replace `localStorage.clear()` in `handleStartOver` with an explicit enumeration that removes only the cache keys listed above. The list of prefixes and exact keys to clear should be defined as a local constant array within the method (or imported from `appState.ts` if those constants are exported). Prefer importing the existing constants over duplicating the string literals.

Update the fallback paragraph text on line 60 to reflect what is actually cleared vs preserved.

No new files required.

---

## Outcome

**Status:** completed
**Commit:** `5025bb7` on branch `sprint-0022-task-0003-issue-error-boundary-localstorage-clear`

**Changes made:**

- `src/context/appState.ts`: Exported `CHART_RESULTS_CACHE_KEY`, `TRANSIT_RESULTS_CACHE_KEY`, `PARTNER_DATA_CACHE_KEY`, and `SYNASTRY_RESULTS_CACHE_KEY` (previously unexported `const`).
- `src/components/ErrorBoundary.tsx`: Replaced `localStorage.clear()` with targeted removal of the four chart cache keys plus prefix-matching enumeration for `daily-snapshot-` and `advance-today-signal-` keys. Updated the fallback message from "Your chart data is safe." to "Clearing cached chart data and restarting — your journal and birth data are preserved." — accurately reflecting what is removed vs preserved.

Build: clean (`tsc -b && vite build` — 0 errors, 0 warnings).
