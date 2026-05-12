# Nassim Taleb — Proposal Voice

Everyone is excited about the new features. I'm thinking about what breaks.

**The GPT dependency is a single point of failure.** Every interpretation that matters in this app — transits, synastry, dream reading, daily snapshot — routes through OpenAI. If OpenAI has an outage, prices spikes, or the user has no API key, the product is substantially degraded. Right now the fallback for most features is... an error message. That's fragile. Static fallbacks — pre-written interpretations for common configurations, or at minimum graceful degradation to structured data display — would make the product antifragile. This is not urgent today, but the dependency is growing and the debt compounds.

**The localStorage cache has no versioning or size management.** I see keys scattered across the codebase: `astral-chart-openai-key`, `dream-session-<date>`, and presumably natal data, transit data, synastry data all cached somewhere. What happens when the data schema changes between versions? The user loads a cached chart that was serialized in a different shape, and the app silently breaks or shows garbage. There's no cache invalidation strategy, no schema version, no size limit. On a phone with limited storage, this accumulates indefinitely.

**Numerology input risk.** If numerology requires a birth name, you're adding personally identifiable data to the form. The name alone + birth date + birth location is a fairly complete identity fingerprint. The app runs client-side so there's no server, but: (a) if an API key is logged through OpenAI's servers, the prompt contains this fingerprint; (b) users may share their results or screenshots containing this data. This isn't a blocker — astrology apps already collect birth data — but it should be considered when designing the prompt. Don't include the full name in every GPT call.

**The binary search in TransitTimeline** (for aspect perfection dates) runs expensive calculations at render time. I haven't profiled it, but if a user selects a 3-month window, this could freeze the main thread for several seconds. The existing code spawns no workers. This is a ticking clock — the product works today on fast devices, but will break on mid-range phones when users explore long time ranges. Offloading computation to a Web Worker before the timeline grows further would be prudent.

**Dream journal persistence is low-risk, high-value.** Currently dreams evaporate at midnight (new `todayKey`). A simple array-based journal stored in localStorage is robust and adds no new dependencies. The only fragility is size — users who log dreams daily for a year could accumulate significant data. Implement with a max-entries cap (say, 60 entries) and a user-visible "clear journal" option.

**Solar return chart** carries low risk. The computation reuses existing infrastructure. The only fragility is the binary search for the solar return moment — ensure it handles edge cases: birth near midnight, timezones with DST, southern hemisphere dates. These are the usual astronomical edge cases that bite in unexpected ways.

**The SkyTodayChart at Greenwich is not just impersonal — it's subtly wrong.** Showing Greenwich as "the sky" when the user is in Tokyo or New York means house cusps are completely off. If this chart is meant to be meaningful (not purely decorative), it misleads. If it's purely decorative, label it as such clearly or remove it. Ambiguity is fragility.

Summary of real risks: GPT dependency without fallbacks, cache schema fragility, TransitTimeline performance on slow devices. The rest are improvements, not risks.
