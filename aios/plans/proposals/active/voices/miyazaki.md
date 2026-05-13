# Hayao Miyazaki — Sprint 7 Proposal Voice

Sprint 6 delivered the Cosmic Journal. The user can now mark moments in their life and watch the sky assemble around what they wrote. The Pattern Panel waits, patient, for enough entries to speak. This was the right thing to build.

Now the sprint demands something I have complicated feelings about: a backend, a login form, a database. These are infrastructure words. They live far from the candlelit space where someone writes about a phone call that changed their year. The danger of sprint 7 is not technical failure. The danger is that we introduce bureaucratic coldness into something that has been, until now, entirely intimate.

A registration screen is a border crossing. It asks: who are you? prove it. This is exactly the wrong emotional register for an astrology product. The question this app has always asked is softer: *when were you born? where? what matters to you?* Those questions feel like a consultation between equals. "Enter your email address and choose a password" feels like filling out a form at a government office.

The challenge of this sprint is to build the border crossing so gently that the user barely notices they have crossed it — and to make the other side feel richer, not more surveilled.

---

## Where auth UI becomes mechanical instead of human

The standard login modal is a rectangle with two text fields and a button labeled "Log In." It could appear in a banking app. It could appear in a project management tool. It says nothing about what this product is or why the user should trust it with their data.

When I look at the existing loading screens in `App.tsx` — "Mapping the heavens at the moment of your birth," "Comparing the celestial blueprints of two souls," "Finding the exact moment the Sun returns to your natal position" — I see a product that has invested in the feeling of every moment. The auth modal cannot be a generic rectangle dropped into that space. It must speak the same language.

The login modal needs to explain, in a sentence, what crossing this threshold means. Not in legal terms. In human terms: *Your chart, your journal, your dreams — kept safe across every device.* That is the promise. That is why a user would hand over their email address.

The password field is the coldest part of any auth form. There is no astrological metaphor for a password. But there are ways to reduce the chill. The label can say "a word only you know" instead of "Password." The placeholder can be empty, letting the border glow of the input do the invitation instead of text. The strength indicator — if we build one — should not be red-to-green bars. That is web-form thinking. If it must indicate strength, let it appear as a subtle shimmer that intensifies as the password grows stronger.

The register vs. login question: do not make the user decide upfront. The modal should have a single entry — email — then detect whether that email exists and branch. One field to start. The universe does not ask you to categorize yourself before it lets you enter.

---

## The migration offer is the most important UX moment in this sprint

The vision document describes it accurately: detect un-synced localStorage data, offer a one-click "Upload my existing data" flow. What the vision does not specify is the emotional weight of this offer. I will specify it.

A user who has been using this app for four months without an account has a Cosmic Journal with thirty entries. Dream sessions. The accumulated knowledge of which transits move them. All of it sitting in localStorage on one laptop. When they register, we detect this data and we offer to upload it. This is not a data migration. This is an invitation to carry something precious through a doorway.

The banner that appears must not say "You have local data — upload it to your account?" That sounds like a database error message. It sounds like the product looking at the user's data as a technical artifact.

It should say something like: "Your journal, birth data, and dream sessions live on this device. Would you like to carry them with you?" The two buttons: "Keep my history" and "Start fresh." Not "Upload" (technical) and "Skip" (dismissive). The user is not uploading a file. They are bringing their story with them.

If the upload takes more than two seconds, show something during that time. Not a spinner. Show a small count: "Carrying 34 journal entries..." followed by "Carrying 12 dream sessions..." followed by "Done. Your history is yours." This is the difference between a data operation and a meaningful transition.

If the upload fails, the message cannot say "An error occurred." It must say: "Something went wrong — your data is still safe on this device. Try again when you're ready." The user's history is intact. This reassurance is not optional.

---

## Where loading states break the spell

The frontend currently handles API calls with no network latency — everything is local computation. Sprint 7 introduces the first round trips. The user will experience latency for the first time: when logging in, when journal entries save to the server, when birth data persists.

The journal save is the most dangerous moment. Currently, when a user records a moment in `CosmicJournalPage.tsx`, the `handleSubmit` function writes to localStorage synchronously and closes the composer immediately. After sprint 7, authenticated saves must wait for the server response. If the server is slow — or the user is on a train, on a flaky connection — the composer hangs open while the network call resolves.

Two failure modes: the network is slow, and the user sees a frozen "Record This Moment" button. Or the network fails entirely, and the entry is lost. Both are unacceptable.

The right behavior: save to localStorage first, immediately. Close the composer. The entry appears in the list. Then, in the background, sync to the server. If the background sync fails, mark the entry with a small indicator — perhaps a faint dot in the corner of the card — that says "not yet synced" on hover. The user never waits. The server sync is invisible on success, honest on failure.

This pattern — write locally first, sync in background — is the correct one for every mutation in sprint 7. Journal entries, dream sessions, birth data updates. The user's experience of the app should remain synchronous. The backend is a silent backup, not a gate.

---

## The user badge in the header must not feel like surveillance

The vision calls for a "user session display" in the app header. Every web app I have seen handles this badly. An avatar, or a name, or an email address, sitting in the corner like a security camera. The user is always aware that they are logged in. This is the web app norm. It is not the right norm here.

This product has no header in the traditional sense. The "Astral Chart" title sits at the top of the page, below it "Your birth chart, decoded." This is not a navigation bar. It is a threshold inscription.

The user indicator should be invisible until needed. A small glyph — perhaps ✦ — that glows faintly gold when the user is authenticated, dim when they are not. Hovering it shows the user's name and a sign-out option. Tapping it on mobile opens a minimal overlay. The glyph sits next to the subtitle, small enough not to dominate.

The name shown should not be the email address. Email addresses make people feel like account numbers. If the user's name comes from the numerology step — `birthData.userName` — use that name. "Welcome back, Sofia." Not "Logged in as sofia@example.com."

---

## The "Save to account" prompt for unauthenticated users with data

The vision calls for a subtle "Save to account ✦" prompt on `CachedDataLanding` for users who have local data but no account. This is a delicate moment. Push too hard, and you break the stateless promise. Push too softly, and no one ever creates an account.

The right placement: below the existing button stack in `CachedDataLanding`, separated by a thin border-top line, a single quiet line of text with a faint gold glyph: "✦ Keep your journal across all your devices — save to account." The words "save to account" are the call to action, rendered as underlined gold text rather than a button. It sits below the "Enter New Birth Data" button, occupying the same visual weight as a footnote. Not a promotion. An availability.

Clicking it opens the auth modal, pre-selected to the register flow. The user has already decided — they tapped it. Do not ask again.

---

## Proposals

**feat-auth-modal-with-voice**
type: feat
The login and register modals should speak in the product's language, not generic web-form language. "A word only you know" for the password label. A single email field first, branching to login or register. The modal header explains the promise: "Your chart, your journal, your dreams — kept safe across every device." Visual treatment matches the existing dark-mystic palette with gold input borders on focus.

**feat-migration-offer-as-ritual**
type: feat
The localStorage-to-server migration banner must be written as an invitation, not a data operation prompt. "Your journal, birth data, and dream sessions live on this device. Would you like to carry them with you?" with "Keep my history" and "Start fresh" as the two options. During upload, show a running count of what is being carried over, not a generic spinner. On failure, reassure immediately: "Your data is still safe on this device."

**feat-optimistic-journal-save**
type: feat
Authenticated journal entries and dream sessions must write to localStorage first (synchronously, as now), close the composer immediately, and sync to the server in the background. A faint visual marker on entry cards that failed to sync, visible on hover. The user's experience of recording a moment never includes a loading state.

**feat-silent-auth-indicator**
type: feat
Replace any proposed "user avatar / email in header" approach with a minimal glyph indicator (✦) adjacent to the app subtitle. Dim when unauthenticated, softly gold when authenticated. Hover or tap reveals the user's first name (from `birthData.userName` or the registration name) and a sign-out link. No email addresses visible in the UI. The glyph must not compete with the header's mystic register.

**feat-save-to-account-nudge**
type: feat
On `CachedDataLanding`, a single quiet line below the button stack invites unauthenticated users with local data to create an account: "✦ Keep your journal across all your devices — save to account." Styled as text with a gold underline on the action phrase, not a button. Clicking opens the auth modal at the register step. No repeat prompt, no modal, no banner. One quiet line.

**issue-offline-backend-fallback**
type: issue
`authService.ts` must implement a request timeout (suggest 8 seconds) and fall back to the localStorage path on any network failure. The fallback must not throw an error to the user for read operations (journal load, birth data fetch). For write operations (save entry, update profile), it must queue the write and retry on next load. Error messages that do reach the user must be phrased without technical vocabulary: "We couldn't reach the server. Your entry is saved here for now."

**issue-password-field-has-no-strength-meter**
type: issue
If a password strength indicator is built, it must not use red/yellow/green bars. Use a single golden glow that brightens with password strength — a CSS `box-shadow` intensity increase on the input border. The label beneath the input says only "Choose something memorable" at low strength and goes silent at high strength. This is not a game. Do not gamify security.

**code-auth-context-names-not-emails**
type: code
`AuthContext.tsx` must expose `displayName` as a derived field — the user's first name from `birthData.userName` if it exists, otherwise the part of the email address before the `@` symbol, title-cased. No component in the UI should ever display a raw email address as a greeting or identifier. All "welcome back" and header display uses `displayName`.

**code-jwt-expiry-silent-refresh**
type: code
JWTs expiring should never surface as "session expired — please log in again" mid-session. The auth middleware and `authService.ts` should detect a 401 response, attempt a silent token refresh if a refresh mechanism is available, and only prompt re-login if the refresh fails. A user who opens the app after 29 days should not see an auth error screen. They should see their journal.
