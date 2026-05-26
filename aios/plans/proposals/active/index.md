# Active Proposals — Sprint 0028

Generated after sprint 0027 delivery. Theme: **Tarot Depth & Polish** — natal chart integration, reading flow, and hardening the sprint-0027 data investment.

---

## Issue Fixes

| Proposal | Impact | Effort | Summary |
|----------|--------|--------|---------|
| [issue-spread-position-import-broken-test](issue-spread-position-import-broken-test.md) | High | Trivial | Fix a pre-existing failing test in `tarot.test.ts` — one missing import prevents the position-adaptation regression guard from running |

---

## Code Enhancements

| Proposal | Impact | Effort | Summary |
|----------|--------|--------|---------|
| [code-dominant-transit-orb-weighting](code-dominant-transit-orb-weighting.md) | High | Low-Med | Weight dominant transit planet selection by orb and applying/separating status, so tight applying transits outrank wide separating ones |
| [code-transit-adaptation-contract-test](code-transit-adaptation-contract-test.md) | Medium | Low | Add per-suit planet contract tests (Saturn+Pluto for all pips, Mars for Wands/Swords, Neptune for Cups, Venus for Pentacles) to guard sprint-0027 coverage |
| [code-gpt-tarot-dead-code-cleanup](code-gpt-tarot-dead-code-cleanup.md) | Low | Low | Remove dead `computeDominantModality` function and duplicate `SIGN_MODALITIES_SERVER` lookup table from `gptTarot.ts` |

---

## Features

| Proposal | Impact | Effort | Summary |
|----------|--------|--------|---------|
| [feat-natal-card-correspondence](feat-natal-card-correspondence.md) | High | Medium | Add `buildNatalResonanceNote` to surface natal chart–card correspondences (chart ruler match, element match, house activation) in the static interpretation panel before GPT loads |
| [feat-three-card-constellation-preview](feat-three-card-constellation-preview.md) | High | Low-Med | Render the `astroResonanceNote` and key structural signals from `computeThreeCardSynthesis` immediately after all three cards are drawn, bridging the wait for GPT synthesis |

---

## Voice Analysis Files

- [jobs.md](voices/jobs.md) — Steve Jobs: the signature missing moment, natal layer invisible in static reading, constellation picture withheld
- [carmack.md](voices/carmack.md) — John Carmack: pre-existing failing test, dead code in gptTarot.ts, natal resonance as new engine function, dominance weighting as data-quality multiplier
- [miyazaki.md](voices/miyazaki.md) — Hayao Miyazaki: the product's new quality, what it has not yet said to the user, court card natal identity, three-card ritual incompleteness
- [taleb.md](voices/taleb.md) — Nassim Taleb: dominance selection fragility persists, deferral pattern on broken test, floor vs contract test distinction, natal correspondence layer has no coverage target
