**Type:** Feature
**Originated by:** Miyazaki, Carmack, Jobs
**User guidance:** (none)

---

## Problem / Opportunity

Sprint-0007 introduces the first network round-trips this app has ever made. For most operations — fetching the session, loading entries, reading profile data — a brief loading state is acceptable. But for *recording a moment*, it is not.

The Cosmic Journal was designed around a specific emotional contract: you write something, you tap "Record This Moment," and the entry appears instantly. That instant closure is not a convenience — it is the product's central gesture. The composer opens into the present. The entry appears and the sky assembles around it. That sequence must be instantaneous. If the composer hangs open for 800ms while a network call resolves, the spell breaks. The user is no longer inside the moment; they are waiting on infrastructure.

There are two failure modes if we let the server response gate the UI:

1. **Network is slow.** The "Record This Moment" button appears frozen. The user taps again. A duplicate entry is created. Or they close the tab, and the entry is lost.

2. **Network is unreachable.** The composer stays open, the request times out, and the entry is lost. This is the worst possible outcome: a person tried to record something that mattered and the app made it disappear.

Both are unacceptable for a journal. Recording a moment must be unconditionally local-first. The server is the backup, not the gate.

This same concern extends to every write operation in the authenticated path — dream session saves and birth data updates both carry data a user would not want to lose or wait on.

---

## Vision

Recording a moment feels identical to today: instantaneous. The user writes, taps the button, and the composer closes. The entry is in the list. Done. The server sync is invisible on success, and honest on failure — a faint indicator appears on the entry card after a failure, with a tap-to-retry action. On the next app load, any unsynced entries are quietly retried.

The user never sees a spinner on a journal save, a dream session close, or a birth data update. The backend is a silent backup for everything the user has already safely recorded locally.

---

## Specifications

### 1. Current save flow in CosmicJournalPage.tsx handleSubmit

`handleSubmit` (lines 162–202) runs fully synchronously:

1. Constructs a `JournalEntry` object with a client-generated UUID (`crypto.randomUUID()`), the resolved date, numerological day, and a `dreamRef` pointing to a localStorage key if a dream session exists for that date.
2. Prepends the new entry to the existing entries array: `[newEntry, ...entries]`.
3. Calls the module-level `saveEntries()` function (lines 43–53), which calls `localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries))` synchronously.
4. If `saveEntries` returns `'quota'`, it shows a quota error and does **not** close the composer.
5. If the save succeeds, it calls `setEntries(updated)` and `setComposerOpen(false)` — closing the composer and immediately showing the entry in the list.

There is no network call, no async path, and no spinner anywhere in this flow. This must remain true after sprint-0007 for the user experience, even though a background sync is added.

The `saveEntries` function currently catches `QuotaExceededError` by checking `e.name` and `e.message` with string matching (lines 47–49), bypassing the `isQuotaError()` utility already in `src/utils/storage.ts`. This should be corrected to `import { isQuotaError } from '../../utils/storage'` in the same changeset (noted separately in `issue-journal-save-entries-uses-wrong-quota-guard`, but the fix belongs in the same PR as this feature).

### 2. Proposed authenticated save flow

When `useAuth()` returns an authenticated user, `handleSubmit` follows this sequence:

**Step 1 — Write to localStorage synchronously (unchanged from today).**
The entry is constructed and `saveEntries(updated)` is called before any async work begins. If localStorage returns `'quota'`, the quota error is shown and the function returns early — identical to today.

**Step 2 — Close the composer and show the entry immediately.**
`setEntries(updated)` and `setComposerOpen(false)` are called immediately after the synchronous localStorage write succeeds. From the user's perspective, the save is complete. No spinner. No disabled button. No network wait.

**Step 3 — Fire-and-forget background sync.**
A non-awaited async function is called to POST the entry to `/api/entries`. This must be truly fire-and-forget from the user's perspective — it runs after the UI has already updated. The POST body serializes the full `JournalEntry` including the client-generated UUID as `id`, which the server uses as the primary key (enabling idempotent retries with `INSERT OR IGNORE` / `ON CONFLICT DO NOTHING`).

```typescript
// Pseudo-code — actual implementation in authService.ts
void syncEntryToServer(newEntry) // fire and forget
```

**Step 4 — On success: mark entry with `_serverId` in localStorage.**
When the POST returns HTTP 201, the background sync function reads the current entries from localStorage (they may have changed since the save — other entries could have been added), finds the entry by `id`, and sets `_serverId` to the server-confirmed UUID (which will equal the client-generated UUID since the server uses it as the primary key). This confirms the entry is durably persisted server-side.

**Step 5 — On failure: mark entry with `_syncFailed: true` in localStorage.**
When the POST fails (network error, timeout, 5xx), the background sync function marks the entry with `_syncFailed: true` in localStorage. The entry remains fully intact and visible in the list. The faint visual indicator appears on next render (see section 4).

The background sync function must read the entry freshly from localStorage rather than holding a reference to the object passed at save time, because the entry list may have been mutated between the save and the sync completion.

### 3. JournalEntry type extension

`src/components/journal/types.ts` gains two optional sync-state fields appended after `createdAt`:

```typescript
export interface JournalEntry {
  id: string
  date: string
  time: string
  title?: string
  body: string
  tags: JournalTag[]
  numerologicalDay: number
  gptAnnotation: string | null
  dreamRef: string | null
  createdAt: string
  // --- sync state (sprint-0007+) ---
  _serverId?: string        // set after confirmed server persistence; equals id when server uses client UUID as PK
  _syncFailed?: boolean     // true if the most recent background sync attempt failed
}
```

These fields are optional and absent on all existing localStorage entries — the app must treat `_serverId === undefined` as "sync pending or unauthenticated" and `_syncFailed === undefined` as "not yet attempted," never as an error. Unauthenticated users never see sync state indicators; the fields are only consulted when `useAuth()` returns a non-null user.

### 4. JournalEntryCard visual indicator

`JournalEntryCard` reads `entry._syncFailed`. When `true` and the user is authenticated:

- A small dot is rendered in the top-right corner of the card. Dimensions: 6×6px. Color: `rgba(201, 168, 76, 0.35)` — the same mystic-gold palette at low opacity so it is visible but not alarming.
- The dot is not visible on initial render — it appears only after `_syncFailed` is `true`. Entries that have not yet been synced (sync is in flight or has not started) show no indicator, because the sync window is typically under a second and a transient dot would be visually noisy.
- On hover (desktop) or long-press (mobile), a small tooltip appears: "Not yet synced — tap to retry." This uses the existing tooltip pattern in the app (if none exists, a simple `title` attribute is acceptable for v1, with a proper Tooltip component deferred to later).
- Tapping or clicking the dot retries the sync for that single entry by calling the same background sync function used in `handleSubmit`. If the retry succeeds, `_syncFailed` is cleared from localStorage and the dot disappears. If it fails again, `_syncFailed` remains and the dot stays.
- No visual indicator is shown for in-progress syncs. The sync window is imperceptible under normal conditions. Showing a "syncing" state would train users to look for a status indicator that is almost always gone by the time they notice it. Silence is correct for the success path; honesty is correct for the failure path.

### 5. Retry logic on app mount and journal page open

In `CosmicJournalPage`, within the `useEffect` that runs on mount (or a new effect added alongside the existing storage check effect at line 95), when the user is authenticated:

1. Load the current entries from localStorage.
2. Filter for entries where `_syncFailed === true`.
3. Sort the failed entries by `date` ascending (chronological order — oldest first, matching the intent of the data).
4. For each failed entry, call the background sync function sequentially (not concurrently — see section 9 on the concurrent sync guard).
5. Entries that succeed are marked with `_serverId` and `_syncFailed` is cleared; entries that fail again retain `_syncFailed: true` and will be retried on the next mount.

The retry loop must not block the component from rendering or delay the display of entries. It should run after the initial render completes — either via a `setTimeout(fn, 0)` wrapper or by using a `useEffect` with an empty or `[user]` dependency that starts after mount.

### 6. Dream session optimistic save

`DreamModal.tsx` persists session state in the `useEffect` at lines 159–169, which fires whenever `messages`, `dreamContext`, `dreamInput`, or `skyContext` change. This persistence is synchronous via `localStorage.setItem(DREAM_SESSION_KEY, ...)`.

The optimistic save pattern for dream sessions mirrors the journal entry pattern:

- The existing `localStorage.setItem` call is unchanged — local persistence first, always.
- After a successful local write, if the user is authenticated, a fire-and-forget POST to `/api/entries` is made with `kind: 'dream'` and the full session payload serialized into the `metadata` JSONB column (messages, dreamContext, dreamInput, skyContext).
- The dream session key (`dream-session-YYYY-MM-DD`) serves as the client-side identifier. The server entry's `date` field is set to the date embedded in the session key.
- Because dream sessions are updated incrementally (messages accumulate), the server POST for a dream session is a full replacement of the day's dream entry — use `POST /api/entries` with the client-side session key as `id`, and the server uses `INSERT OR REPLACE` / `ON CONFLICT DO UPDATE` semantics to keep the latest full session.
- `_syncFailed` is stored on the dream session object in localStorage using the same field name, enabling the same retry logic on mount.
- No UI changes to DreamModal for in-progress syncs — the modal's existing interaction model (input → loading-sky → loading-dream → chat) is completely unchanged.

### 7. Birth data updates: silent PUT on FormWizard completion

When an authenticated user completes `FormWizard.tsx` and the birth data is submitted (the point at which `dispatch({ type: 'SET_VIEW', view: 'loading' })` fires), a non-awaited `PUT /api/profile` is called via `authService.ts` with the new birth data.

This call is not optimistic in the same sense as journal entries — birth data is not a local-first object with an ID. It is a profile field. The behavior:

- If the PUT succeeds: no UI feedback. Silent success. The server now holds the correct birth data.
- If the PUT fails: a single non-blocking notification appears for 4 seconds using the existing `StorageWarningBanner` infrastructure pattern: "Couldn't save to your account — local copy is safe." It then dismisses itself.
- The form wizard's existing UX flow — the transition to the loading view, the chart calculation — is never delayed by the profile save. The `PUT` is truly fire-and-forget.
- Birth data is not marked with `_syncFailed` in localStorage (it is a single overwrite, not an entry with a persistent ID). If the PUT fails, the next time the user opens the form wizard and submits, it will try again.

### 8. Queue ordering for batch retries

When the mount retry loop (section 5) runs against multiple `_syncFailed` entries, it processes them in chronological order by `entry.date` (ascending — oldest first). Within the same date, entries are ordered by `entry.createdAt`.

This ordering matters because:
- The server `entries` table is queried by `(user_id, kind, date DESC)` — earlier entries establish the record before later entries reference or follow them.
- The `dreamRef` field on journal entries may reference a dream session. Syncing the dream session before or alongside the journal entry that references it prevents the server from receiving a journal entry with a dangling `dreamRef`.

When batching retries, dream sessions (if present in the retry queue) should be synced before journal entries of the same date.

### 9. Concurrent sync guard

Each background sync function call tracks whether a sync attempt is in flight for a given entry `id`. Before initiating a POST:

- Check a module-level `Set<string>` of currently-in-flight entry IDs (e.g., `const syncInFlight = new Set<string>()`).
- If `syncInFlight.has(entry.id)`, return without starting a new request.
- Add `entry.id` to the set before the `fetch` call.
- Remove `entry.id` from the set in the `finally` block of the try/catch.

This guard prevents duplicate POSTs when the mount retry loop fires while a user-initiated retry is already in flight for the same entry. Without it, a user tapping the sync indicator dot while a background retry is running would produce a second concurrent POST for the same entry — which the server handles safely via `ON CONFLICT DO NOTHING`, but which wastes a network request and creates confusing state on the client.

### 10. No spinners on submit buttons

The "Record This Moment" button in `CosmicJournalPage.tsx` (line 443) must never enter a disabled or loading state due to the background sync. Its only disabled condition remains the existing one: `!body.trim() && !entryDate` (line 442). After the synchronous localStorage write succeeds, the button is no longer relevant — the composer is closed.

The "✦ Interpret Dream" button in `DreamModal.tsx` (line 382) controls the GPT interpretation stage, not the session persistence. It must not be affected by sync state.

No component in the journal or dream flows receives a "saving" prop or renders a spinner based on sync state.

### 11. Read path when authenticated: merge on mount

When `CosmicJournalPage` mounts and the user is authenticated, the component performs a merge load:

1. Load entries from localStorage synchronously (as today) — this is the immediate display. The page renders with local entries instantly.
2. In a `useEffect([user])`, fetch `GET /api/entries?kind=journal` from the server.
3. Merge the server response with the localStorage entries using the following rule: for each server entry, if a localStorage entry exists with the same `id`, the server entry wins (it is the authoritative copy) — update the localStorage entry with the server data and set `_serverId` if not already set. If the server has an entry that is not in localStorage (written from another device), add it to localStorage and to the displayed list.
4. If the fetch fails (network error, timeout), the component displays the localStorage entries as-is and does not show an error. The user sees their local data; the merge is silently skipped.
5. The merge must not cause visual flicker. If the server response arrives and the entry list changes, React state is updated with the merged list and the component re-renders — this is acceptable and expected.

This read-path merge is distinct from the write-path optimistic save. It is the mechanism by which entries written on other devices (after full migration) appear on the current device.

---

## Out of Scope

- **Real-time sync across tabs.** If the user has two tabs open and writes an entry in one, it will not appear in the other until reload. `BroadcastChannel` or `StorageEvent` cross-tab coordination is deferred.
- **WebSocket push notifications.** The server does not push entry updates to clients. All sync is pull-on-mount or write-on-save.
- **Offline queue with persistence across sessions.** `_syncFailed` entries survive page reload (they are in localStorage), so they are retried on next mount. But if the user is offline for an extended period and the browser clears localStorage (e.g., in a private window), failed syncs are not guaranteed to survive. A full service-worker offline queue is out of scope.
- **Sync status UI beyond the failure indicator.** There is no sync dashboard, no "last synced at" timestamp displayed to the user, and no pull-to-refresh gesture. The merge on mount is the full read reconciliation story for this sprint.
- **Conflict resolution for edits.** Journal entries are immutable after creation (no edit flow exists). Dream sessions are replaced in full on update. There is no last-write-wins conflict to resolve beyond the merge rule in section 11.

---

## Open Questions

**1. Should in-progress background syncs show any visual indicator?**

The current spec says no — silence during sync, honesty on failure. The alternative would be a tiny pulsing dot (distinct from the failure dot) that appears while the POST is in flight and disappears on success or transitions to the failure state. Arguments for:

- Users on slow connections would have confirmation that something is happening.
- The dot disappearing on success provides positive reinforcement.

Arguments against:

- On a normal connection, the POST resolves in under 500ms. A dot that appears and immediately vanishes is more distracting than reassuring.
- Miyazaki's voice is explicit: "The right behavior: save to localStorage first, immediately. Close the composer. The entry appears in the list. Then, in the background, sync to the server." The silence of a successful background operation is the intended experience.
- Adding a "syncing" visual state requires managing three states per entry (syncing / synced / failed) instead of two (synced / failed), which adds complexity to `JournalEntryCard` and `JournalEntry` type for a case the user rarely sees.

**Recommendation:** ship with no in-progress indicator. If users or telemetry show confusion about sync state on slow connections, add a subtle pulsing dot in a follow-up. Keep the initial implementation honest only on failure.

**2. Should `_syncFailed` be cleared on successful merge from server read path?**

If an entry with `_syncFailed: true` appears in the server's `GET /api/entries?kind=journal` response on mount (e.g., because the server actually did receive and store it despite the client failing to get a 201), the merge in section 11 should clear `_syncFailed` and set `_serverId`. The client must not show a failure indicator for entries the server already holds. This is the correct behavior and should be explicitly implemented in the merge logic — check the server response for each `_syncFailed` entry and reconcile accordingly.
