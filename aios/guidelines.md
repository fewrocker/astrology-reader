When evolving the product:
-> Introduce features which make the astrology suite more complete with different cross interpretations of things such as dreams, numerology, astrology, as one encompassing suite that works separately but also together
-> Every feature and design has to be beautiful and follow the majestic designs that are currently on the app, so before developing new UI, check some UI components to understand their vibe

---

## Current app capabilities (as of sprint-0003)

The app is a multi-faceted mystical suite. Features built so far:

- **Astrology** — birth chart (polar sky map with glyphs, aspects, house lines), solar return chart, transits/progressions
- **Numerology** — life path, expression, soul urge, and other core numbers; cosmic connections; cross-reading with astrology; numerology sky chart (numbers on a polar map with frequency emphasis and GPT reading); numerology chat
- **Dreams** — dream journal with persistence; GPT-powered dream readings
- **GPT readings** — woven throughout: astrology narratives, numerology narratives, cross-readings, sky chart readings

---

## Areas to explore for next sprint

These are open directions — not prescriptions. The best sprint task is the one that adds the most depth, beauty, or cohesion to the suite:

### Depth & cross-interpretation
- **Astro-dream integration** — surface which natal placements or current transits relate to recurring dream themes; let the journal inform chart readings
- **Transit awareness** — show current sky transits overlaid on the birth chart; flag major active transits that influence today's numerology or dream patterns
- **Personal year / personal month numerology** — add time-based numerology that evolves with the calendar, not just the birth date
- **Compatibility reading** — compare two birth charts or numerology profiles; GPT synthesizes a relationship reading

### Richer chart experiences
- **Progressions chart** — secondary progressions overlaid or alongside the natal chart
- **Synastry overlay** — two charts in one polar map, relationships between their planets visible
- **Aspect pattern detection** — identify Grand Trine, T-Square, Yod, etc. and highlight them visually + GPT explanation
- **Animated sky** — let the user scrub through time to see the sky at any date; show how planets have moved since birth

### UX & cohesion
- **Unified dashboard** — a "today" view that combines active transits, personal numerology for the day, and any recent dream themes in one beautiful card
- **Notification / daily insight** — morning push with today's numerology number, a dominant transit, and a short GPT sentence
- **Onboarding polish** — ensure the first-time experience for a new birth date feels magical end-to-end
- **History & timeline** — a scrollable timeline of past readings, dream entries, and significant astrological dates

### Technical quality
- **Offline resilience** — cache the last GPT reading per section so the app feels alive without a network call
- **Performance** — profile and improve chart render time, especially on lower-end devices
- **Ephemeris accuracy audit** — verify planet positions against a reference source; document any known limits

---

## Sprint selection guidance

Pick one area that feels most impactful right now. A sprint should be:
- **One cohesive feature or improvement**, not a grab-bag
- **Finished end-to-end** — designed, implemented, GPT-connected (where relevant), and looking beautiful
- Small enough to ship in a single sprint, large enough to feel meaningful
