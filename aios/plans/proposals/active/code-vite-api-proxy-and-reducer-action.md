# Code Enhancement: Vite API Proxy and LOAD_BIRTH_DATA_FROM_SERVER Reducer Action

**Type:** Code Enhancement
**Originated by:** Carmack, Taleb

---

## Problem / Opportunity

Two small but blocking issues that will prevent local backend development and introduce state management bugs as soon as the auth layer lands.

### 1. Missing Vite dev proxy for `/api/*`

`vite.config.ts` currently reads:

```ts
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['.ngrok-free.app'],
  },
})
```

There is no `server.proxy` entry. The Vite dev server runs on port 5173. The Express backend runs on port 3001. Any `fetch('/api/auth/login')` call from a component during local development hits port 5173, which has no `/api` route and returns a 404 or connection refused error.

This means it is impossible to test any backend integration locally without first running `vite build` and serving from the Express server — which eliminates hot module reload and makes the development loop extremely slow. Every developer working on the auth layer will encounter this immediately and will need to work around it (hardcoding `http://localhost:3001/api/...` in service calls), creating a class of bugs where absolute URLs are accidentally committed.

### 2. `UPDATE_BIRTH_DATA` triggers a localStorage write on every dispatch

In `src/context/appState.ts`, `UPDATE_BIRTH_DATA` is defined in `AppAction` and handled in `appReducer` as:

```ts
case 'UPDATE_BIRTH_DATA':
  return { ...state, birthData: { ...state.birthData, ...action.data } }
```

The reducer itself does not call `saveBirthData()` — but every call site that dispatches `UPDATE_BIRTH_DATA` with the intent of persisting data also calls `saveBirthData()` explicitly. This is currently fine because all birth data originates from the user-filled form, and saving to localStorage is always correct in that context.

Once `AuthContext` is introduced, there is a new source of birth data: `GET /api/auth/me` returns the user's server-stored birth data on session restoration. The natural implementation dispatches `UPDATE_BIRTH_DATA` with the server response to update the app state. But any call site that dispatches `UPDATE_BIRTH_DATA` and also calls `saveBirthData()` will write server data back to localStorage, potentially stamping over locally-entered data that has not yet been synced. More importantly, there is no way to distinguish "this dispatch came from the server" from "this dispatch came from the form" using a single shared action type. Consumers cannot safely decide whether to persist or not — the action carries no intent signal.

Without a dedicated action, the auth layer will either (a) overwrite localStorage on every session restore, creating source-of-truth ambiguity, or (b) resort to a flag variable or a custom hook to suppress the persistence call, which is fragile and untestable.

## Desired State

### 1. Vite proxy

`vite.config.ts` gains a `server.proxy` block:

```ts
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['.ngrok-free.app'],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
```

All `fetch('/api/...')` calls from the Vite dev server are transparently forwarded to the Express backend at port 3001. No URL changes are needed in service files. Hot module reload continues to work. In production, the Express server handles `/api/*` directly — no proxy involved.

### 2. `LOAD_BIRTH_DATA_FROM_SERVER` reducer action

`AppAction` in `src/context/appState.ts` gains a new discriminated union member:

```ts
| { type: 'LOAD_BIRTH_DATA_FROM_SERVER'; data: BirthData }
```

The corresponding `appReducer` case performs a pure state update with no localStorage side effect:

```ts
case 'LOAD_BIRTH_DATA_FROM_SERVER':
  return { ...state, birthData: action.data }
```

`AuthContext` dispatches `LOAD_BIRTH_DATA_FROM_SERVER` after a successful `GET /api/auth/me` response. `UPDATE_BIRTH_DATA` continues to be dispatched by the form wizard and calls `saveBirthData()` at its call sites as before — its semantics are unchanged. The two actions have distinct, unambiguous intent: one comes from user input and persists; the other comes from the server and does not.

## Implementation

**Files modified:**

- `vite.config.ts` — add `server.proxy` block (4 lines)
- `src/context/appState.ts` — add `LOAD_BIRTH_DATA_FROM_SERVER` to `AppAction` union (1 line) and add the `case` to `appReducer` (2 lines)

No other files need changes. `AuthContext.tsx` (new in sprint-0007) will use `LOAD_BIRTH_DATA_FROM_SERVER` from the start.

## Impact

**Blocking for local development** (proxy) and **blocking for correct auth state management** (reducer action). Both are trivially small changes that eliminate an entire class of bugs if landed before any auth code is written.
**Effort** — Very low: 4 lines in `vite.config.ts`, 3 lines in `appState.ts`.

## Dependencies

None. Both changes are self-contained additions with no new packages required.

## Acceptance Criteria

- [ ] `vite.config.ts` has a `server.proxy` block routing `/api` to `http://localhost:3001` with `changeOrigin: true`
- [ ] `fetch('/api/auth/login')` from the Vite dev server on port 5173 successfully reaches the Express server on port 3001
- [ ] `AppAction` union in `src/context/appState.ts` includes `{ type: 'LOAD_BIRTH_DATA_FROM_SERVER'; data: BirthData }`
- [ ] `appReducer` handles `LOAD_BIRTH_DATA_FROM_SERVER` by setting `state.birthData` without calling `saveBirthData()`
- [ ] TypeScript compiles with zero errors after both changes
- [ ] Existing `UPDATE_BIRTH_DATA` behavior is unchanged
- [ ] `AuthContext` dispatches `LOAD_BIRTH_DATA_FROM_SERVER` (not `UPDATE_BIRTH_DATA`) when populating state from `GET /api/auth/me`
