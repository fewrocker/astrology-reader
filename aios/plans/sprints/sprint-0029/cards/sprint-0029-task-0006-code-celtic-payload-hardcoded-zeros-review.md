# Review: code-celtic-payload-hardcoded-zeros

**Task:** sprint-0029-task-0006
**Branch:** sprint-0029-task-0006-code-celtic-payload-hardcoded-zeros
**Status:** Complete

---

## What Was Done

### Modified: `src/components/tarot/CelticCrossReading.tsx`

In `buildCelticSynthesisPayload`, replaced the two hardcoded zero values with `null`:

```typescript
personalYear: null,
lifePathNumber: null,
```

These fields have no valid source at the Celtic Cross client boundary — the component receives no `birthDate` prop and cannot compute them. Sending `null` accurately represents "unavailable" instead of fabricating `0`, which GPT cannot distinguish from a real numerology value.

### Modified: `server/services/gptTarot.ts`

Two changes in tandem:

1. Interface update — `TarotCelticSynthesisPayload` now types both fields as `number | null`:
   ```typescript
   personalYear: number | null
   lifePathNumber: number | null
   ```

2. Prompt template update — the lines that emit `Life Path` and `Personal Year` into the GPT context are now conditional:
   ```typescript
   ${authorizedLifePath !== null ? `Life Path: ${authorizedLifePath}` : ''}
   ${authorizedPersonalYear !== null ? `Personal Year: ${authorizedPersonalYear}, ` : ''}Personal Day: ${authorizedPersonalDay}
   ```
   When values are unavailable, those lines are omitted. `personalDay` is always written because it derives from the calendar date, not from birth data, and is always valid.

For authenticated users whose birth context resolves server-side, `calculatePersonalYear()` and `calculateLifePath()` overwrite null with real computed values — that path is unchanged. For unauthenticated users (the broken path), GPT now receives no life path or personal year line rather than `Life Path: 0` / `Personal Year: 0`.

### Modified: `src/services/gptInterpretation.ts`

The client-side mirror of `TarotCelticSynthesisPayload` was updated to match the server interface:

```typescript
personalYear: number | null
lifePathNumber: number | null
```

Both sides of the API boundary now agree on the optionality of these fields.

---

## Design Decisions

**null over 0:** The existing server logic for authenticated users already overwrites `payload.personalYear` and `payload.lifePathNumber` with server-computed values derived from the user's stored birth date. Those server-authoritative values continue to overwrite `null` exactly as they overwrite `0`. No behavior change for authenticated users.

**Prompt omission over fallback text:** When `authorizedLifePath` or `authorizedPersonalYear` is null, the corresponding line is dropped from the prompt entirely rather than rendered as "unknown" or a placeholder. An absent line produces no GPT hallucination; a rendered placeholder might prompt GPT to speculate. Silence is correct here.

**personalDay retained unconditionally:** `personalDay` is always a valid integer derived from the calendar date (day-of-month reduced to a single digit), not from birth data. The conditional logic deliberately preserves it on the same line as `Personal Year` when year is available, and standalone when year is absent.

**No prop threading:** The option to pass `birthDate` through `CelticCrossReading`'s props for client-side computation was evaluated and deferred. The immediate need is correctness — eliminating the fabricated zeros. Prop threading is a separate enhancement that can be revisited if numerology context proves valuable to unauthenticated Celtic Cross readings.

**What this does not change:** `TarotSingleSynthesisPayload` and `TarotThreeSynthesisPayload` are not changed — those flows receive real values from parent components that compute them before passing down. `buildTarotDiscussContext` in `gptInterpretation.ts` retains `lifePathNumber: number` and `personalYear: number` in its `natal` parameter — no callers pass Celtic Cross null values to it.

---

## Build

- `npm run build` (Vite client): clean, no errors
- `npm run server:build` (TypeScript server): clean, no errors
