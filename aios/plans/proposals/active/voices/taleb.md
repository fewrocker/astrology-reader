# Nassim Taleb — Sprint 4 Proposal Voice

Everyone's excited about daily personalization and cross-integration. Let me be the one who checks whether the foundations are solid first.

## Hidden assumption #1: Personal day/month calculations are universally agreed upon

They're not. There are at least three common conventions for calculating the Personal Day in numerology, and they differ in how they reduce the current date. Some add birth month + birth day + universal day. Some include the full birth year. Some use the Gregorian calendar directly. Users who cross-reference with other numerology apps will get different numbers and think the app is wrong.

**Risk:** User confusion and trust erosion when numbers don't match what they've seen elsewhere.

**Fix:** Pick one convention (the most common: birth month + birth day + universal year), document it internally, and ensure the Personal Month and Personal Day calculations are consistent with each other and with the existing Personal Year calculation already in the code. Test edge cases: master number months (11, 22), years with high sums, birthday on the 29th/30th/31st.

## Hidden assumption #2: The dream journal has stable localStorage structure

Currently, `DreamModal.tsx` stores dream entries in localStorage as JSON. If we add new fields (moonSign, moonPhase, activeTransits) to the stored structure, and a user already has entries stored *without* these fields, the app must handle the mixed schema gracefully.

The current code doesn't have a versioning strategy for localStorage entries. Adding new fields is safe *if* we use optional fields and defensive reads. But a clumsy implementation could fail to render old entries or, worse, throw a runtime error that corrupts the entire dream journal.

**Fix:** Store transit context as a separate optional object with a schema version. Old entries simply show no sky context. Never mutate old entry structure.

## Hidden assumption #3: Current transits are "fast" to compute for the dream modal

`calculateTransits()` for daily transits runs an O(n) planetary calculation against the natal chart. It's not expensive — but it's called at the moment the user opens the dream modal to *write* a dream. That's a synchronous operation in a modal that should feel instant.

If the natal chart data isn't available in context (user opened the dream journal directly without having computed their chart), the transit computation will fail silently or show no transits.

**Fix:** Make the transit context capture fault-tolerant. If `chartData` is null, store only Moon sign and phase (which need no natal data). If computation fails for any reason, store nothing rather than crashing.

## Hidden assumption #4: The personal day card in the landing page will always be available

The DailySnapshotCard only appears when `chartData` is truthy (when a natal chart has been calculated). But the personal day number only requires birth date — not the full chart. A user who entered a birth date but hasn't run a chart yet would benefit from seeing their personal day number, but the current architecture only shows DailySnapshotCard when the full chart is computed.

**Not a blocker** — but worth noting. For now, tying personal day display to chartData availability is acceptable since birth date is required for the chart anyway.

## Hidden assumption #5: Moon phase labels are stable

The Moon phase is computed from Sun/Moon elongation. The phase *labels* (New Moon, Waxing Crescent, etc.) depend on where you draw the boundary between phases. There are 8 traditional phases and the transitions are at specific degree intervals. Two implementations might show "Waxing Crescent" vs "First Quarter" for the same day. This matters because we're storing the label in localStorage — and if we change the label convention in a future release, old entries will show different labels than new ones.

**Fix:** Store the raw elongation angle alongside the label. This allows the label to be re-derived from the stored angle if the convention changes.

## What is genuinely robust about this plan

- Personal Year/Month/Day calculations are pure functions with no external dependencies. They're antifragile — always computable, always available offline, always fast.
- The Moon sign at time of dream recording is independently computable from the timestamp alone (no birth data needed). This is the most durable piece of context we can attach to a dream.
- Failure modes are graceful: if any computation fails, the dream entry still stores and renders correctly. Context is additive, not required.

## The uncomfortable truth

The most fragile part of this sprint is not technical — it's numerological convention. We're about to present Personal Day numbers as facts to users who may cross-reference with other sources. We should display these numbers with a quiet note that numerology conventions vary, or at minimum ensure our convention is clearly documented. Otherwise we'll get users insisting our "3" is wrong because another app shows "5".
