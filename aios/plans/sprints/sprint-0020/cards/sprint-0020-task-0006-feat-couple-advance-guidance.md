# Proposal: Couple Advance Guidance Field

**Type:** Feature
**Originated by:** Jobs, Miyazaki

---

## Problem / Opportunity

The `CoupleAdvanceTab` banner is structurally one feature version behind `AdvanceTab`. Two specific deficits exist today and both are visible to any user who experiences both individual and couple advance.

**Deficit 1 — No guidance paragraph.**
The `SnapshotScore` type defines `guidance?: string` (line 26 of `AdvanceTab.tsx`). `AdvanceTab` populates and renders it as a second paragraph in the banner block (lines 1516–1520), styled `text-xs text-mystic-muted/80 mt-1.5 font-light leading-relaxed`. `CoupleAdvanceTab`'s three builder functions — `buildCouplePowerReason` (line 44), `buildCoupleAspectReason` (line 57), `buildCoupleShiftReason` (line 79) — all return `string`, not the richer `{ reason: string; bannerBoldFragment: string; guidance?: string }` object that `buildPowerReason` and `buildAspectReason` in `AdvanceTab` return. The `guidance` field is never set in any couple snapshot score. The banner block in `CoupleAdvanceTab` has a single `<p>` element for the reason (line 669–680) and no guidance paragraph at all.

The guidance paragraph is what transforms the banner from an observation into a prompt. Without it, the couple advance banner says what the sky is doing but not what two people can do with that information. The feature is half-complete.

**Deficit 2 — Bold fragment is accidental.**
The `CoupleAdvanceTab` banner bolds the first word of the reason string using `categoryBanner.split(' ')[0]` (line 678). `AdvanceTab` replaced this with `bannerBoldFragment` — an explicit token set by the reason builder — in sprint-0019 (line 1513). The couple tab's three builders never return `bannerBoldFragment`. The first-word approach works by accident for most current reason strings because the transit planet name opens the sentence. But:
- `buildCoupleAspectReason`'s fallback else branch (line 65) can produce `"the relationship's ..."`, bolding `"the"`.
- Any future reason string restructuring (e.g., adding a co-shift suffix at the front) would silently break the bold heading.
The `bannerBoldFragment` field must be set explicitly by all three builders so bolding is correct by design, not by coincidence.

**Why the guidance must be relationship-native, not rephrased individual guidance.**
The existing `ASPECT_GUIDANCE` table in `AdvanceTab.tsx` (lines 254–278) addresses one person: "Face the pattern directly rather than managing around it." If those strings were copied into the couple advance banner with "your" replaced by "the relationship's," they would read as machine-generated rather than written. The couple advance guidance must be built from a distinct vocabulary that treats two people as the subject. The guidance for Saturn pressing on composite Moon is not "face the emotional pattern" — it is something about how this couple, together, holds and processes difficulty. The composite planet archetypes in `COMPOSITE_PLANET_PHRASES` (lines 28–40 of `CoupleAdvanceTab.tsx`) already define relationship-native language. The guidance sentences must come from that same register.

---

## Vision

When two people open the couple advance strip and navigate to a marker, they read a banner with two layers: a reason sentence that names what the sky is doing to their relationship, and a guidance sentence that addresses both of them about what to do with it.

The guidance sentence is the product's voice speaking to the couple, not to either individual. It uses "you two," "together," "between you," "the two of you" — relational pronouns that make the sentence land as written for them. When Saturn presses on the composite Moon in a challenging window, the guidance might say: "This is a window to talk about what has gone unspoken between you — the emotional patterns the bond carries are being surfaced, and they're easier to work with if named than if managed around." Two people reading that together will feel the product knows something about how they function as a unit.

The banner bold heading works correctly in all cases because every builder returns an explicit `bannerBoldFragment` set to the transit planet name — not whatever word happens to open the sentence.

The result: the couple advance tab feels as fully realized as the individual advance tab already does, and a couple navigating to a power moment in a future month reads a banner that could move them to share it with each other.

---

## Specifications

### 1. Builder Return Type

1.1. All three builder functions — `buildCouplePowerReason`, `buildCoupleAspectReason`, `buildCoupleShiftReason` — must change their return type from `string` to `{ reason: string; bannerBoldFragment: string; guidance?: string }`.

1.2. `bannerBoldFragment` must be set to the transit planet name in all cases. For `buildCouplePowerReason` and `buildCoupleShiftReason`, this is the `planet` argument. For `buildCoupleAspectReason`, this is `tightest.transitPlanet`.

1.3. `guidance` must be returned for all cases where a recognizable composite planet phrase exists. Cases that fall through to the fallback else branch (unrecognized natal planet) may return `guidance: undefined`, but this should be treated as a debt item and logged internally so coverage can be extended.

### 2. `scoreCoupleSnapshot` Call Sites

2.1. All three call sites in `scoreCoupleSnapshot` that call a builder must destructure the return value and pass `reason`, `bannerBoldFragment`, and `guidance` into the `SnapshotScore` they return:

- Line 152: `buildCouplePowerReason` return
- Line 197: `buildCoupleAspectReason` return (shift co-occur case)
- Line 214: pure shift returning from `buildCoupleShiftReason`
- Line 236: `buildCoupleAspectReason` return (Priority 3 favorable)
- Line 261: `buildCoupleAspectReason` return (Priority 4 challenging)

2.2. Each `return { ... }` in `scoreCoupleSnapshot` that creates a non-neutral score must include `bannerBoldFragment` and `guidance` (when present) alongside `reason`.

2.3. The neutral score at line 98 and the `return neutral` at line 275 require no change — `bannerBoldFragment` and `guidance` are optional on `SnapshotScore`.

### 3. Guidance Content for `buildCouplePowerReason`

3.1. A new lookup table `COUPLE_POWER_PHRASES` must be added, keyed as `"${planet}|${aspectType}|${angleKey}"`, mirroring the structure of `POWER_DAY_PHRASES` in `AdvanceTab.tsx` but with relationship-native language.

3.2. Coverage requirement — at minimum the following 14 keys must have entries (same planet/aspect combinations as the most-used entries in `POWER_DAY_PHRASES`):

| Key | Reason | Guidance |
|-----|--------|----------|
| `Saturn\|conjunction\|ASC` | "Saturn arrives at the relationship's Ascendant — how this bond presents itself to the world is being restructured." | "This is a window to talk together about how you show up as a couple — what has felt automatic about the way you move through the world together is being asked to become more intentional." |
| `Saturn\|conjunction\|MC` | "Saturn reaches the relationship's Midheaven — a significant moment for the shared direction this bond has been building toward." | "Sit with what you are actually building together — the ambitions and public commitments the relationship has been carrying deserve an honest conversation now." |
| `Saturn\|opposition\|ASC` | "Saturn pressing opposite the relationship's Ascendant — external structures and others' perceptions are testing the bond's foundations." | "What others are reflecting about this relationship carries useful information — this is a window to decide together what to keep and what to let go." |
| `Saturn\|square\|ASC` | "Saturn pressing on the relationship's Ascendant axis — the way this couple moves through the world is under significant pressure." | "Don't try to manage around what is being stressed — naming what is hard between you is more productive than finding ways to look fine." |
| `Saturn\|square\|MC` | "Saturn pressing on the relationship's Midheaven — the shared structures and long-term commitments of this bond are being stress-tested." | "Take the audit seriously together — what is working in the structures you share and what isn't is clearer now than it normally is." |
| `Saturn\|trine\|ASC` | "Saturn supporting the relationship's Ascendant — the work done together on how this couple shows up is producing durable results." | "This is a window to take the next step in how you present yourselves to the world together — the groundwork is ready to support it." |
| `Saturn\|trine\|MC` | "Saturn supporting the relationship's Midheaven — the shared direction and commitments this bond has invested in are crystallizing into something real." | "Commit to the joint goal or shared structure you have been building toward — the conditions are favorable for making it official." |
| `Jupiter\|conjunction\|ASC` | "Jupiter arrives at the relationship's Ascendant — a significant expansion of how this bond presents itself and is received by the world." | "Step into more visible territory together — this is one of the better windows in the year for the two of you to be seen and recognized as a unit." |
| `Jupiter\|conjunction\|MC` | "Jupiter reaches the relationship's Midheaven — a notable expansion of shared ambition, recognition, and the public chapter this bond is entering." | "Say yes to the shared opportunity — whether it is a public step, a joint commitment, or a shared project, the conditions are genuinely open right now." |
| `Jupiter\|trine\|ASC` | "Jupiter supporting the relationship's Ascendant — expansion of how the two of you show up together is available with unusual ease." | "Let the relationship take up more space in the world — the ease available now is genuine and the window won't stay this wide." |
| `Jupiter\|trine\|MC` | "Jupiter supporting the relationship's Midheaven — shared career, public presence, or joint ambition is available to grow without unusual resistance." | "Advance the shared goal you have been holding back together — the timing is right and the conditions support it." |
| `Pluto\|conjunction\|ASC` | "Pluto arrives at the relationship's Ascendant — a fundamental, irreversible transformation of how this bond presents itself and moves through the world." | "Go toward the transformation together rather than managing it separately — what changes about how you show up as a couple is pointing toward something more authentic." |
| `Pluto\|square\|ASC` | "Pluto pressing on the relationship's Ascendant — the identity this couple has carried into the world is being stripped and rebuilt at depth." | "Let go of what you've outgrown together — the version of this relationship pushing through is more true than the one being released." |
| `Uranus\|conjunction\|ASC` | "Uranus arrives at the relationship's Ascendant — a sudden, liberating disruption of how this couple carries itself and who it presents to the world." | "Allow the change together rather than managing it back into the familiar — what is breaking loose in how you show up is asking to be more freely expressed." |

3.3. For planet/aspect/angle combinations without a table entry, `buildCouplePowerReason` must fall back to using `ASPECT_VERB_BANNER` and relationship-angle language (the current behavior), but return `guidance: undefined` rather than an empty string.

### 4. Guidance Content for `buildCoupleAspectReason`

4.1. A new lookup table `COUPLE_ASPECT_GUIDANCE` must be added, keyed as `"${planet}|${nature}"`, covering at minimum the following keys. All guidance strings must use relational language (subject is two people, not one):

| Key | Guidance |
|-----|----------|
| `Saturn\|challenging` | "This is a window to talk about what has been building between you — the emotional or structural tension the bond is carrying is easier to work with if named than if managed around separately." |
| `Saturn\|harmonious` | "Commit to the shared structure you have been building together — this is a window where patient, joint effort produces results that last for both of you." |
| `Jupiter\|harmonious` | "Reach toward the shared opportunity together — the window is genuinely open and action taken as a couple now has real momentum behind it." |
| `Jupiter\|challenging` | "Pause before the two of you overcommit together — the enthusiasm you share is real but the picture isn't complete yet; investigate before expanding jointly." |
| `Pluto\|challenging` | "Go toward what is being revealed between you rather than away from it — the transformation in this bond is happening regardless, and facing it together reduces the cost to each of you." |
| `Pluto\|harmonious` | "Act from the deeper version of this relationship that difficulty has revealed — this is a window to integrate together what you've each been through, not just to survive it." |
| `Uranus\|challenging` | "Stay flexible together and don't force the disruption into a predetermined shape — what breaks in this bond is creating room, even if that isn't apparent to either of you yet." |
| `Uranus\|harmonious` | "Take the unconventional step together — the window for change without penalty is open, and the two of you playing it safe will feel like a missed opportunity." |
| `Neptune\|challenging` | "Verify rather than assume what is happening between you — clarity is harder than usual, and decisions made on feeling alone may need revisiting when the picture sharpens." |
| `Neptune\|harmonious` | "Make space for creative and spiritual experiences together — what arrives through imagination and shared inner listening now carries unusual depth for both of you." |
| `Mars\|challenging` | "Don't escalate the tension between you or push through the friction by force — the pressure here needs to be worked with together, not overcome separately." |
| `Mars\|harmonious` | "Direct the shared energy toward something concrete together — the drive available to this bond now benefits from a clear joint target." |
| `Venus\|harmonious` | "Reach toward shared connection, pleasure, and beauty together — this is a window for what genuinely brings you both alive, and it doesn't need justification." |
| `Venus\|challenging` | "Don't try to resolve the tension between you through pleasing or accommodating — what needs addressing between you isn't going to settle on its own." |
| `Sun\|harmonious` | "Take a step toward visibility as a couple — this is a window for shared presence and being seen as you actually are together." |
| `Sun\|challenging` | "Notice where the two of you are each defending rather than seeing clearly — the friction is pointing to something worth examining together." |

4.2. The guidance lookup in `buildCoupleAspectReason` must use `COUPLE_ASPECT_GUIDANCE["${tightest.transitPlanet}|${nature}"]`, where `nature` is derived from the `category` argument (`'favorable'` → `'harmonious'`, `'challenging'` → `'challenging'`).

4.3. The fallback else branch (line 65–70, unrecognized `natalPlanet`) must still return `guidance: undefined` — no copy-paste from `ASPECT_GUIDANCE`. The fallback path is already thin; the goal is to extend the recognized phrase map rather than patch the fallback.

### 5. Guidance Content for `buildCoupleShiftReason`

5.1. A new lookup table `COUPLE_SHIFT_GUIDANCE` must be added, keyed by planet name, covering the outer planets that generate shift markers:

| Planet | Guidance |
|--------|----------|
| `Saturn` | "The territory Saturn governs in this relationship is asking for your joint attention — what has felt settled in the bond's structures may be shifting, and awareness together is more useful than each of you navigating it privately." |
| `Jupiter` | "The area of the relationship Jupiter has been amplifying is now pausing to consolidate — this is a moment to assess together what the expansion has produced before the next forward movement." |
| `Uranus` | "The disruption Uranus carries is arriving in the bond's territory of change and evolution — give each other room for the unexpected rather than insisting on continuity." |
| `Neptune` | "The fog or idealism Neptune brings is moving through a sensitive dimension of this bond — be especially honest with each other about what you are actually experiencing versus what you each wish were true." |
| `Pluto` | "The transformation Pluto is working on is moving through deep relational territory — what has been held unconsciously between you is surfacing, and bringing it into shared conversation is the most productive use of this window." |
| `Mars` | "The activation Mars brings is pressing on the bond's drive and assertion — notice where the two of you are channeling energy together versus where it is becoming friction between you." |
| `Mercury` | "The disruption to thinking and communication that Mercury's station brings is touching the bond's channel — go slowly in conversations that matter and make extra space for misreading each other during this window." |

5.2. For planets not in `COUPLE_SHIFT_GUIDANCE`, return `guidance: undefined`.

5.3. The shift reason string itself can remain as-is (the current `"${planet} stations ${direction} — the relationship feels this shift; ${brief} is the territory."` pattern).

### 6. Banner Render Patch

6.1. The `categoryBanner` computation (lines 445–450) in `CoupleAdvanceTab` remains correct — it uses `snapshot.score.reason`. No change needed there.

6.2. The banner render block (lines 647–682) must be modified to match the `AdvanceTab` banner render pattern:

- Replace the single `<p>` element wrapping both the bold and non-bold fragments with a `<div>` containing two children: the reason `<p>` and a conditional guidance `<p>`.
- The reason `<p>` must render `snapshot.score.bannerBoldFragment ?? categoryBanner.split(' ')[0]` as the bold fragment (mirroring line 1513 of `AdvanceTab`), followed by the rest of the reason string.
- The guidance `<p>` must be rendered conditionally (`snapshot.score.guidance &&`) with class `text-xs text-mystic-muted/80 mt-1.5 font-light leading-relaxed` — identical to `AdvanceTab` line 1517.

6.3. The icon span at line 657–668 must change its `className` attribute from `mt-0.5 shrink-0` to just `mt-0.5 shrink-0` (no change needed) but must now be adjacent to a `<div>` container rather than a `<p>`, matching the `AdvanceTab` structure where the icon sits next to a div that holds both the reason and guidance paragraphs.

6.4. The `categoryBanner` `useMemo` (lines 445–450) only sets `categoryBanner` to `snapshot.score.reason`. This is sufficient — the `bannerBoldFragment` is accessed directly from `snapshot.score` in the render, not via `categoryBanner`.

### 7. Guidance Language Standards

7.1. Every guidance string produced by `buildCouplePowerReason`, `buildCoupleAspectReason`, and `buildCoupleShiftReason` must contain at least one of the following relational markers: "you two," "together," "between you," "the two of you," "this bond," "jointly," "as a couple." A guidance string that reads as addressed to a single person fails this standard.

7.2. Guidance strings must be actionable — they name what the couple can do or attend to, not merely describe the astrological condition. A description belongs in the reason string. The guidance paragraph is the prompt.

7.3. Guidance strings must not be modified versions of entries from `ASPECT_GUIDANCE`. They may share structural form (imperative opening, em-dash, elaborating clause) but the content must arise from relationship context, not individual reframing.

7.4. Guidance strings for favorable categories (favorable windows, harmonious aspects, supportive power days) should open with invitation language — "reach toward," "say yes to," "step into," "this is a window for the two of you to." Challenging categories should open with honest framing — "this is a window to name," "don't try to manage around," "go toward what is surfacing between you."

7.5. Guidance for power-day markers (composite angle contacts) should reference the relational significance of the angle explicitly. Composite Ascendant guidance names how the couple shows up in the world. Composite Midheaven guidance names shared direction, public commitment, or joint ambition. Both angles carry different relational weight and the guidance should reflect the distinction.

### 8. Acceptance Checks

8.1. Navigate to the couple advance tab with a pair that has known birth times. Move the slider to a `power` marker where Saturn is near the composite Ascendant. The banner must show two paragraphs: the reason string with "Saturn" bolded at the head, and below it a guidance sentence that includes "between you" or "together" and says something actionable about shared structure or the couple's public presence.

8.2. Navigate to a `favorable` marker where Jupiter aspects composite Venus. The banner must show the reason string with "Jupiter" bolded, followed by a guidance paragraph that reads as addressed to two people and uses relational language rather than "you" in the individual sense.

8.3. Navigate to a `challenging` marker where Saturn aspects composite Moon. The banner must show the reason string followed by a guidance paragraph that speaks to how the couple handles emotional difficulty together — not to one person's inner work.

8.4. Navigate to a `shift` marker. The banner must show the reason string with the station planet bolded, followed by a guidance paragraph that speaks to how the bond's relevant dimension is being affected and what the couple can do together with that.

8.5. Navigate to offset 0. The banner must not appear. No regression.

8.6. Navigate to a `neutral` snapshot. The banner must not appear. No regression.

8.7. On a pair where one or both birth times are unknown (power markers are suppressed by the `bothTimesKnown` guard at line 121): navigate to a `favorable` or `challenging` marker. The guidance paragraph must render correctly for the aspect-based reason. The unknown-time annotation in the overview strip must still display correctly.

8.8. Read every guidance string aloud to an imaginary pair. If the string sounds like it was written for one person and has had "your" replaced with "the relationship's," it fails. It must sound like something written specifically for two people deciding together.

8.9. The bold fragment in the couple advance banner must be the planet name in all test cases, not the first word of the reason string. Confirm by testing a reason string that starts with "the" (the fallback else branch in `buildCoupleAspectReason`) — the bold fragment must be `tightest.transitPlanet`, not `"the"`.

8.10. The `MarkerTooltip` component (shared from `AdvanceTab`) renders `score.reason` only — no guidance. Confirm that the tooltip for a couple advance marker does not display the guidance paragraph (guidance is banner-only, as in individual advance).

---

## Out of Scope

- Synastry axis overlay scoring — covered in a separate sprint-0020 proposal.
- `computeCombinedWeight` parity in `scoreCoupleSnapshot` Priorities 2–4 — covered as a separate sprint-0020 task.
- Adding house-aware context to composite aspect reason strings (composite planets have `house: 0` by design; the `natalHouse` guard in the aspect row render already handles this).
- Generating guidance strings via GPT calls — all couple advance guidance is rule-based, not AI-generated.
- Modifying the `MarkerTooltip` to show guidance — tooltips are reason-only across the entire advance system.
- Adding new composite planet phrases to `COMPOSITE_PLANET_PHRASES` — the existing ten entries are sufficient for this feature.
- Changing the `ASPECT_GUIDANCE` table in `AdvanceTab.tsx` — individual advance guidance is unaffected.

---

## Open Questions

1. **Coverage depth for `COUPLE_POWER_PHRASES`.** The spec above lists 14 priority entries. Full parity with `POWER_DAY_PHRASES` in `AdvanceTab` would require ~40 entries. The implementation task should determine whether to launch with the 14 highest-frequency combinations and add coverage over time, or to write the full 40-entry set in sprint-0020. Jobs's voice notes that visual debt from wrong bolding was "not acceptable" — the same standard likely applies to a guidance paragraph that is missing for an uncommon but real power configuration. Recommendation: full 40-entry coverage in sprint-0020 is preferable; if time is the constraint, the 14 entries plus robust fallbacks (no empty guidance, no `undefined` rendered as visible text) is the floor.

2. **Fallback guidance for unrecognized composite planets.** When `COMPOSITE_PLANET_PHRASES[tightest.natalPlanet]` is undefined (the else branch in `buildCoupleAspectReason`), the current spec returns `guidance: undefined`. An alternative is to provide a generic relational fallback: `"This window is touching a dimension of the relationship's energy — talk with each other about what is feeling activated or pressured between you."` This is better than silence but may read as obviously generic. The implementation should decide whether a generic fallback or no guidance at all is the right behavior.

3. **Banner div vs. p element.** The current `CoupleAdvanceTab` banner uses a `<p>` element to wrap the entire reason line (line 669), while `AdvanceTab` uses a `<div>` wrapping two `<p>` elements. The patch in Specification 6 requires switching to the div-with-two-paragraphs structure. Confirm there are no layout or accessibility regressions from this structural change — the outer container is already a flex row with the icon and the content block.

4. **Shift guidance for `Neptune` and `Pluto` stations.** Neptune and Pluto stations are rare in a 36-month advance window (both move very slowly). The guidance strings for these planets in `COUPLE_SHIFT_GUIDANCE` should be verified for tone — Neptune's guidance should carry a note of compassionate honesty about fog and projection between two people; Pluto's should carry weight commensurate with the depth of what it surfaces in intimate bonds. Implementation should review the draft entries against the tone of the `COMPOSITE_PLANET_PHRASES` vocabulary before shipping.
