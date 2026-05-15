# Miyazaki's Craft Analysis: Sprint 0018 — The Slider That Tells You Nothing

---

## What the Advance Tab Is Asking the User to Do

Open the Advance tab. A slider sits at the left edge. Below it: "Now." At the right edge: "30 days." The slider thumb is gold, which is good. The track is dark, which is correct. The date appears below when you drag.

But to understand anything about the next thirty days, you must drag. You must visit every position. You must carry information in your head from one stop to the next. The chart changes as you move — the aspect list below rewrites itself — but there is no way to stand back and see the shape of the whole period before you commit to exploring it position by position. There is no bird's-eye. There is only the current moment, wherever you stopped dragging.

This is a library where all the books are on the same shelf, spines turned inward. You can pull each one out individually. But there is no overview, no catalog, no way to walk in and know immediately: that week in the middle is red, that day near the end is gold. You must pull out every book yourself.

The user comes to the Advance tab with a question. Not "what is happening on day fourteen specifically" — not yet. The question is: where should I look? When is a good week to make the decision I have been postponing? When should I expect friction? When is a moment coming that deserves preparation? These are the questions that astrology is actually asked. And the current Advance tab cannot answer them without the user doing all the work themselves.

The sprint is about giving the tab the ability to speak first. The markers on the slider are not decoration. They are the chart pointing at itself and saying: here. Look here. This one matters.

---

## The Mechanical Feeling

There is a specific quality to the current Advance tab that I would call mechanical, and it is worth naming precisely before proposing anything, because mechanics and craft are opposites and the difference lives in small details.

**The slider provides no preview of what it contains.** A musical instrument tells you something about its sound by looking at it. A violin communicates "sustained, resonant, capable of grief" through its shape alone, before it is played. The current Advance slider communicates nothing. It is a generic range input. It could be a volume control, a scroll bar, a form field for entering a number from 0 to 30. The fact that it controls a transit chart for a specific person's life is invisible in the component's appearance.

**The date label updates, but the update feels like a readout.** Below the slider: a date in gold type. When you drag, the date changes. This is correct behavior. But a date alone is not meaningful. "Fri, Jun 13, 2026" does not tell me anything until I have read the aspects below. The date is a readout from an instrument I cannot interpret until I read further. This forces sequential consumption: drag, scroll down, read aspects, scroll up, drag again, scroll down again. The attention bounces between the slider and the content it controls, with no integration between them.

**The power-day banner appears and disappears unpredictably.** When the current snapshot happens to be a power day, a gold banner appears above the chart wheel saying what the power is. When it is not, nothing appears. This is correct behavior — you should not show a banner that does not apply. But from the user's perspective, the banner's appearance feels random. It does not feel like information they sought; it feels like something they stumbled into. The transit chart contains genuine structure — some moments are significantly more active than others — but the current interface presents them as equivalent until you happen to land on one.

**The quick-stats row shows numbers that require interpretation.** "6 aspects / 4 harmonious / 2 challenging" is data. It is not wisdom. A user who does not understand the significance of tight-orb applying aspects cannot distinguish a day with 4 harmonious aspects all separating and wide from a day with 2 harmonious aspects both applying within 0.5° of exact. The numbers look similar; the meaning is opposite. The current interface provides the count but not the weight.

**Loading says "Computing transits…" in plain muted text.** The calculation that happens when you switch to the Advance tab is real computation — it is calculating planetary positions for every step in the range, which is not trivial. The current loading state communicates none of this. "Computing transits…" in muted grey is the same text you would put on a broken form. It does not feel like the product is doing something extraordinary on your behalf. It feels like a wait.

Each of these failures is small. Together they produce the mechanical feeling: this is an interface through which you access data, not an experience through which you encounter meaning.

---

## The Marker System: How It Should Feel

The vision document describes the architecture correctly. I do not need to revise it. What I want to add is the felt quality that the architecture must produce — the specific sensory experience that makes the difference between markers that are technically present and markers that do the emotional work they are supposed to do.

### The slider must feel like a landscape, not a scale

Before any markers are designed, the slider itself needs to communicate that it contains terrain. The current dark track is flat. A landscape has topography — rises and falls that the eye reads before the mind interprets them.

The track behind the slider could carry a subtle gradient that reflects the overall energy distribution across the period. Not a gradient from left to right by time, but a gradient whose luminance rises where markers cluster and dims where the period is quiet. This does not need to be precise. A soft glow at the positions of significant markers, diffusing outward along the track, is enough to make the track feel inhabited before the user reads a single label.

This is not data visualization in the clinical sense. It is more like a path through fog where you can see that some areas ahead are lit and others are dark. You do not yet know what the light means. But you know where to walk toward.

### The dots must be quiet until asked

The markers will be colored dots on the track — gold for power, green for favorable, red for challenging, blue for shift. The temptation will be to make them vivid and attention-seeking. This would be a mistake.

The dots should be small at rest. Smaller than you think they need to be. Their color should be their identity, not their size. A 4px circle in emerald-400 reads as favorable; it does not need to be 8px to communicate this. When the slider thumb approaches — within three or four steps — the nearby dots should grow gently toward their full size. When the thumb lands exactly on a marked position, the dot brightens and a tooltip appears above it.

This behavior — quiet at distance, available when near, fully revealed on contact — is the behavior of something waiting to be noticed, not something demanding attention. The dots should feel like they have always been there, visible to anyone who looked, rather than animating dramatically to announce themselves.

The one exception is the gold power-day marker. A slow pulse — not a bounce or a ping, but a slow expansion and contraction of the dot's outer glow, like a breathing thing — is appropriate for these moments. Saturn making exact contact with the natal Ascendant is a genuinely rare event in a person's life. The marker for it should feel like something that has been waiting for a long time. The breathing pulse communicates patience, not urgency.

Challenging red markers should pulse slightly faster than the gold ones — still slow by normal UI standards, but with a note of something active that the gold markers do not carry. Not alarming. More like a day that requires your attention.

Favorable green markers can be static — a gentle glow without pulse. A favorable day does not demand anything. It offers. A static glow is an offering.

Blue shift markers are the most unusual category — a planet stationing, direction changing. These are genuinely strange moments in the planetary sky: a body that has been moving in one direction for weeks or months slowing to a stop and beginning to move the other way. The marker for this should carry a visual quality of reversal — perhaps a slow rotation of the dot shape, or a diamond that slowly rotates a few degrees back and forth. Not dramatic. Just: something that was moving is no longer moving in the same way.

### The tooltip is the moment of care

When the slider reaches a marked position — or when the user hovers a dot in the overview strip — a small tooltip appears above the track. This tooltip is where the product has the opportunity to say something specific and true about this particular moment in this particular person's chart.

The tooltip must not say: "Power Day."

"Power Day" is a category label. It is the name of the folder, not the name of the thing inside the folder. A person who reads "Power Day" learns that this day has been classified as significant. They do not learn why this day is significant for them.

The tooltip should say: "Saturn reaches your Ascendant." Or: "Three aspects converge, all applying." Or: "Uranus stations retrograde." These are specific observations derived from the chart. They take one or two seconds to read. They give the user something to carry into the detail below.

The tooltip header — the date and the one-line reason — should be displayed in a small panel that appears above the track, connected to the dot by a thin vertical line so the visual relationship between the dot and the text is clear. The panel should feel like a whisper, not a callout. Small text, semi-transparent background, visible for as long as the hover or proximity lasts, then gone.

One additional touch that would lift the tooltip from correct to caring: include the day of the week in the date. "Saturday, Jun 13" carries more weight than "Jun 13" alone. A person planning their life thinks in terms of weekdays. Knowing that the power day falls on a weekend, or on a Monday when they will be starting something important, matters. The date format is a small choice; the day of the week costs nothing and adds meaning.

### The overview strip must feel like a map

The horizontal strip above the slider — the bird's-eye view of the entire period — is the most important new element in this sprint, and it is where the design has the most opportunity and the most risk.

The opportunity: a strip that shows the distribution of notable moments across the period gives the user something they have never had in this tab. They can look at a month and see immediately that it clusters toward the beginning, quiet in the middle, and has a gold marker and a red cluster in week three. They do not need to drag the slider to learn this. The strip has already told them.

The risk: a strip full of dots is noise. If every other position carries a colored marker, the user loses the ability to distinguish signal from background. The monthly period threshold calibration in the vision document addresses this directly — only mark months where something genuinely significant happens. I want to reinforce this from the felt perspective: a month where two or three markers appear in the strip feels purposeful. A month where eight markers appear feels like the feature is marking everything and therefore marking nothing.

The strip label says "Notable moments" on the left. On the right, the period range. Between them: colored dots at their proportional positions. This is the correct grammar. I would add one refinement: when there are no markers in the strip (every position is neutral), the strip should still appear, but with a single small text label: "Quiet period — no exceptional moments detected." This communicates that the absence of markers is itself a reading, not a failure.

A quiet period has its own meaning in astrology. Not every month should be gold and red. Some months are indeed quiet. Saying so explicitly — "this is a quiet stretch" — is more honest and more useful than showing an empty strip that the user might interpret as a loading failure.

---

## The Loading State Should Feel Like Preparation

When the user first opens the Advance tab, the snapshots are being computed. `useTransition` keeps the main thread responsive, but the visual experience during this computation is currently: grey text saying "Computing transits…" and a placeholder for the chart wheel.

The computing state is not a problem to be hidden. It is a moment of genuine activity that the product is doing on the user's behalf. It deserves a treatment that communicates "something real is happening here" rather than "please wait while the interface loads."

A specific proposal: during the computing state, show the slider container with the track visible but the markers appearing one by one as each snapshot is scored — a brief sequential appearance of dots materializing from left to right along the track as the calculation proceeds. This requires the pre-calculator to emit results incrementally rather than returning the full array at once, which may be an architectural change worth making or may be too costly. If not, a simpler version: the slider container shows an animation of small glowing points traveling left-to-right along the track, suggesting the computation sweeping through the period. When computation completes, the actual markers resolve into place.

Either version communicates: the product is doing real work for you. You will see the results when it is ready. The stars are being measured.

---

## The Moment the Slider Reaches a Marked Position

There is a specific moment in the interaction that deserves particular care: the moment when the user drags the slider and it arrives exactly at a position that carries a marker.

Currently, nothing changes except the aspects list rewrites itself below. If there happens to be a power day at that position, the gold banner appears. But this appearance is not triggered by the arrival — it is simply a coincidence of the snapshot's data.

The moment the slider lands on a marked position should feel like an arrival. A small, immediate response: the dot expands slightly, the tooltip appears, the date display below momentarily brightens or shifts to the marker's color before settling back to gold. This is a half-second event. It is not dramatic. But it communicates: you found something.

This is the difference between a slider that has markers painted on it and a slider that knows where the significant moments are. The first is decoration. The second is intelligence made tactile.

---

## What Is Missing That No One Will Ask For

These are the details that will not appear in any feature request, because users do not know to ask for them until they experience them:

**A "Next notable moment" button.** Next to the slider, a small control: "→ Next." Pressing it advances the slider to the nearest upcoming marked position. This is the fastest way to scan the period — not dragging step by step, but jumping between notable moments. The control should be subtle: not a large button, but a small arrow or a text link. "Jump to next →" in muted gold, which becomes active when markers exist ahead of the current position, and grays out when you have passed all of them.

**The slider thumb should know where it is.** When the thumb sits at a marked position, its appearance could shift slightly — a faint colored halo behind the gold circle, in the marker's color. When it moves away from the marked position, the halo fades. This requires knowing the current offset's marker status, which is already computable. The implementation is a single CSS variable applied to the thumb's shadow. The effect: the slider thumb itself participates in the reading. It does not just sit there being gold. It tells you: this position has a quality.

**The aspect list below should echo the marker category.** When a power day is selected, the aspect list header could say: "Transit Aspects (6) — Power configuration." When a favorable day is selected: "Transit Aspects (8) — Favorable window." When a challenging day: "Transit Aspects (7) — Tense configuration." This is a trivial change — it is adding a text suffix to an existing header — but it creates a continuous thread of meaning from the marker on the slider through the date display through to the aspect list below. The user experiences the categorization not as a dot on a track but as a quality that runs through the entire view.

**The retrograde activity section should become a shift section on station days.** When the current snapshot is at a "shift" marker — a planet stationing — the retrograde activity section below should have a modified header: "Planetary Shift" rather than "Retrograde Activity." A station is not retrograde activity yet; it is the moment of direction change. The heading should name what is happening, not what category it belongs to.

**The "Now" label at the left end of the slider should carry the current date.** "Now" is useful as a concept. "Now (May 15)" is more useful as information. A small parenthetical date under "Now" and under the max label ("30 days (Jun 14)") gives the user the period at a glance without having to calculate it themselves. This is a one-line change. It is the kind of detail that a person notices when it is absent — when they look at the slider and realize they have been wondering what the end date is since they opened the tab.

---

## The Deeper Question

The Advance tab is about time. It is about a person standing in the present and looking at what is coming. The experience of doing this should feel like something meaningful — not like operating a data viewer.

A person who sits with a good astrological almanac and turns its pages forward into the coming weeks has a specific feeling: anticipation, recognition, preparation. The almanac tells them what to expect before they arrive at each day. They carry this forward. When the difficult week arrives, they are not surprised — they prepared. When the favorable window opens, they recognize it. They act.

The Advance tab can create this feeling. The markers are not features. They are what enables the user to stop feeling passive about their future and start feeling oriented within it. That is what astrology has always offered, at its best: not prediction but orientation. Not "this will happen" but "here is the shape of what is coming, so that when you walk into it you are not walking blind."

The slider with its colored markers, its breathing gold dots, its quiet green glows, its overview strip that shows the whole period in a glance — this is an invitation to orient. Make it feel like one.

---

## Specific Proposals by Area

**Slider track:**
- Add a very soft glow below each marked position along the track — the track should feel inhabited, not empty
- When the thumb rests at a marked position, add a faint colored shadow (in the marker's color) behind the gold thumb
- Display the current date below "Now" and the end date below the max value label

**Marker dots:**
- Rest size: 4–5px diameter, colored but not vivid
- Approach state (thumb within 3 steps): grow to 7px, opacity increases
- Hover/active state: 8–9px, full color, tooltip appears
- Gold (power): slow pulse of outer glow, ~3s period, ease-in-out
- Red (challenging): slightly faster pulse, ~2s period — active, not alarming
- Green (favorable): static soft glow, no pulse — an offering, not a demand
- Blue (shift): slow rotation of diamond shape, ±5° back and forth — communicating reversal

**Tooltip:**
- Connected to dot by a thin 1px vertical line
- Semi-transparent dark panel: `bg-mystic-bg/90 border border-mystic-gold/20`
- Three lines: date (with weekday), category label, one-line reason
- Category label in the marker's color; reason in `text-mystic-text/80`
- Appears on hover or when thumb arrives at marked position

**Overview strip:**
- Label "Notable moments" left-aligned, period range right-aligned
- Dots positioned by percentage, sized 4px, same color coding as slider markers
- When empty: show "Quiet period — no exceptional moments detected" in `text-mystic-muted text-xs`
- Clicking a dot in the strip jumps slider to that offset

**Navigation:**
- "→ Next notable moment" control to the right of or below the slider, appearing only when markers exist ahead
- Subtle: `text-mystic-gold/50 text-xs font-heading` at rest, `text-mystic-gold` on hover

**Aspect list header:**
- Append the marker category label when the current position is marked: "Transit Aspects (6) — Power configuration"

**Loading state:**
- Replace "Computing transits…" with a small animation along the slider track or a phrase that communicates the genuine work being done: "Reading the next 30 days…" or "Calculating your sky…"

**Retrograde section header on station days:**
- When the marker category is "shift," show "Planetary Shift" as the section title instead of "Retrograde Activity"

---

The difference between the current Advance tab and the one this sprint should produce is the difference between a map that shows terrain and a map that shows terrain with the significant landmarks named. The roads are the same. The scale is the same. But one tells you where to go, and the other merely shows you that somewhere to go exists.

Make the map say where to go.
