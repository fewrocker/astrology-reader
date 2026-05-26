## Type
Issue Fix

## Originated by
Steve Jobs (sprint-0025 voice), Hayao Miyazaki (sprint-0025 voice), sprint-0025 vision document, sprint-0025 code review

---

## Problem

### What the current discussContext strings contain

**SingleCardReading.tsx, lines 64–77** constructs the context passed to `TarotDiscussPanel` as a `useMemo` joining nine fields:

```
SINGLE CARD TAROT READING
Card: <name> (Reversed | Upright)
Arcana: <arcana>[, <suit>]
Core Meaning: <interpretation.coreMeaning>
Symbolic Theme: <interpretation.symbolicTheme>
Emotional Meaning: <interpretation.emotionalMeaning>
Practical Guidance: <interpretation.practicalGuidance>
Reflection Question: <interpretation.reflectionQuestion>
Personal Day: <personalDay>
```

None of these nine fields carries: natal Sun sign, natal Moon sign, natal Ascendant sign, dominant element, any transit aspect, retrograde planets, advance category, lunar phase, or any word from the GPT synthesis — even when the synthesis has already loaded before the user opens Discuss.

**ThreeCardReading.tsx, lines 880–888** is marginally richer. It includes all three card names with their core meanings and spread position labels, the user's intention, and one token of synthesis — the `mainTheme` or `openingSentence` from `activeSynthesis` if it exists, or the string `"Synthesis: Not loaded yet"` otherwise. It still does not include: natal signs, transit aspects, advance category, or lunar phase. The `astroContext` prop is imported by the component and in scope at the `discussContext` call site (line 879 assigns `const activeSynthesis = synthesisData ?? aiFallback` immediately above), yet nothing from `astroContext` is threaded into the string.

### What is missing

Both thin contexts omit:
- **Natal Sun, Moon, and Ascendant signs** — available in `engineCtx.natalSunSign`, `engineCtx.natalMoonSign`, `engineCtx.natalAscendantSign` in `SingleCardReading` (passed as `interpretation` data from the engine) and in `astroContext.natalSunSign`, `astroContext.natalMoonSign`, `astroContext.natalAscendantSign` in `ThreeCardReading`
- **Active transit aspects** — available in `astroContext.currentTransits` (an array of transit descriptions) and, at minimum, in the `dailyTransitSummary` already present as a prop on `ThreeCardReadingProps`
- **Lunar phase** — available in `astroContext.lunarPhaseName`
- **Advance category** — available in `astroContext.advanceCategory`
- **GPT synthesis text** — in `SingleCardReading`, the synthesis is fetched via `SingleCardSynthesisPanel`; it is not surfaced back up to the parent; in `ThreeCardReading`, `synthesisData` is in scope but only its opening line is included
- **Dominant element** — available in `astroContext.dominantElement`

### The consequence for discuss response quality

`handleTarotDiscuss` in `server/services/gptTarot.ts` (line 947) receives a `TarotDiscussPayload` containing `discussContext` as its only representation of the reading. The system prompt template embeds this string verbatim:

```
${payload.discussContext}
```

The assistant has no other source of information about the person or the reading. When a user opens Discuss after completing a single card reading, the assistant receives only the card's generic interpretation data. It cannot reference the natal Venus that governs a relationship question. It cannot confirm or extend what the GPT synthesis said — it does not know what the synthesis said. It cannot connect the card to a Saturn opposition or a waxing lunar phase. It can only discuss the card as if the user picked it from a textbook — not from a live sky above a specific person.

The voices flagged the concrete consequence: a user who draws the Three of Swords after a breakup, reads a synthesis grounded in their Venus placement and a Venus–Saturn opposition, and then opens Discuss to ask "is this telling me it's over?" — receives an answer that could have been given to any stranger asking about any Three of Swords. The natal context was computed. The synthesis was generated. The transit data was available. None of it arrived.

### Comparison with the CelticCrossReading reference pattern

`CelticCrossReading.tsx` builds its discuss context through a dedicated `buildDiscussContext` function (lines 151–175). That function:

- Opens with user intention and a dated header
- Includes a natal line: `Natal: <Sun>, <Moon>, <Ascendant> | Moon: <lunarPhaseName> | Personal Day: <personalDay>`
- Conditionally appends advance category when present
- Lists every card with its position name, core meaning, and astro headline
- Computes and appends pre-synthesis signals: Major Arcana count, dominant element, reversal count
- Appends the full AI synthesis as formatted chapter headings and bodies when `synthesisChapters.length > 0`

The result is a context string that carries the natal chart's three most identify-forming signs, the sky's current lunar phase, every card's astrological link, and everything the synthesis said. The discuss assistant operating on this context can respond to "what does the Tower in position 5 mean for my health" with awareness of natal Mars, active transit planets, and the synthesis chapter that addressed hidden influences.

The single-card and three-card flows have access to the same categories of data. They do not use it.

---

## Expected behavior

The `discussContext` string built in `SingleCardReading.tsx` and `ThreeCardReading.tsx` should carry the full reading payload so that the discuss assistant has the same situational awareness the synthesis GPT call had.

**For SingleCardReading**, the context should include:
- Reading type header with date
- User intention, or explicit notation that none was stated
- Card name, reversal state, arcana, and suit
- All interpretation fields currently present (core meaning, symbolic theme, emotional meaning, practical guidance, reflection question)
- Natal Sun, Moon, and Ascendant signs
- Dominant element and dominant modality
- Lunar phase name
- Personal day number
- Advance category, when present
- Top one or two active transit aspects from `currentTransits` or `dailyTransitSummary`
- GPT synthesis text (if the synthesis has loaded by the time Discuss is opened), either as a prose paragraph or structured by field labels

**For ThreeCardReading**, the context should include:
- All three card entries with spread position labels, reversal states, core meanings, and symbolic themes
- User intention
- Natal Sun, Moon, and Ascendant signs (from `astroContext`)
- Dominant element
- Lunar phase name
- Personal day
- Advance category, when present
- Daily transit summary or top transit aspects
- The full synthesis when loaded — not just the opening sentence but all chapters present in `synthesisData` (openingSentence, mainTheme, mainTension, direction, hiddenInfluence, advice, timing)

The implementation should mirror the structure of `buildDiscussContext` in `CelticCrossReading.tsx` (lines 151–175): a dedicated helper function, not inline template literals, so that the context string can be reasoned about, tested, and extended without touching the render logic.

The `TarotDiscussPanel` component itself (`TarotDiscussPanel.tsx`) requires no changes. The fix is entirely in the strings passed to its `contextString` prop at the two call sites.
