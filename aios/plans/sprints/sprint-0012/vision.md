# Sprint 0012 — Vision

## Sprint Focus

Sprint 0012 is about making the server the sovereign source of astrological truth. Every calculation that currently lives only in the browser — natal chart, transits, aspects, synastry, solar return, transit aspects, prompt assembly — must also be executable on the backend, so that any server-side feature (GPT calls, journal annotations, dream interpretations, daily snapshots, cosmic pattern readings) can arrive at the same data the frontend arrives at, without depending on what the client chose to send.

---

## Why Now

The reference commits (cfd6076, fe51ab02) proved the model works: `server/engine/chartEngine.ts` was written as a self-contained port of `src/engine/astronomy.ts`, and the dream interpretation handler now falls back to server-computed chart and sky context when the client sends neither. That fallback already ships in production.

What those commits revealed, by solving one corner, is how many corners remain uncovered:

- **Transit calculation** (`calculateTransits`, `buildTransitPrompt`) lives entirely in `src/engine/transits.ts` and `src/App.tsx`. The server's `handleTransitInterpretation` handler in `server/services/gpt.ts` accepts a pre-built `systemPrompt` string from the client. The client constructs the prompt, sends it, and the server blindly executes it. This is the same problem the dream handler had: if the client doesn't compute the right thing, the server never has a chance to compensate.

- **Synastry calculation** (`calculateSynastry`, `buildSynastryPrompt`) is constructed entirely in `src/App.tsx` and `src/engine/synastry.ts`. The server's synastry GPT handler doesn't exist yet — it routes through `transit-interpretation` via `getGptInterpretation`. Same pattern: client builds, server executes blindly.

- **Solar return calculation** (`calculateSolarReturn`, `buildSolarReturnPrompt`) is entirely client-side. The server never computes a solar return chart.

- **Numerology** (`src/engine/numerology.ts`) has no server-side equivalent. Every `astro-numerology-cross` call requires the client to send the numbers; the server can't compute them from stored birth data.

- **Aspects** (`calculateAspects`, `detectPatterns`) are not on the server. The `journal-annotation` handler receives pre-filtered top-transit aspects from the client. If the client omits an aspect or sends stale data, the server has no way to recompute.

- **Prompt builders for transit, synastry, couple transit, solar return** all live in `src/engine/` frontend files. When these prompts are sent to the server, the server accepts them verbatim. There is no server-side prompt assembly.

The gap: the backend can compute a natal chart and today's moon/transit snapshot (from `chartEngine.ts`), but it cannot compute transits for a period, cannot run synastry, cannot find a solar return, cannot build a numerology profile, and cannot assemble any of the four main GPT prompts.

This is the right sprint to close that gap because the pattern is now established (chartEngine.ts shows exactly what the port looks like), the product is entering a phase where server-side reliability matters (auth, subscriptions, journal persistence are already server-owned), and every feature added from here on will need to call server-side GPT with full astrological context.

---

## Where to Look

### 1. What already exists on the server
- `server/engine/chartEngine.ts` — natal chart (`calculateChart`), moon info (`getMoonInfo`), transit aspects snapshot (`getActiveTransitAspects`). This is the template for everything that follows.
- `server/services/gpt.ts` — 12 GPT handlers, all accepting pre-computed payloads from the client. Dream interpretation (`handleDreamInterpretation`) is the one exception that now falls back to server-side chart computation.

### 2. Frontend engine files that have no server equivalent
| Frontend file | Key exports | Server status |
|---|---|---|
| `src/engine/transits.ts` | `calculateTransits`, `calculateCurrentPositions`, `calculateTransitAspects`, `buildTransitPrompt`, `buildCoupleTransitPrompt`, `getTopActiveTransits`, `computeEnergyRating` | Missing entirely |
| `src/engine/aspects.ts` | `calculateAspects`, `detectPatterns` | Missing entirely |
| `src/engine/synastry.ts` | `calculateSynastry`, `buildSynastryPrompt`, `buildCoupleTransitPrompt` | Missing entirely |
| `src/engine/solarReturn.ts` | `calculateSolarReturn`, `buildSolarReturnPrompt` | Missing entirely |
| `src/engine/numerology.ts` | `calculateLifePath`, `calculatePersonalYear`, `calculateExpressionNumber`, etc. | Missing entirely |
| `src/engine/lunar.ts` | `getCurrentMoonPhase`, `getLunarCalendar`, `getNatalMoonPhase` | Moon sign/phase only (partial, in chartEngine.ts) |
| `src/engine/zodiac.ts` | `longitudeToZodiac`, `normalizeAngle` | Inlined in chartEngine.ts, not modular |
| `src/engine/transitTimeline.ts` | `buildTransitTimeline` | Missing entirely |

### 3. GPT handlers that receive raw prompts instead of computing them
- `handleTransitInterpretation` in `server/services/gpt.ts` (line 179) — accepts `{ systemPrompt: string }` verbatim. The transit prompt is assembled entirely in `src/App.tsx` (line 317) and `src/engine/transits.ts` (`buildTransitPrompt`). The server should be able to build this prompt itself from stored birth data.
- Synastry, couple transit, and solar return GPT calls all follow the same pattern: `getGptInterpretation(prompt)` in `src/components/results/` sends a pre-built string.

### 4. Key call sites in the frontend (what to trace)
- `src/App.tsx` lines 260–495 — the four `useEffect` hooks that run natal, transit, synastry, and solar return calculations on loading views. These are the canonical places where frontend calculation happens before the GPT call is made.
- `src/components/reading/DailySnapshotCard.tsx` line 113–131 — calculates current positions and aspects, builds a prompt, then calls `getDailySnapshotInterpretation`. The prompt builder `buildSnapshotPrompt` (defined at line 24 of that file) lives only in the component.
- `src/components/reading/TodayPage.tsx` line 58–75 — same pattern: `getTopActiveTransits` and `calculateTransitAspects` called client-side, result passed directly to `getTodayPageInterpretation`.
- `src/components/journal/CosmicJournalPage.tsx` line 203–260 — `getTopActiveTransits` called for historical dates for journal annotation. The server handler at `handleJournalAnnotation` accepts pre-computed transit slices.
- `src/components/dream/DreamModal.tsx` line 213–260 — still computes current transit aspects and snapshot on the client before calling the dream handler, though the server now has a fallback for missing chart/sky data.

### 5. Data that reaches the server correctly vs incorrectly
- **Correct today**: dream chart + sky context (server falls back if absent)
- **Never sent, never needed yet**: transit calculation results (for transit reading GPT), synastry data (for synastry GPT), solar return chart (for SR GPT), numerology numbers (always sent by client for astro-numerology-cross)
- **Sent as opaque prompt strings**: transit reading, synastry reading, solar return reading — the server has no visibility into what's in these prompts

---

## Quality Bar

"Deep, not shallow" for this sprint means the server can produce the same astrological data structure that the frontend produces for any authenticated user whose birth data is stored — with no dependency on client-provided calculation results.

The test: take a user's stored `birth_date`, `birth_time`, and `birth_place` (already in the DB, already parsed by the dream handler). For each of the four reading types (natal, transit, synastry, solar return), the backend should be able to:
1. Compute the chart data structure
2. Run the relevant calculation (transits for the period, synastry cross-aspects, solar return moment)
3. Assemble the GPT prompt using the same logic the frontend uses
4. Call GPT with that prompt

A handler that builds only a partial prompt, or relies on the client for orb sorting, or skips house context, fails the bar. The quality standard is: server-assembled prompts must be identical in information density to frontend-assembled prompts. Not a watered-down version.

The frontend calculation must remain in place for instantaneous UX — the loading-view pattern in `src/App.tsx` should not be removed. What changes is that the server can also do it, independently, whenever it needs to. Frontend stays fast; backend becomes sovereign.

A secondary quality check: duplicate logic (e.g., `normalizeAngle`, `longitudeToZodiac`, `getMeanNodeLongitude` appearing identically in both `chartEngine.ts` and `astronomy.ts`) should be resolved by establishing a clean shared module structure in `server/engine/`, not by accumulating more copies.

---

## What This Sprint Is NOT

- **Not a frontend removal.** Do not delete or disable frontend calculations. The client-side `calculateChart`, `calculateTransits`, `calculateAspects`, `calculateSynastry`, and `calculateSolarReturn` calls in `src/App.tsx` remain in place for instantaneous UI responsiveness. The sprint adds backend capability; it does not remove frontend capability.
- **Not a new feature.** No new reading types, no new pages, no new UI sections. The sprint is purely infrastructure and calculation sovereignty. If a task requires adding a new surface the user can see, it is out of scope.
- **Not a rewrite of interpretation data.** `src/data/interpretations/` files are not modified. The server does not need its own copy of interpretation tables; when it assembles prompts, it references the same text the frontend uses (by porting the prompt-builder functions, not the database itself).
- **Not a GPT prompt redesign.** The goal is parity with existing frontend prompts, not improvements to prompt quality. Prompt content changes are deferred to a future sprint.
- **Not the transit timeline.** `src/engine/transitTimeline.ts` is 477 lines of binary-search logic for aspect perfection dates, retrograde stations, and lunar phases. It is used exclusively for the client-side transit timeline tab. It is the most computationally expensive engine file and has no current server-side use case. Porting it is lower priority than the four main calculation types (natal, transits, synastry, solar return).
- **Not a database schema change.** No new tables, no new columns. The sprint reads from `birth_date`, `birth_time`, `birth_place` which already exist. If a feature requires a schema change, it is out of scope.
- **Not a refactor of the frontend state machine.** The `useEffect` loading views in `src/App.tsx` are not restructured. The frontend-first calculation pattern stays; the backend gains parallel capability.
