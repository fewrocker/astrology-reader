# feat-synastry-couple-profile

**Type:** Feature

**Originated by:** Jobs, Carmack, Miyazaki, Taleb

---

## User Guidance

> I dont like the judgement of Overall Resonance being a 0-100 resonance. I wouldnt like to have numbers that show "this couple is good or bad". We can show numbers from 0/100 like the Growth and Challenge ones, things that show information, but is not a direct judgement on good or bad. Things like Intensity, Communication, these are information, not judgements, for example: high intensity is not good or bad, it has pros and cons, same for communication: showing it as high is good yeah but showing it as bad means that the couple has to be careful about it. So maybe instead of good and bad, we can have a center value, and each value goes to the left and to the right with that meaning, for example: Intensity to the left means Calm, and to the right means Fiery, and that means something, just like a 16 personalities have things like INTP, for example, extroversion can go to the left (introvert) and to the right (extrovert) and each side means something, not good or bad, just means something. So i dont know which attributes it should be, but research and define them so it is interesting, fun and informative.

---

## Problem / Opportunity

### The Overall Resonance score is the wrong kind of truth

The `CompatibilitySection` component in `SynastryPage.tsx` (lines 35–94) opens with a large number in a circle:

```tsx
<div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-2 border-mystic-gold/40 mb-2">
  <span className="font-heading text-3xl text-mystic-gold">{compatibility.overall}</span>
</div>
<p className="text-mystic-muted text-xs uppercase tracking-wider">Overall Resonance</p>
```

This number is the first compatibility datum a user encounters. It is computed in `calculateCompatibility()` at `synastry.ts` lines 411–414:

```typescript
const overall = normalize(
  harmoniousCount * 3 + neutralCount * 2 + challengingCount * 1,
  totalAspects * 3,
)
```

The formula contains structural errors beyond just concept. It weights harmonious > neutral > challenging, which encodes the premise that harmonious aspects are "better." It produces a guaranteed minimum of ~33 for any couple (even one with all challenging aspects), making the ceiling fictitious. Orb tightness is not factored into `overall` even though a weight variable is computed per-aspect above it. A tight Saturn square Sun and a barely-in-orb Saturn trine Moon count equally toward the `harmoniousCount`. The number is not only philosophically wrong — it is arithmetically imprecise.

### The five score bars encode the same judgment in color

Below the Resonance circle, five `ScoreBar` components appear (lines 50–54):

```tsx
<ScoreBar label="Romantic ♡"      value={compatibility.romantic}      color="bg-pink-500" />
<ScoreBar label="Emotional ☽"     value={compatibility.emotional}      color="bg-blue-400" />
<ScoreBar label="Communication ☿" value={compatibility.communication}  color="bg-yellow-400" />
<ScoreBar label="Growth ♃"        value={compatibility.growth}         color="bg-green-400" />
<ScoreBar label="Challenge ♄"     value={compatibility.challenge}      color="bg-red-400" />
```

The `ScoreBar` component (lines 20–33) fills a horizontal bar from zero on the left to the value on the right. A high value is a full bar. A low value is an empty bar. "Challenge" is rendered in `bg-red-400`. Red is not neutral. It communicates warning. A couple with a high Challenge score — which in classical synastry indicates Saturn and Pluto contacts, the aspects that build lasting bonds and transform both people — sees their bar fill up in red.

The denominators for normalization are hardcoded at 40 for romantic/emotional/communication and 60 for growth/challenge. These are not derived from the data. A couple with a tight Venus-Mars conjunction, a Sun-Moon trine, and a Venus-Venus sextile will accumulate `romanticScore` well above 40 before the cap. The bar is clipped to 100 and the saturation tells the user nothing beyond "many contacts exist."

### The aspect count tally compounds the problem

Below the score bars (lines 56–70):

```tsx
<span className="text-green-400 ...">{compatibility.harmoniousCount}</span>
<span className="text-mystic-gold ...">  {compatibility.neutralCount}</span>
<span className="text-red-400 ...">  {compatibility.challengingCount}</span>
```

Green for harmonious. Red for challenging. The color system is a judgment even when the label text is not. A user whose challenging count is 7 sees a red 7, and the brain reads it as "seven problems."

### The current system describes the wrong thing

The `CompatibilityScore` interface (`synastry.ts` lines 45–58) holds `overall`, `romantic`, `emotional`, `communication`, `growth`, `challenge`, and the three counts. These fields measure how many aspects of each category exist, not what kind of relationship this is. "You have 12 harmonious aspects" is not a description of a couple's character — it is an inventory count. It answers "how much?" when users are asking "what kind?"

The calculation logic already contains the material for real characterization. `elementCompat()` compares dominant elements and produces natural language ("Harmonious — Fire and Air naturally support each other"). `modalityCompat()` compares dominant modalities. `identifyKeyThemes()` produces interpretive sentences about Sun-Moon, Venus-Mars, Saturn, Pluto, and Node contacts. This richer vocabulary is buried after the score that dominates the section visually. The score is the headline; the character is the footnote.

---

## Vision

Someone opens the synastry page and scrolls to the section where the compatibility used to be. Instead of a number in a circle, they see a heading — "Your Couple Profile" — and below it, seven horizontal axes. Each axis is a line stretching from one named pole to another. A small marker sits somewhere on the line.

They read the first axis: `Calm ◄────────●────► Fiery`. The marker leans noticeably right. Beneath it, one sentence: *"Your Mars signs create a charged current — you move fast, pursue hard, and generate friction that can ignite into passion or conflict depending on the day."*

They read the next one: `Reserved ◄──●───────────► Expressive`. The marker sits left of center. The sentence: *"Your Moon contact is quieter than it is effusive — you feel things deeply together but process privately before speaking."*

By the time they have read all seven axes and their sentences, they have a precise vocabulary for this relationship that they did not have before. Not a verdict. A portrait.

The portrait does not require knowing anything about astrology. "Fiery" and "Calm" are words. "Spacious" and "Merging" are words. Anyone in a relationship has immediate intuitions about whether these words apply. The MBTI insight is not that its categories are scientifically valid — it is that having a vocabulary for a familiar experience is itself illuminating. "We're both Fiery, and Spacious, and that's why we need our separate time" is something two people can actually use.

The profile should feel like it was written for this specific couple. Not generated from templates. The one-sentence description under each axis marker must reference what actually pushed the marker: the tight Mars-Mars square that creates the charge, the dominant Water elements that create the emotion, the Venus-Neptune trine that creates the dissolving intimacy. If the marker is at center, the sentence should acknowledge the balance, not say nothing.

The section should replace the entire `CompatibilitySection` block. No number in a circle. No score bars. No red. No green. Just the seven axes, their markers, and their sentences — and below them, the element and modality characterizations and the key themes from `identifyKeyThemes()`, which are already well-written and should survive.

Hovering or tapping a marker — or the pole names on either end — should show a brief tooltip explaining what the axis measures and what the specific position means for this couple. On mobile, tapping the marker expands a description inline. The tooltip is not a definition of the poles; it is a specific observation.

The GPT interpretation that follows should speak the same language. If the couple profile says "Fiery" on Intensity, the GPT's first paragraph should name that intensity directly and explain where in the charts it comes from. The visual profile and the prose reading are the same voice in two registers.

---

## Specifications

### 1. Data model: `CoupleProfile` replaces `CompatibilityScore`

**1.1** Define a new `CoupleProfile` interface in `synastry.ts`:

```typescript
export interface DimensionValue {
  value: number          // -1.0 to +1.0; negative = left pole, positive = right pole, 0 = center
  confidence: number     // 0.0 to 1.0; computed as Math.min(1.0, totalWeight / 3.0)
  leftPole: string       // e.g. "Calm"
  rightPole: string      // e.g. "Fiery"
  label: string          // e.g. "Intensity"
  sentence: string       // one generated sentence grounded in actual aspects
}

export interface CoupleProfile {
  intensity: DimensionValue
  emotionalFlow: DimensionValue
  communicationStyle: DimensionValue
  intimacyRhythm: DimensionValue
  growthDynamic: DimensionValue
  sexualChemistry: DimensionValue
  lifePace: DimensionValue
}
```

**1.2** The `sentence` field in `DimensionValue` is not a template string applied uniformly. It is generated inside `calculateCoupleProfile()` by inspecting which specific aspects and element patterns drove the value, then selecting from a set of aspect-grounded strings. See Spec 4 for sentence generation logic.

**1.3** `SynastryData` is updated: replace `compatibility: CompatibilityScore` with `coupleProfile: CoupleProfile`. The `keyThemes`, `elementCompatibility`, and `modalityCompatibility` fields currently on `CompatibilityScore` must be preserved. Either keep them on `CoupleProfile` as auxiliary fields, or move them to `SynastryData` directly:

```typescript
export interface SynastryData {
  synastryAspects: SynastryAspect[]
  houseOverlay: HouseOverlay
  compositeChart: CompositeChart
  coupleProfile: CoupleProfile
  keyThemes: string[]
  elementCompatibility: string
  modalityCompatibility: string
}
```

**1.4** The `CompatibilityScore` interface and `calculateCompatibility()` function are deleted. There is no backward-compatibility mode. The type errors this produces in `SynastryPage.tsx` and `buildSynastryPrompt()` are the correct locations to update.

**1.5** `calculateSynastry()` calls `calculateCoupleProfile()` instead of `calculateCompatibility()`. The `keyThemes` string array from `identifyKeyThemes()` is still computed and stored at the `SynastryData` level.

**1.6** Because `SynastryData` is cached in `localStorage` via `AppContext.tsx` (lines 37–44), the shape change will cause stale cached results to have `synastryData.compatibility` but not `synastryData.coupleProfile`. The implementation must add a version guard: when `SynastryData` is read from localStorage, check for the presence of `coupleProfile`. If absent (old cache), discard the cached synastry data and re-compute. A simple `if (!data.coupleProfile) return null` in the `loadSynastryResults` path is sufficient.

---

### 2. The seven axes: astrological derivation

Each axis maps a real astrological signal onto a bipolar spectrum. The derivation for each axis is specified below. All aspect-based axes use the `Math.tanh`-normalized accumulator described in Spec 3. All element/modality axes use the ratio-based formula in Spec 3.3.

**Axis 1 — Intensity: Calm ←→ Fiery**

*What it measures:* The energetic charge and volatility of the relationship — whether it tends toward a steady, low-heat presence or toward high-activation, fast-moving, friction-generating energy.

*Astrological derivation — aspect component:*
- Positive pairs (push toward Fiery): `Mars × Mars`, `Sun × Mars`, `Mars × Pluto`, `Sun × Pluto`
- Aspect nature does not determine direction. A Mars trine Mars is Fiery. A Mars square Mars is also Fiery. The trine is expansive fire; the square is confrontational fire. Both count toward the right pole. The `nature` field of the aspect only contributes to the `sentence` generation (whether to name the intensity as "energizing" vs. "combustible"), not to the axis direction.
- Weight: `Math.max(0.1, 1 - orb / 6)` (synastry uses tighter orbs than natal)

*Astrological derivation — element component:*
- Count Fire and Water planets (excluding asteroids) across both charts combined
- Fire-dominant combined chart → pushes toward Fiery; Water-dominant → pushes toward Calm
- Formula: `(fireCount - waterCount) / (fireCount + waterCount + 1)` where `+1` prevents division by zero
- This component uses a weight of `0.35` in the combined score; the aspect component uses `0.65`

*Final value:* `Math.tanh((0.65 * aspectComponent + 0.35 * elementComponent) * 3)`

**Axis 2 — Emotional Flow: Reserved ←→ Expressive**

*What it measures:* The emotional register of the relationship — whether emotions are held privately and processed individually or shared openly and fluently.

*Astrological derivation — aspect component:*
- Moon × Moon, Moon × Venus, Moon × Neptune, Moon × Jupiter, Sun × Moon
- All aspect types count regardless of nature (a challenging Moon-Moon square creates as much emotional contact as a trine — the type affects the sentence, not the direction)
- Positive (push toward Expressive): Moon × Moon (conjunction, trine, sextile), Moon × Venus (any), Moon × Jupiter (any), Sun × Moon (conjunction, trine)
- Negative (push toward Reserved): Moon × Saturn, Moon × Uranus, Sun × Moon (square, opposition)
- Weight: `Math.max(0.1, 1 - orb / 6)`

*Astrological derivation — element component:*
- Water-dominant combined chart → Expressive; Air-dominant or Fire-dominant → Reserved
- Formula: `(waterCount - airCount - fireCount/2) / totalPlanets`
- Component weight: `0.30`; aspect component: `0.70`

**Axis 3 — Communication Style: Intuitive ←→ Analytical**

*What it measures:* How the couple processes and exchanges information — whether primarily through feeling, sensing, and direct knowing or through language, logic, and systematic analysis.

*Astrological derivation — aspect component:*
- Mercury × Mercury, Mercury × Moon, Mercury × Venus, Mercury × Sun, Mercury × Uranus
- Mercury × Moon → Intuitive pole (feeling communicators); Mercury × Mercury, Mercury × Uranus → Analytical pole
- Mercury × Neptune in synastry → Intuitive (adds dreamlike/non-linear quality)
- Weight: `Math.max(0.1, 1 - orb / 6)`

*Astrological derivation — element component:*
- Air-dominant combined chart → Analytical (Air thinks, systematizes, categorizes)
- Water-dominant → Intuitive
- Earth-dominant → Analytical (practical, grounded information processing)
- Fire-dominant → Intuitive (spontaneous, leap-to-conclusion style)
- Formula: `(airCount + earthCount/2 - waterCount - fireCount/2) / totalPlanets`
- Component weights: `0.40` element, `0.60` aspect

**Axis 4 — Intimacy Rhythm: Spacious ←→ Merging**

*What it measures:* The couple's natural rhythm of closeness and independence — whether they tend to maintain distinct personal space within the relationship or to dissolve boundaries and move toward profound fusion.

*Astrological derivation — aspect component:*
- Venus × Neptune, Moon × Neptune, Venus × Pluto, Moon × Pluto, Sun × Neptune
- Venus × Neptune and Moon × Neptune → Merging (Neptune dissolves, floats, idealizes)
- Venus × Pluto and Moon × Pluto → Merging with intensity (compulsive, absorptive closeness)
- Mars × Uranus in synastry → Spacious (Uranus pulls toward freedom, needs autonomy)
- Saturn × Venus or Saturn × Moon → Spacious (Saturn creates structure and distance)
- Weight: `Math.max(0.1, 1 - orb / 6)`

*House overlay component (only computed when both birth times are known):*
- Person 1's or Person 2's planets in the other's 8th house → Merging signal
- Person 1's or Person 2's planets in the other's 12th house → Merging/dissolution signal
- Person 1's or Person 2's planets in the other's 1st or 11th house → Spacious signal
- When house overlay data is unavailable (`houseOverlay` arrays are empty), this component weight drops to 0 and is compensated by increasing the aspect component weight
- Component weights when house data available: `0.50` aspect, `0.50` house; when unavailable: `1.0` aspect, `0.0` house

**Axis 5 — Growth Dynamic: Stabilizing ←→ Expanding**

*What it measures:* The primary growth energy in the relationship — whether it tends toward deepening what already exists, building slowly and sustainably, or expanding constantly outward through new experience and challenge.

*Astrological derivation — aspect component:*
- Saturn contacts → Stabilizing: Saturn × Sun, Saturn × Moon, Saturn × Venus, Saturn × Mars (Saturn brings form, discipline, depth)
- Jupiter contacts → Expanding: Jupiter × Sun, Jupiter × Moon, Jupiter × Venus, Jupiter × Mars (Jupiter enlarges, optimizes, pushes for more)
- Uranus × personal planets → Expanding (disruption opens new territory)
- Chiron × personal planets → Stabilizing at a deep level (wound integration slows down and deepens)
- Weight: `Math.max(0.1, 1 - orb / 6)`

*Modality component:*
- Fixed-dominant combined chart → Stabilizing
- Mutable-dominant combined chart → Expanding
- Cardinal-dominant → slight Expanding bias (Cardinal initiates, starts)
- Formula: `(mutableCount + cardinalCount/2 - fixedCount) / totalPlanets`
- Component weights: `0.35` modality, `0.65` aspect

**Axis 6 — Sexual Chemistry: Understated ←→ Electric**

*What it measures:* The physical and magnetic charge between the two people — whether the erotic dimension is subtle and develops slowly or is immediately charged, high-voltage, and palpable.

*Note on label:* "Sexual Chemistry" is direct and accurate for romantic synastry, which is the primary context of the feature. The label should be used as specified. See Open Questions for the non-romantic use case.

*Astrological derivation — aspect component:*
- Venus × Mars (any type) → Electric: this is the primary romantic-attraction axis in synastry
- Mars × Mars → Electric (high activation)
- Venus × Uranus → Electric (sudden, unexpected spark; lightning attraction)
- Mars × Uranus → Electric (kinetic, restless charge)
- Venus × Saturn → Understated (beauty meets discipline; slow burn)
- Moon × Saturn → Understated (feeling meets structure; intimacy takes time)
- Weight: `Math.max(0.1, 1 - orb / 6)`

*Differentiation from Axis 1 (Intensity):* The Intensity axis is driven primarily by Mars × Mars and Mars × Pluto (energy and power). The Sexual Chemistry axis is driven by Venus × Mars and Venus × Uranus (attraction and spark). The planet pairs differ; the axes will not always correlate. A couple with Mars × Pluto but no Venus × Mars contacts can be intensely Fiery but not particularly Electric.

**Axis 7 — Life Pace: Steady ←→ Catalytic**

*What it measures:* The tempo at which this relationship moves and changes — whether it sustains a reliable, predictable rhythm or accelerates, disrupts, and catalyzes sudden change.

*Astrological derivation — aspect component:*
- Uranus × personal planets → Catalytic (Sun, Moon, Mercury, Venus, Mars)
- Mars × Mars (square, opposition) → Catalytic
- Saturn × personal planets → Steady
- Jupiter × Saturn in synastry → moderate Catalytic (expansion meets form)
- North Node × personal planets → Catalytic (fated acceleration)
- Weight: `Math.max(0.1, 1 - orb / 6)`

*Modality component:*
- Cardinal-dominant combined chart → Catalytic (Cardinal is initiating, action-oriented)
- Fixed-dominant → Steady (Fixed resists change, maintains)
- Formula: `(cardinalCount - fixedCount) / totalPlanets`
- Component weights: `0.40` modality, `0.60` aspect

---

### 3. The computation engine: `calculateCoupleProfile()`

**3.1** Function signature:

```typescript
export function calculateCoupleProfile(
  chart1: ChartData,
  chart2: ChartData,
  synastryAspects: SynastryAspect[],
  houseOverlay: HouseOverlay,
): CoupleProfile
```

**3.2** Aspect accumulation pattern (used by all aspect-based components):

```typescript
function accumulateAspectScore(
  aspects: SynastryAspect[],
  positivePairs: [string, string][],  // aspects that push toward right pole
  negativePairs: [string, string][],  // aspects that push toward left pole
): { score: number; totalWeight: number; drivers: string[] }
```

- Weight per aspect: `Math.max(0.1, 1 - orb / 6)`
- For each aspect matching a positive pair: `score += weight`
- For each aspect matching a negative pair: `score -= weight`
- `totalWeight += weight` for every matched aspect
- `drivers` accumulates a short string per matched aspect (e.g., `"Venus × Mars trine (0.8°)"`) for sentence generation
- Return `{ score, totalWeight, drivers }`

**3.3** Normalization:

- Raw `value = totalWeight > 0 ? Math.tanh((score / totalWeight) * 3) : 0`
- `Math.tanh` maps any real number to `(-1, 1)`, producing an S-curve with natural saturation. A couple with one tight high-signal aspect does not immediately peg the axis; it takes multiple confirming signals to reach 0.8+. A single dominant aspect reaches approximately ±0.5–0.6.
- `confidence = Math.min(1.0, totalWeight / 3.0)` — a confidence of 1.0 means at least 3 weighted aspect units have contributed. A confidence below 0.4 means the axis should be rendered differently (see Spec 5.4).

**3.4** Element/modality accumulation pattern:

```typescript
function computeElementRatio(
  chart1: ChartData,
  chart2: ChartData,
  positiveElements: Element[],
  negativeElements: Element[],
): number
```

- Combine planets from both charts, excluding asteroids
- Count planets in each element
- `score = sum(positiveElements count) - sum(negativeElements count)`
- `total = sum(all element counts) + 1` (prevent division by zero)
- Return `score / total` — this is already in `-1` to `+1` range

**3.5** No hardcoded denominators. The normalization is entirely data-driven through `Math.tanh` and the weighted accumulator. The axis will only reach ±0.9+ when multiple tight aspects of the same directional type are present.

**3.6** The `identifyKeyThemes()` function continues unchanged and is called at the `calculateSynastry()` level, with its result stored as `SynastryData.keyThemes`.

---

### 4. Sentence generation

Each `DimensionValue.sentence` is generated inside `calculateCoupleProfile()` based on which aspects drove the score. This is not a generic description of the axis pole — it is a specific sentence about what in the charts created this position.

**4.1** Each axis maintains an ordered list of "driver templates" keyed by the most significant aspect pair and the final value range. When `drivers` contains at least one entry, the sentence references the tightest driver. When `drivers` is empty (zero matched aspects), a fallback sentence references the element or modality component that drove the value instead.

**4.2** Example driver templates for Axis 1 (Intensity):

| Driver | Value range | Sentence template |
|--------|-------------|-------------------|
| `Mars × Mars` (any) | > 0.3 | "Your Mars signs meet directly — the energy between you is kinetic, combustible in the best sense, and unlikely to stay still for long." |
| `Mars × Mars` (square/opposition) | > 0.5 | "Your Mars contact is a square — the charge between you can power shared drives as forcefully as it can ignite conflict; the difference is direction." |
| `Sun × Mars` | > 0.2 | "One person's drive is animated by the other's core identity — this relationship has an assertive, forward-moving quality built into its center." |
| `Mars × Pluto` | > 0.4 | "Mars and Pluto in contact generate pressure — the kind that can feel transformative or overwhelming depending on the day, but never ordinary." |
| Element: Fire dominant | value > 0.3 | "Combined, your charts lean heavily toward Fire — the pace is quick, the instincts are strong, and patience for slow processes is not this relationship's natural gift." |
| Center / low confidence | near 0 | "The energetic charge between you sits in the middle ground — neither consistently heightened nor subdued, able to move in either direction as circumstances call." |

**4.3** Sentences are written as inline strings in `calculateCoupleProfile()`, keyed to specific condition checks. The logic is: find the highest-weight matched aspect pair, check whether it is the tightest aspect overall or one of the top three, check the nature field to choose between harmonious/challenging variants, then return the appropriate string.

**4.4** All sentences meet the following constraints:
- Reference the actual driver (planet pairing, element, or modality) rather than the axis label alone
- Both poles are described in neutral language; no sentence implies one pole is better
- Maximum length: two sentences. Most are one.
- No sentence can be applied to "any" couple; it must name something specific.

---

### 5. Visual rendering: `CoupleProfileSection`

**5.1** `CompatibilitySection` in `SynastryPage.tsx` is replaced in full by a new `CoupleProfileSection` component. The `ScoreBar` sub-component is deleted.

**5.2** Section heading and structure:

```
✦ Your Couple Profile
[brief one-line intro: "Seven dimensions of how you move together — not scores, just shape."]
[seven axis bars]
[divider]
[element compatibility string]
[modality compatibility string]
[key themes list]
```

**5.3** Each axis renders as follows:

```
[label]                          (e.g. "Intensity")
[left pole label] [────────●─────────] [right pole label]
                  (e.g. Calm)          (e.g. Fiery)
[sentence]
```

- The bar is a horizontal container: full width, fixed height (approximately `h-1` or `h-1.5` in Tailwind)
- The track color: `bg-mystic-gold/20` (no red, no green gradient)
- The marker is a small circle or diamond glyph, positioned by CSS `left` percentage derived from `(value + 1) / 2 * 100`
- Marker color: `text-mystic-gold` or soft white — a single neutral color regardless of position
- Left pole label: left-aligned at the start of the bar, `text-mystic-muted text-xs`
- Right pole label: right-aligned at the end, same styling
- Sentence: below the bar, `text-mystic-text/80 text-xs leading-relaxed`
- The axis label sits above the bar at `text-mystic-text text-sm font-medium`

**5.4** Low-confidence axes (confidence < 0.4):
- The axis still renders but the marker appears dimmed (reduced opacity, e.g. `opacity-40`)
- A small indicator "(limited data)" appears next to the axis label in `text-mystic-muted text-xs`
- The sentence is replaced with: "Not enough cross-chart contacts to characterize this dimension precisely."
- This communicates the absence of data without suppressing the axis entirely

**5.5** Hover / tap behavior on the marker:
- On desktop hover: a tooltip appears near the marker showing the axis name, the current qualitative position label (see Spec 5.6), and the sentence if it is not already visible
- On mobile tap: the sentence expands inline below the bar (the sentence is always visible on desktop; on mobile it may be collapsed to save space, expanding on tap)
- Hovering either pole label shows a one-line tooltip explaining that pole: e.g., hovering "Fiery" shows "High activation energy — driven, fast-paced, combustible chemistry"

**5.6** Qualitative position labels (used in tooltip headers and in the GPT prompt):

| Value range | Label template |
|------------|----------------|
| > 0.65 | "Distinctly [right pole]" |
| 0.35 to 0.65 | "Leaning [right pole]" |
| -0.35 to 0.35 | "Balanced" or "Centered" |
| -0.65 to -0.35 | "Leaning [left pole]" |
| < -0.65 | "Distinctly [left pole]" |

**5.7** The aspect count tally (harmonious / neutral / challenging in green / gold / red) is removed from the primary view entirely. If preserved anywhere, it lives in the `SynastryAspectsSection` collapse header as context, with no color coding.

**5.8** The `CurrentMoonWidget` that appears between `CompatibilitySection` and the GPT reading in the current `SynastryPage` (line 378) is removed from the synastry page. It provides today's moon information in the middle of a reading about a specific relationship, which breaks the intimacy of the reading.

---

### 6. Section order in `SynastryPage`

The page renders sections in this order:

1. Header
2. Bi-wheel (or current side-by-side, pending bi-wheel task)
3. `CoupleProfileSection` (this feature)
4. GPT interpretation
5. Synastry aspects (collapsed by default, not expanded)
6. House overlays (collapsed by default unless high-signal overlays exist)
7. Composite chart (collapsed by default)
8. Individual birth charts (collapsed by default)
9. Action buttons

`defaultOpen={true}` on `SynastryAspectsSection` (current line 114) is changed to `defaultOpen={false}`.

---

### 7. GPT prompt update: `buildSynastryPrompt()`

**7.1** The `## Compatibility Summary` block in `buildSynastryPrompt()` (lines 516–520 of `synastry.ts`) currently sends:

```
Element compatibility: ...
Modality compatibility: ...
Harmonious aspects: N, Challenging: N, Neutral: N
```

This block is replaced with a `## Couple Relational Profile` block that sends dimension values as qualitative labels:

```
## Couple Relational Profile
Intensity: [qualitative label] ([value to 2 decimal places])
Emotional Flow: [qualitative label]
Communication Style: [qualitative label]
Intimacy Rhythm: [qualitative label]
Growth Dynamic: [qualitative label]
Sexual Chemistry: [qualitative label]
Life Pace: [qualitative label]
Element profile: [elementCompatibility string]
Modality profile: [modalityCompatibility string]
```

**7.2** Qualitative labels sent to GPT use the full format: "Distinctly Fiery," "Leaning Reserved," "Balanced," etc. Raw numeric values are also sent in parentheses so the model can calibrate magnitude.

**7.3** The instruction block at the end of `buildSynastryPrompt()` adds:

```
The Couple Relational Profile above describes the character of this relationship on seven dimensions. Reference this vocabulary in the reading — use the dimension labels (Intensity, Emotional Flow, etc.) and the qualitative positions (e.g., "Distinctly Fiery," "Leaning Merging") naturally in the prose. Do not repeat all seven dimensions mechanically; integrate the most relevant ones into the narrative as they apply to the aspects and placements discussed.
```

**7.4** The `tightestSynastry` selection logic (lines 524–528) should be pre-filtered to personal planets only before selecting the tightest. An asteroid-to-asteroid semi-sextile should not become the lead aspect. Personal planets are: Sun, Moon, Mercury, Venus, Mars, Ascendant. The filter: `sortedAspects.filter(a => PERSONAL_PLANETS.includes(a.person1Planet) || PERSONAL_PLANETS.includes(a.person2Planet))` where `PERSONAL_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars']`.

**7.5** The label tokens "Person 1" and "Person 2" in the prompt are preserved for this feature. Name replacement is a separate enhancement in the sprint (within `SynastryPage.tsx` and `PartnerForm.tsx`) and does not require changes to `buildSynastryPrompt()` for this feature, unless the sprint delivers names before this feature ships, in which case the prompt should pass names via parameters and use them throughout the instruction block.

---

### 8. Edge cases

**8.1 Identical charts (twins or same birth moment):**
- Every planet pair produces a conjunction with orb 0.0. The aspect accumulator will receive many high-weight entries, all as conjunctions (nature: neutral).
- On aspect-based axes, conjunctions are direction-neutral (they don't push toward a pole). All axes will receive high confidence but near-zero value, clustering at center. This is arithmetically correct: identical charts have no differential signal.
- Element and modality components will also be balanced (both charts identical means same element counts).
- All seven axes will show "Balanced" or "Centered" with high confidence.
- The sentence for each axis should acknowledge the absence of differentiation: "Your charts are nearly identical — this axis has no differential signal because you share the same planetary disposition."
- No crash, no hang, no invalid state.

**8.2 Unknown birth time for one or both persons:**
- Axis 4 (Intimacy Rhythm) requires house overlay data. When either person's birth time is unknown, `houseOverlay` arrays are empty. The house component weight drops to `0.0` and the axis is computed from aspects only. The confidence field naturally reflects this: fewer signal sources = lower confidence. The "limited data" indicator (Spec 5.4) appears on this axis when house data is absent.
- No other axis depends on house data.
- The composite chart's Ascendant is meaningless when either birth time is unknown. This is a pre-existing issue unrelated to the couple profile feature, but the GPT prompt should gate the composite ASC line with an `unknownTime` check (same as the existing natal ASC gate at lines 469–472).

**8.3 Sparse aspect chart (few cross-chart contacts):**
- When two people have heavily clustered charts (most planets in 2-3 signs), they may produce very few synastry aspects. The accumulator `totalWeight` will be low.
- `confidence = Math.min(1.0, totalWeight / 3.0)` will be below 0.4 for most or all axes.
- Multiple axes display with the "limited data" indicator.
- The GPT prompt receives low `value` numbers and qualitative labels of "Balanced" for most dimensions.
- This is the correct output: a sparse synastry is genuinely hard to characterize on these axes.

**8.4 Maximum saturation (many tight high-signal aspects):**
- A couple with multiple Venus-Mars, Mars-Mars, and Sun-Moon contacts can accumulate very high `totalWeight`. `Math.tanh` naturally caps the value below 1.0. Even with `totalWeight = 10` and all positive signals, the value approaches 0.99 asymptotically rather than clipping to 1.0 exactly.
- The "Distinctly [pole]" label applies above 0.65, which is approximately equivalent to 2-3 tight confirming aspects. This is an appropriate threshold — it should not require an unusually aspected chart.
- The goal is that real, typical couples produce values spread across the spectrum rather than all clustering at the poles. The `* 3` multiplier inside `Math.tanh(score / totalWeight * 3)` calibrates this: it reaches ±0.7 approximately when there is one dominant tight aspect with moderate secondary confirmation.

**8.5 Axis 6 (Sexual Chemistry) with non-romantic pairs:**
- The product has no mechanism to detect whether a synastry is romantic or platonic.
- The axis renders unconditionally.
- The label "Sexual Chemistry" is not softened or renamed. Renaming it to "Physical Chemistry" or "Magnetic Attraction" is addressed in Open Questions.

**8.6 Dimension value exactly zero:**
- A value of `0.0` displays as "Balanced" with the marker precisely at center.
- The sentence differentiates between "zero from no aspects" (low confidence, "limited data" indicator) and "zero from balanced positive and negative aspects" (medium/high confidence, "balanced between [left pole] and [right pole]" sentence).

---

## Out of Scope

- **Bi-wheel chart rendering.** The synastry bi-wheel (replacing side-by-side chart wheels) is a separate task in sprint 0016. This proposal covers the couple profile axes only.
- **Name fields in `PartnerForm`.** Optional name input for both partners is a separate polish task. This proposal does not require names to function, though it should not block the names feature from being wired up later.
- **Composite chart wheel.** The composite chart rendering (replacing the data table with a chart wheel) is a separate lower-priority task in sprint 0016.
- **`DiscussModal` synastry context update.** Passing dimension values into the discuss modal context is a downstream improvement. This proposal does not specify it.
- **`SolarReturnBiWheel.tsx` duplication.** Carmack's note about the duplicated geometry primitives is a technical debt item, not part of this feature.
- **New static interpretation entries.** No new lookup table entries are authored. All axis sentences are generated dynamically from aspect data.
- **Astro-numerology or transit features.** No changes to transit, numerology, or solar return pages.
- **An "Overall Resonance" equivalent under a new name.** The concept is retired entirely.

---

## Open Questions

1. **Axis 6 label — "Sexual Chemistry" vs. "Physical Chemistry" vs. "Magnetic Attraction":** The current label is accurate for romantic synastry. If the product intends to serve non-romantic use cases (friendships, business partnerships, co-parents), "Sexual Chemistry" will produce complaints. The implementation team should decide before building: (a) keep the label as-is and accept that the app is primarily a romantic synastry tool, (b) rename to "Magnetic Attraction" with poles "Understated ←→ Electric," which describes the same thing without the explicit sexual framing, or (c) add a context toggle on the partner form ("Romantic / Platonic") and conditionally suppress or relabel Axis 6.

2. **Sentence generation location — inline strings vs. lookup table:** The spec calls for sentences generated inside `calculateCoupleProfile()` as inline conditional strings. An alternative is a lookup-table approach (keyed by axis, driver pair, and value range) that keeps the interpretive copy separate from the computation logic. The inline approach is simpler but harder to edit without touching engine code. The lookup-table approach is more maintainable for copy edits but adds indirection. The team should decide before implementation.

3. **Confidence threshold for "limited data" display:** The spec sets `0.4` as the confidence threshold below which axes display with the "limited data" indicator. This number was chosen as a design judgment, not derived from data. If typical real-world synastries produce many low-confidence axes (e.g., because the aspect pool is smaller than expected), the threshold may need adjustment. Consider logging dimension confidence values during testing and revising the threshold before final render decisions.

4. **`Math.tanh` multiplier calibration:** The spec uses `Math.tanh(score / totalWeight * 3)` where `3` is the multiplier. This value determines how "spread out" values are across the spectrum. A multiplier of `2` produces more clustering near center; `4` produces more extreme values. The correct multiplier should be verified against a set of diverse test charts (see Taleb's note about birth year correlations) to ensure the distribution of values across real users is approximately Gaussian rather than bimodal or pegged.

5. **`keyThemes` location after `CompatibilityScore` removal:** Currently `keyThemes`, `elementCompatibility`, and `modalityCompatibility` live on `CompatibilityScore`. When `CompatibilityScore` is deleted, these must move. The spec places them on `SynastryData` directly. Verify that no other file imports `CompatibilityScore` beyond `SynastryPage.tsx` and `synastry.ts` before removing the interface.

6. **Server-side prompt sync:** `buildSynastryPrompt()` lives in `src/engine/synastry.ts` (client). The server-side `server/engine/synastryEngine.ts` also builds the synastry prompt and calls OpenAI. These may be separate files with separate prompt logic. The server-side prompt must also be updated to reference the `CoupleProfile` dimension values, or the GPT reading will be generated from old-format compatibility data and will not use dimension vocabulary. The implementation must confirm which file the `getSynastryInterpretation` server route calls, and update that file's prompt accordingly.

7. **Caching in the server-side GPT route:** If the server caches synastry GPT results by a hash of the input (prompt text or natal positions), changing the prompt format will not invalidate already-cached results. Pre-existing cached readings will be returned without dimension vocabulary. The implementation should confirm whether server-side caching exists for synastry readings and, if so, ensure the cache key includes a schema version or that caches are invalidated on deploy.
