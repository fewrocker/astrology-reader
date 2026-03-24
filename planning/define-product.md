# Product Definition

## Product Description

**Astral Chart** is a web application that generates astronomically accurate natal (birth) chart readings. Users complete a guided multi-step form providing their birth details and focus preferences, and the app calculates real planetary positions using astronomical algorithms, renders a beautiful interactive chart wheel, and delivers a comprehensive astrological interpretation — starting with a concise summary and expanding into deep detail.

The app runs entirely in the browser (no backend required). All astronomical calculations happen client-side. An optional OpenAI API key can be provided for AI-enhanced interpretive synthesis.

## Features

### F1: Multi-Step Birth Data Form
A wizard-style form with smooth transitions between steps:
- **Step 1 — Date of Birth**: Calendar date picker
- **Step 2 — Time of Birth**: Time input with an "I don't know my birth time" checkbox (defaults to solar noon; chart will note reduced accuracy for houses/ascendant)
- **Step 3 — Place of Birth**: City search input with real-time autocomplete from a bundled database of ~40,000 cities worldwide (with lat/lng/timezone). Displays city, region, country. Resolves to coordinates and IANA timezone.
- **Step 4 — Reading Focus**: User selects one or more focus areas: Love & Relationships, Career & Purpose, Personal Growth, Health & Wellness, Finances, Spirituality. Default is "Full Reading" (all areas).
- Navigation: Back/Next buttons, progress indicator, input validation at each step.

### F2: City Autocomplete Database
A bundled JSON dataset of major world cities (~40K entries) with:
- City name, state/region, country
- Latitude and longitude
- IANA timezone identifier
- Population (for ranking search results — larger cities appear first)
Instant client-side fuzzy search with debounced input. No external API dependency.

### F3: Astronomical Calculation Engine
Real planetary position calculations using the `astronomy-engine` library:
- **Planets**: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
- **Points**: North Node (Mean Lunar Node), Chiron (if library supports, otherwise omit)
- **Angles**: Ascendant (ASC), Midheaven (MC), Descendant (DSC), Imum Coeli (IC)
- **Houses**: All 12 house cusps using Placidus house system
- **Zodiac positions**: Ecliptic longitude converted to sign + degree + minute
- **Retrograde detection**: Flag planets with negative daily motion
- Proper timezone resolution for the birth location/date using IANA timezone data

### F4: Aspect Calculation
Calculate angular relationships between all planet pairs:
- **Major aspects**: Conjunction (0°, orb ±8°), Sextile (60°, orb ±6°), Square (90°, orb ±8°), Trine (120°, orb ±8°), Opposition (180°, orb ±8°)
- **Minor aspects**: Semi-sextile (30°, orb ±2°), Quincunx (150°, orb ±3°)
- Calculate exact angle separation and orb for each detected aspect
- Classify applying vs. separating aspects
- Detect aspect patterns: Grand Trine, T-Square, Grand Cross, Yod

### F5: Interactive Birth Chart Wheel (SVG)
A circular natal chart rendered as SVG:
- Outer ring: 12 zodiac signs with glyphs and degree markers
- Middle ring: 12 houses with cusps marked
- Inner area: Planet glyphs placed at correct ecliptic positions
- Aspect lines: Drawn between planets, color-coded by aspect type (blue=trine/sextile, red=square/opposition, green=conjunction, grey=minor)
- Hover tooltips: Hover over a planet to see its exact position, sign, house, and aspects
- Color scheme matching the mystic UI theme
- Responsive sizing

### F6: Concise Reading Summary
A narrative overview (3-5 paragraphs) covering:
- The "Big Three" — Sun sign, Moon sign, Rising sign interpretation
- Dominant element and modality analysis
- Most significant aspects (tightest orbs, involving luminaries or angles)
- Key life themes based on house stelliums or angular planets
- Brief focus-area-specific insight based on user selection

### F7: Detailed Interpretation Breakdown
Expandable sections with in-depth analysis:
- **Planet in Sign**: Each planet's zodiac sign placement and meaning (10 entries)
- **Planet in House**: Each planet's house placement and meaning (10 entries)
- **Aspects**: Each detected aspect with interpretation text
- **Houses Overview**: Key houses and their rulers
- **Element & Modality Balance**: Distribution chart + interpretation
- **Focus Area Deep Dive**: Extended reading on the user's selected focus areas, pulling relevant planets/houses/aspects

### F8: Static Interpretation Database
A comprehensive JSON/TS database of astrological interpretations:
- 120 planet-in-sign entries (10 planets × 12 signs)
- 120 planet-in-house entries (10 planets × 12 houses)
- ~50 aspect interpretations (major aspects between key planet pairs)
- Element/modality balance interpretations
- Focus area mappings (which houses/planets relate to each life area)

### F9: Mystic UI Theme
Dark, elegant visual design:
- **Background**: Deep charcoal (#0a0a0f) with subtle radial gradient
- **Accent colors**: Gold (#c9a84c), soft purple (#7c5cbf), celestial blue (#4a7fb5)
- **Typography**: Serif font for headings (Cormorant Garamond or Playfair Display), clean sans-serif for body (Inter)
- **Subtle decorative elements**: Faint star field background, thin golden borders, soft glows
- **Transitions**: Smooth fade/slide between form steps
- **Mobile responsive**: Works beautifully on phone screens
- Not over-the-top: Elegant restraint, no excessive animations or sparkle effects

### F10: Results Page Layout
Structured presentation of the reading:
- Chart wheel displayed prominently at the top
- Concise summary directly below the chart
- Tabular data: planet positions table, aspects table
- Detailed interpretation sections with expand/collapse
- "Generate New Reading" button to start over
- Print-friendly layout option

## Scope & Priorities

### Priority 1 (Must Have)
- F1: Multi-step form
- F2: City autocomplete
- F3: Calculation engine
- F4: Aspect calculation
- F5: Chart wheel
- F6: Concise summary
- F7: Detailed breakdown
- F8: Interpretation database
- F9: Mystic UI
- F10: Results layout

### Priority 2 (Nice to Have / Future)
- AI-enhanced interpretation via OpenAI API
- PDF export of reading
- Sharing via link
- Chart comparison (synastry)
- Transit overlay

### Implemented Enhancements
- **F11: Transit Readings (Daily / Weekly / Monthly / Custom Month)** — Calculate current planetary transits against natal chart. Select daily (Moon/fast planets), weekly (Sun/Mercury/Venus/Mars), monthly (all planets including slow movers), or pick any specific month via a month picker. GPT-powered personalized interpretation. Includes transit aspects, sign ingresses, retrograde tracking, and current positions table. Custom month selection available for both individual and couple transit readings.
- **F12: GPT Interpretation Layer** — OpenAI API integration (gpt-4o-mini) for generating flowing, personalized transit reading paragraphs from chart data.
- **F13: Discuss with GPT** — A "Discuss ✦" button on both birth chart and transit results pages opens a modal chat interface. Users can ask questions about their chart and receive personalized GPT answers with full astrological context (natal positions, houses, aspects, elements, modalities, transits). Supports multi-turn conversation with suggestion chips.
- **F14: Results Caching** — Birth chart results (chartData, aspects, reading) and transit results (transitData, transitInterpretation, transitPeriod) are cached in localStorage and persist across browser sessions. Cleared on "Enter New Birth Data".
- **F15: Couple Synastry Analysis** — Full compatibility analysis between two people. Enter partner's birth data (date, time, city) from cached landing or results page. Calculates cross-chart aspects, house overlays (planets in partner's houses), composite (midpoint) chart, and compatibility scoring (romantic, emotional, communication, growth, challenge). GPT-powered couple interpretation. Includes couple transit readings (daily/weekly/monthly) against the composite chart. "Discuss ✦" chat available with full synastry context. Partner data and synastry results cached in localStorage.
- **F16: Aspect Patterns Display** — Detects and displays major aspect patterns (Grand Trine, T-Square, Grand Cross, Yod) with dedicated interpretation cards. Each card shows the pattern symbol, involved planets with glyphs and signs, brief and detailed interpretations. Grand Trines include element-specific flavor text. Color-coded by pattern nature. Shown between Aspects and Element/Modality Balance sections.
- **F17: Beautiful Chart Display** — Enhanced chart wheel with larger SVG (800×800 viewBox), element-colored zodiac segments, degree tick marks, SVG glow filters on planets and angular labels, radial gradient background, entrance animations (progressive reveal), ambient planet pulse glow, enhanced hover with aspect line dimming, smoother tooltip with gold glow, bigger chart containers across all pages. All animations respect `prefers-reduced-motion`.
- **F18: Planetary Dignities & Strength Analysis** — Essential dignities (domicile, exaltation, detriment, fall) displayed as colored badges on each planet card. New "Planetary Strength" section with visual strength bars ranking all planets by dignity, auto-generated narrative about strongest/weakest placements, and mutual reception detection with interpretive cards. Dignity context integrated into GPT discuss for AI-aware conversations.
- **F19: Retrograde Interpretation & Awareness** — Natal retrograde interpretations for all 8 planets (Mercury through Pluto) with brief and detailed text explaining how retrograde status affects personality. Dedicated "℞ Retrograde Planets" summary section with adaptive narrative based on retrograde count. Transit retrograde activity section with interpretive context per planet. Retrograde data integrated into GPT discuss context for AI-aware conversations. Retrograde interpretation block shown in expanded planet cards.
- **F20: Interactive Chart Tooltips** — Rich interactive tooltips on the chart wheel. Hovering a planet shows its glyph, position, sign interpretation, house interpretation, and dignity badge — drawn from the same interpretation database used on the reading page. Hovering an aspect line shows the aspect type/symbol, planet pair, orb, applying/separating status, and brief interpretation. Hovering a house number shows the house name, theme, natural ruler/sign, cusp position, and which planets occupy it. Tooltips are positioned near the hovered element and clamped to stay within the chart bounds. Unified hover state ensures only one tooltip at a time. Chart enlarged to 800×800 viewBox with proportionally bigger containers on all pages (max-w-4xl on results/transit, max-w-xl on synastry).
- **F21: Transit Timeline & Aspect Calendar** — A "◆ Timeline" tab alongside the existing "✦ Reading" tab on the transit reading page. Shows a chronological vertical timeline of all transit events for the selected period: exact aspect perfection dates (found via binary search), planet sign ingresses, retrograde stations, lunar phases (New/Full/Quarter Moon), and Moon sign changes. Each event is a tappable card with planet glyphs, aspect symbols, and enriched interpretation snippets. Filter bar lets users view specific event types (Aspects, Ingresses, Stations, Lunar, Moon). "Power Day" highlights mark dates with 3+ significant events. Stats bar shows total event count and power day count. Fully responsive mobile layout.

## Execution Order

1. Project setup and architecture
2. City database and autocomplete component
3. Multi-step form wizard
4. Astronomical calculation engine
5. Aspect calculation
6. Chart wheel SVG rendering
7. Interpretation database
8. Reading summary and detailed breakdown
9. Results page layout and integration
10. UI polish and responsive design

## UX/UI Guidelines

- **Flow**: Landing page → Form wizard → Loading animation → Results page
- **Loading state**: While calculating, show a brief celestial animation (stars aligning or chart drawing itself)
- **Error handling**: Friendly messages for invalid inputs, clear guidance
- **Accessibility**: Proper contrast ratios, keyboard navigation, screen reader labels
- **Performance**: City search must feel instant (<50ms). Chart calculation should complete in <2 seconds.
- **Mobile first**: Form and results must work well on 375px+ screens
- **No login required**: Stateless experience, no accounts
