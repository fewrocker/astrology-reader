# Active Proposals

## Issue Fixes
- `issue-advance-monthly-midnight-reset` — Monthly advance snapshots computed at midnight instead of noon; corrupts Moon position and energy scoring (Taleb, Carmack)
- `issue-advance-station-threshold-overfire` — Single 0.02°/day station threshold causes outer planets to over-fire "Stationing" status during normal slow motion (Taleb, Carmack)

## Code Enhancements
- `code-score-snapshot-engine` — Refactor `computePowerDayBanner` into typed `scoreSnapshot()` primitive; add `score: SnapshotScore` to `AdvanceSnapshot` interface (Carmack, Jobs)

## Features
- `feat-advance-marker-system` — Colored marker dots on slider track, "Notable moments" overview strip, animated markers, rich tooltips, click-to-jump navigation (Jobs, Miyazaki, Carmack, Taleb)
- `feat-advance-next-notable-navigation` — Prev/Next jump buttons, slider thumb halo on marked positions, aspect list header echoing marker category (Miyazaki, Jobs)
