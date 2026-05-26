# Active Proposals Index

## Issue Fixes

- `issue-advance-signal-always-null` — Advance score never passed to tarot engine; all 5 ADVANCE_CATEGORY_NOTES entries are dead code. *Originated by: Jobs, Carmack, Taleb*
- `issue-discuss-context-thin` — SingleCard and ThreeCard discuss context omits natal signs, transits, lunar phase, and synthesis text. *Originated by: Jobs, Carmack, Miyazaki, Taleb*
- `issue-save-wiring-no-ops` — All three reading flows wire onSave to `() => {}` — save is a silent no-op despite "Saved ✓" UI confirmation. *Originated by: Jobs, Carmack, Miyazaki, Taleb*
- `issue-threecardreading-phantom-dependency` — useEffect dependency array references `instantInterpretations` which does not exist in scope. *Originated by: Carmack, Taleb*
- `issue-transit-context-null` — buildEngineCtx passes null for transit data, making all 397+ TRANSIT_ADAPTATIONS entries unreachable. *Originated by: Jobs, Carmack, Miyazaki, Taleb*

## Code Enhancements

- `code-tarot-shared-utilities` — shuffleTarotDeck, computeCardReversal, and transit setup duplicated across 3 reading flows with no shared source. *Originated by: Carmack, Taleb*

## Features

- `feat-natal-house-context` — TarotAstroContext has no house fields; "Moon in Cancer" when it should say "Moon in Cancer in the 8th house." *Originated by: Jobs, Carmack, Miyazaki, Taleb*
- `feat-saved-reading-detail-view` — Saved reading detail view renders synthesis as JSON.stringify output; no card image, lunar phase, or styled chapters. *Originated by: Jobs, Miyazaki*
