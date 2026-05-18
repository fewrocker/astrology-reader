# Issue Fix: Transit Reading GPT Skeleton — Warmth Parity

**Type:** Issue Fix
**Originated by:** Miyazaki
**Status:** Active

---

## Problem

The GPT skeleton shown while the transit reading loads carries the label:

```
"Consulting the stars..."
```

This is the most impersonal skeleton label in the product. Every other GPT loading state in the app carries a label written with the user in mind:

| Surface | Label |
|---|---|
| Today Page (Morning Synthesis) | `"Reading today's sky for you..."` |
| Synastry Page | `"Reading your celestial bond..."` |
| Solar Return Page | `"Tracking the Sun's return..."` |
| Numerology Page | `"Reading your sky in numbers..."` |
| Numerology Page (frequencies) | `"Decoding your frequencies..."` |
| **Transit Reading Page** | **`"Consulting the stars..."`** |

Every other label either names the user directly ("for you", "your"), names the specific reading type, or carries a voice that feels inhabited. "Consulting the stars" has no warmth, no specificity, and no address to the person who is waiting. It reads as a status message from an automated system — the kind of text a calendar app would show during a sync.

The transit reading skeleton is visible for approximately ten seconds on every transit reading load — daily, weekly, and monthly. Transit readings are the most frequently generated page-type in the product after Today. The skeleton is seen every single time, by every user.

The additional irony: the component already owns `transitPeriod` at the point where the skeleton is rendered. The copy is static when it could be specific.

**Call site (line 364 of `src/components/results/TransitReadingPage.tsx`):**

```tsx
{transitInterpretation === null || retrying ? (
  <GptSkeleton label="Consulting the stars..." accentColor="gold" />
```

The `transitPeriod` variable is available at this point in the component — it is destructured from `state` at line 207 and guarded against null at line 275 before the JSX is reached.

---

## Expected Behavior

The skeleton label is replaced with period-specific copy that addresses the user and names what the reading is doing for them:

| `transitPeriod` value | Replacement label |
|---|---|
| `daily` | `"Listening to today's sky for your chart..."` |
| `weekly` | `"Reading this week's currents for your birth pattern..."` |
| `monthly` | `"Tracing this month's movements across your natal chart..."` |

Each variant:
- Uses a verb that implies attentiveness rather than automation ("Listening", "Reading", "Tracing" — not "Consulting")
- Names the specific time window the user selected (today / this week / this month)
- Addresses the user's chart directly ("for your chart", "for your birth pattern", "across your natal chart")
- Matches the warmth register of the Today page and Synastry page labels

---

## Implementation

The change is a single-line replacement in `src/components/results/TransitReadingPage.tsx`.

Define a lookup record at the top of the file alongside the existing `PERIOD_LABELS` and `PERIOD_DESCRIPTIONS` maps:

```ts
const SKELETON_LABELS: Record<TransitPeriod, string> = {
  daily:   'Listening to today\'s sky for your chart...',
  weekly:  'Reading this week\'s currents for your birth pattern...',
  monthly: 'Tracing this month\'s movements across your natal chart...',
}
```

Replace the static string at the call site:

```tsx
<GptSkeleton label={SKELETON_LABELS[transitPeriod]} accentColor="gold" />
```

`transitPeriod` is guaranteed non-null at this point in the render tree (the early-return guard at line 275 ensures it). No additional null handling is required.

---

## Files Affected

- `src/components/results/TransitReadingPage.tsx` — one record addition, one string replacement

---

## Out of Scope

- Other GptSkeleton labels in the product (Today, Synastry, SolarReturn, Numerology) — all already carry warm, specific copy and need no change
- The `retrying` state path shares the same skeleton call site; the period-specific label applies there too and is appropriate — the user is re-requesting the same period reading
