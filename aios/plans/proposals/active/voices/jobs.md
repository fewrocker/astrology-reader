# Analysis: The Asteroid Reading — Steve Jobs' Perspective

## The Opportunity: A Signature Moment Hiding in Plain Sight

We have all the infrastructure built. We calculated it, we rendered it, we drew the lines. And then we buried it. When someone taps Chiron on the wheel — the wound healer, the bridge between worlds — they see a single sentence in amber. That's it. Compare that to tapping Mars: you get sign interpretation, house interpretation, dignity, retrograde context, a full story about how Mars moves through their life. Chiron gets a label.

This is the work: **make asteroids tell a story worthy of being tapped.**

## What This Should Feel Like

When someone opens the Asteroids section (which they will, because they're curious), they should feel like they've stepped into something *different*—not busywork, not feature list, but **archetypal depth**. They should read about Chiron in Scorpio and think: "Oh, that's *specific*. That's not Saturn in Scorpio. That's the wounded healer meeting the depths." They should see Ceres in Capricorn and recognize themselves—the nurturing impulse meeting the builder's discipline, the care that constructs, the mother who works.

This is the signature moment: **A user reads an asteroid interpretation and feels seen by something they didn't know was in their chart.**

## The Gap: What We're Missing vs. What We Have

**What we have:**
- 60 asteroid-in-house interpretations in `planetInHouse.ts` (completely wired but silenced)
- 5 asteroid retrograde entries in `retrogrades.ts` (wired but silenced)
- The exact Chiron archetype we need as a quality model in the existing house entries
- A fully functional UI pattern in `ReadingDisplay.tsx` that knows how to render planet cards with sign, house, dignity, retrograde, expanded/collapsed states
- The data infrastructure to look up asteroid interpretations the same way we look up Mars

**What we don't have:**
- **60 asteroid-in-sign interpretations** — zero entries exist for Chiron/Ceres/Pallas/Juno/Vesta across all 12 signs
- **An AsteroidSection component** — asteroids are buried in the planets list like they're minor bodies
- **The three guards removed** — lines 138–141 of `index.ts` explicitly return `null` for asteroid interpretations

That's the whole job. Three types of missing data, one missing UI section, three lines of code to flip. But the *quality* of the 60 sign entries will determine whether asteroids become something users love or just another accordion they close.

## What Must Change

### 1. **The Content: 60 Asteroid-in-Sign Interpretations (High Stakes)**

**File:** `src/data/interpretations/planetInSign.ts`

The primary work of this sprint. Each of the 5 asteroids × 12 signs = 60 entries needed.

**The quality bar:** Look at the Chiron-in-house entries already in `planetInHouse.ts`. They are:
- Long enough to be worth reading (3-4 sentences of actual substance)
- Specific to Chiron's mythology and themes *filtered through that house*
- Honest about cost and gift, not just affirmation

The sign entries must do the same. **Ceres in Capricorn is NOT Saturn in Capricorn.**
- Ceres is nurture, nourishment, loss, devotion, and cyclical abundance
- Capricorn adds: structure, legacy, slow building, responsibility, work ethic, materiality
- The combination is unique: the care that builds lasting things, the nurturer who runs the farm, the loss that teaches discipline, devotion that builds something that outlasts

Same rigor for all 60. **Chiron-Aries** ≠ "you are wounded around independence." **Juno-Leo** ≠ "you commit dramatically." Write like someone who's read both the astrological tradition and the mythology.

**Why this matters:** This is where the product either feels *deep* or *shallow*. If asteroids get surface-level entries while classical planets get substantial text, users will feel the second-class treatment and skip the section. If these are genuinely good—distinguishable, specific, worth reading—asteroids become part of someone's reading practice.

---

### 2. **The Data Wiring: Unlock What Exists (Trivial Mechanically, Critical Strategically)**

**File:** `src/data/interpretations/index.ts`

**Lines 138–141 in `assembleReading()`:**
Currently:
```typescript
signInterpretation: !isAsteroid(p.name as BodyName) ? getPlanetInSignInterpretation(...) : null,
houseInterpretation: (chart.unknownTime || isAsteroid(p.name as BodyName)) ? null : getPlanetInHouseInterpretation(...),
retrogradeInterpretation: (p.retrograde && !isAsteroid(p.name as BodyName) && p.name !== 'NorthNode') ? (NATAL_RETROGRADE[p.name] ?? null) : null,
```

Change to:
```typescript
signInterpretation: getPlanetInSignInterpretation(p.name as PlanetName | AsteroidName | 'NorthNode', p.sign),
houseInterpretation: (chart.unknownTime) ? null : getPlanetInHouseInterpretation(p.name as PlanetName | AsteroidName | 'NorthNode', p.house),
retrogradeInterpretation: (p.retrograde && p.name !== 'NorthNode') ? (NATAL_RETROGRADE[p.name] ?? null) : null,
```

**Also:**
- **Line 19:** `getPlanetInSignInterpretation()` signature: change from `PlanetName | 'NorthNode'` to `PlanetName | AsteroidName | 'NorthNode'`
- **Line 23:** `getPlanetInHouseInterpretation()` signature: same change

The data already exists. We're just saying "actually, let asteroids use these lookups too." The 60 house and 5 retrograde entries ship to users immediately once sign entries are written.

---

### 3. **The UI: AsteroidSection Component (New Surface, Familiar Pattern)**

**File:** `src/components/reading/ReadingDisplay.tsx`

Create an `AsteroidSection` component following the exact pattern of `PlanetCard` and `PlanetSection`:
- Takes `asteroids: PlanetReading[]` (filtered from `reading.planets`)
- Each asteroid card shows:
  - **Glyph + name + archetype badge** in amber (different from classical planets' gold)
  - **Sign placement + brief** always visible
  - **House placement + brief** (if time known) always visible
  - **Expand/collapse** for detailed text
  - When expanded:
    - Full sign interpretation detail
    - Full house interpretation detail (if time known)
    - Retrograde note in red if applicable

**Example card structure:**
```
[Glyph] Chiron  [wound-healer archetype badge]
  
  ♏ Scorpio — The sacred wound in depth
  House 8 — The healer's mysteries
  
  [+]  (collapse arrow)
```

When expanded:
```
  CHIRON IN SCORPIO
  [Full 3-4 sentence interpretation]
  
  CHIRON IN HOUSE 8
  [Full house interpretation]
  
  ℞ RETROGRADE AT BIRTH (if applicable)
  [Retrograde note in red]
```

**Key aesthetic choices:**
- **Amber theming** (not gold): visually distinguishes asteroids from the 10 classical planets
- **Archetype badge visible at a glance** — this is the core identity, not metadata
- **Sign as primary story, house as secondary** — order tells the story
- **Retrograde note visually quieter** — red styling but smaller text

---

### 4. **Layout Integration: Add Section to Results Page**

**File:** `src/components/results/ResultsPage.tsx`

After `<PlanetSection>` (line 67), add:
```typescript
const asteroidReadings = reading.planets.filter(pr => isAsteroid(pr.planet.name as BodyName))
{asteroidReadings.length > 0 && <AsteroidSection reading={{ ...reading, planets: asteroidReadings }} showHouse={!chartData.unknownTime} />}
```

Position: after Planets, before Aspects. Asteroids are secondary to classical planets—they should not open by default, but they should feel like a real section, not an orphan.

---

### 5. **Chart Tooltip: Extend for Asteroid Detail (Wire-Up, Not New Render)**

**File:** `src/components/chart/ChartWheel.tsx`, `PlanetTooltip` component

Lines 71–74 already gate asteroid interpretation lookups to `null`. Once we unlock the data wiring in step 2, the tooltip will automatically show:
- Sign interpretation (once we have it)
- House interpretation (already exists in data)
- Retrograde note (if applicable)

**No new code needed here.** The infrastructure is already built; it just needs the data and the guards removed. The tooltip should render asteroids with the same richness as classical planets, just with amber color theming instead of gold.

---

## What to Cut

- **Don't add new asteroids.** Chiron, Ceres, Pallas, Juno, Vesta are enough.
- **Don't write asteroid transits.** That's a separate system and scope creep.
- **Don't write asteroid synastry.** Same reason.
- **Don't change the chart wheel geometry.** The asteroid ring is correct.
- **Don't write asteroid-specific aspect entries.** Minor aspects will show the fallback text; that's fine.

Focus. Depth, not breadth. Make asteroids *meaningful*, not comprehensive.

---

## Why This Matters: The Emotional Core

Right now, the app says: "Here's your personal planets. Here's how you move through the world." It's intimate and clear. But it leaves out something real: the transpersonal influences—the wounds we carry and heal, the devotion we offer, the wisdom we hold, the alliances we seek, the sacred flame we tend.

When someone reads that they have Chiron in Scorpio (the healer learning to embrace their own darkness), or Juno in Leo (the commitment that demands recognition and loyalty), they recognize themselves *differently*. It's not a feature; it's an opening.

**The signature moment:** Someone opens the Asteroids section, reads three sentences about Ceres in Capricorn, and thinks: "That's it. That's exactly what I do—I nurture by building, I love by working. I didn't have words for it until now."

That's when they share this with someone else. That's when it becomes theirs.

---

## Implementation Notes

1. **Write the 60 entries in batches of 12.** One asteroid × all 12 signs in one sitting. Quality will stay consistent within a batch.
2. **Reference the existing Chiron-in-house entries as your model.** That's the quality bar.
3. **Test the tooltip and cards.** Make sure the amber theming is distinct enough, the archetype badge is visible, the expanded state doesn't feel cluttered.
4. **Read the sprint vision side-by-side with the entries.** Every entry should prove that you understand both the asteroid's mythological core and how that core transforms in each sign.

---

## Files Touched

| File | Change | Scope |
|------|--------|-------|
| `src/data/interpretations/planetInSign.ts` | Add 60 asteroid entries | Content (primary) |
| `src/data/interpretations/index.ts` | Unlock asteroid lookups (lines 19, 23, 138–141) | Wiring (3-line change) |
| `src/components/reading/ReadingDisplay.tsx` | Add `AsteroidSection` component | UI (new section) |
| `src/components/results/ResultsPage.tsx` | Integrate `AsteroidSection` into layout | Layout (integration) |
| `src/components/chart/ChartWheel.tsx` | No changes needed | Already ready |

---

## Success Criteria

✓ All 60 asteroid-in-sign entries written, reviewed, and in the codebase  
✓ Data wiring changed: all three guards removed, function signatures updated  
✓ AsteroidSection renders with archetype badges, sign briefs, house briefs, expanded details  
✓ Chart tooltip for asteroids shows sign + house interpretation (no code changes, just data unlock)  
✓ Asteroids section appears after Planets in the results page layout  
✓ Amber theming visually distinguishes asteroids from classical planets  
✓ At least one user reads an asteroid interpretation and says "that's me"

---

## The Real Measure

This sprint works if someone with Chiron in Scorpio reads the interpretation and recognizes the specific shape of their wound, their medicine, their purpose. Not surface-level affirmation. Actual, substantive recognition.

Make asteroids worth opening. Make the section feel like a genuine part of the reading, not a footnote. Deep, not broad. Specific, not generic.

That's the work. That's what will make this resonate.
