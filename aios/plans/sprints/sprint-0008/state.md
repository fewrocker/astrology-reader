# Sprint 0008 State

**Branch:** sprint-0008
**Status:** complete
**Started:** 2026-05-13
**Completed:** 2026-05-13

## Tasks

| Task | Name | Status |
|------|------|--------|
| 0001 | code-app-tsx-extraction | done |
| 0002 | feat-home-screen-redesign | done |
| 0003 | feat-readings-navigation-modal | done |
| 0004 | feat-split-render-ai-screens | done |

## Conflict Resolutions

### App.tsx — task-0002 vs HEAD
- Conflict: `useMemo` import (HEAD) vs absent (task-0002). Resolution: kept `useMemo` since it was needed by journalChartData added in pre-sprint commit.
- Conflict: `showCachedLanding` condition. HEAD used `formStep === 0` guard; task-0002 removed it. Resolution: merged to use `cachedBirthDataExists` (computed once on mount, per spec 45) but dropped `formStep === 0` guard per spec 44.
- Conflict: `HomeScreen` import vs duplicate `HomeScreen` import. Resolution: kept single import.

### HomeScreen.tsx — task-0001 vs task-0002
- Both branches created the file. task-0001 extracted the old button-list layout; task-0002 completely redesigned it.
- Resolution: took task-0002's version entirely (identity line, embedded DailySnapshotCard, ReadingsModal, auth nudge, single CTA) as this is the intended redesign.

### App.tsx — task-0003 vs HEAD (task-0002 merged)
- Conflict: task-0003 added `CachedDataNudge` and `CachedDataLanding` back into App.tsx (it branched from task-0001 base, before task-0002 extraction).
- Resolution: discarded task-0003's injection — HomeScreen.tsx already handles all this. Kept HEAD's import structure.

### ReadingsModal.tsx — task-0002 vs task-0003
- Both created the file. task-0002: uses `useApp` dispatch internally, `triggerRef`, `onDreamOpen` prop. task-0003: purely presentational with `onSelect: (action: AppAction) => void` per spec.
- Resolution: merged both — kept task-0003's presentational architecture (`onSelect`, `GROUPS` constant, scrollable layout, spec-compliant shell) with task-0002's focus trap and entrance animation. Updated HomeScreen.tsx to pass `onSelect={action => dispatch(action)}`.

### appState.ts — task-0004 vs merged state
- `SET_TRANSIT_DATA` reducer referenced `transitLoading: false` which was removed from `AppState` by task-0001.
- Resolution: removed `transitLoading: false` from the spread (field no longer exists in AppState).
