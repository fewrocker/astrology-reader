# Code Review: sprint-0011-task-0005-feat-solar-return-static-interpretation

**Reviewer:** Claude Sonnet 4.6
**Date:** 2026-05-14
**Commit reviewed:** `a5dc561`
**Base commit:** `345e2f8` (sprint-0011 structure)

---

## Summary

The implementation adds a `SRStaticBriefs` local component to `SolarReturnPage.tsx` and injects an `analyzeElements` element profile block into `buildSolarReturnPrompt` in `solarReturn.ts`. Both changed files are small and focused. TypeScript check passes clean. All 12 spec checklist items are addressed. The code is correct, well-guarded, and visually consistent with the page's existing amber palette.

---

## Findings

### Blocking (spec violations / bugs)

None.

---

### Warning (quality concerns)

**W1 — Element profile injection omits the `lacking` element**

`buildSolarReturnPrompt` injects only:
```
Dominant element: ${elementAnalysis.dominant} — ${elementAnalysis.interpretation.dominant}
```

The `ElementBalance` type also exposes `elementAnalysis.lacking` and `elementAnalysis.interpretation.lacking`. The `buildTransitPrompt` implementation (the stated reference) also only outputs the dominant element, so this implementation faithfully matches the spec's instruction to use "the same format applied in `buildTransitPrompt`". However, the lacking element is arguably as useful to GPT as the dominant (it signals a blind spot). This is not a spec violation — the spec says "same format" — but it leaves half the available synthesis data unused. Worth considering in a future sprint.

**W2 — `SRStaticBriefs` returns `null` when both briefs are missing, but renders a partial grid when only one is missing**

If only Sun or only Moon has a valid house (1–12), `SRStaticBriefs` renders a single-card grid (`grid-cols-1 sm:grid-cols-2` with one child). On desktop, this leaves the second column empty. The spec says to suppress each card individually, which the code does correctly. The partial-width rendering is the expected outcome of that spec. Noting it here because the visual result — one card sitting half-width on desktop — could look unintentional. Not a bug; a deliberate spec trade-off. No action required unless the design opinion changes.

---

### Suggestion (optional improvements)

**S1 — Source capitalisation inconsistency between `KeyPlacements` and `SRStaticBriefs` labels**

`KeyPlacements` (line 74–75) uses `'Primary focus'` and `'Emotional climate'` (lowercase after first word). `SRStaticBriefs` uses `'Primary Focus'` and `'Emotional Climate'` (title case). Both are rendered in `text-xs uppercase tracking-wider` CSS, so the visual output is identical (`PRIMARY FOCUS` / `EMOTIONAL CLIMATE`). No user-visible difference. If consistency in source strings matters for searchability or future i18n, align the casing. Low priority.

**S2 — No `mb-6` guard when component returns null**

`SRStaticBriefs` wraps the grid in `mb-6`. When it returns `null` (both briefs missing, which should be rare in practice), the GPT skeleton or error block moves up slightly. This is correct behavior — no dead margin — but worth noting that the gap between the static block and the GPT block is handled by the component's own `mb-6` rather than a wrapper, so removing or changing the null return path later would need a layout adjustment.

**S3 — Brief text is natal-voice and the prefix is minimal**

The spec acknowledges this open question: "This year: [brief]" vs. a more rewritten prefix. The implementation uses the shorter form `"This year: "`. The natal voice of the briefs ("Identity expressed through communication", "Emotional expression through words") is somewhat noticeable against the SR context even with the prefix. The spec explicitly allows this and prohibits modifying `planetInHouse.ts`, so no action is required. Future work could provide SR-specific `brief` fields or a more contextual prefix at the render layer.

---

## Spec Checklist Verification

| # | Spec item | Status |
|---|-----------|--------|
| 1 | Location: inside Reading tab, above GPT block, unconditionally visible | Pass |
| 2 | SR Sun house from `srChart.planets.find(p => p.name === 'Sun')` | Pass |
| 3 | SR Moon house same pattern | Pass |
| 4 | Guard: house must be 1–12 inclusive | Pass (`sunHouse && sunHouse >= 1 && sunHouse <= 12` handles 0/undefined/OOB) |
| 5 | Guard: missing planet suppresses that card | Pass (`srSun?.house` returns undefined → card suppressed) |
| 6 | Visual: `bg-amber-900/5 border border-amber-500/10`, lighter than GPT block | Pass (exact classes used) |
| 7 | Labels: "Primary Focus" / "Emotional Climate" | Pass |
| 8 | Brief prefix: "This year: " | Pass |
| 9 | No new shared component; local function in `SolarReturnPage.tsx` | Pass |
| 10 | `analyzeElements` imported and injected in `buildSolarReturnPrompt` | Pass |
| 11 | Year-change updates static cards via `solarReturnData.srChart` | Pass (no extra state needed; derives from prop) |
| 12 | Unknown birth time: reads from `srData.srChart` only | Pass |

---

## Verdict

**Pass.**

All spec requirements are correctly implemented. The two warnings are informational (one is a deliberate spec constraint, one is a visual edge case acceptable per spec). No blocking issues. The code is ready to merge.
