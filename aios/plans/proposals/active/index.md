# Active Proposals — Sprint 0027

## Features

- [feat-pip-transit-adaptations](feat-pip-transit-adaptations.md) — Write Level 1 transit adaptation entries for all 30 missing cards (28 pip Twos–Nines × 4 suits, The Fool, Justice). Closes the ~38% coverage gap. (Jobs, Carmack, Miyazaki, Taleb)
- [feat-pip-reversed-meaning-depth](feat-pip-reversed-meaning-depth.md) — Rewrite pip reversed meanings to name specific arrested psychology rather than generic blockage descriptions. Sprint 0026 standard applied to Minor Arcana. (Jobs, Carmack, Miyazaki, Taleb)

## Issue Fixes

- [issue-retrograde-condition-priority-override](issue-retrograde-condition-priority-override.md) — `buildTransitInfluence` retrograde entries can fire before the dominant planet entry, causing Mercury retrograde notes to suppress Pluto/Saturn entries. (Taleb)

## Code Enhancements

- [code-retrogradeplanets-rename](code-retrogradeplanets-rename.md) — Rename `retrogradeplanets` → `retrogradePlanets` in `TarotAstroContext` (11 occurrences, 2 files). (Carmack, Taleb)
- [code-single-card-position-register](code-single-card-position-register.md) — Pass `single` spread position instead of `null` for single draws, routing through position-aware Level 2 fallback path. (Jobs, Carmack, Miyazaki)
- [code-transit-coverage-test](code-transit-coverage-test.md) — Add per-card coverage assertion to `cards.completeness.test.ts` so pip card transit adaptation coverage is programmatically enforced. (Carmack)
