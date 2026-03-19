# Enhancement: Couple Synastry Analysis

## What Exists Today

- Birth data is cached in localStorage with date/time/city/focus areas
- Birth chart calculation engine (`src/engine/astronomy.ts`) produces `ChartData` with planet positions, houses, angles
- Aspect engine (`src/engine/aspects.ts`) calculates aspects between planet pairs within one chart
- Transit engine (`src/engine/transits.ts`) calculates current transits against natal chart
- GPT interpretation service (`src/services/gptInterpretation.ts`) generates AI-powered readings
- Discuss modal (`src/components/discuss/DiscussModal.tsx`) provides chat about chart with GPT
- Cached landing page shows "Read My Chart", "Daily/Weekly/Monthly Reading", and "Enter New Birth Data"
- State management via `AppContext` + `useReducer` with view-based routing

## What the User Wants

1. A "Couple Analysis" button on the cached landing page (person 1 data already cached)
2. A page to enter the partner's birth data (date, time, city — reuse existing form components)
3. A synastry results page showing:
   - **Cross-chart aspect analysis** (Person A's planets to Person B's planets)
   - **House overlay analysis** (Person A's planets falling in Person B's houses, and vice versa)
   - **Composite chart analysis** (midpoints of each planet pair)
   - **Element/modality compatibility**
   - **Couple transit analysis** for day/week/month (current transits affecting the composite)
4. The "Discuss ✦" feature available on the synastry results page
5. GPT-powered interpretation of the compatibility reading

## Astrological Research: How Couple Analysis Works

### Synastry (Cross-Chart Aspects)
The primary technique. Compare Person A's planets to Person B's planets:
- **Key aspects to check**: All standard aspects (conjunction through quincunx)
- **Most important synastry aspects**:
  - Sun-Moon contacts (emotional + identity compatibility)
  - Venus-Mars contacts (romantic/sexual chemistry)
  - Moon-Moon contacts (emotional compatibility)
  - Venus-Venus contacts (shared values)
  - Mercury-Mercury contacts (communication style)
  - Saturn aspects (commitment, challenges, longevity)
  - Jupiter aspects (growth, generosity, expansion together)
  - Pluto aspects (intensity, transformation, power dynamics)
  - Node contacts (karmic connection, soul purpose)
- **Orbs**: Generally tighter than natal (6° for major, 2° for minor)

### House Overlay
Where one person's planets fall in the other's houses:
- Person A's Venus in Person B's 7th house = A is attracted to B as a partner
- Person A's Mars in Person B's 10th house = A energizes B's career
- Most important houses: 1st (identity), 5th (romance), 7th (partnership), 8th (intimacy), 4th (home/family)

### Composite Chart (Midpoint Method)
The relationship chart — the "third entity":
- Each composite planet = midpoint of both people's same planet
- e.g., Composite Sun = midpoint of Person A's Sun and Person B's Sun
- Shows the nature of the relationship itself
- Composite Ascendant, houses, and aspects are all meaningful

### Compatibility Scoring
- Element compatibility (Fire+Air harmonize, Earth+Water harmonize)
- Modality compatibility (same modality = understanding but power struggles; complementary = balance)
- Count harmonious vs challenging inter-aspects

### Couple Transits
- Calculate current transits against the **composite chart** (affects the relationship)
- Also note transits hitting synastry points (e.g., transit Saturn conjunct Person A's Venus which is conjunct Person B's Mars)

## What Needs to Change

### New Files
- `src/engine/synastry.ts` — Synastry calculation engine (cross-aspects, house overlays, composite chart, compatibility scoring)
- `src/components/results/SynastryPage.tsx` — Full synastry results display
- `src/components/form/PartnerForm.tsx` — Partner birth data input (single page form)

### Modified Files
- `src/context/appState.ts` — Add synastry-related state, views, actions, caching
- `src/context/AppContext.tsx` — Add synastry cache persistence
- `src/App.tsx` — Add synastry views (partner-form, synastry-loading, synastry-results, synastry-transit-select, synastry-transit-loading, synastry-transit-results)
- `src/components/discuss/DiscussModal.tsx` — Support 'synastry' mode with couple context
- `src/services/gptInterpretation.ts` — Add synastry GPT prompt builder
- `src/components/results/ResultsPage.tsx` — Optional: add "Couple Analysis" button
- `src/engine/transits.ts` — Add composite chart transit calculation

## Implementation Checklist

- [ ] 1. Create `src/engine/synastry.ts` with:
  - `calculateSynastryAspects(chart1, chart2)` — cross-chart aspects
  - `calculateHouseOverlays(chart1, chart2)` — planet-in-partner-house
  - `calculateCompositeChart(chart1, chart2)` — midpoint composite
  - `calculateCompatibility(chart1, chart2, synAspects)` — scoring & summary
- [ ] 2. Update `src/context/appState.ts`:
  - Add `partnerBirthData`, `partnerChartData`, `partnerAspects`, `partnerReading`
  - Add `synastryData` (cross-aspects, overlays, composite, compatibility)
  - Add synastry transit state
  - Add new views and actions
  - Add caching for synastry data
- [ ] 3. Update `src/context/AppContext.tsx` to persist synastry cache
- [ ] 4. Create `src/components/form/PartnerForm.tsx` — single-page partner data form
- [ ] 5. Create `src/components/results/SynastryPage.tsx` — full synastry results display
- [ ] 6. Update `src/App.tsx`:
  - Add "Couple Analysis" button to CachedDataLanding
  - Add partner-form, synastry-loading, synastry-results views
  - Add synastry-transit-select, synastry-transit-loading, synastry-transit-results views
  - Wire synastry calculation + GPT interpretation
- [ ] 7. Update `src/components/discuss/DiscussModal.tsx` to support 'synastry' mode
- [ ] 8. Update `src/services/gptInterpretation.ts` with synastry prompt builder
- [ ] 9. Build & verify zero errors
- [ ] 10. Test full flow end-to-end
