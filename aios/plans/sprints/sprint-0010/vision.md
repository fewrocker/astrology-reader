# Sprint 0010 Vision — The Depth Sprint

## Sprint Focus

Sprint-0010 makes the existing readings feel like they know you. Every screen in the app already has the data — positions, aspects, orbs, house placements, energy ratings — but most surfaces present that data as information rather than insight. This sprint closes that gap: the same data, rendered as a personal narrative that a thoughtful astrologer would deliver, not a database printout.

## Why Now

Sprint-0009 completed the commercial foundation: users can pay, tiers are enforced, analytics are running. The app now has a monetization surface to defend. Sprint-0008 delivered the home screen dashboard and the readings navigation modal — every feature is reachable. Sprint-0007 moved all GPT calls to the server and established the proxy infrastructure.

The result is a product that is architecturally complete but experientially shallow. The transit reading lists `Transit Venus △ Natal Moon (3.2° orb, harmonious, separating)` — and stops there. The DailySnapshotCard shows an energy score of 4/5 dots and one key aspect pill reading `Key: Mars ☍ natal Sun` with no interpretation. The TransitTimeline generates event cards with `detailText` from a static brief lookup, completely ignoring the user's natal positions. The journal pattern panel reads "Jupiter at Your Thresholds" as a section heading but the body text was generated without knowing which house Jupiter rules for this person.

Users are hitting the GPT limit (we now track this), which means they are engaged. The question is whether those GPT responses are good enough to justify the upgrade. Right now the GPT text is structurally isolated — it appears as a paragraph block above or below the data tables, with no connection to the rows the user is looking at. A user who sees `Saturn square natal Mercury` in the transit aspects table has no way to connect that row to the paragraph that mentions "communication challenges" three paragraphs down. The data and the interpretation are two separate documents placed on the same page.

This is the right moment to deepen. The infrastructure is stable. The users are there. The GPT calls are happening. The question is whether the calls — and the surrounding UI — are doing justice to what the data actually contains.

## Where to Look

### 1. Transit Aspect Rows — `src/components/results/TransitReadingPage.tsx` (`TransitAspectsSection`)

Each aspect row currently shows: planet glyphs, aspect symbol, planet names, orb, applying/separating badge. Nothing about what it means for this person.

The target: clicking or expanding an aspect row reveals a one-to-two sentence interpretation that combines the transit planet's nature, the natal planet's house and sign placement, and the aspect type. For example: "Saturn crossing your 7th-house Moon asks you to examine the emotional contracts you've outgrown" — not "Saturn square Moon (challenging)." The data to compute this already exists — `natalPlanet` comes with its house and sign from the natal chart in `state.chartData`. A lookup into `src/data/interpretations/` for planet-in-house context plus aspect nature is sufficient for a meaningful inline brief; the full GPT block handles synthesis.

### 2. DailySnapshotCard — `src/components/reading/DailySnapshotCard.tsx`

The energy dot row and the "Key aspect" pill are the most visible ambient signal on the home screen — the first thing a returning user sees every day. Currently, the "key aspect" pill reads `Key: Mars ☍ natal Sun` — bare symbol and planet names. The pill's `topAspect` has full data: `transitPlanet`, `natalPlanet`, `orb`, `nature`, `applying`. The energy rating has a `label` ("Intense", "Flowing", etc.).

The target: the key aspect pill becomes a one-line reading. "Mars opposing your natal Sun — a day for assertion, not accommodation." The `ASPECT_KEYWORDS` map already exists in `src/components/reading/TodayPage.tsx` and could be extended or referenced. The moon pill already shows phase name and void status; it could add a brief note ("decisions made now may need revisiting") on void-of-course days without a GPT call.

### 3. TransitTimeline Event Cards — `src/components/reading/TransitTimeline.tsx` + `src/data/interpretations/transitEvents.ts`

The timeline is the most data-dense feature in the app. Each `EventCard` renders a `detailText` from `getAspectPerfectionBrief(aspectType, secondPlanet)` — a static lookup that knows the *transit* planet but not the user's *natal* planet placement. An aspect-perfection event like "Mercury trine natal Venus" currently gets the same brief regardless of whether the user's Venus is in the 2nd house (money, values) or the 7th (partnership). The natal chart is available in `state.chartData` at the `TransitReadingPage` level and is already passed down through the component tree.

The target: `getAspectPerfectionBrief` (or a new `getPersonalizedEventBrief`) receives the natal planet's house — and the brief becomes house-aware. "Mercury trine your 7th-house Venus: a good day for a direct conversation with someone close." This is a pure data-lookup enhancement — no additional GPT call needed, no rate-limit cost. The static interpretation database at `src/data/interpretations/` already has house-specific themes.

### 4. Synastry Aspect Rows — `src/components/results/SynastryPage.tsx` (`SynastryAspectsSection`)

The synastry page lists cross-chart aspects as `P1 Venus trine P2 Moon` — the same mechanical row format as transit aspects. But synastry is the most emotionally charged reading in the app. A user who pays to see how their chart relates to a partner's chart is expecting something personal, not a database dump.

The target: each synastry aspect row has an inline brief tied to the planet pair and the aspect type — "Venus trine Moon: your affection lands gently, and they feel it without needing proof." The static interpretation database already has planet-pair aspect entries (`src/data/interpretations/`); the synastry engine has the data. The gap is purely in `SynastryAspectsSection`'s render logic — it shows the row but doesn't reach into interpretations.

### 5. AdvanceTab Future-Date View — `src/components/reading/AdvanceTab.tsx`

The AdvanceTab lets users scrub to a future date and see what the transit chart looks like then. It pre-calculates snapshots (up to 30 daily, 52 weekly, 36 monthly) and renders a transit chart wheel and aspect list for the selected date. Currently the tab shows raw aspect rows for the future date — same format as the current-transit aspects table.

The target: when the user lands on a future date that is a "power day" equivalent (3+ tight aspects, or a notable single aspect like Saturn conjunct natal MC), a contextual banner appears above the aspect list: "This date has significant energy for career decisions — Saturn exactly reaches your Midheaven." This does not require GPT; it is a computed annotation. The AdvanceTab already has `transitAspects` and `retrogrades` for each snapshot; detecting notable configurations is algorithmic.

### 6. GPT Prompt Quality — `server/services/gpt.ts` + `src/services/gptInterpretation.ts`

All GPT prompts are built server-side in `server/services/gpt.ts`. Reading the prompts reveals a pattern: they send correct data but ask generic questions. The transit prompt asks GPT to "write a personalized transit reading" — without specifying the user's dominant element, without noting which house each transiting planet occupies, without flagging the tightest applying aspect as the one to lead with.

The target: prompt engineering within existing calls (no new endpoints, no new rate-limit cost). Each prompt type gains a structured instruction header that tells the model what to prioritize — tightest orbs first, house-specific language mandatory, no generic zodiac-sign clichés. The daily snapshot prompt at `src/components/reading/DailySnapshotCard.tsx:buildSnapshotPrompt` already has good structure; the transit and synastry prompts in `server/services/gpt.ts` can be brought to the same standard. Concrete: add "Lead with the tightest applying aspect. Name the house it touches. Avoid sign-only interpretations like 'as a Scorpio.' Write as if you know this person." to each transit and synastry system prompt.

### 7. Journal Entry Sky Context on Cards — `src/components/journal/JournalEntryCard.tsx`

Journal entry cards show tags (breakthrough, grief, decision) and a GPT annotation. The annotation is generated at write time and references transits active at that moment. But the *displayed* card does not show the sky context that was recorded — the moon phase, the personal day, the top transit active at entry time — even though that data is computed and stored in the entry metadata.

The target: each `JournalEntryCard` renders a compact sky strip below the tags, drawn from the entry's stored sky context (moon phase emoji + sign, top transit planet + aspect symbol + natal planet, personal day number). This requires no GPT call and no new server endpoint — the data is either stored or can be recomputed from the entry's date and the user's natal positions. This makes the journal look like an annotated sky diary rather than a text editor with tags.

## Quality Bar

"Deep" for this sprint means: a user who opens the transit reading can understand what each aspect means for their specific life areas — without reading the GPT paragraph first. The data rows are self-explanatory. When they then read the GPT paragraph, it feels like synthesis rather than repetition, because the rows have already handled the mechanical layer.

"Deep" for the DailySnapshotCard means: a user who checks the home screen at 8am can read the key aspect pill and understand in one sentence what kind of day they're walking into — without opening any reading at all.

"Deep" for the synastry page means: the aspect list alone tells a story about the couple's dynamic. A user can read down the synastry aspects list and emerge with a feel for the relationship's texture — not just a list of geometric relationships between two circles.

"Deep" for the journal means: reopening an old entry from six months ago shows the sky that was present when you wrote it — the moon was waning in Scorpio, Mars was crossing your 4th house. The entry becomes a time-stamped sky record, not just a private text document.

"Shallow" is: a new GPT call added to a page that already has one. "Shallow" is a new feature that doesn't exist yet. "Shallow" is a UI redesign that moves boxes around without making the content more meaningful. Every task in this sprint should be completable by making existing data more legible — through better render logic, better static interpretations, or better prompt structure.

## What This Sprint Is NOT

- **Not new reading types.** No new screens, no new navigation items in `ReadingsModal.tsx`, no new GPT endpoint types in `server/routes/gpt.ts`. The feature set is locked.
- **Not payment or auth work.** Stripe is done. OAuth is done. Subscription tiers are done. No changes to `server/routes/stripe.ts`, `server/routes/oauth.ts`, `server/routes/auth.ts`, or `src/components/subscription/UpgradeModal.tsx`.
- **Not analytics expansion.** The `events` table exists and events fire. No new event types, no admin dashboard, no analytics UI.
- **Not a prompt rewrite that changes the reading type.** The solar return prompt, the numerology narrative prompt, and the journal annotation prompt are already good enough. Don't rewrite what isn't broken.
- **Not new static interpretation entries.** Do not add new planet-in-sign or planet-in-house database entries to `src/data/`. Use what exists and wire it to the surfaces that currently ignore it.
- **Not a visual redesign.** The dark-mystic palette, the gold accents, the Cormorant Garamond headings — all stay exactly as they are. Sprint-0010 is about the words inside the containers, not the containers themselves.
- **Not mobile/PWA work.** Responsive design is complete. No service workers, no push notifications, no app-store considerations.
