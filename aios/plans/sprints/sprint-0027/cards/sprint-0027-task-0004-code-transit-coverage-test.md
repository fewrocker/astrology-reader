---
**Type:** Code Enhancement
**Originated by:** Carmack
---

## Problem / Opportunity

`src/data/tarot/__tests__/cards.completeness.test.ts` (line 98–100) contains one assertion about transit adaptation coverage:

```
it('has at least 50 transit adaptation entries', () => {
  expect(TRANSIT_ADAPTATIONS.length).toBeGreaterThanOrEqual(50)
})
```

This is a floor count on the total array length. It provides no guarantee about which cards are covered. After sprint 0027 adds roughly 60–90 new entries to close the pip card gap, the threshold of 50 becomes trivially satisfiable — a single future deletion that removes all entries for a specific card would leave the count well above 50 and pass every existing test without complaint.

There is already a test that all `cardId` values in `TRANSIT_ADAPTATIONS` reference valid cards (lines 111–119). That test runs in the other direction: it ensures no phantom entries creep in. There is no test running in the direction that matters most for data completeness: it ensures no real cards drop out. The Two of Wands and the Nine of Swords are indistinguishable from the test's perspective — both are absent before this sprint, neither would cause a test failure if absent after it.

The practical consequence is that file reorganizations, suit-level refactors, or editing accidents that touch `transitAdaptations.ts` can silently remove all entries for one or more pip cards. The engine's three-level fallback will degrade those cards to generic Level 2 output, and nothing in the test suite will flag the regression.

## Desired State

After sprint 0027 ships its pip card entries, a new assertion is added to `src/data/tarot/__tests__/cards.completeness.test.ts` that iterates every pip card — Two through Nine of wands, cups, swords, and pentacles (32 cards total) — and verifies that at least one entry exists in `TRANSIT_ADAPTATIONS` for each one.

If any pip card is missing, the test fails with a message naming the specific card ID, such as `Missing transit adaptations for two-of-wands`. This makes the failure immediately actionable: the developer knows exactly which card lost its data, not that some aggregate count dipped below a threshold.

The effect is a coverage contract: once sprint 0027 closes the 28-card gap, the test locks that state in. No future change to `transitAdaptations.ts` — reorganization into per-suit files, deduplication, bulk edits — can silently drop a pip card's entries without triggering a named, targeted failure. The threshold-count test (line 98–100) may be updated or removed once this per-card assertion is in place, since the new test subsumes its intent for the pip card portion of the deck.
