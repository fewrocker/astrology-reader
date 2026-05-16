# Steve Jobs: Sprint 0019 — The System Knows. Now Make It Mean Something.

---

## Where We Are

Sprint 0018 shipped everything I asked for. The marker dots breathe on the slider track. The overview strip gives the bird's-eye view. The click-to-jump navigation works. The architecture is sound — `SnapshotScore` is a first-class type, stored with snapshots, never recomputed on drag.

But then I actually used it.

I looked at a 36-month monthly strip and saw two markers. Both green. Both labeled "Favorable Window." Both with the same kind of sentence: "Saturn trine your natal Venus — a window of structure and discipline." That is not a window description. That is a Wikipedia entry. Two markers across three years of someone's life, and both say the same thing in slightly different words.

The infrastructure is now a beautiful frame around a painting that isn't finished. Sprint 0019 is about painting.

---

## The Fundamental Problem

The scoring engine in `scoreSnapshot()` (lines 202–390 of `src/components/reading/AdvanceTab.tsx`) treats every aspect as if it exists in isolation. It looks at the single tightest applying aspect and uses that to define the entire moment. It ignores what else is happening simultaneously. It has no concept of combinations.

This is like diagnosing someone's health by looking at their temperature and ignoring everything else in their chart. Technically you measured something. But you missed the patient.

Real astrological power moments happen when things stack. Jupiter trining natal Venus is pleasant. Jupiter trining natal Venus *while* the Sun conjuncts natal Jupiter *while* both are in the 5th house — that is a week when a romance could start that changes someone's life. The current system cannot tell the difference between these two situations. It calls both "favorable" and writes a single-planet sentence.

The reason string from `buildAspectReason()` (lines 175–196) confirms the problem. It reads: "Saturn trine your natal Moon — a window of structure and discipline." Three failures in one sentence:

1. It doesn't say what house natal Moon is in, so "natal Moon" is abstract.
2. "Structure and discipline" is Saturn's archetype label, not what this transit *feels like* in a human life.
3. There is no guidance on what to do with this window.

The vision document calls the quality bar correctly: could a thoughtful astrologer friend read this aloud and have it feel personally relevant? The current output fails that test every time.

---

## What Is Mediocre That Should Be Delightful

### The Reason String Is a Label, Not an Insight

Right now, `buildAspectReason()` at line 175 does this:

```typescript
return `${planet} ${type} your natal ${natalPlanet} — tension around ${domain}.`
```

"Tension around structure and discipline." That is a filing system entry, not a human experience.

What does Saturn opposing natal Moon feel like over three weeks? It feels like an emotional pattern you've relied on your whole life is being put under a pressure test. Old ways of seeking comfort — isolation, food, overwork, whatever the pattern is — stop working. You feel a gap between how you *need* to feel and how you *are* feeling, and you cannot close it by doing what you always do. That is the experience. That is what the reason string should describe.

The fix is not to make the strings longer — it's to make them *accurate*. A tight sentence that names the actual life experience is worth five sentences of planetary vocabulary. "An emotional pattern you have leaned on is being tested this week — what you usually reach for for comfort won't settle it" is better than "Saturn opposition your natal Moon — tension around structure and discipline."

The `computeTransitAspectBrief()` function in `src/data/interpretations/transitAspectBriefs.ts` already generates house-contextualized briefs for the aspect rows. The `scoreSnapshot` function reinvents this from scratch with less context and worse results. These two systems should converge. The reason string in `SnapshotScore` should draw from the same data structures that feed the transit aspect rows — the `TRANSIT_PLANET_PHRASES`, `HOUSE_THEMES`, and `getPlanetInHouseInterpretation()` are all in place. The scoring engine just refuses to use them.

### Single-Aspect Scoring Misses All the Interesting Moments

The favorable and challenging categories in `scoreSnapshot()` (lines 334–390) both work identically: find the tightest applying aspect from the highest-weight planet, write a sentence about it, return.

This means the system is structurally blind to the moments that actually matter most — the ones where multiple signals converge. A transit week where:
- Jupiter trines natal Venus in the 5th (romance, creativity opening up)
- Venus trines natal Jupiter (amplifying that signal)
- The Sun conjuncts natal Moon in the 7th (emotional connection with a partner)

...scores identically to a week where only Jupiter trines natal Venus at a wider orb with nothing else notable happening. The second week is a pleasant planetary moment. The first week is when someone falls in love. The system cannot tell the difference.

The vision document at lines 54–58 of `sprint-0019/vision.md` is precise about this: "a 'power' or 'challenging' moment must be identified by evaluating the *constellation* of concurrent aspects, not just the single tightest one."

The fix requires a combination scoring pass. When two or more tight applying aspects involve personal natal planets across different life houses, that is a qualitatively different moment than any single aspect. The score should reflect the stack, and the reason should describe the combination — not one planet's role, but the confluence.

### The House Is Right There and the System Ignores It

Every `TransitAspect` in the snapshot already carries `natalHouse`. The `HOUSE_THEMES` data in `src/data/interpretations/houseThemes.ts` maps house numbers to plain English life areas. The infrastructure for house-anchored language exists everywhere in this codebase — it just doesn't flow into `scoreSnapshot()`.

When Saturn challenges natal Mars in the 10th house (career zone), the correct message is: "Pressure on your career and public ambitions — the work you've been doing is being evaluated, and the evaluation may feel harsh before it feels constructive." When Saturn challenges natal Mars in the 7th house (partnership zone), the correct message is: "Friction in close relationships — a partner may push back in ways that feel structural and non-negotiable."

Same aspect. Completely different life experience. The current system says "tension around drive and assertion" for both and calls it done.

Every reason string that involves a natal planet must name the house that planet occupies and say, in plain English, what that house governs. Not "your natal Mars" — "your Mars in your 10th house (career and public reputation)." This is not decorative. It is the difference between astrology that describes something specific about this person and astrology that describes something true of everyone with Saturn-Mars aspects.

### The Action Guidance Is Missing Everywhere

The vision document identifies this explicitly: "favorable windows should include what kind of action is well-supported. Challenging windows should name what is likely to be stressed and what coping posture helps."

Not one single reason string in the current system tells the user what to *do*.

"Jupiter trine your natal Venus — a window of expansion and opportunity." Okay. What do I do with this? Do I ask someone out? Launch something? Send the proposal? Call the person I've been avoiding?

The answer is yes. But the product doesn't say so. And for a challenging period: "Saturn opposition your natal Moon — tension around structure and discipline." What do I do? Avoid big decisions? Double down on routine? Give myself more space? The product knows the answer — the planetary combination has a posture — but it whispers nothing.

Adding action guidance to the reason strings (or, better, to an extended `brief` field on `SnapshotScore`) is the difference between astrology as a curiosity and astrology as a practical tool. The sprint vision is correct: people showing up to this product are asking "what should I pay attention to, and what should I consider doing?" The current output answers neither.

---

## What Is Missing That Would Make Someone Love This

### Couple Advance Does Not Exist at All

Look at `src/components/results/SynastryTransitPage.tsx`. Seventy-five lines of GPT interpretation rendering, a transit aspects table, a planet positions table, navigation buttons. No slider. No advance tab. No way to look ahead.

For a couple using this product, the most emotionally compelling question is not "what do my transits look like right now?" It is "when is a good week for us?" When is the couple's emotional connection amplified? When might we be under pressure? Is next month a good time to have the conversation we've been avoiding?

None of this is answerable from the current synastry transit page. The individual advance tab doesn't even appear in the synastry context. The `SynastryData` already contains the composite chart, synastry aspects, and house overlays — all the raw material to build a couple advance scoring system. The problem is no one built the coupling layer.

The vision is precise about what couple advance scoring should evaluate: not just "is transit Jupiter harmonious to composite Moon" but whether the composite chart's relationship planets are simultaneously activated, whether the transit also triggers synastry aspects between the two people's charts. "This week Jupiter transits your composite Venus while also hitting the Venus-Mars synastry axis — favorable for romance, connection, shared pleasure."

This is the feature that makes someone show the app to their partner. "Look at this — it found us a good week." That is a real human moment. That is the kind of product experience people describe to their friends. The individual advance tab is useful. The couple advance tab is where the product becomes something people talk about.

### Variety Enforcement Across the Timeline

The vision document identifies the density cap problem at lines 56–57: the 20% cap should not force five green markers when there's also one red and one gold. The current implementation applies the cap by intensity alone — it keeps the highest-intensity markers regardless of category. So if someone's chart happens to produce seven favorable windows and two challenging periods across 36 months, all seven favorable windows outrank both challenging periods and the cap will sometimes surface only green markers.

The result is a strip that looks like a single-note song. Everything favorable, or everything challenging, or — most commonly — everything neutral with two green dots. The markers communicate less when they all share the same color than when the strip shows a mix of moments with different characters.

The fix is to enforce category diversity in the density pass. Before applying the intensity sort, ensure the cap tries to include at least one marker per non-neutral category present in the full scored set. If the chart produces at least one power marker, at least one challenging marker, and several favorable markers, the final visible set should represent all three categories even if some individual favorable markers are cut.

### The Shift Category Remains Underused and Underexplained

The "shift" category (blue diamond, planetary station) appears perhaps once in a 36-month monthly view — if at all. When it does appear, the reason string says: "Saturn stations retrograde." That is a fact. It is not an experience.

A planetary station is one of the most palpable astrological events in everyday life for people who pay attention to these things. When Saturn stations, decisions that have been moving forward suddenly seem to stall. When Mars stations direct, energy that has felt blocked releases. When Mercury stations retrograde, communication that seemed clear suddenly needs revisiting.

The shift category has rich interpretive territory and the `TRANSIT_RETROGRADE` data in `src/data/interpretations/retrogrades.ts` already exists to support it — but it's only being used in the retrograde activity section at the bottom of the advance tab, not in the `reason` field of the `SnapshotScore` for shift markers. The station marker tooltip should not say "Saturn stations retrograde." It should say something like: "Saturn slows to a stop and reverses — decisions and commitments that have been moving forward are asking to be reconsidered. The next four to six weeks are not the time to finalize anything long-term."

---

## Specific Proposals

### P1: Combination Scoring in `scoreSnapshot()`

**File:** `src/components/reading/AdvanceTab.tsx`, the `scoreSnapshot()` function (lines 202–390)

The function currently evaluates conditions in strict priority order and returns on the first match. That architecture must change to a scoring model before returning.

The new approach: collect all signals present in the snapshot into a weighted score, then determine category from the combination. Specifically:

After detecting angle contact (power) and stations (shift), evaluate the full constellation of tight applying aspects. Count how many distinct natal houses are activated. If two or more personal natal planets (Sun, Moon, Mercury, Venus, Mars) are activated simultaneously by tight harmonious aspects, the favorable score escalates. If two or more are activated by challenging aspects, the challenging score escalates. The combination multiplier should drive both intensity and the reason string.

A snapshot with Jupiter trining natal Venus (5th house, pleasure and romance) AND Venus trining natal Jupiter (9th house, meaning and growth) should produce:
- Category: favorable
- Intensity: 0.9 (combination)
- Reason: "Two planets amplify your capacity for joy this week — your 5th house (creativity and romance) and 9th house (meaning and adventure) are both opening. This is a window for pursuing connection, creative work, or an experience that expands how you see yourself."

The reason string for combinations should lead with the life experience (what is opening/closing) before naming the planets. The planets are the *why*, not the *what*.

### P2: House-Anchored Reason Strings

**File:** `src/components/reading/AdvanceTab.tsx`, `buildAspectReason()` (lines 175–196) and `buildPowerReason()` (lines 161–170)

Both functions must be rebuilt to incorporate house context. The `buildAspectReason` function receives a `TransitAspect` which already has `natalHouse`. The `HOUSE_THEMES` data is importable from `src/data/interpretations/houseThemes.ts`.

New pattern for reason strings:

```
{transit planet} {action phrase} your {natal planet} in your {house number} house ({house theme in plain English}) — {what this combination means in life terms}.
```

Example output:
- Before: "Saturn opposition your natal Moon — tension around structure and discipline."
- After: "Saturn presses your Moon in your 4th house (home and family foundations) — an emotional pattern that has been stable is being tested. What you reach for when you need comfort may not settle the discomfort this time."

The `computeTransitAspectBrief()` function in `transitAspectBriefs.ts` is already doing this work for the aspect rows. The scoring engine should call into the same infrastructure rather than maintaining a separate, inferior string-building system. The duplication between `buildAspectReason` and `computeTransitAspectBrief` is an architectural error that needs to be resolved this sprint.

### P3: Action Guidance Field on `SnapshotScore`

**File:** `src/components/reading/AdvanceTab.tsx`, `SnapshotScore` interface (lines 19–32)

Add an optional `guidance` field:

```typescript
export interface SnapshotScore {
  category: MarkerCategory
  coShift: boolean
  intensity: number
  reason: string       // one-line human sentence (unchanged)
  guidance?: string    // what to consider doing or watching for (new)
  shiftPlanet?: string
  shiftDirection?: 'retrograde' | 'direct'
  triggerAspect?: { ... }
}
```

The `guidance` field populates in the banner (the existing `categoryBanner` block at lines 1019–1054) as a second paragraph below the `reason`. It is never shown in the tooltip (too small) — only in the expanded banner when the user has navigated to this position.

Favorable guidance examples by trigger planet:
- Jupiter: "This is a window for initiating — reaching out, making an ask, starting something new. The energy supports expansion rather than consolidation."
- Venus: "Prioritize beauty, connection, and what brings you genuine pleasure. This is not a time for discipline; it is a time for receiving what the relationship or the creative work has been offering."

Challenging guidance examples:
- Saturn challenging personal planets: "This period rewards facing what you have been avoiding. Trying to go around the difficulty will extend it. The pressure eases when you meet it directly."
- Pluto challenging personal planets: "Something is completing a transformation that has been underway longer than you may realize. Resistance makes it harder; allowing the release makes it cleaner."

### P4: Couple Advance Tab on `SynastryTransitPage`

**File:** `src/components/results/SynastryTransitPage.tsx` (lines 95–183)

Add an "Advance" tab to the synastry transit page, parallel to the individual transit reading's advance tab structure. The couple advance tab needs its own scoring logic that evaluates:

1. Transits to the composite chart's relationship-sensitive planets (composite Venus, composite Moon, composite Sun, composite 7th house cusp)
2. Whether the transit simultaneously activates synastry aspects between the two individuals — the axis between person A's Venus and person B's Mars, for example

The composite chart is already available in `SynastryData`. The synastry aspects are already computed. The transit aspects to the composite chart are already in `synastryTransitData.transitAspects`.

A new function — `scoreCoupleSnapshot()` — evaluates the composite chart activation in combination with synastry axis activation and returns a `SnapshotScore` using couple-voice reason strings. The reason string voice changes from "your natal Moon" to "the relationship's emotional center" or "the bond's Venus-Mars axis."

The couple advance reason strings should specifically name what the couple is experiencing, not what the planets are doing. "Jupiter amplifies your shared emotional world this week — the relationship's capacity for joy and growth is lit up. This is a good week for shared experiences, for travel together, for conversations about what you both want." That is a couple advance reason string. It answers the question couples actually bring to this product.

### P5: Category Diversity in the Density Cap

**File:** `src/components/reading/AdvanceTab.tsx`, the density cap post-processing pass (lines 492–509)

The current cap sorts by intensity and keeps the top N markers regardless of category. Replace with a two-phase selection:

Phase 1: Reserve one slot for each non-neutral category that has at least one marker. Power takes its highest-intensity marker. Favorable takes its highest. Challenging takes its highest. Shift takes its highest.

Phase 2: Fill remaining slots (up to the 20% cap) by intensity across all remaining markers regardless of category.

This guarantees that if the chart produces at least one challenging marker and at least one power marker, both will appear in the final strip even if they are outnumbered by favorable markers. The timeline strip will tell a more complete story of the period because it will represent the full range of astrological character present — not just the most numerous category.

### P6: Richer Shift Marker Reason Strings

**File:** `src/components/reading/AdvanceTab.tsx`, the shift branch of `scoreSnapshot()` (lines 283–331)

The current pure shift reason: `"${stationPlanet} stations ${stationDirection}."`

This is the astrological fact. It is not the human experience. The `TRANSIT_RETROGRADE` data in `src/data/interpretations/retrogrades.ts` already has `brief` strings per planet for retrograde activity. Those briefs should flow directly into the shift marker reason string, adapted for the station direction.

New shift reason template: `"${planet} is slowing to a station — ${stationBrief}. The next several weeks carry ${planet}'s themes in a more deliberate, introspective key."`

The `guidance` field for a shift marker should note what station periods are historically used for: Mercury retrograde for review and revision, Saturn retrograde for reconsidering commitments, Jupiter retrograde for internal growth rather than external expansion.

---

## What Must Not Happen

Do not add more planetary vocabulary in the reason strings without adding human meaning. Every new adjective that describes a planet ("transformative," "expansive," "disciplining") without describing what the human will experience is a step backward. The sprint's entire value depends on moving from planetary description to life description.

Do not make the couple advance a copy-paste of the individual advance with "the relationship's" substituted for "your." The composite chart activation and the synastry axis activation are different data structures than the individual natal chart activation. Couple advance scoring must be built for the composite context, not retrofitted from individual logic.

Do not solve the combination scoring problem with a longer single-aspect sentence. A sentence that mentions two planets while still being structured around one primary aspect is not combination scoring. Combination scoring means the system evaluates the *stack* — what else is happening at the same time — and names that constellation as a unified moment with a single life meaning.

Do not ship reason strings that a user cannot act on. The test for every reason string: after reading it, does the user know something about what the next week or month will feel like, and do they have any sense of how to meet it? If the answer to both is no, the string needs to be rewritten.

---

## The Standard

The test for this sprint is simpler than the last one. Show the product to someone who is thinking about something real — a relationship, a job decision, a creative project they haven't started, a difficult conversation they've been avoiding. Show them the advance tab for the next year.

If they look at a marked moment and say "yeah, that's actually what I've been feeling" or "huh, I didn't think about it that way but that fits" — you succeeded.

If they look at a favorable window banner and say "so what do I do?" and the product already told them — you succeeded.

If they look at the couple advance strip with their partner and one of them says "should we plan that trip during this week?" — you built the right product.

The system already knows which weeks matter. Sprint 0018 made that knowledge visible. Sprint 0019 makes it meaningful.

Meaningful is harder than visible. But visible without meaningful is just noise with better animation.
