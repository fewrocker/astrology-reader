# Research

## Competitor Analysis

### Existing Birth Chart Generators

1. **Astro.com (Astrodienst)** — The gold standard for accuracy. Uses Swiss Ephemeris. Excellent calculations but dated UI (2000s-era design). Free chart generation. Interpretation is available but behind paywalls.

2. **Co-Star** — Modern mobile app with sleek UI. Uses real NASA data for planetary positions. Known for AI-generated interpretations. Weakness: interpretations can feel generic and sometimes oddly negative. Social features dilute the reading experience.

3. **The Pattern** — App focused on personality patterns derived from birth charts. Good UI but opaque about methodology. Users can't see the actual chart data easily.

4. **Cafe Astrology** — Comprehensive free interpretations but extremely dated UI. Text-heavy, overwhelming. Good content, poor presentation.

5. **AstroSage / Kundli** — Popular in Vedic astrology. Comprehensive but cluttered. Not aesthetically modern.

6. **TimePassages** — Desktop/mobile app. Good calculations and interpretations. Paid model. Decent but not web-first.

### Gaps in the Market

- **Astro.com** has accuracy but terrible UX
- **Co-Star** has UX but superficial/generic interpretations
- No existing tool combines: real calculations + beautiful modern UI + deep personalized interpretations + focus-area customization
- Most tools show the chart OR the reading, rarely weaving them together beautifully
- Few tools let users specify what they care about most

## Technology Research

### Astronomical Calculation Libraries (JavaScript)

1. **astronomy-engine** (npm: `astronomy-engine`)
   - High-precision astronomical calculations
   - Supports all planets, moon, sun positions
   - Ecliptic coordinates (what astrology uses)
   - MIT license, actively maintained
   - No dependencies, runs in browser

2. **Swiss Ephemeris (swisseph)** — The industry standard for astrological software
   - C library with JS bindings via WebAssembly
   - Most accurate ephemeris data available
   - Powers Astro.com and most professional software
   - Complex to set up in browser

3. **Moshier Ephemeris** — Analytical ephemeris (no data files needed)
   - Less accurate than Swiss Ephemeris for distant dates but excellent for modern dates
   - Some JS implementations available

**Decision**: Use `astronomy-engine` for planetary position calculations. It provides sufficient accuracy for astrological purposes (arcsecond precision), runs natively in the browser, and has zero dependencies. For house calculations, we'll implement the math ourselves using the ascendant/MC from the library.

### Cities / Geocoding API

1. **GeoNames** — Free, open database. 11M+ place names. API requires registration. Rate-limited but generous free tier.

2. **GeoDB Cities API (RapidAPI)** — RESTful, good autocomplete. Free tier: 1000 requests/day.

3. **Built-in city database** — Bundle a curated JSON of ~40,000 major cities with lat/lng/timezone. Zero API dependency, instant autocomplete, works offline.

4. **OpenStreetMap Nominatim** — Free geocoding. Usage policy limits automated queries.

**Decision**: Use a **bundled city database** (~40K cities from GeoNames data, freely available). This eliminates API dependencies, provides instant autocomplete, and includes timezone information. Supplement with a timezone lookup library for historical timezone accuracy.

### Chart Rendering

1. **SVG (hand-crafted)** — Full control over appearance, crisp at any size, animatable, accessible via DOM
2. **Canvas** — Good for complex rendering but loses resolution on zoom
3. **D3.js** — Powerful but heavyweight for this use case
4. **Chart.js** — Not suited for circular astrological charts

**Decision**: Hand-crafted **SVG** rendered via React components. Full control over styling, crisp rendering, and can be interactive (hover for planet info, click for aspect details).

### Interpretation Approach

1. **Static interpretation database** — Pre-written text for every combination
   - Pros: No API costs, instant, works offline
   - Cons: Combinations explode (12 signs × 12 houses × 10 planets × aspects = thousands of entries)
   - Feasible for planet-in-sign and planet-in-house (240 entries)

2. **Template-based generation** — Structured templates with variable slots
   - Pros: Manageable content, some personalization
   - Cons: Can feel formulaic

3. **AI-powered synthesis (OpenAI API)** — Send chart data, get natural language reading
   - Pros: Nuanced, contextual, can weave multiple factors together
   - Cons: API cost, latency, requires API key

**Decision**: **Hybrid approach**. Build a comprehensive static interpretation database for individual placements (planet in sign, planet in house, aspect interpretations). Use structured templates to combine them. Provide an **optional** OpenAI integration for a synthesized narrative reading that considers all factors holistically. The static database ensures the app works without any API key, while the AI layer adds depth when available.

### Timezone Handling

Historical timezone data is critical for accurate birth charts. A birth in New York in 1985 vs 2020 might have different UTC offset rules.

- **Intl.DateTimeFormat** — Built-in browser API, uses IANA timezone database
- **luxon** — DateTime library with excellent timezone support
- **Timezone from coordinates** — Need lat/lng → IANA timezone mapping

**Decision**: Use the bundled city database that includes IANA timezone identifiers. Use the browser's `Intl` API for timezone offset resolution at the specific birth date/time.

## Key Astrological Concepts to Implement

### Must-Have Calculations
- All 10 classical planets (Sun through Pluto) in zodiac signs and degrees
- Ascendant (ASC) and Midheaven (MC)
- All 12 house cusps (Placidus house system)
- North Node (Mean or True)
- Major aspects: conjunction (0°), sextile (60°), square (90°), trine (120°), opposition (180°)
- Minor aspects: quincunx (150°), semi-sextile (30°)

### Must-Have Interpretations
- Sun sign, Moon sign, Rising sign (the "Big Three")
- Each planet in its sign
- Each planet in its house
- Major aspects between planets
- Element distribution (Fire/Earth/Air/Water)
- Modality distribution (Cardinal/Fixed/Mutable)
- Chart shape/pattern (if detectable)
- Dominant planet analysis

### Nice-to-Have
- Chiron placement
- Part of Fortune
- Retrograde indicators
- Aspect patterns (Grand Trine, T-Square, Grand Cross, Yod)
