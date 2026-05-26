# feat-saved-reading-detail-view

**Type:** Feature

**Originated by:** Steve Jobs, Hayao Miyazaki

---

## Problem / Opportunity

In `/projects/astrology-reader/src/components/tarot/SavedReadingsPage.tsx`, the `DetailModal` component renders the saved synthesis at lines 116–118:

```tsx
{typeof reading.synthesis === 'string'
  ? reading.synthesis
  : JSON.stringify(reading.synthesis, null, 2)}
```

When the synthesis is a structured object — which it always is for three-card and Celtic Cross readings, and which it will be for single-card readings once save wiring is completed — the user sees raw `JSON.stringify` output with `null, 2` pretty-printing. They open a saved reading and are presented with a developer debugging artifact: `{"openingSentence":"...","mainTheme":"...","tension":"..."}` rendered in a `<p>` tag with `whiteSpace: 'pre-wrap'`.

This is not an edge case. The three-card synthesis payload (`TarotThreeSynthesisPayload`) and the Celtic Cross synthesis (`SynthesisChapter[]`) are both structured objects. Every saved reading from these two spread types — which together represent the majority of advanced readings — displays as raw JSON.

What is being wasted is the full richness of the synthesis that GPT already produced and the database already stored. The `SynthesisChapter` type (`heading: string`, `body: string`) for Celtic Cross holds named chapters — Opening, Main Theme, Tension, Direction, Hidden Influence, Advice, Timing, Reflection. The three-card synthesis payload has an opening sentence, positional interpretations per card, and a closing passage. All of this was crafted by GPT with the user's natal chart, live transits, lunar phase, and intention as context. It is stored correctly. It is simply never rendered correctly when the user returns.

Beyond the synthesis, the `DetailModal` shows no card image, no element indicator, no spread type beyond a small muted label, no lunar phase (despite the empty-state copy explicitly promising "marked by the moon that was present when you drew"), and no reversal state for any card. The visual container — `background: '#1a1a2e'`, `border: '1px solid #3a3a5c'`, `color: '#ccc'` — does not belong to the same product as the reading surfaces that use the Tailwind mystic design system, the `SECTION_CONTAINER` pattern, the gold serif headings, and the element-tinted gradients.

---

## Vision

A user who had a difficult week drew The Tower on a Thursday evening. They read the synthesis, felt seen, and tapped Save. Now it is Sunday morning. They return to their Saved Readings list and tap the tile. What they find should feel like opening a journal that kept their reading perfectly.

The card is there — illustrated, named, its reversal state visible. Below it, the intention they wrote that evening sits in italic gold, as if it were an inscription. Below that, each chapter of the synthesis unfolds in the same typographic register used in the live reading: section headings in the small caps tracking of `SECTION_HEADER`, body paragraphs in the warm muted white of `BODY_TEXT`, the chapter rhythm rising through Opening, Main Theme, and Tension to Direction and Advice and closing with the Reflection prompt — the same closing ceremony the live reading gives. The lunar phase from that evening is visible: a small crescent glyph and the phase name anchoring the reading in its moment in time. The spread type and date are present without being dominant — a quiet frame around the reading, not the reading itself.

Nothing needs to be re-requested from GPT. Nothing is being reconstructed. The reading was preserved whole. The user is simply allowed to read it as a reading.

This is the difference between a product that stores data and a product that keeps a practice. The person who returns to their saved readings is not looking for a record. They are looking for the reading to still be there, and to still mean something.

---

## Specifications

### Synthesis Rendering

1. The `DetailModal` must not call `JSON.stringify` on the synthesis object under any circumstance. The condition `typeof reading.synthesis === 'string'` remains valid only for legacy single-card readings saved as plain text; structured objects must be rendered through their own display path.

2. When the synthesis is a plain string (single-card reading, prose format), it must be rendered as styled paragraphs using the same paragraph-splitting logic used in `SingleCardSynthesisPanel` — splitting on newlines or sentence groupings — with `text-mystic-text/90 leading-relaxed text-sm` styling, not `color: '#ccc'` in a pre-wrap container.

3. When the synthesis is a `SynthesisChapter[]` array (Celtic Cross format), each chapter must be rendered as a distinct visual block. The chapter heading renders in the `SECTION_HEADER` style (`text-mystic-muted text-xs uppercase tracking-widest`). The chapter body renders in `BODY_TEXT` style (`text-mystic-text/90 text-sm leading-relaxed`). Chapter blocks are separated by the same `SECTION_CONTAINER` border-and-background structure used in `TarotInterpretationPanel` (`border border-mystic-gold/20 rounded-xl bg-mystic-surface/50 p-6 mb-4`).

4. When the synthesis is a structured three-card synthesis object, each card's positional text (Past / Present / Future, or the active spread mode positions) must be rendered as a labeled section matching the spread position name. The overall synthesis opening and closing passages must appear as their own blocks — the opening above the card sections, the closing below.

5. A thin gold divider (`flex-1 h-px bg-mystic-gold/20` with a `✦` center glyph) must appear above the synthesis region, matching the threshold divider used in `SingleCardSynthesisPanel`, visually signaling the transition from metadata to interpretation.

6. If the synthesis field is null or an empty object, the synthesis region does not render at all. No placeholder text, no error state — the reading is complete without it.

### Card Display

7. The first card drawn (the card whose name appears in `reading.firstCardName`) must be displayed as a named visual anchor at the top of the detail view. The card name renders in the Cormorant Garamond font family at a size visually equivalent to `1.5rem`, in `#c9a84c` gold — as it currently does — but must also show the reversal state: if the card was drawn reversed, the word "reversed" appears in muted italic beneath the card name, not appended inline.

8. For three-card and Celtic Cross readings, all drawn cards must be listed. Each card entry shows the card name in gold serif and its spread position label in the muted small caps style. Reversal state must be shown for each card where applicable.

9. If card imagery is available in the deck asset system, a card illustration renders for the first card (or all cards in multi-card readings) at an appropriate thumbnail size. If imagery is not available or cannot be resolved, the card name and position label are sufficient — no broken image states, no placeholder boxes.

10. The element of the first card (Fire, Water, Earth, Air) must be represented visually. The approach that matches the live reading: a faint element-tinted background (`rgba(255,120,0,0.03)` for Fire, `rgba(0,80,180,0.03)` for Water, etc.) applied as the modal's backdrop overlay, or an element indicator label beside the card name in a muted accent color.

### Spread Metadata

11. The spread type must be rendered using the human-readable label produced by `readingTypeLabel()` — "Single Card", "Three Card · Past · Present · Future", "Celtic Cross" — in the muted small caps style. This already exists in the current modal header; it must be preserved.

12. The user's intention (`reading.intentPreview`) must be displayed in italic gold beneath the spread type label, not in muted gray. It is the emotional anchor of the reading — the question the user brought — and must be visually distinguished from metadata.

13. The date of the reading must display as an absolute date (e.g., "Thursday, May 22, 2025") in addition to the current relative time format. For readings older than 7 days, show the absolute date as the primary display and the relative time in secondary muted text. For recent readings, the relative form is sufficient.

14. The lunar phase at the time of the reading must be displayed. This field is stored in the `astroContextSnapshot.moonPhase` on `SavedCelticCrossReading` and as `moonPhaseName` on the synthesis payloads. It renders as a small crescent glyph (`☽`) followed by the phase name in `text-mystic-muted/80 text-sm`, positioned between the date line and the synthesis region. This fulfills the promise made in the empty-state copy: "marked by the moon that was present when you drew."

15. The personal day number at the time of reading, if stored in the snapshot, should appear as a secondary metadata line. It is not required for the initial implementation but should be included if the data is present in the saved payload.

### Visual Identity

16. The `DetailModal` container must adopt the visual language of the live reading surfaces. The background must use the deep mystic gradient (`linear-gradient(160deg, rgba(28,20,40,0.98) 0%, rgba(13,10,26,0.98) 100%)`) rather than the flat `#1a1a2e`. The border must use `border-mystic-gold/20` (translucent gold, `rgba(201,168,76,0.2)`) rather than the flat `#3a3a5c`.

17. The modal must use the Tailwind `font-heading` class (`Cormorant Garamond`) for card names, section headings, and the intention line. It must not fall back to system serif for any user-facing text.

18. The modal's close button must retain its current position (top-right) but use the mystic color system: `text-mystic-muted` at rest, `text-mystic-gold` on hover.

19. The modal's internal scroll container must have padding sufficient to prevent synthesis chapters from pressing against the container edge. The current `padding: '1.5rem'` is adequate for the header; synthesis chapters must have consistent internal spacing matching the `p-6` inside each `SECTION_CONTAINER` block.

20. On mobile viewports (below 640px), the modal must occupy the full viewport height from the bottom (a bottom sheet presentation) rather than a centered floating panel. This matches how other deep-content panels behave in the product.

### Loading and Error States

21. When the user taps a tile, the detail fetch is in progress, and the modal has not yet opened, the current loading overlay ("Gathering your reading...") is adequate. The text must use `text-mystic-gold` as currently implemented.

22. If the detail fetch fails (network error, session expired), the loading overlay must not persist indefinitely. A brief error state with "This reading could not be loaded. Try again." and a retry action must replace it. The retry must re-issue the `getReading()` call for the same ID.

23. The delete confirmation flow inside the modal must be preserved exactly as it currently works. This feature does not touch delete logic.

### Acceptance Checks

24. A user opening a saved Celtic Cross reading must see each synthesis chapter rendered as a distinct labeled block with heading and body text — not as a JSON string. The browser's view-source must not contain the string `JSON.stringify` in any rendered output.

25. A user opening a saved three-card reading must see the spread mode name (e.g., "Past · Present · Future"), the three card names with their positions and reversal states, and the synthesis text rendered as readable paragraphs.

26. A user opening a saved single-card reading must see the card name, the intention in italic gold, the lunar phase with the crescent glyph, the date, and the synthesis as readable paragraphs.

27. The detail modal background, border, and typography must be visually indistinguishable from a live reading surface. A screenshot comparison of the detail modal and the `SingleCardReading` interpretation panel must show the same color palette, font treatment, and section spacing.

28. The lunar phase display must be present for any reading where the phase name is available in the stored payload. The empty-state copy ("marked by the moon that was present when you drew") must be honest: if the reading is saved with moon phase data, the detail view must show it.

29. On a viewport of 375px width, the detail modal must present as a bottom sheet and all synthesis content must be scrollable without horizontal overflow.

30. The detail view must not trigger any new GPT requests. All displayed content is read from the stored `FullReading` payload returned by `getReading()`. No network calls beyond the initial `getReading()` fetch are permitted for the detail view.

---

## Out of Scope

- Re-running or refreshing the synthesis from the detail view. The stored synthesis is canonical. No "Regenerate" or "Discuss" action is part of this feature.
- Adding a journal or notes field to the detail view. The journal entry ID field (`journalEntryId`) exists in the schema but editing journal entries is a separate feature.
- Editing or annotating saved readings.
- Modifying the tile list view (`ReadingTile`, `SkeletonTile`, pagination, or load-more behavior). Only the `DetailModal` component is in scope.
- The save wiring fix (`issue-save-wiring-three-flows`). This feature assumes readings are being saved correctly. If the save wiring is not yet complete, this detail view will have limited test coverage but the component work is independent and can proceed in parallel.
- Changes to the `readingsService.ts` API client, the server-side readings endpoints, or the database schema.
- Adding the lunar phase or moon data to readings that do not currently store it. This feature renders what is present; it does not backfill missing fields.
- Any changes to the `ReadingTile` component, including adding lunar phase or element indicators to the tile view. That enhancement is desirable but separate.
- Visual redesign of the `SavedReadingsPage` list container, header, or empty state.

---

## Open Questions

1. **Synthesis structure for three-card readings.** The `FullReading.synthesis` field is typed as `unknown`. The three-card synthesis stored in the database is the string returned by `callTarotThreeSynthesis()`, not a structured object. Confirm whether three-card synthesis is stored as a plain string or as a structured payload before implementing the three-card rendering path. If it is a string, the `splitReadableParagraphs()` approach applies directly.

2. **Card data availability in FullReading.** The `FullReading.cards` field is typed as `unknown[]`. Confirm the shape of each card record as stored — specifically whether it carries `cardId`, `reversed`, `position`, and enough data to resolve the card name and element without a secondary lookup into the 78-card dataset. The detail view must not require a separate fetch to display card information.

3. **Lunar phase storage across reading types.** For Celtic Cross readings, `moonPhase` is in `astroContextSnapshot`. For single-card and three-card readings (once save wiring is complete), the moon phase will be in the synthesis payload as `moonPhaseName`. Confirm that the server-side save handler for single and three-card flows persists this field into a queryable location in the stored record, so that `getReading()` returns it in `FullReading`.

4. **Card image asset resolution.** If card images are rendered in the detail view, what is the mechanism for resolving a card ID to its image path? The live reading surfaces use the card object directly (which includes an image path or reference). In the detail view, only the card ID or name may be available in the stored payload. A lookup function or asset map is needed if card images are to be shown.

5. **Bottom sheet vs. centered modal on mobile.** The current modal uses a centered `position: fixed` layout. Converting to a bottom sheet requires a different presentation layer. Confirm whether the mobile bottom-sheet treatment is in scope for the initial implementation or whether a centered modal with full internal scroll is acceptable as a first pass.
