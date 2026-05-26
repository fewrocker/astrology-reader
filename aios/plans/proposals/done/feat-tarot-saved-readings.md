# Proposal: Saved Readings Feature

- **Slug:** `tarot-saved-readings`
- **Type:** Feature
- **Filename:** `feat-tarot-saved-readings.md`
- **Originated by:** Carmack, Miyazaki, Jobs, Taleb
- **Status:** Active

---

## User Guidance

From `aios/guidelines.md` — Saved Readings & Journal:

> Users should be able to:
> Save readings
> Revisit readings later
> Compare readings across time
> Attach readings to Cosmic Journal entries
>
> The Tarot module should naturally integrate into the broader self-reflection ecosystem of the app.

And from the Subscription Layer section:

> Advanced
> Saved readings
> Tarot journal integration

This is the canonical product intention. Everything in this proposal answers to it.

---

## Problem / Opportunity

Every reading in the current Tarot module (as planned) is ephemeral. The user draws the Hermit during a Mercury retrograde, reads the synthesis, closes the app — and the encounter is gone. There is no record. There is no way to return. There is no library of personal symbolic history.

This is a product gap with two concrete consequences.

First, it eliminates a primary retention vector. The daily single-card reading has strong pull if users can build a visible streak of draws. The three-card reading has long-tail value if users can revisit "the reading that called it" three months later when what it described actually landed. Without saving, both vectors are disabled. The reading is consumed and discarded, like a fortune cookie.

Second, it eliminates the app's most honest differentiator: personalization over time. One reading is a moment. A library of readings — timestamped against the sky, anchored to the user's stated intentions — is a symbolic autobiography. This is what separates a Tarot app with depth from one that is merely technically correct.

The opportunity is to build this persistence layer right the first time, with a schema designed for evolution and a UI that frames saved readings as a personal collection rather than a database view.

---

## Vision

A saved reading is not a database row. It is a card in a growing personal collection — a snapshot of a symbolic encounter, timestamped not just by calendar date but by where the moon was, what the sky said, and what the user was holding in their mind when they drew.

`SavedReadingsPage.tsx` is a library, not a log. The visual register is closer to a shelf of meaningful objects than a scrollable list of timestamped records. Each entry carries the primary card's symbol, the moon phase glyph from that day, the reading type, and a fragment of the user's stated intention. Opening a saved reading is re-entering the moment — not just replaying data, but being told: "You drew this card fourteen days ago, on a Waxing Gibbous Moon."

The schema that makes this possible must be robust from the first migration. As Taleb notes in his risk review: the interpretation payload shape will evolve over the course of the sprint and across future sprints. Old records must be identifiable, readable, and transformable. A `schema_version` column added retroactively is a migration headache. One added from day one is free insurance.

---

## Specifications

### 1. DB Schema — `readings` Table

The `readings` table is added in `server/db.ts` inside the main `instance.exec()` block, following the established pattern of `entries` and `gpt_usage`. Foreign keys are enabled globally via `PRAGMA foreign_keys = ON`.

```sql
CREATE TABLE IF NOT EXISTS readings (
  id                      TEXT PRIMARY KEY,
  user_id                 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reading_type            TEXT NOT NULL CHECK (reading_type IN ('single', 'three', 'celtic')),
  spread_mode             TEXT,
  cards                   TEXT NOT NULL,
  intent                  TEXT,
  synthesis               TEXT NOT NULL,
  schema_version          INTEGER NOT NULL DEFAULT 1,
  journal_entry_id        TEXT REFERENCES entries(id) ON DELETE SET NULL,
  created_at              TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_readings_user_created
  ON readings(user_id, created_at DESC);
```

**Column-by-column rationale:**

- `id TEXT PRIMARY KEY` — client-generated UUID (same pattern as `entries`), sent in the POST body. This makes the save operation idempotent: a double-submit on a slow network does not create duplicates.
- `user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE` — cascade deletes so that removing a user account removes all their readings without leaving orphaned rows.
- `reading_type TEXT NOT NULL CHECK (...)` — enforced at the DB layer, not just the application layer. The constraint prevents a migration bug from creating readings with unknown types that silently fail to render.
- `spread_mode TEXT` — nullable because single-card readings have no spread mode. For three-card readings: one of `'past-present-future'`, `'situation-challenge-advice'`, `'mind-heart-action'`, `'self-other-bridge'`, `'theme-shadow-gift'`. For Celtic Cross: `'celtic-cross'` (stored for forward compatibility when additional full spreads are added).
- `cards TEXT NOT NULL` — JSON array of drawn cards with reversal states. Stored separately from `synthesis` so the list endpoint can optionally read just the first card name without deserializing the full synthesis blob.
- `intent TEXT` — the user's stated intention or question at the time of the reading. Nullable: users who tap "Skip and draw" have no intent. Stored verbatim, not truncated — the full text is a meaningful artifact.
- `synthesis TEXT NOT NULL` — the tagged-union payload (see specification 5). Stores both the AI-free instant interpretation data and, if available, the GPT synthesis. The full blob. This column is the large one for Celtic Cross (20–30 KB).
- `schema_version INTEGER NOT NULL DEFAULT 1` — see specification 4 for the extended rationale. Set `NOT NULL DEFAULT 1` from the first migration so every row always carries a version. There is no version-zero state.
- `journal_entry_id TEXT REFERENCES entries(id) ON DELETE SET NULL` — optional link to a `CosmicJournal` entry. When the journal entry is deleted, this column is set to NULL (not cascaded to delete the reading). The reading outlives the journal entry. The UI must handle `journal_entry_id = null` as a normal, non-error state.
- `created_at TEXT NOT NULL DEFAULT (datetime('now'))` — ISO 8601 datetime string in UTC. Used for display ("fourteen days ago") and for list ordering.

The index on `(user_id, created_at DESC)` covers the primary list query pattern: all readings for a user, newest first.

---

### 2. Why `schema_version` From Day One

Taleb's fragility concern is specific and warranted. The `synthesis` column stores the full interpretation payload as a JSON blob. This payload is defined by TypeScript interfaces — `InstantInterpretation`, `AstroConnection`, `ThreeCardSynthesis`, `GPTSynthesisResult` — that will change as the Tarot module matures.

Sprint 0023 ships `schema_version: 1`. When sprint 0024 (or a future sprint) restructures `AstroConnection` to add a new field, or renames `transitInfluence` to `transitNote`, old saved readings will have the old shape. Without a version column, the deserializer has two options: crash, or silently produce garbage. With a version column, the deserializer does this:

```typescript
function deserializeSynthesis(raw: string): ReadingPayload {
  const tagged = JSON.parse(raw) as { version: number; payload: unknown };
  if (tagged.version === 1) return migrateV1toLatest(tagged.payload);
  if (tagged.version === 2) return migrateV2toLatest(tagged.payload);
  // ...
}
```

Each migration function is a pure function: input shape → output shape. Old readings are transformed on read, not in a bulk migration. This is the correct pattern for a user-content database where bulk migrations can corrupt years of saved data in one bad deploy.

The existing `entries` table does not have this column. It has suffered for it — the metadata column for synastry cache entries carries an implicit version encoded as `SYNASTRY_CACHE_VERSION = 2` in `appState.ts`, a version signal that lives in the client rather than the database. That pattern is fragile: if a user clears app state, the version is lost. The `readings` table will not inherit this debt.

Adding `schema_version` to an existing table requires an `ALTER TABLE ... ADD COLUMN` migration. Adding it at table creation costs nothing. This is the only moment it is free.

---

### 3. Server Route — `server/routes/readings.ts`

A new file following the pattern of `server/routes/entries.ts`. Registered in `server/index.ts` as `app.use('/api/readings', readingsRouter)` alongside the other route registrations.

**Full module structure:**

```typescript
import { Router, Request, Response } from 'express';
import { getDb } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { writeRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();
router.use(requireAuth);
```

All four endpoints follow the `requireAuth` pattern. The subscription gate check (Advanced-only) is enforced per-endpoint for `POST` and `GET` — see specification 9.

---

### 4. POST /api/readings — Save a Reading

**Purpose:** Persist a completed reading.

**Required fields in request body:**

| Field | Type | Validation |
|---|---|---|
| `id` | `string` | Client-generated UUID. Required. Must be unique per user. |
| `readingType` | `'single' \| 'three' \| 'celtic'` | Required. Must match enum. |
| `cards` | `object[]` | Required. Non-empty array. Each element: `{ cardId: string, reversed: boolean }`. |
| `synthesis` | `object` | Required. Tagged union `{ version: 1, payload: ReadingPayload }`. |
| `spreadMode` | `string \| null` | Required for `three` and `celtic`. Null for `single`. |
| `intent` | `string \| null` | Optional. Stored verbatim if present. |

**Validation logic:**

```typescript
router.post('/', writeRateLimiter, (req: Request, res: Response): void => {
  const { userId, user } = req as AuthenticatedRequest;

  // Subscription gate: saved readings is Advanced-only
  if (user.subscription_tier !== 'advanced') {
    res.status(403).json({ error: 'subscription_required', feature: 'saved_readings' });
    return;
  }

  const { id, readingType, spreadMode, cards, intent, synthesis } = req.body;

  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'id is required' });
    return;
  }
  if (!['single', 'three', 'celtic'].includes(readingType)) {
    res.status(400).json({ error: 'readingType must be single, three, or celtic' });
    return;
  }
  if (!Array.isArray(cards) || cards.length === 0) {
    res.status(400).json({ error: 'cards must be a non-empty array' });
    return;
  }
  if (!synthesis || typeof synthesis !== 'object' || typeof synthesis.version !== 'number') {
    res.status(400).json({ error: 'synthesis must be a tagged-union object with version' });
    return;
  }
  if ((readingType === 'three' || readingType === 'celtic') && !spreadMode) {
    res.status(400).json({ error: 'spreadMode is required for three-card and celtic readings' });
    return;
  }

  const db = getDb();

  db.prepare(`
    INSERT OR IGNORE INTO readings
      (id, user_id, reading_type, spread_mode, cards, intent, synthesis, schema_version)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    id,
    userId,
    readingType,
    spreadMode ?? null,
    JSON.stringify(cards),
    intent ?? null,
    JSON.stringify(synthesis)
  );

  res.status(201).json({ id, saved: true });
});
```

`INSERT OR IGNORE` makes the endpoint idempotent. A double-submit on a retry does not create a duplicate and does not return an error — it returns `{ id, saved: true }` as though it succeeded. The client can safely retry on network failure.

---

### 5. GET /api/readings — List Slim Objects

**Purpose:** Return the list view data for `SavedReadingsPage.tsx`. The list must be fast and must not deserialize the full synthesis blob for every row.

The response payload for each item is a "slim" object computed from stored columns plus minimal cards deserialization (first card name only):

```typescript
router.get('/', (req: Request, res: Response): void => {
  const { userId, user } = req as AuthenticatedRequest;

  if (user.subscription_tier !== 'advanced') {
    res.status(403).json({ error: 'subscription_required', feature: 'saved_readings' });
    return;
  }

  const limit = Math.min(parseInt((req.query.limit as string) ?? '50', 10), 100);
  const offset = parseInt((req.query.offset as string) ?? '0', 10);

  const db = getDb();
  const rows = db.prepare(`
    SELECT id, reading_type, spread_mode, cards, intent, created_at
    FROM readings
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, limit, offset) as ReadingListRow[];

  const total = (db.prepare(
    'SELECT COUNT(*) as count FROM readings WHERE user_id = ?'
  ).get(userId) as { count: number }).count;

  const items = rows.map(row => {
    const cards = JSON.parse(row.cards) as Array<{ cardId: string; reversed: boolean }>;
    const firstCardId = cards[0]?.cardId ?? null;
    const intentPreview = row.intent ? row.intent.slice(0, 60) : null;
    return {
      id: row.id,
      readingType: row.reading_type,
      spreadMode: row.spread_mode,
      createdAt: row.created_at,
      firstCardId,
      intentPreview,
    };
  });

  res.json({ items, total, limit, offset });
});
```

**Key design decisions:**

- `synthesis` is not fetched in this query. The column is excluded from the SELECT. Celtic Cross blobs can reach 20–30 KB; loading 50 of them on the list view would be 1–1.5 MB of deserialization on every page load, with zero benefit since the list only displays the first card name.
- `firstCardId` is a card slug (e.g., `'the-hermit'`). The client resolves the display name from the local card data layer — no round-trip required and no redundant storage of card names in the DB.
- `intentPreview` is truncated at 60 characters server-side. The full intent is available in the detail view. Truncation is a display concern, not a query concern.
- Pagination via `limit` / `offset` with a max cap of 100 items per request. The `total` count enables the client to show "12 of 47 readings" if desired and to detect when all items have been loaded.

---

### 6. GET /api/readings/:id — Full Payload On Demand

**Purpose:** Return the complete reading payload for the detail view. Called only when the user taps a saved reading.

```typescript
router.get('/:id', (req: Request, res: Response): void => {
  const { userId, user } = req as AuthenticatedRequest;
  const { id } = req.params;

  if (user.subscription_tier !== 'advanced') {
    res.status(403).json({ error: 'subscription_required', feature: 'saved_readings' });
    return;
  }

  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM readings WHERE id = ? AND user_id = ?'
  ).get(id, userId) as ReadingRow | undefined;

  if (!row) {
    res.status(404).json({ error: 'Reading not found' });
    return;
  }

  res.json({
    id: row.id,
    readingType: row.reading_type,
    spreadMode: row.spread_mode,
    cards: JSON.parse(row.cards),
    intent: row.intent,
    synthesis: JSON.parse(row.synthesis),
    schemaVersion: row.schema_version,
    journalEntryId: row.journal_entry_id,
    createdAt: row.created_at,
  });
});
```

The `AND user_id = ?` clause in the query is critical: it prevents a user from fetching another user's reading by guessing a UUID. Ownership is enforced at the DB query level, not just via middleware session checks.

---

### 7. DELETE /api/readings/:id — Hard Delete

**Decision: Hard delete, not soft delete.**

Rationale: The `entries` table uses hard delete and this is the established pattern. Soft delete requires a `deleted_at` column, a filter on every read query, and a periodic cleanup job. For user-initiated reading deletion, there is no recovery need and no audit requirement. If the user deletes a reading, it is gone. This matches the `entries.ts` precedent and avoids the complexity of soft-delete filtering in the list and detail endpoints.

```typescript
router.delete('/:id', writeRateLimiter, (req: Request, res: Response): void => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;

  const db = getDb();
  const row = db.prepare(
    'SELECT id, user_id FROM readings WHERE id = ?'
  ).get(id) as Pick<ReadingRow, 'id' | 'user_id'> | undefined;

  if (!row) {
    res.status(404).json({ error: 'Reading not found' });
    return;
  }
  if (row.user_id !== userId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  db.prepare('DELETE FROM readings WHERE id = ?').run(id);
  res.json({ ok: true });
});
```

The `journal_entry_id` FK has `ON DELETE SET NULL`, not `ON DELETE CASCADE`, so deleting a reading does not affect the linked journal entry. Deleting a journal entry sets the reading's `journal_entry_id` to null and does not delete the reading. These are independent objects that can reference each other but do not own each other.

---

### 8. Tagged-Union Payload Structure

The `synthesis` column stores a versioned tagged union. The outer envelope is always:

```typescript
interface TaggedSynthesis {
  version: number;   // currently 1; incremented when payload shape changes
  payload: ReadingPayload;
}
```

For `schema_version: 1`, `ReadingPayload` is a discriminated union:

```typescript
type ReadingPayload =
  | SingleCardPayload
  | ThreeCardPayload
  | CelticCrossPayload;

interface SingleCardPayload {
  type: 'single';
  card: DrawnCard;                       // { cardId, reversed }
  instantInterpretation: InstantInterpretation;
  gptSynthesis: string | null;           // null if GPT was unavailable when saved
  astroContextSnapshot: AstroSnapshot;
}

interface ThreeCardPayload {
  type: 'three';
  spreadMode: string;
  cards: DrawnCard[];
  instantInterpretations: InstantInterpretation[];
  aiFreeSynthesisSkeleton: ThreeCardSynthesis;
  gptSynthesis: string | null;
  astroContextSnapshot: AstroSnapshot;
}

interface CelticCrossPayload {
  type: 'celtic';
  cards: DrawnCard[];
  instantInterpretations: InstantInterpretation[];
  gptSynthesis: string | null;
  astroContextSnapshot: AstroSnapshot;
}

interface AstroSnapshot {
  natalFingerprint: string;  // e.g. "Sun Scorpio Moon Pisces ASC Virgo"
  transitSnapshotDate: string; // ISO date of the reading
  lunarPhase: string;          // e.g. "Waxing Gibbous"
  lunarSign: string;           // e.g. "Taurus"
  numerologyDay: number;
  advanceCategory: string | null;
}
```

The `gptSynthesis` field is nullable at the moment of saving. A user may save a reading before GPT synthesis has returned (network was slow, they didn't want to wait). The instant interpretation is always present. The reading is still valid and displayable without the GPT text.

The `astroContextSnapshot` is stored with the reading so that when the user revisits it months later, the display can say "this was drawn during a Waxing Gibbous Moon in Taurus" without querying the transit engine for a historical date. The snapshot is a display artifact, not a re-computation input.

---

### 9. Client-Side API Calls and Cache Invalidation

The client exposes three functions from `src/services/readingsService.ts`:

```typescript
// Save a reading — returns the saved reading ID or throws
saveReading(payload: SaveReadingRequest): Promise<{ id: string; saved: boolean }>

// Fetch slim list — called on SavedReadingsPage mount
listReadings(limit?: number, offset?: number): Promise<ReadingsListResponse>

// Fetch full detail — called when user taps a saved reading card
getReading(id: string): Promise<FullReadingResponse>

// Delete — called from the reading detail view
deleteReading(id: string): Promise<{ ok: boolean }>
```

**Cache invalidation policy:**

The slim list is held in `TarotContext` as `savedReadingsList: SlimReading[]`. After a successful `saveReading()` call, the list is invalidated by prepending the new slim reading to the front of the cached list (optimistic update) and setting a `listStale` flag. On next visit to `SavedReadingsPage`, a stale flag triggers a fresh GET. This avoids a full re-fetch on every save while keeping the list accurate.

After a successful `deleteReading()` call, the item is removed from the cached list immediately (optimistic removal). If the DELETE fails, the item is restored and an error toast is shown.

Full reading payloads from `getReading()` are cached per-id in a `Map<string, FullReadingResponse>` inside `TarotContext`. The cache is not invalidated between sessions — the reading content does not change after it is saved. If the user deletes and re-saves a reading (same id), the cache entry is evicted on delete.

---

### 10. `SavedReadingsPage.tsx` — UI for the List

The page lives at `src/components/tarot/SavedReadingsPage.tsx`. It is reachable from `TarotPage.tsx` via a "Your Readings" tab or button in the header. It does not require a separate navigation item in the global nav — it is a sub-view of the Tarot module.

**Page states:**

1. **Loading:** Skeleton grid of 3–4 card-shaped placeholders with the standard shimmer. Loading copy: "Gathering your readings..." — stated as a considered fact, not a spinner label.
2. **Loaded, non-empty:** Grid of saved reading cards (see specification 11).
3. **Loaded, empty:** Empty state (see specification 14).
4. **Error:** "Your readings could not be loaded. Try again." with a retry button.

The page uses pagination: loads 20 items initially, with an "Load more" button at the bottom (not infinite scroll — infinite scroll removes the sense of a finite, meaningful collection). The item count ("12 readings") is shown in the page header.

---

### 11. List Item Design — Card-Style Rows

Each saved reading renders as a card-shaped tile, not a flat list row. The visual register is closer to an index card than a spreadsheet row.

**Tile anatomy (top to bottom):**

1. **Primary card symbol** — the SVG symbol or CSS symbolic treatment for the first (or most significant) card. For three-card and Celtic Cross readings, this is the Present Position card (position 0 in the cards array). Rendered at approximately 40×64px — small but recognizable.
2. **Moon phase glyph + date in natural language** — for example: `☽ Waxing Gibbous · fourteen days ago`. The moon phase glyph is one of the eight standard Unicode glyphs (🌑 🌒 🌓 🌔 🌕 🌖 🌗 🌘), selected from `astroContextSnapshot.lunarPhase`. The date is computed from `created_at` as a human-friendly relative expression: "today," "yesterday," "three days ago," "two weeks ago," "a month ago." Exact dates ("May 11") are used only when the reading is older than 60 days. This is the app's temporal language — the same language used in journal entries.
3. **Reading type badge** — small, low-contrast label: "Single Card," "Three Card · Past / Present / Future," "Celtic Cross." Uses the app's existing type-label convention.
4. **First card name** — resolved client-side from `firstCardId` against the local `cards.ts` data. In Cormorant Garamond, title case, gold (`#c9a84c`). The card name is the primary identity of the reading in the list.
5. **Intent preview** — if the user set an intention, a single italic line (max 60 characters, ellipsed): *"I am deciding whether to leave my job..."*. This is the most humanizing element of the list. It brings the memory of the moment back.

Tapping a tile opens the detail view (see specification 12). Long-pressing (mobile) or right-clicking (desktop) shows a context menu with "Delete reading" — consistent with the app's existing entry deletion pattern.

---

### 12. Reading Detail View — Revisiting a Saved Reading

When a saved reading is opened from the list, the full payload is fetched on demand via `GET /api/readings/:id`. While fetching, a skeleton matching the reading type's layout is shown.

The detail view re-renders the reading in its original layout — `SingleCardReading.tsx`, `ThreeCardReading.tsx`, or `CelticCrossReading.tsx` — but in a "replay" mode where:

- Cards are shown already revealed (no shuffle animation, no flip sequence).
- The astro context is the snapshot from the time of the reading, not the current sky.
- A prominent temporal banner appears above the reading: "You drew this card fourteen days ago, on a Waxing Gibbous Moon in Taurus." This banner is not decoration — it is the core affordance of the saved reading. It places the reading in the user's life story.
- If the user had stated an intention, it appears above the first card: "You asked for clarity on: I am deciding whether to leave my job." — verbatim, quoted.
- The GPT synthesis, if saved, is shown in `TarotSynthesisPanel.tsx` in a static (non-loading) state with a small "From your reading" label to clarify it is not a fresh generation.
- If `gptSynthesis` is null (GPT was unavailable when saved), the synthesis panel shows the AI-free skeleton content with a note: "The synthesis was not available when this reading was saved."
- Discuss ✦ is available for saved readings. The context payload includes the full saved reading data. The user can continue exploring a reading weeks later with fresh conversation.
- A "Delete this reading" action is available at the bottom, with a confirmation step ("Are you sure? This cannot be undone.").
- The `journal_entry_id` link, if present, shows "Linked to journal entry: [date]" with a tap action to navigate to the journal. If `journal_entry_id` is null, no link is shown — not a broken state, just an absent optional feature.

The header of the detail view shows the card name and reading type. The back navigation returns to the list.

---

### 13. Save Button Placement on Reading Pages

The save affordance appears at the end of a reading — after the synthesis has loaded or after the user has been given reasonable time to engage. Never mid-ritual. Never before the user has seen the reading.

**Single card reading:** The save button appears below the `TarotSynthesisPanel.tsx` in its success state, or below the instant interpretation in the GPT-unavailable state. It is a secondary action, styled below the Discuss ✦ button. Label: "Save this reading."

**Three-card reading:** The save button appears in the synthesis section, after the full GPT synthesis (or AI-free fallback) is displayed. Label: "Save this reading."

**Celtic Cross reading:** The save button appears at the very end of the synthesis section — after all synthesis chapters have rendered. Given the emotional weight of the Celtic Cross, the save moment feels earned. Label: "Save this reading."

The save button is not shown at all for free-tier users. In its place, a soft prompt: "Save readings with Advanced." This follows Miyazaki's principle: never interrupt the ritual. The reading completes fully. The save affordance is either present (Advanced) or absent (Free) — never a gate that fires mid-reading.

---

### 14. Save Confirmation Feedback

When the user taps "Save this reading," three things happen:

1. The button enters a loading state (spinner, label changes to "Saving...").
2. On success, a toast notification appears: "Reading saved." — brief, non-intrusive, uses the app's existing toast pattern. The button transitions to a checkmark state with label "Saved" for 3 seconds, then becomes a "View in your readings" link.
3. On failure (network error, 5xx), the toast reads: "Could not save — try again." The button returns to its original state. The reading is not lost; the user may try again.

There is no modal confirmation dialog. Saving a reading is a positive action that should feel lightweight, not bureaucratic.

---

### 15. Empty State for New Users

When `SavedReadingsPage.tsx` loads and the list is empty (first-time Advanced user, or user who has deleted everything), the empty state shows:

- The app's eight-pointed star glyph, centered, faint gold, large.
- Heading (Cormorant Garamond, title size): "Your readings will live here."
- Body (subdued, small): "When you save a reading, it joins your personal collection — marked by the moon that was present when you drew."
- A button: "Draw a card" — navigates to the main Tarot draw flow.

The empty state is not apologetic. It is anticipatory. It describes what the collection will become, not what is missing.

---

### 16. Error Handling

Every endpoint returns structured error objects: `{ error: string, feature?: string }`. The client maps these to user-facing states:

| HTTP Status | Error Key | User-Facing Message |
|---|---|---|
| 400 | `id is required` | "Something went wrong. Please try again." |
| 403 | `subscription_required` | "Save readings with Advanced. ✦" — opens UpgradeModal |
| 403 | `Forbidden` | "You cannot access this reading." |
| 404 | `Reading not found` | "This reading could not be found." |
| 500 | `internal_error` | "Something went wrong. Try again later." |

The subscription gate error (`403 subscription_required`) is the only error that opens the `UpgradeModal`. All other errors display inline below the relevant action.

---

### 17. Subscription Gating — Advanced Only

Saved readings is an Advanced-tier feature. The gate operates at two levels:

**Server level:** Every readings endpoint checks `user.subscription_tier !== 'advanced'` and returns `403 subscription_required` if the user is not Advanced. This is not optional — the UI gate alone is insufficient because API calls can be made directly.

**Client level:** The save button is not rendered for free users (see specification 13). Instead, a soft prompt ("Save readings with Advanced") appears in its place. This prompt is not a hard gate — it does not block the reading. It is an invitation that respects the completed ritual.

The `UpgradeModal` copy for the saved-readings context is distinct from transit-gate copy:

- Trigger: user taps "Save readings with Advanced" prompt.
- Modal headline: "Keep your readings."
- Modal body: "Advanced unlocks saved readings, the full Celtic Cross, and unlimited draws. Your symbolic history, preserved."

This copy does not mention pricing in the headline. It states the value first. The pricing surface is the existing Stripe integration — not this modal's job to replicate.

The subscription gate is documented here but implementation details (tier enforcement in middleware, `UpgradeModal` copy variants) are specified fully in proposal 11 (`tarot-subscription-gate`).

---

### 18. Performance — Slim List + On-Demand Full Payload

The architecture is designed around one performance rule: **never deserialize a Celtic Cross blob unless the user is actively viewing that reading.**

The list endpoint (`GET /api/readings`) excludes the `synthesis` column from the SELECT entirely. The query runs on the index `idx_readings_user_created`, which covers `(user_id, created_at DESC)`. For a user with 200 saved readings, the list query scans 200 index entries and fetches 5 columns per row — fast regardless of the `synthesis` blob size.

The detail endpoint (`GET /api/readings/:id`) fetches the full row including `synthesis` for a single reading. This is a point lookup by primary key — O(1) regardless of table size.

The `cards` column is fetched in the list query but only the first element is used. For single-card readings, this is a trivial deserialization. For Celtic Cross, the cards array has 10 elements — still small (card IDs are short strings). The cost is negligible compared to deserializing the synthesis.

**Pagination cap:** 100 items maximum per list request. The average user will have tens of readings, not hundreds. The 100-item cap prevents a malicious or unusual case from loading excessive data. The `total` count in the response enables the client to implement "Load more" without re-fetching the total on each page.

---

### 19. Pagination for the List

The list endpoint accepts `?limit=N&offset=M` query parameters. Defaults: `limit=20`, `offset=0`. Maximum: `limit=100`.

The initial page load requests `limit=20`. If `total > 20`, a "Load more" button appears at the bottom of the list. Tapping it requests `limit=20&offset=20` and appends results to the existing list (not a page replacement). This preserves scroll position and list context — the user does not lose their place when loading more.

There is intentionally no search or filter UI in v1. The list is ordered newest-first and browsed sequentially. Filtering by reading type or date range is a future enhancement.

---

## Out of Scope

**TarotJournalBridge.tsx — deferred.** The `journal_entry_id` column is in the schema from day one (see specification 1). The schema is ready. But the UI component that allows a user to link a saved reading to a journal entry — `TarotJournalBridge.tsx` — is deferred to end-of-sprint or a future sprint. Per Carmack's analysis: "If scope pressure hits, it is the first cut — the reading can be saved and reflected on in the journal separately." The FK relationship is established. The bridge component can be added without schema changes.

**Sharing readings.** No export, no shareable link, no public URL. A saved reading is private to the user. Sharing is a future feature that would require significant security review (what context is shared? how is the link scoped? what happens when the reading is deleted?). Not specified, not blocked, not in this sprint.

**Reading expiry.** See Open Questions.

**Reading search or filtering.** V1 list is newest-first, no filters. Filtering by reading type, moon phase, or date range is a future enhancement.

**Bulk delete.** Users delete readings one at a time. Bulk operations are not specified.

---

## Open Questions

**1. Do readings expire after a time period?**

The current schema has no expiry column. Readings persist indefinitely. There are two arguments for expiry:

- Storage: a user with 5 years of Celtic Cross readings (10 per year = 50 readings) has 50 × ~25 KB = ~1.25 MB of synthesis blobs. At scale (10,000 Advanced users), this is 12.5 GB — manageable for a SQLite deployment but worth monitoring.
- Product: expiring old readings could create urgency ("your reading from 2 years ago expires in 30 days — revisit it"). This is a dark pattern. It is not consistent with the app's voice.

The recommendation is no expiry for v1. The storage concern is real but not urgent at current scale. If storage becomes a concern, a policy can be added via an `ALTER TABLE` migration adding an `expires_at` column — without breaking existing data.

**2. Should `schema_version` be on the outer row or inside the payload?**

Currently: `schema_version INTEGER` is a top-level column on the `readings` row, and the tagged union inside `synthesis` also carries a `version: number` field. This is deliberate redundancy. The column enables SQL queries like `SELECT * FROM readings WHERE schema_version < 2` for identifying records that need migration. The inner `version` field enables the deserializer to branch without hitting the DB again. Both are useful, neither is redundant in the strict sense. This design is confirmed as intentional.

**3. What happens when a free user is upgraded to Advanced mid-session?**

The save button will not be visible until the client re-fetches user tier data. A session reload is the natural trigger. There is no need to reactively re-render the save button in real-time — the Stripe webhook that updates `subscription_tier` in the DB is the source of truth, and the next authenticated request will carry the updated tier. This is acceptable for v1.

---

## Implementation Order

Per Carmack's sequencing principle — ship each layer fully before adding the next:

1. **Add the `readings` table** to `server/db.ts` in the main `CREATE TABLE IF NOT EXISTS` block. Run the server to verify migration succeeds. This is 10 minutes of work and unblocks everything else.
2. **Implement `server/routes/readings.ts`** with all four endpoints. Test with `curl` or a REST client before writing any client code. The route is the contract; verify it independently.
3. **Register the route** in `server/index.ts`: `app.use('/api/readings', readingsRouter)`.
4. **Implement `src/services/readingsService.ts`** — the four client-side API functions. Verify against the live server.
5. **Add saved readings state to `TarotContext`**: `savedReadingsList`, `listStale`, the full-reading cache map, and the `saveReading`, `deleteReading`, `loadReadings` actions.
6. **Implement `SavedReadingsPage.tsx`** — loading, empty, and loaded states. Wire to `listReadings()` on mount.
7. **Add the save button** to `SingleCardReading.tsx`, `ThreeCardReading.tsx`, and `CelticCrossReading.tsx`. Wire to `saveReading()`.
8. **Implement the detail view** — the "replay" mode inside each reading component, gated by a `savedReadingId` prop.
9. **Add Discuss ✦ support** for saved readings — pass the saved payload as context to `TarotDiscussModal.tsx`.
10. **Subscription gate** — add the client-side save-button suppression for free users and the `UpgradeModal` prompt. (Server-side gate is already in the route from step 2.)
