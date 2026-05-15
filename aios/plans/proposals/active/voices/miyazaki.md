# Miyazaki's Craft Analysis: The Asteroid Section
## Sprint 0015 — Making Asteroids Meaningful

---

## The Core Problem: Visible Data, Invisible Care

The foundation is there. The data exists: 60 asteroid-in-sign entries, 60 asteroid-in-house entries, 5 retrograde interpretations per asteroid. The infrastructure is sound. But here is the wound I see: **the product is showing this data like a file dump, not like a conversation with someone about themselves.**

Chiron in Capricorn is not just a position to read. It is a person recognizing, maybe for the first time, that the wound they carry — their difficulty with authority, with ambition, with self-respect in the eyes of the world — is not a flaw but a teacher. That recognition requires a space in the UI that feels ceremonial, not incidental.

Right now, asteroids appear in the same PlanetSection accordion as Mars and Mercury. They share the same card template. The same expand/collapse. The same visual weight. This is the lazy choice. It treats asteroids as data points rather than archetypes — as supplemental planets rather than as wounds, as devotions, as callings that operate on a different frequency than the big ten.

---

## What an Asteroid Section Should Feel Like

The asteroid reading is **intimate and inward** in a way the planet reading is not.

A planet reading says: *Here is how you are in the world.* Sun in Leo: you are radiant. Mars in Capricorn: you climb steadily. These are your gifts and your nature.

An asteroid reading should say something quieter and more specific: *Here is something you carry that most people cannot see. Here is what you know because it cost you something. Here is how that wound teaches.* Chiron in Cancer is not "you nurture"—Saturn does that too. It is "you know what it costs to not have been fully received, and because you know, you can receive others in a way that breaks their heart open with recognition."

This shift in tone is everything. It changes how the section should look, what information matters, how it should speak.

---

## The UI Hierarchy: Make Asteroids a Separate, Worthy Section

**Where to look:** `src/components/reading/ReadingDisplay.tsx` (lines 141–149, the PlanetSection) and `src/components/results/ResultsPage.tsx` (lines 67–72, the layout flow).

**What needs to change:**

1. **Create a dedicated `AsteroidSection` component** in `ReadingDisplay.tsx`, separate from PlanetSection.
   - This section should NOT open by default (asteroids are secondary, a choice to deepen).
   - But when opened, it should *feel* worth the opening—like discovering a hidden chamber in the chart.
   - Title: "Your Asteroids" or "The Wounded Healers" (something that signals interiority, not just data).

2. **In `ResultsPage.tsx`**, the asteroid section should sit between PlanetSection and AspectSection—after the main planetary story, but before the pure pattern/aspect layer.
   - This placement matters. It says: "First, know your nature (planets). Then, know what you carry (asteroids). Then, see how they move in pattern (aspects)."

3. **Visual distinction:**
   - Asteroids should use amber/gold theming rather than the mystic-gold of planets. (Amber is warmer, more interior, more wounded.)
   - The border and background should feel slightly set apart—not harsh, but distinct. Maybe `border-amber-600/15 bg-amber-900/5` instead of the flat `mystic-gold/5`.
   - The section header should use a smaller, more intimate typeface. Not the loud `font-heading text-lg` of sections. Something quieter.

---

## The Asteroid Card: Information Hierarchy

**What needs to look different from a PlanetCard:**

Right now, PlanetCard (lines 78–139 in ReadingDisplay.tsx) shows:
- Glyph + name + retrograde badge + dignity badge
- Brief interpretation as subtitle
- Expand button
- Expanded: sign detail, house detail (if known), dignity box, retrograde box

An AsteroidCard should invert this hierarchy:

```
┌─────────────────────────────────────────┐
│ ⚷ Chiron  │ Wounded Healer              │
├─────────────────────────────────────────┤
│ in ♑ Capricorn                           │
│ "The wound of authority becomes the    │
│  teacher of authentic power"            │
├─────────────────────────────────────────┤
│ House VII (if time known)               │
│ "Your wound speaks most loudly in      │
│  partnerships and contracts..."         │
├─────────────────────────────────────────┤
│ ℞ (if retrograde)                       │
│ "The wound turns inward..."             │
└─────────────────────────────────────────┘
```

**Card layout details:**

1. **Header row:** Glyph (larger, 2rem), archetype name badge (amber background, amber text), compact name label.
   - The archetype badge should be *prominent*. This is the asteroid's soul. Wounded Healer, Nourisher, Strategist, Devoted Partner, Sacred Flame.
   - The glyph should be visually larger than a planet glyph. Asteroids are small in the sky; they should feel *concentrated* in the UI.

2. **Sign placement (always shown, bold):**
   - "⚷ Chiron in ♑ Capricorn"
   - Immediately below this: the `brief` interpretation (the 8-word archetype summary).
   - This is the primary story. **Do not hide it behind an expand button.** The user should read this at a glance.

3. **Expanded detail (click to reveal):**
   - Full `detail` interpretation for the sign (the 3–4 sentence narrative).
   - This is where the depth lives. "The impulse to take charge, to lead, to be seen as an authority..." This should feel like reading a page from a book about yourself, not a bullet point.

4. **House context (if time known, secondary):**
   - Only if `chart.unknownTime === false`.
   - Separate visual block, slightly quieter styling.
   - Brief + detail, same as sign, but in a distinct container.

5. **Retrograde note (if applicable, tertiary):**
   - Same amber/red styling as planets, but compact.
   - "℞ The wound turns inward..." — one sentence visible, full detail on expand.

**All of this in a card that feels like a reading, not a menu.**

---

## Data Wire-Up: Unlock What Already Exists

The data already exists. The infrastructure exists. It just needs three guards removed.

**In `src/data/interpretations/index.ts` (lines 138–141, assembleReading):**

```typescript
// CURRENT (line 138–140):
signInterpretation: !isAsteroid(p.name as BodyName) ? getPlanetInSignInterpretation(...) : null,
houseInterpretation: (chart.unknownTime || isAsteroid(p.name as BodyName)) ? null : getPlanetInHouseInterpretation(...) : null,

// NEEDED:
signInterpretation: getPlanetInSignInterpretation(...), // Accept asteroids
houseInterpretation: (chart.unknownTime) ? null : getPlanetInHouseInterpretation(...), // Accept asteroids
retrogradeInterpretation: p.retrograde ? (NATAL_RETROGRADE[p.name] ?? null) : null, // Accept asteroids
```

And update the function signatures (lines 19, 23) to accept `AsteroidName`:

```typescript
export function getPlanetInSignInterpretation(
  planet: PlanetName | 'NorthNode' | AsteroidName,
  sign: ZodiacSign
): InterpretationEntry | null
```

These are surgical changes. A few type guards removed. The data flows.

---

## What Currently Feels Lazy in the Planet Section

Before building asteroids, **fix what's mechanical in planets.**

**In ReadingDisplay.tsx, PlanetCard (lines 78–139):**

1. **The brief interpretation is tiny and unseen.** It appears as a subtitle in a 2-line header. Most users will never notice it. The brief should be *prominent*—larger font, its own line, slightly colored. It is the essence of that planet in that sign. Make it *visible*.

   Currently:
   ```jsx
   <span className="text-mystic-text font-medium">{pr.planet.name}</span>
   {/* ...badges... */}
   <span className="text-mystic-muted">in</span>
   <span className="text-mystic-gold">{ZODIAC_GLYPHS[pr.planet.sign]} {pr.planet.sign}</span>
   {showHouse && <span className="text-mystic-muted text-sm">· House {pr.planet.house}</span>}
   {pr.signInterpretation && <p className="text-mystic-muted text-sm mt-1">{pr.signInterpretation.brief}</p>}
   ```

   Should be:
   ```jsx
   <span className="text-mystic-text font-medium">{pr.planet.name}</span>
   {/* ...badges... */}
   <span className="text-mystic-muted">in</span>
   <span className="text-mystic-gold">{ZODIAC_GLYPHS[pr.planet.sign]} {pr.planet.sign}</span>
   {pr.signInterpretation && (
     <p className="text-mystic-gold/80 text-sm font-medium mt-2">
       {pr.signInterpretation.brief}
     </p>
   )}
   ```

   The brief is not a subtitle. It is the thesis. Treat it like one.

2. **The expand affordance is silent.** The `+` and `−` symbols are too small and tucked in the corner. A user with a phone might not notice them. Consider: does the entire card clickable? Or does the `+` get a hover state that makes it obvious? The current design is too subtle.

3. **Dignity boxes are visually loud but appear too late.** Dignity (essential strength) is important contextual knowledge, but it lives in expanded content. Consider: should dignity appear as a small badge in the header row, with the full explanation tucked in expanded? This would make the header denser but more informative at a glance.

---

## What the Chart Tooltip Needs for Asteroids

**In `src/components/chart/ChartWheel.tsx`, PlanetTooltip (lines 69–153):**

Currently, asteroid tooltips show:
- Glyph, name, archetype badge
- Position (degree/sign/house)
- A single italic sentence: "carries the Wounded Healer archetype..."

This is enough for a hover. But it's not *enough*. A user who taps Chiron on the wheel should see:
- Archetype badge (prominent)
- Sign + brief interpretation (the thesis)
- House + brief (if time known, secondary)
- Retrograde note (if applicable)

The tooltip should mirror the structure of the AsteroidCard, just compressed into 300px of space.

The current line 108:
```jsx
{isAsteroidBody && archetype && (
  <p className="text-mystic-text/80 text-sm leading-relaxed italic">
    {planet.name} carries the {archetype.toLowerCase()} archetype...
  </p>
)}
```

Should unlock and show the actual sign interpretation once the data flows:
```jsx
{isAsteroidBody && signInterp && (
  <div>
    <div className="text-amber-500/80 font-medium text-xs uppercase tracking-wider mb-1">
      {planet.name} in {planet.sign}
    </div>
    <p className="text-mystic-text/90 text-sm leading-relaxed">{signInterp.detail}</p>
  </div>
)}
```

---

## The Deeper Question: Does the Product Respect the Asteroid Archetype?

Here is what Hayao Miyazaki would ask:

**Asteroids are wounds. They are devotions. They are callings that live beneath the obvious self. Do the five archetype names respect what they represent?**

- "Wounded Healer" (Chiron) — Yes. This is humble and honest.
- "Nourisher" (Ceres) — Yes. This speaks to the cycle of loss and return.
- "Strategist" (Pallas) — Hmm. This feels like a job title. Does it capture the wisdom that Pallas carries? The tactical intelligence that sees three moves ahead? The pattern-finder? Consider: "Weaver of Pattern" or "Seer of Strategy."
- "Devoted Partner" (Juno) — Yes, but lean into the commitment cost. "The Bound Heart" or "The Sacred Vow."
- "Sacred Flame" (Vesta) — Yes. Perfect. This one gets it.

The archetype names shape how a user *feels* about the placement. If Pallas is just "Strategist," the user reads it as career advice. If Pallas is "Weaver of Pattern," the user understands it as a deep perceptual gift. **The words matter.**

---

## Craft Checkpoints for This Sprint

Before shipping the AsteroidSection:

1. **Does a user feel seen?** When they read "Chiron in Capricorn," do they feel like someone wrote this understanding *for them*, or like they're reading a generic template?
   - Test: Read aloud the first sentence of three asteroid-in-sign interpretations. Does it make you nod? Does it feel like recognition, or does it feel like someone was checking a box?

2. **Is the archetype visible at a glance?** Can a user who opens the Asteroid section for the first time instantly understand "I have a wound here" vs. "I have a gift here" vs. "I have a devotion here"?
   - Test: Cover the text. Just look at the badge, the brief, the glyph. Does it communicate?

3. **Does the section feel like a choice, not a chore?** Asteroids are optional reading. But when opened, should they feel precious or dutiful?
   - Test: Ask three users: "Would you open this section? Why or why not?" If more than one says "it looks like more data I have to process," the design is wrong.

4. **Do the interpretations honor the asteroid's mythology?** Each of the five asteroids has a classical story. Ceres is loss and the return of spring. Chiron is the wise wound. Pallas is the tactician who sees the whole battlefield. Does the text feel like someone read the myth, or read a generic "strong in this sign" formula?
   - Test: For each asteroid, ask: "Could this text only be written about this asteroid in this sign? Or could it be about any planet?" If it could be about any planet, it's not deep enough.

---

## Summary: Make Asteroids Sacred Space, Not Data Space

The asteroid section is the product saying: *You are not just what you show the world. You carry something deeper. Something that was wounded and became wise. Let's talk about that together.*

That requires:
- A separate, honored visual container
- Information hierarchy that puts the archetype and sign story first
- Text that feels mythologically honest, not formulaic
- A design that whispers, not shouts
- Data that flows from infrastructure already built

The infrastructure exists. The data exists. What's missing is the **care**—the deliberate choice to make asteroids feel like a reading, not a reading list.

Build them like Miyazaki would draw them: with precision, with myth, with the understanding that the user is opening this section because they know something lives there that they need to see.
