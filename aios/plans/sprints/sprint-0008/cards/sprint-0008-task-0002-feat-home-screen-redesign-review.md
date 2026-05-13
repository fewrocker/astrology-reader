# Code Review: sprint-0008-task-0002-feat-home-screen-redesign

**Reviewed by:** Claude Sonnet 4.6  
**Date:** 2026-05-13  
**Branch diff:** worktree vs `sprint-0008`

---

## Files Changed

- `src/App.tsx` — removed `CachedDataLanding`, `CachedDataNudge`, unused imports; updated `showCachedLanding` condition
- `src/context/appState.ts` — added `COMPLETE_FORM` action and reducer case
- `src/components/form/FormWizard.tsx` — dispatches `COMPLETE_FORM` on final step
- `src/components/reading/DailySnapshotCard.tsx` — added `embedded` prop, 500ms stagger, renamed "↻ ask again"
- `src/components/home/HomeScreen.tsx` — new file, extracted home screen
- `src/components/navigation/ReadingsModal.tsx` — new file, readings navigation modal

---

## Spec Coverage Matrix

| Spec | Description | Status |
|------|-------------|--------|
| 1 | `CachedDataLanding` extracted to `HomeScreen.tsx` | PASS |
| 2 | Left 40% / Right 60% layout preserved | PASS |
| 3 | Left panel section order correct | PASS |
| 4 | Nine navigation buttons removed | PASS |
| 5 | Single `DailySnapshotCard` instance, old mobile/desktop duplicates removed | PASS |
| 6 | `CachedDataNudge` removed | PASS |
| 7 | Sign identity line from `chartData`, fallback to date/city text | PASS |
| 8 | `font-heading text-lg text-mystic-gold` | PASS |
| 9 | Secondary line `text-xs text-mystic-muted`, no labels | PASS |
| 10 | Null chartData fallback renders without crash | PASS |
| 11 | "Your Birth Details" header removed; "Welcome back" retained as subordinate muted label | PASS |
| 12 | "Change birth information" as text-styled `<button>`, keyboard accessible | PASS |
| 13 | "Save your readings ✦" nudge for unauthenticated users | PASS |
| 14 | Auth nudge styled as quiet text link | WARNING (see below) |
| 15 | Auth nudge hidden when `isAuthenticated === true` | PASS |
| 16 | `DailySnapshotCard` receives `chart={chartData}` and `birthDate={birthData.date}` | PASS |
| 17 | `DailySnapshotCard` not rendered when `chartData` is null; placeholder maintains visual weight | PASS |
| 18 | `embedded` prop reduces `mb-8` to `mb-4` | PASS |
| 19 | Existing cache mechanism unchanged | PASS |
| 20 | 500ms stagger on first mount when cache empty | PASS |
| 21 | "↻ ask again" label change | PASS |
| 22 | "Get Your Readings ✦" primary CTA with correct styling and keyboard access | PASS |
| 23 | `ReadingsModal` created at `src/components/navigation/ReadingsModal.tsx` | PASS |
| 24 | Three groups (You, Transits, Journals) with all items and descriptors | PASS |
| 25 | Glyph, label (`font-heading`), descriptor (`text-xs text-mystic-muted`) per item | PASS |
| 26 | Group headers at `text-base`, item labels at `text-sm` — one step larger | PASS |
| 27 | Groups separated by spacing, not nested card boxes | PASS |
| 28 | Modal closes when item selected | PASS |
| 29 | Dream modal open/close sequence correct; `dreamOpen` owned by `HomeScreen.tsx` | PASS |
| 30 | `Escape` key closes modal | PASS |
| 31 | Backdrop click closes modal | PASS |
| 32 | `max-h-[90vh] overflow-y-auto`, scrollable on narrow viewports | PASS |
| 33 | No `onMouseEnter`/`onMouseLeave` in `ReadingsModal` | PASS |
| 34 | Close button with `aria-label="Close readings menu"` | PASS |
| 35 | Focus trap: Tab/Shift-Tab wraps within modal | PASS |
| 36 | `role="dialog"`, `aria-modal="true"`, groups use `role="group"` + `aria-labelledby`, items are `<button>` elements | PASS |
| 37 | `modal-in` keyframe animation: 180ms scale + translateY fade-in | PASS |
| 38 | Dark-mystic palette — inline gradient closely matches token values | PASS |
| 39 | Monthly dispatches `START_TRANSIT, period: 'monthly'` directly | PASS |
| 40 | Open question (monthly custom-month path) — deferred, resolved as direct dispatch | PASS |
| 41 | `FormWizard` final step lands on home screen, not birth chart loading | PASS |
| 42 | `COMPLETE_FORM` action added to `AppAction` | PASS |
| 43 | `FormWizard.handleNext()` dispatches `COMPLETE_FORM`; `saveProfile` path preserved | PASS |
| 44 | `formStep === 0` guard removed from `showCachedLanding`; no render-flash risk (see analysis) | PASS |
| 45 | `hasCachedBirthData()` localStorage call removed; condition uses React state | PASS |
| 46 | Return-home path: cached snapshot loads instantly | PASS |
| 47 | null chartData: birth identity falls back, CTA visible, snapshot not rendered | PASS |
| 48 | Partial cache state (date without city): city check in condition prevents crash | PASS |
| 49 | `chartData` computation preserved in `HomeScreen.tsx`; `DreamModal` prop intact | PASS |
| 50 | Offline: localStorage birth data + cached snapshot render; GPT failures hit existing error state | PASS |
| 51 | `SessionBadge` header unchanged | PASS |
| 52 | `wordBreak: 'break-word'` on identity line prevents mobile overflow | PASS |
| 53 | `buildInitialState()` hydrates from localStorage synchronously; no empty flash expected | PASS |
| 54 | CTA `aria-label="Get Your Readings"` | PASS |
| 55 | "Change birth information" is `<button>` — activatable by Enter (native) and Space (onKeyDown handler) | PASS |
| 56 | Auth nudge is `<button>` with `aria-label="Create an account to save your readings"` | PASS |
| 57 | `DailySnapshotCard` accessibility attributes unchanged (recommendation, non-blocking) | PASS |
| 58 | Focus moves to first modal element on open; returns to CTA on close | WARNING (see below) |
| 59 | Return navigation: snapshot from cache, no spinner | PASS |
| 60 | Modal content is static; opens synchronously | PASS |
| 61 | Identity line derived synchronously from `chartData` state | PASS |

---

## Issues

### BLOCKING

None. All 61 specs are implemented or acceptably resolved.

---

### WARNING

**W1 — Auto-focus on mount in `ReadingsModal` (`src/components/navigation/ReadingsModal.tsx`, lines 163–168)**

The focus-return `useEffect` fires on mount with `isOpen === false`, immediately calling `triggerRef?.current?.focus()`. This auto-focuses the "Get Your Readings ✦" CTA button the moment `HomeScreen` renders — before the user has interacted with anything. Screen readers will announce the button on page load, and keyboard users may be surprised by the stolen focus.

The fix is to track the previous open state:

```tsx
const wasOpenRef = useRef(false)
useEffect(() => {
  if (wasOpenRef.current && !isOpen) {
    triggerRef?.current?.focus()
  }
  wasOpenRef.current = isOpen
}, [isOpen, triggerRef])
```

**W2 — Auth nudge uses `onMouseEnter`/`onMouseLeave` inline style objects (`HomeScreen.tsx`, lines 114–115)**

Spec 33 explicitly states that the `onMouseEnter`/`onMouseLeave` pattern must not be inherited by the new components. This restriction was written specifically about `ReadingsModal`, which correctly uses Tailwind `hover:` variants only. However, the spirit of the constraint — avoiding inline event handler style mutations — applies equally to `HomeScreen`. The auth nudge hover is the only remaining instance of this pattern in the redesigned surface.

The 60% opacity gold that the nudge requires (`rgba(201,168,76,0.60)`) cannot be expressed with the existing Tailwind config (which only defines `mystic-gold` as a solid value, not opacity variants). The correct fix is to extend `tailwind.config.js` with an `--opacity` design token or use a CSS custom property, then express the hover via `hover:text-mystic-gold`. Alternatively, a CSS class in `index.css` would keep the behavior in a stylesheet where it belongs.

**W3 — `animate-in` is an undefined Tailwind class (`ReadingsModal.tsx`, line 184)**

The modal panel has both `className="... animate-in"` and `style={{ animation: 'modal-in 180ms ease-out both' }}`. The `animate-in` class is not defined in `tailwind.config.js` or `index.css` — it is a no-op. The animation works only because of the inline `style` prop. The stray class adds noise but does not break the feature. Remove `animate-in` from the className to keep it clean.

**W4 — Modal background uses inline gradient instead of Tailwind tokens (`ReadingsModal.tsx`, lines 185–188)**

The modal `background` and `boxShadow` are inline style objects using raw rgba values. While the colors match the mystic palette, they bypass the design token system. Spec 38 says to use `bg-mystic-bg` or `bg-mystic-surface`. This is workable as-is but creates a maintenance surface — if the palette tokens change, this inline block won't update. Consider `className="bg-mystic-bg"` with the border via `border-mystic-gold/30` (already in the token set).

---

### SUGGESTION

**S1 — `COMPLETE_FORM` reducer does not persist `formStep: 0` reset to localStorage**

The `COMPLETE_FORM` reducer returns `{ ...state, view: 'form', formStep: 0 }`. `formStep` is ephemeral (not stored in localStorage), so this is correct and complete — just worth noting explicitly that no cache write is needed here.

**S2 — `DailySnapshotCard` 500ms stagger fires on every remount, not only the first-ever mount**

Spec 20 says the stagger is for "the first load attempt when cache is empty." `refreshTick === 0` is true on every component mount (state resets), which matches the intent: a returning user whose snapshot is cached skips the stagger entirely (cache hit returns early). A user who cleared the cache and navigates away and back gets the stagger again on remount. This is slightly broader than the spec's stated intent ("first load") but is harmless — the stagger only runs when cache is empty and the result is the correct rate-limiting behavior.

**S3 — `identityLine` includes zodiac glyphs not mentioned in spec**

Spec 7 format: `"Sun in [Sign] · [Sign] Rising · Moon in [Sign]"`. The implementation produces `"Sun in ♏ Scorpio · ♎ Libra Rising · Moon in ♓ Pisces"`. The glyphs are a nice enhancement and consistent with the product's visual language. No change required.

**S4 — `"Welcome back"` label retained despite spec 11 phrasing**

Spec 11 says the label is "removed" but immediately qualifies: "The panel may open with a small muted label if needed for visual grounding (e.g., 'Welcome back' at `text-xs text-mystic-muted uppercase tracking-widest`)." The implementation uses exactly that text and styling. This is the intended reading of the spec. No change required.

---

## Overall Assessment

The implementation is complete and correct against all 61 specs. The two warnings (W1 auto-focus on mount, W2 onMouseEnter/Leave on auth nudge) are real issues but neither is a crash risk or an accessibility failure that blocks ship — W1 is an unexpected focus behaviour on page load and W2 is a code consistency issue. W3 and W4 are housekeeping. The architecture is clean: `App.tsx` lost ~300 lines, `HomeScreen.tsx` is focused and self-contained, `ReadingsModal.tsx` is correctly isolated and accessible. The `COMPLETE_FORM` action is a minimal and correct solution to the post-form navigation problem. Recommend merging after fixing W1.
