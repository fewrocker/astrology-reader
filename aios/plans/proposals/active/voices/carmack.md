# John Carmack — Proposal Voice

Let me look at what's actually in this codebase right now.

The GPT prompt building is a mess. I see `buildDreamSnapshotPrompt` in DreamModal.tsx, `buildSnapshotPrompt` in DailySnapshotCard.tsx, `buildTransitPrompt` and `buildSynastryPrompt` and `buildCoupleTransitPrompt` all over the place. Some are in the engine layer, some in service files, some inline in components. This is textbook scattered responsibility. When the prompt strategy needs to change — and it will — you'll be hunting across 8 files. That's debt accumulating right now.

Similarly, the localStorage cache strategy is scattered. I see `API_KEY_STORAGE`, `DREAM_SESSION_KEY`, then in App.tsx there must be transit cache keys, synastry cache keys — all with different naming conventions and no central type-safe interface. This is how you get cache key collisions and stale state bugs down the line.

**Consolidate the prompt builders into `src/services/prompts/` or `src/services/gptPrompts.ts`.** Every function that builds a string sent to OpenAI goes there. This makes testing trivially easy and makes the prompt strategy visible in one place.

**Create a typed cache module** — `src/services/cache.ts` — that exports typed get/set/clear functions. All localStorage access goes through it. No more raw string keys scattered across components.

On the **numerology feature**: implementing it is not hard. Life Path, Expression, Soul Urge, Personal Year — these are simple arithmetic on birth date and birth name. The math is trivial. The non-trivial part is the *integration* with the existing chart data. You need to add name input somewhere (the form or a secondary input), and you need to weave the numerology numbers into the interpretation layer alongside planetary positions. The chart data types already exist; you'd just augment the reading assembly function with numerology output.

Be careful: **don't make numerology require a name if it degrades the core experience.** Consider making the name optional — Life Path (birth date only) works standalone; Expression number (full name) enhances it. Don't gate the core flow on a new required input.

On the **solar return chart**: this is straightforward to compute. The solar return is the moment the Sun returns to its exact natal longitude for the current year. Find that moment using binary search on `calculateChart` outputs (similar to how `transitTimeline.ts` already does binary search for aspect perfection). Then render a new chart wheel for that moment. The existing `ChartWheel` and `calculateChart` infrastructure makes this maybe 200–300 lines of new code. Medium effort, high value.

On the **dream journal**: the current implementation uses a session key (`dream-session-${todayKey}`). Persisting across days is trivial — just use a different key structure and store an array of sessions. The hard part is the synthesis/summary view — showing patterns across multiple dreams. That's the expensive part. I'd scope v1 as just persistence + history list, with synthesis as a follow-up.

On the **SkyTodayChart**: it renders at Greenwich (0°, 0°). If the user has natal data, it should render at their birth coordinates or at least show their personal transits. Or honestly, just remove it and replace it with the `DailySnapshotCard` which already does the right thing. Don't keep a lie around.

Priority by effort-to-value: cache module (low effort, high maintenance benefit), prompt consolidation (medium effort, high maintainability), numerology integration (medium effort, very high user value), dream journal persistence (low effort), solar return (medium effort, high value).
