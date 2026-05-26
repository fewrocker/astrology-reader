# feat-position-aware-instant-interpretation

**Type:** Feature
**Originated by:** Jobs, Miyazaki

**User guidance:** Prefer one true thing the user didn't already know over five plausible things they did. Show only the few connections that actually illuminate this person's question at this moment, said in a way that lands. Do not dump the research into the UI — distill ruthlessly. The reading must be anchored to what the user came to explore.

---

**Problem / Opportunity:**

Two gaps exist in the instant interpretation layer — the layer the user reads while GPT synthesis is loading, which is often the only layer a user fully reads before the full synthesis arrives.

**Gap 1 — `positionLabel` and `positionMeaning` are computed but never shown.**

`InstantInterpretation` carries `positionLabel: string | null` and `positionMeaning: string | null`, both populated by `computeInstantInterpretation` in `src/engine/tarot.ts` (lines 750–751). These fields are never rendered in `TarotInterpretationPanel.tsx`. The component renders six sections — Core Meaning, What It Carries, Today's Invitation, In Your Sky Now, Number, Sit With This — none of which surface the spread position or its meaning.

The consequence is that a user in a Three-Card or Celtic Cross reading opens the instant interpretation panel and reads a generic card description. Nothing in the panel tells them they are reading The Tower in the Shadow position, or The High Priestess in the Hopes and Fears position. The position name and meaning string — some of the most carefully written interpretive prose in the data layer — are silently discarded at the UI boundary. A user in a single-card draw and a user reading the same card in the Challenge position of a Celtic Cross see identical panels.

The Three-Card reading component (`ThreeCardReading.tsx`, line 415) implements its own local `TarotInterpretationPanel` that does render `positionLabel` and `positionMeaning` as a header block. But the canonical `TarotInterpretationPanel.tsx` used in `SingleCardReading.tsx` does not receive or render these fields at all — they are not in its props interface. The implementations have drifted: multi-card readings have a custom panel with position display; single-card does not (and does not need to for its own reading mode, but the canonical component is the one that should carry this capability for consistency and reuse).

**Gap 2 — The element-affinity fallback in `buildTransitInfluence` is position-blind.**

When no transit adaptation exists for a card (Level 1 lookup fails), the engine falls through to Level 2: element-affinity matching between the card's element and the dominant transit planet's element (`src/engine/tarot.ts`, lines 590–610). This fallback fires for all 16 court cards — Pages, Knights, Queens, Kings across the four suits — which have essentially no entries in `transitAdaptations.ts`.

The element-affinity fallback produces output like: "The current Saturn transit amplifies this card's Water nature — emotional depth and intuitive sensitivity are heightened now." This sentence is position-blind. It says the same thing whether the King of Cups appears in the Foundation position of a Celtic Cross (where it might represent a stabilizing emotional authority that has been the ground of the situation) or in the Outcome position (where it may be pointing toward a future state of emotional mastery the reading is moving toward). The `buildTransitInfluence` function signature receives only `card: TarotCard` and `astroContext: TarotAstroContext`. The `position: SpreadPosition | null` that is passed to `computeInstantInterpretation` is not forwarded to `buildTransitInfluence`. The function cannot produce position-aware output because the position is never given to it.

The `positionIndex`, `label`, and `meaning` fields of `SpreadPosition` are available at the call site in `computeInstantInterpretation` (line 706 of `src/engine/tarot.ts`) but are not threaded into the transit influence builder. The result is that all 16 court cards, plus any Minor or Major Arcana card that falls through Level 1, receive an element-affinity sentence that says nothing about where in the spread the card sits. For court cards — which are the most relational, role-dependent, and context-sensitive cards in the deck — this is an acute precision failure. A court card's meaning fundamentally depends on whether it is naming a situation, a person, an inner figure, a challenge, an aspiration, or a destination.

---

**Vision:**

A user draws The Knight of Cups in the Hopes and Fears position of a Celtic Cross under a Venus transit. Before the GPT synthesis loads, the instant interpretation panel opens with the position name — "Hopes and Fears" — displayed clearly, followed by the position's meaning in its own section: the paragraph explaining that hope and fear frequently live in the same card in this position, that what you most dread losing is often exactly what you most deeply want. Then the transit influence sentence reads something specific to a court card in this position — not "Venus amplifies Water energy," but a sentence that acknowledges both the card's Water nature and the positional charge of the hopes-and-fears slot, where longing and fear are inseparable.

The user has not yet received the GPT synthesis. But they already understand something real: this Knight of Cups, in this position, under this sky, is asking something specific. The position name is not a label. It is a frame. The transit sentence is not a generic element match. It is the element match seen through the positional lens.

For single-card draws, the panel's behavior is unchanged — there is no spread position, and the panel renders exactly as it does today. The feature is additive: it surfaces what is already computed but hidden, and sharpens what is already attempted but blind.

---

**Specifications:**

1. **Position header section in `TarotInterpretationPanel.tsx`.** When `interpretation.positionLabel` is non-null and non-empty, the panel renders a dedicated position section above "Core Meaning." This section displays the position label as a small-caps header in the gold accent color (`#c9a84c`), followed by the full `positionMeaning` string in muted italic body text. The visual weight is subordinate to the card name but prominent enough to read before descending into the card-level sections.

2. **Single-card draw renders no position section.** When `interpretation.positionLabel` is null — the case for all single-card draws — the panel renders exactly as it does today, with no position section and no empty space where one would have been. The feature is a conditional addition, not a structural change to the component's base layout.

3. **The position section is the first piece of interpretive content the user sees.** It appears before "Core Meaning," establishing the interpretive frame before the card's general meaning is read. A user should understand what position they are reading before they read what the card means in the abstract. The position provides the context that makes the card meaning specific; it is therefore rendered first.

4. **The position label and meaning displayed in `TarotInterpretationPanel.tsx` come entirely from `interpretation.positionLabel` and `interpretation.positionMeaning` — no additional props, no additional data fetching.** These fields are already on the `InstantInterpretation` interface and already populated by `computeInstantInterpretation`. The component needs only to render what it already receives.

5. **`buildTransitInfluence` receives `position: SpreadPosition | null` as an additional parameter.** The element-affinity fallback (Level 2) uses the position when available to modify the output sentence. The modification is directional: for positions with a temporal valence (past, recent-past, unconscious influence), the affinity sentence is framed as what has been operating; for positions with a forward or aspirational valence (future, near-future, outcome, conscious goal, gift), the affinity sentence is framed as what is moving toward or becoming available; for positions with a present or relational valence (present situation, challenge, inner state, self, other, bridge, mind, heart, action, situation), the sentence is framed as what is currently active or in tension.

6. **The position-aware element-affinity output distinguishes at minimum three positional registers: past/root, present/active, and future/emerging.** For a court card in a past or root position (Past, Recent Past, Unconscious Influence, Shadow, Theme), the element-affinity sentence acknowledges the card's element as something that has shaped or grounded the situation. For a court card in a forward-facing position (Future, Near Future, Outcome, Gift, Advice), the sentence frames the element as what is gathering or approaching. For a court card in a present or active position (Present Situation, Challenge, Inner State, Self, Other, Bridge, Mind, Heart, Action, Situation), the sentence names the element as what is immediately alive or in friction.

7. **No position-aware modification applies when `position` is null (single-card draw) or when the card does have a specific transit adaptation (Level 1 hit).** Level 1 always takes precedence. Position awareness is applied only at Level 2. If Level 1 fires, the output is the transit adaptation text verbatim — no positional modification is appended or prepended.

8. **Position-aware element-affinity output for court cards specifically acknowledges the relational register of the card.** Court cards represent figures, roles, and inner archetypes rather than events or abstract forces. When Level 2 fires for a court card (any Page, Knight, Queen, or King), the position-aware output names not just the element but also what the court card's rank suggests about the register of the positional meaning — a Page in a present-active position speaks to something emerging in the person or an encounter with a figure who is developing; a King or Queen in a past or root position speaks to an established authority or a completed quality of character that has shaped the ground.

9. **`positionLabel` and `positionMeaning` are also surfaced in the ThreeCardReading's local panel and in any future Celtic Cross per-card panel, using the same visual treatment as the canonical `TarotInterpretationPanel.tsx`.** The `ThreeCardReading.tsx` local `TarotInterpretationPanel` already renders position data in its own format (lines 449–459). After this feature, the canonical component and the ThreeCardReading component should use visually consistent treatments: same label typography, same meaning text style, same vertical placement above card-level sections. The ThreeCardReading component may continue to use its own layout for card-image and other reading-specific chrome, but the position display convention should be unified.

10. **The "In Your Sky Now" section continues to be the rendering point for `transitInfluence`.** The position-aware modification to `buildTransitInfluence` changes what string is produced; it does not change where that string is displayed. The "In Your Sky Now" section renders `transitInfluence` exactly as it does today. The only difference is that for court cards and other Level 2 fallback cases, the string itself is now informed by the spread position.

11. **When the element-affinity fallback fires for a court card with no spread position (single-card draw, `position` is null), the output is unchanged from the current behavior.** Position awareness is an enhancement for multi-card readings. Single-card draws with court cards continue to receive the existing generic element-affinity sentence. No regression is introduced for the single-card flow.

12. **The visual treatment of the position section in `TarotInterpretationPanel.tsx` matches the existing design language.** The label uses the same small-caps uppercase tracking style used for other section headers (`text-mystic-muted text-xs uppercase tracking-widest`). The meaning text uses a muted italic style at small size, consistent with the descriptive sub-text convention elsewhere in the panel. The section container uses the same `border border-mystic-gold/20 rounded-xl bg-mystic-surface/50 p-6 mb-4` container class as all other sections, with no special border treatment that would visually outrank the card's own interpretive content.

13. **The position section in the panel is visually distinct from "Core Meaning" — it is interpretive frame, not card meaning.** The position meaning describes the role of the slot in the spread; the core meaning describes what the card itself says. These are different kinds of information and should read as such. The position section may use slightly more muted text or a narrower container than the core meaning sections to convey that it is frame rather than content — but it must still be readable on first scroll.

14. **Edge case: Celtic Cross readings.** The Celtic Cross has ten positions, each with a distinct `positionMeaning`. When a Celtic Cross per-card panel renders using the canonical `TarotInterpretationPanel.tsx` or any component that uses `InstantInterpretation`, the position label and meaning should display for each card using exactly the same mechanism as three-card readings — no special-casing for Celtic Cross positions is required because `positionLabel` and `positionMeaning` are already populated from `SPREAD_POSITIONS` for all ten Celtic Cross positions.

---

**Out of Scope:**

- Adding transit adaptations for the 16 court cards. That is a data-layer task identified separately in the sprint-0026 vision. This proposal concerns only how the existing Level 2 element-affinity output is made position-aware; it does not expand Level 1 coverage.
- Changes to the GPT synthesis prompts or handlers in `server/services/gptTarot.ts`. Position awareness in the synthesis layer is already partially addressed by the prompt architecture; this proposal concerns only the instant interpretation layer.
- Visual animation or reveal sequencing for the position section. How sections are timed in the CardReveal animation flow is out of scope.
- Changes to the `SPREAD_POSITIONS` data itself. The position labels and meanings are not being revised here; they are being surfaced and used.
- Chart ruler derivation or natal context improvements. These are separate sprint-0026 targets addressed in other proposals.
- Changes to `ThreeCardReading.tsx`'s local panel beyond visual consistency alignment. The local panel's structural differences from the canonical component are not being unified here — only the visual treatment of position display should be made consistent.

---

**Open Questions:**

- Should the position section also appear in the saved reading detail view (`SavedReadingsPage.tsx`)? The saved reading detail view replicates `TarotInterpretationPanel`'s sections using local constants (design tokens copied from the panel on line 10 of `SavedReadingsPage.tsx`). If the canonical panel gains a position section, the saved reading view may need to follow. This is not addressed in the proposal scope but should be confirmed before implementation.
- For the position-aware element-affinity output, how many distinct positional registers are sufficient? The proposal specifies three (past/root, present/active, future/emerging). A finer-grained approach — writing distinct affinity language for each of the 15+ named positions across all spreads — would be more precise but may be disproportionate for a fallback path. The three-register approach is the minimum meaningful differentiation; whether to go further is a judgment call for the implementing sprint.
- The `ThreeCardReading.tsx` local panel renders position information already but with its own layout (the position label and meaning are displayed inside the card's container, above the card identity section). If the canonical panel gains a standardized position section, does the `ThreeCardReading.tsx` local panel migrate to use the canonical component, or does it continue as a custom implementation? The answer affects how much structural refactoring accompanies this UI change.
