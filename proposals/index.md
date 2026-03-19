# Proposals Index

Sorted by **impact-to-effort ratio** (best bang for buck first).

| # | Proposal | Impact | Effort | Ratio | Category |
|---|----------|--------|--------|-------|----------|
| 1 | [API Key Security](api-key-security.md) | CRITICAL | Low | **Urgent** | Security |
| 2 | [Aspect Patterns Display](aspect-patterns-display.md) | High | Low | **Best** | Feature |
| 3 | [Loading & Error Feedback](loading-and-error-feedback.md) | High | Low | **Best** | UX |
| 4 | [Houses Overview](houses-overview.md) | Medium | Low | **Great** | Feature |
| 5 | [Chart Accessibility](chart-accessibility.md) | Medium | Low | **Great** | Accessibility |
| 6 | [PDF Export](pdf-export.md) | High | Medium | **Good** | Feature |
| 7 | [Share via Link](share-via-link.md) | High | Medium | **Good** | Feature |
| 8 | [Performance Optimization](performance-optimization.md) | High | Medium | **Good** | Performance |
| 9 | [Expand Interpretations](expand-interpretations.md) | Medium | Medium | OK | Data Quality |

## Recommended Implementation Order

### Phase 1 — Immediate (Security + Quick Wins)
1. **API Key Security** — Remove hardcoded key; graceful degradation when no key provided
2. **Aspect Patterns Display** — Backend already done; just needs UI + 8 interpretation texts
3. **Loading & Error Feedback** — Celestial loading animation + toast notifications

### Phase 2 — Feature Completeness
4. **Houses Overview** — Fills spec gap; 12 house cards with cusp signs and rulers
5. **Chart Accessibility** — Keyboard navigation + screen reader support

### Phase 3 — Growth & Polish
6. **PDF Export** — Save/print readings offline
7. **Share via Link** — Encode birth data in URL for organic sharing
8. **Performance Optimization** — Trim cities DB, code-split routes, memoize chart

### Phase 4 — Depth
9. **Expand Interpretations** — 30+ new aspect entries, pattern texts, richer focus areas

---

To implement any proposal: `/enhance proposal:<proposal-name>`
