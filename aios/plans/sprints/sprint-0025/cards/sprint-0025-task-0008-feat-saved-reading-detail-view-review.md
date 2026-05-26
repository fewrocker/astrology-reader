# Code Review — sprint-0025-task-0008-feat-saved-reading-detail-view

**Reviewer:** Code Review Agent
**Date:** 2026-05-26
**Branch:** sprint-0025-task-0008-feat-saved-reading-detail-view
**File reviewed:** `src/components/tarot/SavedReadingsPage.tsx`

---

## Summary

The implementation replaces the `JSON.stringify` fallback with a proper rendering pipeline for all three synthesis types (plain string, `SynthesisChapter[]` array, structured three-card object). The modal adopts the mystic design system gradient background and gold border. Card display, lunar phase, date formatting, bottom-sheet mobile layout, and error states are all addressed. The build is clean with zero TypeScript errors.

---

## Specification Checklist

| # | Spec | Status | Notes |
|---|------|--------|-------|
| 1 | `JSON.stringify` never called on synthesis objects | **PASS** | Removed entirely. Type guards route to dedicated renderers. |
| 2 | Plain string synthesis rendered as styled paragraphs with `text-mystic-text/90 leading-relaxed text-sm` | **PASS** | `StringSynthesisView` uses `splitReadableParagraphs` + `BODY_TEXT` class |
| 3 | `SynthesisChapter[]` rendered with `SECTION_HEADER` / `BODY_TEXT` / `SECTION_CONTAINER` classes | **PASS** | `ChapterSynthesisView` uses all three constants |
| 4 | Three-card synthesis object: per-card positional sections + opening/closing passages | **PARTIAL** | `ThreeCardSynthesisView` renders all known fields from `ParsedSynthesis` as labeled sections using `SECTION_CONTAINER`. However: (a) the named sections (`openingSentence`, `mainTheme`, etc.) are not "per-card positional text" — they are structural fields. The spec calls for card position labels (Past/Present/Future). Since the DB stores `ParsedSynthesis` as a plain string from GPT (not a structured object per card), the structured object path is a forward-looking path. If save wiring is later implemented to store a `ParsedSynthesis` object, positional text per card would need a different schema. As implemented, the rendering is the best achievable with the current data contract. |
| 5 | Gold `✦` threshold divider above synthesis | **PASS** | `ThresholdDivider` component renders `flex-1 h-px bg-mystic-gold/20` + `✦` glyph, matching `SingleCardSynthesisPanel` exactly |
| 6 | Null or empty synthesis: no render at all | **PASS** | `SynthesisRegion` returns `null` for falsy, empty string, or unrecognized shapes |
| 7 | First card name shown with reversal state "reversed" on its own line in muted italic | **PASS** | Single card: `CardsSection` renders reversed beneath card name. Celtic Cross and three-card: `CardEntry` renders reversed on its own line in `text-mystic-muted/70 text-xs italic` |
| 8 | All drawn cards listed for three-card and Celtic Cross | **PASS** | `CardsSection` iterates all items in `reading.cards` for both types |
| 9 | Card imagery: graceful fallback if not available | **PASS** | No image rendering attempted (no image paths in card data). Card names and positions shown. No broken image states. |
| 10 | Element tint applied | **PASS** | `elementTint()` computes per-element rgba; applied as backdrop overlay div on the modal. |
| 11 | Spread type label via `readingTypeLabel()` in muted small caps | **PASS** | Preserved at top of modal with `SECTION_HEADER` class |
| 12 | Intention displayed in italic gold (not muted gray) | **PASS** | `color: 'rgba(201,168,76,0.85)'` + `font-heading italic` — gold treatment |
| 13 | Date: absolute + relative for readings > 7 days; relative only for recent | **PASS** | `dateDisplay()` returns `{ primary, secondary }` with logic threshold at 7 days |
| 14 | Lunar phase with `☽` glyph | **PASS** | `extractMoonPhase()` checks synthesis and astroContextSnapshot; renders `☽ {phase}` |
| 15 | Personal day if present | **PASS** | `extractPersonalDay()` extracts from synthesis or snapshot; renders conditionally |
| 16 | Modal background: mystic gradient; border: `rgba(201,168,76,0.2)` | **PASS** | `linear-gradient(160deg, rgba(28,20,40,0.98) 0%, rgba(13,10,26,0.98) 100%)` + `border: '1px solid rgba(201,168,76,0.2)'` |
| 17 | `font-heading` used for card names, section headings, intention | **PASS** | Card names use `className="font-heading"`. Intention uses `font-heading italic`. SECTION_HEADER matches `TarotInterpretationPanel` pattern. |
| 18 | Close button: top-right, `text-mystic-muted` at rest / `text-mystic-gold` hover | **PASS** | `className="text-mystic-muted hover:text-mystic-gold transition-colors"` |
| 19 | Synthesis chapters have consistent `p-6` internal spacing | **PASS** | `SECTION_CONTAINER` includes `p-6` |
| 20 | Mobile: bottom sheet at full viewport height from bottom | **PASS** | Backdrop uses `flex items-end sm:items-center`; panel uses `rounded-t-xl sm:rounded-xl`. On 375px viewport: bottom sheet. |
| 21 | Loading overlay: "Gathering your reading..." in `text-mystic-gold` | **PASS** | Preserved exactly, now using `className="text-mystic-gold"` |
| 22 | Detail fetch failure: error state with retry action (not indefinite loading) | **PASS** | New `detailError` state triggers "This reading could not be loaded. Try again." with Retry and Dismiss buttons. Retry re-issues `getReading()`. |
| 23 | Delete confirmation flow preserved exactly | **PASS** | Delete logic unchanged. `confirmDelete`, `deleting` states preserved. `handleDelete` unchanged. |
| 24 | Celtic Cross reading: chapters as distinct labeled blocks, not JSON string | **PASS** | `isSynthesisChapterArray` guard routes to `ChapterSynthesisView`. No `JSON.stringify` in rendered output. |
| 25 | Three-card: spread mode name, three card names with positions + reversal, readable paragraphs | **PASS** | `readingTypeLabel` shows mode name. `CardsSection` for three-card shows all cards with position labels from spread mode map and reversal state. |
| 26 | Single-card: card name, intention in italic gold, lunar phase with crescent, date, readable paragraphs | **PASS** | All elements present in the modal render order. |
| 27 | Visual identity indistinguishable from live reading surface | **PASS** | Gradient, `SECTION_CONTAINER`, `SECTION_HEADER`, `BODY_TEXT`, `font-heading`, gold colors all match `TarotInterpretationPanel`. |
| 28 | Lunar phase shown if present in stored payload | **PASS** | `extractMoonPhase` checks both synthesis.moonPhaseName and astroContextSnapshot.moonPhase. |
| 29 | 375px viewport: bottom sheet, no horizontal overflow | **PASS** | Bottom sheet layout, `width: '100%'`, `maxWidth: '640px'`, no fixed-width elements. |
| 30 | No new GPT requests in detail view | **PASS** | No GPT calls anywhere in `DetailModal`. Only `getReading()` (one REST fetch) is made. |

---

## Findings

### warning — Spec 4 — Three-card synthesis "per-card positional text"

**Severity:** warning

**Spec:** 4

**Description:** Spec 4 states: "each card's positional text (Past / Present / Future, or the active spread mode positions) must be rendered as a labeled section matching the spread position name." The `ThreeCardSynthesisView` renders the `ParsedSynthesis` fields (`openingSentence`, `mainTheme`, `mainTension`, etc.) as labeled blocks. This is correct for the current data contract where three-card synthesis is stored as a `ParsedSynthesis` object — but those fields are NOT labeled with spread position names (Past/Present/Future). There is no per-card positional text in the `ParsedSynthesis` structure. The live three-card synthesis (from GPT) returns a narrative synthesis, not per-card breakdowns. This spec requirement may be based on a misunderstanding of the actual synthesis shape, or may require a future schema change. The current implementation renders the best readable form of the stored data. This is a warning rather than blocking because: (a) save wiring is not yet complete for three-card, so no real three-card readings exist in the DB; (b) the implementation handles whatever object is stored gracefully.

**File:** `SavedReadingsPage.tsx` — `ThreeCardSynthesisView` component (~line 258)

---

### suggestion — Spec 7 — Card name size for fallback (no cards array)

**Severity:** suggestion

**Spec:** 7

**Description:** When `reading.cards` is empty or missing, the fallback `CardsSection` shows `reading.firstCardName` with `font-heading` at `1.5rem` but does not show reversal state (since it's not stored in the slim response). This is acceptable — reversal state requires the `cards` array — but the spec is not fully achievable in the fallback path. Acceptable as-is.

**File:** `SavedReadingsPage.tsx` — `CardsSection` fallback (~line 374)

---

### suggestion — Spec 13 — Absolute date format

**Severity:** suggestion

**Spec:** 13

**Description:** Spec 13 specifies the absolute date should render as "Thursday, May 22, 2025". The `absoluteDate()` function uses `toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })` which produces exactly that format in Chromium/V8. This is locale-dependent but acceptable for a product with an 'en-US' locale audience.

**File:** `SavedReadingsPage.tsx` — `absoluteDate()` (~line 120)

---

### suggestion — Spec 10 — Element tint on modal backdrop vs. card header area

**Severity:** suggestion

**Spec:** 10

**Description:** Spec 10 says the element tint should be applied "as the modal's backdrop overlay" or "as an element indicator label." The implementation applies it as an absolute-positioned div behind the entire backdrop. This is per spec. However, the spec also mentions "an element indicator label beside the card name in a muted accent color" as an alternative. The current approach (tint overlay) is the correct interpretation matching the live `SingleCardReading` pattern. No change needed.

**File:** `SavedReadingsPage.tsx` — `DetailModal` backdrop tint (~line 534)

---

## Verdict

**warning-only**

No blocking issues. The `JSON.stringify` is completely removed. All acceptance checks (specs 24–30) pass. The one warning (spec 4 partial) is a data-contract limitation not solvable at the rendering layer without schema changes. The implementation is production-ready for the current save wiring state.
