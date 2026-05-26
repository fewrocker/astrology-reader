# Review: code-reversed-meanings-depth

**Task:** sprint-0026-task-0003-code-reversed-meanings-depth
**Status:** Completed
**File changed:** `src/data/tarot/majorArcana.ts`

---

## What Was Done

Rewrote the `reversedMeaning` field for seven Major Arcana cards in `src/data/tarot/majorArcana.ts`, replacing negation-model meanings with off-axis expressions of each card's symbolic field.

### Cards Revised

**The High Priestess (II)**
Old meaning described intuition suppressed by logic. New meaning describes the more dangerous failure mode: intuition amplified past the point of error-correction, where inner certainty has become a private cosmology that cannot be shared, examined, or revised. The symbolic field (knowing below language, knowledge that cannot be verified externally) is present in both upright and reversed, operating in different registers.

**Strength (VIII)**
Old meaning offered two options (passivity or domination). New meaning describes the specific distortion the sprint card identified: identity organized around carrying the lion, where endurance has been confused with courage and the holding has become indistinguishable from who the person is. The open hand is still present — it has simply been held so long the letting go is no longer legible.

**The Hanged Man (XII)**
Old meaning described resistance to suspension. New meaning describes suspension without its transformative yield — the inversion imposed from outside, without the spiritual consent that would convert disorientation into revelation. The absence of the halo is named explicitly. The key distinction (willing suspension vs. enforced stopping experienced as punishment) is the organizing principle.

**Death (XIII)**
Old meaning described refusal of ending. New meaning describes being inside the passage: the transformation already underway, the old self genuinely gone, the new self not yet cohered. Death reversed is not someone holding the past; it is someone mid-crossing who cannot locate themselves in the process. The crossing is real; the map is absent.

**The Tower (XVI)**
Old meaning described deferred crisis (structure held up despite rotten foundation). New meaning describes what deferral costs: the full-time occupation of preventing the truth from landing, the expertise developed at routing around what cannot be examined, the specific thing a person has had to become in order to keep the Tower standing. Crisis deferral is reframed as a portrait rather than a condition.

**The Moon (XVIII)**
Old meaning offered two options (fears surfacing in distorted form, or fog clearing). New meaning describes managed fear — the loss of the anxiety that was functioning as a navigation instrument. The Moon reversed is not the fog lifting; it is the person who has stopped being disoriented by the dark, which means they have stopped being able to read it. What presents as confidence is a private navigation system that has quietly drifted from the actual territory.

**Judgement (XX)**
Old meaning offered two options (refusing the summons, or self-condemnation replacing honest reckoning). New meaning collapses this to the specific portrait: the waking that becomes prosecution. The trumpet has been answered. The rising has happened. What is reversed is not the call but the response — the person who stands up from the coffin and immediately asks whether they deserved to be in it.

---

## Quality Checks Against the Sprint Card's Criteria

1. **Symbolic field recognizable in both upright and reversed** — Yes. Each revised meaning operates in the same symbolic register as the upright, not in its opposite.

2. **Interior portrait connectable to a natal chart** — Yes. Each meaning names a psychology, a dynamic, or a quality of experience that GPT synthesis can map against house placements and transit activations. "The exhausted maintainer of a structure they already know cannot stand" is chartable in a way that "crisis deferred" is not.

3. **Recognizable without being told the card** — Yes. Each meaning is written to describe a real state. A person in the Strength reversed position would recognize "identity organized around carrying the lion" without needing the card named.

4. **No "alternatively" constructions** — Yes. All seven revised meanings are single coherent symbolic portraits. The two cards that had explicit "alternatively" constructions (Moon, Judgement) now have one clear register each.

5. **No negation of the upright** — Yes. None of the revised meanings pass as "the upright meaning, negated." They describe the same principle in a different register: internalized, resisted, or distorted.

6. **Length and register comparable to upright meanings** — Yes. All seven revised meanings are multi-sentence, written with comparable craft to the upright meanings. None are single-sentence placeholders.

---

## Build

`npm run build` passes cleanly. No TypeScript errors. The change is purely in string data — no type contract changes, no engine changes, no component changes.

---

## Scope Compliance

Change is confined entirely to `src/data/tarot/majorArcana.ts`, the seven named cards. No engine modifications, no GPT prompt changes, no component changes, no type changes. The quality improvement flows into synthesis through the existing `coreMeaning` selection at engine line 735.
