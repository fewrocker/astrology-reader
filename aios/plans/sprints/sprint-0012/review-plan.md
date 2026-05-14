# Sprint 0012 — Review Plan

**Theme:** Backend Sovereignty  
This sprint moved astrological calculation from the browser to the server. Most changes are infrastructure — they don't add new pages or UI surfaces. Manual verification focuses on confirming that existing features still work correctly and that GPT readings are now generated from server-computed data.

---

## Feature 1 — Aspect Engine (task-0003)

**What was delivered:** The server computes natal aspects from stored birth data and includes them in GPT prompts for dream interpretation.

**Where to go:** Dream Journal — write a new dream entry or open the Dream modal.

**How to test it:**
1. Log in with an account that has birth date, time, and place set.
2. Open the Dream Journal.
3. Submit a new dream entry.
4. Wait for the GPT interpretation to load.

**What to expect:** The dream interpretation loads as before. The content should reference your natal chart context — sign placements and key aspects — confirming the server computed your chart correctly from stored birth data.

---

## Feature 2 — Numerology Server Verification (task-0004)

**What was delivered:** Life path, birthday number, and personal year are now computed server-side for authenticated users. `personalDay` is cross-checked against the server. Provenance labels appear in the GPT context.

**Where to go:** Numerology section — Astro-Numerology Cross or Numerology Narrative reading.

**How to test it:**
1. Log in with an account that has a birth date set.
2. Navigate to the Numerology section.
3. Request an Astro-Numerology Cross reading.
4. Observe the reading loads without errors.

**What to expect:** Readings load successfully. The GPT interpretation content should be equivalent or better than before. No errors or blank responses.

---

## Feature 3 — Solar Return Engine (task-0005)

**What was delivered:** The server computes the solar return chart independently from stored birth data and assembles the GPT prompt without relying on client-computed data.

**Where to go:** Solar Return section (Solar Return tab or reading type).

**How to test it:**
1. Log in with an account that has birth date, time, and place set.
2. Navigate to the Solar Return reading.
3. Request a solar return interpretation.
4. Wait for the reading to appear.

**What to expect:** The solar return interpretation loads. The content references your solar return chart's planets and houses. No error or loading failure. If your birthday is within the next month, the reading reflects the upcoming solar year.

---

## Feature 4 — Synastry Engine (task-0006)

**What was delivered:** A dedicated server-side synastry handler. The server accepts raw birth data for two people, computes both natal charts, cross-chart aspects, house overlays, composite chart, and compatibility scores, then assembles the GPT prompt. A couple transit handler was also added.

**Where to go:** Synastry / Compatibility section.

**How to test it:**
1. Navigate to the Synastry section.
2. Enter birth date, time, and location for two people.
3. Request a synastry interpretation.
4. Try the Retry button on the result.
5. If available, request a Couple Transits interpretation too.

**What to expect:**
- The synastry interpretation loads and references cross-chart aspects (for example, "your Sun trines their Moon") and a compatibility summary.
- If one or both people have an unknown birth time, house overlays are correctly omitted — only planetary aspects appear.
- The Retry button produces a fresh interpretation successfully.
- Couple transit interpretation (if visible) loads and references current planetary transits affecting the relationship.

---

## Feature 5 — Transit Engine (task-0007)

**What was delivered:** The server computes the full transit picture from stored birth data — planet positions, period-scaled aspects, ingresses, retrogrades, element profile, and the complete GPT prompt. Journal annotations use server-computed historical transits for the entry's date.

**Where to go:** Transit Readings section, then also the Cosmic Journal.

**How to test it:**
1. Log in with an account that has birth date, time, and place set.
2. Navigate to Transit Readings.
3. Request a Daily reading. Observe it loads.
4. Request a Weekly reading. Observe it loads.
5. Request a Monthly reading. Observe it loads.
6. Navigate to the Cosmic Journal. Open a journal entry from a past date. Request an annotation.

**What to expect:**
- All three transit periods (Daily, Weekly, Monthly) produce interpretations successfully.
- The reading mentions transiting planets and their aspects to your natal chart.
- The Monthly reading references more aspects and covers a longer timeframe than the Daily reading — this confirms period-scaled orbs are working (Monthly uses 0.7× orbs, allowing more aspects to qualify).
- The journal annotation for a past entry references the planetary transits active on that historical date specifically — not today's transits.
- No reading returns blank content or "undefined" values.

---

## Internal Changes — No Direct UI to Navigate

**task-0001 — Birth place silent failure fix:** Verified indirectly by any of the above features working for accounts with birth data stored. If an account has missing or malformed birth data, the server logs a warning but does not crash — readings fall back gracefully.

**task-0002 — Shared primitives module (`astroCore.ts`):** Verified indirectly by all features above. The orb table correctness is confirmed when the Monthly transit reading includes noticeably more and wider aspects than the Daily reading.
