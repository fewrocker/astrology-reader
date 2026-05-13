# feat-gpt-server-proxy

**Type:** Feature
**Originated by:** Carmack, Taleb
**User guidance:** none

---

## Problem / Opportunity

Every GPT feature in the app — transit interpretations, dream readings, dream discussion, numerology narrative, numerology sky chart, astro-numerology cross-reading, daily snapshot, today page synthesis, journal entry annotation, cosmic pattern reading, and all discuss modals — currently calls `api.openai.com` directly from the browser. The OpenAI API key is stored in `localStorage` under the key `astral-chart-openai-key` and retrieved at call time via `getStoredApiKey()` in `src/services/gptInterpretation.ts`.

This creates two compounded problems:

**Security:** A key in `localStorage` is readable by any JavaScript running on the page. A single XSS vulnerability — in a future markdown renderer for journal entries, in a GPT response rendered without sanitization, or in any third-party dependency — can silently exfiltrate the key. OpenAI API keys carry billing consequences and no per-user spend cap; a leaked key can generate arbitrary charges against the user's account. Carmack flagged this explicitly: "Every GPT call should go through the backend... The client never touches the OpenAI key." Taleb notes the same surface: the existing `getStoredApiKey()` pattern and a future JWT sitting side-by-side in localStorage make a single XSS doubly damaging.

**UX friction:** Users must source their own OpenAI API key, paste it into the transit selection panel (`PeriodSelectPanel.tsx`) or the Solar Return page (`SolarReturnPage.tsx`), and trust that the app stores it safely. This is a significant onboarding barrier. Every GPT feature is conditionally hidden or degraded until the user provides a key, with UI copy like "Add an OpenAI API key to unlock your personalized reading" scattered across NumerologyPage, PatternPanel, JournalEntryCard, DailySnapshotCard, DreamModal, and CosmicJournalPage. Sprint-0007 introduces a server — this is the clean break point to eliminate the key entirely from the client.

---

## Vision

GPT features just work. No key setup. The mystical interpretations flow seamlessly.

A user opens their transit reading, their dream journal, their numerology page, their Cosmic Journal — and the cosmic annotation, the dream reading, the morning synthesis, the pattern card all appear without any configuration step. No "Add your API key" banners. No password input fields in the middle of a reading. The server holds the key; the user holds the experience.

The transport layer changes. The interpretation layer does not. Every system prompt, every model choice, every `max_tokens` and `temperature` value is preserved exactly as written in `gptInterpretation.ts` today. This is purely a routing change — the prompts are not touched.

---

## Specifications

### 1. Current state: functions in `gptInterpretation.ts` that call OpenAI

All calls use model `gpt-4o-mini` via the `callOpenAI()` internal function, which POSTs to `https://api.openai.com/v1/chat/completions`. Each exported function accepts `apiKey: string` as its last required parameter and throws if it is empty. The full list:

| Exported function | Callers | `temperature` | `max_tokens` | Purpose |
|---|---|---|---|---|
| `getGptInterpretation(systemPrompt, apiKey)` | `App.tsx` (4×: natal, transit, synastry, synastry-transit) | 0.8 | 2000 | Transit and natal chart interpretation |
| `getDreamInterpretation(description, natalCtx, transitSummary, aspectsText, apiKey, skyCtx?, chartData?)` | `DreamModal.tsx` | 0.85 | 1200 | Full dream reading |
| `getDreamDiscussResponse(dreamContext, messages, apiKey)` | `DreamModal.tsx` | 0.85 | 1000 | Dream discussion follow-up |
| `generateAstroNumerologyCrossReading(numbers, chartData, userName, apiKey)` | `NumerologyPage.tsx` | 0.85 | 900 | Astrology ↔ numerology synthesis |
| `getDailySnapshotInterpretation(prompt, apiKey)` | `DailySnapshotCard.tsx`, `DreamModal.tsx` | 0.75 | 300 | Daily snapshot sentence |
| `generateNumerologyNarrative(numbers, userName, apiKey)` | `NumerologyPage.tsx` | 0.85 | 1200 | Full numerology narrative |
| `generateNumerologySkyChartReading(birthData, frequencyMap, apiKey)` | `NumerologyPage.tsx` | 0.85 | 900 | Numerological sky chart reading |
| `getTodayPageInterpretation(moon, aspects, personalDay, archetype, apiKey)` | `TodayPage.tsx` | 0.8 | 350 | Morning synthesis |
| `getNumerologyDiscussResponse(context, messages, apiKey)` | `NumerologyDiscussModal.tsx` | 0.85 | 1000 | Numerology discussion follow-up |
| `getDiscussResponse(astroContext, messages, apiKey)` | `DiscussModal.tsx` | 0.8 | 1500 | Astro chart discussion |
| `generateJournalEntryAnnotation(entry, topTransits, moonPhase, moonSign, chartData, apiKey)` | `JournalEntryCard.tsx` | 0.8 | 80 | One-sentence cosmic annotation |
| `generateCosmicPatternReading(patterns, chartData, totalCount, apiKey)` | `PatternPanel.tsx` | 0.85 | 800 | Pattern cards (JSON response) |

The internal `callOpenAI()` and `retryWithBackoff()` functions are private and will move to the server unchanged.

---

### 2. Server endpoint: `POST /api/gpt/interpret`

The endpoint accepts a JSON body identifying which interpretation to generate and the data needed to build its prompt server-side:

```
POST /api/gpt/interpret
Authorization: Bearer <jwt>   (optional — unauthenticated calls are allowed with reduced limit)
Content-Type: application/json

{
  "type": "<interpretation type>",
  "payload": { ... }  // type-specific payload; see section 3
}
```

The server:
1. Reads the `type` field and routes to the corresponding prompt-builder function (migrated from `gptInterpretation.ts`)
2. Checks the rate limit for the caller (section 4)
3. Calls OpenAI using `OPENAI_API_KEY` from `process.env`
4. Returns `{ "result": "<interpretation text>" }` on success
5. Returns `{ "error": "<message>", "resetAt": <ISO timestamp> }` on 429 (rate limit)
6. Returns `{ "error": "<message>" }` on 5xx or OpenAI error

The server does not construct prompts from raw strings passed by the client. The client sends typed structured data (numbers, chart positions, entry text); the server builds the system and user messages identically to how `gptInterpretation.ts` does today. This prevents prompt injection — a client cannot craft an arbitrary prompt string to send through the proxy.

---

### 3. All GPT call types to proxy — `type` values and their payloads

Each type maps to exactly one exported function in the current `gptInterpretation.ts`:

**`"transit-interpretation"`** — maps to `getGptInterpretation`
```json
{ "systemPrompt": string }
```
The caller (App.tsx) already builds the full system prompt string before calling; that string is the payload. The server sends it as the user message with the fixed astrologer system message.

**`"dream-interpretation"`** — maps to `getDreamInterpretation`
```json
{
  "dreamDescription": string,
  "natalContext": string,
  "transitSummary": string,
  "transitAspectsText": string,
  "skyContext": { "moonSign": string, "moonPhase": string, "transits": [...] } | null,
  "chartData": { "planets": [...], "angles": {...}, "unknownTime": boolean } | null
}
```

**`"dream-discuss"`** — maps to `getDreamDiscussResponse`
```json
{
  "dreamContext": string,
  "messages": [{ "role": "user" | "assistant", "content": string }]
}
```

**`"astro-numerology-cross"`** — maps to `generateAstroNumerologyCrossReading`
```json
{
  "numbers": { "lifePath": number, "birthdayNumber": number, "personalYear": number, "expressionNumber"?: number },
  "chartData": { "planets": [...], "angles": {...}, "unknownTime": boolean },
  "userName": string | null
}
```

**`"daily-snapshot"`** — maps to `getDailySnapshotInterpretation`
```json
{ "prompt": string }
```
The caller builds the prompt string; the server sends it with the fixed snapshot system message.

**`"numerology-narrative"`** — maps to `generateNumerologyNarrative`
```json
{
  "numbers": { "lifePath": number, "birthdayNumber": number, "personalYear": number, "expressionNumber"?: number, "soulUrge"?: number },
  "userName": string | null
}
```

**`"numerology-sky-chart"`** — maps to `generateNumerologySkyChartReading`
```json
{
  "birthData": { "name"?: string, "date": string },
  "frequencyMap": Record<number, Array<{ "label": string, "eclipticDegree": number }>>
}
```

**`"today-synthesis"`** — maps to `getTodayPageInterpretation`
```json
{
  "moon": { "phaseName": string, "moonSign": string, "isVoid": boolean },
  "aspects": [{ "transitPlanet": string, "symbol": string, "natalPlanet": string, "orb": number, "nature": string }],
  "personalDay": number,
  "personalDayArchetype": string
}
```

**`"numerology-discuss"`** — maps to `getNumerologyDiscussResponse`
```json
{
  "numerologyContext": string,
  "messages": [{ "role": "user" | "assistant", "content": string }]
}
```

**`"astro-discuss"`** — maps to `getDiscussResponse`
```json
{
  "astroContext": string,
  "messages": [{ "role": "user" | "assistant", "content": string }]
}
```

**`"journal-annotation"`** — maps to `generateJournalEntryAnnotation`
```json
{
  "entry": { "date": string, "time": string, "body": string, "numerologicalDay": number },
  "topTransits": [{ "transitPlanet": string, "symbol": string, "natalPlanet": string, "orb": number, "nature": string }],
  "moonPhase": string,
  "moonSign": string,
  "chartData": { "planets": [...], "angles": {...} }
}
```

**`"cosmic-pattern-reading"`** — maps to `generateCosmicPatternReading`
```json
{
  "patterns": [{ "tagGroup": string, "dominantPlanets": string[], "dominantPhases": string[], "dominantPersonalDays": number[], "sampleSize": number, "entryDates": string[] }],
  "chartData": { "planets": [...], "angles": {...}, "unknownTime": boolean },
  "totalEntryCount": number
}
```
This is the only call that expects a JSON array response from OpenAI. The server handles the JSON parsing and fallback logic currently in `generateCosmicPatternReading` and returns a typed `PatternReading[]` inside `{ "result": [...] }`.

---

### 4. Server-side rate limiting

Implemented in `server/middleware/gptRateLimit.ts` using an in-memory `Map`:

```ts
type RateLimitEntry = { count: number; resetAt: number }  // resetAt = unix ms

const authenticated: Map<number, RateLimitEntry> = new Map()  // keyed by user_id
const unauthenticated: Map<string, RateLimitEntry> = new Map()  // keyed by IP
```

- **Authenticated limit:** 20 GPT calls per user per rolling 24-hour window. Configurable via `GPT_AUTH_DAILY_LIMIT` environment variable (default 20). The `user_id` comes from the verified JWT in `req.user`.
- **Unauthenticated limit:** 5 GPT calls per IP per rolling 24-hour window. Configurable via `GPT_UNAUTH_DAILY_LIMIT` environment variable (default 5). IP is read from `req.ip` (respecting the `trust proxy` Express setting for deployments behind a reverse proxy).
- **429 response when exceeded:**
```json
{ "error": "rate_limit_exceeded", "resetAt": "2026-05-14T00:00:00.000Z", "limit": 20, "authenticated": true }
```
- **Reset logic:** `resetAt` is set to midnight UTC of the following calendar day at the time of the first call in the window. Each subsequent call in the window decrements the remaining count. When `Date.now() >= resetAt`, the entry is deleted (lazy cleanup — no background timer needed).
- **Memory note:** At 10,000 active users, the map holds at most ~80KB of state. This is acceptable for v1. If the server restarts, all counts reset — this is intentional and acceptable: rate limits are a courtesy guard, not a billing enforcement mechanism.

---

### 5. Client changes to `gptInterpretation.ts`

Every exported function retains its exact current signature — callers in `App.tsx`, `DreamModal.tsx`, `NumerologyPage.tsx`, `TodayPage.tsx`, and all other components do not change their call sites at all. The `apiKey` parameter is removed from each signature (it has no meaning on the client any more), and the function bodies are replaced with a single `fetch` to `/api/gpt/interpret`.

The `callOpenAI()` and `retryWithBackoff()` private functions are deleted from the client file entirely — they move to the server.

All client-side GPT functions delegate to a single internal helper:

```ts
async function callProxy(type: string, payload: object): Promise<string> {
  return apiClient.post('/api/gpt/interpret', { type, payload })
}
```

`apiClient` is the thin fetch wrapper introduced in `src/services/apiClient.ts` (from `feat-api-client-fetch-abstraction`). It injects the Authorization header from the stored JWT (when present), resolves the correct base URL, enforces a timeout, and returns typed error objects. Using `apiClient` here means unauthenticated users still reach the endpoint — the header is simply absent, and the server applies the IP-based limit.

The `retryWithBackoff` logic on 429 from the current client implementation is removed. The server itself retries against OpenAI on 503/504 (the same retry logic moves to the server); the client does not retry a 429 from the server proxy (that is a rate limit, not a transient error).

Return types of all functions are unchanged. For `generateCosmicPatternReading`, the server returns `{ result: PatternReading[] }` and the client deserializes it as before.

---

### 6. Remove from frontend

The following are deleted entirely:

- **`getStoredApiKey()`** — exported function in `gptInterpretation.ts`. Remove the function, the `API_KEY_STORAGE` constant (`'astral-chart-openai-key'`), the `DEFAULT_KEY` constant reading from `VITE_OPENAI_API_KEY`, and all 13 call sites across: `App.tsx`, `JournalEntryCard.tsx`, `CosmicJournalPage.tsx`, `PatternPanel.tsx`, `DailySnapshotCard.tsx`, `TodayPage.tsx`, `SolarReturnPage.tsx`, `NumerologyPage.tsx`, `NumerologyDiscussModal.tsx`, `DreamModal.tsx`, `DiscussModal.tsx`.

- **`storeApiKey(key)`** — exported function in `gptInterpretation.ts`. Remove the function and the 3 call sites in: `PeriodSelectPanel.tsx` (2×), `SolarReturnPage.tsx` (1×).

- **API key input UI in `PeriodSelectPanel.tsx`** — the `<label>OpenAI API Key</label>` block (lines ~150–167), the `showKeyInput` state, the `<input type="password">` field, and the `<button>Change API Key</button>`. The panel reverts to always showing the period selection controls; the `isDisabled` condition no longer includes `!apiKey`.

- **API key input UI in `SolarReturnPage.tsx`** — the `showKeyInput` state, the `apiKey` state, and the entire conditional block (lines ~213–230) that renders "OpenAI API Key Required" with a password input. The Solar Return page always attempts to request an interpretation.

- **Inline "add an API key" prompts** — the conditional `{!apiKey && <span>...</span>}` text blocks in `CosmicJournalPage.tsx` (lines 282–283, 435), `JournalEntryCard.tsx` (lines 292–293), `PatternPanel.tsx` (lines 347–349), `NumerologyPage.tsx` (lines 431–433, 624–626, 677–679), `DailySnapshotCard.tsx` (line 122–124), `DreamModal.tsx` (line 200). Replace these with the error states from section 8 (rate limit message, offline message).

- **`VITE_OPENAI_API_KEY` environment variable** — remove from `.env.example` and any documentation referencing it. The only key that matters is `OPENAI_API_KEY` on the server.

- **`API_KEY_STORAGE` localStorage key** — the key `'astral-chart-openai-key'` is removed from localStorage management. On first load after this change ships, any stored key in localStorage under this name is ignored and can be cleared on CLEAR_CACHE. No active clearing is performed — the key simply becomes inert.

Nothing in `AppContext` / `AppState` changes: the API key was never part of `AppState` or the reducer. The `appState.ts` file is not touched by this proposal.

---

### 7. Server environment variable

`OPENAI_API_KEY` is read from `process.env` in the server route handler. It must be present for any GPT call to succeed. If it is absent:

- The server does not crash at startup (unlike `JWT_SECRET` — see `issue-jwt-secret-env-guard`). GPT is an optional enhancement, not a core auth dependency.
- Any call to `POST /api/gpt/interpret` returns HTTP 503 with `{ "error": "gpt_unavailable" }`.
- The client surfaces this as the generic "Couldn't generate interpretation" message (section 8), identical to a 5xx.

This allows deploying the server without an OpenAI key (e.g., to test auth-only flows) without breaking the app.

---

### 8. Error handling on the client

The client-side GPT functions translate proxy errors into user-facing messages. The `apiClient` returns typed error objects; each function maps them:

| Server response | User-facing message | Behavior |
|---|---|---|
| HTTP 429 `rate_limit_exceeded` | "Daily reading limit reached — try again tomorrow." | Displayed inline where the interpretation would appear. `resetAt` is shown if present: "Resets at midnight UTC." |
| HTTP 5xx or `gpt_unavailable` | "Couldn't generate interpretation — using a cached reading if available." | Displayed inline. Falls back to any previously stored interpretation string in component state (e.g., a cached `transitInterpretation` already in Redux state). |
| Network error / timeout (no response) | "Couldn't connect to the server — interpretation unavailable offline." | `apiClient` returns `{ ok: false, error: 'offline' }` after the 10-second timeout. Displayed inline. No retry loop — the user can manually trigger re-fetch if a button is present. |
| HTTP 401 (token expired mid-session) | Silent token clearing + treat as unauthenticated | `apiClient` handles 401 globally by clearing the stored JWT. The next GPT call will be unauthenticated and subject to the IP rate limit instead. |

Error strings are constants defined in a `src/services/gptErrors.ts` file (new, small) so they can be reused across components without duplication.

---

### 9. Unauthenticated path

GPT features are not gated on authentication. An unauthenticated user gets 5 GPT calls per day per IP — enough to experience the natal reading, one transit interpretation, and one numerology reading before being prompted to register.

The "add an API key" prompts removed in section 6 are replaced with:
- Nothing — for features where 0 calls have been consumed: the feature simply works.
- A quiet nudge after the 3rd call (not the 5th): "✦ Create an account for 20 daily readings." This is displayed as a single line beneath the interpretation result, never as a modal or blocker. It is not shown until 3 calls have been consumed for the session.
- When the limit is hit (5th call exhausted): the 429 message from section 8 appears, followed by: "✦ Sign up for a free account to get 20 readings per day."

The prompt to register appears after limit is approached, not when it is hit — consistent with the sprint-0007 vision's "auth is additive, not required" principle.

---

### 10. No changes to interpretation content

The system prompts, user prompts, model (`gpt-4o-mini`), temperature, and `max_tokens` values for every function are copied verbatim from `gptInterpretation.ts` to the server. This proposal touches only the transport layer. If a prompt is wrong or needs tuning, that is a separate proposal.

---

### 11. New server file: `server/routes/gpt.ts`

```
server/routes/gpt.ts    — POST /api/gpt/interpret handler
server/services/gpt.ts  — prompt-building functions (migrated from gptInterpretation.ts)
server/middleware/gptRateLimit.ts — in-memory rate limiter
```

The route follows the three-layer convention established by the sprint-0007 architecture: route (HTTP parsing only) → service (prompt building, OpenAI call) → no db access for GPT (rate limit state is in-memory, not persisted). This respects Carmack's three-layer boundary requirement.

The `callOpenAI()` and `retryWithBackoff()` functions move to `server/services/gpt.ts`. The retry behavior on OpenAI 429/503/504 is preserved on the server side.

---

## Out of Scope

- Changing any prompt content, system messages, or model parameters — the interpretation layer is not touched
- Adding new GPT features or new interpretation types
- Streaming responses (chunked SSE) — all responses are returned as complete strings, as today
- Model switching (e.g., user-selectable gpt-4o vs gpt-4o-mini)
- Per-user cost tracking or billing enforcement — the in-memory rate limit is a courtesy guard only
- Persistent rate limit state across server restarts — counter resets on deploy, which is acceptable for v1
- GPT call logging or analytics
- The `VITE_OPENAI_API_KEY` env var removal from the Vite build configuration requires verifying no other component reads it; if any do, those are addressed as part of this proposal's cleanup step

---

## Open Questions

**1. Per-IP vs session-based rate limiting for unauthenticated users.**
The current spec uses `req.ip` for unauthenticated rate limiting. This is simple but has two known failure modes: (a) shared IP environments (office networks, university WiFi, carrier-grade NAT) where multiple users share one IP and collectively exhaust the limit; (b) VPNs and proxies that can trivially rotate IPs to bypass the limit. Session-based limiting (a server-generated session token in a cookie or response header, stored by the client) is harder to bypass but requires state management. For v1, per-IP is acceptable — the rate limit exists to prevent runaway costs, not to enforce a paywall. Document the decision explicitly in the implementation so it can be revisited.

**2. Whether `POST /api/gpt/interpret` is a single endpoint or split by type.**
The single endpoint with a `type` discriminator is simpler to add rate limiting to and simpler to document. The alternative — `POST /api/gpt/transit`, `POST /api/gpt/dream`, etc. — provides more granular rate limits per feature (e.g., cosmic pattern readings, which are expensive, could have a separate stricter limit). Deferred for v1; the single endpoint architecture does not prevent per-type limits from being added later by inspecting the `type` field inside the rate limiter.

**3. Whether the `apiKey` parameter is removed from client function signatures immediately or deprecated gradually.**
Removing it in one PR is cleaner but requires touching every call site at once (13 files). A two-phase approach — marking `apiKey` as optional with a deprecation comment and ignoring it if passed, then removing it in a follow-up — allows the PR to be smaller. Given that the sprint already touches all these files for auth integration, a single-pass removal is preferred.
