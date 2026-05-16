# Proposal: Transit Timeline / Advance Score Coherence

**Type:** Code Enhancement
**Originated by:** Jobs, Carmack, Miyazaki, Taleb

---

## Problem / Opportunity

`TransitTimeline.tsx` displays a "Power Day" badge driven by a raw event-count heuristic with no connection to the advance scoring engine that has been the primary investment axis for the past five sprints. The two systems share the label "Power Day" but define it through entirely different logic, producing contradictory signals to the user.

### The heuristic is defined in `/projects/astrology-reader/src/engine/transitTimeline.ts`, line 491:

```ts
isPowerDay: significantCount >= 3,
```

where `significantCount` (line 486) counts any event that is not a Moon sign change. Three Mercury ingresses, or a lunar phase plus two sign changes, produces a "Power Day" badge. The label fires regardless of which planets are involved and with no reference to the natal chart's sensitive points.

### The advance engine's `power` category fires on a categorically different condition:

In `/projects/astrology-reader/src/components/reading/AdvanceTab.tsx`, the `power` scorer (Priority 1, approximately lines 600–660) requires a slow outer planet — Saturn, Uranus, Neptune, or Pluto — within `angleContact` orb of the natal Ascendant or Midheaven. This is a high-bar, astrology-grounded criterion that connects the sky directly to the user's natal angles.

### The contradiction a user experiences:

The "reading", "timeline", and "advance" tabs are all visible in `TransitReadingPage.tsx` (lines 206, 354–374). A user who opens both the **Timeline** tab and the **Advance** tab for the same period may see:

- **Timeline tab:** "Power Day" badge on a date with three Moon-related ingresses and a lunar phase
- **Advance strip:** no gold diamond marker on that date (the advance engine found no slow-planet angle contact)

And the reverse: a date where transiting Saturn is within 2° of the natal Ascendant may show a gold `power` diamond in the Advance strip but only a plain dot in the Timeline (if that day has fewer than three significant events).

The product is telling two different truths about the same sky on the same day. This is especially damaging because the "Power Day" label is identical in both surfaces — the user has no reason to suspect these are computed differently.

### State architecture gap:

`AdvanceTab` keeps its pre-computed snapshots in local component state (`[snapshots, setSnapshots]` at line 1243 of `AdvanceTab.tsx`) and a `useRef`-based cache (`snapshotCache` at line 1240). `TransitTimeline` is rendered by `TransitReadingPage.tsx` (line 361) via a completely separate code path — it receives `timelineDays` computed from `buildTransitTimeline` (line 228–233), which has no access to the advance engine's scored snapshots. `AdvanceTab` is conditionally rendered only when `activeTab === 'advance'` (line 366), meaning its internal state does not exist when the Timeline tab is active.

As a result, the Timeline has no mechanism to consume advance scores at the point where it would need them. The snapshot data is inaccessible from the Timeline tab unless it is lifted to the parent component or a shared context.

### The `TimelineDay` type is already structured to accommodate the fix:

`TimelineDay` (line 41–46 of `/projects/astrology-reader/src/engine/transitTimeline.ts`) is a plain object with `dateStr`, `date`, `events`, and `isPowerDay`. The `isPowerDay` field is a boolean that `DaySection` in `TransitTimeline.tsx` reads at lines 108–121 to render the gold dot and badge. The architecture to annotate a day from external data already exists — it is just that `isPowerDay` is set once inside `buildTransitTimeline` and never touched again.

### `TransitTimeline.tsx` passes the `isPowerDay` value from `TimelineDay` directly with no override mechanism:

`DaySection` receives `{ day: TimelineDay }` (line 98) and renders `day.isPowerDay` (lines 108, 118). `TransitTimeline` receives `days: TimelineDay[]` (line 143) and maps them to `DaySection` with no opportunity to inject augmented data (lines 208–210). The component has no prop for advance score annotations.

---

## Desired State

The Timeline's "Power Day" label aligns with the advance engine's `SnapshotScore` categories, so a date that the advance engine marks as `power` (or high-intensity `favorable` or `challenging`) produces a meaningful badge in the Timeline view, and a date that only qualifies by event count does not claim equivalence with an authoritative advance marker.

**Concretely:**

1. `TransitReadingPage.tsx` lifts snapshot computation out of `AdvanceTab`'s internal state and into component-level state (or a `useMemo`) so that both the Advance strip and the Timeline can read from the same pre-computed data. Alternatively, `preCalculateSnapshots` is called once in `TransitReadingPage` and passed down as a prop to both `AdvanceTab` and `TransitTimeline`. Either approach breaks the current encapsulation of snapshots inside `AdvanceTab`'s `useState`.

2. A `scoreByDate: Map<string, MarkerCategory>` is derived from the non-neutral snapshots:

   ```ts
   const scoreByDate = useMemo(() => {
     const m = new Map<string, MarkerCategory>()
     for (const s of snapshots) {
       if (s.score.category !== 'neutral') m.set(s.dateStr, s.score.category)
     }
     return m
   }, [snapshots])
   ```

   This map is passed to `TransitTimeline` as an optional prop.

3. `TransitTimeline` accepts `scoreByDate?: Map<string, MarkerCategory>` and passes it to `DaySection`. `DaySection` overrides (or replaces) the heuristic `isPowerDay` flag when the advance score provides authoritative data for that date:

   - If `scoreByDate.get(day.dateStr) === 'power'`, the day shows the gold "Power Day" badge (same visual as today).
   - If `scoreByDate.get(day.dateStr)` is `favorable` or `challenging`, the day shows a category-appropriate badge ("Favorable Window" / "Challenging Period") rather than the generic "Power Day" label — this is a net improvement over the current heuristic which uses the same label for all non-neutral categories.
   - If `scoreByDate` is not provided (snapshots not yet computed or advance tab never opened), the Timeline falls back to the existing `isPowerDay` heuristic gracefully — no loading state required, no broken UI.

4. The category-specific badge rendering in `DaySection` should reuse `CATEGORY_LABELS` from `AdvanceTab.tsx` (line 71–77) to keep the wording consistent across the advance strip and the timeline.

5. The event-count `isPowerDay` heuristic in `buildTransitTimeline` (line 491 of `transitTimeline.ts`) should be retained as a fallback for cases where snapshot data is unavailable. It should not be removed — it provides a graceful degraded state for the Timeline when the advance engine has not run.

**State sharing considerations:**

The snapshots are computed asynchronously under `useTransition` (line 1244 of `AdvanceTab.tsx`). If computation is lifted to `TransitReadingPage`, the pending state should be held there too. The Timeline should not trigger its own snapshot computation — it should only consume data that the advance computation flow provides. First-time Timeline viewers whose session has not activated the Advance tab will see the event-count heuristic; this is an acceptable degraded state and should be documented in a code comment at the annotation injection point.

The advance snapshot cache (`snapshotCache`, currently a `useRef<Map>` in `AdvanceTab`) will need to move to the parent component or be replaced with a context-level cache if snapshots are shared. Cache key format should follow the pattern established by the sprint-0019 fix: `${period}:${baseDate.toISOString()}:${chartData.angles.ascendant.longitude.toFixed(4)}:${chartData.angles.midheaven.longitude.toFixed(4)}:${chartData.unknownTime}`.
