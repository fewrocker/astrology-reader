# Hayao Miyazaki — Voice Analysis

## Where Craft Is Missing

**The home screen greets the user with their own birth data as if it were an invoice.**
"Place: ...", "Time: ...", "Date: ..." — three lines that reduce a human being's birth moment to a formatted record. There is no warmth here. The user entered their most personal coordinates — the moment and location of their arrival into this world — and the app shows them back a database row. A craftsman would receive that information with more reverence.

**Nine equal buttons of equal weight, arranged in a column, all shouting at once.**
There is no visual breath between them, no sense of invitation. The buttons are functionally identical in their urgency — "Read My Chart" competes with "Enter New Birth Data" at the same visual weight. Important things should look important. Small things should look small. The hierarchy is absent, and so the user is left to figure out the hierarchy alone.

**The Daily Snapshot is hidden below the fold on desktop like a footnote.**
This is the most alive, personal, today-specific piece of information in the entire app — the Moon, the energy score, the current sky's message for *this person* — and it lives at the bottom of the screen after two full panels of content. On desktop, most users will never see it unless they scroll. The most temporal and personal feature is treated as an afterthought.

**Loading screens are mechanical masks over beautiful computations.**
A spinning `✦` and "Calculating your chart..." — this is a browser spinner with mystical wallpaper. It tells the user nothing. The actual computation happening beneath is extraordinary: the software is calculating where every planet sat in the sky at the precise moment of a person's birth. The loading copy does not honor what is actually occurring. Similarly, "Reading the transits..." and "Analyzing compatibility..." are slightly better but still generic. They describe the action, not the meaning.

**The `TransitReadingPage` shows no data until the GPT call returns.**
This is the deepest form of disrespect in the product: the transit aspects table, the retrograde list, the planet positions — all of it is computed instantly, client-side, right now. But the user sees none of it. They wait for a GPT paragraph before the computed astronomy is allowed to appear. The instant data is held hostage by the slow data. A craftsman never makes the user wait for something that is already ready.

**The session badge — a tiny `✦` at 30% opacity — expects users to find it by accident.**
This is a person's cosmic record. Their birth chart, their journal, their dream interpretations — all of it floating locally, at risk of disappearing. The only offer to protect it is a character that fades into the header at 30% opacity, with no label, no tooltip visible on mobile, no nudge unless the user has already created journal entries. The craft failure here is not subtlety — subtlety can be beautiful. The failure is that the subtlety serves no one. Discretion and invisibility are not the same thing.

**"Enter New Birth Data" is a cold, technical label for a deeply personal action.**
Changing one's birth data is not like entering a shipping address. It implies the user got something wrong about their own birth — or that they want to explore another person's chart. Either way, the label treats a meaningful act as a form field update. The phrase reads like a database reset, not a gentle invitation to reconsider.

**The `CachedDataNudge` text reads like a notification, not a conversation.**
"Protect your cosmic record" — this is not terrible. But it appears with a dismiss button labeled `✕` with no context for why dismissal matters, and the nudge evaporates permanently after one click. There is no second chance, no return. If the user dismisses it out of habit, they lose access to the offer with no signal that it was meaningful.

**The transit reading bottom navigation has four buttons in a row: Discuss, Choose Another Reading, View Birth Chart, New Birth Data.**
Four destinations at the bottom of a completed reading. No visual hierarchy. The user who just finished reading their weekly transits and simply wants to return home has to scan four buttons, all equally weighted, to find their way. "New Birth Data" at the end is especially jarring — it implies starting over, not navigating home.

---

## Small Touches That Would Make a Difference

**Show the user's Sun sign and rising sign in the birth details block, not just coordinates.**
"Sun in Scorpio · Libra Rising · Moon in Pisces" tells the user who they are. "Date: 10/28/1992" tells them nothing they don't already know. The birth details block on the home screen is the first thing a returning user reads. It should speak to them, not at them.

**Give the Daily Snapshot its proper place — embedded in the left panel, above the navigation choices.**
When the user opens the app in the morning, the first living content should be today's sky for their chart: the Moon phase, the energy score, and the two-sentence briefing. This is the daily greeting. It belongs at the top of the panel, not the bottom of the page.

**Replace "Enter New Birth Data" with "Change birth information" — smaller, quieter, a link rather than a button.**
A small gray link below the birth details block, not a full-width gold button competing for attention with "Get Your Readings." The act of clearing the cache is maintenance, not a primary action.

**Animate the ambient loading copy with a slow breath, not a spin.**
When GPT is thinking, the animation should feel like patience, not mechanical urgency. A slow breathing pulse on the text "Consulting the stars..." — one breath every two seconds — reads as contemplative. The current fast spin reads as anxious.

**On the Readings modal, give each item a one-line descriptor that earns the click.**
"Birth Chart ✦" — fine. But beneath it: "Your natal positions, decoded once and kept forever." Beneath "Daily Reading ☀": "What the sky is doing to your chart right now, today." These are not feature labels. They are invitations. The difference is significant.

**Give the user their Sun sign symbol in the header beside "Astral Chart."**
When the user has birth data, the header could quietly display a small zodiac glyph for their Sun sign — just the glyph, 60% opacity, beside the title. It is a tiny recognition that the app knows who it is talking to. The difference between "Astral Chart" and "Astral Chart ♏" for a Scorpio returning user is the difference between a service and a relationship.

**On loading states for GPT-heavy screens, show the computed data immediately with a soft shimmer placeholder for the GPT section.**
The transit aspects table, retrograde list, planet positions — these should appear the moment the user lands on the page. Only the interpretation paragraph should have an ambient loading state: a skeleton line, softly pulsing, with the phrase "Consulting the stars..." floating inside it. This tells the user: we already have your data. We are just waiting for the sky to speak.

**The `↻ refresh` button on DailySnapshotCard should be labeled more gently.**
"↻ refresh" is developer vocabulary. Something like "↻ ask again" or simply an unlabeled glyph with a tooltip "Request a new reading" respects that this is not a cache invalidation — it is asking the oracle for a second opinion.

---

## Proposals I'm Making

**Proposal 1 — Rewrite the birth details block to speak to the person, not about the data.**
Replace the label-value list with a line that says who the person is astrologically: "Sun in Scorpio · Libra Rising · Moon in Pisces." Below that, in smaller muted text, the birth date and location for reference. The labels "Place:", "Time:", "Date:" should disappear entirely. The user does not need to be reminded of what they entered. They need to be recognized.
*Why it shows care:* The app holds their most personal astronomical coordinates. Reading them back as raw data fields is like addressing someone by their passport number. This small change acknowledges the person behind the data.

**Proposal 2 — Move the Daily Snapshot to the top of the left panel, before any navigation buttons.**
On both desktop and mobile, the DailySnapshotCard should appear inside the left panel immediately after the birth identity block — not below the fold, not at the bottom, not only on mobile. Today's Moon, today's energy, today's sky briefing: these are the first things a returning user should see.
*Why it shows care:* The person opened the app today. Something happened in the sky today that applies specifically to their chart. Showing them that first — before asking them to choose a reading — is the difference between a tool and a companion.

**Proposal 3 — Introduce consistent split-render across every AI-driven screen.**
Every page that has computed data and GPT data must show the computed data immediately. The GPT interpretation slot should be visibly "thinking" — a soft pulse, thematic loading copy — while the rest of the page is already fully populated. No screen should show a full-page spinner while instant data waits.
*Why it shows care:* Waiting is tolerable. Waiting while you cannot see anything is not. Showing the transit aspects table, the compatibility scores, the planet positions instantly — and letting the narrative arrive a moment later — tells the user their data is already here. The sky has already been read. We are just finding the right words.

**Proposal 4 — Replace the invisible session badge with a visible, human invitation when the user is unauthenticated.**
Below the birth identity block, a quiet line: "Your readings are saved locally. ✦ Create an account to protect them." This should be permanent and unobtrusive — not a nudge that can be dismissed, but a steady ambient truth. The `✦` glyph in the header can remain as a secondary entry point.
*Why it shows care:* The user's journal entries, dream interpretations, and chart data may evaporate on a device reset. They do not know this. Telling them calmly and clearly — without alarm, without pressure — is respectful. Hiding this fact behind a 30% opacity glyph is not.

**Proposal 5 — Elevate the ambient loading copy from description to felt experience.**
Current: "Reading the transits..." / "Analyzing compatibility..." — these describe what the software is doing.
Proposed: "The sky is composing your reading..." / "Two charts, one sky — listening..." / "The numbers are speaking..." — these describe what the moment feels like.
The difference is between a progress bar with text and a pause that has meaning.
*Why it shows care:* The user is waiting. What they wait for is a reading that may genuinely move them. The loading moment is an opportunity to build quiet anticipation rather than fill silence with technical description. Done well, it makes the arrival of the text feel earned.

**Proposal 6 — Redesign the "Get Your Readings" modal to feel like opening a book, not a settings panel.**
The three groups — You, Transits, Journals — should have a visual rhythm that guides the eye downward naturally. Each group should feel settled, not crammed. The group headers should use the Cormorant Garamond heading font at a comfortable size. Each item needs its glyph, its label, and its one-line descriptor. The modal should have breathing room — padding that acknowledges these are not utility items but doorways.
*Why it shows care:* The user is being asked to choose their next reading. This is not a navigation decision — it is an act of attention toward oneself. A modal that feels beautiful and organized invites that attention. A modal that feels like a dropdown menu discourages it.

---

## What Disrespects the User

**Showing a full-page spinner while client-side computed data is already available.** The user did not ask us to wait. We chose to wait by blocking the render. That choice belongs to us, not to them.

**"Enter New Birth Data" as a full-weight primary-style button.** This suggests the user has done something wrong and must correct it. It sits at equal visual weight to "Read My Chart." It should not.

**The DailySnapshotCard living below the fold on desktop.** The user who comes back every morning — the most engaged user the app has — may never know the daily snapshot exists. This is a product failure disguised as a layout decision.

**The session badge at 30% opacity with no label on any viewport.** The user's cosmic record is vulnerable. They deserve to know this clearly, not in a tiny glyph that most users assume is decorative.

**Loading copy that uses developer vocabulary.** "Calculating your chart." "Reading the transits." These phrases are accurate but they are not kind. They describe the machine's work, not the user's experience. Every loading screen is a moment when the user is doing nothing but trusting us. That trust deserves a more human response.

**Four equal-weight navigation buttons at the bottom of every results page.** After a completed reading, the user needs one clear path home. Four competing options with identical styling at the bottom of the page is a navigation desert. The user who just finished their weekly reading should see "← Back" as one obvious option, not four buttons of equal visual authority asking them to make another decision.
