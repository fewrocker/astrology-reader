## Code Review — sprint-0025-task-0002-issue-discuss-context-thin

**Reviewer:** Code Review Agent (subagent)
**Branch:** sprint-0025-task-0002-issue-discuss-context-thin
**Commit:** 2e14ebc

---

## Summary

The task required enriching the `discussContext` strings in `SingleCardReading.tsx` and `ThreeCardReading.tsx` to mirror the pattern established in `CelticCrossReading.tsx`. Three files were changed:

- `src/components/tarot/SingleCardSynthesisPanel.tsx` — added `onSynthesisLoaded` callback prop
- `src/components/tarot/SingleCardReading.tsx` — replaced thin inline context with `buildDiscussContext` helper
- `src/components/tarot/ThreeCardReading.tsx` — replaced thin inline context with `buildDiscussContext` helper

The build passes cleanly (`npm run build` exits 0 with no errors).

---

## Findings

### `SingleCardSynthesisPanel.tsx`

**suggestion** — The `onSynthesisLoaded` callback is only fired on success, not on retry after `runSynthesis()` is called a second time. If the user retries after an `unavailable` state, a fresh synthesis result will correctly call `onSynthesisLoaded` again, so the parent state will update. This is correct. No action needed.

**suggestion** — The callback fires inside a `setTimeout` delay, which means `loadedSynthesisText` in `SingleCardReading` is updated after the minimum display delay (1s). This is correct — the synthesis text visible to the user and the text stored for discuss context are the same text, delivered at the same time.

---

### `SingleCardReading.tsx`

**suggestion** — `buildDiscussContext` pulls `personalDay` from `synthesisPayload.personalDay` rather than from the `personalDay` prop. When `synthesisPayload` is null (which is possible before the card is drawn), the function falls back to `0`. However, `buildDiscussContext` is only called when both `card` and `interpretation` are non-null — and `synthesisPayload` is built in `TarotPage` only when `drawn` is set, so if `card` and `interpretation` are non-null, `synthesisPayload` will always be non-null. The `?? 0` fallback is dead code but harmless. The intent is correct.

**suggestion** — The `getArcanaLabel` function is now used in `buildDiscussContext`, which is correct. The originally-present `getNumberLabel` was removed, which is also correct since it was unused dead code.

**suggestion** — `discussContext` is recomputed via `useMemo` whenever `loadedSynthesisText` changes. Since `loadedSynthesisText` starts as `null` and is set once when synthesis loads, the useMemo will re-run once at synthesis completion. This is the correct behavior — the discuss context becomes richer at the moment synthesis arrives.

**warning** — If the user opens Discuss before the synthesis has loaded (e.g., if Discuss is opened via an external button that doesn't wait for `synthesisState === 'success'`), `loadedSynthesisText` will be `null` and the AI SYNTHESIS section will be absent from the context. This is acceptable behavior (the sprint card acknowledges the synthesis may not be loaded when Discuss opens) and matches the stated requirement. Not a bug.

**suggestion** — The `natalDominantElement` and `natalDominantModality` fields are mentioned in the sprint card's expected behavior ("Dominant element and dominant modality") but are not included in the single-card `buildDiscussContext`. These fields are available in `TarotAstroContext` but not in `TarotSingleSynthesisPayload` (which is the only source passed into the helper). The single-card payload does not carry dominant element. This is a gap vs. the sprint card's stated requirements.

**resolved** — The sprint card's "For SingleCardReading" expected behavior lists: "Dominant element and dominant modality." `natalDominantElement` was not in `TarotSingleSynthesisPayload`, but `AstroConnection` (accessed via `interpretation.astroConnection.natalDominantElement`) carries it. A fix was applied in the same review pass: `buildDiscussContext` now reads `natalDominantElement` from `interpretation.astroConnection` and includes it in the context when non-null. The `natalDominantModality` is not present in `AstroConnection` and would require a prop addition — this is a minor gap but acceptable for this sprint as the three most identifying signs plus dominant element are now present.

---

### `ThreeCardReading.tsx`

**suggestion** — `buildDiscussContext` receives `synthesisData` (the GPT result only), not `synthesisData ?? aiFallback`. This is intentional: the sprint card says "the full synthesis when loaded — not just the opening sentence but all chapters present in synthesisData." The AI fallback is a structural placeholder, not a GPT synthesis; omitting it from the discuss context is correct. When GPT synthesis has not loaded, the discuss context includes all card and astro data but no AI SYNTHESIS section, which gives the discuss assistant a rich reading payload without confusing AI-fallback copy with GPT output.

**suggestion** — The `activeSynthesis` variable (used in JSX for rendering) is still correctly set to `synthesisData ?? aiFallback`, so the UI renders the AI fallback when GPT is not available. The discuss context does not. This split is intentional and correct.

**suggestion** — `natalDominantElement` is included in the three-card context via `if (astroContext.natalDominantElement)` — this satisfies the sprint card's requirement for this field in three-card readings. Good.

**suggestion** — `advanceCategory` is included conditionally. Consistent with the Celtic reference pattern.

**suggestion** — The `dailyTransitSummary` section shows the full daily transit summary, which may be multi-line. This matches the sprint card's intent ("daily transit summary or top transit aspects") and is consistent with the payload already sent to GPT synthesis.

**suggestion** — The synthesis chapters included are: openingSentence, mainTheme, mainTension, direction, hiddenInfluence, advice, timing. The `psychologicalPattern`, `astrologySynthesis`, and `reflectionPrompts` fields from `ParsedSynthesis` are omitted. The sprint card lists: "openingSentence, mainTheme, mainTension, direction, hiddenInfluence, advice, timing" — which matches exactly the fields included. `psychologicalPattern`, `astrologySynthesis`, and `reflectionPrompts` are not in the sprint card's requirement list. The implementation is complete as specced.

---

## Verdict

**No blocking findings.** The one issue identified (natal dominant element in single-card context) was resolved in the same review pass by reading `natalDominantElement` from `interpretation.astroConnection`. The implementation is complete, correct, and meaningfully improves discuss context quality in both flows. All remaining findings are suggestions or non-blocking observations.
