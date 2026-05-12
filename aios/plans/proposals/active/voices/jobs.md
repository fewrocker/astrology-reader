# Steve Jobs — Sprint 5 Proposal Voice

The personal day/month/year numbers shipped in sprint 4. Good — those were the low-hanging fruit that gave the daily card real teeth. The dream sky context is there too. We've built the ingredients.

Now here's what bothers me: the user still opens this app to a menu of buttons. A menu of buttons! We have the most intimate picture of someone's cosmic identity ever assembled in a browser app — their natal positions, their personal day number, their active transits, their recent dream themes — and we greet them with a list of navigation options.

**What's the first screen experience right now?** "Welcome back. Your birth details. Birth chart. Transits. Synastry. Solar Return. Numerology. Dream Journal." That's not a product. That's a sitemap.

**What it should feel like:** You open the app and it says: "Today is a Personal Day 4. The sky has Saturn anchoring your 3rd house — a day for careful, structured communication. The Moon waxes toward Full in Scorpio tonight." Then a GPT synthesis: "This is a day to build, not dream. Channel last night's restlessness into disciplined work." One screen. Twenty seconds. You feel oriented. You go live your day.

That is the *daily ritual*. That is what makes someone open this app every morning instead of once a month.

The Today view is a first-class page. Not a card buried in the landing menu. A destination.

**The dream reading is good but generic.** Here's the problem: when you enter a dream, the GPT gets your natal chart — all of it. Sun in Gemini, Moon in Capricorn, Mercury in Taurus... all 10 planets dumped into the context. The AI then tries to relate all of it to your dream. That's too much signal. The dream realm has specific rulers: Neptune (ruler of illusions, the unconscious), the 12th house (hidden things, sleep, the collective), Pisces (dissolution, mysticism), the Moon (emotions, the night, the inner world). If someone has Neptune in their 7th house and they dream of a mysterious partner, that's direct and meaningful. If they have Pisces Rising, they're naturally porous to the dream world. The current implementation doesn't know to highlight this. It just dumps the whole chart.

**The fix is not a rewrite.** Pre-filter the context before the GPT call. Send: "This is a dreamer with Neptune in [sign/house], [12th house planets], Moon in [sign]. Currently: Neptune transiting [house], Moon in [sign]. They dreamed: [dream text]." That's a laser. The current approach is a flashlight.

**What to cut:** Don't build a separate "Dream Archetypes" page. Don't add new navigation sections. Integrate into what exists. Deepen — don't sprawl.

**The one-sentence story of what we're building this sprint:** Give the user a beautiful "Today" arrival experience AND make their dream readings feel cosmically tailored to their specific chart rather than generically astrological.

**Signature moments:**
1. Opening the app in the morning and feeling immediately held by today's synthesis.
2. Reading a dream interpretation that references *their* Neptune placement — not just "the sky today."
3. Noticing over weeks that their Personal Day numbers really do track with how their days feel.
