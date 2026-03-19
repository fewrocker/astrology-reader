# Proposal: Expand Aspect Interpretations & Data Quality

## Problem / Opportunity

The interpretation database has solid coverage for common planet pairs (~70 aspect entries) but falls back to generic text for uncommon combinations (e.g., Uranus-Neptune semi-sextile, Saturn-Chiron quincunx). Users with these aspects in their chart get a vague "This minor aspect suggests a subtle connection..." instead of meaningful interpretation.

Additionally, aspect pattern interpretations (Grand Trine, T-Square, Grand Cross, Yod) are completely missing from the database, even though the engine detects them.

## Proposed Solution

1. **Expand aspect interpretations**: Add ~30 new entries covering:
   - All outer planet combinations (Jupiter–Pluto pairs)
   - Minor aspects between personal planets (Sun/Moon/Mercury/Venus/Mars)
   - Key North Node aspects (Node conjunct/square/opposite personal planets)

2. **Add aspect pattern interpretations**: ~8 new entries:
   - Grand Trine (fire/earth/air/water)
   - T-Square (cardinal/fixed/mutable)
   - Grand Cross
   - Yod (Finger of God)

3. **Enrich focus area mappings**: Currently generic; add house-specific detail for each focus area (e.g., "Career" should emphasize 10th house ruler, MC aspects, Saturn placement).

## Impact & Effort

- **Impact**: Medium — Improves reading depth for ~30% of users who have uncommon aspects
- **Effort**: Medium (3–4 hours of writing + data entry)
- **Dependencies**: F8 (Interpretation Database), proposal: Aspect Patterns Display

## Implementation Summary

- Add entries to `src/data/interpretations/aspectInterpretations.ts`
- Create `src/data/interpretations/patternInterpretations.ts` for aspect pattern texts
- Expand focus area planet/house mappings in `src/data/interpretations/index.ts`
- Update types in `src/data/interpretations/types.ts` if new categories needed
