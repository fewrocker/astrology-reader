# Sprint 0022 — Vision

## Sprint Focus

Sprint 0022 turns attention away from the advance engine — which has been the center of gravity for sprints 0018–0021 — and back to the reading surfaces themselves. The work is: deepen the interpretive quality and visual coherence of the product's most-visited pages (Today, natal ResultsPage, TransitReadingPage), close loose ends in the Timeline and Synastry surfaces that shipped feature-complete but thin, and find one or two structural code quality improvements that reduce fragility without changing behavior.

---

## Why Now

The advance engine is now mature: scoring, combination weighting, couple parity, category diversity, LRU caching, synastry axis augmentation, SR advance preview, and session-cache signal propagation to the Home screen and Today page are all done. The last two sprints were dominated by fixing advance-engine divergence between individual and couple paths — legitimate work, but it created an implicit debt: the reading surfaces the user actually reads every day (Today, natal chart, transit reading) have not received substantive interpretive or visual attention since sprints 0010–0015. The guidelines say "make the app more round, reliable, insightful, and beautiful" — which now clearly points at the reading layer rather than the scoring engine.

Three specific gaps are evident after reading the code:

1. **The Today page (`TodayPage.tsx`) is interpretively thin.** It shows a moon phase pill, an energy rating, three transit aspects via `AspectRow`, and a 2–3 sentence GPT brief. The advance banner from sprint-0021 is there only when the advance cache is warm. There is no personal synthesis — nothing that tells the user what today's astrology *means* when the natal chart, numerology personal day, moon phase, and transit aspects are read together. The data is all present; the interpretive layer is absent.

2. **The Transit Timeline (`TransitTimeline.tsx` + `transitEvents.ts`) launched with brief text from generic lookup tables** (`ASPECT_BRIEFS`, `getIngressBrief`, `getStationBrief`). These briefs are not house-aware and are one-line phrases rather than sentences. The transit aspect rows on the main reading tab use the richer `computeTransitAspectBrief` with natal house context, applied/separating language, and planet archetype phrasing — the Timeline does not. The Timeline expanded card shows `detailText` from the lookup table, but this text is the same for every user regardless of their natal chart. That asymmetry between the Reading tab (personalized) and the Timeline tab (generic) is a quality gap.

3. **The Synastry page (`SynastryPage.tsx`) cross-aspect rows expand but do not show house-overlay context.** The synastry house overlay briefs exist in `synastryHouseOverlayBriefs.ts` and are shown in their own section — but the aspect rows themselves, when expanded, show only the brief from `synastryAspectBriefs.ts` with no reference to which house overlay activates that same energy. A Venus-Mars trine in the 5th house overlay is a different story from the same aspect in the 8th house overlay. The data is there; the connection to the row display is not made.

---

## Where to Look

### 1. Today page — interpretive synthesis layer

**Files:** `src/components/reading/TodayPage.tsx`, `src/services/gptInterpretation.ts`

The Today page calls `getTodayPageInterpretation` which sends a basic prompt. The prompt includes Sun, Moon, Ascendant, and transit aspects. It does not include: the numerology personal day number and its archetype, the natal moon phase, the advance category (even when warm). A richer prompt that integrates all three systems — "today is Personal Day 7 (The Seeker), Moon is waxing in Scorpio (void of course), Saturn pressing on natal Venus in the 7th house (advance: challenging period)" — would produce a qualitatively different, more useful GPT brief.

Additionally: the static data layer before the GPT brief is spare. A "Today's Sky" summary block showing the top 2–3 transit aspects with their `computeTransitAspectBrief` sentence (the same enriched format already used in the transit reading tab's `AspectRow`) would give the user something to read while GPT loads, and make the page feel substantive even without AI.

### 2. Transit Timeline — house-aware event briefs

**Files:** `src/components/reading/TransitTimeline.tsx`, `src/data/interpretations/transitEvents.ts`, `src/engine/transitTimeline.ts`

The `TimelineEvent` interface already carries `natalHouse` (populated for aspect-perfection events when birth time is known) and `natalSign`. The `getPersonalizedEventBrief` function in `transitEvents.ts` accepts `natalHouse` but the briefs it returns are still generic one-liners keyed by aspect type and natal planet — not house-aware sentences.

The gap: `computeTransitAspectBrief` in `transitAspectBriefs.ts` already produces house-aware, applying/separating-aware sentences that name the house theme (e.g., "Saturn pressing on your Moon in your 7th house (partnership)..."). The Timeline's `detailText` should call the same function for aspect-perfection events, passing `event.aspectType`, the transit planet (stored in `event.planet`), the natal planet (`event.secondPlanet`), and `event.natalHouse`. This makes the Timeline and Reading tab interpretively consistent for the same event.

### 3. Synastry aspect row expansion — house overlay connection

**File:** `src/components/results/SynastryPage.tsx`, `src/data/interpretations/synastryAspectBriefs.ts`, `src/data/interpretations/synastryHouseOverlayBriefs.ts`

When a synastry aspect row is expanded, it shows the `computeSynastryAspectBrief` text. It does not currently cross-reference the house overlay: "Partner's Venus is in your 5th house — this aspect activates your pleasure and creativity axis." The house overlay data is already computed in `synastryData.houseOverlays` and displayed in the House Overlays section. The aspect row should optionally surface a one-line note when the aspect involves a planet that also sits in a meaningful house overlay (1, 5, 7, 8 — relationship-relevant houses).

### 4. Code quality — interpretive data consistency

**Files:** `src/data/interpretations/transitEvents.ts`, `src/data/interpretations/transitAspectBriefs.ts`

The Transit Timeline's interpretation function (`getPersonalizedEventBrief`) and the transit aspect brief function (`computeTransitAspectBrief`) serve the same purpose — describing a transit planet touching a natal planet — but are maintained as two separate systems with different depth. There is a consolidation opportunity: rather than replacing one with the other, route Timeline aspect-perfection events through `computeTransitAspectBrief` (which already handles the same inputs) so there is one canonical interpretation path for transit-to-natal contact events, with `transitEvents.ts` retaining only ingress and station briefs (which have no parallel in transitAspectBriefs).

---

## Quality Bar

"Deep, not shallow" for sprint 0022 means:

- **The Today page GPT brief must integrate all available signals.** A prompt that mentions only the Big Three and transit aspects is insufficient when the personal day number, natal moon phase, void-of-course status, and advance category are all computable. The enriched prompt should produce a brief that explicitly weaves these systems together — not a generic daily horoscope.
- **The Timeline's expanded event cards must read like the transit Reading tab, not like a keyword dictionary.** "Saturn square natal Moon — emotional stress, internal conflict" is the old quality bar. "Saturn pressing on your Moon in your 4th house (home and family) — structures you've built around domestic stability are being examined" is the new one. The same information must appear in the same quality in both tabs.
- **Synastry house overlay connection must be selective, not mechanical.** Not every aspect needs a house note. Prioritize the five relationship-relevant houses (1, 5, 7, 8, and optionally 4) and only planets with meaningful placements there. An aspect row that fires a house note for every combination becomes noise.
- **No new dependencies or new data files.** All three improvements reuse existing interpretation data that already lives in the codebase. No new GPT prompt types should be introduced; the Today page enrichment is prompt content, not a new API endpoint.

---

## What This Sprint Is NOT

- Not advance engine work. The scoring engine, couple parity, category diversity, density cap, synastry axis augmentation, and LRU caching are complete. No changes to `AdvanceTab.tsx`, `CoupleAdvanceTab.tsx`, or the `runAdvancePreCalculation` abstraction.
- Not Solar Return page work. The SR advance preview, SR house briefs (angular planets), and SR bi-wheel shipped in 0020–0021. SR is done for now.
- Not new product pages, features, or navigation. No new tabs, routes, or modals.
- Not numerology page work. The numerology reading, astro cross-reading, chat, personal year/month/day, and sky chart are stable. This sprint does not touch `NumerologyPage.tsx`.
- Not authentication, subscription, or analytics changes.
- Not a full redesign of the Today page. The advance banner, energy rating, moon pill, and personal day archetype remain exactly as they are. The sprint adds interpretive depth to the GPT prompt and adds a static aspect summary — it does not restructure the page layout.
- Not a rewrite of the Synastry compatibility scoring or the dimension axes. The DimensionAxis bars and the GPT interpretation layer remain unchanged; only the aspect row expansion panel gains a house note where relevant.
