# issue-birth-place-silent-failure

**Type:** Issue Fix  
**Originated by:** Taleb (primary), Miyazaki (implicit)  
**User guidance:** (none — sprint vision overrides)

---

## Problem

Every server-side handler that computes astrological data for a user begins by reading and parsing `birth_place` from the `users` table. This field is `TEXT` in SQLite. It is stored by the client. It is never validated on write beyond what the profile route accepts. There is no schema constraint on `lat`, `lng`, or `tz` being present, having the correct types, or being non-null.

The current implementation in `server/services/gpt.ts` is inside `handleDreamInterpretation`, lines 219–241:

```typescript
const row = db
  .prepare('SELECT birth_date, birth_time, birth_place FROM users WHERE id = ?')
  .get(userId) as { birth_date: string | null; birth_time: string | null; birth_place: string | null } | undefined

if (row?.birth_date && row.birth_place) {
  const place = JSON.parse(row.birth_place) as { lat?: number; lng?: number; tz?: string }
  if (typeof place.lat === 'number' && typeof place.lng === 'number' && place.tz) {
    const computed = calculateChart(...)
    ...
  }
}
```

This block has four silent failure modes:

**Failure 1 — null `birth_place`.** A user who registered via OAuth and skipped the birth profile has `birth_place = null`. The guard `row.birth_place` catches this and falls through. The handler falls back to empty natal context. No log entry is written. The GPT call proceeds with no chart data. The user receives a degraded reading with no indication anything went wrong.

**Failure 2 — string-encoded coordinates.** If the client stored `{"lat": "40.71", "lng": "-74.00", "tz": "America/New_York"}` — strings instead of numbers, which is a plausible early-lifecycle serialization difference — then `typeof place.lat === 'number'` is `false`. The guard fails silently. Empty context. No log. Degraded GPT response.

**Failure 3 — missing `tz`.** If the city lookup that produced this record did not resolve a timezone — a legitimate edge case for cities near timezone boundaries — `place.tz` is falsy. The guard fails silently. Empty context. No log. Degraded GPT response.

**Failure 4 — malformed JSON.** If `birth_place` was written as something other than valid JSON (a plain city name string, partial JSON, empty string), `JSON.parse` throws. The outer `try/catch` at line 239 catches it with the comment `// Non-fatal — proceed without chart if DB lookup fails`. The exception is swallowed. No log. Degraded GPT response.

In all four cases: the caller receives no signal that the birth context was unusable. No structured log event is emitted. No error is surfaced to the handler. The `chart` variable remains `null`, the handler falls through to empty context, and GPT produces a generic response that looks personalized.

**Why this becomes critical in sprint-0012:** `handleDreamInterpretation` is currently the only handler that does server-side DB reads and chart computation. Sprint-0012 will add server-side birth context reads to every handler that computes transits, synastry, solar return, and numerology — at minimum `handleTransitInterpretation`, `handleDailySnapshot`, `handleJournalAnnotation`, and any new synastry/solar-return handlers. Each of these will need the same DB read and parse block. If they are each written with inline variations of the current pattern, every handler independently inherits all four silent failure modes. Some handlers will check `typeof place.lat === 'number'`; others, written under time pressure, will cast directly. Some will catch `JSON.parse` exceptions; others will let them propagate. The failure surface multiplies with each new handler.

The specific location of the current pattern that all new handlers will replicate:  
`server/services/gpt.ts`, lines 219–241, inside `handleDreamInterpretation`.

The handlers to be added in sprint-0012 that will inherit this pattern unless it is extracted first:
- `handleTransitInterpretation` (line 179 — currently accepts `{ systemPrompt: string }`, will be upgraded to compute server-side)
- `handleDailySnapshot` (line 351)
- `handleJournalAnnotation` (line 535)
- Any new synastry and solar return handlers

---

## Expected Behavior

A single function, `resolveUserBirthContext`, is written once and called by every handler that needs birth data. It is the sole place in the server that reads and validates the `birth_place` field.

**Function signature:**

```typescript
interface BirthContext {
  birthDate: string
  birthTime: string | null
  lat: number
  lng: number
  tz: string
}

async function resolveUserBirthContext(userId: number): Promise<BirthContext | null>
```

**Behavior:**

1. Queries `SELECT birth_date, birth_time, birth_place FROM users WHERE id = ?`. If the row does not exist, returns `null` and logs `[resolveUserBirthContext] no user row for userId=${userId}`.

2. If `birth_date` is null or falsy, returns `null` and logs `[resolveUserBirthContext] missing birth_date for userId=${userId}`.

3. If `birth_place` is null or falsy, returns `null` and logs `[resolveUserBirthContext] missing birth_place for userId=${userId}`.

4. Attempts `JSON.parse(row.birth_place)` inside a try/catch. If parsing throws, returns `null` and logs `[resolveUserBirthContext] birth_place not valid JSON for userId=${userId}, value=${row.birth_place}`.

5. Coerces `lat` and `lng` to numbers via `Number()` (handling string-encoded coordinates from early clients). If either is `NaN` after coercion, returns `null` and logs `[resolveUserBirthContext] non-numeric lat/lng for userId=${userId}`.

6. If `tz` is missing or falsy, returns `null` and logs `[resolveUserBirthContext] missing tz for userId=${userId}`.

7. On success, returns the fully typed `BirthContext` object with `lat` and `lng` as `number`, `tz` as `string`, `birthDate` as `string`, and `birthTime` as `string | null`.

All log calls use `console.warn` (not `console.error`) — these are data-quality events, not system errors. Each log line includes the userId so the field can be correlated with a specific user record.

**Handler usage:**

Every handler that currently inlines a variant of the DB read + JSON.parse block, and every new handler added in sprint-0012, replaces that block with:

```typescript
const birthCtx = userId ? await resolveUserBirthContext(userId) : null
if (birthCtx) {
  const computed = calculateChart(
    birthCtx.birthDate,
    birthCtx.birthTime ?? '12:00',
    birthCtx.lat,
    birthCtx.lng,
    birthCtx.tz,
    !birthCtx.birthTime,
  )
  // ...
}
```

**File to change:** `server/services/gpt.ts` — add `resolveUserBirthContext` as a module-level function above `handleDreamInterpretation`, then replace the inline block at lines 219–241 with a call to it.

The function should be placed before any handler function so that it is available to all twelve existing handlers and any new handlers added in sprint-0012 without import changes.

---

## Impact

**Severity:** High — every server-side computation of a natal chart or transit snapshot silently degrades to empty context on any of the four failure modes above, with no log and no signal to the caller. For users with string-encoded coordinates or missing `tz` in their stored `birth_place`, every server-side reading is permanently degraded with no recovery path until the DB record is corrected.

**Effort:** Low — approximately 25 lines for the function body, plus a one-line replacement inside `handleDreamInterpretation`. No schema change. No new dependencies. The function is synchronous except for the DB query (`better-sqlite3` is synchronous by design, so the function can be `function` rather than `async`).

**Sprint-0012 leverage:** Extracting this function before any new handler is written ensures that transit, synastry, solar return, and numerology handlers inherit validated, typed birth context rather than each inventing their own variation. Writing it after the sprint means retrofitting five handlers.

---

## Dependencies

None — fully self-contained within `server/services/gpt.ts`. No frontend changes. No schema changes. No new packages.

---

## Outcome

**Status:** done  
**Branch:** sprint-0012-task-0001-issue-birth-place-silent-failure  
**Commit:** 27e9d51

**Implemented:**
- `BirthContext` interface added at line 60 in types section
- `resolveUserBirthContext(userId: number): BirthContext | null` function added at line 185, before all handler functions
- All 4 silent failure modes addressed with `console.warn` logs including `userId`:
  1. No user row → warns `[resolveUserBirthContext] no user row for userId=...`
  2. Missing `birth_date` → warns with appropriate message
  3. Missing `birth_place` → warns with appropriate message
  4. Malformed JSON → warns including the raw value
  5. Non-numeric `lat`/`lng` (including string-encoded) → `Number()` coercion + NaN check + warn
  6. Missing `tz` → warns with appropriate message
- Inline DB block in `handleDreamInterpretation` (formerly lines 218–242) replaced with clean 10-line call to `resolveUserBirthContext`
- TypeScript check passes with no errors

**Notes:**  
Function is synchronous (better-sqlite3 is synchronous). The `BirthContext` interface and function are positioned before all handlers so every future handler in sprint-0012 can call it without import changes.
