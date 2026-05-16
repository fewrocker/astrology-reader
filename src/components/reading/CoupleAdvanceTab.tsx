import { useMemo, useState, useEffect, useCallback, useTransition, useRef } from 'react'
import type { TransitPeriod, TransitAspect } from '../../engine/transits'
import { calculateCurrentPositions, calculateTransitAspects, getRetrogradeStatus } from '../../engine/transits'
import type { ChartData, PlanetName, ZodiacSign } from '../../engine/types'
import { ZODIAC_GLYPHS, getBodyGlyph } from '../../engine/types'
import { formatPosition } from '../../engine/zodiac'
import type { AspectType } from '../../engine/aspects'
import type { SynastryData } from '../../engine/synastry'
import { TRANSIT_RETROGRADE } from '../../data/interpretations/retrogrades'
import { computeTransitAspectBrief } from '../../data/interpretations/transitAspectBriefs'
import AspectRow from './AspectRow'

import type { SnapshotScore, AdvanceSnapshot, AdvanceConfig } from './AdvanceTab'
import {
  ADVANCE_CONFIG, CATEGORY_HALO,
  ORB_THRESHOLDS, SLOW_PLANETS_FOR_BANNER,
  ASPECT_VERB_BANNER, PLANET_WEIGHT,
  COMBINATION_PLANETS, COMBINATION_WEIGHT_THRESHOLD, COMBINATION_WEIGHT_NORMALIZE,
  computeCombinedWeight,
  detectAngleContact, MarkerDot, OverviewStrip, MarkerTooltip,
  runAdvancePreCalculation,
} from './AdvanceTab'

// ─── Composite planet archetype phrases ──────────────────────────────────────

interface CompositePlanetPhrase {
  relationship: string
  brief: string
}

const COMPOSITE_PLANET_PHRASES: Partial<Record<string, CompositePlanetPhrase>> = {
  Venus:   { relationship: "the relationship's romantic axis", brief: "shared pleasure, warmth, and connection" },
  Moon:    { relationship: "the relationship's emotional center", brief: "shared feeling and emotional safety" },
  Sun:     { relationship: "the relationship's core identity", brief: "shared vitality and direction" },
  Mars:    { relationship: "the relationship's drive and desire", brief: "shared momentum and assertive energy" },
  Mercury: { relationship: "the bond's communication channel", brief: "how the relationship thinks and speaks" },
  Jupiter: { relationship: "the relationship's expansive potential", brief: "shared optimism and abundance" },
  Saturn:  { relationship: "the bond's structures and commitments", brief: "shared responsibility and long-term shape" },
  Uranus:  { relationship: "the relationship's axis of change", brief: "shared disruption and evolution" },
  Neptune: { relationship: "the bond's idealism and depth", brief: "shared dreams and dissolution" },
  Pluto:   { relationship: "the relationship's transformative core", brief: "shared depth and irreversible growth" },
  NorthNode: { relationship: "the bond's evolutionary direction", brief: "shared karmic purpose" },
}

// ─── Couple guidance tables ───────────────────────────────────────────────────

/** Reason and guidance phrases for composite angle-contact power markers.
 *  Key: "${planet}|${aspectType}|${angleKey}" */
const COUPLE_POWER_PHRASES: Partial<Record<string, { reason: string; guidance: string }>> = {
  // Saturn
  'Saturn|conjunction|ASC': {
    reason:   "Saturn arrives at the relationship's Ascendant — how this bond presents itself to the world is being restructured.",
    guidance: "This is a window to talk together about how you show up as a couple — what has felt automatic about the way you move through the world together is being asked to become more intentional.",
  },
  'Saturn|conjunction|MC': {
    reason:   "Saturn reaches the relationship's Midheaven — a significant moment for the shared direction this bond has been building toward.",
    guidance: "Sit with what you are actually building together — the ambitions and public commitments the relationship has been carrying deserve an honest conversation now.",
  },
  'Saturn|opposition|ASC': {
    reason:   "Saturn pressing opposite the relationship's Ascendant — external structures and others' perceptions are testing the bond's foundations.",
    guidance: "What others are reflecting about this relationship carries useful information — this is a window to decide together what to keep and what to let go.",
  },
  'Saturn|opposition|MC': {
    reason:   "Saturn pressing opposite the relationship's Midheaven — the gap between the bond's private reality and its public direction is becoming visible.",
    guidance: "Name the distance between where this relationship actually is and where it has been projecting itself publicly — the two of you can close that gap more honestly now than later.",
  },
  'Saturn|square|ASC': {
    reason:   "Saturn pressing on the relationship's Ascendant axis — the way this couple moves through the world is under significant pressure.",
    guidance: "Don't try to manage around what is being stressed — naming what is hard between you is more productive than finding ways to look fine.",
  },
  'Saturn|square|MC': {
    reason:   "Saturn pressing on the relationship's Midheaven — the shared structures and long-term commitments of this bond are being stress-tested.",
    guidance: "Take the audit seriously together — what is working in the structures you share and what isn't is clearer now than it normally is.",
  },
  'Saturn|trine|ASC': {
    reason:   "Saturn supporting the relationship's Ascendant — the work done together on how this couple shows up is producing durable results.",
    guidance: "This is a window to take the next step in how you present yourselves to the world together — the groundwork is ready to support it.",
  },
  'Saturn|trine|MC': {
    reason:   "Saturn supporting the relationship's Midheaven — the shared direction and commitments this bond has invested in are crystallizing into something real.",
    guidance: "Commit to the joint goal or shared structure you have been building toward — the conditions are favorable for making it official.",
  },
  'Saturn|sextile|ASC': {
    reason:   "Saturn opening toward the relationship's Ascendant — a practical window to solidify how this couple shows up with real, lasting structure.",
    guidance: "Act on the shared identity step the two of you have been considering — the conditions are favorable and the timing is practical.",
  },
  'Saturn|sextile|MC': {
    reason:   "Saturn opening toward the relationship's Midheaven — a practical opportunity to advance shared standing through steady, joint effort.",
    guidance: "Make the deliberate move together toward the shared goal — the opening is available and sustained effort will be recognized.",
  },
  // Jupiter
  'Jupiter|conjunction|ASC': {
    reason:   "Jupiter arrives at the relationship's Ascendant — a significant expansion of how this bond presents itself and is received by the world.",
    guidance: "Step into more visible territory together — this is one of the better windows in the year for the two of you to be seen and recognized as a unit.",
  },
  'Jupiter|conjunction|MC': {
    reason:   "Jupiter reaches the relationship's Midheaven — a notable expansion of shared ambition, recognition, and the public chapter this bond is entering.",
    guidance: "Say yes to the shared opportunity — whether it is a public step, a joint commitment, or a shared project, the conditions are genuinely open right now.",
  },
  'Jupiter|opposition|ASC': {
    reason:   "Jupiter opposite the relationship's Ascendant — the bond is being pulled toward expansion through others and the wider world.",
    guidance: "Lean into the partnerships and collaborations available to the two of you together — the growth on offer now comes through opening outward, not closing inward.",
  },
  'Jupiter|opposition|MC': {
    reason:   "Jupiter opposite the relationship's Midheaven — private and foundational dimensions of the bond are expanding in ways that shape the shared direction.",
    guidance: "Let the growth in your shared inner life inform what you build publicly together — the inner expansion is the foundation for what comes next.",
  },
  'Jupiter|square|ASC': {
    reason:   "Jupiter pressing on the relationship's Ascendant — expansion of how this couple shows up may be outrunning the bond's current foundations.",
    guidance: "Check that the shared confidence is backed by substance — the opportunity is real but overcommitting together has a cost worth accounting for.",
  },
  'Jupiter|square|MC': {
    reason:   "Jupiter pressing on the relationship's Midheaven — joint ambitions are expanding rapidly but may exceed what current shared structures can support.",
    guidance: "Pursue the joint ambition with one eye on sustainability — investigate the picture fully before either of you overcommits publicly.",
  },
  'Jupiter|trine|ASC': {
    reason:   "Jupiter supporting the relationship's Ascendant — expansion of how the two of you show up together is available with unusual ease.",
    guidance: "Let the relationship take up more space in the world — the ease available now is genuine and the window won't stay this wide.",
  },
  'Jupiter|trine|MC': {
    reason:   "Jupiter supporting the relationship's Midheaven — shared career, public presence, or joint ambition is available to grow without unusual resistance.",
    guidance: "Advance the shared goal you have been holding back together — the timing is right and the conditions support it.",
  },
  'Jupiter|sextile|ASC': {
    reason:   "Jupiter opening toward the relationship's Ascendant — an accessible window for expanding how this couple presents and carries itself.",
    guidance: "Reach toward the opportunity for shared visibility — the opening is modest but real, and the two of you acting on it together will make it count.",
  },
  'Jupiter|sextile|MC': {
    reason:   "Jupiter opening toward the relationship's Midheaven — a practical window for joint reputation or shared professional opportunity.",
    guidance: "Make the shared professional move the two of you have been considering — the conditions are supportive and the timing is favorable.",
  },
  // Pluto
  'Pluto|conjunction|ASC': {
    reason:   "Pluto arrives at the relationship's Ascendant — a fundamental, irreversible transformation of how this bond presents itself and moves through the world.",
    guidance: "Go toward the transformation together rather than managing it separately — what changes about how you show up as a couple is pointing toward something more authentic.",
  },
  'Pluto|conjunction|MC': {
    reason:   "Pluto reaches the relationship's Midheaven — the shared direction and public identity of this bond are undergoing fundamental, permanent restructuring.",
    guidance: "Don't defend the version of this relationship the world has known — the transformation points toward something more aligned with what the bond actually is.",
  },
  'Pluto|opposition|ASC': {
    reason:   "Pluto opposite the relationship's Ascendant — deep transformation is coming through how the bond meets the world and is perceived by others.",
    guidance: "Address the power dynamics surfacing between you and the wider world together — avoidance will cost the two of you more than honest engagement.",
  },
  'Pluto|opposition|MC': {
    reason:   "Pluto opposite the relationship's Midheaven — deep transformation in the bond's private foundations is reshaping its shared public direction.",
    guidance: "Let the inner transformation of this relationship inform what you build publicly together — the work done in private is the real shared move.",
  },
  'Pluto|square|ASC': {
    reason:   "Pluto pressing on the relationship's Ascendant — the identity this couple has carried into the world is being stripped and rebuilt at depth.",
    guidance: "Let go of what you've outgrown together — the version of this relationship pushing through is more true than the one being released.",
  },
  'Pluto|square|MC': {
    reason:   "Pluto pressing on the relationship's Midheaven — shared trajectory and public identity are being permanently reshaped by deep pressure.",
    guidance: "Face the shared transformation directly together — what survives this pressure is what the bond is actually built to do.",
  },
  'Pluto|trine|ASC': {
    reason:   "Pluto supporting the relationship's Ascendant — the deep transformation this bond has been undergoing is integrating into how the couple carries itself.",
    guidance: "Act from the more authentic version of this relationship that difficulty has revealed — the integration is real and expressing it together will land.",
  },
  'Pluto|trine|MC': {
    reason:   "Pluto supporting the relationship's Midheaven — transformation already underway in this bond is now available to express through shared direction and public life.",
    guidance: "Bring the depth of what this relationship has become into what you build publicly together — what has been revealed between you is the actual shared advantage.",
  },
  'Pluto|sextile|ASC': {
    reason:   "Pluto opening toward the relationship's Ascendant — a window to express transformed shared understanding in how this couple presents to the world.",
    guidance: "Take one concrete step together toward the relationship you have been becoming — the integration available now is worth acting on jointly.",
  },
  'Pluto|sextile|MC': {
    reason:   "Pluto opening toward the relationship's Midheaven — a window to bring deep relational transformation into the shared public work of this bond.",
    guidance: "Let the inner work of this relationship shape the outer work — the shared move that reflects what you've become together is the right one.",
  },
  // Uranus
  'Uranus|conjunction|ASC': {
    reason:   "Uranus arrives at the relationship's Ascendant — a sudden, liberating disruption of how this couple carries itself and who it presents to the world.",
    guidance: "Allow the change together rather than managing it back into the familiar — what is breaking loose in how you show up is asking to be more freely expressed.",
  },
  'Uranus|conjunction|MC': {
    reason:   "Uranus reaches the relationship's Midheaven — a sudden, unexpected disruption or liberation of the bond's shared direction and public identity.",
    guidance: "Stay open together to the unconventional path that is emerging — the surprise is the direction, not an obstacle to it.",
  },
  'Uranus|opposition|ASC': {
    reason:   "Uranus opposite the relationship's Ascendant — sudden change and disruption are coming through how the bond meets others and the wider world.",
    guidance: "Let the changes happening at the edges of this relationship happen — freedom coming through the world around you is still freedom the two of you can work with.",
  },
  'Uranus|opposition|MC': {
    reason:   "Uranus opposite the relationship's Midheaven — a sudden shift in the bond's private or foundational dimensions is disrupting the shared public trajectory.",
    guidance: "Trust that the disruption is clarifying something — what needs to change about the relationship's shared direction is being shown from the inside out.",
  },
  'Uranus|square|ASC': {
    reason:   "Uranus pressing on the relationship's Ascendant — sudden, unpredictable changes to how this couple shows up are breaking old shared patterns.",
    guidance: "Stay flexible together and don't force the disruption into a predetermined shape — what breaks in this bond is creating room, even if that isn't apparent to either of you yet.",
  },
  'Uranus|square|MC': {
    reason:   "Uranus pressing on the relationship's Midheaven — shared direction is encountering sudden, disruptive pressure from an unexpected angle.",
    guidance: "Respond to the disruption creatively together rather than defensively — the unconventional path opening for this bond may be more right than the one being disrupted.",
  },
  'Uranus|trine|ASC': {
    reason:   "Uranus supporting the relationship's Ascendant — a liberating shift in how this couple carries itself is available with unusual ease.",
    guidance: "Take the unconventional step together — the window for change without penalty is open, and the two of you playing it safe will feel like a missed opportunity.",
  },
  'Uranus|trine|MC': {
    reason:   "Uranus supporting the relationship's Midheaven — a liberating shift in shared direction or public identity is available without major disruption.",
    guidance: "Move toward the shared change the two of you have been considering — the conditions for an unconventional joint step are favorable.",
  },
  'Uranus|sextile|ASC': {
    reason:   "Uranus opening toward the relationship's Ascendant — a window for a liberating, low-disruption change to how this couple presents itself.",
    guidance: "Try the unconventional expression together — the small step toward a freer shared self-presentation is easier now than usual.",
  },
  'Uranus|sextile|MC': {
    reason:   "Uranus opening toward the relationship's Midheaven — a modest but real opportunity for an unexpected or unconventional shared move.",
    guidance: "Consider the joint path that seemed too unusual — the opening is real even if the logic isn't conventional, and the two of you can test it together.",
  },
}

/** Guidance phrases for composite aspect markers. Key: "${planet}|${nature}" */
const COUPLE_ASPECT_GUIDANCE: Partial<Record<string, string>> = {
  'Saturn|challenging':   "This is a window to talk about what has been building between you — the emotional or structural tension the bond is carrying is easier to work with if named than if managed around separately.",
  'Saturn|harmonious':    "Commit to the shared structure you have been building together — this is a window where patient, joint effort produces results that last for both of you.",
  'Jupiter|harmonious':   "Reach toward the shared opportunity together — the window is genuinely open and action taken as a couple now has real momentum behind it.",
  'Jupiter|challenging':  "Pause before the two of you overcommit together — the enthusiasm you share is real but the picture isn't complete yet; investigate before expanding jointly.",
  'Pluto|challenging':    "Go toward what is being revealed between you rather than away from it — the transformation in this bond is happening regardless, and facing it together reduces the cost to each of you.",
  'Pluto|harmonious':     "Act from the deeper version of this relationship that difficulty has revealed — this is a window to integrate together what you've each been through, not just to survive it.",
  'Uranus|challenging':   "Stay flexible together and don't force the disruption into a predetermined shape — what breaks in this bond is creating room, even if that isn't apparent to either of you yet.",
  'Uranus|harmonious':    "Take the unconventional step together — the window for change without penalty is open, and the two of you playing it safe will feel like a missed opportunity.",
  'Neptune|challenging':  "Verify rather than assume what is happening between you — clarity is harder than usual, and decisions made on feeling alone may need revisiting when the picture sharpens.",
  'Neptune|harmonious':   "Make space for creative and spiritual experiences together — what arrives through imagination and shared inner listening now carries unusual depth for both of you.",
  'Mars|challenging':     "Don't escalate the tension between you or push through the friction by force — the pressure here needs to be worked with together, not overcome separately.",
  'Mars|harmonious':      "Direct the shared energy toward something concrete together — the drive available to this bond now benefits from a clear joint target.",
  'Venus|harmonious':     "Reach toward shared connection, pleasure, and beauty together — this is a window for what genuinely brings you both alive, and it doesn't need justification.",
  'Venus|challenging':    "Don't try to resolve the tension between you through pleasing or accommodating — what needs addressing between you isn't going to settle on its own.",
  'Sun|harmonious':       "Take a step toward visibility as a couple — this is a window for shared presence and being seen as you actually are together.",
  'Sun|challenging':      "Notice where the two of you are each defending rather than seeing clearly — the friction is pointing to something worth examining together.",
  'Moon|harmonious':      "Let the emotional warmth available between you be expressed rather than assumed — this is a window to tend to the bond's shared feeling and say the things that matter.",
  'Moon|challenging':     "This is a window to talk about what has gone unspoken between you — the emotional patterns the bond carries are being surfaced, and they're easier to work with if named than if managed around.",
  'Chiron|challenging':   "The wound surfacing in the relationship isn't asking to be fixed — it's asking to be witnessed. Being seen by each other without judgment is the practice.",
  'Chiron|harmonious':    "A healing integration is available to the two of you — something that has been tender between you is shifting toward understanding.",
}

/** Guidance phrases for composite shift markers. Key: planet name */
const COUPLE_SHIFT_GUIDANCE: Partial<Record<string, string>> = {
  Saturn:  "The territory Saturn governs in this relationship is asking for your joint attention — what has felt settled in the bond's structures may be shifting, and awareness together is more useful than each of you navigating it privately.",
  Jupiter: "The area of the relationship Jupiter has been amplifying is now pausing to consolidate — this is a moment to assess together what the expansion has produced before the next forward movement.",
  Uranus:  "The disruption Uranus carries is arriving in the bond's territory of change and evolution — give each other room for the unexpected rather than insisting on continuity.",
  Neptune: "The fog or idealism Neptune brings is moving through a sensitive dimension of this bond — be especially honest with each other about what you are actually experiencing versus what you each wish were true.",
  Pluto:   "The transformation Pluto is working on is moving through deep relational territory — what has been held unconsciously between you is surfacing, and bringing it into shared conversation is the most productive use of this window.",
  Mars:    "The activation Mars brings is pressing on the bond's drive and assertion — notice where the two of you are channeling energy together versus where it is becoming friction between you.",
  Mercury: "The disruption to thinking and communication that Mercury's station brings is touching the bond's channel — go slowly in conversations that matter and make extra space for misreading each other during this window.",
}

// ─── Couple-voice reason string builders ─────────────────────────────────────

function buildCouplePowerReason(
  planet: string,
  aspectType: AspectType,
  angleKey: 'ASC' | 'MC',
): { reason: string; bannerBoldFragment: string; guidance?: string } {
  const key = `${planet}|${aspectType}|${angleKey}`
  const entry = COUPLE_POWER_PHRASES[key]
  if (entry) return { ...entry, bannerBoldFragment: planet }

  // Fallback: use verb table and relationship-angle language
  const verb = ASPECT_VERB_BANNER[aspectType] ?? 'reaches'
  const angleName = angleKey === 'ASC' ? "the relationship's Ascendant" : "the relationship's Midheaven"
  const domain = angleKey === 'ASC'
    ? 'a significant crossing for how this bond presents itself to the world'
    : 'a significant moment for how this bond is recognized and defined in the world'
  return {
    reason: `${planet} ${verb} ${angleName} — ${domain}.`,
    bannerBoldFragment: planet,
  }
}

function buildCoupleAspectReason(
  tightest: TransitAspect,
  category: 'favorable' | 'challenging',
): { reason: string; bannerBoldFragment: string; guidance?: string } {
  const phrases = COMPOSITE_PLANET_PHRASES[tightest.natalPlanet]
  const verb = ASPECT_VERB_BANNER[tightest.type as AspectType] ?? 'contacts'
  const planet = tightest.transitPlanet as string
  const nature = category === 'favorable' ? 'harmonious' : 'challenging'
  const guidance = COUPLE_ASPECT_GUIDANCE[`${planet}|${nature}`]

  if (!phrases) {
    if (category === 'favorable') {
      return {
        reason: `${planet} ${verb} the relationship's ${tightest.natalPlanet} — a favorable window for the bond.`,
        bannerBoldFragment: planet,
        guidance,
      }
    } else {
      return {
        reason: `${planet} ${verb} the relationship's ${tightest.natalPlanet} — tension in the bond's ${tightest.natalPlanet} dimension.`,
        bannerBoldFragment: planet,
        guidance,
      }
    }
  }

  if (category === 'favorable') {
    return {
      reason: `${planet} ${verb} ${phrases.relationship} — a window when ${phrases.brief} is genuinely supported.`,
      bannerBoldFragment: planet,
      guidance,
    }
  } else {
    return {
      reason: `${planet} ${verb} ${phrases.relationship} — ${phrases.brief} is under pressure in this period.`,
      bannerBoldFragment: planet,
      guidance,
    }
  }
}

function buildCoupleShiftReason(
  planet: string,
  direction: 'retrograde' | 'direct',
): { reason: string; bannerBoldFragment: string; guidance?: string } {
  const interp = TRANSIT_RETROGRADE[planet]
  const brief = interp?.brief ?? 'a significant dimension of the relationship'
  return {
    reason: `${planet} stations ${direction} — the relationship feels this shift; ${brief} is the territory.`,
    bannerBoldFragment: planet,
    guidance: COUPLE_SHIFT_GUIDANCE[planet],
  }
}

// ─── Couple snapshot scoring ──────────────────────────────────────────────────

function scoreCoupleSnapshot(
  snapshot: AdvanceSnapshot,
  prev: AdvanceSnapshot | null,
  chart1: ChartData,
  chart2: ChartData,
  synastryData: SynastryData,
  period: TransitPeriod,
): SnapshotScore {
  const neutral: SnapshotScore = { category: 'neutral', intensity: 0, reason: '', coShift: false }

  if (snapshot.offset === 0) return neutral

  const orbs = ORB_THRESHOLDS[period]

  // ── Detect station crossing ───────────────────────────────────────────────
  let stationPlanet: string | undefined
  let stationDirection: 'retrograde' | 'direct' | undefined

  if (prev) {
    for (const curr of snapshot.retrogrades) {
      const prevR = prev.retrogrades.find(r => r.planet === curr.planet)
      if (prevR && prevR.isRetro !== curr.isRetro) {
        stationPlanet = curr.planet
        stationDirection = curr.isRetro ? 'retrograde' : 'direct'
        break
      }
    }
  }

  // ── Priority 1: power — slow planet within angleContact orb of composite angle ─
  // Requires BOTH birth times to be known
  const bothTimesKnown = chart1.unknownTime === false && chart2.unknownTime === false
  if (bothTimesKnown) {
    const compositeAngles: { key: 'ASC' | 'MC'; lon: number }[] = [
      { key: 'ASC', lon: synastryData.compositeChart.angles.ascendant.longitude },
      { key: 'MC', lon: synastryData.compositeChart.angles.midheaven.longitude },
    ]

    let bestContact: {
      planet: string
      angleKey: 'ASC' | 'MC'
      aspectType: AspectType
      orb: number
    } | null = null

    for (const tp of snapshot.transitPlanets) {
      if (!SLOW_PLANETS_FOR_BANNER.has(tp.name as PlanetName)) continue
      for (const { key, lon } of compositeAngles) {
        const contact = detectAngleContact(tp.longitude, lon, orbs.angleContact)
        if (contact && (!bestContact || contact.orb < bestContact.orb)) {
          bestContact = {
            planet: tp.name,
            angleKey: key,
            aspectType: contact.aspectType,
            orb: contact.orb,
          }
        }
      }
    }

    if (bestContact) {
      const intensity = Math.max(0, 1.0 - (bestContact.orb / orbs.angleContact))
      const { reason, bannerBoldFragment, guidance } = buildCouplePowerReason(bestContact.planet, bestContact.aspectType, bestContact.angleKey)
      const coShift = !!stationPlanet
      return {
        category: 'power',
        coShift,
        intensity,
        reason,
        bannerBoldFragment,
        guidance,
        shiftPlanet: coShift ? stationPlanet : undefined,
        shiftDirection: coShift ? stationDirection : undefined,
        triggerAspect: {
          transitPlanet: bestContact.planet,
          natalPlanet: bestContact.angleKey === 'ASC' ? 'composite Ascendant' : 'composite Midheaven',
          type: bestContact.aspectType,
          orb: bestContact.orb,
        },
      }
    }
  }

  // ── Priority 2: shift — station crossing (when no power) ─────────────────
  if (stationPlanet && stationDirection) {
    const tightApplyingHarmonious = snapshot.transitAspects.filter(
      a => a.applying && a.orb <= orbs.applyingTight && a.nature === 'harmonious'
    )
    const tightApplyingChallenging = snapshot.transitAspects.filter(
      a => a.applying && a.orb <= orbs.applyingTight && a.nature === 'challenging'
    )

    const harmoniousWeight = computeCombinedWeight(tightApplyingHarmonious, orbs.applyingTight)
    const challengingWeight = computeCombinedWeight(tightApplyingChallenging, orbs.applyingTight)

    const harmSlowPlanet = tightApplyingHarmonious.some(a => COMBINATION_PLANETS.has(a.transitPlanet as string))
    const challSlowPlanet = tightApplyingChallenging.some(a => COMBINATION_PLANETS.has(a.transitPlanet as string))

    const isFavorable = harmoniousWeight >= (harmSlowPlanet ? COMBINATION_WEIGHT_THRESHOLD : COMBINATION_WEIGHT_THRESHOLD * 2)
    const isChallenging = challengingWeight >= (challSlowPlanet ? COMBINATION_WEIGHT_THRESHOLD : COMBINATION_WEIGHT_THRESHOLD * 2)

    if (isFavorable || isChallenging) {
      const primaryCategory = isFavorable ? 'favorable' : 'challenging'
      const aspects = isFavorable ? tightApplyingHarmonious : tightApplyingChallenging
      const combinedWeight = isFavorable ? harmoniousWeight : challengingWeight
      const tightest = [...aspects].sort((a, b) =>
        (PLANET_WEIGHT[b.transitPlanet as string] ?? 0) - (PLANET_WEIGHT[a.transitPlanet as string] ?? 0)
      )[0]
      const intensity = Math.min(1, combinedWeight / COMBINATION_WEIGHT_NORMALIZE)

      const { reason: coShiftReason, bannerBoldFragment: coShiftBold, guidance: coShiftGuidance } = buildCoupleAspectReason(tightest, primaryCategory)
      return {
        category: primaryCategory,
        coShift: true,
        intensity,
        reason: coShiftReason,
        bannerBoldFragment: coShiftBold,
        guidance: coShiftGuidance,
        shiftPlanet: stationPlanet,
        shiftDirection: stationDirection,
        triggerAspect: {
          transitPlanet: tightest.transitPlanet,
          natalPlanet: tightest.natalPlanet,
          type: tightest.type,
          orb: tightest.orb,
        },
      }
    }

    const { reason: shiftReason, bannerBoldFragment: shiftBold, guidance: shiftGuidance } = buildCoupleShiftReason(stationPlanet, stationDirection)
    return {
      category: 'shift',
      coShift: false,
      intensity: 0.8,
      reason: shiftReason,
      bannerBoldFragment: shiftBold,
      guidance: shiftGuidance,
      shiftPlanet: stationPlanet,
      shiftDirection: stationDirection,
    }
  }

  // ── Priority 3: favorable — constellation-weight scoring ─────────────────
  {
    const tightApplyingHarmonious = snapshot.transitAspects.filter(
      a => a.applying && a.orb <= orbs.applyingTight && a.nature === 'harmonious'
    )
    const combinedWeight = computeCombinedWeight(tightApplyingHarmonious, orbs.applyingTight)
    const hasSlowPlanet = tightApplyingHarmonious.some(a => COMBINATION_PLANETS.has(a.transitPlanet as string))
    const favorableThreshold = hasSlowPlanet ? COMBINATION_WEIGHT_THRESHOLD : COMBINATION_WEIGHT_THRESHOLD * 2

    if (combinedWeight >= favorableThreshold) {
      const tightest = [...tightApplyingHarmonious].sort((a, b) =>
        (PLANET_WEIGHT[b.transitPlanet as string] ?? 0) - (PLANET_WEIGHT[a.transitPlanet as string] ?? 0)
      )[0]
      const intensity = Math.min(1, combinedWeight / COMBINATION_WEIGHT_NORMALIZE)

      const { reason: favReason, bannerBoldFragment: favBold, guidance: favGuidance } = buildCoupleAspectReason(tightest, 'favorable')
      return {
        category: 'favorable',
        coShift: false,
        intensity,
        reason: favReason,
        bannerBoldFragment: favBold,
        guidance: favGuidance,
        triggerAspect: {
          transitPlanet: tightest.transitPlanet,
          natalPlanet: tightest.natalPlanet,
          type: tightest.type,
          orb: tightest.orb,
        },
      }
    }
  }

  // ── Priority 4: challenging — constellation-weight scoring ────────────────
  {
    const tightApplyingChallenging = snapshot.transitAspects.filter(
      a => a.applying && a.orb <= orbs.applyingTight && a.nature === 'challenging'
    )
    const combinedWeight = computeCombinedWeight(tightApplyingChallenging, orbs.applyingTight)
    const hasSlowPlanet = tightApplyingChallenging.some(a => COMBINATION_PLANETS.has(a.transitPlanet as string))
    const challengingThreshold = hasSlowPlanet ? COMBINATION_WEIGHT_THRESHOLD : COMBINATION_WEIGHT_THRESHOLD * 2

    if (combinedWeight >= challengingThreshold) {
      const tightest = [...tightApplyingChallenging].sort((a, b) =>
        (PLANET_WEIGHT[b.transitPlanet as string] ?? 0) - (PLANET_WEIGHT[a.transitPlanet as string] ?? 0)
      )[0]
      const intensity = Math.min(1, combinedWeight / COMBINATION_WEIGHT_NORMALIZE)

      const { reason: chalReason, bannerBoldFragment: chalBold, guidance: chalGuidance } = buildCoupleAspectReason(tightest, 'challenging')
      return {
        category: 'challenging',
        coShift: false,
        intensity,
        reason: chalReason,
        bannerBoldFragment: chalBold,
        guidance: chalGuidance,
        triggerAspect: {
          transitPlanet: tightest.transitPlanet,
          natalPlanet: tightest.natalPlanet,
          type: tightest.type,
          orb: tightest.orb,
        },
      }
    }
  }

  return neutral
}

// ─── Pre-calculator ───────────────────────────────────────────────────────────

function preCalculateCoupleSnapshots(
  chart1: ChartData,
  chart2: ChartData,
  synastryData: SynastryData,
  period: TransitPeriod,
  baseDate: Date,
): AdvanceSnapshot[] {
  const config: AdvanceConfig = ADVANCE_CONFIG[period]

  return runAdvancePreCalculation<AdvanceSnapshot>(
    period,
    baseDate,
    config,
    (date, offset) => {
      const transitPlanets = calculateCurrentPositions(date)
      // Transit aspects computed against composite chart planets (house: 0 by design — guarded below)
      const transitAspects = calculateTransitAspects(transitPlanets, synastryData.compositeChart.planets, period)
      const retrogrades = getRetrogradeStatus(date)
      return {
        offset,
        date,
        dateStr: date.toISOString().split('T')[0],
        transitPlanets,
        housedTransitPlanets: transitPlanets, // no composite house data — used only for chart wheel which is not rendered
        transitAspects,
        retrogrades,
      }
    },
    (snap, prev) => scoreCoupleSnapshot(snap, prev, chart1, chart2, synastryData, period),
  )
}

// ─── CoupleAdvanceTab Component ───────────────────────────────────────────────

interface CoupleAdvanceTabProps {
  chart1: ChartData
  chart2: ChartData
  synastryData: SynastryData
  period: TransitPeriod
  baseDate: Date
}

export default function CoupleAdvanceTab({
  chart1,
  chart2,
  synastryData,
  period,
  baseDate,
}: CoupleAdvanceTabProps) {
  const config = ADVANCE_CONFIG[period]

  const snapshotCache = useRef<Map<string, AdvanceSnapshot[]>>(new Map())
  const [snapshots, setSnapshots] = useState<AdvanceSnapshot[]>([])
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    // Cache key includes both chart identities so partner-switching invalidates cache
    const cacheKey = [
      period,
      baseDate.toISOString(),
      chart1.angles.ascendant.longitude.toFixed(4),
      chart1.angles.midheaven.longitude.toFixed(4),
      String(chart1.unknownTime),
      chart2.angles.ascendant.longitude.toFixed(4),
      chart2.angles.midheaven.longitude.toFixed(4),
      String(chart2.unknownTime),
    ].join(':')
    const cached = snapshotCache.current.get(cacheKey)
    if (cached) {
      setSnapshots(cached)
      return
    }
    startTransition(() => {
      const computed = preCalculateCoupleSnapshots(chart1, chart2, synastryData, period, baseDate)
      snapshotCache.current.set(cacheKey, computed)
      setSnapshots(computed)
    })
  }, [chart1, chart2, synastryData, period, baseDate])

  const [offset, setOffset] = useState(0)
  const snapshot = snapshots[offset]

  const handleSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setOffset(Number(e.target.value))
  }, [])

  const markers = useMemo(
    () => snapshots.filter(s => s.score.category !== 'neutral' && s.offset > 0),
    [snapshots]
  )

  const categoryBanner = useMemo(() => {
    if (!snapshot) return null
    if (snapshot.offset === 0) return null
    if (snapshot.score.category === 'neutral') return null
    return snapshot.score.reason
  }, [snapshot])

  const [hoveredMarker, setHoveredMarker] = useState<AdvanceSnapshot | null>(null)

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })

  const offsetLabel =
    offset === 0 ? 'Now' :
    offset === 1 ? `+1 ${config.unit}` :
    `+${offset} ${config.unitPlural}`

  const harmonious = snapshot?.transitAspects.filter(a => a.nature === 'harmonious').length ?? 0
  const challenging = snapshot?.transitAspects.filter(a => a.nature === 'challenging').length ?? 0
  const activeRetrogrades = snapshot?.retrogrades.filter(r => r.isRetro || r.status.includes('Stationing')).length ?? 0

  const nextMarker = markers.find(m => m.offset > offset) ?? null
  const prevMarker = [...markers].reverse().find(m => m.offset < offset && m.offset > 0) ?? null

  const thumbShadowClass = snapshot?.score.category === 'power'
    ? '[&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(201,168,76,0.8)]'
    : '[&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(201,168,76,0.5)]'

  const currentMarker = markers.find(m => m.offset === offset) ?? null
  const thumbHaloValue = currentMarker && currentMarker.score.category !== 'neutral'
    ? CATEGORY_HALO[currentMarker.score.category]
    : undefined

  const aspectHeaderSuffix = snapshot ? (
    snapshot.score.category === 'favorable' ? ' — Favorable window' :
    snapshot.score.category === 'challenging' ? ' — Tense configuration' :
    snapshot.score.category === 'power' ? ' — Power configuration' :
    snapshot.score.category === 'shift' ? ' — Planetary shift' :
    ''
  ) : ''

  const retrogradeHeader = snapshot?.score.category === 'shift' ? 'Planetary Shift' : 'Retrograde Activity'

  // Unknown time state for strip annotation
  const eitherUnknown = chart1.unknownTime === true || chart2.unknownTime === true

  return (
    <div>
      {/* Animation styles (shared with AdvanceTab) */}
      <style>{`
        @keyframes glow-breathe-gold {
          0%, 100% { opacity: 0.75; transform: rotate(45deg) scale(1.0); }
          50%       { opacity: 1.0;  transform: rotate(45deg) scale(1.15); }
        }
        @keyframes glow-breathe-red {
          0%, 100% { opacity: 0.70; transform: scale(1.0); }
          50%       { opacity: 1.0;  transform: scale(1.1); }
        }
        @keyframes shift-rotate {
          0%, 100% { transform: rotate(40deg); opacity: 0.80; }
          50%       { transform: rotate(50deg); opacity: 1.0; }
        }
        .marker-anim-power {
          animation: glow-breathe-gold 3s ease-in-out infinite;
        }
        .marker-anim-challenging {
          animation: glow-breathe-red 2s ease-in-out infinite;
        }
        .marker-anim-shift {
          animation: shift-rotate 4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .marker-anim-power,
          .marker-anim-challenging,
          .marker-anim-shift {
            animation: none;
            opacity: 0.85;
          }
        }
      `}</style>

      {/* Overview Strip */}
      {(snapshots.length > 0 || isPending) && (
        <OverviewStrip
          markers={markers}
          max={config.max}
          offset={offset}
          onJump={setOffset}
          isPending={isPending}
          config={config}
          unknownTime={eitherUnknown}
          quietMessage="A steady period for the relationship — no exceptional signals in this window."
          unknownTimeAnnotation="One or both birth times unknown — composite angle markers not available."
        />
      )}

      {/* Slider control */}
      <div className="bg-mystic-surface/50 border border-mystic-border rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-mystic-muted text-xs uppercase tracking-widest">Advance Time</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => prevMarker && setOffset(prevMarker.offset)}
              disabled={!prevMarker}
              className="text-mystic-gold/60 text-xs hover:text-mystic-gold disabled:opacity-30 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Jump to previous notable moment"
            >
              ← Prev
            </button>
            <span className="font-heading text-lg text-mystic-gold">{offsetLabel}</span>
            <button
              onClick={() => nextMarker && setOffset(nextMarker.offset)}
              disabled={!nextMarker}
              className="text-mystic-gold/60 text-xs hover:text-mystic-gold disabled:opacity-30 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Jump to next notable moment"
            >
              Next ✦
            </button>
          </div>
        </div>

        {/* Slider with marker overlay */}
        <div className="relative w-full">
          <input
            type="range"
            min={0}
            max={config.max}
            value={offset}
            onChange={handleSlider}
            className={`w-full h-2 bg-mystic-bg rounded-lg appearance-none cursor-pointer accent-mystic-gold
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-mystic-gold
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-track]:bg-mystic-border [&::-webkit-slider-track]:rounded-lg
              ${thumbShadowClass}${currentMarker ? ' has-thumb-halo' : ''}`}
            style={thumbHaloValue ? ({ '--thumb-halo': thumbHaloValue } as React.CSSProperties) : undefined}
          />

          <div
            className="absolute pointer-events-none"
            style={{ top: '50%', transform: 'translateY(-50%)', left: '10px', right: '10px' }}
          >
            {hoveredMarker && offset !== hoveredMarker.offset && (
              <MarkerTooltip
                marker={hoveredMarker}
                positionX={(hoveredMarker.offset / config.max) * 100}
              />
            )}

            {markers.map(m => (
              <MarkerDot
                key={m.offset}
                marker={m}
                max={config.max}
                active={offset === m.offset}
                onClick={() => setOffset(m.offset)}
                onMouseEnter={() => setHoveredMarker(m)}
                onMouseLeave={() => setHoveredMarker(null)}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-between mt-2 text-mystic-muted text-[10px]">
          <span>Now</span>
          <span>{config.max} {config.unitPlural}</span>
        </div>

        {/* Date display */}
        <div className="text-center mt-3">
          {snapshot ? (
            <p className="text-mystic-gold font-heading text-base">{formatDate(snapshot.date)}</p>
          ) : (
            <p className="text-mystic-muted font-heading text-base">Computing…</p>
          )}
        </div>

        {/* Quick stats */}
        {snapshot && (
          <div className="flex justify-center gap-4 mt-3">
            <span className="text-xs text-mystic-muted">
              <span className="text-mystic-gold font-medium">{snapshot.transitAspects.length}</span> aspects to composite
            </span>
            <span className="text-xs">
              <span className="text-green-400 font-medium">{harmonious}</span>
              <span className="text-mystic-muted"> harmonious</span>
            </span>
            <span className="text-xs">
              <span className="text-red-400 font-medium">{challenging}</span>
              <span className="text-mystic-muted"> challenging</span>
            </span>
            {activeRetrogrades > 0 && (
              <span className="text-xs">
                <span className="text-red-400 font-medium">{activeRetrogrades}</span>
                <span className="text-mystic-muted"> ℞</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Category Banner */}
      {categoryBanner && snapshot && snapshot.score.category !== 'neutral' && (
        <div className={`mb-6 rounded-xl border border-l-2 px-4 py-3 flex items-start gap-2 ${
          snapshot.score.category === 'power'
            ? 'border-mystic-gold/30 border-l-mystic-gold bg-mystic-gold/10'
            : snapshot.score.category === 'favorable'
              ? 'border-green-500/30 border-l-green-500 bg-green-900/10'
              : snapshot.score.category === 'challenging'
                ? 'border-red-500/30 border-l-red-500 bg-red-900/10'
                : 'border-blue-500/30 border-l-blue-500 bg-blue-900/10'
        }`}>
          <span className={`mt-0.5 shrink-0 ${
            snapshot.score.category === 'power'
              ? 'text-mystic-gold'
              : snapshot.score.category === 'favorable'
                ? 'text-green-400'
                : snapshot.score.category === 'challenging'
                  ? 'text-red-400'
                  : 'text-blue-400'
          }`}>
            {snapshot.score.category === 'challenging' ? '⚠' :
             snapshot.score.category === 'shift' ? '◆' : '✦'}
          </span>
          <div>
            <p className={`text-sm ${
              snapshot.score.category === 'power'
                ? 'text-mystic-gold/90'
                : snapshot.score.category === 'favorable'
                  ? 'text-green-400/90'
                  : snapshot.score.category === 'challenging'
                    ? 'text-red-400/90'
                    : 'text-blue-400/90'
            }`}>
              <span className="font-heading">{snapshot.score.bannerBoldFragment ?? categoryBanner.split(' ')[0]}</span>
              {' ' + categoryBanner.slice((snapshot.score.bannerBoldFragment ?? categoryBanner.split(' ')[0]).length).trimStart()}
            </p>
            {snapshot.score.guidance && (
              <p className="text-xs text-mystic-muted/80 mt-1.5 font-light leading-relaxed">
                {snapshot.score.guidance}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Transit aspects to composite (no chart wheel for couple advance — spec 5.7) */}
      {snapshot && snapshot.transitAspects.length > 0 && (
        <div className="border border-mystic-gold/20 rounded-lg overflow-hidden mb-4">
          <div className="px-5 py-3 bg-mystic-gold/5">
            <span className="font-heading text-lg text-mystic-gold">
              Transit Aspects to Composite ({snapshot.transitAspects.length})
            </span>
            {aspectHeaderSuffix && (
              <span className="text-mystic-muted text-sm font-normal">{aspectHeaderSuffix}</span>
            )}
          </div>
          <p className="text-mystic-muted text-xs px-5 pt-3">How current transits affect the relationship as a whole</p>
          <div className="px-5 py-4">
            {snapshot.transitAspects.map((a, i) => {
              // Composite planets always have house: 0 — guard to null to avoid house-lookup errors
              const natalHouse: number | null = null

              const rawBrief = computeTransitAspectBrief(
                a.transitPlanet as PlanetName,
                a.type,
                a.natalPlanet as PlanetName,
                natalHouse,
                a.nature,
                a.applying,
              )
              const brief = rawBrief.replace(/\byour\b/gi, "the relationship's")

              return (
                <AspectRow
                  key={i}
                  transitPlanet={a.transitPlanet as PlanetName}
                  natalPlanet={a.natalPlanet as PlanetName}
                  aspectType={a.type}
                  nature={a.nature}
                  symbol={a.symbol}
                  orb={a.orb}
                  applying={a.applying}
                  brief={brief}
                  natalLabel="Composite"
                />
              )
            })}
          </div>
        </div>
      )}

      {isPending && !snapshot && (
        <div className="border border-mystic-gold/10 rounded-lg overflow-hidden mb-4 px-5 py-8 flex justify-center">
          <span className="text-mystic-muted text-sm">Computing relationship moments…</span>
        </div>
      )}

      {/* Retrograde / Planetary Shift activity */}
      {snapshot && (() => {
        const active = snapshot.retrogrades.filter(r => r.isRetro || r.status.includes('Stationing'))
        if (active.length === 0) return null
        return (
          <div className="border border-mystic-gold/20 rounded-lg overflow-hidden mb-4">
            <div className="px-5 py-3 bg-mystic-gold/5">
              <span className="font-heading text-lg text-mystic-gold">{retrogradeHeader}</span>
            </div>
            <div className="px-5 py-4 space-y-3">
              {active.map((r, i) => {
                const interp = TRANSIT_RETROGRADE[r.planet]
                return (
                  <div key={i} className="border border-red-500/15 bg-red-900/5 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg">{getBodyGlyph(r.planet)}</span>
                      <span className="text-mystic-text text-sm font-medium">{r.planet}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${r.isRetro ? 'bg-red-900/30 text-red-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                        {r.status}
                      </span>
                    </div>
                    {interp && (
                      <div className="ml-8">
                        <p className="text-red-400/80 text-xs font-medium mb-1">{interp.brief}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Planet positions table */}
      {snapshot && (
        <div className="border border-mystic-gold/20 rounded-lg overflow-hidden mb-4">
          <div className="px-5 py-3 bg-mystic-gold/5">
            <span className="font-heading text-lg text-mystic-gold">Planet Positions</span>
          </div>
          <div className="px-5 py-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-mystic-gold/10 text-mystic-muted text-xs uppercase tracking-wider">
                  <th className="text-left px-3 py-2">Planet</th>
                  <th className="text-left px-3 py-2">Sign</th>
                  <th className="text-left px-3 py-2">Position</th>
                  <th className="text-left px-3 py-2">Motion</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.transitPlanets.filter(p => p.name !== 'NorthNode').map(p => (
                  <tr key={p.name} className="border-b border-mystic-gold/5">
                    <td className="px-3 py-2 text-mystic-text">
                      <span className="mr-2">{getBodyGlyph(p.name)}</span>
                      {p.name}
                    </td>
                    <td className="px-3 py-2 text-mystic-gold">{ZODIAC_GLYPHS[p.sign as ZodiacSign]} {p.sign}</td>
                    <td className="px-3 py-2 text-mystic-muted">{formatPosition(p)}</td>
                    <td className="px-3 py-2 text-mystic-muted">
                      {p.retrograde ? <span className="text-red-400">℞ Retrograde</span> : 'Direct'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
