# feat-synastry-personalized-names

**Type:** Feature
**Originated by:** Jobs, Carmack, Miyazaki

---

## User Guidance

> In the end, a lot of people love astrology to look at couples synastry.
> The goal of this sprint is to make couples synastry amazing

---

## Problem / Opportunity

The synastry feature is the most emotionally freighted part of the product. A person who types their partner's birth data into the form is doing an act of hope. They are not asking for an analysis of two data rows. They are asking: *what are we to each other?*

The product currently answers that question by calling the two people "Person 1" and "Person 2." Every heading, every label, every sentence of the GPT reading uses these identifiers. The effect is clinical, impersonal, and quietly disrespectful of the emotional weight the user brought to the session.

### Specific failures documented in the codebase

**Page header — `SynastryPage.tsx` lines 356–359:**
```tsx
<span>Person 1: {birthData.date} — {person1Label}</span>
<span className="hidden sm:inline text-mystic-gold">✦</span>
<span>Person 2: {partnerBirthData.date} — {person2Label}</span>
```
The first text a user reads on the synastry results page is "Person 1: 1990-03-15 — London, United Kingdom" and "Person 2: 1991-07-22 — New York, United States of America." This is a database row identifier, not a person.

**Chart wheel labels — `SynastryPage.tsx` lines 365 and 369:**
```tsx
<p className="text-mystic-muted text-xs uppercase tracking-wider mb-2">Person 1</p>
...
<p className="text-mystic-muted text-xs uppercase tracking-wider mb-2">Person 2</p>
```
The labels above each side-by-side chart wheel are "PERSON 1" and "PERSON 2" in uppercase. This is the first visual element the user sees.

**Synastry aspects description — `SynastryPage.tsx` line 115:**
```tsx
<p className="text-mystic-muted text-xs mb-3">Aspects between Person 1's planets and Person 2's planets</p>
```

**Aspect row labels — `SynastryPage.tsx` line 128:**
```tsx
labelOverride={`P1 ${a.person1Planet} ${a.type.charAt(0).toUpperCase() + a.type.slice(1)} P2 ${a.person2Planet}`}
```
This produces labels like "P1 Venus Trine P2 Neptune." This is a database query format applied to an intimate relational description.

**House overlay section titles — `SynastryPage.tsx` lines 405 and 411:**
```tsx
label="Person 1's Planets in Person 2's Houses"
...
label="Person 2's Planets in Person 1's Houses"
```

**Individual birth chart titles — `SynastryPage.tsx` lines 419–420:**
```tsx
<IndividualChartSection title="Person 1 — Birth Chart" ... />
<IndividualChartSection title="Person 2 — Birth Chart" ... />
```

**GPT prompt instruction — `synastry.ts` line 550:**
```typescript
prompt += `Use "Person 1" and "Person 2" as labels. Close with the most important factual dynamic...`
```
The model is explicitly instructed to call both people by bureaucratic identifiers throughout 6–8 paragraphs of intimate, personalized prose.

**GPT prompt section headers — `synastry.ts` lines 464–465, 473, 477–478, 486:**
```typescript
prompt += `## Person 1 Birth Chart\nBorn: ${person1Date}\n`
prompt += `\n## Person 1 Element Profile\n`
prompt += `\n## Person 2 Birth Chart\nBorn: ${person2Date}\n`
prompt += `\n## Person 2 Element Profile\n`
```

**GPT prompt aspect serialization — `synastry.ts` line 493:**
```typescript
prompt += `- Person 1 ${a.person1Planet} ${a.symbol} Person 2 ${a.person2Planet} (${a.type}, orb ${a.orb}°, ${a.nature})\n`
```

**GPT prompt house overlay labels — `synastry.ts` lines 499, 501, 503, 505:**
```typescript
prompt += `Person 1's planets in Person 2's houses:\n`
prompt += `- ${h.planet} in ${h.sign} → Person 2's House ${h.house}\n`
prompt += `Person 2's planets in Person 1's houses:\n`
prompt += `- ${h.planet} in ${h.sign} → Person 1's House ${h.house}\n`
```

**GPT prompt house-naming instruction — `synastry.ts` lines 542:**
```typescript
prompt += `...Use "Person 1's 7th house (partnership)" rather than "Person 1's Libra."...`
```

**Couple transit prompt — `synastry.ts` lines 585, 589, 592, 596, 602, 639:**
The `buildCoupleTransitPrompt` function repeats the same pattern: "Person 1 (born ...)", "Person 2 (born ...)", "P1 [planet] [aspect] P2 [planet]", and closes with `Use "Person 1" and "Person 2"`.

**Synastry transit page header — `SynastryTransitPage.tsx` lines 128–130:**
```tsx
<span>Person 1: {birthData.date} — {person1Label}</span>
...
<span>Person 2: {partnerBirthData.date} — {person2Label}</span>
```

**Couple transit select screen — `App.tsx` lines 211–212:**
```tsx
<p>Person 1: {birthData.date} — {person1Label}</p>
<p>Person 2: {partnerBirthData.date} — {person2Label}</p>
```

**DiscussModal synastry context builder — `DiscussModal.tsx` lines 177, 182, 189, 194, 196, 198, 200, 234–235, 244:**
The `buildSynastryContext` and `buildSynastryTransitContext` functions use "Person 1", "Person 2", "P1", "P2" throughout the context sent to the discussion AI.

**PartnerForm — `PartnerForm.tsx` lines 28–34:**
```tsx
<p className="text-mystic-muted text-xs uppercase tracking-widest mb-1">Person 1</p>
...
<p className="text-mystic-muted text-xs uppercase tracking-widest mb-2">Person 2</p>
```
The form that collects the partner's birth data shows "PERSON 1" and "PERSON 2" as the labels. There is no name field for either person.

### The field exists but is never surfaced

`BirthData` in `appState.ts` already declares `userName?: string` (line 33) and `initialBirthData` sets it to `undefined` (line 124). The `SET_USER_NAME` action exists in the reducer (line 361–362). The field is persisted through `saveBirthData` and restored in `loadCachedBirthData`. But no form ever collects it, and no component ever displays it. It is infrastructure waiting for a front end.

For the partner, `loadCachedPartnerData` (line 183–198) does not even read `userName` from the cache — it is silently dropped. The field would need to be added to partner caching logic.

### Color language encodes judgment

In `CompatibilitySection` (`SynastryPage.tsx`):

- The Challenge score bar uses `color="bg-red-400"` (line 54) — a red bar growing rightward as "challenge" increases
- The `challengingCount` display uses `text-red-400` (line 66) — the count of challenging aspects is rendered in red, the universal color of warning, error, and failure

The product's own interpretation text explicitly treats Saturn and Pluto contacts as valuable and transformative. The red color encoding contradicts this and makes the UI judge the relationship before the user has read a single word.

### Section order buries narrative under judgment

The current page order (documented in `SynastryPage.tsx`):

1. Header with "Person 1 / Person 2" date labels
2. Side-by-side chart wheels labeled "Person 1" / "Person 2"
3. Compatibility Overview — the first substantial content a user encounters is the numerical judgment: Overall Resonance score in a circle, five score bars (including the red Challenge bar), then aspect counts in green/gold/red
4. `CurrentMoonWidget` — today's moon phase, entirely unrelated to synastry
5. GPT reading
6. Synastry Aspects (expanded by default)
7. House Overlays
8. Composite Chart
9. Individual Birth Charts (expanded by default)

The page leads with scoring and judgment before showing the reading. The `CurrentMoonWidget` (line 378) interrupts the flow between the compatibility overview and the GPT reading — it is a widget about today's sky inserted into the middle of a couple's intimate relational reading.

---

## Vision

When names are present, the synastry page transforms from a data report into a reading about two specific people. The header reads "Emma & Michael" or "Emma & Born April 14" or "Born November 3 & Michael" — each variant more personal than "Person 1 / Person 2." The GPT reading begins "Emma's Moon in Scorpio reaches into the house where Michael's Sun lives" rather than "Person 1's Moon in Scorpio is in Person 2's 8th house."

The form that collects a partner's birth data shows the user's own name (or date) at the top as a reference — "Your details: Emma · March 15, 1990 · London" — and asks for the partner's name as a welcoming, optional gesture. It signals that the product knows these are people, not rows.

The page section order follows the logic of encountering a relationship: first you see it visually (the chart), then you understand its character (the couple profile), then you hear the story told in prose (the GPT reading), then you can dive into details (aspects, house overlays, composite). Nothing interrupts this sequence. The moon widget has no place here and does not appear.

The aspect list reads "Emma's Venus Trine Michael's Neptune" instead of "P1 Venus Trine P2 Neptune." The house overlay sections are titled "Emma's Planets in Michael's Houses" and "Michael's Planets in Emma's Houses." The individual birth chart sections at the bottom read "Emma — Birth Chart" and "Michael — Birth Chart." The reading knows who these people are throughout.

The color language stops judging. Challenge bars and challenging aspect counts lose their red coloring. The product does not use the color of warning to describe aspects that may be among the most structurally important in the relationship.

---

## Specifications

### 1. Name input fields

**1.1.** Add an optional "Name" text input to `PartnerForm.tsx` for the partner (Person 2). Position it at the top of the form, before the date field. Label it "Name (optional)". Placeholder text: "e.g., Michael or Partner." Max length: 40 characters.

**1.2.** Add an optional "Name" text input to the main birth form (`FormWizard.tsx` / `StepPlace.tsx` or as a new `StepName` step, or inline on the final step). The exact placement within the form wizard is an implementation decision, but the field must appear before the user exits the form. Label: "Your name (optional)". Placeholder: "e.g., Emma." Max length: 40 characters.

**1.3.** Both name fields are strictly optional. No validation error should prevent form submission when a name is absent.

**1.4.** Name input should accept any Unicode string (allowing non-ASCII names). No format constraints beyond max length.

**1.5.** The user's own name must be persisted to `birthData.userName` via the existing `UPDATE_BIRTH_DATA` action. The partner's name must be persisted to `partnerBirthData.userName` via the existing `UPDATE_PARTNER_DATA` action.

**1.6.** `loadCachedPartnerData` in `appState.ts` currently drops `userName` during deserialization (line 183–198). This function must be updated to read and restore `userName` from the cached partner data, mirroring the handling in `loadCachedBirthData`.

**1.7.** When a user already has cached birth data (returning user) and `birthData.userName` is already set from a prior session, the name field in the main form should be pre-populated with that value.

### 2. Name resolution and fallback logic

**2.1.** Define a shared utility function (e.g., `resolvePersonLabel(birthData: BirthData): string`) that returns:
- `birthData.userName` if it is a non-empty string after trimming
- Otherwise, a human-readable date fallback: "Born [Month Day, Year]" formatted using the user's locale (e.g., "Born March 15, 1990")

**2.2.** This function is the single source of truth for display names throughout the application. It must not be inlined in each component.

**2.3.** "Born [date]" is the fallback, not "Person 1" or "Person 2." The identifiers "Person 1," "Person 2," "P1," and "P2" must not appear in any user-facing UI string after this feature lands.

### 3. SynastryPage.tsx — all label sites

**3.1. Page header (lines 356–359).** Replace the current "Person 1: date — city" / "Person 2: date — city" format with the resolved names: `{label1} & {label2}` as a headline, with the city/date as secondary subtext beneath if desired. If both names are present: "Emma & Michael." If one is a date fallback: "Emma & Born April 14, 1991."

**3.2. Chart wheel labels (lines 365, 369).** Replace "Person 1" and "Person 2" with the resolved labels.

**3.3. SynastryAspectsSection description (line 115).** Replace "Aspects between Person 1's planets and Person 2's planets" with "Aspects between [label1]'s planets and [label2]'s planets."

**3.4. Aspect row labels (line 128).** Replace the `labelOverride` template `P1 ${a.person1Planet} ... P2 ${a.person2Planet}` with `${label1}'s ${a.person1Planet} ${a.type} ${label2}'s ${a.person2Planet}`. Example output: "Emma's Venus Trine Michael's Neptune."

**3.5. House overlay section titles (lines 405, 411).** Replace "Person 1's Planets in Person 2's Houses" / "Person 2's Planets in Person 1's Houses" with `${label1}'s Planets in ${label2}'s Houses` and `${label2}'s Planets in ${label1}'s Houses`.

**3.6. Individual birth chart section titles (lines 419–420).** Replace "Person 1 — Birth Chart" / "Person 2 — Birth Chart" with `${label1} — Birth Chart` / `${label2} — Birth Chart`.

### 4. PartnerForm.tsx — label sites

**4.1.** The "Person 1" label at the top of the form (line 28) must show the resolved label for the current user, e.g., "Your details" followed by `{label1}` or just display `{label1}` as the heading. It must not read "Person 1."

**4.2.** The "Person 2" label (line 34) must show "Partner's details" or a neutral label that does not use "Person 2."

### 5. SynastryTransitPage.tsx — label sites

**5.1. Header (lines 128–130).** Replace "Person 1: date — city" / "Person 2: date — city" with resolved labels, consistent with the SynastryPage treatment.

### 6. App.tsx — SynastryTransitSelectScreen label sites

**6.1. Lines 211–212.** Replace "Person 1: date — city" / "Person 2: date — city" with resolved labels.

### 7. GPT prompt — buildSynastryPrompt in synastry.ts

**7.1.** The function signature must accept two new optional parameters: `person1Name?: string` and `person2Name?: string`.

**7.2.** Resolve each label within the function using the same fallback logic as spec 2.1, but taking the resolved string from the caller rather than from `BirthData` directly (the prompt builder does not currently have access to `BirthData` objects, only chart/date data — the caller in `gptInterpretation.ts` or the loading screen must resolve and pass the names).

**7.3.** Replace all occurrences of the hard-coded string `"Person 1"` in the prompt with the resolved label for person 1, and `"Person 2"` with the resolved label for person 2. This includes:
- Section headers: `## Person 1 Birth Chart` → `## ${label1} Birth Chart` (line 464)
- `## Person 1 Element Profile` → `## ${label1} Element Profile` (line 473)
- `## Person 2 Birth Chart` → `## ${label2} Birth Chart` (line 477)
- `## Person 2 Element Profile` → `## ${label2} Element Profile` (line 486)
- Aspect serialization (line 493): `Person 1 ${a.person1Planet}` / `Person 2 ${a.person2Planet}` → `${label1} ${a.person1Planet}` / `${label2} ${a.person2Planet}`
- House overlay headers (lines 499, 501, 503, 505): replace all "Person 1" / "Person 2" with resolved labels
- The lead instruction (line 527): replace `Person 1's Venus in their 7th house` example with `${label1}'s Venus in their 7th house`
- The house-naming instruction (line 542): replace both occurrences of `"Person 1's 7th house (partnership)"` with `"${label1}'s 7th house (partnership)"`
- The closing instruction (line 550): replace `Use "Person 1" and "Person 2" as labels` with `Use "${label1}" and "${label2}" as labels throughout`

**7.4.** The function must pass names through the server proxy if the synastry reading is generated server-side. The `getSynastryInterpretation` function in `gptInterpretation.ts` (line 326) and its proxy endpoint must accept and forward `person1Name` and `person2Name` optional string parameters.

### 8. GPT prompt — buildCoupleTransitPrompt in synastry.ts

**8.1.** Apply the same label replacement to `buildCoupleTransitPrompt` (lines 557–643): all occurrences of "Person 1", "Person 2", "P1", "P2" in the prompt string must use resolved labels. The function must accept the same optional `person1Name?: string` and `person2Name?: string` parameters.

**8.2.** The closing instruction on line 639 (`Use "Person 1" and "Person 2"`) must be updated to use resolved labels.

### 9. DiscussModal.tsx — context builder label sites

**9.1.** The `buildSynastryContext` function (lines 165–220) uses "Person 1", "Person 2", "P1", "P2" in the context string passed to the discussion AI. The function signature must accept `label1: string` and `label2: string` parameters (resolved by the caller), and use them in place of all hardcoded person identifiers.

**9.2.** The `buildSynastryTransitContext` function (lines 222–250) must receive and use the same resolved labels.

**9.3.** Both functions must be updated at all string construction sites: the section headers (`### Person 1`, `### Person 2`), the aspect lines (`P1 ${a.person1Planet}`), and the house overlay lines (`P1 planets in P2 houses`).

### 10. Page section reorder

**10.1.** The section order in `SynastryPage.tsx` must be changed to narrative order:

1. Header
2. Bi-wheel (or current side-by-side wheels until the bi-wheel is built)
3. Couple profile / compatibility section
4. GPT reading
5. Synastry Aspects (collapsed by default; see spec 11)
6. House Overlays (collapsed by default unless high-signal placements exist)
7. Composite Chart
8. Individual Birth Charts (collapsed by default; see spec 12)

**10.2.** No section that is not synastry content may appear between the compatibility section and the GPT reading.

### 11. CurrentMoonWidget removal

**11.1.** The `<CurrentMoonWidget date={new Date()} />` element (line 378) must be removed from `SynastryPage.tsx`. Today's moon phase is not synastry content and must not interrupt the couple's reading flow.

**11.2.** The `CurrentMoonWidget` import (line 13) must be removed from `SynastryPage.tsx` if it is no longer used elsewhere in that file.

**11.3.** The widget must not be relocated to another position on the synastry page. It does not belong on this page.

### 12. Individual birth chart sections — collapsed by default

**12.1.** The `IndividualChartSection` components at lines 419–420 are rendered with no `defaultOpen` prop, which means `CollapsibleSection` uses its own default (currently open). These sections must render collapsed by default. Pass `defaultOpen={false}` explicitly.

**12.2.** The visual weight of individual birth chart tables (full planet table plus chart wheel) is significant. Collapsing them by default ensures a user scrolling the synastry page encounters the GPT reading and relational content before encountering a wall of natal chart tables.

### 13. Color de-judgment fixes

**13.1.** The Challenge score bar (`SynastryPage.tsx` line 54) uses `color="bg-red-400"`. This must be changed to a neutral color. Acceptable replacements: `bg-mystic-gold/60`, `bg-amber-400/70`, or any color from the product's existing neutral/gold palette. The color must not be red, orange-red, or any hue that conventionally signals warning or error.

**13.2.** The `challengingCount` display (line 66) uses `text-red-400`. This must be changed to `text-mystic-gold` or the same neutral color used in spec 13.1, consistent with the `neutralCount` and `harmoniousCount` display colors.

**13.3.** No other color changes to the scoring system are required by this proposal. The broader replacement of the score bars with dimension axes is addressed in a separate proposal.

### 14. Fallback behavior — no name provided

**14.1.** When `userName` is absent or empty for both people, the experience must degrade gracefully to the "Born [date]" fallback. The page must not display "Person 1" or "Person 2" under any circumstances.

**14.2.** The fallback date format must be human-readable: "Born March 15, 1990" not "Born 1990-03-15." Use `Date` + locale formatting for display.

**14.3.** The "&" connector in the header ("Emma & Michael") applies in all cases, including when both sides use date fallbacks: "Born March 15, 1990 & Born July 22, 1991."

### 15. Name input UX details

**15.1.** Name fields must not be marked as required, either visually (no asterisk) or programmatically (no `required` attribute on the input).

**15.2.** Name input values must be trimmed of leading and trailing whitespace before being stored in state and before being used as display labels.

**15.3.** An empty string after trimming must be treated identically to `undefined` — the fallback date label applies.

**15.4.** The name fields must be accessible: each must have an associated `<label>` element linked via `htmlFor` / `id`, not just a visual label.

---

## Out of Scope

- Replacing the Overall Resonance score and five score bars with the dimension axis system — that is a separate proposal
- Building the bi-wheel chart (adding `synastryPlanets` prop to `ChartWheel`) — that is a separate proposal
- Building a composite chart wheel — that is a separate proposal
- Saving or syncing partner names to the server profile — names remain local-only in this feature
- Using names in the natal birth chart reading, transit reading, or solar return reading — this proposal is scoped to synastry and couple transit surfaces only
- Changing the copy of the house overlay fallback brief (the "energy reaches the space" template at line 203) — that is a copy improvement task, not part of this feature
- Any changes to the transit reading page, solar return page, or numerology page
- Any changes to the `CompatibilityScore` calculation logic or the `CompatibilitySection` beyond the two color corrections in spec 13

---

## Open Questions

1. **Where in the main form wizard does the `userName` field live?** The wizard has three steps (Date, Time, Place). Options: add a fourth step "Name" before Date; add it as an optional field on an existing step (Place is the most natural completion step); or display it after the form completes on the results page as a "personalize your reading" prompt. The placement affects how prominently the feature is surfaced.

2. **Does the partner name persist across sessions in a meaningful way?** Currently `loadCachedPartnerData` drops `userName`. If a user comes back and the partner data is restored, should the partner name also be restored? The current caching pattern for partner data suggests yes, but it needs explicit confirmation since most users re-enter partner data each session.

3. **How are resolved labels passed to the server proxy?** `getSynastryInterpretation` calls `callProxy('synastry-interpretation', { person1, person2 })`. The server endpoint rebuilds the prompt using `buildSynastryPrompt`. Names must be forwarded to the server. The server handler in `server/engine/synastryEngine.ts` (or equivalent) must accept and use them. The exact wire format (adding `person1Name` and `person2Name` fields to the proxy payload) needs to be confirmed against the server handler's schema.

4. **Should the `&` in the header link to anything or be purely decorative?** In some products, clicking a person's name on the synastry page navigates to their individual birth chart. This may be worth building but is not specified here.

5. **What happens when a name is longer than expected in the aspect list?** The aspect row label `${label1}'s Venus Trine ${label2}'s Neptune` could be long if names are near the 40-character limit. Does `AspectRow` truncate gracefully, or does the label break layout? This needs a visual QA pass with long names.

6. **Does the `buildCoupleTransitPrompt` in `synastry.ts` need the names threaded from `SynastryTransitPage.tsx` through `getCoupleTransitInterpretation` in `gptInterpretation.ts`?** Yes, but the exact path must be confirmed — the transit interpretation call chain is: `SynastryTransitPage` → `getCoupleTransitInterpretation` → `callProxy('couple-transit-interpretation')` → server handler → `buildCoupleTransitPrompt`. All links in this chain need the name parameters.
