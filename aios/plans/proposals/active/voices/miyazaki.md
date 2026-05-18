# Hayao Miyazaki: Sprint 0022 — The Sky Should Feel Like Someone Noticed

---

## What I See When I Open This Product

There is a kind of film I have made many times. A young person arrives in a world they do not understand. The world is vast and detailed — the sky, the forest, the bathhouse — and the young person must find their place in it. What makes those films work is not the vastness. It is the small things. A single flower bending in the wind. A hand held out at precisely the right moment. A meal eaten in silence that says everything about who these people are.

I open this application and I see the vastness. The engine is real. The advance scorer knows things about the sky that most astrological software never attempts. The synastry axis augmentation, the SR advance preview, the combination weight — these are genuine achievements. The engineers have been building a real world.

But I sit with it as an ordinary person, not an engineer. And I notice the small things that are missing. Not features. Not scoring functions. Small human gestures. The difference between a world that is inhabited and a world that is merely constructed.

Let me tell you what I see.

---

## The Today Page: A Beautiful Room with No Fire in the Hearth

The Today page is the most-visited surface in this product. A person opens it every morning. It is the first thing they see.

I look at it and I see: a date. A personal day number. A moon emoji. Three transit rows. Five dots of energy. A GPT paragraph.

Each of these is correct. None of them are wrong. But they do not speak to each other. The Personal Day card does not know about the Moon card. The Moon card does not know what the transit rows say. The GPT paragraph does not know what the advance engine has already concluded. They are displayed in sequence, like ingredients on a countertop, waiting for someone to cook.

The sprint vision already identifies this: the `getTodayPageInterpretation` function sends the Big Three, the moon phase, and the top transit aspects, but not the personal day archetype, not the void-of-course status as a named signal, not the natal moon phase, not the advance category when the session cache is warm. The prompt is sending the ingredients but not asking for the recipe.

But I want to name something beneath the architecture. When I open this page, no one seems to know I have arrived. The date header says "Today" and a date, in small gold letters, slightly muted. Then immediately: "Personal Day." A number. An archetype. A sentence.

There is no breath. No acknowledgment that today is specific. That I am here.

In my films, the moment a character arrives somewhere new, the place responds. Totoro turns his head. The soot sprites scatter. The bathhouse lights come on. The world registers that a person has entered it.

The Today page could do this with almost nothing. The advance banner from sprint-0021 is there — but only when the session cache is warm. A user who opens the app fresh on the most significant day of their month sees nothing of it unless they have first visited the Advance tab. The page is waiting for the user to do work before it will show them what it already knows. This is backwards. The product should do the work. The user should arrive and find the fire already lit.

**What the Today page needs is not more data — it needs integration. The GPT prompt must weave the personal day archetype, the void-of-course status, the advance category, and the natal moon phase into a single synthesis. One call that actually knows who this person is today, not a list of facts about the sky in general.**

The sprint vision describes this precisely: "a prompt that integrates all three systems — 'today is Personal Day 7 (The Seeker), Moon is waxing in Scorpio (void of course), Saturn pressing on natal Venus in the 7th house'" — would produce a qualitatively different brief. This is the right target. I am seconding it with the emphasis that the difference is not technical. It is the difference between a room where someone knows you are coming and a room that is simply furnished.

---

## The Transit Timeline: A Calendar That Doesn't Know You

Open the Transit Timeline. You see a vertical list of days with event cards. Some days have a gold badge. You click on an aspect-perfection card — "Saturn square natal Moon" — and it expands. The expanded text reads: "Emotional stress, internal conflict."

I have read this sentence. It tells me nothing about my life. It is the sentence that appears for every person whose Saturn squares their Moon, in every house, in every chart, in every decade of their life. It is the kind of sentence that could be printed in a newspaper under a generic horoscope column. It treats me as a category, not a person.

Three tabs away, in the Reading tab, the same event produces something different. The transit aspect row for Saturn square natal Moon expands to say: "Saturn pressing on your Moon in your 4th house (home and family) — the structures you have built around domestic stability are being examined." That sentence is about me. It knows where my Moon lives. It knows what the 4th house means. It names a specific area of my life.

These are the same event. The same person. The same sky. But the Timeline card speaks to everyone, and the Reading tab speaks to me.

The sprint vision identifies this gap and describes the fix: for aspect-perfection events, call `computeTransitAspectBrief` with the `natalHouse` that `TimelineEvent` already carries. The function exists. The data is there. The `EventCard` component in `TransitTimeline.tsx` reads `detailText` from `getPersonalizedEventBrief` — a function that returns the generic `ASPECT_BRIEFS` table entries, keyed by aspect type and natal planet, with no house awareness.

This is a craft failure. Not a technical failure. The information was available and was not used. The carpenter had the right wood and chose something cheaper.

The fix is clear and the sprint vision spells it out: route Timeline aspect-perfection `detailText` through `computeTransitAspectBrief`. The `TimelineEvent` already carries `natalHouse`, `planet` (the transit planet), `secondPlanet` (the natal planet), and `aspectType`. One substitution in `EventCard`'s `detailText` derivation block makes the Timeline speak to the person instead of the category. The generic `getPersonalizedEventBrief` path remains as fallback when the house is unknown. Ingress and station briefs remain on their existing functions — they have no parallel in `transitAspectBriefs.ts`.

---

## The Synastry Aspect Rows: Two Stories That Don't Know Each Other

The Synastry page has aspect rows that expand. The expanded brief from `computeSynastryAspectBrief` describes what the aspect means — what Venus trine Mars signifies when two people's charts share it. This is good work.

But the Synastry page also has house overlay sections — "Person 1's Planets in Person 2's Houses" — where the overlay briefs do something more personal: "Your Venus in their 5th house — the love you bring lands in the space they hold for pleasure and creative joy." This is the voice I want everywhere.

When I expand a Venus-Mars trine aspect row, I am told what Venus-Mars trines mean in general. I am not told that the Venus in question sits in this person's 5th house, activating their pleasure axis. The aspect row and the house overlay section are two separate stories about the same planets, and they never introduce themselves to each other.

The sprint vision identifies the fix: when an aspect row expands, check whether the involved planets have a meaningful house overlay placement (houses 1, 5, 7, 8 — the relationship-relevant houses, already defined in `HIGH_SIGNAL_HOUSES` in `SynastryPage.tsx`). If they do, append a single line: "This aspect also activates [person]'s [Nth] house — [theme name]." Not every aspect. Not every house. Only when it matters.

This is what the sprint vision calls "selective, not mechanical" — and I think this framing is right. In my films, I never put music under every moment. The silences matter as much as the melody. A house note that appears on one out of every four expanded rows says: this one is special. Look here. A house note that appears on every row says: I have no sense of proportion.

The `synastryData.houseOverlay` data is already computed and available in the `SynastryPage` closure. The `SynastryAspectsSection` component would need the overlay data threaded in as an additional prop. The implementation is modest; the gain is that the two richest interpretive layers of the Synastry page — aspects and house overlays — finally acknowledge each other.

---

## The Natal Chart Reading: A Long Silence at the Beginning

I want to name something the sprint vision does not address for sprint-0022, because it has been there since the beginning.

The `ResultsPage.tsx` — the natal birth chart — shows: a header ("Your Birth Chart"), a chart wheel, the Big Three, then a long sequence of collapsible sections — Planets, Asteroids, Aspects, Balance, Planetary Strength, Retrogrades, Houses — then a planet positions table, then an aspects table, then two buttons.

Nowhere on this page does the user see a sentence that speaks to them as a whole person before the sections divide them into parts. The page moves immediately from the chart wheel — which is beautiful — to a structural breakdown. The user sees their Sun in Libra, their Moon in Scorpio, their Rising in Gemini, displayed as rows in a table, before anyone has said: this is what these three things together say about you.

The `ReadingSummary` component shows the Big Three and dominant element and modality. These are facts. They are not synthesis.

A natal chart deserves a two-sentence character portrait — not a description of placements, but an integration. Something warm: "A Libra Sun with a Scorpio Moon and Gemini Rising means you seek balance and connection at the surface while carrying emotional depths that surprise even you — your mind moves faster than your feelings, and sometimes the people who love you have to catch up." That sentence is not in the product. It should be, in a small GPT call or a static synthesis rule keyed to the Big Three combination.

I offer this for the backlog. The sprint vision explicitly says `ResultsPage.tsx` does not receive structural attention in sprint-0022. I note the gap because it is the most visited reading in the product after Today — and its most important page has no voice.

---

## Small Gestures That Would Make the User Feel Cared For

There are three small things I noticed that are not proposals — they are questions the product should ask itself.

**The "← Back" button on the Today page.** It is the first interactive element visible when the user opens `TodayPage.tsx`. It dispatches `{ type: 'SET_VIEW', view: 'form' }`. A user who taps "Back" from the Today page expecting the Home screen may encounter the birth data form instead, depending on how the `form` view is resolved when chart data is already present in state. This deserves investigation. When I am reading today's sky and I want to go home, I expect the home screen.

**The GptSkeleton label text.** When the Today page GPT is loading, the label reads: "Reading today's sky for you..." — personal, warm, specific. On the Transit Reading page, the label reads: "Consulting the stars..." — the language of an automated service, not a presence. The skeleton label is what the user reads for ten seconds while GPT loads. It should be the warmest sentence on the page, and it should know which reading it is loading for. "Listening to today's sky for your chart..." for a daily reading. "Tracing this month's movements across your chart..." for a monthly reading. The `PERIOD_DESCRIPTIONS` map already has period-specific language; the skeleton label should match it.

**The FormWizard.** The form for entering birth data asks for name, date, time, and place. It is clean, correct, functional. But it has no sense of occasion. When someone enters their birth data for the first time, they are doing something they have never done in this app before. One sentence below the heading — "The sky at the moment of your birth has been waiting." — would not slow the form or add friction. It would make the user feel that the app understands this moment matters.

---

## Proposed Improvements for Sprint 0022

Six proposals, distributed across the three types, weighted toward the reading surfaces the sprint vision identifies as the priority.

---

### Feature: Today Page — Integrated GPT Synthesis Prompt

**Type:** Feature
**Files:** `src/services/gptInterpretation.ts` (`getTodayPageInterpretation`), `src/components/reading/TodayPage.tsx`

The `getTodayPageInterpretation` call in `TodayPage.tsx` sends: moon phase/sign, top transit aspects, personal day number, personal day archetype. It does not send: void-of-course status as a named signal, the advance category and reason (when session cache is warm), or the natal moon phase name (derivable from `chartData.planets` Sun and Moon longitudes already available in the component).

Enrich the payload to include all of these. Revise the prompt instruction to explicitly ask the model to weave the systems together into a single synthesis — not to list them separately, but to find the sentence that names what today means when the numerology, the lunar quality, the transit pressure, and the advance category are read together.

The call signature of `getTodayPageInterpretation` expands from four arguments to include optional `advanceCategory`, `advanceReason`, and `natalMoonPhase`. `TodayPage.tsx` already reads the session cache for the advance signal at mount time; pass the non-neutral result into the GPT call. The natal moon phase is computable from `chartData` without an additional engine call.

No new GPT type. No new API endpoint. Prompt content enrichment only.

---

### Feature: Transit Timeline — House-Aware Expanded Briefs

**Type:** Feature
**Files:** `src/components/reading/TransitTimeline.tsx`

In `EventCard`, the `detailText` for aspect-perfection events is derived from `getPersonalizedEventBrief(event.aspectType, event.secondPlanet, event.natalHouse ?? null)`. This function returns generic keyword phrases from `ASPECT_BRIEFS`, ignoring the house.

Replace this call with `computeTransitAspectBrief`, passing:
- `event.planet as PlanetName` (transit planet)
- `event.aspectType`
- `event.secondPlanet as PlanetName` (natal planet)
- `event.natalHouse ?? null`
- `event.aspectNature`
- `true` (aspect-perfection events are at maximum applying)

When `natalHouse` is null or `event.planet` has no entry in `TRANSIT_PLANET_PHRASES`, `computeTransitAspectBrief` already falls through to `getAspectPerfectionBrief` as a fallback — the same result as the current code. Ingress and station detailText derivation is unchanged.

Import `computeTransitAspectBrief` from `../../data/interpretations/transitAspectBriefs` in `TransitTimeline.tsx`.

---

### Feature: Synastry Aspect Rows — House Overlay Note on Expand

**Type:** Feature
**File:** `src/components/results/SynastryPage.tsx`

When a synastry aspect row expands, optionally append a house note if either of the involved planets has an overlay in a high-signal house (1, 5, 7, 8 — already defined as `HIGH_SIGNAL_HOUSES` in the file).

Thread `synastryData.houseOverlay` into `SynastryAspectsSection` as an optional additional prop. In the `AspectRow` render loop, after computing `computeSynastryAspectBrief`, derive a `houseNote` string:

1. Check `houseOverlay.person1InPerson2Houses` for an entry where `entry.planet === a.person1Planet` and `HIGH_SIGNAL_HOUSES.includes(entry.house)` and `INNER_PLANETS.includes(entry.planet)`.
2. If found, construct: `"${label1}'s ${entry.planet} falls in ${label2}'s ${ordinal(entry.house)} house — ${getHouseTheme(entry.house).name}."`
3. Check `person2InPerson1Houses` symmetrically.
4. Use at most one note per expanded row. If both directions qualify, prefer the one with the lower-numbered house (closer to the angular houses).

Pass `houseNote` into `AspectRow` as an optional `expansionNote` prop, rendered as a quieter italic line below the existing brief — visually subordinate, not competing.

Apply only when `INNER_PLANETS.includes(planet)` and house is in `HIGH_SIGNAL_HOUSES`. Not every aspect. Not every house.

---

### Issue Fix: Today Page — Back Button Navigation

**Type:** Issue Fix
**File:** `src/components/reading/TodayPage.tsx`

The "← Back" button dispatches `{ type: 'SET_VIEW', view: 'form' }`. When chart data is already present in app state, the `form` view renders as the home screen or as the birth data form, depending on how the app resolves that view state.

Investigate `src/context/appState.ts` to confirm the correct view key for "return to home when chart data is present." If a `home` view state exists, change the dispatch to `{ type: 'SET_VIEW', view: 'home' }`. If the app uses `form` as the home state conditionally on chart data presence, add a guard in the back handler: `dispatch({ type: 'SET_VIEW', view: chartData ? 'home' : 'form' })`.

The user expectation when pressing Back from the Today reading is the Home screen. The button should deliver it.

---

### Issue Fix: Transit Reading GPT Skeleton — Warmth Parity

**Type:** Issue Fix
**File:** `src/components/results/TransitReadingPage.tsx`

The loading label on the transit reading GPT skeleton reads: `"Consulting the stars..."` — the most impersonal of the skeleton labels in the product. The synastry page uses `"Reading your celestial bond..."` (warm). The Today page uses `"Reading today's sky for you..."` (personal).

Replace the static label with period-specific copy, derived from `transitPeriod`:

- `daily`: `"Listening to today's sky for your chart..."`
- `weekly`: `"Reading this week's currents for your birth pattern..."`
- `monthly`: `"Tracing this month's movements across your natal chart..."`

The skeleton is rendered at the point where `transitInterpretation === null || retrying`. The `transitPeriod` prop is available in the component at that point. A one-line ternary or record lookup replaces the static string.

This label is read for ten seconds on every transit reading load. Ten seconds is long enough for the warmth of the language to matter.

---

### Code Enhancement: Transit Interpretation Path Consolidation

**Type:** Code Enhancement
**Files:** `src/data/interpretations/transitEvents.ts`, `src/data/interpretations/transitAspectBriefs.ts`

After the Timeline Feature above routes aspect-perfection `detailText` through `computeTransitAspectBrief`, the aspect-perfection branch of `getPersonalizedEventBrief` becomes dead code. It contains the `ASPECT_BRIEFS` lookup table and the planet-keyed fallback entries — all of which are now superseded by `computeTransitAspectBrief`'s own fallback to `getAspectPerfectionBrief`.

Remove the aspect-perfection interpretation logic from `getPersonalizedEventBrief`. Retain in `transitEvents.ts`:
- `getIngressBrief` (planet + sign ingress language — no parallel in `transitAspectBriefs.ts`)
- `getStationBrief` (retrograde/direct station language — no parallel)
- `EVENT_TYPE_INFO` (used by `TransitTimeline.tsx` for event type icons and labels)
- `getAspectPerfectionBrief` (used as fallback inside `computeTransitAspectBrief`)

The `ASPECT_BRIEFS` record at the top of `transitEvents.ts` — the keyword-level table — may be removed or deprecated if it is no longer referenced after the above. Confirm with a grep for all call sites before deleting.

This reduces the maintenance surface: there is one canonical path for transit-to-natal aspect interpretation (`computeTransitAspectBrief`), and `transitEvents.ts` holds only the interpretation types that have no other home.

---

## What I Am Really Asking For

I have listed six proposals. But behind all of them is one question.

When a person opens this application in the morning — uncertain, curious, maybe a little anxious about the week ahead — does the product feel like it was made by someone who cared about that moment? Or does it feel like a collection of correctly assembled parts?

The parts are good. The engine is real. The charts are beautiful in the right light. But craft is not about having the right parts. Craft is about the fire in the hearth. The meal that is already on the table. The world that knows you have arrived.

The Today page should feel like someone read the sky for you before you woke up. The Transit Timeline expanded card should speak to your specific life, not to the general category of people whose Saturn squares their Moon. The synastry aspect row should notice when the connection it is describing also lives in the house where your partner holds their sense of joy.

These are not hard changes. They are the changes that turn a correct product into a caring one.

That is the difference I am asking for.

---

*Analysis prepared through the lens of craft, care, and the obligation of a product that handles the emotional texture of people's daily lives.*
