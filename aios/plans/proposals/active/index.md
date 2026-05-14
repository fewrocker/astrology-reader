# Active Proposals — Index

_Sprint 0012 proposals. All originated from the Backend Sovereignty sprint vision._

---

## Issue Fixes

| Proposal | Originated by | Summary |
|---|---|---|
| `issue-birth-place-silent-failure` | Taleb, Miyazaki | `birth_place` DB field fails silently when null, string-encoded, or missing `tz` — extract `resolveUserBirthContext()` |

---

## Code Enhancements

| Proposal | Originated by | Summary |
|---|---|---|
| `code-server-astrocore-module` | Carmack, Taleb | Extract shared server primitives into `server/engine/astroCore.ts` before porting engine files — eliminates 6× duplication |

---

## Features

| Proposal | Originated by | Summary |
|---|---|---|
| `feat-server-aspect-engine` | Carmack, Jobs | Port `calculateAspects` + `detectPatterns` to `server/engine/aspectEngine.ts` |
| `feat-server-numerology-engine` | Carmack, Taleb | Port birth-date numerology to server (life path, personal year/month/day); name-dependent numbers labeled as client-provided |
| `feat-server-solar-return-engine` | Jobs, Carmack, Miyazaki, Taleb | Port solar return stack + create `handleSolarReturnInterpretation` |
| `feat-server-synastry-engine` | Jobs, Carmack, Miyazaki, Taleb | Port synastry stack + create `handleSynastryInterpretation`; accepts raw birth data for both people |
| `feat-server-transit-engine` | Jobs, Carmack, Miyazaki, Taleb | Port complete transit stack + upgrade `handleTransitInterpretation` to compute from DB — highest-leverage port |
