When evolving the product:
-> Introduce features which make the astrology suite more complete with different cross interpretations of things such as dreams, numerology, astrology, as one encompassing suite that works separately but also together
-> Every feature and design has to be beautiful and follow the majestic designs that are currently on the app, so before developing new UI, check some UI components to understand their vibe

---

## Sprint focus: Deepen Numerology

**All proposals for the next sprint must be about making numerology richer, deeper, and more alive.**
The current numerology reading is a good start but it is too shallow — static cards showing "Life Path 7 means introspection." That is not enough.

### What to explore and propose:

**1. GPT interpretation layer for numerology**
- Do NOT make one GPT call per number — make one call that receives all the user's numbers together and returns a cohesive, flowing reading that shows how the numbers combine and interact
- The static cards (Life Path, Expression, Soul Urge, Birthday, etc.) render immediately with their pre-computed meanings — no loading wait
- The GPT narrative card loads asynchronously: show a placeholder with a skeleton/pulse animation ("Interpreting your numbers…") while the call is in flight, then swap in the text when it resolves
- The interpretation must feel like a real reading of the whole person, not a dictionary entry per number
- Use the user's name and birth data to make it personal and specific

**2. GPT layer for numerology ↔ astrology cross-reading**
- A second GPT call (run in parallel with the numerology interpretation call, not sequentially) weaves numerology and astrology together once both datasets are available
- Example: "Your Life Path 7 resonates with your Scorpio Sun — both point toward a life of depth, research, and hidden truths"
- This call also gets a placeholder card with animation while it loads — the page is never blocked waiting for GPT
- Parallelize both GPT calls (numerology reading + astrology cross-reading) so they run simultaneously; total wait time is the slowest of the two, not the sum
- This cross-reading is the real differentiator — no app does this well

**3. Go deeper on numerology itself**
- Beyond the basics (Life Path, Expression, Soul Urge): explore Personal Year, Personal Month, Pinnacles, Challenges, Karmic Debt numbers, Hidden Passion, Planes of Expression
- Each layer should have its own GPT narrative, not just a label
- Show how the numbers interact with each other (e.g. Life Path + Soul Urge tension or harmony)

**4. Make it interactive and alive**
- Let the user ask GPT follow-up questions about their numerology ("why is my Life Path 7 relevant now?", "what does my Karmic Debt 13 mean for relationships?")
- Explore a "numerology moment" — similar to transits in astrology, show what the current Personal Year/Month/Day says about right now
- Let the user explore different number combinations and what they reveal

### Progressive loading pattern (required for all GPT cards)
- Static numerology content (computed numbers + pre-written card meanings) must render immediately on page load — zero GPT dependency for first paint
- GPT interpretation cards start loading in parallel as soon as the page mounts; they show a pulsing skeleton placeholder until resolved
- Never block the page render on a GPT call — the user sees real content right away, the AI enrichment layers in on top

### What NOT to propose
- Do not propose features outside of numerology unless they are a direct bridge between numerology and astrology
- Do not propose cosmetic or UI-only improvements that have no interpretive depth behind them
- Do not add more static content — every new number or layer must be GPT-interpreted
