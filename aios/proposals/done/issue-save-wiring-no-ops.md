# Issue Fix: Save Wiring No-Ops Across All Three Reading Flows

**Type:** Issue Fix

**Originated by:** Jobs, Carmack, Taleb, Miyazaki

---

## Problem

`TarotPage.tsx` passes `onSave={() => {}}` — a literal no-op — to all three reading flow components. The specific call sites are:

- **Line 217** (`SingleReadingFlow` rendering `SingleCardReading`): `onSave={() => {}}`
- **Line 284** (`ThreeReadingFlow` rendering `ThreeCardReading`): `onSave={() => {}}`
- **Line 329** (`CelticReadingFlow` rendering `CelticCrossReading`): `onSave={() => {}}`

When the user taps the Save button in any reading type, the component-level save handler fires, the UI transitions to a "Saved" or "Saved ✓" confirmation label, and nothing is written to the database. The label resets after two seconds. The reading is silently discarded.

Each component's internal save path executes and confirms success to the user:

- **`SingleCardReading.tsx` line 85–89** (`handleSave`): calls `onSave()`, immediately sets `saveLabel` to `'Saved'`, then resets it to `'Save'` after 2000 ms via `setTimeout`. The user receives positive confirmation UI for a transaction that never happened. The `onSave` prop is typed as `() => void` — it carries no payload. Even if the parent were not a no-op, there would be nothing to save: the card, reversal state, synthesis text, and intention are present in the component but not passed out through this callback.

- **`ThreeCardReading.tsx` line 852–855** (`handleSave`): calls `onSave()` and immediately sets `saveState` to `'saved'` — no async, no error handling, no way to reach the `'error'` branch. The component has a complete `saveState` machine (`'idle' | 'saved' | 'error'`) and even renders an error-retry UI at the `'error'` state, but that state is unreachable because `handleSave` never performs an async operation. The `onSave` prop is typed as `() => void` — no payload. The defensive "Save before leaving" path in `BackConfirmModal` (`handleSaveAndBack`, line 866–870) calls the same payloadless `onSave()`, so the safety-net path is equally broken.

- **`CelticCrossReading.tsx` line 633–656** (`handleSave`): this is the most advanced of the three. It constructs a complete `SavedReading` object — `readingType`, `drawnCards` with position and reversal data, `spreadType`, `userIntention`, `astroContextSnapshot` including moon phase and personal day, `interpretationPayload`, and `synthesisText` assembled from the rendered chapter list — and passes it to `onSave(reading)`. The component's `onSave` prop is typed as `(reading: SavedReading) => void`, which correctly signals a payload-bearing callback. The parent, `CelticReadingFlow`, receives this at line 329 and throws it away with `onSave={() => {}}`. The most complete save path in the codebase produces a payload that is immediately garbage-collected.

The `SavedReadingsPage` component (`src/components/tarot/SavedReadingsPage.tsx`) is fully functional. It reads from the database via `listReadings()` in `readingsService.ts`, renders tiles for each saved reading, and displays a detail modal. But no reading ever reaches the database from any of the three reading flows, so the page always shows the empty state regardless of how many readings the user has completed and "saved."

The `saveReading()` function in `src/services/readingsService.ts` (lines 40–54) is correctly implemented. It accepts a `SaveReadingRequest` payload and an auth token, posts to `/api/readings`, and returns `{ id, createdAt }` on success. The `TarotContext` reducer handles a `SAVE_READING` action (line 90–97 of `TarotContext.tsx`) that stores the returned `readingId` in `savedReadingIds` and `currentReadingId` — the post-save state management is already designed and waiting. The infrastructure is complete end-to-end. The only missing piece is the wiring across the parent boundary in `TarotPage.tsx`.

An additional structural defect exists in `CelticCrossReading.tsx` line 637: the `SavedReading` object it constructs sets `userId: ''` with a comment "set by parent/auth context." The parent never receives this object. More critically, the `SavedReading` type (with `schemaVersion`, `drawnCards`, `spreadType`, `astroContextSnapshot`, `interpretationPayload`) is a different shape from `SaveReadingRequest` (with `readingType`, `firstCardName`, `cards`, `synthesis`), which is the actual type accepted by `saveReading()` in `readingsService.ts`. The Celtic Cross component is building the wrong payload shape for the service layer.

---

## Expected Behavior

**Single card reading:** When a user taps Save after drawing a card in `SingleReadingFlow`, a database record is created via `saveReading()` containing at minimum the reading type, card identity, reversal state, user intention, and synthesis text if GPT has resolved. The "Saved" label must only appear after the database call has confirmed success. If the save fails — network error, session expired, rate limit — the UI must show an actionable error state, not a false confirmation. The `SAVE_READING` action must be dispatched with the returned reading ID so `TarotContext` reflects the persisted reading.

**Three-card reading:** When a user taps Save (or "Save before leaving" from the back-confirmation modal) in `ThreeReadingFlow`, a database record is created via `saveReading()` containing the reading type, spread mode, all three drawn cards with their positions and reversal states, user intention, and synthesis text. The existing `saveState` machine in `ThreeCardReading.tsx` must be connected to an actual async operation so the `'error'` state is reachable and the retry path is functional. The "Saved ✓" confirmation must reflect actual persistence.

**Celtic Cross reading:** When a user taps Save in `CelticReadingFlow`, a database record is created via `saveReading()` containing the reading type, all ten drawn cards with their positions and reversal states, user intention, and synthesis text assembled from the rendered chapters. The payload sent to `saveReading()` must conform to `SaveReadingRequest`, not the `SavedReading` type currently constructed inside `CelticCrossReading.tsx`. The auth token must be supplied by the flow container, which has access to the auth context, rather than hardcoded as an empty string inside the reading component.

In all three flows, a successfully persisted reading must appear in the `SavedReadingsPage` when the user navigates to it.
