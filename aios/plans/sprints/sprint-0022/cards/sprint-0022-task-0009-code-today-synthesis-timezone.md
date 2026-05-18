# code-today-synthesis-timezone

**Type:** Code Enhancement
**Originated by:** Taleb

## Problem / Opportunity

The `today-synthesis` feature computes "today" independently in two places, each using a different timezone anchor, and the server's value wins.

On the client, `TodayPage.tsx` at line 43 calls `calculatePersonalDay(birthDate)` with no `targetDate` argument. Inside `calculatePersonalDay` in `src/engine/numerology.ts` at line 74, the fallback is `new Date()`, and the date digits are extracted with `getFullYear()`, `getMonth()`, and `getDate()` — JavaScript's local-time methods. The result is the user's wall-clock date in their own timezone.

On the server, `handleTodaySynthesis` in `server/services/gpt.ts` does two things that both depend on the server's system clock:

1. It builds the date header at line 585:
   ```ts
   const today = new Date().toLocaleDateString('en-US', {
     weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
   })
   ```
   `toLocaleDateString` without a `timeZone` option resolves to the process's system timezone — UTC on most production hosts.

2. It re-computes the personal day at line 577 by calling `calculatePersonalDay(birthCtx.birthDate)` with no `targetDate`. The server-side `calculatePersonalDay` (in `server/engine/numerologyEngine.js`, mirroring the client engine) likewise falls through to `new Date()` with local-time methods — again the server's system clock.

When `serverPersonalDay !== payload.personalDay`, the handler logs a `console.warn` and silently overwrites the client-computed value with `authorizedPersonalDay = serverPersonalDay` (line 581). The overwritten value is used in the GPT prompt.

The consequence: for a user in UTC+9, the UTC morning window — midnight to 9:00 AM their local time — is the 3:00 PM to midnight UTC window of the prior calendar day. During those nine hours, the server is still on Thursday while the user is already on Friday. The server sends GPT a prompt that begins "Today is Thursday, May 21" and computes a Thursday personal day. The user's TodayPage rendered "Friday, May 22" and a Friday personal day number. The morning synthesis describes the wrong day, with the wrong numerological energy, addressed to the user's correct natal data. The mismatch is invisible to the user — the text simply feels wrong.

This is not a corner case. It is a guaranteed daily occurrence for every user east of UTC+0, roughly nine hours long each calendar day. Users in Japan (UTC+9), South Korea (UTC+9), eastern Australia (UTC+10 to UTC+11), and New Zealand (UTC+12 to UTC+13) are affected every day. For UTC+12 users, the affected window spans midnight to noon — half of waking hours.

The `today-synthesis` payload currently sent from `getTodayPageInterpretation` in `src/services/gptInterpretation.ts` at lines 214–219 contains `moon`, `aspects`, `personalDay`, and `personalDayArchetype`. It does not include the client's local date string. The server has no way to know what day the user is experiencing.

## Desired State

The `today-synthesis` request carries the user's local date — a plain `YYYY-MM-DD` string derived from the client's clock — and the server treats that string as the authoritative "today" for all purposes within the handler.

The morning synthesis prompt opens with the correct day from the user's perspective. The personal day verification uses the same date the client used, so the server computation and the client computation agree when they should, and the `console.warn` branch is exercised only for genuine data anomalies rather than timezone drift. The date header in the GPT prompt names the day the user is actually living, and the personal day number woven through the synthesis reflects the numerological energy the user sees on their own TodayPage card.

From the user's perspective, the morning synthesis reads as coherent: the day name in the prose, the personal day number, and the archetype label all refer to the same date. The reading describes today, not UTC's today.

The local date string is not sensitive information — it is the equivalent of the user telling the server "I am on Friday." The server already receives `personalDay` (a derived integer) from the client; receiving the source date string is strictly less sensitive than what is already trusted from the client.

## Outcome

**Status:** completed — 2026-05-18

**Changes:**

- `src/services/gptInterpretation.ts` — `getTodayPageInterpretation` now derives `localDate = new Date().toLocaleDateString('en-CA')` (yields YYYY-MM-DD in the client's local timezone) and includes it in the `today-synthesis` payload.
- `server/services/gpt.ts` — `handleTodaySynthesis` payload type extended with optional `localDate?: string`. When present, a `targetDate = new Date(localDate)` is constructed and passed to both `calculatePersonalDay(birthCtx.birthDate, targetDate)` (server cross-check) and `targetDate.toLocaleDateString('en-US', ...)` (date header). Falls back to `new Date()` when absent (unauthenticated or old clients).

**Verification:** `npx tsc -b` zero errors; `vite build` succeeded. The server now uses the user's wall-clock date for both the GPT prompt header and the personal-day cross-check, eliminating the UTC vs. local-time mismatch for users east of UTC+0.
