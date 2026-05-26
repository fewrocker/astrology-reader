# Code Review: sprint-0025-task-0003-issue-save-wiring-no-ops

**Reviewer:** Code Review Agent  
**Sprint card:** sprint-0025-task-0003-issue-save-wiring-no-ops  
**Files reviewed:**
- `src/components/tarot/TarotPage.tsx`
- `src/components/tarot/SingleCardReading.tsx`
- `src/components/tarot/ThreeCardReading.tsx`
- `src/components/tarot/CelticCrossReading.tsx`

---

## Summary

The fix correctly wires `saveReading()` from `readingsService.ts` into all three tarot reading flows. The no-ops in `TarotPage.tsx` (lines 217, 284, 329) are replaced with real async callbacks. Each flow now calls `saveReading()` with the auth token from `useAuth()`, dispatches `SAVE_READING` to `TarotContext` on success, and surfaces errors to the child component's error state. The `onSave` prop type is corrected in all three child components to reflect the async nature of the operation.

---

## Findings

### Single Card Flow

**[suggestion]** The `synthesis` field in the `SaveReadingRequest` built inside `SingleReadingFlow.handleSave` is a minimal object (`{ cardName, reversed, coreMeaning }`) rather than the full `synthesisPayload`. The `synthesisPayload` in scope already holds the complete GPT payload structure. Passing the full payload would give the server richer data to store. However, the `SaveReadingRequest.synthesis` field is typed as `unknown`, so both shapes are valid — and the minimal shape is not wrong. This is a suggestion, not a blocking issue.

**[suggestion]** `handleSave` in `SingleReadingFlow` throws `new Error('not_ready')` when `drawn` is null (card not yet picked) or `token` is null (unauthenticated). The child component's `catch` block in `handleSave` will display "Error" and retry after 3000 ms, which is a reasonable fallback. A more descriptive error message (e.g., `'not_authenticated'` vs `'no_card_drawn'`) might improve debuggability, but this is not user-visible.

### Three Card Flow

**[suggestion]** The `handleSaveAndBack` callback in `ThreeCardReading.tsx` catches save errors and navigates anyway, which matches the intent stated in the sprint card ("proceed with navigation even if save fails — user has chosen to leave"). However, there is no user feedback that the save failed before leaving. A toast or brief message before navigation would improve trust. This is a UX suggestion, not a correctness defect.

**[warning]** `ThreeReadingFlow.handleSave` throws if `drawnCards.length === 0`. Since the save button only appears at `showActions` (which requires `synthesisState === 'ready' | 'error-retryable' | 'error-permanent'`), `drawnCards` will always have 3 entries by that point. The guard is technically unreachable from normal flow. No correctness defect, but the guard is worth keeping for safety.

### Celtic Cross Flow

**[suggestion]** The Celtic Cross `handleSave` builds a `cards` array with inline objects containing `position`, `cardId`, `cardName`, `reversed`, and `coreMeaning`. The `SaveReadingRequest.cards` type is `unknown[]`, so this shape is accepted. The server-side handler (not in scope for this review) determines what it actually uses. The data is richer than what single and three-card flows send, which is appropriate given the complexity of a Celtic Cross spread.

**[suggestion]** The old `handleSave` in `CelticCrossReading` was not `useCallback`-wrapped; the new `handleSave` is also not wrapped, which is consistent with the existing style in that component. No functional issue.

### General

**[warning]** The `SaveReadingRequest.cards` field is typed as `unknown[]`. All three flows send objects with different shapes into this field (`{ cardId, cardName, reversed, coreMeaning }` for single/three, `{ position, cardId, cardName, reversed, coreMeaning }` for celtic cross). This is type-safe at the TypeScript level (since `unknown[]` accepts any array), but the server contract is implicit. If the server validates specific field presence, a mismatch would surface only at runtime. This is an existing design choice in `readingsService.ts` and is out of scope for this task.

**[suggestion]** `useAuth` is now called inside `SingleReadingFlow`, `ThreeReadingFlow`, and `CelticReadingFlow` — all three are rendered inside `TarotPageInner` which is inside `TarotProvider`. `AuthProvider` wraps the entire app, so `useAuth()` is always valid in these components. No concern.

---

## Verdict

No blocking issues found. The implementation satisfies all requirements stated in the sprint card:
- Save is now real and async in all three flows
- Confirmation UI (`Saved`, `Saved ✓`, `Saved ✓`) appears only after DB success
- Error states are reachable and actionable (retry path exposed in all three components)
- `SAVE_READING` is dispatched with the returned ID so `TarotContext` reflects persistence
- The Celtic Cross `handleSave` builds `SaveReadingRequest` (not the wrong `SavedReading` type)
- Auth token is supplied by the flow container, not hardcoded

Build passes with zero TypeScript errors.
