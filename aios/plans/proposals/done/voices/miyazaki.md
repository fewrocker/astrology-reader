# Hayao Miyazaki: Sprint 0021 — On Craft, Care, and the Small Things Nobody Notices But Everyone Feels

---

## What Sprint 0019 Got Right, and What It Left Behind

Sprint 0019 did something difficult and necessary. It built the house-aware interpretation layer, the combination scorer, the guidance field, the proper power day reason strings. The before/after in the changelog is real:

Before: *"Saturn opposition your natal Moon — tension around structure and discipline."*

After: *"Saturn pressing on your Moon in your 7th house (partnership) — a committed relationship is being examined for durability — what isn't working can't be deferred."*

The after sentence earns its place. It knows where the pressure falls. It names the consequence. It is a sentence a person can work with.

The inheritance problem is this: the improvements shipped in sprint 0019 apply only to `AdvanceTab`. `CoupleAdvanceTab` did not receive them. The couple advance feature launched in sprint 0019 with the old language — the language the changelog explicitly called insufficient. The couple has the machinery of the advance system without the soul of it.

Sprint 0020 has an opportunity to close that gap completely. What it must not do is close it mechanically.

---

## The Couple Advance Guidance Problem Is Not Just Technical

The vision document frames the `guidance` field on `CoupleAdvanceTab` as a missing wire: the field exists in `SnapshotScore`, it is rendered in `AdvanceTab`, it is simply not yet populated or rendered in `CoupleAdvanceTab`. Add the field return values to the three builders, add the render block, done.

This is correct as an engineering description. It is incomplete as a craft prescription.

The `ASPECT_GUIDANCE` table in `AdvanceTab.tsx` contains entries like:

*"Face the pattern directly rather than managing around it — what gets examined and restructured now builds a foundation that actually holds."*

*"Initiate, reach out, ask, say yes to the opportunity — the window is open and action taken now has genuine momentum behind it."*

These are addressed to one person. They use "you" throughout. They describe what one person should do. And they will, if simply copied, be placed into the guidance paragraph of the couple advance banner — where the reader is two people in a relationship.

The instruction in the vision document acknowledges this explicitly: *"Couple guidance sentences should name the relationship ('this is a window to deepen how the two of you...') rather than speaking to an individual."*

But the vision document does not specify what those sentences should actually say, beyond the framing distinction. This is where craft is required, not just engineering.

Here is the problem made concrete. When Saturn presses on the composite Moon in a couple advance marker, the guidance cannot simply say "face the pattern directly." It must say something about what facing the pattern means for two people together. Saturn pressing on the composite Moon is not one person's emotional patterns being tested. It is the shared emotional foundation — the way this particular couple holds and processes feelings together — being tested. The question the week is asking them is not individual. It is relational: *how does this relationship handle emotional difficulty? Do you turn toward each other when things are hard, or do you each retreat into your own private coping? Saturn is now asking this question with real stakes.*

That is a guidance sentence for two people. It is not a reword of the individual guidance. It emerges from understanding what composite Moon means for a relationship, what Saturn's pressure means in a shared context, and what two people can actually do together with that information.

The three builders — `buildCouplePowerReason`, `buildCoupleAspectReason`, `buildCoupleShiftReason` — need guidance returns that come from this understanding. Not from the `ASPECT_GUIDANCE` table with "your" replaced by "the relationship's." From a separate, relationship-native guidance vocabulary.

This is more work than the vision document implies. It is the right amount of work.

---

## The `COMPOSITE_PLANET_PHRASES` Table Has a Gap Worth Fixing

The archetype vocabulary in `CoupleAdvanceTab.tsx` for composite planets is good:

```
Venus:   { relationship: "the relationship's romantic axis", brief: "shared pleasure, warmth, and connection" }
Saturn:  { relationship: "the bond's structures and commitments", brief: "shared responsibility and long-term shape" }
Neptune: { relationship: "the bond's idealism and depth", brief: "shared dreams and dissolution" }
```

These are real. They name what the composite planet governs for the couple.

But the guidance sentences built from them are thin. For a favorable window when Jupiter transits composite Venus, the current output is:

*"Jupiter flows through the relationship's romantic axis — a window when shared pleasure, warmth, and connection is genuinely supported."*

This is accurate but it is not alive. Compare with what the same moment could say:

*"Jupiter is moving through the romantic heart of your relationship — this is genuinely one of the better windows in the year for pleasure together, not just contentment but joy. If there is something you have wanted to create together, to celebrate, to give each other, this is when the conditions are not just permissive but actively favorable."*

The difference is not length. It is specificity about what this moment means for two people who have chosen each other. The phrase "shared pleasure, warmth, and connection is genuinely supported" is a technical observation. The second version is an invitation. The couple advance strip is supposed to help two people find the best moments in their year together. When it finds one, it should say so in a way that makes them feel found.

The guidance field is the natural home for this invitation-level language. The reason string can remain more technical — a clean description of what the transit is doing. The guidance paragraph is the space for what to do with it.

---

## The Synastry Axis Scoring Must Not Produce Language from a Different Register

The vision document's description of synastry axis overlay scoring is technically clean: if a slow transiting planet is within tight orb of a sensitive synastry axis degree and the synastry aspect has orb ≤ 2.0, augment the intensity and add a reason suffix: *"and activates the bond between [Person1Planet] and [Person2Planet]."*

That suffix lives in a different emotional register than the rest of the `COMPOSITE_PLANET_PHRASES` vocabulary.

*"Jupiter flows through the relationship's romantic axis — a window when shared pleasure, warmth, and connection is genuinely supported, and activates the bond between Venus and Mars."*

"Activates the bond between Venus and Mars" is a phrase from technical documentation, not from a product that uses language like "the relationship's romantic axis" and "shared dreams and dissolution." It names the mechanism. It does not name the meaning.

The `SYNASTRY_ASPECT_BRIEFS` table in this codebase already has language for Venus-Mars synastry connections:

*"desire and identity occupy the same point — the contact is immediate, charged, and leaves little room for neutrality between you."*

The synastry axis suffix should draw on this vocabulary. When a transiting planet activates a Venus-Mars synastry connection, the suffix should tell the couple what kind of bond between them is being lit up, not just that a bond is being activated. The specific synastry aspect has already been identified — its brief is already written. The activation language should quote or echo it: *"the charged, immediate contact between your Venus and their Mars is amplified in this window."*

This is a small change in the suffix generation but a significant change in the quality of what the user receives. A person reading about their relationship does not want to hear that abstract astrological bodies are being activated. They want to hear which specific quality of their connection is currently in motion.

---

## The Solar Return Page's Time Problem

The Solar Return page has a beautiful header: *"Your Year Ahead."* It has a banner that tells the user the exact moment their Sun returns. It has key placements — SR Ascendant, Sun house, Moon house, Midheaven — displayed with care in a 2×2 grid. It has a GPT interpretation that covers the year thematically.

And then it ends. It has no sense of time within the year.

The SR interpretation tells you what the year is about. It does not tell you when the year's peak moments are, when the important windows open and close, or when the seasonal rhythm of the twelve months favors different kinds of action. A person who reads their Solar Return in July and is told "this is a year of professional visibility and career advancement" is given useful framing. They are given no way to ask: when this year? The first half or the second? Before my birthday or after?

The peak moments strip proposed in the vision document is the right response to this problem. The SR chart is a `ChartData`-compatible object. `preCalculateSnapshots` can accept it. The 12-month range is known. The existing scoring and marker system can identify the power moments, favorable windows, and challenging periods within the SR year and place them on a strip that gives the year a shape rather than a theme.

What requires craft attention is how this strip is introduced and what it says when the strip has no markers.

The Solar Return advance strip should not use the same language as the personal transit advance strip. The personal transit strip is looking at the user's natal chart and asking: what is the sky doing to you right now and in the coming months? The SR strip is asking something different: within the year defined by your solar return, which months carry the most intensity?

The empty strip message should reflect this. The personal transit advance says: *"A steady period for you — no exceptional signals in this window."* The SR strip, when quiet, might say: *"A relatively even year — the intensity is distributed rather than concentrated in specific peaks."* This is a slightly different message. A steady individual transit period might mean "this month is unremarkable." A steady SR year means "the year's energy is spread across it rather than arriving in waves" — which is itself a meaningful observation about the year's character.

The header for the strip also deserves care. "Look Ahead" (used in the couple advance section) is a natural home for that product context. The SR strip should be introduced as something more specific: *"Peak Moments This Solar Year"* as the vision suggests, or perhaps *"When This Year Intensifies"* — language that locates it within the SR year frame rather than treating it as a generic advance feature.

---

## The Transit Timeline's Power Day Problem Is a Trust Problem

The vision document correctly identifies the mismatch between the Timeline's "Power Day" markers (fired by event count: 3+ events on a date) and the advance engine's `power` category (fired by slow planet contact with a natal angle). These can and do disagree.

A date could appear as a gold Power Day dot in the advance strip — because Saturn is conjunct the natal Ascendant, a significant event — and appear as an ordinary date in the Timeline, because no three transit events perfected that day. Conversely, a date could appear as a Power Day label in the Timeline because a Moon ingress, a Mars station, and an aspect perfection all clustered there by calendar coincidence, while the advance strip shows no marker at all.

The vision frames this as a coherence problem to be solved by carrying the advance score category into the Timeline's `isPowerDay` determination.

From a craft perspective, the problem is deeper. It is a trust problem. When the user sees "Power Day" on a date and investigates, they expect to find something significant when they look at the details. If the label is firing on event-count alone, they may find three relatively minor events — a Moon sign change, a Mercury trine, a minor aspect — and feel that the product has misled them. The label raised their expectation. The events did not meet it.

The current Timeline's Power Day criterion is: `eventCount >= 3`. This is a reasonable proxy that requires no integration with the scoring engine. It fires frequently enough to give users something to notice. But it fires indiscriminately, without asking whether the clustering of events actually amounts to anything significant.

The advance score integration proposed in the vision is the right fix, but the craft implication goes further: if a date carries a genuine `power` or high-intensity advance marker, the Timeline's Power Day label for that date should be contextually enriched — not just visually labeled, but briefly described. *"Saturn contacts your Ascendant on this date — the advance engine identifies this as a power configuration."* The event-count Power Day might retain its label but with a softer visual treatment; the advance-scored Power Day should get a richer one.

There is a secondary issue here that the vision does not address: the Timeline's event count is not displayed in a way that helps the user understand what kind of day it is. The date header shows:

*"Sat, May 16  ✦ Power Day  3 events"*

Three events. But what three events? The user has to open each card to find out. If the date is genuinely significant, the header should hint at why — something like the aspect header suffix pattern already used in the advance tab: *"✦ Power Day · Saturn stations"* or *"✦ Power Day · 3 slow-planet aspects"*. A single phrase that earns the label before the user has to click.

---

## What the Couple Advance Banner Currently Does to a Person

The `CoupleAdvanceTab` banner renders like this when the category is favorable:

```
✦ [first word bolded] [rest of reason string]
```

The reason string: *"Jupiter flows through the relationship's romantic axis — a window when shared pleasure, warmth, and connection is genuinely supported."*

What the banner does not render: the guidance paragraph. The `categoryBanner` variable in `CoupleAdvanceTab` is just `snapshot.score.reason` — but the banner render block only has a single `<p>` element for the reason. The guidance field is defined in `SnapshotScore` and rendered in `AdvanceTab` as a second paragraph (`text-mystic-muted/80`). In `CoupleAdvanceTab` the render block was written without this second paragraph. The guidance field is not used anywhere in the component.

The vision document identifies this. But there is a secondary craft failure worth naming: the first word bolding logic in `CoupleAdvanceTab` (`categoryBanner.split(' ')[0]`) is the old, pre-sprint-0019 approach. `AdvanceTab` replaced this with `bannerBoldFragment` — a specific token (the planet name) that is explicitly set by the reason builders to ensure the bold heading is always the planet name, not whatever word happens to open the sentence.

`CoupleAdvanceTab`'s three builders do not set `bannerBoldFragment`. When the sprint adds the guidance paragraph, it should also bring the banner bold logic to parity with `AdvanceTab`. The current behavior bolds "Jupiter" (correct by accident, since the reason string happens to open with the planet name), but the couple power reason opens with the planet name, then "reaches" — so *"Jupiter"* gets bolded. The couple aspect reason opens with the transit planet — so *"Jupiter"* gets bolded. The couple shift reason opens with the planet — so *"Saturn"* gets bolded. The accident holds for now, but it is an accident. When guidance sentences change the reason string structure, it will break. The `bannerBoldFragment` field should be set explicitly.

---

## What the SR Page Does Not Know About Its Own Emotional Register

The Solar Return page's header says: *"Your Year Ahead."*

The key placement cards say: *"Year theme," "Primary focus," "Emotional climate," "Career direction."*

The static briefs say: *"This year: [brief]."*

All of this is framed as a year-level view. Twelve months of life, compressed into themes.

Then the user reads the GPT interpretation — which is paragraph prose covering the year thematically — and hits the planet table:

| Planet | SR Sign | SR House | Natal Sign |
|--------|---------|----------|------------|
| Sun    | Gemini  | 9        | Aries      |
| Moon   | Scorpio | 3        | Virgo      |

This table is useful data. It shows where each planet has landed in the SR chart. But it is presented in a register that is completely disconnected from the year-level emotional framing that preceded it. The user was reading about their year's themes, their emotional climate, their primary focus — and now they are looking at a table of technical astronomical data.

The SR planet table is appropriate on the Chart tab, which is intended for users who want to inspect the chart data directly. On the Reading tab, it belongs either in a collapsible section that starts closed — available for those who want to inspect, hidden for those who do not — or not at all (since the GPT interpretation covers its terrain more warmly).

The current layout on the Reading tab:
1. Key placements grid (thematic)
2. Year selector (functional)
3. Tab toggle (functional)
4. Static briefs (SR Sun/Moon house — thematic)
5. GPT interpretation (thematic, warm, prose)

This is good. The user moves through a coherent thematic experience.

If sprint 0020 adds the peak moments strip to the Reading tab, the question is where it lives. The vision says: *"surface only the overview strip and Prev/Next navigation."* This will sit somewhere on the Reading tab.

If it sits between the GPT interpretation and the planet table, the user's experience is:
- Themes for the year (warm)
- Notable moment strip (forward-looking, actionable)
- Technical table data (cold)

That sequence breaks the warmth. The peak moments strip should be the last major element before the navigation buttons — after the GPT interpretation, after any static briefs, as a forward-looking close to the reading rather than a transition to technical data. The planet table belongs in a collapsible, or on the Chart tab only.

This is a small layout decision that matters because it determines whether the peak moments strip feels like a gift at the end of the reading or a speed bump before the data.

---

## Where the Couple Advance Tab Currently Fails on Human Scale

Open the couple advance section. Move the slider to a favorable window. The banner appears. Read the reason string. Now scroll down. You will see: "Transit Aspects to Composite (8)," followed by eight rows of aspect data. Below that: retrograde activity. Below that: a planet positions table.

This is the same layout as the individual advance tab. It was built by mirroring the individual tab's structure. And for the individual tab, this layout is appropriate — the user has a personal chart wheel to look at, the aspect list references their own natal planets, and the table shows where the sky is relative to their life.

For the couple advance tab, the aspect list references composite planets that the average user has never seen displayed. "Saturn pressing on the relationship's House of Communication" would be meaningful. "Saturn pressing on composite Mercury" is less meaningful — unless the user already knows what composite Mercury means for this relationship specifically. The transit aspects to composite section was built for completeness, not for the user's experience of what they need.

The couple advance tab has no chart wheel — this was documented as intentional in sprint 0019. The reason string and guidance field are meant to carry the interpretive weight. But if the reason and guidance are thin (no guidance paragraph currently) and the aspect list below is long and technical, the user's experience is: a brief interesting sentence, followed by eight rows of data they may not know how to read.

The craft fix is not to remove the aspect list. It is to ensure the reason and guidance are rich enough that the aspect list feels like supporting detail rather than the main event. When the guidance paragraph exists and is relationship-native, and when the reason string names the specific dimension of the relationship being activated, the aspect list below becomes something to verify rather than something to interpret. The user reads the banner and understands the moment. The aspect list is there for those who want to go deeper.

This is why the guidance sentences must be written with care. They are not metadata. They are what the couple advance tab is for.

---

## The Specific Craft Standard for Sprint 0020

Sprint 0019 established the right quality bar for individual advance guidance: house-aware, actionable, addressed to a specific person's life situation.

Sprint 0020 must establish the equivalent quality bar for couple advance guidance: relationship-aware, actionable, addressed to two people's shared situation.

The test is simple. Take any guidance sentence that will appear in the couple advance banner. Read it aloud to two people who are in the relationship it describes. Ask: does this feel written for us, or does it feel written for some generic couple?

The `ASPECT_GUIDANCE` table's individual sentences would not pass this test for couple advance. *"Face the pattern directly rather than managing around it"* is good individual guidance for a Saturn challenging transit. For two people, the guidance needs to say something about how to face the pattern together, or how the pattern typically surfaces between two people in a relationship, or what the specific risk is when two people both receive Saturn pressure on their shared emotional foundation.

This is a small number of guidance sentences. The couple advance has three builders, covering power, aspect, and shift. Each builder needs two or three guidance cases. Twelve sentences total, written with the same care as the house-specific entries in `ASPECT_HOUSE_CONTEXT`.

If those twelve sentences are written well, the couple advance feature becomes something a person tells their partner about. Not because it is technically impressive, but because it said something true about them.

---

*Analysis prepared from the lens of craft, care, and the specific obligation of a product that handles the emotional texture of people's lives together.*
