# Development Roadmap

Derived from features in `planning/define-product.md` (F1–F10), ordered by dependency and execution order.

## Implementation Steps

### Step 1: city-database
**Features:** F2 (City Autocomplete Database)
Build first since it has no dependencies and the form needs it.
- Curate and bundle the ~40K city JSON dataset (name, region, country, lat, lng, timezone, population)
- Implement client-side fuzzy search with debounced input
- City autocomplete component with ranked results (by population)

### Step 2: multi-step-form
**Features:** F1 (Multi-Step Birth Data Form)
The primary user input interface; depends on city database for Step 3.
- Form wizard with 4 steps: Date, Time, Place, Focus
- Step navigation with back/next, progress indicator
- Input validation at each step
- "I don't know my birth time" option
- Focus area selection (multi-select)

### Step 3: calculation-engine
**Features:** F3 (Astronomical Calculation Engine)
Core computation — no UI dependency, pure functions.
- Integrate `astronomy-engine` for planetary positions
- Calculate Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto positions
- Calculate Ascendant, Midheaven, Descendant, IC
- Calculate all 12 house cusps (Placidus)
- North Node calculation
- Retrograde detection
- Zodiac sign/degree/minute conversion

### Step 4: aspect-calculation
**Features:** F4 (Aspect Calculation)
Depends on calculation engine output.
- Calculate angular relationships between all planet pairs
- Major aspects: conjunction, sextile, square, trine, opposition (with orbs)
- Minor aspects: semi-sextile, quincunx
- Applying vs. separating classification
- Aspect pattern detection: Grand Trine, T-Square, Grand Cross, Yod

### Step 5: chart-wheel
**Features:** F5 (Interactive Birth Chart Wheel)
SVG rendering of chart data — depends on calculation engine + aspect calculation.
- Outer zodiac ring with sign glyphs and degree markers
- House divisions overlay
- Planet glyphs at correct positions
- Aspect lines between planets (color-coded)
- Hover tooltips with position details
- Responsive sizing
- Mystic theme styling

### Step 6: interpretation-database
**Features:** F8 (Static Interpretation Database)
Content layer — independent of UI but needed before reading components.
- 120 planet-in-sign entries (10 planets × 12 signs)
- 120 planet-in-house entries (10 planets × 12 houses)
- ~50 major aspect interpretations
- Element/modality balance interpretations
- Focus area mappings

### Step 7: reading-display
**Features:** F6 (Concise Summary) + F7 (Detailed Breakdown)
Interpretation UI — depends on interpretation database + calculation results.
- Concise reading summary (Big Three, dominant element/modality, key aspects)
- Detailed breakdown with expandable sections
- Planet-in-sign, planet-in-house, aspects sections
- Element & modality balance visualization
- Focus area deep dive based on user selection

### Step 8: results-page
**Features:** F10 (Results Page Layout)
Integration step — assembles chart + reading into final view.
- Results page layout with chart wheel prominent
- Planet positions table
- Aspects table
- Reading sections below chart
- "Generate New Reading" button
- Loading state with celestial animation

### Step 9: ui-polish
**Features:** F9 (Mystic UI Theme) — applied across all components
Final pass on visual design and responsiveness.
- Dark mystic theme consistency check
- Typography refinement (Playfair Display headings, Inter body)
- Subtle decorative elements (star field, golden borders, soft glows)
- Smooth transitions between form steps
- Mobile responsive testing and fixes
- Accessibility audit (contrast, keyboard nav, labels)
- Print-friendly layout for results
