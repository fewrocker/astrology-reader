# Steve Jobs: Sprint 0021 — Finish the Sentence, Then Make It Sing

---

## Where We Are

Sprint 0020 shipped six things: the cache key fix, the banner bold-fragment fix, scoring parity (task-0003), the precompute abstraction, timeline advance coherence, couple guidance, synastry axis augmentation, and the Solar Return advance preview.

That is a serious sprint. I've used everything that shipped. Here is my honest read.

The Solar Return advance preview — "When This Year Intensifies" — is the right feature. It does what the Solar Return page needed: it gives the year a timeline. The overview strip, the Prev/Next navigation, the category banner with guidance — all of it is there. I navigated to a gold marker in month four of the preview, read the reason string, read the guidance. It worked. The product now answers "which months matter" for the year ahead.

The couple advance tab has guidance and the bold fragment. That gap is closed. The synastry axis augmentation adds real specificity — "resonates with the harmonious Venus-Mars axis between the two of you" is a sentence no other product in this category can produce.

But sprint-0020 left one piece of debt that is not cosmetic: the `baseIntensity` values in `CoupleAdvanceTab` at lines 555, 619, and 669 are still `Math.abs(rating.score - 3) / 2`. This is the pre-combination-weight formula. The synastry axis augmentation (task-0007) displaced the `computeCombinedWeight` gating that task-0003 installed — the merge conflict resolved in the wrong direction, and the intensity derivation reverted. The gate logic is correct: `computeCombinedWeight` is used for the threshold decision. But once the gate passes, the intensity that shapes the marker dot size and banner weight goes back to the old energy rating. A Saturn+Pluto cluster that passes the `computeCombinedWeight` gate then derives intensity from a formula that never knew about `COMBINATION_WEIGHT_NORMALIZE`. The dot appears at an arbitrary intensity. The banner's visual weight is wrong.

This is the thing that must ship first in sprint-0021. It is not a discussion.

---

## The Deferred Fix: What It Actually Means for the Experience

The intensity value controls how the marker dot is rendered — larger, brighter dots for higher-intensity markers — and it flows into the category banner's visual treatment. When the individual advance tab and the couple advance tab are shown the same sky, the dot sizes should be comparable. Right now they are not.

Here is the specific failure: a couple navigates to a month where Saturn is transiting both charts' angular positions simultaneously. The `computeCombinedWeight` gate fires correctly — the marker appears. But its intensity is `Math.abs(rating.score - 3) / 2` rather than `Math.min(1, combinedWeight / COMBINATION_WEIGHT_NORMALIZE)`. The `computeEnergyRating` score for that sky might be a 3.8, producing intensity 0.4. The `combinedWeight` might normalize to 0.85. The dot renders at 40% intensity when it should render at 85%.

That Saturn+Pluto month deserved the largest dot on the strip. It gets a medium one. The user's eye goes elsewhere. The most significant month of the year is undersold.

The fix is mechanical: import `COMBINATION_WEIGHT_NORMALIZE` into `CoupleAdvanceTab` (the sprint vision notes it is absent from imports), replace the three `baseIntensity` assignments with `Math.min(1, combinedWeight / COMBINATION_WEIGHT_NORMALIZE)`, remove the now-dead `computeEnergyRating` reference and `rating` variable from those priority blocks. This should take less than an hour and it makes the couple strip numerically trustworthy.

---

## The Solar Return Reading: What's Missing and Why It Matters

The Solar Return page now has three layers on the Reading tab: `SRStaticBriefs` (Sun and Moon house briefs), the GPT interpretation, and the advance preview at the bottom.

The `SRStaticBriefs` component is two cards — SR Sun in House N, SR Moon in House N — with a five-word brief from `PLANET_IN_HOUSE`. These are correct. They load before GPT. They are always present. They do exactly what the sprint-0019 proposal asked.

But now look at the page in full. You have:
1. The `KeyPlacements` grid — ASC, Sun, Moon, MC — as labeled tiles with sign and house numbers but no interpretation text
2. `SRStaticBriefs` — Sun and Moon briefs from `PLANET_IN_HOUSE`, muted amber style
3. The GPT reading — a full year-ahead paragraph
4. The advance preview — the 12-month strip at the bottom

Layer 1 tells the user *what*. Layer 2 begins to tell the user *what it means* for two placements. Layer 3 tells the user *the character of the year*. Layer 4 tells the user *when*.

What is missing is the middle of layer 2: the other planets. The SR chart places Mars, Jupiter, Saturn, Venus, and the rest in houses too. The angular houses — 1, 4, 7, 10 — are the load-bearing houses of any SR chart. SR Mars in the 10th is an entirely different year than SR Mars in the 4th. SR Jupiter in the 1st is an entirely different energy than SR Jupiter in the 8th.

Right now, a person reads "SR Sun in House 5 — This year: creative self-expression is your primary arena" and "SR Moon in House 11 — This year: emotional belonging within groups and communities." That is something. But then their SR chart has Jupiter in the 10th, Mars in the 1st, and Saturn in the 7th, and none of that appears anywhere in the reading until GPT mentions it — inconsistently, depending on what GPT decides to foreground.

The `PLANET_IN_HOUSE` database has all the entries. The SR chart planets have house numbers. The vision document identifies angular houses (1, 4, 7, 10) as the right filter — planets there carry the year's structural weight. The expansion the sprint vision proposes is correct and precisely scoped: surface `PLANET_IN_HOUSE` briefs for SR planets in angular houses, plus Saturn and Jupiter anywhere (because the traditional benefic and malefic always carry annual significance regardless of house), plus SR Ascendant and MC sign meanings.

The briefs should be short. The `PLANET_IN_HOUSE` `brief` field is 5–10 words. These should not compete with the GPT reading. They should be a factual layer that the GPT reading then synthesizes. The user who reads "SR Saturn in House 7 — This year: relationships face structural reckoning" before the GPT paragraph arrives already has a frame. When GPT then discusses the relational themes of the year, the user is positioned to recognize what they are hearing. That is a better reading experience than GPT introducing the SR Saturn in House 7 without any setup.

The visual treatment: follow the `SRStaticBriefs` pattern — `bg-amber-900/5 border border-amber-500/10` — and add a small section header. Not a new card style. Not a new component pattern. Extend the existing `SRStaticBriefs` component or add a sibling that handles the additional planets. The implementation cost is low; the reading depth increase is real.

One more thing on the Solar Return page: the advance preview is at the bottom of the Reading tab. A user who opens the Reading tab sees the GPT interpretation, scrolls down, and then — quite far down — finds the advance strip. Consider moving it above the GPT interpretation, immediately after `SRStaticBriefs`. The advance strip answers the most concrete, actionable question the user has: "when does this year intensify?" That question is more urgent for most users than the year-character narrative. Let the user see the strip first, navigate to the month that concerns them, and then read the GPT paragraph with that specific month in mind. The strip is a navigation tool; it should appear before the content it navigates.

---

## The Today Page: One Signal That Would Change Everything

Open `TodayPage.tsx`. The Today page shows: Personal Day card, Moon card, Sky Highlights card, Transit Energy card, GPT Morning Synthesis.

The Transit Energy card shows `computeEnergyRating` output — five dots and a label like "Active" or "Intense" or "Gentle." This is computed from raw transit aspects using the old energy rating formula. The same old formula the advance engine replaced with `computeCombinedWeight` eighteen months ago.

Now look at what the advance engine already knows. If the user has visited the Advance tab, the snapshots for the current period are cached. The snapshot for today's offset is already scored with the full combination-weight algorithm. It knows whether today is `power`, `favorable`, `challenging`, `neutral`, or `shift`. It has a reason string. It has a `bannerBoldFragment`.

The Today page knows none of this. It has its own energy rating, independently computed from the inferior formula. The user who visits both the Today page and the Advance tab sees two different characterizations of today, computed differently, possibly contradicting each other. The advance engine might say "Favorable Window — Jupiter flows through your 7th house." The Today page says "Transit Energy: Moderate" with three dots. Same sky. Different answer.

The sprint vision is correct that the Today page should surface the advance category signal when it is available. The implementation constraint is also correct: do not force a recalculation on Today page load. If the snapshots are not in the component-level cache, the signal is simply absent — no label, no banner — and the existing energy dots remain. If the cache is warm, the advance category label and reason string appear as a small banner at the top of the Sky Highlights card or between the Moon card and Sky Highlights.

The specific moment I want: a user opens the Today page on a morning when today is scored as `power` in the advance engine. Instead of five yellow dots and the word "Active," they see a small gold banner — the `✦ Power Configuration` label, and a short reason string naming what planetary configuration is making this day notable. They read "Saturn reaches your Midheaven today." That is an experience they will tell someone about. That is the signal the product has been building the infrastructure for five sprints to deliver — and it has never appeared on the page the user opens every morning.

This does not require rebuilding the Today page. It requires reading from the existing advance snapshot cache when available and surfacing one additional element. The visual treatment follows the established banner pattern from the advance strip.

---

## Visual Polish: Where I Would Focus

The sprint vision lists four candidates for visual polish. I want to be direct about which ones matter.

**The `DailySnapshotCard` on the Home screen** — this is the daily-use surface. The advance marker signal belongs here before it belongs anywhere else. The same logic I described for the Today page applies here: if the advance snapshot for today is available in the component-level cache, surface the category label. The `DailySnapshotCard` renders the energy dots — replace them or supplement them with the advance category when available. This is the highest-leverage polish target because the Home screen is opened more than any other view.

**The SR bi-wheel in `SolarReturnBiWheel.tsx`** — the bi-wheel uses a `SIZE` of 700, element-colored zodiac segments, hover state for natal and SR planets independently. Compare it to the main `ChartWheel.tsx`: the main wheel has SVG glow filters, radial gradient background, ambient planet pulse glow, progressive reveal animation. The bi-wheel has none of these. A user who has seen the beautiful main chart wheel will notice the SR bi-wheel feels like an earlier version of the product. This is a real quality gap. But it is a Chart tab feature, not a Reading tab feature. Most daily use happens in the Reading tab. Weight this accordingly — fix it, but only after the Today page and the SR reading depth improvements are done.

**The Synastry page expand/collapse pattern** — the sprint vision mentions that synastry aspect rows may not fully realize the house-aware context pattern from sprint-0019. I looked at `SynastryPage.tsx`. The `AspectRow` component is used; `computeSynastryAspectBrief` is called. But the inline briefs on synastry rows may not have the same expand-to-detail behavior that transit aspect rows have. If that is true, it is a minor quality gap but not the most visible one. Deprioritize relative to the other candidates.

---

## What to Cut

The sprint vision explicitly delineates what sprint-0021 is not: no new advance engine primitives, no new GPT surfaces for couple or SR advance, no full SR advance tab with slider and aspect list, no new pages. I agree with all of these constraints.

I want to add one more cut: do not add the SR Ascendant and MC sign meanings to the static briefs section until the angular-house planet briefs are in place and the layout has been reviewed in context. The `KeyPlacements` grid already surfaces ASC and MC sign at the top of the page. Adding a third section of briefs for ASC and MC sign meanings below the planet briefs would produce a page with four interpretive layers before the GPT reading, which is too much. Sun, Moon, and major planets in angular houses first. ASC/MC sign briefs can come in a future sprint if the page can absorb them.

---

## The Standard for This Sprint

Sprint-0021 is a consolidation sprint. The question it must answer is not "what new feature can we ship" — it is "does what we already built feel complete and trustworthy?"

The test: take the product to a couple who has been using it for two weeks. Ask them to open the couple advance tab and navigate to the most intense-looking marker. Read them the banner. Then ask them to open the Solar Return page. Ask them to find the month of the year that looks hardest. Read them what it says about that month.

If the couple advance marker's dot size reflects the actual planetary weight of that month — and the banner's intensity feels proportional to what the sky is doing — then the intensity fix worked.

If the Solar Return reading tells them not just what the year is about but what other planets are shaping it — not just Sun and Moon but Mars in the 1st, Saturn in the 7th — and the advance strip shows them when those themes intensify — then the depth expansion worked.

If the user who opens the Today page on a morning when the advance engine has scored the day as a power configuration sees that signal without visiting the Advance tab — then the coherence improvement worked.

The product already has the most technically interesting engine in this category. Sprint-0021 is about making sure the experience surface reflects it.
