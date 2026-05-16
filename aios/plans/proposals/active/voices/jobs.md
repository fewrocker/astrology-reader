# Steve Jobs: Sprint 0020 — Finish What You Started, Then Go One Floor Higher

---

## Where We Are

Sprint 0019 delivered everything I asked for. The combination scoring is real. The reason strings have houses. The guidance field exists. The couple advance tab exists. Category diversity is enforced. The cache is fingerprinted.

I opened `CoupleAdvanceTab` and read it front to back. Here is what I found:

The couple advance tab is 807 lines of carefully written code. The scoring logic in `scoreCoupleSnapshot()` (lines 90–276) is architecturally sound and uses relational language throughout. The `COMPOSITE_PLANET_PHRASES` map names things like "the relationship's romantic axis" and "the bond's structures and commitments." This is real work and it shows.

But there are two things that make it visibly unfinished.

First: the banner renders `categoryBanner.split(' ')[0]` as bold (line 678). Not `bannerBoldFragment`. The `SnapshotScore` type has had `bannerBoldFragment` since sprint-0019. The individual `AdvanceTab` uses it correctly at line 1514. The couple tab never sets it in any of its three builder functions — `buildCouplePowerReason`, `buildCoupleAspectReason`, `buildCoupleShiftReason` — and never uses it in the banner render. So the couple banner bolds the first word of any sentence. A reason like "Saturn reaches the relationship's Ascendant" correctly bolds "Saturn." A reason like "Jupiter flows through the relationship's romantic axis" bolds "Jupiter." But a reason like "the relationship's drive and desire is under pressure" bolds "the." That is not acceptable.

Second: there is no `guidance` field. The individual advance tab's banner has two paragraphs — the reason sentence and the guidance sentence. The guidance is what transforms the banner from an observation into a prompt. "Face the pattern directly rather than managing around it — what gets restructured now builds a foundation that actually holds." That second paragraph is what makes the user feel the product is talking *to* them. The couple advance banner has only the reason sentence. It stops where the individual advance continues.

These two gaps are not cosmetic. They represent the couple advance tab being structurally one feature version behind its individual counterpart. That gap must close in sprint 0020 before anything else.

---

## What Is Underwhelming Today vs. What It Should Feel Like

### The Solar Return Page Has No Forward Motion

Go to `SolarReturnPage.tsx`. Two tabs: Reading and Chart. The reading tab shows `KeyPlacements`, `SRStaticBriefs`, and the GPT interpretation. The chart tab shows the bi-wheel and a planet table.

That is everything. The page presents the Solar Return chart as a static picture of the year. It does not answer the most urgent question anyone reading a Solar Return has: "Which months of this year are going to matter most?"

The SR chart has a known start date — the solar return moment is already computed in `solarReturnData.srMoment`. The year has a known end date — the next birthday. The SR chart is a `ChartData` object with planets, angles, and houses. The `preCalculateSnapshots` function already exists in `AdvanceTab.tsx` and accepts any `ChartData`. The density cap, category diversity, marker system, and Prev/Next navigation are all already built.

The Solar Return page right now is a weather report that tells you the climate for the year but never tells you which days are going to rain. "SR Sun in House 5 — a year focused on creativity and self-expression." Fine. But when in this year? Which months are the creative peaks? Which months has the SR chart loaded with challenging pressure? The user has no way to find out.

The advance strip for the SR year — running `preCalculateSnapshots` against the SR chart from the SR date through 12 monthly steps — answers this question in a single bar of colored dots. It reuses every piece of infrastructure this team has spent five sprints building. It gives the Solar Return page genuine forward motion. It transforms a static document into a navigable map of the year.

The vision document describes this correctly as "high-leverage." I would put it more plainly: it is the feature that makes the Solar Return page feel worth going to. Right now, most users look at it once and don't return. There is nothing actionable in a static year reading. A strip showing which months carry the year's most significant astrological weight — and Prev/Next navigation to jump between them — is the reason someone saves the page and comes back.

### The Couple Scoring Uses Inferior Criteria

`scoreCoupleSnapshot()` in `CoupleAdvanceTab.tsx` evaluates Priorities 3 and 4 (favorable and challenging) using `computeEnergyRating()` plus a raw score gate. Priority 2 (shift co-occur with favorable/challenging) also uses `computeEnergyRating`. This is the pre-sprint-0019 approach.

The individual `AdvanceTab` replaced all of this with `computeCombinedWeight` in sprint-0019. The combined weight model is architecturally better: it sums `PLANET_WEIGHT × (1 − orb/maxOrb)` across all tight applying aspects, applies a slow-planet threshold to distinguish Jupiter+Saturn constellations from Mercury+Mars noise, and derives intensity from the weighted sum rather than from a raw energy score.

The couple tab never got this upgrade. It still fires favorable and challenging markers on weak criteria — the old `rating.score >= 4` gate does not distinguish between a Jupiter-Saturn double that should fire and a Venus-Mercury pair that should not. The couple strip will surface more noise and suppress more signal than the individual strip for the same time window. That is a quality regression in the couple tab relative to what users already experience in individual advance.

The fix is already documented in the vision: port `computeCombinedWeight` into `scoreCoupleSnapshot` Priorities 2–4, replacing the `computeEnergyRating` gate. The function is exported-compatible in `AdvanceTab.tsx`. This is the kind of fix that takes a few hours and makes the couple strip meaningfully more accurate.

### The Synastry Axis Is Invisible to the Scorer

The composite chart captures the relationship as a midpoint entity. The synastry grid captures the actual interactions between two individual people. When transit Saturn crosses the degree of a tight Venus-Mars synastry conjunction — where person A's Venus and person B's Mars are locked at close orb — that transit is touching one of the relationship's most sensitive live wires. It is categorically more significant than Saturn merely crossing a composite planet at the same degree.

`scoreCoupleSnapshot` evaluates transits against composite chart positions only. It ignores `synastryData.synastryAspects` entirely. The synastry data is already passed into the function signature (line 93: `synastryData: SynastryData`) but the only thing pulled from it is the composite chart and angles (lines 123–128). The entire synastry aspect grid sits unused.

This means the couple advance strip can score a transit as "favorable" when Jupiter crosses composite Venus, while being completely blind to the fact that this transit is simultaneously sitting on a tight Venus-Mars synastry axis — which would make this not just a "favorable window" but one of the year's most significant moments for this specific couple's dynamic.

The vision document proposes a correct and tight scope for the fix: if a transiting slow planet is within `angleContact` orb of a synastry aspect's midpoint degree AND that synastry aspect has orb ≤ 2.0°, augment the intensity and append a relationship-specific reason suffix naming which cross-chart planetary axis is being activated. This is architecturally additive — it does not rebuild the scoring ladder, it adds a check that increases signal clarity.

This is the feature that makes the couple advance strip feel specific to this particular couple. Right now, two different couples with different synastry patterns but similar composite charts will see nearly identical advance strips. That is wrong. The synastry axis activation is what makes one couple's favorable window in June different from another couple's favorable window in June. It names the actual relational territory being activated, not just the composite chart echo.

### The Timeline Says "Power Day" Without Knowing What the Engine Knows

Open `TransitTimeline.tsx`. The `isPowerDay` flag on a `TimelineDay` is computed in the timeline engine based on event count clustering — three or more events on the same day. It is independent of the `SnapshotScore` system entirely.

Open `AdvanceTab.tsx`. The advance strip has pre-computed `SnapshotScore` objects for every snapshot. Some snapshots are `power`. Some are `challenging`. These are computed from actual aspect weight combinations, slow-planet constellations, and angle contacts.

These two systems operate in parallel with no connection. A date that the advance engine scores as `power` (Saturn reaching the Ascendant, high intensity) may or may not be labeled "Power Day" in the Timeline, depending solely on whether three events happen to cluster there. A date the Timeline labels "Power Day" (three minor transit events clustering) may score as `neutral` in the advance engine.

The user sees both systems on the same reading page. When the advance strip says "Power Day" and the timeline also says "Power Day" for the same date but for different reasons, the user has no reason to distrust either. When the advance strip says "Power Day" but the timeline is silent about it, or vice versa, the user gets a coherent but inaccurate picture. The incoherence is invisible and therefore more damaging than a visible contradiction.

The fix is to thread advance scores into the timeline rendering. The snapshots are pre-computed and indexed by date. When `DaySection` renders a date, a lookup into the pre-computed snapshot array for that date's score would let the timeline surface the actual astrological character of the day — "Power Configuration" or "Favorable Window" or "Challenging Period" — rather than the event-count heuristic. The implementation cost is low: the snapshots are available at the transit reading level, where the Timeline component is rendered.

---

## What Is the Most Impactful Thing to Ship Next

The question answers itself if you look at it from the user's actual journey.

A user opens a Solar Return reading. They see the year-ahead reading, the key placements, the bi-wheel chart. They read the GPT interpretation. And then what? They have no way to look ahead across the year. No way to know which months matter. No way to plan. They close the page.

If the Solar Return page had a "Peak Moments This Solar Year" strip — twelve dots across the SR year, colored by advance category, with Prev/Next navigation to jump to the meaningful months — that user would do something different. They would navigate the strip. They would find the gold dot in October and ask "what is October?" and find out Saturn is sitting on the SR Ascendant that month. They would share that with someone.

That experience is available at minimal implementation cost because `preCalculateSnapshots` already works with any `ChartData`. The SR chart is a `ChartData` object. The infrastructure for 12-step monthly advance from a known start date, the marker rendering, the overview strip, the Prev/Next controls — all of it exists. This is the highest-leverage improvement available in this sprint because the effort is low and the experience lift is high.

The `guidance` and `bannerBoldFragment` gap in the couple tab is the second most impactful because it is the most visible quality regression — users who experience both individual and couple advance will notice the couple advance feels less finished. That gap closes first in sequence because it is a pre-condition for the couple advance tab feeling production-ready.

---

## Where Are the Moments That Make Someone Tell a Friend

There are exactly two moments in this product where a user will say "you need to see this."

The first is when they find a marker on the advance strip and read a banner that describes their life accurately. "Saturn pressing your Moon in your 4th house — an emotional pattern you've relied on for stability is being tested this month." If someone is going through something difficult and they see that, and it names what they've been feeling without them having to explain it — they screenshot it. They send it to someone. That already exists in the individual advance tab, and sprint-0019 made it much better.

The second is when two people look at the couple advance strip together. "Look at this week in November — it's a power marker." What does it say? "Jupiter reaches the relationship's Midheaven — a significant moment for how this bond is recognized and defined in the world. A window for shared ambition, for making a public commitment, for a step the relationship has been building toward." If a couple has been thinking about moving in together or getting engaged, and the app says a specific month is astrologically supported for exactly that kind of step — they will remember that moment. They will tell people about it.

That moment is dependent on the synastry axis augmentation being in place. Without it, the couple strip is just transits to the composite chart. With it, the couple strip can say "this month Jupiter reaches the relationship's Midheaven AND activates the Venus-Mars axis in your synastry" — and that specificity is what makes the moment feel found rather than generated. The couple will feel the app knows something about their relationship that a generic astrology app does not.

The Solar Return strip creates a third category of shareable moment: "look at this, it found the hardest month of my year." Finding a challenging marker in a specific SR month and reading a reason string that names what is under pressure during that period — and then looking back and recognizing it was accurate — is the moment that converts a one-time user into someone who comes back every year.

---

## On the Four Candidate Areas

### Area 1: `guidance` field on `CoupleAdvanceTab` — Must ship, no question

The banner in `CoupleAdvanceTab.tsx` at lines 648–682 renders `categoryBanner.split(' ')[0]` as bold and nothing else. The `AdvanceTab` banner at line 1514 uses `bannerBoldFragment` and renders a second paragraph for `guidance`. The gap is visible. Fix it as described in the vision — add `guidance?: string` returns to the three builder functions, add `bannerBoldFragment` returns, and mirror the render path from `AdvanceTab`.

One additional precision the vision document does not call out explicitly: the guidance strings for couple advance must be genuinely relational in voice. "Face the pattern directly rather than managing around it" is individual voice. The couple guidance should be: "This is a window to talk about what has been unspoken between you — what the bond is being asked to restructure will be easier to work with if named than if managed around." Same structural function, different subject. Every guidance string for the couple tab should have "you two" or "together" or "between you" in it somewhere, or it will read as a copy of the individual advance guidance.

### Area 2: Synastry axis overlay scoring — Most product-distinctive feature in this sprint

This is the feature the product cannot get elsewhere. Every transit-to-composite scorer does what `scoreCoupleSnapshot` already does — it's just planetary arithmetic. Synastry axis activation is the differentiation. It requires knowing both charts and their interaction pattern, not just the composite entity. No other simple astrology product does this calculation.

The vision document's scope constraint is correct: require both (a) a transiting slow planet within tight orb AND (b) a synastry aspect ≤ 2° orb at or near the transit degree. Do not fire on loose synastry aspects. Do not fire on fast transiting planets alone. The false-activation risk is real and the quality bar is "must not fire on noise."

The reason suffix the vision proposes — "and activates the bond between [Person1Planet] and [Person2Planet]" — is the minimum. The better version names the character of that synastry axis: if the axis is Venus-Mars (attraction and desire), the suffix should name that. "and activates the attraction axis between your Venus and their Mars" is more specific than "and activates the bond between Venus and Mars." The synastry aspect object already carries both planet names. Name them in human terms.

### Area 3: `computeCombinedWeight` parity in `scoreCoupleSnapshot` — Necessary quality fix

This is not exciting but it is necessary. The couple advance strip's favorable and challenging markers will fire on inferior criteria until Priorities 2–4 use `computeCombinedWeight`. The current `computeEnergyRating` gate predates the combination scoring architecture. Port the function, replace the gates, match the threshold logic from `AdvanceTab`. This makes the couple strip as accurate as the individual strip. Do it.

### Area 4: Transit Timeline notable-moment integration — Right idea, needs precision on execution

The vision is correct that Power Day incoherence between the Timeline and the advance engine is a product quality problem. But the fix needs care.

The `TransitTimeline` component receives `days: TimelineDay[]` as its only prop (line 143). It knows nothing about `AdvanceSnapshot[]`. Threading advance scores into the timeline requires passing them as a second prop or computing them at the parent level and annotating the `TimelineDay` objects before passing them to the component.

The cleaner approach: at the transit reading page level, where both the `TransitTimeline` and the advance snapshots are available, build a `Map<string, SnapshotScore>` keyed by `dateStr` from the pre-computed snapshots, and pass it as an optional prop to `TransitTimeline`. The `DaySection` component can then look up the score for its date and render the advance category label (or the colored dot) alongside the existing Power Day badge, replacing the event-count heuristic for dates where an advance score is available.

The important nuance: the advance engine operates at weekly or monthly granularity in most views. The timeline operates at daily granularity. On daily period, the snapshots and timeline dates align. On weekly period, the advance score covers seven days — the timeline will need to find the closest advance snapshot within the week, not a same-day match. This is solvable but the matching logic needs to be deliberate, not assumed.

---

## What the Vision Missed

### The Solar Return Page Has No Sense of Duration

The SR "year" technically runs from the SR moment to the next birthday. But the Solar Return page shows the SR date and then... everything is presented as if it applies uniformly across the year. "SR Sun in House 5 — primary focus." For twelve months? All of them equally?

The reality is that transits activate the SR chart's promise and pressure unevenly across the year. Some months, the SR chart is dormant. Others, multiple transiting planets are simultaneously in aspect to SR chart planets, and the SR year's themes express intensely. The advance strip captures exactly this — the 12-step monthly view across the SR year would show which months are astrologically loaded and which are relatively quiet.

The static "year ahead reading" combined with the advance strip creates a two-layer experience: the GPT reading gives the character of the year, and the advance strip shows when that character is most intensely expressed. That is a compelling product story. Sprint 0020 should ship the strip, and a future sprint can deepen the integration between the year-level narrative and the month-level peaks.

### The `CoupleAdvanceTab` Banner Has a Visual Debt

The banner block in `CoupleAdvanceTab.tsx` at lines 648–682 renders the bold fragment as `categoryBanner.split(' ')[0]` — the first word of the sentence. This is the pre-sprint-0019 pattern. The `AdvanceTab` banner at line 1514 renders `bannerBoldFragment` if present, falling back to the first word.

The visual result: a couple banner for a "shift" marker whose reason starts with "Saturn stations retrograde" will bold "Saturn" (correct). But a banner for a favorable marker whose reason starts with "Jupiter flows through the relationship's romantic axis" will bold "Jupiter" (correct by accident, not by design). If `buildCoupleAspectReason` produces a reason starting with "the relationship's drive and desire is supported" — which is currently possible from the else branch at line 65 — then "the" is bolded, which is wrong.

This is a consequence of `buildCoupleAspectReason`, `buildCouplePowerReason`, and `buildCoupleShiftReason` not returning `bannerBoldFragment`. They return `string`, not `{ reason: string; bannerBoldFragment: string; guidance?: string }`. Fix the builder signatures alongside adding guidance, and the banner render path can be aligned with `AdvanceTab`'s pattern.

### The Solar Return Advance Strip Needs Its Own Quiet Message

The `OverviewStrip` component in `AdvanceTab.tsx` accepts a `quietMessage` prop — shown when the strip has no markers. The individual advance tab passes "A steady period — no exceptional signals in this window." The couple advance tab passes "A steady period for the relationship — no exceptional signals in this window." The Solar Return page's advance strip should pass something year-appropriate: "A steady solar year — no concentrated peaks detected in the advance." This is a minor detail but it matters for the SR page to feel considered rather than copy-pasted.

---

## The Standard

The test for this sprint is the same test I've applied to every sprint: take the product to a real person who has something real going on in their life. Show them the couple advance strip. Ask them to navigate to the first marker. Read them the banner.

If they hear a guidance sentence that speaks to their relationship — not to planetary mechanics, not to generic astrological wisdom, but to what two people working through something together should consider doing — you succeeded.

Then show them the Solar Return advance strip. Ask them to find the hardest-looking month. Read them what it says. If they say "yeah, that's what that month was" — or, even better, "I should probably clear my calendar for that month" — you built the right product.

The system knows which moments matter. The system now speaks in human language. Sprint 0020 finishes the couple layer and opens the Solar Return layer.

Do not stop until both of those surfaces feel as fully realized as the individual advance tab already does.
