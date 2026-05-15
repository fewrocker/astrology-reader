# Steve Jobs: Sprint 0018 — The Advance Tab Should Tell You Where to Look

---

## The Core Problem

Right now the Advance tab is a manual search engine. You drag a slider and discover what's there. That is the experience of someone who has to do the work themselves — like flipping through every page of a book hoping to land on something relevant. That is not a product. That is a prototype that forgot to become a product.

The data is already computed. Every single position in the slider journey — all 30 days, all 52 weeks, all 36 months — is pre-calculated on load and sitting in `snapshots[]`. The `computePowerDayBanner` function (line 106 of `AdvanceTab.tsx`) can already flag a position as notable. The scoring logic exists. The energy rating function `computeEnergyRating` (line 480 of `transits.ts`) already translates aspect data into a clear favorable/challenging verdict.

The user has no idea any of this is happening. They see a plain slider with a gold thumb. They drag it. They read. They drag more. There is no guidance, no signal, no intelligence visible to them at all.

This is the difference between a compass and a map. We built a compass. We need to build a map.

---

## What Is Mediocre That Should Be Delightful

### The Slider Is Dumb When It Could Be Smart

Look at the slider HTML at lines 265–276 of `AdvanceTab.tsx`:

```tsx
<input
  type="range"
  min={0}
  max={config.max}
  value={offset}
  onChange={handleSlider}
  className="w-full h-2 bg-mystic-bg rounded-lg appearance-none cursor-pointer accent-mystic-gold ..."
/>
```

A plain HTML range input. Styled nicely — the gold thumb is correct. But the track is inert. It communicates nothing about what lies ahead. This is like a road without any signs. You can drive it, but you don't know what you're driving toward.

The slider should be glowing with information before the user touches it. When the page loads and `snapshots[]` finishes computing, the user should be able to look at the track and immediately see: there are three green moments clustered in the first third, a red patch in the middle, and a gold power marker near the end. They know where to go before they drag anything. That is a product.

The mediocrity is specific: the slider exists in a visual vacuum. It has no relationship to the data it controls. Fixing this is the entire sprint.

### The "Notable Moments" Strip Does Not Exist

The vision describes an overview strip above the slider — a `w-full h-6` miniature timeline showing all markers across the entire range as small colored dots. This is the most important missing piece.

Here is why: the monthly period has 36 positions. Nobody is going to drag through 36 months one at a time hoping to find the three that matter. The weekly period has 52 positions. The daily period has 30. Without a bird's-eye view, the entire value of pre-computing all those snapshots is invisible. The user has to find what the system already knows.

When I think about someone using this product — a person who is genuinely trying to understand what the next year looks like for their career, or their relationships, or their general wellbeing — the thing they need is not a manual slider. They need to look at the whole sweep and see where the peaks and valleys are. Then they navigate to the moments that interest them. That is an entirely different product experience than what we have.

The "Notable Moments" strip turns the Advance tab from an exploration tool into an intelligence layer. Build it.

### The Power Day Banner Is the Right Idea, Half-Executed

The current `computePowerDayBanner` (line 106) fires when a slow planet contacts a natal angle within 1°, or when 3+ applying aspects with orb ≤ 2° converge. When it fires, it shows a gold banner below the slider with the ✦ symbol and descriptive text.

This is good. When it fires, it feels like something. The problem is it only fires for the current slider position. It has no visibility into what's coming. The user has to land on a power day by accident — or by systematic dragging — to discover it.

Worse, the banner is binary. Power day or nothing. The real astrological picture is a spectrum: some days are highly favorable, some are challenging, some have planetary stations happening, some are neutral. The banner collapses all of this nuance into a binary that fires rarely and says nothing about the character of the moment.

Generalize `computePowerDayBanner` into `scoreSnapshot()`. The vision has the right spec: return `{ category: 'power' | 'favorable' | 'challenging' | 'shift' | 'neutral', intensity: number, reason: string }`. Run it over every snapshot after `preCalculateSnapshots` completes. Store the scores with the snapshots. Use those scores to drive the marker layer. The banner itself becomes a consequence of the marker layer, not a separate system.

### The Loading State Is Anticlimactic

When `AdvanceTab` first mounts, it shows "Computing transits…" in both the chart area and the aspect list while `useTransition` finishes the snapshot calculation. This is correct and honest — the calculation is real work.

But when the computation finishes, nothing announces it. The content appears. The slider becomes usable. That's it.

Compare to what it could feel like: the computation finishes, and the marker layer populates — dots light up across the slider track, the overview strip fills with colored signals. The UI goes from blank to alive. That transition should feel like the curtain rising. Right now it feels like a spinner stopping.

The computation moment is the most important visual event in the Advance tab's lifecycle. The current code gives it no presence. The sprint should make it count.

---

## What Is Missing That Would Make Someone Love This

### The Ability to Ask "When Is the Best Time?"

This is what every person using this feature actually wants to know. Not "what does August 14th look like?" — they want "when should I do the thing I'm thinking about doing?"

The current design forces the user to do the work of answering that question manually. The marker system answers it automatically: look at the overview strip, find the green cluster, navigate there.

But the experience should go further than visual markers. When the user lands on a green-marked day and the banner says "Favorable Window," what does that mean for them specifically? It means three or more harmonious applying aspects are tight, which translates to: the planets are actively moving into beneficial relationships with your natal chart. This is a moment for action, not for waiting.

The reason string from `scoreSnapshot()` is what bridges the marker to the human meaning. "Jupiter trine your natal Venus — a window for expansion in relationships and abundance" is specific and meaningful. "Three tight aspects converge" is data. The reason must be the human translation of the data.

### The Click-to-Jump Navigation That Does Not Exist

The slider is the only navigation affordance. This means to get from the current position to a marker you can see in the overview strip, you have to drag the slider across whatever's in between. On a mobile screen, this is imprecise. On any screen, it breaks the experience of using the overview strip as a navigation tool.

Every dot in the overview strip should be clickable and should jump the slider to that position instantly. Every dot marker on the slider track itself should be clickable for the same reason. The user should be able to scan the whole period, identify something that looks interesting, tap it, and arrive there.

This is not a minor detail. The entire value proposition of the marker system depends on it. A map where you can see destinations but cannot navigate to them is not a map — it is a picture of a map.

### Animations That Feel Mystical, Not Notification-Like

The guidelines are explicit about this, and they are right. The temptation when adding animated dots to a UI is to reach for `animate-ping` or `animate-bounce` — these are Tailwind's built-in attention-getters, and they feel like notification badges. They belong in a productivity app, not in a contemplative astrological reading.

The Advance tab is a space for reflection. Someone opening it is asking "what is ahead for me?" That is not a question you ask in the same mental mode you use when checking your email. The animations must honor the mental state the product is asking the user to enter.

Slow breathing pulses — `animation: pulse 3s ease-in-out infinite` — feel like starlight. They suggest that something is alive and waiting, not that something demands your attention. Gold power markers should breathe slowly. Challenging red markers can pulse slightly faster, like tension, but not frantically. Favorable green markers can be static with a soft glow rather than animated — they are welcoming, not urgent.

The shape language matters too: circles for favorable and challenging (soft, approachable), diamond ✦ for power (the same symbol already used in the power day banner), small square ◆ for shift events. Shape differentiates by type; color differentiates by quality. This is accessibility and aesthetics solving the same problem simultaneously.

### The Context Between Tabs That Does Not Exist

The Advance tab lives in `TransitReadingPage.tsx` at line 366–374, rendered as:

```tsx
{activeTab === 'advance' && (
  <div className="mb-8">
    <AdvanceTab
      chartData={chartData}
      aspects={aspects}
      period={transitPeriod}
      baseDate={new Date(transitData.dateRange.start + 'T12:00:00')}
    />
  </div>
)}
```

No header. No introduction. The user clicks "Advance" and gets the slider immediately, with no statement of what the tab is for. For a first-time user who has not read any documentation, the advance tab is a mystery slider that changes the chart wheel.

The vision suggests a pre-tab summary strip above the tab bar — a compact horizontal ribbon showing the highest-intensity upcoming moment. That is the right idea. A single sentence: "Your next power day is in 11 days — Saturn reaches your Ascendant." This appears on the Reading tab, before the user even opens Advance. It creates the desire to explore.

This cross-tab call-to-action is the marketing for the Advance tab's intelligence. Without it, the user has to discover the Advance tab by curiosity. With it, they open it because the Reading tab told them something worth finding was there.

---

## Specific Proposals

### P1: The `scoreSnapshot()` Function — The Engine of Everything

**File:** `src/components/reading/AdvanceTab.tsx`, after `computePowerDayBanner` (line 163)

The new function signature:

```typescript
interface SnapshotScore {
  category: 'power' | 'favorable' | 'challenging' | 'shift' | 'neutral'
  intensity: number  // 0.0 – 1.0, drives dot size and animation speed
  reason: string     // Human-readable sentence for tooltip and banner
}

function scoreSnapshot(snapshot: AdvanceSnapshot, chartData: ChartData): SnapshotScore
```

Category priority order (when multiple conditions meet, highest priority wins):

1. **power**: slow planet (Saturn/Uranus/Neptune/Pluto) within 1° of natal ASC or MC — same logic as `computePowerDayBanner`'s primary trigger, extracted into `scoreSnapshot`. Reason: "{Planet} {verb} your {Ascendant/Midheaven}."

2. **shift**: any planet stations within the step window. Detect from `snapshot.retrogrades` where `status.includes('Stationing')`. Reason: "{Planet} stations {retrograde/direct} — a pivot in {planet's domain}."

3. **favorable**: `computeEnergyRating(snapshot.transitAspects).score >= 4` AND 2+ applying harmonious aspects with orb ≤ 1.5°. Reason: "{N} harmonious aspects applying — {names the tightest one}."

4. **challenging**: `computeEnergyRating(snapshot.transitAspects).score <= 2` AND 2+ applying challenging aspects with orb ≤ 1.5°. Reason: "{N} tense aspects applying — {names the tightest one}."

5. **neutral**: everything else. No marker rendered.

Intensity for power: orb-based — `1.0 - (orb / 1.0)` where orb is the angle contact distance. Tighter = more intense.
Intensity for favorable/challenging: normalized from energy score.
Intensity for shift: always 0.8 (stations are categorically significant).

Guard: `if (snapshot.offset === 0) return { category: 'neutral', intensity: 0, reason: '' }` — current date is reference, not a future signal.

Suppress offset 0. This is already enforced in `computePowerDayBanner`. The new function must carry the same discipline.

The scoring runs once over `snapshots[]` after `preCalculateSnapshots` completes, inside a `useMemo`. The marker layer reads from this scored array — never rescores during slider drag.

### P2: The Marker Layer — Dots That Breathe on the Slider Track

**File:** `src/components/reading/AdvanceTab.tsx`, slider section (lines 265–281)

Replace the bare `<input>` with a positioned wrapper:

```tsx
<div className="relative w-full">
  <input type="range" ... />  {/* existing input, unchanged */}
  <div
    className="absolute inset-0 pointer-events-none"
    style={{ top: '50%', transform: 'translateY(-50%)' }}
  >
    {markers.map(m => (
      <MarkerDot
        key={m.offset}
        marker={m}
        max={config.max}
        active={offset === m.offset}
        onClick={() => setOffset(m.offset)}
      />
    ))}
  </div>
</div>
```

The `MarkerDot` component:
- Positioned at `left: (marker.offset / config.max) * 100%`
- Shape: circle for favorable/challenging, diamond for power, small square for shift
- Size: 6–10px diameter, driven by `marker.intensity` — more intense moments get bigger dots
- Color: green (`bg-emerald-400`) for favorable, red (`bg-red-400`) for challenging, gold (`bg-mystic-gold`) for power, blue (`bg-blue-400`) for shift
- Animation: power dots get `animate-[pulse_3s_ease-in-out_infinite]`, challenging dots get `animate-[pulse_1.5s_ease-in-out_infinite]`, favorable dots get a static glow (no animation — they are welcoming, not urgent), shift dots get a slow fade
- When `active={true}` (slider is at this position): dot expands to 12–14px with full opacity glow
- `pointer-events-none` on the overlay container but `pointer-events-auto` on individual `MarkerDot` elements so click-to-jump works

The `pointer-events-none` on the container and `pointer-events-auto` on each dot ensures the native range input receives all drag events while the dots intercept only deliberate taps and clicks.

### P3: The Notable Moments Overview Strip

**File:** `src/components/reading/AdvanceTab.tsx`, above the slider control card

A `w-full h-8` strip rendered before the slider card, only shown when `markers.length > 0`:

```tsx
{markers.length > 0 && (
  <div className="mb-3">
    <div className="flex items-center justify-between mb-1">
      <span className="text-mystic-muted text-[10px] uppercase tracking-widest">Notable moments</span>
      <span className="text-mystic-muted text-[10px]">
        {config.max} {config.unitPlural}
      </span>
    </div>
    <div className="relative w-full h-6 bg-mystic-surface/40 rounded-full border border-mystic-border/50 overflow-hidden">
      {markers.map(m => (
        <button
          key={m.offset}
          onClick={() => setOffset(m.offset)}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
          style={{
            left: `${(m.offset / config.max) * 100}%`,
            backgroundColor: MARKER_COLORS[m.category],
          }}
          title={m.reason}
        />
      ))}
      {/* Current position indicator */}
      <div
        className="absolute top-0 h-full w-px bg-mystic-gold/50"
        style={{ left: `${(offset / config.max) * 100}%` }}
      />
    </div>
  </div>
)}
```

This strip gives the user the bird's-eye view the vision calls for. Clicking any dot in the strip jumps the slider to that offset. The vertical line at the current offset position tracks where the slider is. For a monthly period with 36 positions, this strip is the primary navigation affordance — a user can see at a glance that month 4 has a gold power marker and navigate there without dragging.

At daily resolution (max 30), the strip is narrower and the dots are smaller but still readable. At weekly resolution (max 52), same. The strip should never show more than one dot per 4px of track width — if two markers are very close, the higher-priority category wins (power > shift > favorable/challenging).

### P4: The Marker Tooltip

**File:** `src/components/reading/AdvanceTab.tsx`, `MarkerDot` component

When a marker is hovered (on desktop) or when the slider is dragged to a marked position:

- A tooltip appears above the marker dot (or above the slider) showing:
  - The date, formatted as `snapshot.dateStr` in the `formatDate` style
  - A category label: "Power Day" / "Favorable Window" / "Challenging Period" / "Planetary Shift"
  - One line: `marker.reason`

For mobile (no hover), the tooltip appears automatically when `offset === marker.offset` — it renders below the slider control card in place of or alongside the existing power day banner, using the same gold border treatment as the current `powerDayBanner` block (lines 317–325). The banner is already the right visual treatment; the sprint should expand it to cover all non-neutral categories, not just power days.

A challenging period banner: red border, red left accent, red symbol (⚠), reason text in `text-red-400/90`.
A shift event banner: blue border, blue left accent, ◆ symbol, reason text in `text-blue-400/90`.
A favorable banner: green border, green left accent, ✦ symbol, reason text in `text-green-400/90`.
Power banner: unchanged from current implementation.

### P5: The Cross-Tab Teaser in TransitReadingPage

**File:** `src/components/results/TransitReadingPage.tsx`, above the tab bar (lines 281–314)

After `preCalculateSnapshots` has run — which it does when the Advance tab is mounted — there is no mechanism to surface the most important upcoming moment on other tabs. The teaser should be computed in `TransitReadingPage` itself, not in `AdvanceTab`, so it can display on the Reading tab.

The simplest implementation: after the tab structure renders, run a lightweight version of `scoreSnapshot` over the first N snapshots (cap at 14 for performance) to find the highest-intensity non-neutral moment. Display it as a single-line banner above the tab bar:

```tsx
{upcomingPowerMoment && (
  <div className="mb-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-mystic-gold/10 border border-mystic-gold/20">
    <span className="text-mystic-gold text-xs">✦</span>
    <p className="text-mystic-muted text-xs flex-1">
      <span className="text-mystic-gold">{upcomingPowerMoment.dateStr}</span>
      {' — '}{upcomingPowerMoment.reason}
    </p>
    <button
      onClick={() => setActiveTab('advance')}
      className="text-mystic-gold text-xs font-heading hover:text-mystic-gold/80"
    >
      Advance →
    </button>
  </div>
)}
```

This single element answers the question users actually have when they open the Reading tab: "Is there anything I should pay attention to coming up?" And it creates a natural path into the Advance tab for users who would not otherwise discover it.

The computation for this teaser should use `useMemo` with a dependency on `chartData` and `transitPeriod`, not `AdvanceTab`'s snapshot array (which is internal). A separate lightweight call over a narrow window (14 days/weeks/months) keeps it fast.

### P6: The Scored Snapshot Type — Architecture First

**File:** `src/components/reading/AdvanceTab.tsx`, `AdvanceSnapshot` interface (line 17)

Add the score field to the snapshot type so scores are stored with snapshots, not recomputed on render:

```typescript
interface AdvanceSnapshot {
  offset: number
  date: Date
  dateStr: string
  transitPlanets: TransitPosition[]
  housedTransitPlanets: TransitPosition[]
  transitAspects: TransitAspect[]
  retrogrades: { planet: PlanetName; isRetro: boolean; status: string }[]
  score: SnapshotScore  // NEW — computed once in preCalculateSnapshots
}
```

Add scoring inside `preCalculateSnapshots` at line 167, after each snapshot is pushed to the array:

```typescript
const score = scoreSnapshot(snapshot, chartData)
snapshots.push({ ...snapshot, score })
```

The `markers` array that drives the marker layer and the overview strip is then a simple `useMemo` over `snapshots.filter(s => s.score.category !== 'neutral')`. This computes once when snapshots are ready and never again.

The only re-render the marker layer should trigger is when `offset` changes (to show the active state). The marker positions and scores do not change with slider movement.

---

## What Must Not Happen

Do not animate the slider thumb. The thumb is a precise control instrument. Animation on a control element breaks the user's spatial model — they need the thumb to be exactly where they left it, always. Animation belongs on the marker dots, not the thumb.

Do not show markers at offset 0. The current date is a reference point, not a future recommendation. A power day marker at "Now" tells the user nothing actionable. The `scoreSnapshot` function must enforce `offset === 0 → neutral`, just as `computePowerDayBanner` currently enforces `offset === 0 → null`. This guard is not optional.

Do not use the timeline engine (`buildTransitTimeline` from `transitTimeline.ts`) to generate marker data. The vision document is explicit about this and right for good reasons: `buildTransitTimeline` is expensive (it runs binary search for every aspect perfection across the full date range) and is already running for the Timeline tab. Running it a second time for the Advance tab would double the computation without any benefit — the snapshot array already has all the data needed. The marker system must work from the existing `snapshots[]` array exclusively.

Do not let the marker layer intercept range input events. The native `<input type="range">` must receive all pointer events for dragging to work correctly. The marker container uses `pointer-events-none` and individual dots use `pointer-events-auto` only for click-to-jump. Any implementation that breaks slider dragging has failed.

Do not add gamification framing. The markers are astrological signals derived from real ephemeris data. A gold marker appears because Saturn is within 1° of the natal Ascendant — a specific, verifiable astronomical fact about this person's chart. It is not a badge, not an achievement, not a streak. The language in tooltips, banners, and labels must stay grounded in astrological vocabulary: "Power Day," "Favorable Window," "Challenging Period," "Planetary Shift." Not "Amazing Day," "Watch Out," "Level Up."

---

## The Standard

When this sprint ships, sit down with someone who has never used this product. Open the Advance tab for a monthly period. Don't explain anything. Watch what they do.

If the first thing they do is look at the overview strip and say "what's that gold one?" — you succeeded at P3.

If they click the gold dot and land on the power day and read the banner and understand why it matters — you succeeded at P1, P2, and P4.

If they spend two minutes exploring the strip and the markers before touching the slider — you succeeded at the whole sprint.

If they drag the slider to the first position and methodically step through 36 months — you failed. The product should have told them where to look before they had to ask.

The Advance tab pre-computes everything. It knows which moments matter. The only remaining question is whether we are willing to show the user what we already know.

Show them.
