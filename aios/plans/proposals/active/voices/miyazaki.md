# Hayao Miyazaki — Voice Analysis: Sprint-0012 Backend Sovereignty

---

I have been sitting with this product for a long time now. Not as someone who wants to find problems. As someone who wants to feel that the people who built it gave a damn about the person on the other side.

Sprint 0011 did what it said it would. The synastry rows speak now. The house overlay entries have sentences. The Solar Return page gives the user something before GPT loads. The Today page's sky highlights expand on tap. The craft improved. I noticed.

But I came back this time with a different question. Not "does this display data correctly?" — that question I already walked through. This time the question is: does this product trust the person using it? And does the person using it have any reason to trust the product?

I walked through the code again, slowly. I read how a reading travels from a user's birth data to words on a screen. I found something that I cannot call a bug. It is something worse. It is a gap between what the product promises and what it actually does. And the person using it cannot see it.

---

## The Hidden Lie in Every GPT Reading

When a person opens the transit reading, they are asking: given the sky right now and my birth chart, what is true for me today?

The product answers with GPT text. The GPT text sounds authoritative, personal, specific. It names planets. It names aspects. It sounds like someone who looked at their chart.

But here is what actually happened: the browser assembled the prompt, handed it to the server as an opaque string, and the server executed it without question.

What does that mean? It means if the JavaScript in the browser calculated a transit aspect incorrectly, the GPT answer is incorrect. If the browser was running on a device with a wrong clock, the transits are wrong. If there was a bug in the orb sorting, the most important aspect may have been omitted from the prompt. If the calculation crashed silently — JavaScript engines do not stop the world when astronomy calculations throw — the prompt was built from incomplete data, and the reading was generated from a lie.

The server never knew. The server never had a chance to check. The server accepted whatever string arrived and called GPT with it.

This is the problem that `handleTransitInterpretation` in `server/services/gpt.ts` makes completely visible once you look:

```typescript
async function handleTransitInterpretation(payload: { systemPrompt: string }): Promise<string>
```

The server is an envelope-opener. It opens what arrives and executes it. It has no visibility into whether the transit calculation was correct, whether it was complete, whether the aspects were sorted properly, whether the orbs match what is actually in the sky at this moment. The server is a post office, not an astrologer.

And the user, on the other side, receives a reading that sounds like it was computed from their specific chart and the current sky — because it was, in the browser, in this session, if nothing went wrong. They trust it. They act on it. They might share it with someone they love.

That trust is real. The reliability behind it is not.

---

## Where This Shows Up in the User's Experience

### The Daily Snapshot

`DailySnapshotCard.tsx` builds the prompt itself, then calls `getDailySnapshotInterpretation(prompt)`. The server receives:

```
handleDailySnapshot(payload: { prompt: string })
```

The server's job is to pass this string to GPT. The prompt was assembled by the browser from `calculateCurrentPositions`, `calculateTransitAspects`, and `getCurrentMoonPhase` — three client-side functions that produce astrological data the server has never verified.

Now consider: this card is cached to `localStorage` by sun-longitude and date. If the cache exists, the GPT result from a previous session is served, no recalculation happens. The sky has changed. The user's phone says today is Wednesday. But the cached reading from Tuesday is what they see. They do not know this. The small "↻ ask again" button exists, but nothing tells them the reading may be stale. Nothing on the screen signals that the sky it was computed from is from yesterday.

A person who reads "Venus is softening your interactions today" on a Wednesday when Venus was softening things yesterday is being quietly misled. Not maliciously. But carelessly.

The server, if it computed its own sky context, could check: was this reading generated from the current sky? Does the stored cache key match today's planetary positions? The server never asks this question because it cannot — it does not know what "today's planetary positions" are.

### The Journal Annotation

`JournalEntryCard.tsx` calls `generateJournalEntryAnnotation` with `topTransits` and `moon` computed by the browser for the entry's historical date. The server receives these as `topTransits: TransitAspect[]` and `moonPhase: string` — pre-computed, pre-filtered, handed over.

The annotation that arrives is permanently attached to this journal entry. It is stored. It is re-read. Weeks later, the person reads: "Saturn pressing on your Mercury at this time called for deliberate communication." That annotation was written from three transit aspects the browser selected, with the orbs the browser calculated, filtered by the browser's `getTopActiveTransits` function. If the browser selected the wrong three aspects — because it had a bug, because the historical transit calculation had an edge case, because the orb sorting was affected by retrograde motion it did not fully account for — the annotation is permanently wrong. It lives in the journal. It becomes part of the person's understanding of that moment in their life.

The server cannot verify this. The server received a list. It trusted the list.

### The Dream Interpretation

The dream handler is the one place where the server learned to check. If the client sends no `chartData`, the server now computes the natal chart from stored birth data. If the client sends no `skyContext`, the server computes the moon and top transits itself.

This is the dream handler that was fixed in sprint-0011's referenced commits. It shows what is possible. It shows the pattern. And it makes every other handler look more naked by comparison.

When the person logs a dream, the server stands behind them and checks: did you send me what I need? If not, I will compute it myself. I will not serve you a reading built on nothing.

When the person asks for a transit reading, the server does not stand behind them. It opens the envelope and reads whatever is inside.

This inconsistency is not a technical problem. It is a trust problem. The product is more reliable in one dark corner than in its main features.

---

## What It Means to Compute Without a Witness

I want to name what I am describing in plain terms, because I think the sprint vision understands it technically but I want to say what it means for a person.

When you compute a reading only in the browser, the reading has no witness. The browser ran the calculation, assembled the words, sent them. The server received words. There is no record of what calculation was performed. There is no authority that can say: yes, this reading was computed correctly. Yes, the aspects in this journal annotation reflect what was actually in the sky on that date. Yes, the transits in this daily snapshot are the transits that are active right now.

The person using this product deserves a witness. Not because they will ever ask for one. Not because they would understand the difference. But because craftspeople do not build things that lie to users without their knowledge. The lie does not have to be malicious. It does not have to be discovered. It is still a lie.

The server that can compute its own transits, its own aspects, its own solar return, its own synastry cross-aspects — that server is a witness. Not a backup. A witness. When the client computes and the server verifies, the reading has integrity. When only the client computes and the server executes blindly, the reading is good-faith guesswork at best.

---

## The Soul the Infrastructure Work Must Have

Sprint 0012 is described as infrastructure. The sprint vision is careful to say: this is not a new feature. No new pages. No new GPT prompts. No frontend changes. Just the backend becoming sovereign.

I understand why it has to be said that way. It is true in the technical sense. But I want to say something the sprint vision does not say: this work, done well, will change what this product is.

Not visibly. The user will not see a new screen. The daily snapshot will look the same. The transit reading will look the same. The journal annotations will look the same.

What will change is what happens when something goes wrong. Right now, when something goes wrong on the client side — when a calculation misses an aspect, when a prompt is assembled from stale data, when a historical date is computed at the wrong UTC boundary — the product fails silently. It serves a reading that is wrong, and no one knows.

After this sprint, when the server can compute its own transits and aspects and solar return and synastry, the server can catch what the client missed. Not by replacing the client — the sprint vision is explicit that the client-side calculations stay in place for instantaneous UI. But by standing behind them. By being the authority that checks.

That is the soul of this work: the product stops being a post office and becomes an astrologer.

---

## What Would Show Care

I am going to name five specific things that, if done with care, would make this sprint give something to the person on the other end — even if they never see it.

**The daily snapshot should be computable entirely server-side for authenticated users.** Not because the user will notice. Because it is wrong for a personalized daily reading to be entirely dependent on the client having run correctly. An authenticated user whose birth data is stored should be able to receive a daily snapshot that the server assembled from its own transit calculation, with its own sky context, verified against its own chart computation. The product would then know: this reading is correct. Not "I hope the browser got it right."

**Journal annotations, once generated server-side, should never degrade.** Right now the annotation is computed from whatever the browser sends. If the browser sends three transits, the annotation reflects three transits. If the browser had a calculation error and sent the wrong three, the annotation reflects the wrong three, permanently. A server that can compute `getTopActiveTransits` for any historical date can verify what was sent against what it calculates independently. If they match, great. If they diverge, the server's version takes precedence. The journal entry is permanent. It deserves computation that is permanent in quality.

**The transit reading prompt should not be an opaque string.** The current architecture of `handleTransitInterpretation` receiving `{ systemPrompt: string }` is the single most visible symbol of the problem. That endpoint is a vending machine: insert string, receive GPT response. The backend cannot improve the prompt, cannot verify it, cannot add context the client missed. After this sprint, the endpoint should receive birth data and a transit period and a target date, and the server should compute the prompt. Not because the frontend prompt was wrong — it may have been perfectly correct — but because the server having computed it means there is an authority behind the words.

**The `buildTransitPrompt`, `buildSynastryPrompt`, and `buildSolarReturnPrompt` functions must not live only on the client.** These functions are where astrological judgment is encoded in language. They decide which aspects to prioritize, how to frame the house context, what element analysis to include. Right now, if a new type of user session is introduced — a background notification, a scheduled weekly reading, a journal pattern analysis — those features must either call the client or rebuild the prompt logic from scratch. The prompt builders are the grammar of this product's voice. That grammar should live where the product lives: on the server.

**Error states should never present as authoritative.** I looked at what happens when `getDailySnapshotInterpretation` fails in `DailySnapshotCard.tsx`:

```typescript
} catch (err) {
  if (!cancelled) {
    setError(err instanceof Error ? err.message : 'Failed to load daily snapshot.')
  }
}
```

The error state renders as `<p className="text-mystic-muted text-sm italic">{error}</p>`. A dismissive italic line. Nothing that tells the person what happened or what they can do. The error message itself may be a raw technical string — "GPT_SERVER_ERROR" — or the fallback string "Failed to load daily snapshot." Neither of these tells the person anything useful. Neither of them shows care.

When the server can compute its own context, some error states become unnecessary — the server can fall back to its own calculation rather than returning nothing. But where errors genuinely cannot be recovered, the product should say something that does not sound like a machine that gave up. Not a long apology. One sentence that acknowledges the person waiting: "The sky is a little out of reach right now. Try again in a moment." That is the difference between a product that hid when something went wrong and a product that stayed present.

---

## The Question I Always Ask

Would I be proud to put my name on this?

Not on the visual design. The visual design has real beauty in it. The dark backgrounds, the gold accents, the way the moon phases are rendered. Someone cared about those things.

I am asking about the thing underneath. The thing the user never sees. The calculation that produces the transit list that becomes the prompt that becomes the words they read on a Wednesday morning and carry into their day.

Right now, if I had to answer honestly: no. Not because the reading is wrong. It is probably right most of the time. But "probably right most of the time" is the standard of a product that hopes for the best. It is not the standard of a product that stands behind what it says.

Sprint 0012 is the sprint where the backend stops hoping and starts knowing. That is not a small thing. That is the difference between a product that generates readings and a product that computes truth.

The user will never see it. But they will feel it — in the consistency, in the reliability, in the quiet absence of subtle wrongness. In the way the daily snapshot for Tuesday and Wednesday and Thursday feel like they were computed from the actual sky, not from whatever the browser happened to calculate in that session.

That quiet reliability is what care looks like when it is not performing.

---

## Proposals

**Proposal 1 — Server-Assembled Transit Prompts**

`handleTransitInterpretation` should stop accepting `{ systemPrompt: string }`. It should accept `{ transitPeriod, targetDate? }` for authenticated users and compute the prompt entirely server-side: the natal chart from stored birth data, the transits for the period, the aspects sorted and filtered by the same logic as the frontend, the element profile, the house context. The `buildTransitPrompt` function should be ported to `server/engine/` as part of the transit engine addition. The client can still build its own prompt for instantaneous display — but the server's computation is the one that actually reaches GPT.

**Proposal 2 — Server-Computed Daily Snapshot for Authenticated Users**

`handleDailySnapshot` should accept `{}` for authenticated users (no payload required) and compute the daily snapshot entirely server-side: current positions calculated with `calculateCurrentPositions`-equivalent server logic, aspects via `getActiveTransitAspects`, moon info via `getMoonInfo`, personal day via the server-side numerology port. The client-assembled prompt path can remain as a fallback for unauthenticated sessions. But authenticated users should receive readings the server knows are correct.

**Proposal 3 — Journal Annotation with Server-Side Transit Verification**

`handleJournalAnnotation` currently accepts `topTransits` from the client without question. It should optionally verify by computing `getActiveTransitAspects` for the entry's date server-side, and if the server-computed transits differ meaningfully from what the client sent, use the server's version. The verification should be lightweight — not a full engine call for every annotation — but the capability should exist. For authenticated users annotating historical entries, the server has birth data and the entry date; it has everything it needs.

**Proposal 4 — Explicit Loading State Language That Acknowledges the Person**

In `DailySnapshotCard.tsx`, the loading state says "Reading today's sky for your chart…" — this is fine. But the error state is a bare italic line. Error states across the reading surfaces should acknowledge the person: "The stars are momentarily quiet — try again in a moment" is one sentence that shows the product stayed present when something went wrong. This is a small change but it is the kind of small change that distinguishes a product that cares from a product that processes.

**Proposal 5 — No Silent Fallbacks Without Signal**

When the server falls back to a partial reading — when it computed the natal chart but could not compute transits, or when it served yesterday's cached snapshot because today's computation failed — the user should have a small, non-alarming signal. Not an error. A note. Something like "Computed from last available sky data." They do not need to understand what it means. But the product should not present a fallback reading with the same visual confidence as a reading it verified. That gap between what is displayed and what was computed is the gap between a product that shows care and a product that shows its work only to the people who already know what to look for.

---

## What This Sprint Could Be

There is a version of this product where every GPT reading that reaches a user was computed by a server that knows what it computed. Where the daily snapshot says "today Jupiter is sextile your natal Venus, orb 1.3°, applying" and the server that sent those words is the same authority that calculated those words. Where the journal annotation from three months ago reflects what the server computed was in the sky on that date, not what the browser happened to calculate in that session.

That version of the product respects the person using it. Not because they can tell the difference. Because the people who built it decided that being trustworthy mattered even when no one was watching.

The frontend will still run fast. The browser will still compute transits the moment the chart loads, before the server has time to respond. Nothing visible changes. The user experience stays instantaneous.

But behind the screen, there will be an authority that checked. That computed its own numbers. That can stand behind the words.

That is the soul infrastructure work earns.
