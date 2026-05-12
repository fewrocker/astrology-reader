# Proposal: Dream Journal Persistence

**Type:** Issue Fix
**Originated by:** Jobs + Miyazaki + Taleb + Carmack
**Impact:** High
**Effort:** Low

## Problem

The `DreamModal` component uses `DREAM_SESSION_KEY = \`dream-session-${todayKey}\`` where `todayKey` is today's date. This means every dream interpretation session is stored only for the current calendar day. When midnight passes (or the browser tab is closed and reopened the next day), the dream session is gone.

Dreams are cumulative — the themes that repeat across weeks and months are the significant ones. The current implementation discards exactly this information. Users who engage with the dream feature multiple times a week lose all that context. It also means GPT cannot be prompted to notice recurring patterns across sessions.

This is an incomplete implementation of a feature, not a design choice.

## Proposed Solution

1. **Persist dream sessions across days** — change the storage strategy from a single `dream-session-${todayKey}` key to an array of dream sessions stored under a stable key like `astral-dream-journal`. Each session entry includes: date, dream input text, and the interpreted result.

2. **Dream Journal view** — add a "Dream Journal" section within the Dream Modal (or as a secondary tab/view) showing past dream entries in reverse chronological order. Each entry shows the date, a snippet of the dream description, and the interpretation received.

3. **Cap at 60 entries** — prevent unbounded localStorage growth. When the cap is reached, oldest entries are evicted. Add a "Clear Journal" button.

4. **Pattern awareness in GPT prompt** — when there are 3+ dream sessions, include a brief summary of recurring symbols/themes from past dreams in the GPT prompt: "This user has had prior dreams involving: water (3×), running (2×)." This is the cross-session synthesis that makes the dream feature meaningfully richer.

## Why Issue Fix, Not Feature

The dream feature already promises to be a personal, persistent companion to the user's astrological journey. The current implementation fails that promise by losing data every day. This is a behavioral defect — the feature doesn't work as it should. Persisting the session across days is completing the feature to its implied specification, not adding a new one.

## Impact Assessment
- **Impact:** High — dream sessions are currently lost daily, making the feature feel throwaway when it should feel intimate and accumulating
- **Effort:** Low — localStorage array persistence, simple list UI, minor GPT prompt augmentation

## Dependencies
- `src/components/dream/DreamModal.tsx` — primary change location
- `src/services/gptInterpretation.ts` — augment dream prompt with history summary

## Implementation Summary

**Modified files:**
- `src/components/dream/DreamModal.tsx`:
  - Change storage key from `dream-session-${todayKey}` to `astral-dream-journal` (array)
  - Add session-save logic after each interpretation
  - Add journal view tab/section showing past entries
  - Add "Clear Journal" button
  - Cap at 60 entries (FIFO eviction)
- `src/services/gptInterpretation.ts` or `DreamModal.tsx`:
  - Augment dream interpretation prompt with recurring themes summary when 3+ prior sessions exist
