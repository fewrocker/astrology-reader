---
**Type:** Feature
**Originated by:** Jobs, Carmack, Miyazaki
---

## Problem / Opportunity

The `DailySnapshotCard` is the first surface a returning user sees every day. It contains three pills in a row at the top of the card — moon phase, energy rating, and a "key aspect" pill. The key aspect pill currently renders:

```
Key: Mars ☍ natal Sun
```

This is a symbol transcription. It restates the raw astrological fact already encoded in the glyph and planet names without adding a word of meaning. A user who opens the app at 8am before the GPT paragraph has loaded reads this pill and learns nothing they did not already know from the glyph row alone.

The `topAspect` object powering the pill carries full interpretive data: `transitPlanet`, `natalPlanet`, `type`, `orb`, `nature`, `applying`, and `symbol`. Every field needed to write a one-line human sentence is present. The decision not to use it is purely an omission, not a data gap.

A secondary surface also falls short: the moon pill already shows `· void` in orange text on void-of-course days, but "void" communicates nothing to a user who does not already understand what void-of-course means. One quiet phrase would close the gap.

A third structural problem: the `ASPECT_KEYWORDS` map that provides the vocabulary for planet–nature combinations already exists in `TodayPage.tsx` at module scope, but it is unexported. Any new component that needs the same vocabulary must either re-declare it (creating two copies that will diverge) or trigger a refactor to extract it. The proposed sentence requires exactly this vocabulary. Extracting it is a prerequisite, not an afterthought.

The opportunity: with a small static lookup table keyed by `transitPlanet × aspectNature`, the pill can render a one-line action phrase that tells a returning user exactly what kind of day they are walking into — before the GPT paragraph loads, without any additional API call, at the cost of one 50-entry table and a single sentence template.

---

## Vision

The key aspect pill becomes the ambient reading signal the home screen promised to be. A user opens the app and reads:

> Mars opposing your natal Sun — a day for assertion, not accommodation.

That sentence is available the moment the component mounts (the aspect data is computed synchronously before the GPT call), costs no additional tokens, and stands on its own without the GPT paragraph. When the paragraph arrives, it can deepen rather than explain — because the pill has already handled the mechanical layer.

On void-of-course days, the moon pill gains a quiet companion note:

> · void · decisions may need revisiting

One phrase. Seven words. No GPT call. The user understands what void means for their day.

The `ASPECT_KEYWORDS` map migrates from its current unexported home in `TodayPage.tsx` to a shared file in `src/data/interpretations/`. Both `TodayPage` and `DailySnapshotCard` import it from that shared location. There is one source of truth for planet–nature vocabulary across the product.

---

## Specifications

1. **Current render — exact state before this feature ships.** The `topAspect` pill in `DailySnapshotCard.tsx` (lines 213–219) renders the following JSX:
   ```tsx
   <div className="flex items-center gap-1.5 bg-mystic-gold/8 border border-mystic-gold/20 rounded-full px-3 py-1">
     <span className="text-mystic-muted text-xs">
       Key: {topAspect.transitPlanet} {topAspect.symbol} natal {topAspect.natalPlanet}
     </span>
   </div>
   ```
   The pill shows the transit planet name, the Unicode aspect symbol (e.g., `☍`), and the natal planet name. No interpretation. No verb. No life-area context.

2. **Target sentence structure — canonical form.** The pill renders a single sentence built from the following template:

   `{TransitPlanet} {aspectVerb} your natal {NatalPlanet} — {actionPhrase}`

   - `{TransitPlanet}` — the planet name as rendered today (e.g., `Mars`), no glyph
   - `{aspectVerb}` — a human verb derived from the `type` field (see spec 6)
   - `your natal` — literal string, always present
   - `{NatalPlanet}` — the natal planet name (e.g., `Sun`), no glyph
   - ` — ` — em dash separator with single spaces
   - `{actionPhrase}` — a one-line interpretive phrase derived from the `transitPlanet × nature` lookup table (see spec 7)

   Example outputs:
   - `Mars opposing your natal Sun — a day for assertion, not accommodation`
   - `Saturn squaring your natal Mercury — friction in thought and speech; choose words with care`
   - `Venus trining your natal Moon — warmth flows without effort today`
   - `Jupiter conjunct your natal Sun — say yes to more; generosity opens doors`
   - `Pluto sextiling your natal Venus — deep value surfaces; notice what you truly want`

3. **Aspect verb mapping — `ASPECT_VERB` constant.** Define a constant `ASPECT_VERB: Record<AspectType, string>` mapping each aspect type to its present-participle human verb. This constant lives alongside the lookup table (see spec 9). The full mapping:
   - `conjunction` → `conjunct` (no gerund form; treated grammatically as "conjunct your natal…")
   - `sextile` → `sextiling`
   - `square` → `squaring`
   - `trine` → `trining`
   - `opposition` → `opposing`
   - `semi-sextile` → `in semi-sextile with`
   - `quincunx` → `in quincunx with`
   For `conjunction`, the template becomes `{TransitPlanet} conjunct your natal {NatalPlanet} — {phrase}` (no "-ing" form; this is standard astrological phrasing).

4. **Action phrase lookup table — `TRANSIT_PLANET_PHRASES`.** Define `TRANSIT_PLANET_PHRASES: Record<string, Record<'harmonious' | 'challenging' | 'neutral', string>>` covering all 10 transit planets plus NorthNode. Each planet has exactly three entries — one per `nature` value. The table is keyed first by `transitPlanet` (the `topAspect.transitPlanet` value), then by `nature` (the `topAspect.nature` value). The full 33-entry table (10 planets × 3 natures + NorthNode × 3):
   - `Sun / harmonious` → `confidence rises — let your presence lead`
   - `Sun / challenging` → `ego asks for space; watch for self-assertion tipping into friction`
   - `Sun / neutral` → `identity is in focus; notice how you present yourself`
   - `Moon / harmonious` → `emotions run quietly supportive today`
   - `Moon / challenging` → `feelings are close to the surface; tread gently inward`
   - `Moon / neutral` → `inner tides are shifting; check in with yourself`
   - `Mercury / harmonious` → `words land well; a good day for the conversation you've been putting off`
   - `Mercury / challenging` → `friction in thought and speech; choose words with care`
   - `Mercury / neutral` → `the mind is active; observe before concluding`
   - `Venus / harmonious` → `warmth flows without effort today`
   - `Venus / challenging` → `what you want and what you're getting may not match; notice where`
   - `Venus / neutral` → `values are in view; what matters most right now?`
   - `Mars / harmonious` → `directed energy — act on what matters`
   - `Mars / challenging` → `a day for assertion, not accommodation`
   - `Mars / neutral` → `energy is available; channel it before it channels you`
   - `Jupiter / harmonious` → `say yes to more; generosity opens doors`
   - `Jupiter / challenging` → `ambition runs high; distinguish vision from overreach`
   - `Jupiter / neutral` → `expansion is possible; take one step toward it`
   - `Saturn / harmonious` → `structure rewards patience; slow progress is still progress`
   - `Saturn / challenging` → `pressure is real, and it is purposeful`
   - `Saturn / neutral` → `accountability is the theme; what responsibility is waiting?`
   - `Uranus / harmonious` → `an unexpected opening; stay loose`
   - `Uranus / challenging` → `disruption arrives without warning; breathe before reacting`
   - `Uranus / neutral` → `something is shifting; let it`
   - `Neptune / harmonious` → `intuition is sharpened; trust a feeling today`
   - `Neptune / challenging` → `boundaries are blurry; not everything is as it appears`
   - `Neptune / neutral` → `imagination runs high; useful for creativity, less so for decisions`
   - `Pluto / harmonious` → `deep value surfaces; notice what you truly want`
   - `Pluto / challenging` → `power dynamics are active; choose conscious engagement over reaction`
   - `Pluto / neutral` → `something beneath the surface is moving`
   - `NorthNode / harmonious` → `aligned with your path; a day to lean forward`
   - `NorthNode / challenging` → `growth feels uncomfortable; that is the point`
   - `NorthNode / neutral` → `purpose is nudging you; pay attention to what comes up`

5. **Applying vs. separating — no phrase variation required in v1.** The `topAspect.applying` boolean is available but the phrase table in spec 4 does not branch on it in the initial implementation. The `applying` value is already included in the GPT prompt via `buildSnapshotPrompt` (line 33), so the GPT paragraph contextualizes applying vs. separating energy. If a future sprint wants to add phrase variants (e.g., "tightening" vs. "releasing" cues), the lookup table structure already accommodates a four-key variant (`harmonious_applying`, `harmonious_separating`, etc.) without breaking existing callers.

6. **Full sentence assembly function — `buildKeyAspectSentence`.** Define and export:
   ```ts
   export function buildKeyAspectSentence(aspect: TransitAspect): string
   ```
   The function:
   - Looks up `ASPECT_VERB[aspect.type]` — falls back to `aspect.type` (raw string) if the type is unknown
   - Looks up `TRANSIT_PLANET_PHRASES[aspect.transitPlanet]?.[aspect.nature]` — falls back to the `ASPECT_BRIEFS[aspect.type][aspect.transitPlanet]` entry from `transitEvents.ts` if the phrase table misses
   - Assembles: `${aspect.transitPlanet} ${verb} your natal ${aspect.natalPlanet} — ${phrase}`
   - Returns the assembled string

   The function must not throw. All lookups are optional-chained or guarded. If both the phrase table and the `ASPECT_BRIEFS` fallback miss, the function returns the current raw format: `${aspect.transitPlanet} ${aspect.symbol} natal ${aspect.natalPlanet}` — degrading gracefully to the pre-feature behavior.

7. **Pill render change — `DailySnapshotCard.tsx`.** Replace the `topAspect` pill render at lines 213–219 with:
   ```tsx
   {topAspect && !loading && (
     <div className="flex items-center gap-1.5 bg-mystic-gold/8 border border-mystic-gold/20 rounded-full px-3 py-1">
       <span className="text-mystic-muted text-xs italic">
         {buildKeyAspectSentence(topAspect)}
       </span>
     </div>
   )}
   ```
   The `italic` class is added to differentiate the interpretive sentence visually from the data pills (moon phase, energy dots). No other style changes. The pill container, background, border, border-radius, and padding are identical to the current render — only the inner text changes.

8. **Null / missing `topAspect` handling.** `topAspect` is `null` when no transit aspects are within orb today (very rare but possible during low-transit periods). When `topAspect` is `null`, the pill does not render — identical to current behavior. No "no key aspect today" placeholder is shown; the pill row simply has two pills (moon + energy) instead of three. The GPT paragraph remains the primary reading surface in this edge case.

9. **Shared file location — `src/data/interpretations/aspectKeywords.ts`.** All four constants live in this new file:
   - `ASPECT_KEYWORDS` (extracted from `TodayPage.tsx` — the existing one-word nature-per-planet map)
   - `ASPECT_VERB` (new — the verb form map, spec 3)
   - `TRANSIT_PLANET_PHRASES` (new — the action phrase table, spec 4)
   - `buildKeyAspectSentence` (new — the assembly function, spec 6)

   Both `TodayPage.tsx` and `DailySnapshotCard.tsx` import `ASPECT_KEYWORDS` from this file. `TodayPage.tsx`'s local `ASPECT_KEYWORDS` declaration (lines 26–38) is deleted and replaced with a named import. The `getAspectKeyword` helper function in `TodayPage.tsx` (lines 40–42) stays local to that file — it is a presentational helper that wraps the shared constant, not a concern for the shared module.

10. **Extraction of `ASPECT_KEYWORDS` — exact migration steps.** The extraction is a prerequisite step, completed before the sentence logic is written:
    - Copy the `ASPECT_KEYWORDS` object verbatim from `TodayPage.tsx` lines 26–38 into `src/data/interpretations/aspectKeywords.ts` as a named export.
    - Add `import { ASPECT_KEYWORDS } from '../../data/interpretations/aspectKeywords'` to `TodayPage.tsx`.
    - Delete the local `const ASPECT_KEYWORDS = ...` declaration in `TodayPage.tsx`.
    - Verify the `TodayPage` component renders identically before proceeding to the sentence logic.
    - This step introduces no behavior change and can be reviewed and merged independently if desired.

11. **Void-of-course moon pill — additional quiet note.** The moon pill (lines 188–196 of `DailySnapshotCard.tsx`) currently renders:
    ```tsx
    {moon.isVoid && (
      <span className="text-orange-400 text-xs ml-1">· void</span>
    )}
    ```
    Replace with:
    ```tsx
    {moon.isVoid && (
      <span className="text-orange-400 text-xs ml-1">· void · decisions may need revisiting</span>
    )}
    ```
    The phrase "decisions made during a void moon often do not take hold" is condensed to "decisions may need revisiting" — seven words, same muted orange color as the existing `· void` badge. No additional styling changes. The full pill remains on one line for viewport widths ≥ 375px (iPhone SE minimum); at extreme narrowing the pill wraps via the existing `flex-wrap` class on the pill row container.

12. **Energy label display — no change required.** The energy rating pill already surfaces `energy.label` (e.g., "Intense", "Flowing", "Balanced") in `energy.textColor`. This pill is complete and is not modified by this feature. The interaction between the energy label and the new key aspect sentence is: the energy label names the overall register, the key aspect sentence explains the primary driver. They complement rather than duplicate.

13. **Cache compatibility.** The `getCacheKey` function (line 63–67) caches `{ text, energy, moon, topAspect }` in localStorage. The `topAspect` object is stored and restored as-is. `buildKeyAspectSentence` runs at render time from the stored `topAspect` — no changes to the cache schema are needed. The sentence is computed on the fly from the same `topAspect` data that was always cached. A user with a stale cache from before this feature ships will see the new sentence format the moment their cache entry includes a `topAspect` (i.e., immediately on next load with the updated code).

14. **No new GPT call, no new server endpoint.** `buildKeyAspectSentence` is a pure synchronous function. It calls no external service. It runs before `getDailySnapshotInterpretation` resolves and is therefore visible in the first render frame after `topAspect` is set (before `loading` is `false` for the GPT result — but `topAspect` is set to `best` at line 117 while GPT is still pending, so the pill is rendered in the `topAspect && !loading` block; implementation must ensure the pill renders as soon as `topAspect` is non-null even while `loading` is `true` for the GPT text). To make the pill available before GPT resolves, the `!loading` guard on the `topAspect` pill must be changed to a dedicated boolean that tracks whether `topAspect` has been computed, not whether the full load cycle is complete. `topAspect` is set in the synchronous path (line 117) before the `getDailySnapshotInterpretation` `await`, so a separate `aspectReady` boolean suffices.

15. **Acceptance checks — definition of done.**
    - Given a chart with a `topAspect` of `{ transitPlanet: 'Mars', natalPlanet: 'Sun', type: 'opposition', nature: 'challenging', applying: true, symbol: '☍', orb: 0.8 }`, the pill renders: `Mars opposing your natal Sun — a day for assertion, not accommodation`
    - Given a chart with `topAspect.type: 'trine'` and `topAspect.nature: 'harmonious'` and `topAspect.transitPlanet: 'Venus'`, the pill renders: `Venus trining your natal [natalPlanet] — warmth flows without effort today`
    - Given `topAspect` is `null`, the key aspect pill does not render; the pill row shows moon and energy pills only
    - Given `moon.isVoid` is `true`, the moon pill reads `[phase] in [sign] · void · decisions may need revisiting`
    - Given `moon.isVoid` is `false`, the moon pill reads `[phase] in [sign]` with no void text (identical to current)
    - `TodayPage.tsx` imports `ASPECT_KEYWORDS` from `src/data/interpretations/aspectKeywords.ts`; no local declaration of `ASPECT_KEYWORDS` exists in `TodayPage.tsx`
    - The `buildKeyAspectSentence` function is exported from `src/data/interpretations/aspectKeywords.ts` and has TypeScript return type `string`
    - Given an unknown `type` not in `ASPECT_VERB`, the function returns the raw fallback without throwing
    - The pill renders in italic style (`font-style: italic`) to visually distinguish it from the non-interpretive moon and energy pills
    - The pill becomes visible as soon as `topAspect` is non-null, not waiting for the GPT paragraph to resolve

---

## Out of Scope

- **No house-awareness in the key aspect pill.** The `topAspect` object does not carry `natalHouse` (the `TransitAspect` interface has no such field). Cross-referencing the natal planet's house from `chart.planets` inside `DailySnapshotCard` is possible but creates a data dependency and `unknownTime` edge-case that adds complexity disproportionate to the marginal value. House context belongs in the inline briefs on `TransitReadingPage` (a separate proposal). The pill sentence addresses planet-pair + aspect nature; house context is the next depth layer.
- **No applying/separating phrase variants.** The `topAspect.applying` boolean is not used to select between phrase variants. The GPT paragraph already handles the temporal dimension. Adding separating-vs-applying phrase variants creates 66 entries (2× the current 33) and risks the table becoming a maintenance liability for a subtle distinction users likely do not need at the pill level.
- **No new energy label text.** The `EnergyRating.label` ("Intense", "Flowing", "Balanced", etc.) is computed by `computeEnergyRating` in `transits.ts` and is not modified by this feature.
- **No cache key changes.** Taleb's voice correctly identifies a weakness in the cache key (it uses only Sun longitude, missing Ascendant sign). Fixing the cache key is a separate hardening task. This feature does not worsen the cache key; the pill sentence computed from a cached `topAspect` is as valid as the currently-cached symbol transcription.
- **No changes to `buildSnapshotPrompt`.** The prompt engineering for the GPT paragraph is already the best in the codebase; modifying it is out of scope for this feature.
- **No changes to `ASPECT_BRIEFS` in `transitEvents.ts`.** `ASPECT_BRIEFS` is used as a fallback in `buildKeyAspectSentence` (spec 6) but its entries are not modified.
- **No void-of-course GPT call.** The void note is a single hardcoded phrase, not a GPT-generated interpretation.
- **No new files beyond `aspectKeywords.ts`.** The lookup table and assembly function live in one shared file alongside the extracted `ASPECT_KEYWORDS`. No additional utility files, no new hooks.

---

## Open Questions

1. **Italic vs. non-italic for the sentence.** The spec calls for `italic` on the pill text to distinguish it from data pills. Verify with the design-guidelines color/font conventions that italic `text-xs` in `text-mystic-muted` reads legibly against the `bg-mystic-gold/8` pill background at the minimum supported viewport width (375px). If contrast is insufficient at that size, the alternative is `text-mystic-text/70` (slightly lighter than body text) without italic, preserving legibility.

2. **"conjunct" vs. "conjuncting".** Spec 3 uses `conjunct` (no gerund) for conjunction, consistent with standard astrological phrasing ("Mars conjunct natal Sun" is more natural than "Mars conjuncting"). Verify the resulting sentence reads naturally in context: `Mars conjunct your natal Sun — [phrase]`. If it reads awkward alongside the other gerund forms, consider `conjuncting` for consistency at the cost of non-standard astrological phrasing. Decision should be made before implementation, not after.

3. **Phrase table ownership and content review.** The 33 action phrases in spec 4 are authored in this proposal document. They should be reviewed by the product owner before the file is committed — the phrases are the visible face of the feature and their tone must match the overall product voice (specific, honest, non-generic, not encouraging-for-its-own-sake). Any phrase that reads as a horoscope cliché should be rewritten.

4. **`aspectReady` boolean vs. `!loading` guard.** Spec 14 notes that the current `!loading` guard on the key aspect pill prevents it from rendering while the GPT call is in flight, even though `topAspect` is available before GPT resolves. The proposed fix (a separate `aspectReady` boolean) requires a small state addition. Confirm this UX intent: should the pill render before the GPT paragraph loads (yes — this is the point of the feature), or should it remain hidden until the full card loads (current behavior, which is the behavior the feature is designed to fix)? Implementation should default to "pill visible before GPT" per the vision.

5. **`NorthNode` as `transitPlanet`.** The `TransitAspect` type allows `NorthNode` as a transit planet (it can be a transiting point). The phrase table includes `NorthNode` entries. Confirm that the North Node appears in `calculateTransitAspects` results as `topAspect.transitPlanet` in practice (i.e., that the engine calculates North Node transits), or remove the `NorthNode` entry from the phrase table if it never appears in that position.
