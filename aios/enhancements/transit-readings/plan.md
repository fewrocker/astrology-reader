# Enhancement: Transit Readings (Daily / Weekly / Monthly)

## What Exists Today
- Multi-step birth data form collecting date, time, place, focus areas
- Astronomical calculation engine (`src/engine/astronomy.ts`) using `astronomy-engine` library
- Natal chart calculation with planet positions, houses, aspects
- Static interpretation database for planet-in-sign, planet-in-house, aspects
- Results page (`src/components/results/ResultsPage.tsx`) with chart wheel, reading display
- Birth data cached in localStorage for quick re-readings
- App state management via React context/reducer (`src/context/appState.ts`)

## What the User Wants
- Daily, weekly, and monthly transit readings based on their birth chart
- Use cached birth data (natal chart) as baseline
- Calculate current planetary positions (transits) and their aspects to natal planets
- Use OpenAI GPT API to interpret transit data into meaningful guidance
- Reuse the results screen layout but adapted for transit context
- Person should understand what to expect for day, week, month

## What Needs to Change

### New Files
- `src/engine/transits.ts` — Transit calculation engine (current planet positions, transit-to-natal aspects)
- `src/services/gptInterpretation.ts` — OpenAI API integration for transit interpretation
- `src/components/results/TransitReadingPage.tsx` — Transit reading results page

### Modified Files
- `src/context/appState.ts` — Add transit-related state, views, actions
- `src/context/AppContext.tsx` — No changes needed (uses reducer)
- `src/App.tsx` — Add transit view routing, transit calculation flow, navigation 

## Implementation Tasks

- [x] Create `src/engine/transits.ts` with transit calculation logic
- [x] Create `src/services/gptInterpretation.ts` with OpenAI API integration
- [x] Update `src/context/appState.ts` with transit state types and actions
- [x] Create `src/components/results/TransitReadingPage.tsx` transit results UI
- [x] Update `src/App.tsx` with transit navigation and calculation flow
- [x] Build verification (zero errors)

## Astrological Concepts for Transits

### Daily Reading (Transit Chart for Today)
- Current planet positions compared to natal chart
- Fast-moving planets (Moon, Mercury, Venus, Sun) form aspects to natal planets
- Moon transits are most relevant for daily energy/mood
- Relevant timeframe: today specifically

### Weekly Reading
- Focus on faster planets (Sun, Mercury, Venus, Mars) transiting natal positions
- Any sign changes during the week
- Mercury/Venus aspects forming this week
- Relevant timeframe: next 7 days

### Monthly Reading  
- Include slower planets (Jupiter, Saturn) transit aspects to natal planets
- Major ingresses (planets changing signs)
- Mars transits (takes ~2 months per sign)
- Any retrogrades beginning or ending
- Relevant timeframe: next 30 days
