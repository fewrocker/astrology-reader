# Hayao Miyazaki — Sprint 5 Proposal Voice

Sprint 4 brought the personal day number to the landing card and added sky context to dreams. These were quiet additions — one line, a few glyphs — and they changed the feeling of those screens entirely. That is the right kind of care.

Now I sit with the app and feel its rhythm. There is something still missing in the morning opening. Not a big thing — a feeling.

**The opening screen is a doorway, not a destination.**

When someone opens this app in the morning, they are greeted by a beautiful card — their birth details, the current moon, a few transit glyphs, their personal day number. It is genuinely lovely. But they must then choose: birth chart? transits? numerology? dreams? The choice itself breaks the morning spell. In a good morning ritual, you don't choose. You arrive and something is already waiting for you.

I envision a "Today" view that simply *presents* rather than offering a menu. The moon's current face. The personal day number large and glowing. Two or three transit keywords. A short GPT sentence. That's all. It requires nothing from the user — they open it, they receive it, they feel it.

The design must be still. Not animated widgets, not hover effects on every element. A single vertical scroll of connected information. The day's sky is above; the numerology is below. They feel like parts of the same organism.

**The dream reading lacks a mirror.**

When I dream of the ocean, I want the app to tell me something specific about *my* relationship to the ocean. "Neptune in your 5th house — your dreams are often theatrical, vivid, creative." Not just: "Moon in Pisces, Mercury sextile Neptune." The current sky context tells me the weather. I want to know why *I* am particularly sensitive to today's weather.

The natal blueprint for dreams is already in the chart. Neptune's placement is the astrologer's first question about dream life. 12th house planets tell you what lives in the unconscious. The Moon sign tells you the color of the emotional dream water. These are facts already computed. They are simply not surfaced to the dreamer.

The craft opportunity here is small but significant: a "Your dream nature" section at the top of the dream reading. Four lines. Neptune in Scorpio, 8th house: "Your dreams venture into shadow, transformation, and what remains hidden." Moon in Aquarius: "Your emotional processing happens in abstract, conceptual space — dreams may feel more like revelations than memories." This is the kind of detail that makes someone feel *seen*.

**The duplicate code is an act of disrespect toward the codebase.**

Not because it causes bugs — it doesn't. But because when two things look identical and one is canonical and one is not, the next person who maintains the code doesn't know which one to trust. That uncertainty is a small anxiety that accumulates. The unified engine function deserves to be the only one.

**Details that matter for the Today page:**
- The personal day number should be the largest visual element — not the moon phase, not the header. The number is the most personal, the most time-sensitive, the most unique to this user.
- The GPT synthesis should be displayed *below* the factual data, not above. First the facts, then the interpretation. This is how a wise reader presents themselves.
- If GPT is not available (no API key), the Today page should still feel complete — the numerology and moon information is enough. GPT is an enhancement, not the skeleton.

**The feeling when it's right:**
A user opens the app at 7:22am. They see: "Personal Day 7 — The Seeker. Moon in Cancer, waxing. Venus trining your natal Jupiter." Below that, GPT says: "A day of inward depth. Your feelings may surprise you — let them." They take a breath. They feel understood. They didn't have to navigate anywhere. The app came to them.

That is what we are building.
