# Nassim Taleb — Fragility & Risk Analysis

The product is accumulating features at a rapid pace. Most things that break in complex systems don't break at the center — they break at the seams. Let me tell you where the seams are.

---

## Current Fragilities

**1. No app-level error boundary.**

This is not a hypothetical risk — it's a certainty that at some point a component will throw an unhandled error. Maybe a null dereference on a planet that wasn't calculated. Maybe a localStorage parse failure. Right now, that error propagates to the root and shows a blank white page. There is no graceful degradation, no "something went wrong" message, no recovery path. This is basic resilience that every production React app should have.

**2. GPT calls have zero retry logic.**

OpenAI's API returns 429s (rate limit exceeded) regularly, especially with the free tier. Network timeouts happen. A single API failure means the user's transit reading — for which they waited through a loading screen — is destroyed. The fix is 15 lines of code: a retry function with exponential backoff. The cost of this fragility is high (user frustration, lost readings), the fix is trivial.

**3. Collecting user names for numerology (future fragility to design for).**

When numerology is added with Expression/Soul Urge numbers, it will require the user's full name. This is a new data collection point. Consider carefully: should the name be stored in localStorage? Should it be optional (with graceful fallback to Life Path + Birthday only)? Don't collect what you don't need — but if you collect it, protect it by keeping it strictly local.

---

## New Feature Risk Assessments

**Numerology:** Low risk technically — simple math. The main risk is quality: generic numerology text is worthless. If the cross-references with the natal chart are lazy template strings ("Your Life Path 7 is influenced by Neptune"), users will feel cheated. The risk is underwhelming execution, not technical failure.

**Solar Return:** Medium risk. The bisection search for exact Sun return time is the same algorithm used in the transit timeline — already validated. The rendering is an extension of the existing bi-wheel. The main failure mode is edge cases: what if the user's Sun is exactly on a sign cusp, or if the return falls in a leap year? These are testable. Document the expected behavior.

---

## Recommendation

Fix the two fragilities (error boundary, GPT retry) before adding new features. They protect everything that already works. Then add features in order of increasing complexity: code cleanup first, then numerology (simple, high value), then solar return (moderate complexity, high value).

The product is not fragile in a fundamental way — but these two unfixed issues mean that one unlucky user interaction will produce a bad experience. Fix them now while the surface area is still manageable.
