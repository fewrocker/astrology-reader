# Sprint 0011 — Changelog

**Theme:** Closing the last inch — every surface that computed data but stayed silent now speaks.

All 8 tasks delivered. 3 merge conflicts resolved (all work preserved). Final build: 1828 modules, 0 errors.

---

## Issue Fixes

### issue-synastry-element-compat-sort-bug
**Proposal:** issue-synastry-element-compat-sort-bug
**Problem:** The `elementCompat` function in `synastry.ts` computed Person 1's dominant element using a broken sort comparator — `count2[b] - count1[a]` — that crossed indices from two different element count tables, producing arbitrary ordering rather than a true descending sort. Person 1's dominant element was silently wrong for every synastry reading.
**Solution:** Changed the comparator to `count1[b] - count1[a]` (consistent index for Person 1's table). One character change, confirmed correct by symmetry with the adjacent Person 2 sort.

---

## Code Enhancements

### code-collapsible-section-extraction
**Proposal:** code-collapsible-section-extraction
**Problem:** `SynastryPage.tsx` and `SynastryTransitPage.tsx` each defined an identical local `Section` accordion component — byte-for-byte duplicated props, class names, and inline chevron styles. A behavioral change to one would silently skip the other.
**Solution:** Extracted `CollapsibleSection` to `src/components/ui/CollapsibleSection.tsx`. Both pages now import the shared component. Zero behavioral change.

### code-gpt-prompt-element-profiles
**Proposal:** code-gpt-prompt-element-profiles
**Problem:** `buildTransitPrompt` received `analyzeElements` injection in sprint 0010, but `buildSynastryPrompt`, `buildCoupleTransitPrompt`, and `buildSolarReturnPrompt` did not. GPT received complete planetary data but no element synthesis, and no instruction to name life areas alongside house numbers.
**Solution:** Added `analyzeElements` calls and element profile blocks to all three remaining prompt functions. Added priority instructions to lead with the tightest contact and name the specific life area for each placement. Symmetry with the transit prompt now complete.

---

## Features

### feat-couple-transit-aspect-rows
**Proposal:** feat-couple-transit-aspect-rows
**Problem:** `TransitAspectsToComposite` on the Couple Transit page was identical to the pre-sprint-0010 state of transit aspect rows — static divs, glyphs, orbs, no expand/collapse, no briefs.
**Solution:** Replaced the static row loop with `AspectRow` components. Added `natalLabel?: string` prop to `AspectRow` (default "Natal") so composite rows can label the anchor planet as "Composite" rather than "Natal". Briefs use the existing `computeTransitAspectBrief` fallback chain (composite planets have `house: 0` — a known deferred limitation; generic briefs are shown).
**What it is:** Every couple transit aspect row now expands to reveal a brief describing what the transit means.
**How to use it:** Open any Couple Transit reading → tap or click any aspect row → the brief expands below it. Tap again to collapse.

### feat-solar-return-static-interpretation
**Proposal:** feat-solar-return-static-interpretation
**Problem:** The Solar Return Reading tab showed only a GPT block (or skeleton while loading). Before GPT loaded, the user saw nothing meaningful about what the year held.
**Solution:** Added a static interpretation card above the GPT skeleton showing SR Sun house and SR Moon house briefs from `PLANET_IN_HOUSE`. Each brief is prefixed with "This year:" to recontextualize the natal-voice data without modifying the underlying table. Cards render immediately on page load — in loading, error, and loaded GPT states.
**What it is:** Before GPT loads, two sentences appear: what house your SR Sun is in (your primary focus area for the year) and what house your SR Moon is in (your emotional climate for the year).
**How to use it:** Open any Solar Return reading → the Year at a Glance cards appear immediately at the top of the Reading tab, before GPT loads.

### feat-synastry-aspect-row-briefs
**Proposal:** feat-synastry-aspect-row-briefs
**Problem:** Every cross-chart aspect in a synastry reading was a bare row — glyphs, orb, nature badge, and nothing else. The most emotionally resonant calculation in the product said nothing.
**Solution:** Created `src/data/interpretations/synastryAspectBriefs.ts` — a 30-entry relational brief table covering the highest-frequency cross-chart pairs (Sun/Moon/Venus/Mars across all 5 major aspect types), written in relational voice ("your Venus trine their Moon: warmth and affection flow naturally..."), plus a 10-entry planet archetype fallback for uncovered pairs. Added `showApplyingBadge?: boolean` and `labelOverride?: string` props to `AspectRow`. All synastry aspect rows now use `AspectRow` with `showApplyingBadge={false}` (natal-natal charts have no applying concept) and relational-voice briefs from `computeSynastryAspectBrief`.
**What it is:** Tap any synastry aspect row and a two-sentence brief appears in relational language — specific to the two planets and aspect type involved.
**How to use it:** Open any Synastry reading → scroll to the Aspects section → tap or click any aspect row to expand its relational brief.

### feat-synastry-house-overlay-briefs
**Proposal:** feat-synastry-house-overlay-briefs
**Problem:** The house overlay section — which shows where each person's planets fall in their partner's houses — was a silent three-column table. "Your Venus falls in their 7th house" appeared with no interpretation.
**Solution:** Created `src/data/interpretations/synastryHouseOverlayBriefs.ts` with 60 entries for inner planets (Sun/Moon/Venus/Mars/Mercury) in all 12 houses, written in relational voice. Outer planets use a template drawn from `HOUSE_THEMES`. Refactored `HouseOverlaySection` from a `<table>` to a card stack layout. High-signal entries (inner planets in 1st/4th/5th/7th/8th/12th houses) render prominently with a full brief. The section opens by default when high-signal placements are present. Section header shows the count of key placements.
**What it is:** Each planet-in-partner-house entry now has a one-to-two sentence relational interpretation. "Your Venus in their 7th house" is followed by a sentence that tells you what it means.
**How to use it:** Open any Synastry reading → scroll to the House Overlay section (now open by default if key placements exist) → each entry shows what that planet brings to that area of your partner's life.

### feat-today-sky-highlights-expand
**Proposal:** feat-today-sky-highlights-expand
**Problem:** The Sky Highlights block on the daily snapshot page showed 3 transit aspects as bare rows — glyph, aspect symbol, glyph, keyword. No house. No sentence. No expand/collapse.
**Solution:** Replaced the static row loop with `AspectRow` components. `natalHouse` was already embedded in `TransitAspect` from sprint 0010. `computeTransitAspectBrief` generates house-aware briefs. Removed the now-unused `getAspectKeyword` calls.
**What it is:** The three daily transit rows now expand on tap to show a house-aware brief sentence about the aspect and what life area it activates.
**How to use it:** Open the app → tap any transit row in the Sky Highlights card → a brief expands below it. Tap again to collapse.

---

## Merge Notes
- `SynastryTransitPage.tsx`: task-0004 and task-0002 both touched the import block. Resolved by keeping both import sets (CollapsibleSection + AspectRow + computeTransitAspectBrief).
- `AspectRow.tsx`: task-0004 added `natalLabel`, task-0006 added `showApplyingBadge` and `labelOverride`. Resolved by merging all three props; label rendering uses `labelOverride ?? \`Transit ... ${natalLabel} ...\`` so both contexts work.
- `SynastryPage.tsx`: task-0006 and task-0007 both modified the file. Resolved by keeping both import sets and task-0007's card-stack HouseOverlaySection implementation with the task-0006 CollapsibleSection alias.

## Failed / Deferred Tasks
None. All 8 tasks delivered.
