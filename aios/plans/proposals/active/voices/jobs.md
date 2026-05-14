# Steve Jobs — Voice Analysis: Sprint 0009

Sprint 0008 delivered what I asked for. The home screen is a dashboard now. The split-render pattern is in. The GptSkeleton shimmer communicates "the stars are thinking" instead of "please wait for our server." Those were the right moves.

Now we are building the monetization layer — subscriptions, Stripe, OAuth, funnel analytics. I have used the product. I have read the code. Here is my assessment.

---

## The Core Experience Problem for This Sprint

This sprint has one job that matters above everything else: make the moment of hitting your reading limit feel like an invitation, not a wall.

Right now, `gptErrors.ts` defines what happens when a user is rate-limited:

```
GPT_RATE_LIMIT_UNAUTH = 'Daily reading limit reached — try again tomorrow. ✦ Sign up for a free account to get 20 readings per day.'
```

That string is rendered somewhere in the reading result, inside the existing content. There is no modal. There is no conversion moment. There is no sense that something specific happened and here is what you can do about it. There is a sentence of text, inline, where the interpretation would have been.

The user consumed their three free readings. The product's response is: "try again tomorrow." That is it. We are sending someone away who just demonstrated that they find value in this product — they hit their limit, which means they used it. That is the highest-signal moment in the entire funnel. And the current product treats it as a technical constraint rather than a conversation.

This sprint has to change that. The UpgradeModal is not a payment screen. It is the most important piece of product writing we will ship this sprint.

---

## The Emotional Story: Free to Paid

Let me walk through what this should feel like.

**Day one, anonymous.** A user finds the product. They enter their birth details. They get their natal chart. Beautiful. They come back for a daily reading. They come back again. On their third reading that day, the sky pauses. Not an error — a pause. The screen they are on is still there (because of the split-render pattern we already shipped). The interpretation slot, instead of the GptSkeleton shimmer, shows something different. Something warmer.

**The moment of invitation.** The UpgradeModal appears. Not filling the screen with desperation. A centered panel, the same dark-mystic material as everything else in the product. The heading does not say "You've hit your limit." It says something like "Your readings are waiting." Or "The stars have more to say." It acknowledges what just happened, but it frames it as abundance beyond the threshold — not as a wall the user crashed into.

Below the heading, the three tiers are laid out simply. Not a feature comparison table. Not a grid of checkboxes. Three named paths with a short description of what each unlocks. The current tier the user is on — free, three readings per day — is visible, so they understand where they are. The basic tier is presented with a specific number (20 readings per day) that feels generous against the three they just exhausted. The advanced tier exists for the person who wants to go deep: 100 readings plus the cross-time journal patterns that reveal how your chart has responded to life over months.

The CTA for the primary tier is a single gold button. It goes directly to Stripe Checkout. Not a summary page. Not a confirmation. Stripe Checkout. One click, credit card, back in the app with their limit elevated — the server tier update fires through the webhook before the user can close the browser tab.

**After payment.** They return to the reading they were trying to make. The interpretation slot populates. No re-entry of birth data. No logging in again. The conversation continues from exactly where it paused.

That is the experience. Every technical decision in the sprint spec should be evaluated against whether it supports or degrades this arc.

---

## What Is Mediocre That Should Be Delightful

### 1. The "Save your readings ✦" nudge on the home screen

In `HomeScreen.tsx`, the unauthenticated nudge currently reads: `"Save your readings ✦"`. It is a small text link. It is correct. It is functional.

But here is what it does not do: it does not tell the user *what they would lose if they do not save*. The phrase "Save your readings" implies the user has things to lose. But a user who just arrived has nothing yet. The nudge fires too early, before the user has accumulated meaning, and the copy does not differentiate between "you have four journal entries at risk" and "you are a brand new user with nothing at stake."

Sprint 0009 introduces tier-awareness into `AuthContext`. The home screen now has the information to make this nudge contextual. For a free user who has consumed 2 of 3 daily readings, the nudge should change. It should say something about that. Not an alert. Not a banner. Just a slightly different message in the same quiet style.

The file to change: `src/components/home/HomeScreen.tsx`. The nudge section (around line 108-117) needs to become tier and usage-aware rather than auth-state-only.

### 2. The auth modal has no social option, and that gap is loud

`src/components/auth/AuthModal.tsx` is well-designed. The voice is right, the fields are right, the submit copy ("Enter ✦", "Begin ✦") is exactly the product's register.

But when a user is standing at that modal — prompted because they hit their reading limit and the UpgradeModal told them to sign up first — they are in a state of motivation. They want to continue. The last thing we should do is make them invent a password.

"Continue with Google" needs to be the first thing they see, not an afterthought below the form. The OAuth buttons need to be at the top of the modal, separated by a gentle divider ("or continue with email" below), and they need to complete the auth flow in one step: click Google, select account, back in the app. The email/password form stays — but it becomes the secondary path, not the primary one.

The implementation is in `server/routes/oauth.ts` (new, per the sprint spec) and `src/components/auth/AuthModal.tsx`. But the design decision is: Google first, email second. Not the other way around.

### 3. The UpgradeModal does not exist yet — and the shape of it matters

The sprint spec calls for `src/components/subscription/UpgradeModal.tsx`. The spec says it presents the three tiers. But I want to be specific about what "present three tiers" means in this product's voice.

It does not mean a SaaS pricing table. It does not mean a three-column grid with checkmarks. It means three short prose descriptions, written in the product's voice:

- **Free** — "Three readings per day. Your birth chart, your transits, the basics. No cost, no card."
- **Basic** — "Twenty readings per day. Enough to explore every corner of your chart across a full day's reflection. [price/month]"
- **Advanced** — "A hundred readings per day, plus the ability to read patterns across your journal over time — how your chart expressed itself during a difficult month, a good year, a transition. [price/month]"

The pricing copy is doing two things simultaneously: explaining the limit and explaining the value. "A hundred readings per day" is the feature. "How your chart expressed itself during a difficult month" is why someone would want it. Those are different things and both need to be in the copy.

The upgrade CTA for the recommended tier (basic, in most cases) should be the only primary button on the modal. The advanced tier gets a secondary button. Free is the current state and gets a link-style "continue with free" that closes the modal.

The `resetAt` field from the 429 response — which the sprint spec says to carry through `gptErrors.ts` — should appear on the modal for free users who are not converting: "Your three readings reset at midnight UTC." That information turns the wall into a schedule.

### 4. The funnel events need to be experience-led, not engineering-led

The sprint spec lists these events for `src/services/analytics.ts`:
`page_view, form_started, form_completed, reading_viewed, gpt_request_made, gpt_limit_hit, upgrade_modal_shown, checkout_started, signup_completed, login_completed`

These are correct but incomplete from an experience standpoint. The events that matter most for understanding whether the product is working are not the completion events — they are the decision events that happen *before* any conversion:

- **`reading_depth`** — not just that a reading was viewed, but how far the user scrolled, or which sections they expanded. A user who expands four collapse sections has more intent than one who sees the page and bounces.
- **`upgrade_modal_dismissed`** — the modal shown event is useful. The dismissed event tells you whether the modal content is working or not. If 90% of people dismiss immediately, the copy is wrong.
- **`upgrade_modal_tier_hovered`** — did the user read the basic tier description or the advanced tier description before dismissing? This tells you which offer is resonating.
- **`auth_nudge_clicked`** vs. **`auth_nudge_seen`** — the nudge visibility event (fire when the nudge becomes visible in the viewport) vs. the click event gives a real click-through rate.
- **`gpt_limit_hit_position`** — which reading type was the user attempting when they hit the limit? If 60% of limit-hits happen on daily transit readings, that changes the upgrade modal copy (emphasize the transit value).

The events that go into SQLite are cheap to add. The cost is in not having them when you need them. Add the ones that map to the key decisions a user makes between arriving and paying.

### 5. The header's `SessionBadge` needs a tier indicator

In `src/App.tsx`, the `SessionBadge` component shows the authenticated user a gold `✦` that opens a dropdown with their display name and "Sign Out." That is correct and minimal.

But for sprint 0009, the authenticated user now has a tier. A free-tier user and a basic-tier user are in fundamentally different states. The header badge is the one persistent surface across all screens. For a free user, it is the right place to surface their remaining daily readings — quietly, not anxiously. Something like "3 readings left today" as a small muted line in the dropdown. Not a progress bar. Not a warning. Just a fact.

For a basic or advanced user, the dropdown simply shows their tier name. "Basic ✦" or "Advanced ✦" as a tiny badge next to their display name. This communicates that the tier is real, that the upgrade they paid for is acknowledged, and that the product knows who they are.

The change is small — the `SessionBadge` in `src/App.tsx` (lines 30-113) needs access to `tier` from `AuthContext`, and the dropdown panel (lines 85-110) needs a short additional line.

---

## What Should Be Killed

### Kill: the existing `gptErrors.ts` inline error strings as the conversion surface

`GPT_RATE_LIMIT_UNAUTH` rendered inside the reading as a string is the wrong surface for a conversion moment. It is currently the only thing a user sees when they hit their limit. This string should be replaced — not supplemented, replaced — by the UpgradeModal appearing. The string can remain in the codebase as a fallback for server error scenarios, but the rate limit hit on the client should trigger a modal, not an inline message.

The change is in how `gptInterpretation.ts` (the client service) handles the 429 response from the server. Instead of returning the error string as the "interpretation", it should signal to whatever screen is displaying it that the upgrade modal should open. The exact mechanism — a thrown error type, a returned sentinel, a callback — is an implementation detail. But the UX result must be: modal appears, not text in the reading slot.

### Kill: the generic "Consulting the stars..." copy during tier-change pending states

When a user pays via Stripe and returns to the app, there is a moment — the webhook fires, the server updates their tier, the client re-fetches `/api/auth/me` — where the app may briefly show the old free-tier state. If that moment happens while the user is looking at a GptSkeleton, the ambient copy should not be the standard "consulting the stars" phrase. It should acknowledge the transition: something like "Updating your account..." — a different shimmer state that knows what is actually happening. This is a small detail but it is the difference between a product that tracks its state and one that treats all waiting as identical.

### Kill: placing the OAuth buttons below the email form

As noted above, if Google/Facebook sign-in ends up below the email/password form, it will never be used. The conversion moment — limit hit, user motivated, they open auth modal — must have zero friction. Google OAuth is zero friction. An email address and a 12-character password are ten frictions. The OAuth buttons go at the top.

---

## The Upgrade Modal: Design Specifics

I want to be concrete about `src/components/subscription/UpgradeModal.tsx` because generic "show the tiers" is not enough direction.

**Trigger**: the 429 response from the GPT endpoint fires this modal. It also fires when a user attempts to access a journal pattern analysis (`type === 'cosmic-pattern-reading'`) on a free or basic tier.

**Context awareness**: the modal knows the current tier (from `AuthContext.tier`) and the `resetAt` timestamp from the 429 payload (from `gptErrors.ts` extended per the sprint spec). It uses both.

**Heading**: not "Upgrade" (that is a transaction word). Something that begins with value:
- For unauthenticated users who hit IP-based limits: "Three free readings per day. You've used yours." — direct, honest.
- For free authenticated users: "Your three readings for today have ended." with the reset time below.
- For basic users attempting advanced features: "This reading requires the Advanced tier."

**Tier descriptions**: prose, not tables. Three sections, vertically stacked, each with a visual indicator of whether it is the current tier, available, or selected. The current tier has a subtle "you are here" marker.

**The CTA**: "Start Basic — $[price]/month" or "Start Advanced — $[price]/month". The button calls `POST /api/stripe/create-checkout-session` and redirects. No confirmation dialog. No "are you sure?" The user just decided.

**For unauthenticated users**: the CTA path is different — it should open the auth modal first, *then* continue to checkout. The experience must remember which tier the user was trying to access. This is a small but important detail: if the user signs up, they should land at the checkout for the tier they intended, not back at a blank upgrade modal.

**Visual language**: the modal must use the product's established palette (the same `linear-gradient(160deg, rgba(22,16,8,0.98)...)` treatment as `AuthModal` and `ReadingsModal`). The three tiers should not look like a pricing page from a startup landing page. They should look like they were designed for this product. Gold accents. Serif font for the tier names. Muted descriptive text in the body font.

---

## The OAuth Placement Decision

The sprint spec says: "add 'Continue with Google' and 'Continue with Facebook' buttons below the email/password form." I am changing that requirement.

They go above. Here is why:

When the auth modal opens — whether triggered by the "Save your readings ✦" nudge, the UpgradeModal conversion path, or the header badge — the user is in one of two states: motivated to act quickly (post-limit-hit) or curious (browsing, not urgent). In the first state, friction is fatal. In the second state, friction is tolerable.

We should optimize for the first state because that is where most conversions happen. A motivated user sees "Continue with Google", clicks it, is back in the app in three seconds. That is the path we want.

The email form stays below a divider: "or continue with email ——". It is not hidden. It is not deprecated. It is the secondary path for users who prefer it or who do not have a Google/Facebook account.

One more thing: the Facebook button. It is in the spec and I understand why — the audience for an astrology product skews toward platforms where Facebook remains active. But Facebook's OAuth flow has historically been less smooth than Google's. If we ship both, we ship them with equal visual weight. If we must prioritize one, prioritize Google. The decision to include Facebook should be based on the actual user demographics of this product once we have funnel data — not on the assumption that both are equally valuable.

---

## Funnel Metrics: What I'd Watch First

The sprint builds the analytics infrastructure. For the first month after launch, I would watch five numbers above everything else:

1. **Free-to-registered conversion rate**: of all users who hit their 3-reading limit, what percentage opened the auth modal? This tells you whether the UpgradeModal is working as an auth conversion surface.

2. **Registered-to-paid conversion rate**: of all authenticated free-tier users who hit their 20-reading limit, what percentage started a Stripe checkout? This tells you whether the paid upgrade messaging is working.

3. **Checkout completion rate**: of all users who hit the Stripe checkout URL, what percentage completed payment? This tells you if Stripe is working and if the price point is right.

4. **Day-7 return rate**: of all users who completed a reading on day 1, what percentage came back on day 7 or later? This tells you whether the product has habit-forming properties — the most important signal for an astrology product that aims to build a daily practice.

5. **Feature depth per session**: average number of distinct reading types accessed per session for authenticated users. A user who only ever does daily transit readings is different from a user who explores synastry, journal, and numerology. The second user has much higher lifetime value and should be understood differently.

The `events` table in SQLite needs to capture enough data to answer these five questions. The `session_id` cookie is critical for questions 1 and 3 — you need to connect the pre-auth session (limit hit) to the post-auth session (checkout) to measure conversion through the funnel.

---

## What This Sprint Succeeds At, If Done Right

This sprint is shipping the hardest thing in any consumer product: the moment of asking for money. Every product does this wrong at first. The wrong versions are: a banner that appears everywhere, a paywall that blocks content without context, a checkout flow that feels unrelated to the product experience.

The right version — for this product — is a single modal that feels like the product itself, appears exactly once (at the right moment), speaks in the product's voice, and makes the path from "I want to continue" to "I paid" take fewer than three interactions. That is it. That is the entire design goal.

If the UpgradeModal reads like a SaaS product page, we failed. If it reads like something the stars themselves might say about the nature of abundance and what lies beyond the threshold — and then offers you a practical way through — we have something worth showing to a friend.

The product has earned this moment. Seven sprints of real astronomy, real AI interpretation, and a UI that treats users like they are engaging with something meaningful. This sprint should close the loop on that arc: the product that respects you enough to ask, clearly, for what it needs to keep running — and makes saying yes feel like the obvious next step.
