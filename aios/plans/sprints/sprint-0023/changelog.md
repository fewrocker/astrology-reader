# Sprint 0023 — Changelog

**Sprint focus:** Complete Tarot Module
**Merged:** 2026-05-25

---

## Features

### Tarot Data Layer (`task-0003`)
- 78-card dataset authored across Major Arcana, Wands, Cups, Swords, Pentacles
- Per-card `TarotCard` interface: upright/reversed meanings, symbolic theme, emotional meaning, practical guidance, reflection question, numerology resonance, element, ruling planet/sign
- 720+ astro connection records (`CARD_ASTRO_CONNECTIONS`) keyed by card id
- 397+ transit adaptations (`TRANSIT_ADAPTATIONS`) for key card × planet × condition combinations
- 21 spread positions across all 7 spread types (single, 5 three-card modes, Celtic Cross)
- Completeness test ensuring all 78 cards are present with required fields

### Tarot Card Visual Assets (`task-0004`)
- `TarotCard.tsx`: full SVG symbol renderer for all 22 Major Arcana and all Minor Arcana pips (1–7) and court cards; face-up/down switching, reversed rotate(-4deg) tilt, element temperature tints, glow-on-reveal overlay
- `CardReveal.tsx`: 3D Y-axis flip animation (600ms cubic-bezier, perspective 1200px), backface-visibility, stagger support
- `CardBack.tsx`: deep indigo background, 8-pointed star SVG, gold geometric frame, breathing pulse animation
- `tarot.css`: @keyframes for card-breathe, card-reveal-glow, flip scene/front/back classes, .tarot-card-sm/md/lg sizing
- Cormorant Garamond added to font preload

### Tarot Draw Ritual (`task-0006`)
- `TarotIntentionScreen.tsx`: intention chips (love, growth, career, decision, spiritual, relationship), custom text input, mode selection
- `DeckShuffleAnimation.tsx`: multi-phase shuffle with fan/collapse/merge sequences
- `TarotModeSelector.tsx`: single / three-card / Celtic Cross mode selection with descriptions
- `RitualFadeOverlay.tsx`: atmospheric transition overlay

### Tarot Engine (`task-0007`)
- `src/engine/tarot.ts`: deterministic draw (Fisher-Yates LCG, seed-derived), reversal assignment (30% probability), `buildTarotAstroContext` (natal element/modality, transits, retrogrades, lunar phase), `computeInstantInterpretation` (three-level fallback: transit adaptation → element affinity → baseline astro note), `computeThreeCardSynthesis` (structural signal pre-computation)
- `src/engine/__tests__/tarot.test.ts`: determinism, reversal rate, three-level fallback, personal day resonance, synthesis structural signals

### Tarot GPT Synthesis (`task-0008`)
- `server/services/gptTarot.ts`: 4 handlers — `handleTarotSingleSynthesis` (400 tok), `handleTarotThreeSynthesis` (800 tok), `handleTarotCelticSynthesis` (3000 tok), `handleTarotDiscuss` (1500 tok)
- Client payload types: `TarotCardPayload`, `SpreadPositionPayload`, `TarotSingle/Three/CelticSynthesisPayload`, `ThreeCardSignals`
- `getTarotSingleSynthesis`, `getTarotThreeSynthesis`, `getTarotCelticSynthesis`, `getTarotDiscussResponse`, `buildTarotDiscussContext` added to `gptInterpretation.ts`
- `gpt_usage.request_type` column migration for request tracking

### Tarot Navigation & Entry (`task-0009`)
- `'tarot'` added to `AppView` union in `appState.ts`
- `TarotContext.tsx`: reducer-based state machine with `TarotAction` discriminated union, full `TarotState` (subView, readingMode, drawnCards, reversals, interpretations, spreadMode, gptSynthesis, savedReadings)
- `TarotPage.tsx`: module root, `TarotProvider` mount, sub-view router, astro context builder
- `TarotHomeView.tsx`: intention chips, custom text input, mode selection
- `ReadingsModal.tsx`: Divination group with Tarot Reading entry (violet accent, Layers icon)
- `App.tsx`: wired `state.view === 'tarot'` to `TarotPage`

### Tarot Saved Readings (`task-0010`)
- `readings` table: id, user_id, reading_type, spread_mode, first_card_name, intent_preview, cards (JSON), synthesis, schema_version, journal_entry_id, created_at
- `server/routes/readings.ts`: POST /api/readings (save), GET /api/readings (list), GET /api/readings/:id (fetch), DELETE /api/readings/:id
- `src/services/readingsService.ts`: client-side service with `saveReading`, `getReadings`, `getReading`, `deleteReading`
- `SavedReadingsPage.tsx`: reading list, full reading replay, delete confirmation

### Tarot Single Card Reading (`task-0011`)
- `SingleCardReading.tsx`: card display with identity header, back navigation, save action
- `TarotInterpretationPanel.tsx`: instant interpretation display (core meaning, symbolic theme, emotional meaning, practical guidance, reflection question, numerology resonance, personal day match highlight)
- `SingleCardSynthesisPanel.tsx`: GPT synthesis with 30s timeout, loading variants, rate-limit and session-expired error states, Discuss ✦ entry

### Tarot Subscription Gate (`task-0012`)
- `tarot_usage` table: user_id, date, week_start, daily_cards, weekly_three_card (PRIMARY KEY user_id × date)
- `server/routes/tarot.ts` + gate middleware: per-tier daily card and weekly three-card limits enforced server-side
- `useTarotGate` hook: client-side gate check with upgrade modal trigger

### Tarot Celtic Cross Reading (`task-0005`)
- `CelticCrossReading.tsx`: 10-position Celtic Cross state machine, progressive reveal (positions 1–2 together, 3–10 individually), 3-second mandatory hold, cross/staff transition text, fire-early-display-late GPT synthesis (fires at card 7), 8-chapter synthesis with 1200ms sequential arrival, all four error states, background temperature shift, keyboard/screen-reader accessibility
- `CelticCrossCard.tsx`: positional card for Celtic Cross grid (face-up/down, crossing rotate, active pulsing)
- `CELTIC_CROSS_POSITIONS`: 10-position data with CSS gridArea for layout
- `TarotSynthesisPanel.tsx`: chapter-based synthesis display with auto-scroll to latest chapter
- `TarotDiscussPanel.tsx`: tarot discuss chat panel

### Tarot Three Card Reading (`task-0013`)
- `ThreeCardReading.tsx`: sequential reveal, 5 spread modes (past/present/future, situation/challenge/advice, mind/heart/action, self/other/bridge, theme/shadow/gift), full synthesis
- `src/types/tarot.ts`: shared types for three-card reading components

---

## Bug Fixes

### Rate Limiter Test Mode (`task-0001`)
- `gptRateLimit.ts`: `TIER_LIMITS` wrapped in `NODE_ENV !== 'production'` guard — test values (10000) only active outside prod; production enforces free:3 / basic:20 / advanced:100
- `rateLimiter.ts`: `authRateLimiter` max gets same treatment (10 in prod, 10000 in dev)
- `auth.ts`: `TIER_LIMITS` production guard added

---

## Code Refactoring

### TarotContext isolation (`task-0002`)
- `TarotContext.tsx` created: TarotState, TarotView, TarotReadingType, all actions isolated from AppState
- `App.tsx` and `appState.ts` wired to mount TarotProvider and route to tarot view
