**Type:** Issue Fix
**Originated by:** Taleb
**User guidance:** (none — sprint vision overrides)

## Problem

In `/projects/astrology-reader/src/engine/synastry.ts` at line 261, the `elementCompat` function computes Person 1's dominant element using a broken sort comparator:

```typescript
const dom1 = (Object.keys(count1) as Element[]).sort((a, b) => count2[b] - count1[a])[0]
```

The comparator is `count2[b] - count1[a]`: it subtracts Person 1's count of element `a` from Person 2's count of element `b`. This is a cross-table comparison with no meaningful ordering semantics. The sort is not a descending sort of `count1` — it is a comparison of values from two different tables keyed on two different loop variables. The resulting ordering is effectively arbitrary: whichever element happens to produce the largest `count2[b] - count1[a]` difference ends up first, regardless of how frequently that element actually appears in Person 1's chart.

Compare line 261 against the correct sort on line 262 for Person 2:

```typescript
const dom2 = (Object.keys(count2) as Element[]).sort((a, b) => count2[b] - count2[a])[0]
```

Person 2's dominant element uses `count2[b] - count2[a]` — a consistent descending sort within `count2`. Person 1's sort uses `count2[b] - count1[a]` — mixing indices from both tables.

Wrong output produced: the `elementCompat` function returns a compatibility string such as `"Harmonious — Earth and Air elements naturally support each other"` where the `dom1` value (Person 1's element) may be any element, not the one Person 1 actually has the most planets in. For many chart pairs, `dom1` will be incorrect. The compatibility label displayed in `CompatibilitySection` on `SynastryPage` is therefore unreliable for Person 1.

Sprint 0011 adds `analyzeElements` output — which is computed correctly in `src/data/interpretations/index.ts` — to `buildSynastryPrompt`. This means the GPT paragraph will describe Person 1's element profile accurately, while the UI's `CompatibilitySection` element string continues to use the broken `elementCompat` result. The two surfaces will contradict each other: GPT may report "Person 1 is primarily a Fire chart" while the compatibility label reads "Harmonious — Earth and Air." Users have no way to detect the conflict; both texts are plausible.

## Expected Behavior

Line 261 should read:

```typescript
const dom1 = (Object.keys(count1) as Element[]).sort((a, b) => count1[b] - count1[a])[0]
```

The sort comparator for `dom1` should be `count1[b] - count1[a]`: a descending sort entirely within `count1`, parallel to the `count2[b] - count2[a]` comparator used for `dom2` on line 262. This produces the element with the highest planet count in Person 1's chart as `dom1`, which is the correct dominant-element definition. The `elementCompat` compatibility string will then accurately reflect both charts, and will agree with the element profile data sent to GPT via `analyzeElements`.
