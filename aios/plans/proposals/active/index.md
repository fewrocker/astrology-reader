# Active Proposals Index

## Code Enhancements

- **code-app-tsx-extraction** — Originated by: Carmack, Miyazaki
  Extract `CachedDataLanding` to `src/components/home/HomeScreen.tsx`, remove redundant `transitLoading` boolean from AppState, replace 14 inline hover handlers with Tailwind classes, memoize `hasCachedBirthData()` localStorage read.

## Features

- **feat-home-screen-redesign** — Originated by: Jobs, Carmack, Miyazaki, Taleb
  Transform `CachedDataLanding` into a genuine personal dashboard: birth identity block, embedded DailySnapshotCard, single "Get Your Readings ✦" CTA, auth nudge, post-form landing fix.

- **feat-readings-navigation-modal** — Originated by: Jobs, Carmack, Miyazaki, Taleb
  New `ReadingsModal.tsx` with three groups (You / Transits / Journals), each item with glyph + label + descriptor, back-navigation fix across all deep views.

- **feat-split-render-ai-screens** — Originated by: Jobs, Carmack, Miyazaki, Taleb
  Apply split-render pattern to TransitReadingPage, SynastryPage, SolarReturnPage, TodayPage, NumerologyPage; shared GptSkeleton component; full ambient copy audit.
