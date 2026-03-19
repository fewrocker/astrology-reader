# Proposal: Personalized Daily Astrology Snapshot

## Problem / Opportunity

Currently the app is primarily a "generate once, read once" experience. Users enter birth data, get their chart, and leave. Astrology lovers, however, live their astrology *daily*. They check their horoscope, track the Moon, and note significant transits every morning.

A personalized daily snapshot — tailored to the user's exact birth chart, not generic Sun-sign horoscopes — would be a massive differentiator. Most free astrology apps offer generic horoscopes; very few provide a personalized daily briefing based on real transit-to-natal aspects.

## Proposed Solution

1. **Daily snapshot card**: A single, beautifully designed card that appears on the results page showing today's personalized astrological weather:
   - Current Moon phase + sign it's transiting
   - Today's most significant transit aspect to the natal chart (with brief interpretation)
   - An "energy of the day" rating (harmonious/challenging/mixed) based on aspect count
   - One actionable tip tied to the dominant transit (e.g., "Good day for important conversations — Mercury trines your natal Jupiter")
2. **Auto-refresh**: The snapshot updates automatically each day using the cached birth data.
3. **"Cosmic weather" summary**: A one-paragraph GPT-generated daily brief synthesizing all active transits into natural language (e.g., "Today favors creative work as Venus trines your natal Neptune, but watch for communication mix-ups with Mercury squaring your Moon").
4. **Quick-access from landing**: If birth data is cached, show the daily snapshot immediately on the landing page before users even navigate to full results.
5. **Notification-ready architecture**: Structure the daily data in a way that could later support push notifications or email digests.

## Impact & Effort

- **Impact**: HIGH — Transforms the app from a one-time tool to a daily companion. This is the #1 driver of retention for astrology apps.
- **Effort**: MEDIUM — Uses existing transit calculation logic for "today" + existing GPT integration for synthesis. The main work is UI design and the daily refresh mechanism.
- **Dependencies**: Transit engine, GPT interpretation service, cached birth data, lunar phase calculation (from lunar-awareness proposal).

## Implementation Summary

- New component: `src/components/reading/DailySnapshot.tsx` — daily snapshot card with Moon phase, key transit, energy rating, tip
- Modify: `src/App.tsx` — show daily snapshot on landing when birth data is cached
- Modify: `src/services/gptInterpretation.ts` — add daily brief prompt template
- Reuse: `src/engine/transits.ts` for today's transit calculations
- Optional: `src/engine/lunar.ts` for Moon phase data (if lunar-awareness proposal is implemented first)
