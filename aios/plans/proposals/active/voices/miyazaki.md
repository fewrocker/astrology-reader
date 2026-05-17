# Hayao Miyazaki: Sprint 0021 — On Craft, Care, and the Small Things Nobody Notices But Everyone Feels

---

I have spent time with this product. I looked at it the way I look at a film: not for what it does, but for what it feels like.

There is something genuine here. The calculation engine is real. The dark background and gold typography are chosen, not default. Someone cared. But caring is not the same as finishing, and there are places where the care stopped too early — where someone built the architecture and forgot to paint the walls.

Let me tell you what I found.

---

## The Solar Return Page: A Letter Written in the Third Person

When someone opens their Solar Return reading, they are asking a specific, personal, almost fearful question: *What will this year do to me?*

The page opens with: **"Your Year Ahead."**

Then the subheading: **"Your Sun returns on January 14, 2026 at 03:47 UTC."**

This is astronomically precise. It is also cold. Nobody speaks of their birthday as a moment when their Sun "returns." They speak of it as a threshold. An anniversary with the sky. The page announces an astronomical event the way a doctor announces test results — with accuracy and without warmth.

Then comes `SRStaticBriefs`. The component renders two cards:

- "Primary Focus" — "SR Sun in House 5"
- "Emotional Climate" — "SR Moon in House 2"

And beneath each: "This year: [brief from PLANET_IN_HOUSE database]."

The phrase **"This year:"** does real damage here. It is a database retrieval with a colon attached. It converts what could feel like an insight arriving — *you, specifically, in this specific position* — into a labeled field. The brief that follows might be eloquent; the prefix undoes it. It announces itself as a lookup.

Consider what happens when a parent tells a child something important. They do not say: "Child-care update: you are loved." They just say it. The colon is the problem. It is a file cabinet label on something that should feel like a hand on the shoulder.

**The fix is almost nothing.** Remove "This year:". Let the brief stand on its own. "SR Sun in House 5: This year: *A year that asks you to be seen in your creativity and play.*" becomes: "SR Sun in House 5 — *A year that asks you to be seen in your creativity and play.*" The em-dash is warmer than a colon. The "This year:" prefix is gone. The same words; a different feeling.

### The Sun Returns, But Nobody Says What Happens Next

Below `SRStaticBriefs` is the GPT interpretation — paragraphs of personalized prose. Below that, at the very bottom, is the advance preview strip: "When This Year Intensifies."

This ordering is wrong for the user's emotional journey. The GPT reading tells the character of the year. The advance strip tells *when* that character arrives. A user reads the character, then scrolls past it, then finds — at the bottom — the information they actually needed to make the reading actionable.

The advance strip should not be at the bottom. It should be between the key placements and the GPT reading. The user should first understand the year's shape in time (strip), then understand its nature in prose (GPT reading), then understand its character in placements (static briefs). The current order buries the most actionable information last.

This is like a film that puts the climax after the credits.

### Only Sun and Moon Have Briefs — But Mars, Saturn, and Jupiter Are Also in Houses

`SRStaticBriefs` shows two cards: SR Sun and SR Moon. That is all.

But the SR chart has every planet in a house. The `PLANET_IN_HOUSE` database has briefs for all of them. If SR Mars is in House 1, that is a year of unusual physical energy and self-assertion — not a minor detail. If SR Saturn is in House 7, partnerships will be tested and formalized this year — arguably more significant than the Moon's emotional climate.

The sprint vision identifies this correctly: angular houses (1, 4, 7, 10) carry annual weight. An SR planet in an angular house is a placement with its mouth open, speaking loudly. The product currently only listens to two voices in a room full of them.

The fix is not to show all twelve planets — that would be exhausting, a catalog not a reading. The fix is to surface SR planets in angular houses alongside Sun and Moon. Three or four additional cards, with the same treatment as the Sun and Moon cards. The SR reading would feel immediately richer without adding complexity.

What would the user feel? They would feel that the product noticed something. That it found the specific planetary pressure of their specific year and named it. That is the difference between a generic horoscope and a personal chart.

### The Quiet Message Is Generic

When the SR advance strip has no notable markers — a stable year — it shows: *"A relatively even year — the intensity is distributed rather than concentrated in specific peaks."*

"Relatively even." "Distributed rather than concentrated." These are statistical terms. They describe the data structure, not the experience of a year.

What a quiet solar year actually means to a person is something different. It means space. It means a year that is held, steady, without the kind of demand that leaves you exhausted. That is worth naming with some feeling.

"Not every year is a turning point — this one offers something rarer: space to build without pressure, to move at your own rhythm." That is not statistically different information. It is the same information with human hands on it.

---

## The Today Page: You Are Here, But Where Is Here?

The Today page opens with:

> *Today*
> Wednesday, May 17, 2026

Below that: a large Personal Day number. Below that: the archetype name in purple. Below that: the energy bar, the Moon card, the Sky Highlights card.

It is functionally complete. But if I watch a person open it on their phone at 7am, I see them looking at it and not quite knowing what to do with it. The page presents information. It does not meet them.

### The Date Is Told, Not Felt

"Today" in small caps, then the full date. This is a clock, not a greeting.

There is a question the Today page never asks itself: what is the right thing to say to this specific person, in this specific chart, on this specific morning? The GPT "Morning Synthesis" attempts it — and when it loads, it is the best thing on the page. But it loads last, after the user has already read everything else and formed an impression.

The Today page has the user's full chart. It knows today's transits. It knows the Personal Day number. Before the page shows anything, it knows more about the astrological character of this person's day than any newspaper horoscope ever could. But it opens with a date header that anyone without a chart would see identically.

The Personal Day number could do more work here. "Personal Day 7 — The Seeker" is correct. But the number appears huge and in gold, dominating the card — and then the archetype appears below it in a font size that feels like a subtitle. The hierarchy sends the message that *the number* is the thing. But the number is just an index. The archetype and the essence — what the day means — are the thing. The number should be smaller, the name larger.

### The Sky Highlights Card Opens With No Introduction

The section labeled "Sky Highlights" shows aspect rows immediately. Transit Mars square Natal Saturn. Transit Venus trine Natal Moon. And so on.

A daily user who has learned to read these rows will find them useful. But the card does not say: *this is why today feels the way it does.* It simply lists.

The advance engine — if integrated as the sprint vision suggests — would give this card its spine. If today is a "Challenging Period" in the advance, the Sky Highlights card could open with that signal: a small banner at the top of the card, not a separate card, saying "◆ Challenging Period this week — Saturn pressing your Ascendant." Then the aspect rows below it become evidence for a verdict rather than a list of facts. The user reads downward and understands. Instead of reading upward and inferring.

This is the advance integration the sprint vision identifies. The value is not adding one more data point. The value is changing how all the existing data points read.

### The Void of Course Warning Is Precise But Impersonal

When the Moon is void of course, the card shows: *"Void of course · avoid major commitments."*

This is accurate astrological advice. But "avoid major commitments" is what you would tell anyone — a stranger who asked the sky a question with no name attached. The app knows who this person is. It knows their chart. It knows which house the Moon is transiting. If the Moon is void in their 10th house, the warning could be: "Void Moon in your career house — not the day to finalize professional decisions." Thirty more characters. A completely different feeling.

The void warning is currently the only place in the Today page that gives behavioral advice. It gives it generically. The opportunity to make it specific to the person's chart is unused.

---

## The Home Screen: The Product Has a Face But Not a Name

The Home screen shows the identity line: "Sun in ♌ Leo · ♐ Sagittarius Rising · Moon in ♓ Pisces."

This is the first thing a returning user sees. Their chart identity, compressed into one line. It is elegant. The smaller secondary line shows their birth date and city.

Then above: "Welcome back."

**"Welcome back" is the most generic possible greeting.** It says nothing about what just happened in the sky, nothing about this person's chart, nothing about today. It could appear on a supermarket loyalty card. It is the greeting of a system that knows your name but is not sure you are interesting.

The home screen knows the user's chart. It knows today's date. It knows the Personal Day number. It knows the current Moon phase. The DailySnapshotCard computes all of this and renders it just below. But the greeting above says nothing informed by any of it.

A simple alternative: if the Personal Day number is available and the archetype is known, the greeting could quietly note it — not in a headline, but in the small text already used for things like "2 readings left in your sky today." A line beneath the identity that says "The Seeker's day" or "Personal Day 7 today." Something that shows the product noticed something specific before the user even scrolled.

The greeting is a threshold moment. It is the first word the product speaks each time a user arrives. "Welcome back" is a closed door opening. It should feel like someone who has been watching the sky for you has something to say.

---

## The Synastry Page: The Couple Profile Has Labels But No Spine

The Couple Profile section shows seven dimension axes: Intensity, Emotional Flow, Communication Style, Intimacy Rhythm, Growth Dynamic, Sexual Chemistry, Life Pace.

Each axis shows a bar with two poles and a sentence. The bars are visually sophisticated — directional fills, confidence-adjusted opacity, weak-signal notes. The engineering is sound.

But the section header says: "Seven dimensions of how you move together — not scores, just shape."

"Not scores, just shape" is the right instinct. It is saying: do not read this as grades. But the layout looks like a scorecard. Seven rows of bars, left to right, with labels. The visual language contradicts the verbal caution. Users will read left pole as "bad" and right pole as "good" regardless of what the text says, because bars read as progress toward something.

The deeper craft problem: the seven dimensions are presented without a narrative frame. A user sees their Intensity bar leaning strongly toward one pole, their Emotional Flow leaning toward the other, and has no sense of how these relate to each other. Are conflicting poles a tension or a complement? The product shows the shape but does not help the user read it.

A single sentence below the seven bars — drawn from the highest-confidence dimension — would anchor the reading: "The defining texture of how you move together is [dimension sentence for the highest-confidence axis]." One sentence that says: this is the most visible thing about how you two function. The rest is context.

---

## The Aspect Row: Brief Is Not a Verb

The `AspectRow` component shows a brief when expanded. The briefs come from `computeTransitAspectBrief` and `computeSynastryAspectBrief`. They are generally good — specific, astrology-aware, house-conscious.

But the expand trigger is a small `▾` chevron at the right edge of the row. A daily user knows to tap it. A first-time user does not know there is more. The row is a complete-looking unit with planet glyphs, the aspect symbol, the orb, the applying/separating badge — it reads as finished. The chevron at the end is easy to miss, especially on mobile where the row is narrow.

The briefs are some of the most carefully crafted text in the product. The house-aware sentences — "Venus moving toward your 7th house cusp, the relational threshold" — are genuinely insightful. They are hidden behind a barely-visible triangle.

A small affordance: the first few words of the brief, faded, could appear beneath the row by default — a partial reveal that says "there is more." Not the full brief, just enough to show the user there is something to expand. This is the difference between a door that is ajar and a door that looks like a wall.

---

## The SRStaticBriefs Card Colors Speak Two Languages

The `SRStaticBriefs` component uses `amber-900/5` background and `amber-500/10` border — the solar return amber palette. Correct.

But the `KeyPlacements` component above it uses `amber-900/10` and `amber-500/20` — slightly more saturated. Below that, the year selector buttons use `rgba(232,168,48,0.12)` inline styles.

None of these are far apart. But they are not the same. The amber does not settle. It trembles between three slightly different values, each correct in isolation, none locked together. In a celestial product that is supposed to feel like it was cast from a single metal, the inconsistency communicates: several people added panels on different days.

The design system deserves a single amber token — used everywhere on the SR page — so the visual material feels forged rather than assembled.

---

## The Bi-Wheel Chart: Two Rings, One Silence

The `SolarReturnBiWheel` renders at `SIZE = 700` with a drop shadow: `filter: 'drop-shadow(0 0 24px rgba(201,168,76,0.15))'`.

The main `ChartWheel` in F17 received glow filters on planets, entrance animations, and ambient pulse glow. The bi-wheel has two glow filters defined (`sr-glow-gold` and `sr-glow-amber`) but no entrance animation, no ambient pulse applied to individual planet glyphs at the depth the main wheel has.

The user who goes to the Chart tab sees a quieter, flatter version of something they already saw — the natal chart — and the contrast is noticeable not because the bi-wheel is wrong, but because the main wheel is animated and alive. The bi-wheel is its still sibling. For a product whose aesthetic promise is celestial vitality, the bi-wheel should breathe.

This is not a major engineering request. The animation keyframes already exist in `SolarReturnPage.tsx` for the advance markers. The planet glyph nodes in the bi-wheel could receive the same ambient pulse the main wheel's planets already have. The effect is subtle. The subtlety is the point — most users will not consciously notice. They will feel that the chart is alive.

---

## What the Sprint Should Leave No Room For

There are several places in this product where something was built to be finished later and later has not come.

The `SRStaticBriefs` shows only Sun and Moon. The vision for sprint 0021 identifies expanding this to angular-house planets. This is the right move and requires no new infrastructure — the `PLANET_IN_HOUSE` data already exists for every planet in every house. The question is only: which planets, and with what presentation. My answer: SR planets in houses 1, 4, 7, 10 — plus SR Mars always (it names the year's energy regardless of house), plus SR Saturn always (it names the year's demand). Show them as additional cards in the existing grid. Label each with its house and sign. Let the brief speak without "This year:" in front of it.

The advance strip position — currently at the bottom of the Reading tab — should move up between `KeyPlacements` and `SRStaticBriefs`. The user needs to see when the year intensifies before they read what the year means. Forward motion, then character.

The `SolarReturnAdvancePreview` section title is "When This Year Intensifies." This is better than most of what I have read in this product. It is a question with an answer built in. It respects the user's curiosity. Keep it.

---

## A Note on What the Product Does Well

I have spoken mostly of what is unfinished. This would be incomplete without saying what is right.

The advance strip markers — the small colored dots in the overview strip — are visually elegant. The gold diamond for power days, the circle for favorable and challenging, the animated pulse: this is the kind of small decision that someone thought about. It does not shout. It signals.

The banner text for advance markers — "Saturn reaches your Ascendant — the year's foundational structure is being tested" — is exactly the right voice. Specific. Dignified. Not dramatic. The work that added houses to reason strings and guidance sentences — these are the moments where the product stops being a database and starts being a reader.

The `DailySnapshotCard` loading state — a pulsing `✦` with "Reading today's sky for your chart…" — is charming. The ellipsis and the phrasing carry a sense of work being done on behalf of the user. It is small and it is right.

The void of course indicator in the Moon pill — "· void · decisions may need revisiting" — is compressed and specific. Someone chose "may need revisiting" over "avoid," and "may need revisiting" is gentler and therefore more useful to most people reading it.

These moments work because someone thought about the feeling, not just the information.

---

## The Standard I Would Apply

A film is finished when nothing in it reminds you it was made. A good film puts you inside it and leaves no visible seams. The product should work the same way.

Every "This year:" prefix that announces itself as a database lookup. Every "Welcome back" that could have been watching the sky for you. Every grey chevron hiding the most insightful sentence on the page. Every advance strip buried at the bottom when it is the most actionable thing in the reading.

These are seams. They remind the user the product was assembled by people looking at separate screens on separate days. The user does not consciously think this. But they feel it as a vague distance — the sense that the product is speaking at them rather than to them.

Remove the seams. Not all of them — that would take many sprints. But remove the ones that cost almost nothing to remove and that the user will feel the moment they are gone.

That is the craft bar for this sprint.
