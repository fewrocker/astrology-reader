# Active Proposals

Generated for Sprint 0003 focus: **Numerology Sky Chart**

All proposals are scoped to the guidelines sprint focus: a circular sky map on the numerology page that renders every chart element as its numerological number.

---

## Features (feat-)

Sorted by impact-to-effort ratio:

| Proposal | Originated by | Impact | Effort | Summary |
|----------|--------------|--------|--------|---------|
| [feat-numerology-sky-chart](feat-numerology-sky-chart.md) | Jobs + Carmack + Miyazaki + Taleb | High | Medium | Circular sky map on NumerologyPage: planets/houses/node rendered as reduced numbers, frequency-driven visual emphasis, async GPT sky reading |

---

## Convergence Notes

- **All four voices** identified the missing visual centerpiece as the highest-priority gap
- **Jobs + Miyazaki** emphasize the "first-second" emotional impact — chart must render immediately, feeling before words
- **Carmack** confirms the technical path is clear: reuse coordinate math, build a fresh component, use existing reduction functions
- **Taleb** flags the collision-avoidance and null-chartData cases as must-handle before shipping
