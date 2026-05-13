# feat-localstorage-migration-flow

**Type:** Feature
**Originated by:** Jobs, Carmack, Miyazaki, Taleb (all four flagged this)
**User guidance:** (none)

---

## Problem / Opportunity

Six sprints of building have created a product that accumulates something irreplaceable: a person's private record of their life against the sky. Cosmic Journal entries. Dream sessions. The birth data at the center of everything. All of it lives in a single browser's localStorage, tied to one device, one browser profile, one storage quota.

Sprint-0006 shipped a quota guard — a warning that localStorage was filling up. That is a bandage, not a cure. The real problem is structural: when a user creates an account in a browser that already holds their history, the app has one moment to bridge the two worlds. That moment is the migration offer.

Done poorly, this moment feels like a technical interruption. A dialog box asking whether to "upload" data sounds like a backup utility, not a personal astrology companion. The user who has been faithfully recording 40 entries over four months deserves something better than "Upload? [Yes] [Skip]."

Done well, this moment is the product's first act of genuine care. The app recognizes what's already here, names it, and asks — warmly, without urgency — whether the user would like to bring it with them.

The migration offer is not a data engineering problem. It is a trust problem. The engineering makes it safe. The language and design make it worth trusting.

---

## Vision

The emotional arc of the migration flow runs through four beats:

**Recognition.** Immediately after a successful login or registration, the app scans localStorage for the user's history. It finds 34 journal entries, 12 dream sessions, a birth chart. It does not silently discard them. It does not automatically upload them. It pauses.

**Welcome.** A warm, full-presence panel appears — not a modal warning, not a dismissible toast. Something that fills the space appropriately for the significance of what it's offering. The copy names what was found: not "local data detected" but the user's actual record: their journal, their dreams, their chart. The tone is the app's voice, not a system dialog's voice.

**Transition.** The user chooses to bring their history. The app carries it — visibly, honestly, without technical vocabulary. "Carrying your journal..." and a count that climbs. The same spinning ✦ the chart loading screen uses. Not a progress bar with percentages. Not a spinner that could mean anything. A narrative.

**Arrival.** "Your history is yours." The data is on the server. The user is home. localStorage becomes a quiet backup, never cleared, available offline. The authenticated reads go to the server first; localStorage is there when the network isn't.

If anything goes wrong mid-way, the user hears: "Something went wrong — your data is still safe on this device. Try again when you're ready." The data was never in danger. The local copy was never touched until the server confirmed receipt.

---

## Specifications

### 1. Migration trigger conditions

Migration detection runs immediately after a successful login or register response — before the app shell renders its main view. The trigger fires if **all** of the following are true:

- `localStorage.getItem('cosmic-journal-entries')` returns a non-empty array, **or** any key matching `dream-session-YYYY-MM-DD` exists in localStorage, **or** `localStorage.getItem('astral-chart-birth-data')` returns a valid `BirthData` object with `date` and `city` populated
- At least one of those entries does **not** have a `_serverId` marker (i.e., has not been confirmed by the server in a previous migration)

If all detected entries already have `_serverId` markers, migration is considered complete and the panel is skipped entirely.

### 2. Detection function in `authService.ts`

```ts
interface MigrationCandidate {
  journalCount: number       // entries in 'cosmic-journal-entries' without _serverId
  dreamCount: number         // dream-session-* keys without _serverId in their stored session
  hasBirthData: boolean      // 'astral-chart-birth-data' present with date + city
}

function detectUnmigratedLocalData(): MigrationCandidate
```

Implementation detail: scan all localStorage keys for the `dream-session-` prefix using `DREAM_SESSION_KEY_PREFIX` from `appState.ts`. Parse each value and check for a top-level `_serverId` field. Journal entries are read from `JOURNAL_STORAGE_KEY = 'cosmic-journal-entries'` and filtered to those lacking `_serverId`.

This function is synchronous and runs on the client only. It never touches the network. Its result drives whether the migration panel is shown.

### 3. Migration offer component: `MigrationOfferPanel`

**What it is not:** a modal dialog, a toast notification, a warning banner.

**What it is:** a full-screen warm overlay (same visual layer as the chart loading screen) or, on desktop, a generous inset panel occupying the center of the viewport with a dark charcoal background and subtle gold border. It appears before the main app shell renders, so the user sees it before any other content.

**Copy:**

Primary heading (font-heading, mystic-gold):
> Your journal, birth data, and dream sessions live on this device.
> Would you like to carry them with you?

Supporting line (text-mystic-muted, small):
> [N journal entries, N dream sessions, your chart] — all waiting.

(The supporting line is generated dynamically from the `MigrationCandidate` result. If journalCount is 0, it omits journal entries. If dreamCount is 0, it omits dream sessions. If hasBirthData is false, it omits the chart.)

**Buttons:**

- Primary: `Keep my history ✦` — full-width, gold background, mystic-bg text, font-heading. This initiates migration.
- Secondary: `Start fresh` — muted, text-only or minimal border, no gold. Does NOT delete local data (see section 10). Opens the app with a clean server account; local data remains untouched and accessible offline.

**Vocabulary constraints — nowhere in the UI should these words appear:**
- "upload"
- "sync"
- "database"
- "localStorage"
- "batch"
- "server"
- "backup"

Use instead: "carry," "bring," "keep," "your history," "your record."

### 4. `dreamRef` type change (forward-compatible schema)

**Current state:** `JournalEntry.dreamRef` in `src/components/journal/types.ts` is typed as `string | null`, storing a raw localStorage key (`dream-session-YYYY-MM-DD`).

**Problem:** When journal entries migrate to the server, this field becomes a dangling reference. On a new device, `localStorage.getItem('dream-session-2025-10-14')` returns null and the link is silently broken.

**New type:**

```ts
export type DreamRef =
  | { type: 'local'; key: string }    // legacy localStorage key — e.g. 'dream-session-2025-10-14'
  | { type: 'server'; id: string }    // UUID of the dream entry on the server
  | null

export interface JournalEntry {
  // ... existing fields unchanged ...
  dreamRef: DreamRef
}
```

**Backward compatibility:** Existing localStorage entries store `dreamRef` as a plain string. The migration code reads these and converts them to `{ type: 'local', key: dreamRef }` before uploading to the server. New entries written by authenticated users store `{ type: 'server', id: uuid }` after the dream session has been uploaded. New entries by unauthenticated users store `{ type: 'local', key: 'dream-session-YYYY-MM-DD' }` as before.

This change is made **before** any entries are sent to the server — the converted type travels in the POST body. The server schema stores `dreamRef` inside the `metadata` JSONB column; no server-side type constraint is needed.

### 5. Migration sequence

When the user taps "Keep my history ✦", the following steps run in order. Each step is independently retriable (see section 7 on idempotency).

**Step 1 — Birth data (if present):**
`PUT /api/profile` with `{ birthDate, birthTime, birthPlace, fullName }` derived from `astral-chart-birth-data` in localStorage. If the server already has birth data for this user (from the registration form), the PUT merges: server fields that are non-null take precedence, but locally-present fields that are missing on the server are filled in.

**Step 2 — Dream sessions:**
Scan all `dream-session-YYYY-MM-DD` keys in localStorage. For each session, construct an entry with:
- `id`: the session's existing `_serverId` if already migrated (idempotent skip), or `crypto.randomUUID()` generated once and stored back to localStorage on that session as `_pendingServerId`
- `kind`: `'dream'`
- `date`: extracted from the key suffix
- `body`: the session's `dreamContext` field (the full prompt context string)
- `metadata`: `{ messages: session.messages, dreamInput: session.dreamInput, skyContext: session.skyContext }`

Batch `POST /api/entries` with all dream entries. Server uses `ON CONFLICT (id) DO NOTHING`.

**Step 3 — Journal entries:**
Read `cosmic-journal-entries` from localStorage. For each entry:
- Convert `dreamRef` string to `DreamRef` type (see section 4)
- If `dreamRef.type === 'local'` and that dream session was uploaded in Step 2, update `dreamRef` to `{ type: 'server', id: uploadedDreamUUID }`
- Strip `_serverId` and `_pendingServerId` from the POST body (these are client-side markers)
- `id` field from `JournalEntry` travels as the POST body `id` — used as primary key on the server via `ON CONFLICT (id) DO NOTHING`

Batch `POST /api/entries` with all journal entries.

### 6. Idempotency

The client-generated UUID already present on every `JournalEntry` as `entry.id` (created via `crypto.randomUUID()` in `handleSubmit` in `CosmicJournalPage.tsx`) is sent as the `id` field in the POST body. The server's entries table uses `id UUID PRIMARY KEY` — **not** `DEFAULT gen_random_uuid()`. The client supplies the UUID. The server uses:

```sql
INSERT INTO entries (id, user_id, kind, date, body, metadata, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (id) DO NOTHING;
```

This means any number of retries — from network drops, page refreshes mid-migration, or explicit "try again" taps — will never create duplicates. The migration is safe to run repeatedly until it fully succeeds.

For dream sessions (which currently have no UUID), a `_pendingServerId` is generated on the client and written back to localStorage before the POST. On retry, the stored `_pendingServerId` is reused as the `id` in the POST body.

### 7. Progress display

When migration is running, the `MigrationOfferPanel` transitions to a progress state. No percentage bar. No numeric countdown. A narrative sequence:

```
✦  Carrying your journal...
   Carrying 34 entries...

✦  Carrying 12 dream sessions...

✦  Carrying your chart...

✦  Done. Your history is yours.
```

Each line appears sequentially as each server batch completes. The ✦ glyph uses the same slow pulse/rotation CSS animation as the chart loading screen. The text is `font-heading`, gold, centered. There is no cancel button during upload — the operation is fast enough (a few seconds) and safe enough (localStorage untouched) that interrupting it mid-stream adds no value.

If the upload stalls beyond 10 seconds without completing, a "This is taking longer than expected" note appears below the spinner. The retry option becomes available after 15 seconds without completion.

### 8. Success path — localStorage retention policy

After the server returns HTTP 200/201 for all batches:

- **Do not delete localStorage entries.** Ever. Not immediately, not after a delay.
- Mark each migrated journal entry in localStorage with `{ ..., _serverId: entry.id }`. The `_serverId` marker equals the entry's UUID (since the client UUID is also the server UUID — they are the same).
- Mark each migrated dream session in localStorage with a top-level `_serverId` field.
- Mark birth data in localStorage with a top-level `_serverSynced: true` flag on the stored object.

**Post-migration read behavior:**

- Authenticated journal reads go to `GET /api/entries?kind=journal` first
- On network failure or timeout, fall back to localStorage — filter to all entries, whether or not they have `_serverId`
- Dream sessions follow the same pattern: server-first when authenticated, localStorage as offline fallback
- Birth data: `LOAD_BIRTH_DATA_FROM_SERVER` action overwrites reducer state on login (does not re-persist to localStorage)

localStorage becomes a read-only offline cache. Its entries atrophy gracefully as the server becomes the source of truth. There is no cleanup pass, no scheduled clear, no "are you sure you want to delete your local backup" prompt.

### 9. Failure handling

If **any** step in the migration sequence fails (network timeout, 4xx, 5xx, or JS exception):

1. The currently-running batch stops. **No partial writes are rolled back** — partial writes are safe because the operation is idempotent.
2. The progress display transitions to a failure state:

> Something went wrong — your data is still safe on this device.
> Try again when you're ready.

A `Try again` button re-initiates the migration sequence from the beginning. Because of idempotency, re-running is completely safe — already-uploaded entries are silently skipped by the server.

The failure message does not include: HTTP status codes, error messages from the server, "upload failed," or any technical vocabulary. The only guarantee the user needs to hear is the one that matters: their data was not harmed.

If the failure is clearly a network issue (fetch threw `TypeError: Failed to fetch` or timed out via `AbortController`), the failure message adjusts slightly:
> We couldn't reach the server — your data is still safe on this device.
> Try again when you're back online.

### 10. "Start fresh" path

When the user taps `Start fresh`:

- The migration panel closes
- The user enters the app with a clean server account (no birth data, no journal entries on the server yet)
- **localStorage is not touched.** All existing entries, dream sessions, and birth data remain in localStorage exactly as they were
- The local data remains accessible in unauthenticated mode — or if the user signs out and uses the app without logging in, everything from localStorage is still present as before
- A quiet `_migrationDeclined: true` flag is written to localStorage so the migration offer does not re-appear on subsequent logins in this browser (unless the user explicitly asks to try again from account settings)

"Start fresh" is not "discard my history." It is "I choose to keep my local history local for now." The data is never at risk.

### 11. Dream session discovery

To enumerate all dream sessions in localStorage:

```ts
const dreamKeys: string[] = []
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i)
  if (key && key.startsWith(DREAM_SESSION_KEY_PREFIX)) {
    dreamKeys.push(key)
  }
}
```

`DREAM_SESSION_KEY_PREFIX = 'dream-session-'` is already exported from `src/context/appState.ts`. Each key's date is extracted by stripping the prefix: `key.slice(DREAM_SESSION_KEY_PREFIX.length)`.

Each dream session value is a JSON-serialized `DreamSession` object:
```ts
interface DreamSession {
  messages: ChatMessage[]
  dreamContext: string
  dreamInput: string
  skyContext?: SkyContext
}
```

Sessions with zero messages are skipped — they represent an opened-but-unused dream modal with no actual content.

Note on the module-level `DREAM_SESSION_KEY` constant in `DreamModal.tsx` (line 18): this evaluates to today's date at module load time and is used for **writing** the current session only. Migration reads all keys dynamically via the prefix scan above, not via this constant.

### 12. Post-migration read architecture

After migration completes, authenticated reads follow this priority order:

1. `GET /api/entries?kind=journal` (server) — primary source for authenticated users
2. Merge with localStorage entries that have no `_serverId` marker (entries created offline while authenticated, not yet synced)
3. On network failure: fall back to full localStorage read

The dual-read merge in step 2 handles the optimistic-write pattern (sprint proposal `feat-optimistic-journal-save`): entries are written to localStorage synchronously on save and synced to the server in the background. Until the background sync confirms, they exist only in localStorage and must be included in the merged read.

Server entries are the canonical source; localStorage is never preferred over a successfully-fetched server response.

---

## Files Affected

- `src/components/journal/types.ts` — add `DreamRef` union type; change `JournalEntry.dreamRef` from `string | null` to `DreamRef`
- `src/context/appState.ts` — no structural changes required; `DREAM_SESSION_KEY_PREFIX` already exported; migration detection reads from existing keys
- `src/services/authService.ts` (new) — `detectUnmigratedLocalData()` and `runMigration()` functions live here
- `src/components/auth/MigrationOfferPanel.tsx` (new) — the full-screen warm migration UI component
- `src/components/dream/DreamModal.tsx` — no changes to core logic; migration reads sessions from localStorage using existing `DreamSession` shape
- `src/components/journal/CosmicJournalPage.tsx` — `saveEntries()` should import `isQuotaError` from `src/utils/storage.ts` (currently reimplements quota detection inline at lines 48–50 via string matching — a one-line fix)
- `server/routes/entries.ts` — `POST /api/entries` uses `ON CONFLICT (id) DO NOTHING`; `id` is client-supplied UUID, not server-generated

---

## Out of Scope

- **Partner / synastry data migration.** Partner birth data stored under `astral-chart-partner-data` is session-specific by nature. It is not migrated in this flow. Partner data migration belongs in a later sprint once synastry has been assigned server-side persistence.
- **Automatic background sync without user consent.** The migration offer is always a conscious user choice. The app does not silently upload localStorage data on first login without presenting the panel.
- **Deleting localStorage.** At no point in this flow — success, failure, or "start fresh" — is any localStorage key removed. The local data is never the casualty.
- **Post-migration localStorage cleanup UI.** A "clear local backup" option in account settings is a reasonable future addition but is not part of this flow.
- **Multi-account support.** If two users share a browser, the dream session localStorage key collision (flagged by Taleb in the voices: `dream-session-YYYY-MM-DD` has no user prefix) is a known limitation. The fix — scoping dream session keys to user ID — belongs in `issue-dream-session-key-scope` and is not addressed here.

---

## Open Questions

1. **Timing: before or after the app shell loads?** The migration panel currently assumes it appears before the main app shell renders — replacing the initial loading screen. An alternative: load the app shell first and render the migration panel as an overlay. The risk of the latter: some users see their journal momentarily (from localStorage) before the migration offer appears, which may create confusion about whether migration is even necessary if the data appears to already be there. The former approach — intercept before shell render — is cleaner but requires the auth token validation to complete before `App.tsx` renders any views. The two-phase initialization approach described in the Carmack voice (load from localStorage first, then dispatch `LOAD_BIRTH_DATA_FROM_SERVER` after auth validates) makes this tractable: the migration check fires in the auth context's `useEffect` after the `GET /api/auth/me` call succeeds, and the panel is gated by an `isMigrationPending` flag in `AuthContext`.

2. **What if the user has data but registers for the first time vs. logs into an existing account?** The migration offer is identical in both cases — the detection is purely based on unsynced localStorage data, regardless of whether the account is new or returning. On a returning login in a fresh browser (no localStorage data), the migration panel is skipped entirely. On a login in a browser with data that was fully migrated previously (all entries have `_serverId`), the panel is also skipped.
