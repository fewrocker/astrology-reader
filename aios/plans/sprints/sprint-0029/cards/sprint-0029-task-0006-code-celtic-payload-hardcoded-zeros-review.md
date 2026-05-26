# Review: code-celtic-payload-hardcoded-zeros

## What was done

Three files were changed:

### 1. `src/services/gptInterpretation.ts` — client-side type interface
`TarotCelticSynthesisPayload.personalYear` and `lifePathNumber` changed from `number` to `number | null`. This makes the optionality explicit at the API boundary — a future reader of this interface understands these fields are not always available, rather than assuming a valid numerology value is always present.

### 2. `server/services/gptTarot.ts` — server-side type interface + prompt rendering
Same type change on `TarotCelticSynthesisPayload`. The GPT prompt rendering at lines 1054–1055 was updated to omit each line when its value is null:
- `Life Path:` line is omitted entirely when `authorizedLifePath` is null
- `Personal Year:` prefix is omitted when `authorizedPersonalYear` is null; `Personal Day:` is always included

For authenticated users whose birth context resolves server-side, `calculatePersonalYear()` and `calculateLifePath()` overwrite null with real computed values — that path is unchanged. For unauthenticated users (the broken path), GPT now receives no life path or personal year line rather than `Life Path: 0` / `Personal Year: 0`.

### 3. `src/components/tarot/CelticCrossReading.tsx` — payload assembly
`buildCelticSynthesisPayload` now passes `personalYear: null` and `lifePathNumber: null` instead of the hardcoded zeros.

## Verification

- `npm run build` — clean, no TypeScript errors
- `npm run server:build` — clean, no TypeScript errors

## What this does not change

- The authenticated path: when `userId` is present and `resolveUserBirthContext` succeeds, the server still overwrites null with server-computed values (lines 952–953). No behavior change for authenticated users.
- `personalDay` is not nulled — it is derived from `astroContext.personalDay` which is computed independently of birth date via the transit context.
- `TarotSingleSynthesisPayload` and `TarotThreeSynthesisPayload` are not changed — those flows receive real values from parent components that compute them before passing down.
- `buildTarotDiscussContext` in `gptInterpretation.ts` (exported, currently unused by any component) retains `lifePathNumber: number` and `personalYear: number` in its `natal` parameter — no callers pass Celtic Cross null values to it.
