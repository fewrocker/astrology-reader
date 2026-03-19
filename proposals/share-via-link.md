# Proposal: Share Reading via Link

## Problem / Opportunity

Users cannot share their readings with others. If someone wants to show their chart to a friend or astrologer, the other person must manually re-enter all birth data. This friction kills organic sharing — one of the most powerful growth channels for astrology apps.

Listed as **Priority 2** in the original spec.

## Proposed Solution

Encode birth data into a compact URL parameter that can be shared. When someone opens a shared link, the app auto-populates the form and generates the reading.

**Encoding approach**: Base64-encode a JSON payload of `{ date, time, lat, lng, tz, city, focus }` into a URL hash fragment (e.g., `https://app.com/#r=eyJkYX...`). Hash fragments are not sent to servers, preserving privacy.

For synastry, encode both partners' data.

**Share UI**:
- "Share" button on results page → copies link to clipboard
- Optional: native Web Share API on mobile (share to WhatsApp, Messages, etc.)
- Show a "Link copied!" toast confirmation

## Impact & Effort

- **Impact**: HIGH — Enables organic sharing and virality; makes the app useful in social contexts
- **Effort**: Medium (3–4 hours)
- **Dependencies**: F1 (Form), F10 (Results Page)

## Implementation Summary

- Create `src/services/shareLink.ts` with encode/decode functions for birth data
- Add URL hash parsing in `App.tsx` on mount — if hash contains share data, auto-calculate
- Add "Share" button to `ResultsPage.tsx` and `SynastryPage.tsx`
- Use `navigator.clipboard.writeText()` to copy link
- Use `navigator.share()` on supported devices for native sharing
- Add toast feedback for copy confirmation
