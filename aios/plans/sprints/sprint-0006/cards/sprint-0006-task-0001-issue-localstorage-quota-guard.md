# issue-localstorage-quota-guard

**Type:** Issue Fix  
**Originated by:** Taleb  
**User guidance:** "Every feature and design has to be beautiful and follow the majestic designs that are currently on the app." — guidelines.md (applies here: any quota warning UI must match the dark/violet/gold theme, not a bare browser alert)

---

## Problem

Every localStorage write in the app is wrapped in a `try/catch` that silently discards `QuotaExceededError`. The user receives no indication that data was not saved. The affected write sites are:

**`src/context/appState.ts`**
- `saveBirthData()` — lines 131–137: `localStorage.setItem(BIRTH_DATA_CACHE_KEY, ...)` caught by `catch { // localStorage may be unavailable — silently ignore }`
- `savePartnerData()` — lines 151–155: `localStorage.setItem(PARTNER_DATA_CACHE_KEY, ...)` caught by `catch { /* ignore */ }`
- `saveSynastryResults()` — lines 181–185: `localStorage.setItem(SYNASTRY_RESULTS_CACHE_KEY, ...)` caught by `catch { /* ignore */ }`
- `saveChartResults()` — lines 203–207: `localStorage.setItem(CHART_RESULTS_CACHE_KEY, ...)` caught by `catch { /* ignore */ }`
- `saveTransitResults()` — lines 225–229: `localStorage.setItem(TRANSIT_RESULTS_CACHE_KEY, ...)` caught by `catch { /* ignore */ }`

**`src/components/dream/DreamModal.tsx`**
- Dream session persistence `useEffect` — lines 153–161: `localStorage.setItem(DREAM_SESSION_KEY, ...)` caught by `catch { // ignore quota errors }`

**`src/components/reading/DailySnapshotCard.tsx`**
- Daily snapshot cache write — lines 156–159: `localStorage.setItem(cacheKey, ...)` caught by `catch { // ignore cache write errors }`

The failure mode is silent and total. When `localStorage.setItem()` throws, the write does not happen, the exception is swallowed, and the user believes their data was saved. For low-stakes caches (daily snapshot GPT text, dream session chat) silent failure is inconvenient. For journal entries introduced by the Cosmic Journal feature — where each entry is the user's own written record — silent failure is a trust-breaking data loss event.

**Storage growth projection:** The existing keys already occupy meaningful space — natal chart data with planet positions, aspects, and full GPT reading text; transit results with a full interpretation string; synastry data; and per-day dream sessions (each holding a full GPT response). With Cosmic Journal adding entries where each entry contains a written body, tags, and a sky snapshot (~2–4KB serialized), a daily user logging faithfully will accumulate 1–2MB of journal data within one to two years, pushing the origin total toward the 5MB browser cap.

**Reproduction:** Fill localStorage to capacity using DevTools (`Application > Storage`), then trigger any save action (update birth city, save a dream session, trigger a chart result cache). The app shows no error; the data is silently lost on reload.

---

## Expected Behavior

1. **`QuotaExceededError` must be surfaced, not swallowed.** When any write fails with `QuotaExceededError`, the app must display a clear, themed message informing the user that local storage is full and the save did not complete. For writes originating from user-initiated journal or dream flows, this message must be prominent (toast or inline error, not console-only). For background cache writes (daily snapshot, transit cache), a softer warning is appropriate.

2. **Journal entry writes must include a pre-write quota check.** Before the Cosmic Journal persists a new entry, the app must call `navigator.storage.estimate()` and compare `usage / quota`. If usage exceeds a threshold (70% is Taleb's recommendation), display a visible, non-dismissable storage warning in the journal UI: "Your local storage is nearly full. Older entries may be lost. Export your journal to protect them." The warning must remain visible until the user acts or usage drops.

3. **A JSON export escape valve must be available.** A single "Export Journal" button must dump the full journal array as a downloadable `.json` file via `URL.createObjectURL(new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' }))`. No server, no account, no external dependencies. This gives users a recovery path before they hit the wall.

4. **Sky snapshots should not be stored redundantly.** The astronomy engine is deterministic — given the same `datetime` input it produces identical output. A journal entry's sky snapshot (planet positions, transit aspects) is fully recomputable from the entry's stored `date` and `time`. Storing only the human-authored content (title, body, tags, date, time) and recomputing the sky on read reduces per-entry storage from ~3KB to under 300 bytes, increasing effective journal capacity by roughly an order of magnitude. This is the structural fix; the quota guard and export are the safety nets for the time before it is implemented.

---

## Impact

**High** — affects all long-term users; guaranteed to manifest for any daily user of the Cosmic Journal feature within 1–3 years. Silent data loss events destroy user trust in a product built on the premise of being a personal living almanac.  
**Effort** — Medium. The quota-check, warning UI, and export function are low-effort (~60–80 lines). The "don't store sky snapshots" refactor is moderate effort and touches the journal entry schema and the entry detail view.

---

## Dependencies

- Cosmic Journal entry schema must be designed with `date` + `time` as the canonical sky-recomputation source (not a stored snapshot blob), before any entries are persisted — schema changes after data exists require migration.
- `getTopActiveTransits()` (see `issue-transit-historical-date-parameter`) must accept a `date?` parameter before recomputation-on-read is possible.

---

## Implementation Summary

**Modified files:**
- `src/context/appState.ts` — replace bare `catch { /* ignore */ }` blocks in all five write functions with `catch (e) { if (e instanceof DOMException && e.name === 'QuotaExceededError') { /* surface error */ } }`. Export a shared `isQuotaError(e: unknown): boolean` guard.
- `src/components/dream/DreamModal.tsx` — line 159: replace `catch { // ignore quota errors }` with quota-aware handling that sets `error` state with a storage-full message visible in the modal's existing error display.
- `src/components/reading/DailySnapshotCard.tsx` — line 158: quota errors on the cache write are lower stakes; log to console but do not block the user.

**New code (can live in `src/context/appState.ts` or a new `src/utils/storage.ts`):**
- `isQuotaError(e: unknown): boolean` — narrows `DOMException` with `name === 'QuotaExceededError'`
- `estimateStorageUsage(): Promise<{ usageRatio: number; usedMB: number; quotaMB: number }>` — wraps `navigator.storage.estimate()` with a graceful fallback for browsers that do not support the Storage API
- `exportJournalEntries(entries: JournalEntry[]): void` — creates and clicks a Blob download link

**New UI (journal composer / journal list):**
- Storage warning banner: appears when `usageRatio > 0.70`, styled in the dark/violet theme (`border border-violet-500/30 bg-violet-950/30 rounded-xl`), contains the export button. Non-dismissable while quota risk persists.
