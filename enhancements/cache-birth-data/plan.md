# Enhancement: Cache Birth Data in localStorage

## What Exists Today
- Birth data (date, time, unknownTime, city, focusAreas) is managed via `useReducer` in `AppContext.tsx`
- Initial state is hardcoded in `appState.ts` (`initialBirthData`) — always starts empty
- When the user resets or revisits the app, all form fields are blank
- Related files:
  - `src/context/appState.ts` — state types, reducer, initial values
  - `src/context/AppContext.tsx` — React context provider with `useReducer`

## What the User Wants
Cache the user's birth date, time, and city in localStorage so that if the user has filled the form once, their data is pre-populated on subsequent visits.

## What Needs to Change

### `src/context/appState.ts`
- Add `loadCachedBirthData()` function that reads from localStorage and returns merged `BirthData`
- Add `saveBirthData()` function that writes birth data to localStorage
- Update `initialState` to use `loadCachedBirthData()` for birth data defaults

### `src/context/AppContext.tsx`
- After each `UPDATE_BIRTH_DATA` dispatch, persist the updated birth data to localStorage
- On `RESET`, keep birth data in cache (user likely wants to tweak, not re-enter)

## Implementation Tasks
- [x] Add `loadCachedBirthData` and `saveBirthData` helpers in `appState.ts`
- [x] Update `initialState` to load from cache
- [x] Persist birth data on updates in `AppContext.tsx`
- [x] Verify build passes with zero errors
- [x] Manual test: fill form → reload → data persists
