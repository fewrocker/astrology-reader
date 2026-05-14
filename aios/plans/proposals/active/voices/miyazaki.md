# Hayao Miyazaki — Voice Analysis: Sprint-0011 Depth

---

I have walked through this product slowly. Not as someone hunting for features, but as someone who wanted to feel received.

Sprint 0010 did real work. The transit aspect rows now speak. The timeline event cards know which house is activated. The key aspect pill says something a human being can carry into their morning. The advance tab signals which dates are not like the others. These are not small things. They represent the difference between a machine that outputs and a machine that communicates.

But I have been here before — in the editing room, when the rough animation passes are done and someone says the scene is finished. It is not finished. The hand has moved but the weight is not there. The mouth has opened but you cannot feel the breath. The data is displayed but the person reading it does not feel known.

Sprint 0011 inherits specific unfinished rooms. I have walked them. I will tell you what I found.

---

## The Synastry Aspect List: Where Intimacy Arrives and Is Turned Away

A person who enters their partner's birth date is doing something that requires trust. They are saying: here is someone who matters to me. Tell me something true.

The synastry aspects section answers them with this:

`P1 Venus △ P2 Moon · 1.8° orb · harmonious`

That is a mathematical description of a fact that the user already submitted. They gave you Venus. They gave you Moon. They gave you both birth dates. The calculation found the trine. And now the product hands it back as proof that the calculation ran.

The interpretation database in `aspectInterpretations.ts` has `Moon_Trine_Venus`: "Naturally loving and graceful — your emotions and love nature flow together beautifully." This is written in natal voice — it speaks to one person's internal architecture. It does not speak to two people in relation. And this is the actual problem.

"Naturally loving and graceful" describes a placement. What the synastry page needs is something that describes a *meeting*: what happens when Person 1's Venus reaches across the chart and touches Person 2's Moon. That is a different kind of sentence. Not "your love nature is graceful" but "your affection lands naturally on them — they feel it without needing it explained."

The natal database is the wrong shelf. Sprint 0011 should write the right one: a thin, relational synastry brief table covering the 30–40 highest-frequency cross-chart pairs. Not 120 entries. Not a rewrite of anything. Just the relational phrasing for what it feels like when one person's planet touches another person's planet. Venus trine Moon in synastry is not the same emotional fact as Venus trine Moon in a natal chart. The product knows the difference. It should say the difference.

Then the `SynastryAspectsSection` renders these briefs with the same expand/collapse pattern that `AspectRow` already implements. The pattern exists. The component exists. The interpretation data is the only missing piece — and it is narrow.

---

## The House Overlay Section: The Most Resonant Fact Delivered Without a Voice

"Your Venus falls in their 7th house."

I do not know if the people building this product understand what that sentence means to someone who has been practicing astrology for fifteen years. It is one of the most emotionally charged facts in synastry. The 7th house is where we project partnership. When someone's Venus falls there, it means the person they are reading about is seen — truly seen — as a partner. It means their presence activates something the native has been reaching toward.

And the product lists it in a table. `Venus | Taurus | House 7`. No sentence. No warmth. No signal that this is different from `Chiron | Sagittarius | House 11`.

`houseThemes.ts` has everything needed. House 7: "partnership, what you seek in a committed other." The planet archetype is known. The combination is writable in one sentence: "Your Venus falling in their 7th house — the house of partnership — suggests they instinctively see you as someone they could build something lasting with."

That sentence is twelve words of template logic and one lookup. The data is assembled. The user is already on the page. The product simply does not speak.

`HouseOverlaySection` currently renders a table with columns for planet, sign, and house number. The sprint 0011 task is to replace the bare house number with a house name and add one sentence of interpretation beneath each row. The `HOUSE_THEMES` array and `PLANET_IN_HOUSE` table together provide all the ingredients. No GPT call. No new engine. One sentence per row, generated from two existing data sources.

---

## The Couple Transit Page: An Unfinished Room

When I open `SynastryTransitPage.tsx` and look at the `TransitAspectsToComposite` section, I see the transit reading page from six months before sprint 0010. Bare rows. Glyph, aspect symbol, glyph, orb, applying badge. No expand/collapse. No brief. Silence.

The `AspectRow` component was built precisely to solve this problem. It exists at `src/components/reading/AspectRow.tsx`. It is not used here.

The brief for a composite transit aspect is different from a natal transit brief in one specific way: the "natal planet" is a composite planet, and the house it occupies tells you which area of *the relationship* is being activated — not which area of an individual's life. Saturn transiting the composite 2nd house is not about personal finances. It is about the shared resources of the relationship — how they budget together, what they value collectively, where their finances as a couple require attention.

The `TransitAspect` objects in `synastryTransitData.transitAspects` already carry `natalHouse` (this was embedded in sprint 0010 for all transit aspect calculations). The house number is there. The house theme is retrievable from `getHouseTheme()`. The brief can be written from the same template logic as `computeTransitAspectBrief()`, but with relational framing: "Saturn pressing on your relationship's 2nd house asks how you navigate shared resources — money, time, what you build together."

This is not new logic. It is the same pattern, applied to a surface that was left with no pattern at all.

---

## The Solar Return Page: The Year Ahead, Rendered Without an Entry Point

The Solar Return page shows a GPT reading and a planet positions table. The GPT reading is thorough — it was improved in sprint 0010 to lead with the tightest applying aspect. But GPT takes time to load. And while it loads, the page shows a skeleton.

The most important static facts on the Solar Return page are the SR Sun house and the SR Moon house. These are not deep astrology. They are direct answers to the two questions every person brings to a Solar Return: What will this year focus on? What will it feel like?

`PLANET_IN_HOUSE` already has `Sun_H1` through `Sun_H12` and `Moon_H1` through `Moon_H12`. These entries are written for natal voice, which is not ideal — "your Sun in the 5th house makes creative self-expression central to who you are" describes a birth chart, not a year-ahead forecast. But they are close enough to be meaningful if introduced correctly: "This year, your Sun falls in House 5 — expect themes of creative expression, pleasure, and the joy of being fully seen."

Sprint 0011's task here is not to rewrite `PLANET_IN_HOUSE`. It is to pull the SR Sun and SR Moon house readings from the existing table and render them as a static brief block — labeled "This Year's Focus" and "Emotional Climate" — that appears immediately, before GPT loads, and stays visible alongside the GPT reading once it arrives.

The `SolarReturnPage` already computes `srSun` and `srMoon` with their house values. The lookups are two lines. The rendering is a styled block already consistent with the amber design language of the SR page. The user who opens the Solar Return page and sees their SR Sun in House 9 with the brief "A year of expansion, travel, and seeking meaning" already has something to hold onto before the GPT paragraph arrives. The app has answered their question before they had to wait.

---

## The TodayPage Sky Highlights: Glyphs Without Translation

The "Sky Highlights" card on `TodayPage` shows three transit aspects as glyph-pairs with a one-word keyword to the right:

```
♄ □ ☿      disruption
♃ △ ♀      abundance
☽ ☌ ♂      intensity
```

The keywords come from `ASPECT_KEYWORDS` — a lookup by transit planet and aspect nature. "Disruption" for Saturn square. "Abundance" for Jupiter trine. "Intensity" for Moon conjunct Mars.

These are not wrong. They are true. But they are true for everyone. "Disruption" is what Saturn square means for any person, in any chart, on any day. The natal planet — Mercury, Venus, Mars — is visible in the row. Its house is available. `chartData` is on the page.

The `AspectRow` component was built to handle exactly this: expand on tap, reveal a brief that names the natal planet's house and what the transit means for that life area. The "Sky Highlights" rows are the home screen's version of the transit aspect rows, and they should behave the same way.

A user who taps `♄ □ ☿` on their Today page and sees "Saturn pressing on your 3rd-house Mercury — deliberate with your words this week, not impulsive" has been given something. They have been named. The product has looked at their chart, not at a dictionary.

The `getTopActiveTransits()` result already carries `natalHouse` (embedded in sprint 0010). The brief function already exists in `transitAspectBriefs.ts`. Wiring the `AspectRow` component into the Sky Highlights card is the last step the Today page needs to complete the pattern sprint 0010 established everywhere else.

---

## The Synastry GPT Prompt: Almost Arrived, But Missing the House Names

`buildSynastryPrompt` was improved in sprint 0010. It now leads with the tightest aspect, instructs GPT to name houses, and includes the anti-generic constraint. The improvement was real.

But the element profiles are absent. `buildTransitPrompt` gained `analyzeElements` output in sprint 0010 — a block that tells GPT whether this person is Fire-dominant, Air-deficient, etc. This gives the model context for *how* they experience the aspects, not just what the aspects are. `buildSynastryPrompt` sends two complete charts to GPT but no element profile for either person.

A Fire-dominant person whose Venus is square an Earth-dominant partner's Moon experiences that square differently than two Water-dominant people in the same configuration. The elements do not change the aspect's nature. They change its *felt texture*. GPT, given the element profile, can write to that texture. Without it, it writes to the geometry.

The fix is two lines: call `analyzeElements` for both charts and prepend the profiles as a brief block before the natal positions. Sprint 0010 showed exactly where to add this in `buildTransitPrompt`. The same addition in `buildSynastryPrompt` completes the symmetry.

---

## What Feels Mechanical When It Should Feel Human

**The synastry aspects table is the coldest surface in the product.** Two people submit their charts, wait for the calculation, and receive a list that looks like a trade ledger. The product has done the most intimate computation available to it — the relationship between two specific people's planets — and displays the result with no more warmth than a spreadsheet.

**The house overlay section is the most emotionally resonant data on the page, delivered as a column header.** "House 7" is a number. "The house of partnership — the place in their chart that represents who they seek to commit to" is a fact that means something to a person sitting with questions about a relationship.

**The Solar Return page asks users to wait before they receive anything.** GPT loads. The skeleton pulses. The user knows their Sun's house — it is displayed in the `KeyPlacements` card — but they do not know what it *means* yet. The interpretation database can answer that question in the time it takes to render a component.

**The Couple Transit page looks the way the individual transit page looked before sprint 0010.** The pattern was established. The component was built. The surface was not updated to use it. This is not a design decision. It is an unfinished task.

**The Today page shows glyphs that a user cannot read.** The keyword to the right of the glyph-pair is the only translation offered, and it is the same translation offered to every person with that transit planet and aspect nature. The natal planet's house is in the data. The personalized brief is in the function. The gap is only the wire between them.

---

## Proposals

**Proposal 1 — Synastry Relational Briefs**

Write a new `SYNASTRY_ASPECT_BRIEFS` table covering the 30–40 highest-frequency cross-chart pairs: Sun, Moon, Venus, Mars, Mercury in combination with each other across the five major aspect types. These entries use relational voice — "what one person's planet feels like when it contacts the other person's planet" — rather than natal self-description. Roughly two sentences per entry. Extend `SynastryAspectsSection` to use `AspectRow` with these briefs. For planet pairs not in the table, fall back to aspect-type-plus-nature language: "[P1's planet] forms a [nature] [aspect type] with [P2's planet] — this contact tends to [brief phrase from aspect nature]." The fallback ensures no row is ever silent. The primary entries ensure the most common pairs are genuinely relational.

**Proposal 2 — House Overlay Interpretation Layer**

In `HouseOverlaySection`, replace the bare "House 7" cell with the house name from `HOUSE_THEMES`, and add a one-to-two sentence brief below each row. The brief combines the planet's archetype with the house theme: "Your Venus falling in their 7th house activates their sense of who they want beside them — you are, to them, a potential partner in the fullest sense." The `PLANET_IN_HOUSE` table provides the planet-house interpretation; the key is adapting the voice from self-description to relational description. Two sentences per entry. No new data structures required beyond the brief generation logic.

**Proposal 3 — Couple Transit AspectRow Integration**

Replace the bare rows in `TransitAspectsToComposite` with the shared `AspectRow` component. The brief for composite transits uses relational framing: name the composite planet's house and state what it governs for the relationship as a unit. The `natalHouse` field is already embedded on `TransitAspect` objects. The house theme table provides the domain. The brief function template from `computeTransitAspectBrief` provides the sentence pattern. The composite framing is the only adaptation needed: "Saturn pressing on your relationship's 2nd house asks how you navigate what you build together."

**Proposal 4 — Solar Return Static Brief Layer**

In `SolarReturnPage`, above the GPT skeleton (or alongside it once loaded), render a static "This Year's Focus" block showing two brief cards: SR Sun house and SR Moon house, drawn from `PLANET_IN_HOUSE`. Label them "Primary Focus" and "Emotional Climate." Adapt the natal phrasing to year-ahead framing with a brief prefix: "This year, [PLANET_IN_HOUSE brief]." These cards appear immediately on page load, before GPT arrives. They give the user something accurate and readable while the GPT paragraph assembles itself. They do not duplicate the GPT reading — they precede it, as the first clear sentence before the full paragraph.

**Proposal 5 — TodayPage Sky Highlights Expand/Collapse**

Replace the static glyph-keyword rows in the "Sky Highlights" card with `AspectRow` instances. The `natalHouse` is already on the `TransitAspect` objects returned by `getTopActiveTransits`. The brief is generated by `computeTransitAspectBrief`. The expand/collapse behavior is built into `AspectRow`. The user taps a row to see "Saturn pressing on your 3rd-house Mercury — be deliberate rather than reactive in conversations this week." The Today page then completes the pattern that exists on the Transit Reading page and in the timeline: every aspect row is expandable, and every expansion reveals something specific to this person's chart.

---

## What the Product Could Be

There is a version of the synastry page where a person reads through the aspect list and feels — row by row — that someone looked at these two charts together and understood what the geometry means between two human beings. Not for every person whose Venus trines a Moon. For these two people. This moment. This reading.

There is a version of the house overlay section where "your Jupiter falling in their 9th house" is not a table cell but a small revelation: someone who expands their world, who makes them want to travel and think bigger. The data knows this. The product simply has not chosen to say it.

There is a version of the Solar Return page where the user reads their SR Sun house and SR Moon house the moment the page loads — before GPT, before the skeleton pulses — because those two facts are the spine of the entire year and they can be stated in two sentences from data that loads instantly.

There is a version of the couple transit page that behaves exactly like the individual transit page: expandable rows, relational briefs, the same care that was given to individual readings extended to the readings couples make together.

There is a version of the Today page's Sky Highlights where tapping a glyph-pair reveals a sentence that names the house and the life area — where the shorthand `♄ □ ☿` becomes, on expansion, something a person can actually use on a Wednesday morning.

None of these versions require new screens, new engines, or new GPT calls. They require that the product extend the care it already learned to show in sprint 0010 — across the surfaces that sprint 0010 did not reach. The pattern is established. The components are built. The data is assembled. What remains is the decision to let these surfaces speak.

The hardest part of animation, the part I have returned to again and again, is making motion feel inhabited. A character who moves correctly is not the same as a character who moves *as if they mean it*. This product now moves correctly in most places. Sprint 0011 is about making it mean it.
