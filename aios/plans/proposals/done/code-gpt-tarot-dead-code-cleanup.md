# code-gpt-tarot-dead-code-cleanup

**Type:** Code Enhancement

**Originated by:** Carmack, Taleb

---

## Problem

`server/services/gptTarot.ts` contains two separate functions computing dominant modality from two separate lookup tables, both defined in the same file:

1. `computeDominantModality()` (~line 88) — uses `SIGN_MODALITIES_SERVER`
2. `computeServerDominantModality()` (~line 481) — uses `SERVER_SIGN_MODALITIES`

Only `computeServerDominantModality` is called by any synthesis handler. `computeDominantModality` and `SIGN_MODALITIES_SERVER` are dead code. Neither function is exported.

This creates three compounding risks:
- **Divergence on bug fixes:** A future modality edge case fix applied to `computeServerDominantModality` (the live function) may be missed in `computeDominantModality` (the dead function), or vice versa if someone mistakenly believes both are active.
- **Cognitive overhead:** The file is complex. Dead functions with plausible names force developers to ask "when is this used?" before understanding the code.
- **Duplicated lookup tables:** `SIGN_MODALITIES_SERVER` and `SERVER_SIGN_MODALITIES` are identical records under different names. Any update to one (e.g., a traditional rulership variant) must be applied to both or a silent discrepancy appears.

This issue was flagged in sprint-0027 review (Taleb, point #9) and deferred. A third sprint of deferral makes the cleanup progressively harder as the file grows.

---

## Proposed Solution

Remove `computeDominantModality` and `SIGN_MODALITIES_SERVER` from `server/services/gptTarot.ts`. Keep only `computeServerDominantModality` and `SERVER_SIGN_MODALITIES`. Optionally rename the surviving pair to remove the `Server` qualifier since they are the only versions in this file.

The result: one function, one lookup table, zero ambiguity about which is active.

---

## Why This Is a Code Enhancement, Not an Issue Fix

This is not a bug — the dead code does not execute and does not affect output. It is a code quality problem: accumulated complexity that increases maintenance cost and creates a divergence surface. The right classification is Code Enhancement.

---

## Impact

**Low** (no user-visible change). Pure internal cleanup.

**Effort:** Low. Delete one function and one lookup table. Confirm the synthesis handler tests still pass. No architectural changes.

---

## Dependencies

None. The dead code has no callers.

---

## Implementation Summary

**File:** `server/services/gptTarot.ts`

**Changes:**
1. Remove `SIGN_MODALITIES_SERVER` constant (duplicate of `SERVER_SIGN_MODALITIES`)
2. Remove `computeDominantModality()` function (duplicate of `computeServerDominantModality`, unused)
3. Optionally rename `SERVER_SIGN_MODALITIES` → `SIGN_MODALITIES` and `computeServerDominantModality` → `computeDominantModality` for cleaner naming now that there is no duplication conflict

**Verification:** Run the GPT synthesis handler tests and confirm synthesis output is unchanged. The removed function was never called, so the output cannot change.
