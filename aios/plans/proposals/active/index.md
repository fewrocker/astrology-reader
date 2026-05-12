# Active Proposals

Generated for Sprint 0002 focus: **Deepen Numerology**

All proposals are scoped to the guidelines sprint focus: making numerology richer, deeper, and more alive.

---

## Features (feat-)

Sorted by impact-to-effort ratio:

| Proposal | Originated by | Impact | Effort | Summary |
|----------|--------------|--------|--------|---------|
| [feat-gpt-astro-numerology-crossreading](feat-gpt-astro-numerology-crossreading.md) | Jobs + Carmack + Taleb | High | Low | Wire up existing `generateAstroNumerologyCrossReading` into NumerologyPage with parallel loading skeleton |
| [feat-gpt-numerology-narrative](feat-gpt-numerology-narrative.md) | Jobs + Carmack + Miyazaki | High | Medium | One GPT call, all numbers together, cohesive flowing personal reading with skeleton placeholder |
| [feat-advanced-numerology-layers](feat-advanced-numerology-layers.md) | Carmack + Taleb | High | Medium-High | Soul Urge, Karmic Debt, Personal Month calculations + interpretations + UI |
| [feat-numerology-chat](feat-numerology-chat.md) | Jobs | Medium-High | Medium | Discuss ✦ modal for numerology — follow-up questions GPT chat |

## Issue Fixes (issue-)

| Proposal | Originated by | Impact | Effort | Summary |
|----------|--------------|--------|--------|---------|
| [issue-numerology-cosmic-connections-static](issue-numerology-cosmic-connections-static.md) | Taleb + Jobs | Medium | Low | Remove defective static Cosmic Connections section that simulates personalization but delivers templates |

## Code Enhancements (code-)

| Proposal | Originated by | Impact | Effort | Summary |
|----------|--------------|--------|--------|---------|
| [code-abort-controller-numerology-gpt](code-abort-controller-numerology-gpt.md) | Taleb | Medium | Low | Ensure all GPT useEffects in NumerologyPage use cancelled-flag pattern to prevent unmount state updates |

---

## Convergence Notes

- **All four voices** agree the static number cards are insufficient as the sole output — a GPT reading layer is essential
- **Jobs + Taleb** both flagged the static Cosmic Connections section as a liability that must be removed before GPT cross-reading ships
- **Carmack** notes the `generateAstroNumerologyCrossReading` function already exists — wiring it up is low effort for high impact
- **Taleb** flagged the Karmic Debt intermediate-sum issue as a required refactor for correctness, not just aesthetics
