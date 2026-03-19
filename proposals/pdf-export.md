# Proposal: PDF Export

## Problem / Opportunity

Users have no way to save or share their natal chart reading offline. The reading is trapped in the browser — closing the tab means losing the presentation (data is cached, but the formatted reading is not portable). Users who pay for GPT-powered interpretations have no artifact they can keep, print, or send to friends.

This was listed as a **Priority 2** feature in the original spec and remains one of the most requested capabilities in astrology apps.

## Proposed Solution

Add a "Download PDF" button to the results page (and synastry page) that generates a beautifully formatted PDF containing:
- The chart wheel (SVG → canvas → PDF image)
- Planet positions table
- The full reading (summary + detailed sections)
- Aspect table and detected patterns
- Focus area deep dive (if selected)

Use `html2canvas` + `jsPDF` (or alternatively `@react-pdf/renderer` for a React-native PDF approach). The SVG chart wheel would be rasterized via canvas for PDF embedding.

## Impact & Effort

- **Impact**: HIGH — Users can save, print, and share readings; adds perceived value
- **Effort**: Medium (4–5 hours)
- **Dependencies**: F5 (Chart Wheel), F7 (Detailed Breakdown), F10 (Results Page)

## Implementation Summary

- Install `jspdf` + `html2canvas` (or `@react-pdf/renderer`)
- Create `src/services/pdfExport.ts` with functions to capture results sections
- Add "Download PDF" button to `ResultsPage.tsx` and `SynastryPage.tsx`
- Style the PDF output (dark theme may need a light variant for print)
- Handle the SVG chart wheel conversion (SVG → Canvas → PNG → PDF)
