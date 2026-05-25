# Taleb's Risk Review — Sprint 0023: Tarot Module

*Nassim Nicholas Taleb. May 2026.*

---

## Opening Observation

The sprint vision is written with the confidence of someone who has never experienced a Black Swan. Everything is described as "battle-tested," "mature," "stable," "already working." This is precisely the language people use before something breaks spectacularly. Let me be the person in the room who asks what happens when the assumptions fail — not to be contrarian, but because robustness is built in the design phase, not patched in after the outage.

---

## 1. The 78-Card AI-Free Layer: The Largest Hidden Fragility

The vision states: "The AI-free interpretation layer must be complete for all 78 cards. This is non-negotiable." But the spec then proposes to build this in a single sprint alongside animated card flips, a Celtic Cross UX with progressive reveals, saved readings, a new DB table, subscription gating, and a full GPT synthesis layer.

This is the most dangerous assumption in the entire sprint: that completeness and quality can be delivered simultaneously across 78 cards × (upright meaning + reversed meaning + emotional interpretation + practical guidance + reflection question + numerology resonance + astro connection) in the same time budget as the visual and infrastructure work.

The data file proposed is `src/data/tarot/cards.ts`. If this file ships with 22 Major Arcana and placeholder stubs for the Minor Arcana — which is the path of least resistance under sprint pressure — the "AI-free instant interpretation" marketing claim collapses into a lie. Every reading where a Minor Arcana card is drawn (56 of 78 cards — 72% of the deck) would silently degrade. Users would receive empty fields or worse, reused text. There is no circuit breaker in the proposed architecture for a partially-populated card database.

**What breaks:** `computeInstantInterpretation()` in `src/engine/tarot.ts` calls into `cards.ts`. If a card record is missing `reversedMeaning` or `reflectionQuestion`, the component either renders null, crashes, or renders stale fallback text. None of these is acceptable for a feature positioned as "instant, reliable, offline-resilient."

**My proposal:** The 78-card data layer must be treated as a separate, completeness-verified deliverable — not bundled into a UI sprint. It should ship with a compile-time assertion or a unit test that verifies every card ID has all required fields populated with non-empty strings. A test file at `src/data/tarot/__tests__/cards.completeness.test.ts` that iterates all 78 entries and asserts field presence is cheap insurance. Without it, the "non-negotiable" standard will be violated silently.

---

## 2. The `transitAdaptations.ts` Lookup Table: Combinatorial Incompleteness

The sprint specifies a static lookup table of card × transit combinations: `src/data/tarot/transitAdaptations.ts`. The vision gives one example: The Hermit × Mercury retrograde. This is elegant in theory.

The problem is the combinatorial space. There are 78 cards × roughly 10 transit planets × 12 possible transit types (conjunction, square, trine, opposition, sextile, quincunx, direct, retrograde, ingress, etc.) — easily 5,000+ combinations. In practice the team will build the 20 most obvious mappings, ship it as "complete," and the `computeInstantInterpretation()` engine will fall through to a default path for 99% of actual readings.

This is not catastrophic — the fallback to generic card meaning is acceptable. What is fragile is if the code is written as though the lookup table is comprehensive. If the engine says "transit connection: Uranus trine natal Moon" and the lookup table has no match, it must not output an empty `transitConnection` field in the interpretation UI. It must degrade gracefully to the card's baseline astro connection from `astroConnections.ts`.

The spec does not define the fallback chain. This is an omission that will produce silent holes in the output.

**My proposal:** The `computeInstantInterpretation()` function must implement a three-level fallback: (1) card × specific transit match from `transitAdaptations.ts`, (2) card × transit planet match (ignoring aspect type), (3) card's baseline element/planet connection from `astroConnections.ts`. Every call must return a non-empty `transitConnection` string. Add a test that calls `computeInstantInterpretation()` with a random card + a transit combination not present in the table and asserts the output is complete.

---

## 3. The GPT Synthesis Layer: Failure Mode Is Not Designed

The existing GPT infrastructure in `server/services/gpt.ts` and `server/routes/gpt.ts` has a well-designed retry mechanism (`retryWithBackoff`, 3 attempts, exponential backoff), slot release on 5xx, and a 503/504 error path. This is good work. But the Tarot module introduces a new failure mode that the existing pattern does not handle: **the reading is partly visible when GPT fails**.

For transit readings and solar returns, GPT failure means the user sees an error state and the reading is not shown. The user presses retry. Clean.

For Tarot, the design is: (1) card is drawn and revealed, (2) instant interpretation renders immediately, (3) GPT synthesis loads asynchronously in `TarotSynthesisPanel.tsx`. If GPT fails after step 2, the user has a revealed card, an instant interpretation, and a broken synthesis panel. This is a fundamentally different UX failure mode. The question the spec does not answer is: **what does the synthesis panel show on GPT failure?**

If it shows a spinner that never resolves, the user is trapped. If it shows a generic error string ("GPT unavailable"), that is inconsistent with the ritual experience. If it silently hides the synthesis section, the user loses value they may have paid for.

**The Celtic Cross is worse.** Ten cards revealed. If GPT synthesis fails after a 60-second progressive reveal experience, the user has invested significant emotional and time capital and receives nothing in return for the "constellation reading" moment. The `RateLimitError` from `src/services/gptInterpretation.ts` already throws with tier information — the Tarot synthesis handler must catch this specifically and show the upgrade prompt rather than a broken spinner.

**My proposal:** `TarotSynthesisPanel.tsx` must implement four explicit states: loading (skeleton), success, GPT unavailable (graceful degradation to enhanced instant interpretation with a "Synthesis unavailable — try again" retry button), and rate-limited (opens `UpgradeModal`). The AI-free synthesis from `computeThreeCardSynthesis()` must be surfaced as the fallback — not hidden. A reading that works without AI is a feature, not a consolation prize.

---

## 4. The Saved Readings Schema: Data Integrity Risks

The vision proposes a new table in `server/db.ts` — let me call out what is not said.

The proposed schema stores: "drawn cards + reversals, spread mode, user question/intention, astro context snapshot (natal chart fingerprint, transit snapshot date, numerology day), full interpretation payload, created timestamp, optional journal entry linkage."

Three concrete risks:

**Risk 1: Schema migration fragility.** The existing `db.ts` uses `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` wrapped in try/catch for additive migrations. This pattern works for single columns. A new table is created via `CREATE TABLE IF NOT EXISTS` in the main `instance.exec()` block. If the readings table schema changes between sprint iterations — which it will, because the interpretation payload shape will evolve — there is no migration versioning. The `entries` table has already been through exactly this problem, which is why `SYNASTRY_CACHE_VERSION = 2` exists in `appState.ts` with explicit version guards. The readings table will need the same discipline from day one.

**Risk 2: The `full interpretation payload` column.** If this is stored as a serialized JSON blob in a TEXT column (the pattern used in the `entries` table for `metadata`), then when the `InstantInterpretation` or `TarotSynthesis` type shape changes, old saved readings become unreadable unless the deserializer is versioned. The existing `entries` metadata field has this problem today — it works because entry metadata is simple. A full tarot reading interpretation is not simple.

**Risk 3: Journal linkage as a foreign key.** If `optional journal entry linkage` is implemented as a FK to `entries(id)`, and the user deletes the journal entry, the reading's linkage becomes a dangling reference (even with `ON DELETE SET NULL`, the UI must handle null gracefully). If it is not a FK and is stored as a raw ID string, it silently becomes invalid. Neither option is specified.

**My proposal:** (a) The readings table must include a `schema_version INTEGER DEFAULT 1` column from the first migration. Deserializers must check this version. (b) The journal linkage must be an explicit `journal_entry_id TEXT REFERENCES entries(id) ON DELETE SET NULL` with `ON DELETE SET NULL`. The UI must handle `journal_entry_id = null` as a normal case. (c) The full interpretation payload column must store a tagged union: `{ version: number, payload: ... }` so future migrations can identify and transform old records.

---

## 5. The Subscription Gate: Edge Cases That Will Produce Real Support Tickets

The current `gptRateLimit.ts` is a single counter: `gpt_usage(user_id, date, count)`. The Tarot module proposes to add tarot-specific limits on top of this:

- Free: 1 card draw per day, 1 three-card reading per week
- Advanced: unlimited

The existing counter is **per-day and type-agnostic**. A free user who hits their transit reading limit today also cannot get their single daily Tarot card. This is the current behavior and it is already punitive. Adding Tarot limits means either: (a) sharing the existing counter (Tarot draws consume the same daily budget as transit readings, which will confuse users and produce complaints), or (b) creating separate counters per feature type (requires schema changes and new middleware logic).

The vision says "The existing `gptRateLimit` middleware and `UpgradeModal` pattern must be extended to handle Tarot-specific limits." This sentence is doing a lot of work. "Extended" could mean anything.

The weekly limit for three-card readings is particularly fragile. The existing counter is daily. A weekly counter requires either: (a) a new `tarot_weekly_usage` table, or (b) querying the last 7 days of `gpt_usage` and summing — which is a range query, not a point lookup, and breaks the O(1) performance guarantee of the current prepared-statement cache in `gptRateLimit.ts`.

**My proposal:** The sprint must specify exactly which counter mechanism implements each Tarot gate *before* implementation begins. My recommendation is a separate `tarot_usage` table with columns `(user_id, date, daily_cards, weekly_cards_week_start)` where `week_start` is the ISO week's Monday date. This keeps each gate atomic and avoids modifying the existing GPT usage counter that already works for paying users.

---

## 6. The Single Point of Failure Nobody Is Talking About: `src/data/tarot/cards.ts`

The entire AI-free layer — which is the feature's claimed reliability guarantee — depends on a single TypeScript file containing 78 hand-authored card records. This file does not yet exist. It must be written by a human, validated by a human, and will inevitably contain:

- Subtle differences in quality between cards written first (The Fool, The Magician) and cards written last (Four of Pentacles, Seven of Swords)
- Minor Arcana cards that received three minutes of attention versus Major Arcana that received thirty
- Copy-paste errors in `numerologyResonance` fields
- Missing `reflectionQuestion` entries on cards where the author ran out of inspiration

The spec calls this layer "the consistent symbolic foundation." But a hand-authored 78-entry database under time pressure is neither consistent nor a foundation — it is a fragile artifact.

I am not saying don't build it. I am saying: treat the quality of this database as a first-class risk, not a background task. The vision's quality bar says "every card must have upright and reversed meanings, an emotional interpretation, a practical guidance line, a reflection question, and a numerology resonance note." This is measurable. Measure it programmatically. The compile-time assertion I proposed above is not optional.

---

## 7. What Everyone Is Excited About That They Shouldn't Be: The Deterministic Seed

The vision specifies: `drawCards(n: number, seed?: string): TarotCard[]` — "deterministic card draw that uses the user's natal chart data as a seed component so draws are not purely random."

This sounds profound. "Your natal chart determines your cards." In practice, this means: if the same person draws a daily card twice in the same day, they always get the same card. If the seed is based on birth data + date, the card for any given day is pre-determined. The randomness is an illusion.

This is not necessarily bad, but it has an unexamined consequence: **a determined user can reverse-engineer what card they will get tomorrow by inspecting the seed algorithm.** More importantly, if the seed is weak (e.g., just `birthdate + today's date` as a string, hashed naively), users with similar birth dates will draw similar cards. Two users born on the same day will always draw the same card on the same day.

Is this a problem? It is a business risk if users discover it and feel the "personalization" is an illusion. It is a UX risk if a user draws "The Tower" every Monday for three months because the seeding algorithm has a harmonic with weekly periodicity.

**My proposal:** The seed must incorporate enough entropy to avoid calendar harmonics. At minimum: SHA-256(userId + birthDate + currentDate + spreadType). The userId prevents same-birthday collisions. Test for calendar periodicity explicitly: for 10 test users, verify that their Monday cards over 4 weeks are not identical.

---

## 8. The `AppState` Bloat Risk

I am looking at `src/context/appState.ts`. This file already contains state for: form, birth data, chart, aspects, reading, transit (×5 fields), synastry (×8 fields), synastry transit (×4 fields), solar return (×4 fields), storage warning. It is 414 lines and growing.

The vision proposes adding to `AppState`: "current reading type, drawn cards, interpretation results, saved reading IDs." This is at least 8–12 new fields.

The `AppState` is already a God Object. Every component that calls `useAppState()` receives a reference to this entire object. Adding 10 Tarot fields means every component re-renders when any Tarot field changes, even components that have nothing to do with Tarot.

The existing transit, synastry, and solar return state is already a performance debt. Tarot will make it worse unless it is put in a separate context.

**My proposal:** Tarot reading state must live in a dedicated `TarotContext` (analogous to how `AuthContext.tsx` is separate from `AppContext.tsx`). The `AppState` should only hold `tarotView: TarotView | null` to know whether Tarot is active. This is not premature optimization — it is standard React architecture. Adding 10 more fields to `AppState` now will make the sixth sprint that touches this file the sprint that causes a mysterious re-render cascade that takes two days to diagnose.

---

## 9. The Discuss ✦ Context Payload: Token Explosion

The vision mandates: "all drawn cards with positions and reversal states, the full instant interpretation, the GPT synthesis if loaded, natal chart positions (Big Three + houses), current transits, numerology personal day/year, advance category signal, and the user's stated reading question/intention."

For a Celtic Cross reading: 10 cards × (card name + position name + reversal + upright meaning + reversed meaning + emotional meaning + practical guidance + reflection question + numerology resonance + transit connection) — that is easily 5,000–8,000 tokens of context before the system prompt, natal chart, and transits are added. Add GPT synthesis (which could be 1,000–2,000 tokens), natal chart (300–500 tokens), transits (300–500 tokens), and the user's question — we are approaching the context limit of `gpt-4o-mini` (128k tokens technically, but the cost and latency at 10,000 tokens per call is non-trivial).

The existing `callOpenAI()` in `server/services/gpt.ts` uses `max_tokens: 2000` by default. A `tarot-discuss` response budget of 2,000 tokens against a 10,000-token context is a 20% response-to-context ratio. This is fine for quality but expensive.

The existing session call counter `_sessionCalls` in `gptInterpretation.ts` does not distinguish between a 300-token `daily-snapshot` call and a 10,000-token `tarot-discuss` call. The rate limit treats them identically. This is a hidden cost asymmetry.

**My proposal:** (a) The `tarot-discuss` handler must use a summarized context, not the full raw interpretation payload. The `TarotDiscussModal.tsx` should send a `discussContext` string — pre-serialized on the client — not the raw nested objects. (b) The `callOpenAI()` invocation for `tarot-celtic-synthesis` and `tarot-discuss` must explicitly set `max_tokens: 3000` and `max_tokens: 1500` respectively, not inherit the 2,000 default. These are different use cases with different output length requirements.

---

## 10. The Visual Asset Decision: The Unresolved Risk

The vision says: "Options: (a) SVG card faces designed in code, (b) a curated open-license deck (e.g., Rider-Waite in public domain), (c) symbolic placeholder cards with rich CSS treatment." This decision is left as "the proposal for this area must make a concrete decision."

I will make the decision: **option (b) is a legal trap and option (a) is a scope explosion.**

The Rider-Waite deck is in the public domain — but only the original 1910 printing. Colored versions, digitized versions, and "Rider-Waite-Smith" reproductions with any modifications may carry copyright. The copyright status varies by jurisdiction. Using "public domain Rider-Waite" images downloaded from the internet without verifying the specific source's licensing is asking for a DMCA notice in production.

Option (a), SVG card faces designed in code, is the right long-term answer — but it is not a sprint task, it is a design project. Full custom SVG card art for 78 cards is weeks of work, not days.

**My proposal:** Ship sprint 0023 with option (c) — symbolic CSS cards with rich treatment — explicitly named as the v1 visual implementation. Define the visual spec for these cards precisely (card dimensions, gradient backgrounds per suit/arcana, symbolic icon, gold border treatment, typography for card name). Make the card face component accept a future `imageUrl` prop so option (b) or (a) can be injected later without a component rewrite. Do not let the visual asset decision block the module from shipping. Beautiful CSS cards that render reliably are better than a legal dispute or a scope explosion.

---

## 11. The Server Architecture: What Happens When `handleGptRequest` Becomes 18 Cases

Currently `handleGptRequest` in `server/services/gpt.ts` has 15 `case` branches. The Tarot module adds 4 more: `tarot-single-synthesis`, `tarot-three-synthesis`, `tarot-celtic-synthesis`, `tarot-discuss`. That is 19 cases in a single switch statement dispatching to a single file that is already 1,019 lines.

This is not a catastrophic problem yet, but it is the file where the next sprint's bug will be introduced by a developer who edits line 400 without reading line 800. The `gpt.ts` service file is becoming a monolith.

**My proposal:** Extract Tarot GPT handlers to `server/services/gptTarot.ts` and import them into `handleGptRequest`. The pattern already exists: the synastry handlers could have been in `gptSynastry.ts`. This is a 30-minute refactor that prevents a 3-hour debugging session six sprints from now.

---

## 12. The Rate Limit Bypass: The Localhost Gate Is Wider Than It Looks

In `gptRateLimit.ts` line 110:

```typescript
if (process.env.NODE_ENV !== 'production' && LOCALHOST.has(req.ip ?? '')) {
  next()
  return
}
```

And in `TIER_LIMITS`:

```typescript
const TIER_LIMITS: Record<Tier, number> = {
  free: 10000,
  basic: 10000,
  advanced: 10000,
}
```

This is labeled "TEST MODE: limits raised to 10000 for all tiers — effectively disabled." The comment says TEST MODE but this is committed to the main branch and will be in production unless explicitly changed before deploy. The same pattern appears in `auth.ts` line 26: `const TIER_LIMITS: Record<string, number> = { free: 200, basic: 200, advanced: 200 }`.

These are not test-mode guards. They are production configuration values that happen to be set to testing values. There is no `if (NODE_ENV !== 'production')` guard on the TIER_LIMITS constants. If this ships to production as-is, the entire rate limiting and subscription monetization model is disabled.

This is not new — it presumably already exists in production. But the Tarot module will add new Tarot-specific limits, and if those are also initialized as 10000 "for testing," the subscription gate for Tarot will not work on day one.

**My proposal:** Before adding any Tarot-specific limits, the existing TEST MODE constants must be resolved. Either: (a) move actual production limits to environment variables (`TIER_LIMIT_FREE=3`, `TIER_LIMIT_ADVANCED=20`) with the 10000 values only in `.env.test`, or (b) gate the 10000 values explicitly behind `NODE_ENV !== 'production'` checks. This is a security issue masquerading as a configuration issue.

---

## Summary of Proposals

| # | Area | Proposal | Priority |
|---|------|----------|----------|
| 1 | Cards data layer | Compile-time completeness assertion for all 78 cards | Critical |
| 2 | Transit adaptations | Three-level fallback chain in `computeInstantInterpretation()` | High |
| 3 | GPT synthesis failure | Four explicit states in `TarotSynthesisPanel`: loading, success, unavailable, rate-limited | Critical |
| 4 | Saved readings | Schema versioning column + typed payload serialization + FK discipline | High |
| 5 | Subscription gating | Separate `tarot_usage` table with daily/weekly counters | High |
| 6 | Cards data quality | Treat database authoring as a first-class deliverable, not background work | Critical |
| 7 | Deterministic seed | Incorporate userId + birthDate + date + spreadType; test for periodicity | Medium |
| 8 | AppState growth | Isolate Tarot state in `TarotContext`, not `AppState` | High |
| 9 | Discuss context payload | Pre-serialize context client-side; set explicit `max_tokens` per handler | Medium |
| 10 | Visual assets | Ship CSS symbolic cards as v1; accept `imageUrl` prop for future upgrade | High |
| 11 | GPT service monolith | Extract Tarot handlers to `server/services/gptTarot.ts` | Medium |
| 12 | Rate limit TEST MODE | Gate 10000 limits behind `NODE_ENV` check before Tarot limits ship | Critical |

---

## Final Observation

The sprint vision is ambitious, well-structured, and shows genuine understanding of the product. What it lacks is a failure budget. Every feature is described by its happy path. The Tarot module will be used by real users who have slow connections, hit their rate limits, draw the Seven of Swords on a bad day, try to save a reading while their session has expired, and open a saved Celtic Cross from six months ago against a schema that has since changed.

Robustness is not a feature you add later. It is the only feature that matters when everything else breaks.

Build the failure paths before you build the animations.
