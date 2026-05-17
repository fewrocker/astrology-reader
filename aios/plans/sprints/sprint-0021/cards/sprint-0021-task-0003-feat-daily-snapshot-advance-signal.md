---
# Daily Snapshot Advance Signal Badge

**Type:** Feature
**Originated by:** Jobs, Miyazaki

## Problem / Opportunity

The Home screen `DailySnapshotCard` (`/projects/astrology-reader/src/components/reading/DailySnapshotCard.tsx`) is the highest-frequency surface in the product — it renders on every app open for any user with a saved natal chart. It currently displays three data layers: moon phase pill, energy score dots, and a GPT-generated briefing paragraph. None of these layers reference the advance engine.

Meanwhile, `AdvanceTab` (`/projects/astrology-reader/src/components/reading/AdvanceTab.tsx`) exposes a rich `SnapshotScore` for every day in the 30-day forward window, including today (offset 0). That score carries a `MarkerCategory` (`power | favorable | challenging | shift | neutral`), a human-readable `reason` string, and an `intensity` value (0–1). The `CATEGORY_LABELS` map (`AdvanceTab.tsx` line 71) already translates categories to display strings: "Power Day", "Favorable Window", "Challenging Period", "Planetary Shift".

The Home screen does not know whether today is a Power Day. A user who opens the app every morning receives no signal from the advance engine unless they navigate to the Advance tab — an extra tap that many daily users never take. This is a missed connection: the infrastructure to score today already exists; it simply is not surfaced where the user is.

The gap is structural. `DailySnapshotCard` is a self-contained component with its own `localStorage` cache keyed on Sun longitude and date. It computes its data via `calculateTransitAspects` and `computeEnergyRating` from the transits engine. It has no import from `AdvanceTab` and no awareness of `SnapshotScore`. The advance snapshot cache (`snapshotCache` in `AdvanceTab`) is a component-level `useRef` that lives on the `AdvanceTab` component tree — it is not shared to `AppState`, not written to `localStorage`, and not accessible to `DailySnapshotCard`. As a result there is no existing bridge.

The vision.md §4 ("Home screen Daily Snapshot card visual depth") explicitly names this as a sprint-0021 polish candidate.

## Vision

When a user opens the app and today carries a meaningful advance signal, the Daily Snapshot card reflects it immediately — not as a distracting banner, but as a small, precise badge in the pill row alongside the moon phase and energy dots. A gold "✦ Power Day" tag for a power-category day, an emerald "◆ Favorable Window" for a favorable day, a soft red "◆ Challenging Period" for a challenging day, a steel-blue "◆ Planetary Shift" for a station crossing. The badge is only shown when the signal is meaningful (non-neutral, sufficient intensity). When no signal exists — because the cache is empty or the user has no natal chart or today scores neutral — the card is unchanged. The feature is invisible when it has nothing to say.

For a daily user, the effect is a Home screen that feels aware. The Advance tab no longer feels like a separate feature; the home screen already knows.

## Specifications

1. **Signal source — cache-warm-only.** `DailySnapshotCard` must not run `preCalculateSnapshots` itself. That function computes 30+ snapshots synchronously and is expensive enough that calling it on Home mount would block the UI on every app open. Instead, `DailySnapshotCard` reads from a dedicated `localStorage` entry that `AdvanceTab` optionally writes when it computes today's score. If the key is absent, the badge is silently omitted.

2. **New shared localStorage key.** When `AdvanceTab` finishes pre-calculating snapshots for the daily period and the base date matches today's date, it writes the score for offset 0 (today's `SnapshotScore`) to `localStorage` under the key `advance-today-signal-{YYYY-MM-DD}` (where the date component matches the ISO date of the computation, derived from the same `today.toISOString().split('T')[0]` pattern used by `DailySnapshotCard`'s own cache key). The stored value is a JSON object: `{ category: MarkerCategory; intensity: number; reason: string }`. Only today's date key is written; no history is kept. The write uses the `isQuotaError` guard already used throughout the codebase — on quota failure, a console warning is emitted and the badge simply remains absent.

3. **`DailySnapshotCard` reads the signal.** At the start of the existing `load()` effect, after the daily-snapshot `localStorage` read, the component reads `advance-today-signal-{today}`. If it parses successfully and `category !== 'neutral'` and `intensity >= 0.25`, it stores the result in a `advanceSignal` state variable (`{ category: MarkerCategory; intensity: number; reason: string } | null`). The intensity threshold of 0.25 filters out borderline scorings that would produce a badge with no real claim. The read is synchronous and happens before any async GPT call, so the badge can appear even while the GPT text is loading.

4. **Badge visual design — pill row, third position.** The advance signal badge renders as a fourth pill in the existing pill row (`flex flex-wrap gap-3 mb-4`), after the moon phase pill, after the energy dots pill, and after the top-aspect sentence pill. It uses the same pill shell as the other items: `bg-mystic-gold/8 border border-mystic-gold/20 rounded-full px-3 py-1`. It is only rendered when `advanceSignal` is non-null.

5. **Badge glyph and color per category.**
   - `power`: leading glyph `✦`, text color `text-mystic-gold` (`#c9a84c`). Label: "Power Day".
   - `favorable`: leading glyph `◆`, text color `text-emerald-400` (`#34d399`). Label: "Favorable Window".
   - `challenging`: leading glyph `◆`, text color `text-red-400` (`#f87171`). Label: "Challenging Period".
   - `shift`: leading glyph `◆`, text color `text-blue-400` (`#60a5fa`). Label: "Planetary Shift".
   - The glyph and colors match `MARKER_COLORS` and the visual vocabulary already established in `AdvanceTab` (`MARKER_COLORS`, `CATEGORY_HALO`). No new color values are introduced.

6. **Badge structure.** The pill contains: `<span className="text-[color] text-xs">{glyph}</span>` followed by `<span className="text-[color] text-xs font-medium">{CATEGORY_LABELS[category]}</span>`. No tooltip, no click handler, no expand/collapse. The badge is informational only.

7. **`reason` string is not shown in the badge.** The `reason` field (e.g., "Saturn presses natal Mercury — friction in communication and daily logistics") is stored and read but not rendered in the Home screen badge. The badge surfaces only the category label. Reason text is reserved for a potential future tooltip or for the Today page signal (sprint-0021 §3), which has more vertical space.

8. **Behavior when natal chart is absent.** `DailySnapshotCard` is only rendered in `HomeScreen` when `chartData` is non-null (see `HomeScreen.tsx` line 279: `{chartData ? (<DailySnapshotCard ... />) : ...}`). No natal chart means no badge — the condition is already gated upstream.

9. **Behavior when cache is empty (Advance never visited).** If the user has never opened the Advance tab, the `advance-today-signal-{today}` key will not exist. The `advanceSignal` state remains null and the badge is simply absent. The card renders exactly as it does today. No loading state, no placeholder.

10. **Behavior when today is neutral.** If `AdvanceTab` ran for today and the score was `neutral`, either (a) it writes `{ category: 'neutral', ... }` and the read guard filters it out, or (b) it skips the write for neutral days (preferred: skip the write, keeping the key absent, so the absence of the key unambiguously means "not computed" rather than "computed neutral"). The implementation should choose option (b): write only when `category !== 'neutral'`.

11. **Key expiry.** The key includes today's ISO date. Yesterday's key (`advance-today-signal-2026-05-16`) is left in localStorage and cleaned up opportunistically: on read, if the stored key date does not match today, it is deleted and `advanceSignal` is set to null. This prevents stale signals appearing after midnight without requiring a separate cleanup sweep.

12. **AdvanceTab write path.** In `AdvanceTab.tsx`, after `preCalculateSnapshots` completes and snapshots are stored in `snapshotCache.current`, the component checks: if `period === 'daily'` and `baseDate` is today (same ISO date as `new Date()`), it extracts `snapshots[0].score` and writes `advance-today-signal-{today}` if `score.category !== 'neutral'`. This write is inside the existing `startTransition` block so it does not block the UI. Only the `period === 'daily'` path writes the key — weekly and monthly advance signals are not relevant to the Home screen badge.

13. **No prop drilling.** The signal flows exclusively through `localStorage`. No new props are added to `DailySnapshotCard`, no new context is created, no `AppState` changes are required. The card reads the key independently; `AdvanceTab` writes it independently. The only contract is the key name and the JSON schema `{ category, intensity, reason }`.

## Out of Scope

- Running `preCalculateSnapshots` in `DailySnapshotCard` or on Home screen mount.
- Showing the `reason` string or any tooltip on the Home screen badge.
- Tapping the badge to navigate to the Advance tab — no interaction is added.
- Writing or reading the advance signal in `CoupleAdvanceTab` — couple advance is a different context (two natal charts) and its "today" score is not meaningful for the individual's home screen.
- Showing the badge for weekly or monthly period scores.
- Showing a signal badge for users who have no natal chart entered.
- Any change to `AppState`, `AppContext`, or `AppAction` types.
- A proactive warm-up call to `preCalculateSnapshots` on Home screen mount.
- The Today page advance signal integration — that is a separate sprint-0021 proposal (vision.md §3) with its own banner placement and behavior.

## Open Questions

1. **Write-on-first-load vs. write-after-visit.** The current spec requires the user to visit the Advance tab before the badge appears. Should the Home screen itself — not `DailySnapshotCard`, but `HomeScreen` — trigger a background `preCalculateSnapshots` call for `period='daily'` only when `chartData` is available, writing only the offset-0 signal and discarding the rest? This would make the badge appear on first open without an Advance visit, at the cost of a background computation on every Home mount. The sprint vision explicitly prohibits blocking computation on Home mount (vision.md quality bar: "if no cache exists, the signal is simply absent rather than forcing a blocking computation"), but a `useTransition`-wrapped background call for daily period only (1 snapshot vs. 30) might be acceptable. Defer this trade-off to implementation.

2. **`intensity` threshold value.** The threshold of 0.25 is a judgment call. A value of 0.0 would show a badge for every non-neutral day including borderline scorings. A value of 0.5 would suppress roughly half of favorable/challenging markers. 0.25 is proposed as the floor for "worth surfacing on the home screen." This should be confirmed against real advance data during implementation.

3. **Quota failure behavior.** If the `advance-today-signal-{today}` key cannot be written (localStorage quota exceeded), the badge is silently absent. The existing `storageWarning` dispatch pattern in `AppContext` could surface a one-time warning, but that seems disproportionate for a badge that is purely additive. Confirm that silent failure is the correct behavior.
