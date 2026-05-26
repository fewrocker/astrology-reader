# code-transit-adaptation-contract-test

**Type:** Code Enhancement

**Originated by:** Taleb, Carmack

---

## Problem

The sprint-0027 coverage test asserts that each of the 32 pip cards (Two through Nine × four suits) has at least one transit adaptation entry. This is a **floor test** — it verifies minimum presence, not coverage specificity.

The sprint-0027 data layer was written with a deliberate planet-per-suit logic:
- All pip cards: Saturn (condition: any), Pluto (condition: any)
- Wands and Swords pip cards: + Mars (condition: any)
- Cups pip cards: + Neptune (condition: any)
- Pentacles pip cards: + Venus (condition: any)
- Mental/decision Swords cards (Two of Swords, Eight of Swords): + Mercury (condition: retrograde)
- Seven of Cups: + Mercury (condition: retrograde) — illusion and cognitive fog

This logic is encoded in the sprint vision and executed in the data but not in any test. A future developer who reorganizes `transitAdaptations.ts` or edits entries could accidentally delete a card's Saturn entries and the floor test would still pass — as long as one Mercury or Venus entry survives.

The investment of sprint 0027 — 101 new entries with specific symbolic content — is only as robust as the tests that guard it. Without a contract test, the per-suit planet coverage can silently degrade sprint by sprint.

---

## Proposed Solution

Add a **contract test** to `src/data/tarot/__tests__/cards.completeness.test.ts` that verifies the full planet coverage matrix for pip cards:

```typescript
it('all pip cards have Saturn and Pluto transit adaptations', () => {
  const suits = ['wands', 'cups', 'swords', 'pentacles'] as const
  const numbers = ['two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'] as const
  const missing: string[] = []
  for (const suit of suits) {
    for (const number of numbers) {
      const id = `${number}-of-${suit}`
      const entries = TRANSIT_ADAPTATIONS.filter(e => e.cardId === id)
      const hasSaturn = entries.some(e => e.planet === 'Saturn')
      const hasPluto = entries.some(e => e.planet === 'Pluto')
      if (!hasSaturn) missing.push(`${id} missing Saturn`)
      if (!hasPluto) missing.push(`${id} missing Pluto`)
    }
  }
  expect(missing, missing.join(', ')).toHaveLength(0)
})

it('Wands and Swords pip cards have Mars transit adaptations', () => {
  const suits = ['wands', 'swords'] as const
  const numbers = ['two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'] as const
  const missing: string[] = []
  for (const suit of suits) {
    for (const number of numbers) {
      const id = `${number}-of-${suit}`
      const entries = TRANSIT_ADAPTATIONS.filter(e => e.cardId === id)
      if (!entries.some(e => e.planet === 'Mars')) missing.push(id)
    }
  }
  expect(missing, missing.join(', ')).toHaveLength(0)
})

it('Cups pip cards have Neptune transit adaptations', () => {
  // ... similar structure for Cups + Neptune
})

it('Pentacles pip cards have Venus transit adaptations', () => {
  // ... similar structure for Pentacles + Venus
})
```

---

## Why This Is a Code Enhancement, Not a Feature

This is a quality improvement to the test infrastructure. It adds tests that protect existing behavior rather than adding new behavior. The production code and data are unchanged.

---

## Impact

**Medium** (robustness). Without these tests, any refactor of `transitAdaptations.ts` — including file splits by suit, ordering changes, or accidental deletions — can silently degrade the per-suit coverage that sprint 0027 carefully established. These tests make the coverage contract explicit and machine-verifiable.

**Effort:** Low. Adding 4 test cases to an existing test file. The structure mirrors the existing pip coverage test.

---

## Dependencies

- Depends on the sprint-0027 coverage being in place (it is)
- No production code changes

---

## Implementation Summary

**File:** `src/data/tarot/__tests__/cards.completeness.test.ts`

**Changes:**
1. Add `it('all pip cards have Saturn and Pluto transit adaptations', ...)` — covers the universal pair
2. Add `it('Wands and Swords pip cards have Mars transit adaptations', ...)` — covers the fire/air suit logic
3. Add `it('Cups pip cards have Neptune transit adaptations', ...)` — covers the water suit logic
4. Add `it('Pentacles pip cards have Venus transit adaptations', ...)` — covers the earth suit logic

These 4 tests replace the need for anyone to re-read sprint-0027 documentation to understand why the data is structured the way it is. The contract is in the test file.
