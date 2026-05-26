# Completed Proposals Index

## Sprint 0026

### Issue Fixes

- `issue-natal-dominant-modality-gap` — natalDominantModality computed client-side but never threaded into any of the 3 synthesis payloads or GPT prompts. *Originated by: Carmack, Taleb*

### Code Enhancements

- `code-court-card-transit-adaptations` — 36 court card entries missing from TRANSIT_ADAPTATIONS; court cards received generic fallback text instead of rank/element-specific guidance. *Originated by: Carmack, Miyazaki, Taleb*
- `code-reversed-meanings-depth` — 7 Major Arcana reversed meanings written as simple negations; rewritten to describe off-axis, internalized, or blocked expressions of each archetype. *Originated by: Miyazaki, Carmack, Taleb*
- `code-synthesis-prompt-specificity` — GPT synthesis prompts lacked card-specificity constraints; rewrote prompt instructions to require verifiably card-specific observations. *Originated by: Jobs, Carmack, Miyazaki*

### Features

- `feat-chart-ruler-natal-personalization` — Chart ruler (planet ruling the Ascendant sign) was never derived or threaded into synthesis; GPT prompts could not reference the primary natal personalization signal. *Originated by: Jobs, Carmack, Miyazaki, Taleb*
- `feat-position-aware-instant-interpretation` — Instant (Level 1/2) interpretation showed the same generic text regardless of spread position; position label and meaning now displayed in the panel and used in the Level 2 fallback prompt. *Originated by: Jobs, Miyazaki*

## Sprint 0025

### Issue Fixes

- `issue-advance-signal-always-null` — Advance score never passed to tarot engine; all 5 ADVANCE_CATEGORY_NOTES entries are dead code. *Originated by: Jobs, Carmack, Taleb*
- `issue-discuss-context-thin` — SingleCard and ThreeCard discuss context omits natal signs, transits, lunar phase, and synthesis text. *Originated by: Jobs, Carmack, Miyazaki, Taleb*
- `issue-save-wiring-no-ops` — All three reading flows wire onSave to `() => {}` — save is a silent no-op despite "Saved ✓" UI confirmation. *Originated by: Jobs, Carmack, Miyazaki, Taleb*
- `issue-threecardreading-phantom-dependency` — useEffect dependency array references `instantInterpretations` which does not exist in scope. *Originated by: Carmack, Taleb*
- `issue-transit-context-null` — buildEngineCtx passes null for transit data, making all 397+ TRANSIT_ADAPTATIONS entries unreachable. *Originated by: Jobs, Carmack, Miyazaki, Taleb*

### Code Enhancements

- `code-tarot-shared-utilities` — shuffleTarotDeck, computeCardReversal, and transit setup duplicated across 3 reading flows with no shared source. *Originated by: Carmack, Taleb*

### Features

- `feat-natal-house-context` — TarotAstroContext has no house fields; "Moon in Cancer" when it should say "Moon in Cancer in the 8th house." *Originated by: Jobs, Carmack, Miyazaki, Taleb*
- `feat-saved-reading-detail-view` — Saved reading detail view renders synthesis as JSON.stringify output; no card image, lunar phase, or styled chapters. *Originated by: Jobs, Miyazaki*
