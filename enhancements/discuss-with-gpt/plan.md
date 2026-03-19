# Enhancement: Discuss with GPT Modal

## What Exists Today
- **ResultsPage** ([src/components/results/ResultsPage.tsx](src/components/results/ResultsPage.tsx)): Displays birth chart, reading summary, planet positions, aspects, element/modality balance.
- **TransitReadingPage** ([src/components/results/TransitReadingPage.tsx](src/components/results/TransitReadingPage.tsx)): Displays transit reading, transit aspects to natal, sign changes, retrograde activity, current planets.
- **GPT Service** ([src/services/gptInterpretation.ts](src/services/gptInterpretation.ts)): Existing `getGptInterpretation()` that calls OpenAI API with a system prompt and user prompt.
- **App State** ([src/context/appState.ts](src/context/appState.ts)): Stores `chartData`, `aspects`, `reading`, `transitData`, `transitInterpretation` in state. Birth data is cached in localStorage but chart results and transit data are NOT cached.
- **Transits engine** ([src/engine/transits.ts](src/engine/transits.ts)): `buildTransitPrompt()` builds a full astrological context string for GPT.

## What the User Wants
1. A **"Discuss" button** on both the birth chart results page and the transit reading page.
2. Clicking it opens a **modal with a chat-style prompt box** to talk to GPT.
3. When the user submits a question, the system sends **all relevant astrological data** (natal chart positions, houses, aspects, elements, modalities, transit aspects, retrogrades, etc.) as context alongside the user's question.
4. **Cache** the birth chart results and transit data in localStorage so they persist across sessions (currently only birth form data is cached).

## What Needs to Change

### New Files
- `src/components/discuss/DiscussModal.tsx` — The modal component with chat UI

### Modified Files
- `src/context/appState.ts` — Add caching for chart results and transit data
- `src/context/AppContext.tsx` — Save chart/transit results to localStorage on change
- `src/services/gptInterpretation.ts` — Add `getDiscussResponse()` for multi-turn chat
- `src/components/results/ResultsPage.tsx` — Add Discuss button
- `src/components/results/TransitReadingPage.tsx` — Add Discuss button

## Implementation Checklist

- [ ] 1. Add localStorage caching for chart results (chartData, aspects, reading) and transit data (transitData, transitInterpretation, transitPeriod) in `appState.ts`
- [ ] 2. Update `AppContext.tsx` to persist chart/transit results to cache
- [ ] 3. Add a `getDiscussResponse()` function to `gptInterpretation.ts` that accepts an array of chat messages (for multi-turn conversation)
- [ ] 4. Create `DiscussModal.tsx` — a modal with:
  - A scrollable chat area showing user messages and GPT replies
  - A text input + send button
  - A close button
  - Builds the full astrological context from cached data
  - Styled in the mystic theme
- [ ] 5. Add "Discuss ✦" button to `ResultsPage.tsx` that opens the modal (birth chart context)
- [ ] 6. Add "Discuss ✦" button to `TransitReadingPage.tsx` that opens the modal (birth chart + transit context)
- [ ] 7. Build and verify zero errors
