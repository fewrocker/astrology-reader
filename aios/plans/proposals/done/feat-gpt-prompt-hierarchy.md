---
**Type:** Feature
**Originated by:** Jobs, Carmack, Miyazaki, Taleb
---

## Problem / Opportunity

`buildTransitPrompt` (in `src/engine/transits.ts`, lines 285–386) and `buildSynastryPrompt` (in `src/engine/synastry.ts`, lines 444–522) send GPT complete, correct astrological data — natal positions with house numbers, transit aspects with orb and applying flag, ingresses, retrogrades — and then give GPT no instruction about what to lead with or how to prioritize. The result is that GPT covers all listed topics with approximately equal weight, starting with whichever appears first in the prompt's `Focus on:` bullet list, which is always a generic thematic framing ("Overall energy and mood for the day," "Overall relationship energy and core dynamic"). The tightest applying aspect — the configuration most actively in play for this specific person right now — may be mentioned in paragraph three or buried in a later section.

Three specific structural gaps:

1. **No priority header.** Neither prompt tells GPT to lead with the tightest applying aspect. The transit aspects are listed in the prompt (sorted by orb, since `calculateTransitAspects` emits them in that order), but the instructions then enumerate eight generic focus areas in a numbered list that implicitly signals equal weight.

2. **House data is present but unused.** The natal chart block in `buildTransitPrompt` already includes house numbers for every planet (`(House ${p.house})`), but the instruction section never says to use them. GPT frequently defaults to sign-only language ("your Scorpio Mercury," "as a Virgo rising") instead of naming the life area ("your 3rd-house Mercury," "your health and routines"). The house data is in the prompt. It is simply not being called on.

3. **Synastry aspects are emitted unsorted.** In `buildSynastryPrompt`, the synastry aspects are iterated directly from `synastryData.synastryAspects` with no sort applied (line 477: `for (const a of synastryData.synastryAspects)`). The order depends on calculation sequence, not orb tightness. GPT receives a list where a 4.2° aspect may appear before a 0.6° aspect. Without an explicit orb-sort and a priority instruction, GPT has no signal to weight the tightest contact most heavily.

Taleb additionally identified: the `unknownTime` flag (`chartData.unknownTime`) is already present in the server-side types (`server/services/gpt.ts`, line 22) but the transit prompt builder in `src/engine/transits.ts` emits house numbers for all natal planets unconditionally — including when birth time is unknown and all house values are meaningless zeros. If a user has no birth time on record, `buildTransitPrompt` currently sends `(House 0)` for every natal planet, and any instruction telling GPT to "name the house" will cause GPT to either hallucinate house placements or emit "House 0" as if it were meaningful.

The reference implementation that already does this right is `buildSnapshotPrompt` in `src/components/reading/DailySnapshotCard.tsx` (lines 23–49): it sends aspects sorted tightest-first, includes a direct statement that void-of-course means avoiding major decisions, and closes with a plain directive ("Write 2-3 specific, honest sentences… Be direct and personal"). The daily snapshot prompt consistently produces better GPT output than the full transit reading prompt — the irony that the ambient background card outperforms the premium feature users pay for.

No new endpoints, no new GPT calls, no new rate-limit cost. This feature is prompt engineering within existing call sites.

---

## Vision

The transit and synastry GPT prompts gain a structured priority header that tells the model where to focus, how to weight its coverage, and what language constraints apply. Every sentence GPT produces names a house or a specific life area — not a sun-sign archetype. The tightest applying aspect leads the reading. The `unknownTime` flag gates any house-naming instruction, so users without birth time receive accurate sign-level readings rather than hallucinated house assignments. The synastry aspect list is sorted by orb before being emitted to GPT, so the model's own weighting reflects real planetary strength.

The two prompts that change are `buildTransitPrompt` (transit/daily/weekly/monthly) and `buildSynastryPrompt` (synastry). All other prompts — daily snapshot, journal annotation, dream interpretation, numerology narrative, today-synthesis, cosmic pattern reading, astro-discuss — are explicitly out of scope and must not be touched.

---

## Specifications

1. **Identify the tightest applying transit aspect before building the instruction header.** In `buildTransitPrompt`, before the `## Instructions` block is appended, compute `const tightestApplying = transitData.transitAspects.find(a => a.applying) ?? transitData.transitAspects[0]`. Since `calculateTransitAspects` already sorts by orb ascending (line 162 of `transits.ts`), the first `applying` entry is the tightest. If no applying aspects exist, fall back to the tightest aspect overall. This value feeds the priority header verbatim.

2. **Add a priority header as the first line of the `## Instructions` block in `buildTransitPrompt`.** The header text, interpolated with actual data, must read:

   ```
   Priority: Lead with the tightest applying aspect — Transit [planet] [symbol] Natal [planet] ([orb]°, [house]-house). Open your reading with what this aspect means for the life area named by that house. Do not begin with a general orientation or a summary of the period's themes.
   ```

   If `natalChart.unknownTime` is `true`, substitute: `Priority: Lead with the tightest applying aspect — Transit [planet] [symbol] Natal [planet] ([orb]°). Open your reading with this aspect. Do not begin with a general orientation.` — omitting the house reference entirely.

3. **Add a house-naming instruction to `buildTransitPrompt`, gated on `!natalChart.unknownTime`.** When birth time is known, append to the instruction block:

   ```
   For every transit aspect you interpret, name the natal house it touches and state what that house governs (e.g., "your 7th-house Venus — the zone of partnership and one-on-one relating"). Do not use sign-only language like "as a Scorpio" or "your Scorpio Mercury." Every sentence must be anchored to a house number or a specific named life area.
   ```

   When `natalChart.unknownTime` is `true`, instead append: `Interpret each transit in terms of the natal planet's sign and nature. House-level language is not available for this chart.`

4. **Add an anti-cliché constraint to `buildTransitPrompt`.** Append to the instruction block regardless of `unknownTime`:

   ```
   Write as if you know this person's chart specifically — not as if you are writing a column for all people with this Sun sign. Avoid sentences that could apply equally to any person of the same sign. Every statement must be derivable from the specific degrees, planets, and configurations listed above.
   ```

5. **Add a dominant-element context line to `buildTransitPrompt`.** Before the `## Instructions` block, call `analyzeElements(natalChart.planets)` (already exported from `src/data/interpretations/index.ts`, line 50) and prepend a one-line context:

   ```
   ## Natal Element Profile
   Dominant element: [element] — [interpretation.dominant phrase]
   ```

   This gives GPT calibration context for how to frame transits (e.g., an Earth-dominant person and a Fire-dominant person experience a Neptune transit differently). This is two lines of code and one import.

6. **Sort `synastryData.synastryAspects` by orb ascending before emitting them in `buildSynastryPrompt`.** Replace the current unsorted iteration:
   ```ts
   // current (line 477)
   for (const a of synastryData.synastryAspects) {
   ```
   with:
   ```ts
   const sortedAspects = [...synastryData.synastryAspects].sort((a, b) => a.orb - b.orb)
   for (const a of sortedAspects) {
   ```
   This is a one-line change. It does not mutate the original array. It ensures GPT sees the tightest contacts first, which causes the model to weight them more heavily even before explicit instructions are added.

7. **Add a priority header to `buildSynastryPrompt`'s instruction block.** Before the numbered coverage list (line 508), prepend:

   ```
   Priority: Lead with the single most significant contact in this synastry — the tightest orb aspect that involves personal planets (Sun, Moon, Venus, Mars, Mercury). State what this contact means for the relationship before expanding to the broader picture. If the tightest aspect involves Venus or Moon, begin with the emotional/affectional register. If it involves Saturn or an outer planet, begin with the structural or growth dimension.
   ```

8. **Add a house-naming instruction to `buildSynastryPrompt`, gated on both charts' `unknownTime` flags.** When at least one person has a known birth time, append:

   ```
   Where house data is available for either person, name the house that receives each planet placement and state what it governs for that person. Use "Person 1's 7th house (partnership)" rather than "Person 1's Libra." Where birth time is unknown, interpret in terms of sign and nature only.
   ```

9. **Add the anti-generic constraint to `buildSynastryPrompt`.** Append identically to the transit version:

   ```
   Write as if you know these two people's charts specifically. Do not write sentences that could apply to any Venus-Moon trine or any Saturn square. Ground every statement in the actual degrees and signs listed above.
   ```

10. **Do not modify the `handleTransitInterpretation` system prompt in `server/services/gpt.ts` (lines 180–185).** The system prompt there ("You are an expert astrologer who provides factual, precise, and honest transit readings…") is well-calibrated and must not be changed. The improvements are entirely in the user-turn content built by `buildTransitPrompt` and `buildSynastryPrompt`. Adding house-naming instructions to the system prompt as well would duplicate guidance and may produce conflicting directives.

11. **The `unknownTime` gate is mandatory for any house reference in either prompt.** In `buildTransitPrompt`, the natal planet block already emits `(House ${p.house})` unconditionally (line 312). Add a guard:
    ```ts
    const houseStr = !natalChart.unknownTime && p.house > 0 ? ` (House ${p.house})` : ''
    prompt += `- ${p.name}: ${p.degree}°${p.minute}' ${p.sign}${houseStr}${p.retrograde ? ' [Rx]' : ''}\n`
    ```
    This prevents `(House 0)` from appearing in the natal data block for users without birth time, which would otherwise cause GPT to reference house 0 as if it were meaningful.

12. **The `buildSynastryPrompt` function already gates house output on `!chart1.unknownTime` and `!chart2.unknownTime` for the natal sections (lines 457, 468).** This existing gate is correct and must be preserved. The new priority and house-naming instructions added to `buildSynastryPrompt` must reference the same conditions: emit the full house-naming instruction only when at least one person has `unknownTime === false`.

13. **Do not sort or reorder the transit aspects in `buildTransitPrompt`'s data section.** They are already sorted by orb ascending from `calculateTransitAspects`. The instruction header (spec 2) references the first applying aspect by index — this is only correct because the list is already orb-sorted. Verify this assumption with a comment: `// aspects already sorted by orb ascending from calculateTransitAspects`.

14. **Regression-test the output quality using three representative charts before shipping.** A chart with known birth time, tight applying aspects, and a distinctive dominant element (e.g., heavy Fire chart with Saturn square Mercury at 0.4° orb). A chart without birth time (`unknownTime: true`) — verify no house references appear in GPT output and no "House 0" text in the prompt payload. A synastry pair where the tightest aspect is a Venus-Moon conjunction at 0.2° orb — verify GPT opens with that contact, not with "overall relationship energy." Log the full prompt payload (not just GPT output) for each test to confirm the instruction text is correctly interpolated.

15. **Acceptance check — transit reading with known birth time.** The first paragraph of the GPT response must name a specific house number. No paragraph may contain the phrase "as a [Sign]" or "your [Sign] energy" in isolation. The word "specifically" or a named life area (e.g., "partnerships," "career," "home and family") must appear in the first 80 words.

16. **Acceptance check — transit reading with unknown birth time.** The GPT response must contain no house numbers. The phrase "House 0" must not appear. The response must reference signs and planet natures. The first paragraph must reference the tightest applying aspect by planet name.

17. **Acceptance check — synastry reading.** The first paragraph of the GPT response must reference the cross-chart aspect with the tightest orb (which is now the first in the emitted list). The numbered coverage template ("1. Overall relationship energy…") in the current instruction block (lines 508–515) must remain intact — it governs the full reading's coverage after the priority opening.

18. **Files changed.** Exactly two engine files change: `src/engine/transits.ts` (the `buildTransitPrompt` function) and `src/engine/synastry.ts` (the `buildSynastryPrompt` function). One import is added to `transits.ts`: `analyzeElements` from `src/data/interpretations/index.ts`. No changes to `server/services/gpt.ts`, no changes to any component file, no changes to any interpretation database.

---

## Out of Scope

- `buildSnapshotPrompt` in `src/components/reading/DailySnapshotCard.tsx` — this is the reference implementation. Do not touch it. It is already correct.
- `buildCoupleTransitPrompt` in `src/engine/synastry.ts` — this function builds prompts for the couple transit reading, a different product surface. It is not addressed by this proposal.
- `handleTransitInterpretation` system prompt in `server/services/gpt.ts` — well-calibrated as-is.
- Journal annotation prompt, dream interpretation prompt, numerology narrative, today-synthesis, cosmic pattern reading, astro-discuss — explicitly excluded per sprint-0010 vision ("Not a prompt rewrite that changes the reading type. The solar return prompt, the numerology narrative prompt, and the journal annotation prompt are already good enough").
- The `DailySnapshotCard` cache key bug (Taleb identified that the cache key uses only Sun longitude and date, not Ascendant or Moon — meaning a chart correction that shifts the Ascendant does not invalidate the cache). Real fragility, separate ticket.
- Synastry inline briefs in the aspect list UI (`SynastryAspectsSection`) — the question of whether the interpretation database has correct relational text for synastry is a separate proposal. This proposal only addresses GPT prompt quality, not static interpretation surfaces.
- The `ASPECT_KEYWORDS` map extraction from `TodayPage.tsx` — separate proposal.
- `AdvanceTab` performance (synchronous `useMemo` snapshot pre-calculation blocking the main thread) — separate proposal.

---

## Open Questions

1. **Applying-aspect definition for retrograde planets.** The `applying` flag in `TransitAspect` is computed as `tp.dailyMotion > 0 ? (angle > def.angle ? false : true) : (angle > def.angle ? true : false)` — this inverts for retrograde transits, which is astrologically correct. However, for a weekly or monthly reading, an aspect flagged as "applying" on the reading's start date may have already perfected by the time the user reads the interpretation. Should the priority header include an `applying` qualifier ("tightest applying aspect") or simply "tightest aspect by orb" to avoid misleading the model about the aspect's current status relative to reading time?

2. **Element context interpolation — what happens when elements tie?** `analyzeElements` returns the dominant element from `sorted[0][0]`, which is the first after sorting descending by count. When two elements are tied, the returned dominant is whichever sorts first alphabetically. The prompt will read "Dominant element: Air" even if Air and Fire are equal. Is this acceptable, or should the dominant-element line be suppressed when counts are within one planet of each other?

3. **Priority header for periods with no applying aspects.** If all transit aspects are separating (plausible in a quiet period), the fallback is to use the tightest separating aspect. The instruction says "tightest applying aspect" but the actual tightest is separating. Should the priority header text adapt ("Lead with the tightest aspect, which is currently separating at [orb]°") or remain generic ("Lead with the aspect of tightest orb")?

4. **Localization of the `## Instructions` block for different reading periods.** `buildTransitPrompt` currently emits different `Focus on:` bullet lists for daily, weekly, and monthly periods. The new priority header and house-naming instruction apply to all three. Should the wording of the priority header vary by period ("Lead with the aspect perfecting soonest this week" for weekly vs. "Lead with the tightest applying aspect" for daily), or is a single formulation sufficient?
