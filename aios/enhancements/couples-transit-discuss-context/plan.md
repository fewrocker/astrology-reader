# Enhancement: Couples Transit Discuss — Feed Actual Transit Data

## What Exists Today

- **SynastryTransitPage** (`src/components/results/SynastryTransitPage.tsx`) displays couple transit readings with transit aspects to composite chart, current planet positions, and a GPT interpretation.
- The "Discuss ✦" button opens `DiscussModal` with `mode="synastry"`.
- **DiscussModal** (`src/components/discuss/DiscussModal.tsx`) in `mode="synastry"` calls `buildSynastryContext()`, which sends **only** the static synastry data (cross-chart aspects, house overlays, composite chart, compatibility summary).
- The actual transit data (`synastryTransitData`, `synastryTransitPeriod`, `synastryTransitInterpretation`) is completely absent from the discuss context.

## What the User Wants

When discussing from the couple transit page, the GPT context should include the **actual transit data for the given period** — transit aspects to the composite chart, current planet positions, the period label, date range, and the transit interpretation — not just the overall synastry/compatibility data.

## What Needs to Change

### File: `src/components/discuss/DiscussModal.tsx`
1. Add a new mode `'synastry-transit'` to the `DiscussModalProps` interface.
2. Create a new `buildSynastryTransitContext()` function that includes:
   - Key synastry context (composite chart, key synastry aspects for reference)
   - Full transit data: period, date range, transit planet positions, transit aspects to composite
   - The GPT transit interpretation already generated
3. Update the `buildContext()` function to handle `mode === 'synastry-transit'`.
4. Update the modal header/subtitle and placeholder suggestions for the new mode.

### File: `src/components/results/SynastryTransitPage.tsx`
1. Change `mode="synastry"` → `mode="synastry-transit"` on the DiscussModal.

## Checklist

- [ ] Add `'synastry-transit'` mode to DiscussModal props
- [ ] Create `buildSynastryTransitContext()` with transit + synastry data
- [ ] Update `buildContext()` to route to new builder
- [ ] Update modal header/subtitle for synastry-transit mode
- [ ] Change SynastryTransitPage to use `mode="synastry-transit"`
- [ ] Build and verify zero errors
