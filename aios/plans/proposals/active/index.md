# Active Proposals

## Issue Fixes

- **issue-couple-advance-intensity-parity** — `scoreCoupleSnapshot` Priorities 2–4 derive `baseIntensity` from `computeEnergyRating` instead of `computeCombinedWeight`, causing silent intensity divergence from the individual advance strip. Deferred from sprint-0020. (Carmack, Jobs, Taleb)

## Code Enhancements

- **code-snapshot-cache-lru-bound** — Four unbounded `useRef<Map>` advance caches in `AdvanceTab`, `CoupleAdvanceTab`, `SolarReturnPage`, and `TransitReadingPage` grow without bound throughout the session. LRU cap of 6 entries each. (Taleb)

## Features

- **feat-solar-return-house-briefs** — The SR reading only shows Sun and Moon house placements. A "This Year's Themes" section surfacing all major planets in angular houses (1, 4, 7, 10) using existing `PLANET_IN_HOUSE` data would make the reading dramatically more useful. (Jobs, Miyazaki)

- **feat-today-advance-signal** — Today page shows transit aspects and energy rating with no connection to the advance marker system. When advance snapshots are cache-warm from a prior session visit, surface the category banner (category + reason string) at the top of the Today reading. (Jobs, Carmack, Miyazaki, Taleb)

- **feat-daily-snapshot-advance-signal** — Home screen `DailySnapshotCard` shows moon phase and personal day number but no advance signal. Write today's advance category to `localStorage` from `AdvanceTab` and read it in `DailySnapshotCard` as a badge pill, cache-warm-only. (Jobs, Miyazaki)
