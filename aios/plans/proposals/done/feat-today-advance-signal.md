---
# Today Page — Advance-Powered Daily Intensity Signal

**Type:** Feature
**Originated by:** Jobs, Carmack, Miyazaki, Taleb

## Problem / Opportunity

The Today page (`/projects/astrology-reader/src/components/reading/TodayPage.tsx`) presents a coherent daily snapshot — personal day, lunar phase, transit highlights, and an energy bar — but it operates in complete isolation from the advance marker system. A user who visits the Advance tab and discovers today is a "Power Day" driven by Saturn reaching their Midheaven then navigates to the Today page and sees nothing about it. The two surfaces present parallel, unrelated answers to the same question: "what is today like for me?"

The advance engine already scores today's offset (offset 0) as part of `preCalculateSnapshots` during any Advance tab visit. When a user has visited the Advance tab in the current session, those scored snapshots sit in the `snapshotCache` `useRef` on `AdvanceTab` (and its parent `TransitReadingPage`). The Today page never consults them and cannot — the cache is local to the `TransitReadingPage` component tree, and the Today page lives in a separate subtree rendered from `App.tsx`.

Today the product has no shared session-level cache that bridges these two component trees. The result is a missed opportunity: users who would most benefit from seeing their advance category (those who visit both tabs) get no reinforcement, and users who visit Today first have no idea a Power Day is firing.

The energy bar (`Transit Energy`, `computeEnergyRating`) already exists on the Today page. It scores the raw transit picture but carries no connection to the advance priority ladder. A Saturn+Pluto cluster that produces a Power Day marker in the Advance tab produces the same `EnergyRating` score (say, 4 out of 5) as a busy day of fast-planet aspects with no slow-planet weight — because `computeEnergyRating` in `/projects/astrology-reader/src/engine/transits.ts` counts and weights aspects uniformly rather than applying the combination-weight gate used by `scoreSnapshot` in `AdvanceTab.tsx`.

## Vision

When a user opens the Today page having already visited the Advance tab in the same session, they see a compact category banner — styled consistently with the advance system's existing category palette — sitting at the top of the reading, above the Personal Day card. The banner shows the category label (e.g. "Power Day") and the `reason` string already computed by the scoring engine (e.g. "Saturn reaches your Midheaven — career direction and public responsibility are being weighed and reshaped."). Optionally, the `guidance` string appears below the reason in a subdued weight, the same way it does in the advance banner at `AdvanceTab.tsx:1567–1571`.

If the user has not visited the Advance tab this session, the banner is simply absent. The Today page does not feel degraded: it never shows a skeleton, placeholder, or partial state. The existing energy bar remains exactly as it is. The advance signal is additive, not a replacement.

The banner makes the Today page feel like part of the same product. A user who has built intuition around advance categories immediately recognizes the visual language. A user who has not visited Advance is not confused by the absence of the banner.

## Specifications

### 1. Cache sharing architecture

The fundamental technical challenge is that the advance snapshot cache is a `useRef<Map<string, AdvanceSnapshot[]>>` local to `AdvanceTab` (line 1284) — and a parallel copy lives on `TransitReadingPage` (line 243) to share with `TransitTimeline`. Neither is accessible from `TodayPage`, which lives in a sibling branch of `App.tsx`.

The solution is to introduce a **module-level singleton cache** — a plain `Map<string, AdvanceSnapshot[]>` exported from `AdvanceTab.tsx` alongside the existing exported functions. This map persists for the lifetime of the JS module (the browser session) and is written to once by any component that runs `preCalculateSnapshots`. Both `AdvanceTab` and `TodayPage` can import and read from it without re-render coupling.

The singleton cache must use the same cache key format already in use: `${chartKey}:${period}:${baseDate.toISOString()}` where `chartKey = ${ascendant.longitude.toFixed(4)}:${midheaven.longitude.toFixed(4)}:${unknownTime}`. This is already the key computed at `AdvanceTab.tsx:1294–1295` and `TransitReadingPage.tsx:250`.

**Implementation steps:**
- In `AdvanceTab.tsx`, add below the existing constant block: `export const advanceSnapshotSessionCache = new Map<string, AdvanceSnapshot[]>()`
- In the `AdvanceTab` component's existing `useEffect` (lines 1290–1306), after `snapshotCache.current.set(cacheKey, computed)`, also write `advanceSnapshotSessionCache.set(cacheKey, computed)` — one additional line.
- In `TransitReadingPage.tsx`, similarly write to `advanceSnapshotSessionCache` after setting into `snapshotCache.current` (line 258).
- `TodayPage` imports `advanceSnapshotSessionCache`, `CATEGORY_LABELS`, `MARKER_COLORS`, and the `SnapshotScore` / `MarkerCategory` types from `AdvanceTab.tsx`.

This approach introduces zero new state, zero new context, zero new React re-renders. It is a passive read from a module-level map; React's reconciler is not involved at all.

### 2. Today signal derivation

On mount, `TodayPage` derives today's advance signal using the following logic (inside the existing `useEffect` at line 53, after the moon and transit calculations, when `chartData` is non-null):

```
for each period in ['daily', 'weekly', 'monthly']:
  build chartKey from chartData.angles.ascendant.longitude, midheaven.longitude, unknownTime
  build baseDate by normalizing today to midnight local (matching AdvanceTab's daily baseDate logic)
  build cacheKey = `${chartKey}:${period}:${baseDate.toISOString()}`
  snapshots = advanceSnapshotSessionCache.get(cacheKey)
  if snapshots exists and snapshots.length > 0:
    todaySnapshot = snapshots[0]  // offset 0 is always today
    if todaySnapshot.score.category !== 'neutral':
      use this score — break
```

The iteration order (`daily` first) means a daily advance visit (the most common) is checked first. Weekly and monthly are fallbacks for users who visited Advance in a non-daily period.

The offset-0 snapshot is always today's date because `preCalculateSnapshots` constructs its date array starting from offset 0 at midnight on `baseDate` (lines 884–888 of `AdvanceTab.tsx`). The Today page always represents today. The lookup is therefore exact: `snapshots[0]` is always the correct entry for the current calendar date when `baseDate` was midnight of today.

### 3. State management in TodayPage

Add a single new state variable:

```ts
const [advanceScore, setAdvanceScore] = useState<SnapshotScore | null>(null)
```

Set it in the existing `useEffect`, after the transit and energy calculations, using the derivation logic in spec 2. No second effect is needed. If the cache lookup yields nothing, `advanceScore` remains `null` and nothing is rendered.

### 4. UI placement

The advance signal banner is placed **above the Personal Day card**, directly below the date header section (currently lines 95–98 of `TodayPage.tsx`). This position establishes the day's character before the user descends into numerology, lunar, and transit details — mirroring the way the advance system positions its own category banner at the top of the advance card view. The user sees "Power Day" before they read any interpretive layer.

The banner is rendered only when `chartData` is non-null and `advanceScore` is non-null and `advanceScore.category !== 'neutral'`.

### 5. Banner visual design

The banner replicates the exact styling of the existing advance category banner at `AdvanceTab.tsx:1532–1574`. Use identical className patterns:

- Outer: `mb-6 rounded-xl border border-l-2 px-4 py-3 flex items-start gap-2` plus category-specific border and background colors
  - power: `border-mystic-gold/30 border-l-mystic-gold bg-mystic-gold/10`
  - favorable: `border-green-500/30 border-l-green-500 bg-green-900/10`
  - challenging: `border-red-500/30 border-l-red-500 bg-red-900/10`
  - shift: `border-blue-500/30 border-l-blue-500 bg-blue-900/10`
- Leading icon: `✦` for power/favorable/shift; `⚠` for challenging — same rule as `AdvanceTab.tsx:1551–1552`
- Category label line above the reason: a small `text-mystic-muted text-xs uppercase tracking-widest` label reading the `CATEGORY_LABELS[category]` value (e.g. "Power Day") to orient users who may be unfamiliar with the visual language
- Reason text: `text-sm` in category color at 90% opacity. The `bannerBoldFragment` token is bolded using `font-heading`, with the remainder of the `reason` string following in normal weight — identical to the `AdvanceTab.tsx:1564–1565` inline bold/normal split
- Guidance text (if `advanceScore.guidance` is present): `text-xs text-mystic-muted/80 mt-1.5 font-light leading-relaxed` — identical to `AdvanceTab.tsx:1568–1570`

No animations. The advance banner in `AdvanceTab` does not itself animate; the animated elements are the marker dots. The Today banner is a static read-only display.

### 6. Interaction with the existing energy bar

The existing Transit Energy card (lines 187–202 of `TodayPage.tsx`) remains unchanged. The advance signal and the energy bar answer complementary questions:

- Energy bar: "How busy is the transit sky today?" (raw aspect count and weight via `computeEnergyRating`)
- Advance banner: "Does today fire a named marker category based on slow-planet constellation weight?" (advance scoring via `scoreSnapshot`)

On a Power Day the energy bar may show 3 or 4 out of 5, while the advance banner explains exactly why the day is categorized as powerful. On a high-energy day with only fast-planet aspects, the energy bar may show 4–5 while no advance banner appears. These are intentionally independent and users benefit from seeing both.

Do not modify the energy bar or its position.

### 7. Empty / no-cache state

When `advanceSnapshotSessionCache` has no entry for the user's chart and current date (i.e., the user has not visited the Advance tab in this session), `advanceScore` is `null`. The Today page renders exactly as it does today — no banner, no placeholder, no skeleton, no "visit Advance tab to unlock" prompt. Silence is the correct empty state.

Do not render a skeleton or loading state for the advance signal at any point. The derivation is synchronous (a Map lookup), so there is no async gap to cover.

### 8. Chart identity and baseDate construction

The `chartKey` in `TodayPage` must be constructed with the same method used in `AdvanceTab` and `TransitReadingPage` to guarantee cache hits:

```ts
const chartKey = `${chartData.angles.ascendant.longitude.toFixed(4)}:${chartData.angles.midheaven.longitude.toFixed(4)}:${chartData.unknownTime}`
```

The `baseDate` for the daily period must match what `TransitReadingPage` passes to `preCalculateSnapshots`. In `TransitReadingPage.tsx:249`, `baseDate` is constructed as `new Date(transitData.dateRange.start + 'T12:00:00')`. The cache key therefore includes the transit period's start date ISO string, not today's date. This means `TodayPage` cannot independently reconstruct the daily `baseDate` without knowing what `transitData.dateRange.start` was — it will be today's date or the start of the current daily window, but the exact string must match.

**Resolution:** The singleton cache iteration should try all keys that begin with the user's `chartKey` prefix and `daily:`. Since `advanceSnapshotSessionCache` is a flat `Map`, `TodayPage` can iterate its entries to find any daily-period entry for the current chart identity whose `snapshots[0].dateStr` matches today's ISO date string (`new Date().toISOString().slice(0, 10)`). This avoids the need to know `baseDate` exactly:

```ts
const todayStr = new Date().toISOString().slice(0, 10)
for (const [key, snapshots] of advanceSnapshotSessionCache.entries()) {
  if (!key.startsWith(`${chartKey}:daily:`)) continue
  const todaySnap = snapshots.find(s => s.dateStr === todayStr)
  if (!todaySnap || todaySnap.score.category === 'neutral') continue
  setAdvanceScore(todaySnap.score)
  break
}
```

`dateStr` is already set on every `AdvanceSnapshot` at construction time in `runAdvancePreCalculation` and matches the `YYYY-MM-DD` format produced by `toISOString().slice(0, 10)`. This approach is robust against any `baseDate` construction difference between `TransitReadingPage` and `TodayPage`.

### 9. Exported surface additions to AdvanceTab.tsx

The following must be added to `AdvanceTab.tsx` exports (all are already defined internally or as constants; only the `export` keyword or a new declaration is added):

- `export const advanceSnapshotSessionCache = new Map<string, AdvanceSnapshot[]>()` — new module-level singleton
- `CATEGORY_LABELS` — already exported (line 71)
- `MARKER_COLORS` — already exported (line 63)
- `MarkerCategory` — already exported (line 18, `export type`)
- `SnapshotScore` — already exported (line 20, `export interface`)

No new exports are required beyond the singleton cache map.

### 10. Write-through in existing cache-populating effects

Two existing effects write to the component-local `snapshotCache` ref:

- `AdvanceTab.tsx:1303` — writes to `snapshotCache.current`
- `TransitReadingPage.tsx:258` — writes to `snapshotCache.current`

Each gains one additional line writing the same value to `advanceSnapshotSessionCache`. The write is synchronous and adds no meaningful overhead.

### 11. Performance constraint

The Today page must never call `preCalculateSnapshots` directly. `preCalculateSnapshots` computes 30 daily snapshots synchronously (each requiring aspect calculations, house assignments, and retrograde status checks for all transit planets) and takes tens of milliseconds. Triggering this on Today page load would introduce visible jank.

The entire advance signal on the Today page is derived from a synchronous `Map.entries()` iteration that terminates as soon as a matching entry is found. With typical session usage, the map has at most 3 entries (one per period) for the current user. The cost is negligible.

### 12. Edge cases

- **Unknown birth time:** `chartData.unknownTime` is included in `chartKey`, so a chart with unknown time will only hit cache entries computed with the same flag. No cross-contamination. If no advance session is cached for an unknown-time chart (because `AdvanceTab` suppresses house-dependent scoring when `unknownTime === true`), the banner is simply absent. Do not special-case this.
- **No chart data:** `TodayPage` already handles `chartData === null` gracefully across all its cards. The advance signal `useEffect` is gated on `if (chartData)` (line 57), so no lookup occurs when no natal chart exists.
- **Neutral category at offset 0:** `scoreSnapshot` can return `category: 'neutral'` for today (offset 0 can score as non-neutral — the `computePowerDayBanner` function at line 838 short-circuits only the *banner text* for offset 0 in the advance tab display, but the `score` object itself is computed and stored). If `todaySnap.score.category === 'neutral'`, skip it and treat as no signal.
- **Multiple period cache entries:** If both daily and weekly caches are warm, daily takes priority (see iteration order in spec 2). Weekly and monthly advance windows span longer time ranges and a weekly category may not correspond to today in the same acute way a daily one does.
- **Session boundary:** The singleton map is module-scoped and survives React re-renders but not a page reload. On first load of a fresh session, the map is empty and the banner is absent. This is correct behavior.

## Out of Scope

- **No blocking recalculation on Today page load.** `TodayPage` must never call `preCalculateSnapshots`, `runAdvancePreCalculation`, or any scoring function from `AdvanceTab.tsx`. The sole computation path is a synchronous Map lookup.
- **No "upgrade to see your power day" prompt.** If no cache entry exists, the Today page shows nothing advance-related. There is no upsell, teaser, or locked-state UI.
- **No modification to the Advance tab itself.** The advance slider, markers, overview strip, tooltip, and category banner in `AdvanceTab` are untouched.
- **No modification to the energy bar.** The `Transit Energy` card in `TodayPage` keeps its current position, calculation, and styling.
- **No new GPT call.** The `reason` and `guidance` strings are pre-computed rule-based strings from `scoreSnapshot`; no GPT interpretation of the advance category is added to the Today page.
- **No DailySnapshotCard integration.** The sprint vision mentions the home screen `DailySnapshotCard` as a separate polish candidate. This proposal covers only `TodayPage`.
- **No persistence of the advance signal across sessions.** The module singleton cache is not written to `localStorage`. If the user returns after a reload, the banner is absent until they revisit the Advance tab.
- **No category diversity filtering on the Today page.** The advance tab applies category diversity rules to the marker strip; the Today page reads a single snapshot at offset 0 and displays whatever category the engine scored it as.

## Open Questions

1. **`dateStr` format parity with `toISOString().slice(0, 10)`:** The `AdvanceSnapshot.dateStr` field is assigned inside `runAdvancePreCalculation`. The exact construction should be verified to confirm it produces `YYYY-MM-DD` and not a locale-dependent string. If `dateStr` uses a different format, spec 8's matching condition (`s.dateStr === todayStr`) must adjust accordingly. A quick grep of the `dateStr` assignment in `runAdvancePreCalculation` (lines 865–968 of `AdvanceTab.tsx`) should confirm the format before implementation.

2. **Offset-0 scoring behavior:** `computePowerDayBanner` at `AdvanceTab.tsx:838–841` explicitly returns `null` when `snapshot.offset === 0`, suppressing the banner display in the advance tab for the current moment. This suppression is a display choice, not a scoring choice — the `score` object for offset 0 is still fully computed and stored. The Today page bypasses this suppression intentionally, because the Today page *is* the "now" surface and showing the current-moment category is the entire point. Confirm this is the intended interpretation before implementing: the Today banner shows the advance signal for today even when the advance tab's own banner would suppress it at offset 0.

3. **`TransitReadingPage` baseDate vs. today:** `TransitReadingPage` constructs `baseDate` from `transitData.dateRange.start`, which is the start of the last-loaded transit period. For a daily transit reading started today, this matches today. For a transit reading loaded for a different month or date, the `baseDate` will not match today, and the spec-8 `dateStr` iteration will find no match for today — correctly returning no signal. Confirm this graceful miss behavior is understood and intentional before implementation.
