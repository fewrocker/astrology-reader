# Sprint 0019 — Vision

## Sprint Focus

Upgrade the Advance tab's scoring and interpretation layer to surface genuinely meaningful moments — "power weeks" and "challenging periods" that resonate as real-life events, not abstract planetary crossings — for both individual transit readings and synastry couple readings. The output should feel like a knowledgeable friend describing what is about to happen to your life, not a technical readout of aspect angles.

## Why Now

Sprint 0018 shipped a complete scoring + marker infrastructure (`SnapshotScore`, marker dots, prev/next navigation, overview strip). That infrastructure is sound but the content it surfaces is thin and repetitive. The current `scoreSnapshot` function awards markers by three narrow signals:

1. A slow planet within a tight angle-contact orb of ASC/MC (power)
2. Two or more tight applying harmonious/challenging aspects when the energy score crosses a threshold (favorable / challenging)
3. A retrograde station crossing (shift)

In practice, the 20% density cap and the tight orbs mean users scanning a 36-month monthly timeline may see only two or three markers — often all the same category — and the `reason` string they get is a bare formula sentence ("Saturn presses your Midheaven — a significant moment for career decisions and public commitments"). There is no explanation of *why this particular combination matters now*, what it is likely to feel like in real life, what the user should do with this window, or how the planets at play interact with one another. For synastry, the Advance tab does not exist at all — the `SynastryTransitPage` has no advance slider.

The guidelines are explicit: the system must identify *power combinations*, explain *why they matter*, connect them to *practical life impact*, and cover both personal charts and couples.

## Where to Look

### Scoring engine — `src/components/reading/AdvanceTab.tsx`

The entire scoring pipeline lives in `scoreSnapshot()` (lines 202–390) and the helper functions above it. The four priority buckets (power / shift / favorable / challenging) and their `reason` string builders (`buildPowerReason`, `buildAspectReason`) are the primary target. The scoring logic needs to evaluate combinations, not individual aspects in isolation, and the reason strings need to communicate meaning in plain language.

Specific gaps:
- `buildAspectReason` produces "Saturn opposition your natal Moon — tension around structure and discipline." That is a label, not an insight. What does Saturn opposing natal Moon feel like over three weeks? What decisions tend to surface? What should the person watch for?
- Power days trigger only on slow-planet angle-contact with ASC/MC. Jupiter transiting natal Venus in the 5th with a simultaneous Venus-trine-Sun would score neutral under the current rules despite being a genuine high-compatibility window for romance or creativity.
- No multi-aspect combination logic: a snapshot with two tight challenging aspects involving Saturn + Pluto to personal natal planets is categorically indistinguishable from a snapshot with two minor harmonious aspects.
- No house context is woven into `reason`: the 5th house being activated during a Jupiter window is different from the 8th house being activated.

### Transit interpretation layer — `src/engine/transits.ts` + `src/data/interpretations/transitAspectBriefs.ts`

`computeTransitAspectBrief()` (transitAspectBriefs.ts) is already designed to generate house-contextualized briefs for individual aspect rows. The scoring engine does not use it — it builds its own `reason` strings from scratch with less context. The brief generation infrastructure should flow into the snapshot scoring layer so that the human-readable output is consistent and house-aware.

The `domainMap` in `buildAspectReason` (AdvanceTab.tsx line 179) names planet domains ("transformation and power", "inspiration and surrender") but ignores the natal house the aspect touches. A Saturn transit challenging a natal Mars in the 10th house career zone is a very different life event than the same Saturn-Mars aspect when Mars sits in the 3rd house (communication friction) or the 7th (relationship pressure).

### Synastry / couple surface — `src/components/results/SynastryTransitPage.tsx`

The Advance tab is imported and used only in `TransitReadingPage.tsx` (personal transit). `SynastryTransitPage.tsx` has no advance slider. For the couple reading, transits are currently calculated against the composite chart (`buildCoupleTransitPrompt`), and `SynastryData` includes the composite chart, synastry aspects, and house overlays — all the data needed to score couple advance snapshots. The couple-advance surface does not exist yet.

When building couple-advance scoring, the semantically interesting question is not "is transit Jupiter harmonious to composite Moon" but "is this a week where the couple's emotional flow is amplified by a beneficial transit while the romantic axis is also lit up?" — which requires evaluating the composite chart's key relationship planets together.

### Interpretation data — `src/data/interpretations/`

`houseThemes.ts` maps house numbers to life areas (career, home, partnership, etc.) and already provides `brief` strings. This is the raw material for turning "Saturn presses your 7th house" into "Saturn presses your partnership zone — decisions about commitment, renegotiating agreements, or ending something that no longer serves the relationship."

`synastryAspectBriefs.ts` and `synastryHouseOverlayBriefs.ts` contain relational interpretation vocabulary that should inform couple advance scoring.

## Quality Bar

A marker moment should pass this test: could a thoughtful astrologer friend read the `reason` string and the brief expanded explanation aloud to someone and have it feel *personally relevant*? Not "Saturn squares your Moon — structural tension around emotional security" but something like "The next three weeks are a pressure test for one specific emotional pattern you've carried since childhood — Saturn is asking you to restructure how you handle it, and the timing is deliberate."

Concretely:
- **Combination scoring**: a "power" or "challenging" moment must be identified by evaluating the *constellation* of concurrent aspects, not just the single tightest one. Two or three concurrent signals involving different life areas multiply significance.
- **House-anchored language**: every reason string that has a natal planet involved must name the house that planet occupies and what that house governs in plain English. "Your 4th house (home and family)" not "your natal Moon."
- **What to do with this**: favorable windows should include what kind of action is well-supported (initiating, communicating, committing, creating). Challenging windows should name what is likely to be stressed and what coping posture helps.
- **Variety across the timeline**: the 20% density cap should not force multiple markers to share the same category. The scoring system should prefer surfacing one each of power, favorable, challenging, and shift across a 36-month range over clustering five green favorable markers.
- **Couple advance**: when the feature is extended to synastry, the scoring should evaluate composite chart planets being activated *and* whether the transit simultaneously triggers synastry aspects between the two people's charts — "this week Jupiter transits your composite Venus while also hitting the Venus-Mars synastry axis — favorable for romance, connection, shared pleasure."

## What This Sprint Is NOT

- Not a UI redesign of the Advance tab. The marker dots, overview strip, prev/next navigation, and slider are complete and should not be changed.
- Not a rewrite of the transit reading page's main GPT interpretation. The GPT text block and transit timeline tab are out of scope.
- Not a new feature surface beyond extending Advance to synastry. Solar return, journal, or numerology are not in scope.
- Not a data layer rebuild. House themes, aspect definitions, and the ephemeris engine are stable. New interpretation strings should be added as data (lookup tables, template functions) not by changing calculation mechanics.
- Not chasing completeness on every aspect combination. The goal is a small number of high-quality moment classifications that feel deeply meaningful over a large number of mechanically correct but shallow ones.
