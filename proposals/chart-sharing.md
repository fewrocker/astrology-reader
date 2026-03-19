# Proposal: Chart Sharing & Beautiful Export

## Problem / Opportunity

Astrology is inherently social. People share their charts, compare placements, and discuss aspects with friends. Currently, there's no way to share a reading — users can't send their chart to a friend, post it on social media, or save a beautiful image of their wheel.

This is a significant engagement multiplier. Every shared chart is a potential new user discovering the app.

## Proposed Solution

1. **Chart image export**: Generate a high-resolution PNG/JPG of the chart wheel with the user's name, birth data, and Big Three overlaid in an elegant layout — designed to look beautiful as a social media post or phone wallpaper.
2. **Reading summary card**: A shareable card format (Instagram story dimensions: 1080×1920) showing the user's Big Three, dominant element, and a key insight — designed for social sharing.
3. **Share link**: Generate a URL-encoded link containing birth data parameters (date, time, coordinates) that, when opened, pre-fills the form and generates the chart. No backend needed — all data encoded in the URL hash.
4. **Copy to clipboard**: One-tap copy of the share link.
5. **Download PDF**: Full reading (chart + interpretations) exported as a clean PDF for personal records.
6. **Native share**: On mobile, use the Web Share API to share the chart image or link directly to WhatsApp, Instagram, etc.

## Impact & Effort

- **Impact**: HIGH — Viral growth mechanism. Every shared chart brings new users. Social sharing is core to astrology culture.
- **Effort**: MEDIUM — HTML-to-canvas for image export (html2canvas or dom-to-image library). URL encoding for share links. PDF generation via browser print or a library like jsPDF.
- **Dependencies**: ChartWheel SVG, reading data, browser APIs (Web Share, Canvas).

## Implementation Summary

- New file: `src/services/chartExport.ts` — SVG-to-PNG conversion, social card generation, PDF export
- New file: `src/services/shareLink.ts` — encode/decode birth data in URL hash, parse on load
- New component: `src/components/results/SharePanel.tsx` — share button with dropdown (copy link, download image, download PDF, native share)
- Modify: `src/components/results/ResultsPage.tsx` — add share button to header
- Modify: `src/App.tsx` — check URL hash on load for shared chart data
- New dependency: html2canvas or dom-to-image for image generation
