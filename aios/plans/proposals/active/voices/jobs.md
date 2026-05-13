# Steve Jobs — Sprint 7 Proposal Voice

Sprint 6 delivered the Cosmic Journal. The app now has a heartbeat — it accumulates meaning, not just readings. When the Pattern Panel has enough data to speak, the product becomes something genuinely different from every astrology app on earth.

But sprint 6 also surfaced the existential risk hidden inside everything we built: all of it lives in localStorage. One browser clear. One device switch. One user who finally gets passionate about the journal after 40 entries and then formats their laptop. Gone. That is not a storage problem. That is a product betrayal.

Sprint 7 fixes the betrayal. And I want to talk about exactly how to do it without creating a new one.

---

## The Only Thing That Matters in This Sprint

Here is the question I would ask every engineer on this team, every day of this sprint: **Does this make the user feel more trusted, or less?**

Adding authentication to a product is a minefield. Every authentication system ever built starts with the same good intention — "we need to save user data" — and ends with the same failures — "the user couldn't get in, lost their data, or never bothered to register because the wall felt too high." Those are not technical failures. They are failures of trust architecture.

This product has built something precious: it does not require a login. The user arrives, enters their birth data, and the cosmos opens. That experience is the foundation of everything. If we introduce authentication carelessly, we turn that arrival into an interrogation. The stars now want credentials.

We cannot do that.

---

## The Auth UX Must Feel Like Recognition, Not Registration

Every corporate app introduces a login modal the same way: "Create Account" at the top, white form fields, a password strength meter, a "By signing up you agree to our Terms of Service" paragraph in 9px gray text. That experience communicates: "You are a user to be managed."

A mystical astrology app must communicate something completely different: "We want to keep your story safe."

This distinction is not aesthetic. It changes every copy choice, every interaction, every flow.

When a user who has been using the app for two months — who has 30 journal entries, a full dream log, a birth chart they trust — first encounters the auth prompt, they should feel: "Yes. I want my data to live somewhere safer than my browser." They should not feel: "Here we go, another account to manage."

What this means concretely:

**The prompt in `CachedDataLanding` must be about the user's data, not about the app's features.** Not "Sign up to unlock cloud sync" — that is marketing language. The copy should be: "Save your journal to your account — it follows you across devices." The emphasis is on what they already have and what they might lose, not on what we're offering.

**The register/login modal must open like a chamber, not a drawer.** On a mystical dark app, a standard Bootstrap-style white modal with a login form is a complete tonal collapse. The modal background should be deep charcoal, the input borders should be gold at focus, the call-to-action should speak in the product's voice. "Begin ✦" or "Enter ✦" as the register button, not "Create Account."

**First-time registration should ask only for email and password.** Not name, not birthday (we already have it), not "how did you hear about us." Two fields. If we already know their name from the numerology `userName` field, prefill a greeting using it.

**The "Log In" vs "Register" distinction should be minimal.** A single toggle beneath the form fields: "First time? / Already have an account." Not two separate modals. One clean surface that transforms.

---

## The Unauthenticated Path: The Wall We Must Not Build

The sprint vision says "unauthenticated path stays intact." I agree — and I want to go further. The unauthenticated path must stay delightful, not just intact.

Here is the UX risk: the moment we add an auth prompt, human psychology shifts. Users who previously enjoyed the app without friction now feel they are missing something. The "Save to account ✦" prompt in `CachedDataLanding` must be additive and optional — it must not feel like a nag. This means:

One prompt. Not recurring. If the user dismisses it, it does not come back until they have meaningfully more data (say, 10 more journal entries). The app remembers the dismissal in localStorage. We do not guilt them every session.

The prompt's visual weight must be subordinate to the main actions. It should not compete with "Read My Chart ✦" or "Journal ✦" for attention. A single soft line at the bottom of the menu panel, not a banner, not a card, not a persistent footer. Something like: "✦ Save your chart to your account" rendered in `text-mystic-muted/50` — visible if you look, invisible if you don't.

Never gate any feature behind auth. The Cosmic Journal, the Dream Journal, transits, synastry — all of it remains accessible without a login. Auth is a preservation mechanism, not a feature gate.

---

## The Data Migration: The Moment of Welcome, Not of Warning

When a user logs in for the first time in a browser that has local data — journal entries, dream sessions, birth data — they will see a migration prompt. The sprint vision calls for an "Upload my existing data" flow.

This moment has the potential to be either profoundly welcoming or profoundly alarming. The difference is entirely in the language and design.

**What the alarming version looks like:** A modal that says "We found local data. Upload it to your account? [Upload] [Skip]." The word "upload" sounds technical. The word "Skip" sounds like you might lose something if you don't act. The user feels a low-grade panic.

**What the welcoming version looks like:** A warm, expansive surface — not a warning dialog — that says: "Your cosmic record is here — 30 journal entries, 12 dream sessions, your chart." Then: "We'll carry it to your account now." One action: "Bring it with me ✦." A secondary option, styled very quietly: "Start fresh instead." Nothing about HTTP calls, batch operations, or localStorage keys.

The words "upload" and "sync" should not appear in any user-facing copy. "Carry," "bring," "keep" — these are the words. They communicate continuity, not technical operations.

The migration must happen visibly but not anxiously. A simple progress note: "Carrying your journal..." with a slow celestial animation — the same spinning ✦ we use on the chart loading screen. Not a progress bar with percentages. Not a spinning loader. The same visual language the app already uses for moments of computation.

If the migration fails, the copy is important: "We couldn't reach the server — your data is still safe here." Not "Upload failed." Not "Error 503." The user should feel that nothing was lost, not that something broke.

---

## The Session Display: A Name, Not a Status Indicator

Once logged in, the app should acknowledge the user's presence in the header — but with extraordinary restraint. Not a user avatar, not a dropdown menu, not a "Signed in as user@email.com" line. A single small element: their first name (or the `userName` from numerology if available) and a gold ✦. Like a signature, not an account status.

Example: "Felipe ✦" rendered in `text-mystic-muted text-xs` at the top right of the header. Clicking it opens a minimal panel: "Sign Out" and nothing else for this sprint. No account settings, no email management, no password change. Those belong in a later sprint when we have a clear need.

This minimal presence communicates: "We know who you are, and we don't need to make a big deal of it."

---

## The CLEAR_CACHE Risk

The current `CLEAR_CACHE` action in `appState.ts` clears all localStorage data and resets the app to the empty form. When the user is authenticated, `CLEAR_CACHE` must also call the backend logout endpoint.

But there is a subtler UX risk here: the "Enter New Birth Data" button in `CachedDataLanding` currently destroys all the user's local data. If the user is authenticated, clicking this should ask what they want to do — clear the local device cache (while keeping server data), or actually start over with a new chart (which should prompt: "This will update your birth data on your account — are you sure?"). These are two completely different intentions hiding behind one button.

The authenticated and unauthenticated versions of "Enter New Birth Data" have different consequences and need different confirmation language.

---

## The FormWizard Completion: Silent Save

When an authenticated user completes the birth data form wizard and hits calculate, their birth data should be saved to their backend profile silently. No confirmation prompt, no "Saved ✦" toast. Just: we have it now. The same way a trusted bank saves your transaction without asking you to confirm the save operation.

The only exception: if the save fails due to network error, a single non-blocking notification — "Couldn't save to your account — local copy is safe." Then disappear after 4 seconds.

---

## What This Sprint Is Not About (But Someone Will Try)

**Social features.** Someone will want to add "who else has this placement" or "share your chart" once user accounts exist. Block it. Hard. Not this sprint, not the next sprint. The user data is private and the app's entire emotional proposition is personal.

**Profile editing.** The question will arise: "Now that we have accounts, can users edit their birth data from a settings page?" Not this sprint. Birth data is updated by re-entering it through the existing form wizard. Accounts are for data persistence, not for adding new management surfaces.

**Password reset.** The vision correctly defers this. Do not ship email delivery in sprint 7. But the "Forgot your password?" link must be present and must show a clear, honest message: "Password reset will be available soon — contact us at [email] if you need immediate help." No dead links. No empty states. An honest placeholder.

**Merging synastry partner data to the server.** This is a tempting scope addition. Partner birth data lives in localStorage too. Don't migrate it in sprint 7. The user's own data — journal, dreams, birth data — is the core. Partner data is temporary and session-specific by nature.

---

## Three Things This Sprint Must Absolutely Nail

**1. The transition from localStorage-world to server-world must be invisible to users who don't choose to authenticate.** Open the app, everything works, nothing changed, no prompts unless you have data to protect and you're paying attention to the soft prompt.

**2. The migration flow must complete without losing a single journal entry.** If one entry fails to upload, the entire migration should halt, report the partial state, and leave all local data intact. No "most of your data was saved" halfway states. All or nothing, with a safe fallback.

**3. The auth modals must not look like they were dropped in from a different product.** They must use the same dark background, gold focus states, serif heading font, and celestial copy voice as everything else in the app. If you open the modal and it looks like a SaaS login screen dropped into an astrology app, we have failed.

---

## Proposals

### Proposal 1 — feat: auth-modal-as-ceremony

**Type:** feat  
**Description:** The login/register modals (`LoginModal.tsx`, `RegisterModal.tsx`) should be designed as a single unified modal with a tab-toggle, not two separate components. They use the app's full dark-mystic theme — no white backgrounds, gold-accented focus rings, serif headings. Registration reads "Open Your Account ✦" as the heading, login reads "Return ✦". The submit button for registration says "Begin ✦", for login it says "Enter ✦". Password field shows a minimal gold eye-icon toggle for visibility. These words cost nothing to change and everything to get right.

---

### Proposal 2 — feat: migration-welcome-flow

**Type:** feat  
**Description:** The first-login migration experience in `authService.ts` should not be a warning dialog. It should surface as a warm "your record" panel that lists what's waiting to be carried over — entry count, dream session count, chart status — and uses celestial copy throughout. The action is "Bring it with me ✦", not "Upload". Progress uses the existing ✦ spinner, not a progress bar. Failure state says "Your data is still safe here" without technical jargon. If migration succeeds, localStorage is only cleared after HTTP 200/201 confirmations, never before.

---

### Proposal 3 — feat: unauthenticated-nudge-with-restraint

**Type:** feat  
**Description:** In `CachedDataLanding`, add a single soft auth prompt visible only to unauthenticated users who have meaningful data (journal entries > 0, or app usage > 7 days based on birth data creation date). The prompt is a single muted line at the bottom of the nav panel — below all the main action buttons — that reads "✦ Protect your cosmic record" and opens the register modal. It is dismissed persistently with a small ✕ and does not return until the user has logged 10 more journal entries. No banner, no modal, no floating CTA. The main experience is not interrupted.

---

### Proposal 4 — issue: clear-cache-auth-fork

**Type:** issue  
**Description:** The `CLEAR_CACHE` reducer action in `appState.ts` and the "Enter New Birth Data" button in `CachedDataLanding` must behave differently for authenticated vs unauthenticated users. Authenticated users should see a confirmation that distinguishes between "sign out and clear this device" (keeps server data) and "start over with new birth data" (updates account). The reducer must call the backend logout endpoint when authenticated. The current single-button behavior is a data-loss risk for logged-in users.

---

### Proposal 5 — feat: session-badge-not-account-menu

**Type:** feat  
**Description:** Once authenticated, display the user's first name (or `userName` from numerology if set) plus a ✦ in the app header as a small muted text element — not a menu, not an avatar, not a dropdown. Clicking it shows a minimal inline panel with only "Sign Out" for this sprint. The presence should feel like a quiet signature, not an account management surface. Styled in `text-mystic-muted text-xs`, positioned at the top-right of the header alongside the existing "Astral Chart" title.

---

### Proposal 6 — code: authService-offline-fallback

**Type:** code  
**Description:** All API calls in `authService.ts` must implement a 5-second timeout with an `AbortController` and fall back to the localStorage path on timeout or network error. The error should dispatch a `SET_NETWORK_WARNING` action (analogous to `SET_STORAGE_WARNING` introduced in sprint 6) that renders a soft, dismissible banner: "Could not reach the server — your data is safe locally." The app must never hang or show a spinning state indefinitely due to backend unreachability. Every API call is wrapped, every failure is caught, every fallback is the unauth path.

---

### Proposal 7 — code: formwizard-silent-profile-save

**Type:** code  
**Description:** In `FormWizard.tsx`, on the final step completion (when `SET_VIEW loading` is dispatched), if an `authUser` is present in context, silently POST the birth data to `/api/profile` via `authService.ts`. No confirmation dialog, no success toast on the happy path. On failure: a single non-blocking 4-second notification rendered via the existing `StorageWarningBanner` infrastructure: "Couldn't save to your account — local copy is safe." This keeps the form wizard's existing UX intact while adding server persistence as a transparent layer.

---

## What Success Looks Like

Sprint 7 succeeds when a user who has been journaling for two months can log into the app on a new laptop and see all 40 of their entries waiting. When that moment happens, the product graduates from a clever browser tool to something they would pay to keep.

That moment cannot be earned with engineering alone. Every interaction between now and that moment — the first time they see the auth prompt, the migration flow, the session badge — must build trust incrementally. If any one of those interactions feels corporate or clinical, we have broken the spell that the app has spent six sprints casting.

The one-sentence story of this sprint: **Your story is safe now.**

Everything else is in service of making the user feel that, and believe it.
