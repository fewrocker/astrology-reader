> Imported from proposals/expand-interpretations.md

# Enhancement: Expand Aspect Interpretations & Data Quality

## What Exists Today
- `src/data/interpretations/aspectInterpretations.ts` — ~70 aspect entries covering Sun, Moon, Venus, Mars + some outer planets (conjunctions mainly)
- `src/data/interpretations/patternInterpretations.ts` — 4 pattern types (Grand Trine, T-Square, Grand Cross, Yod) with element flavors for Grand Trine only
- `src/data/interpretations/types.ts` — Focus area mappings for 6 areas (love, career, growth, health, finances, spirituality) with generic descriptions
- `src/data/interpretations/index.ts` — Assembly logic, lookup functions
- `src/components/discuss/DiscussModal.tsx` — GPT discuss context builders that send chart data but don't include interpretation texts or pattern data

## What Needs to Change

### 1. Expand aspect interpretations (~30 new entries)
Missing coverage:
- Outer planet pairs: Jupiter-Uranus (non-conjunction), Jupiter-Neptune (non-conjunction), Jupiter-Pluto (non-conjunction), Saturn-Uranus (non-conjunction), Saturn-Neptune (non-conjunction), Saturn-Pluto (non-conjunction)
- Minor aspects for personal planets (semi-sextile, quincunx)
- North Node aspects (Node conjunct/square/opposite Sun, Moon, Venus, Mars, Saturn)
- Missing cross-planet aspects: Mercury-Mars, Mercury-Jupiter, Mercury-Saturn, Mercury-Uranus, Mercury-Neptune, Mercury-Pluto, Venus-Jupiter, Venus-Uranus, Venus-Neptune, Venus-Pluto, Mars-Jupiter, Mars-Uranus, Mars-Neptune, Mars-Pluto

### 2. Enrich pattern interpretations
- Add T-Square modality flavors (Cardinal/Fixed/Mutable) like Grand Trine has element flavors

### 3. Enrich focus area mappings
- Add house-specific detail for each focus area (Career → 10th house ruler, MC aspects, Saturn placement)
- Update descriptions to be more detailed

### 4. Include expanded data in GPT discuss requests
- Add aspect interpretations to birth chart context
- Add pattern readings with interpretations
- Add focus area interpretations
- Include element/modality interpretation text

## Implementation Checklist
- [ ] Add ~30 new aspect interpretations to `aspectInterpretations.ts`
- [ ] Add T-Square modality flavor function to `patternInterpretations.ts`
- [ ] Enrich focus area descriptions in `types.ts`
- [ ] Update `buildBirthChartContext()` in DiscussModal to include interpretation texts, patterns, and focus area details
- [ ] Build and verify zero errors
- [ ] Test the app runs correctly
