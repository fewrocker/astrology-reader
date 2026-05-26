/**
 * Shared tarot utility functions — single source of truth for shuffle,
 * reversal, transit formatting, engine context construction, and transit
 * data preparation.
 *
 * All reading flows (Single, Three-card, Celtic Cross) import from here.
 * A fix or behaviour change applied to any function automatically applies
 * to every flow.
 */

import { useMemo } from 'react'
import { ALL_TAROT_CARDS } from '../../data/tarot/cards'
import type { TarotCard } from '../../data/tarot/cards'
import { calculateTransits } from '../../engine/transits'
import type { TransitData } from '../../engine/transits'
import { buildTarotAstroContext } from '../../engine/tarot'
import type { TarotAstroContext } from '../../engine/tarot'
import type { ChartData } from '../../engine/types'

// ─── Deck shuffle ─────────────────────────────────────────────────────────────

/**
 * Return a Fisher-Yates shuffled copy of ALL_TAROT_CARDS.
 * Uses Math.random() directly — not seedable by design (ritual randomness).
 */
export function shuffleTarotDeck(): TarotCard[] {
  const deck = [...ALL_TAROT_CARDS] as TarotCard[]

  for (let index = deck.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]]
  }

  return deck
}

// ─── Card reversal ────────────────────────────────────────────────────────────

/**
 * Return true 30 % of the time — whether the drawn card is reversed.
 */
export function computeCardReversal(): boolean {
  return Math.random() < 0.3
}

// ─── Transit summary formatter ────────────────────────────────────────────────

/**
 * Format a TransitData object into a compact human-readable string
 * suitable for inclusion in a GPT prompt payload.
 *
 * The server-side copy in server/services/gptTarot.ts must mirror this
 * implementation exactly — they cannot share a single file due to separate
 * TypeScript compilation contexts, but this file is the canonical reference.
 */
export function formatTransitSummary(
  transitData: ReturnType<typeof calculateTransits>,
  periodLabel: 'Daily' | 'Weekly',
): string {
  const moon = transitData.currentPlanets.find(planet => planet.name === 'Moon')
  const topAspects = transitData.transitAspects.slice(0, periodLabel === 'Daily' ? 5 : 7)
  const ingresses = transitData.ingresses.slice(0, periodLabel === 'Daily' ? 2 : 4)
  const retrogrades = transitData.retrogrades.filter(item => item.isRetro || item.status.includes('Stationing')).slice(0, 5)

  const lines: string[] = []
  lines.push(`${periodLabel} window: ${transitData.dateRange.start} to ${transitData.dateRange.end}`)
  if (moon) {
    lines.push(`Current Moon: ${moon.degree}°${moon.minute}' ${moon.sign}${moon.retrograde ? ' [Rx]' : ''}`)
  }
  if (topAspects.length > 0) {
    lines.push(`${periodLabel} transit aspects:`)
    for (const aspect of topAspects) {
      const houseText = aspect.natalHouse ? `, natal house ${aspect.natalHouse}` : ''
      lines.push(`- ${aspect.transitPlanet} ${aspect.symbol} natal ${aspect.natalPlanet} (${aspect.type}, orb ${aspect.orb}°, ${aspect.applying ? 'applying' : 'separating'}, ${aspect.nature}${houseText})`)
    }
  }
  if (ingresses.length > 0) {
    lines.push(`${periodLabel} sign changes:`)
    for (const ingress of ingresses) {
      lines.push(`- ${ingress.planet} moves from ${ingress.fromSign} to ${ingress.toSign} around ${ingress.approximateDate}`)
    }
  }
  if (retrogrades.length > 0) {
    lines.push(`${periodLabel} retrograde activity:`)
    for (const retrograde of retrogrades) {
      lines.push(`- ${retrograde.planet}: ${retrograde.status}`)
    }
  }

  return lines.join('\n')
}

// ─── Numerology helpers ───────────────────────────────────────────────────────

/**
 * Compute today's personal day number for the given birth date string (YYYY-MM-DD).
 */
export function computePersonalDay(birthDate: string): number {
  const today = new Date()
  const [, bMonth, bDay] = birthDate.split('-').map(Number)
  const sum =
    today.getDate() +
    (today.getMonth() + 1) +
    bMonth +
    bDay +
    Math.floor(today.getFullYear() / 1000) +
    Math.floor((today.getFullYear() % 1000) / 100) +
    Math.floor((today.getFullYear() % 100) / 10) +
    (today.getFullYear() % 10)
  let n = sum
  while (n > 9 && n !== 11 && n !== 22) {
    n = String(n).split('').reduce((a, d) => a + Number(d), 0)
  }
  return n
}

/**
 * Compute the current personal year number for the given birth date string (YYYY-MM-DD).
 */
export function computePersonalYear(birthDate: string): number {
  const today = new Date()
  const [, bMonth, bDay] = birthDate.split('-').map(Number)
  const sum =
    bMonth +
    bDay +
    Math.floor(today.getFullYear() / 1000) +
    Math.floor((today.getFullYear() % 1000) / 100) +
    Math.floor((today.getFullYear() % 100) / 10) +
    (today.getFullYear() % 10)
  let n = sum
  while (n > 9 && n !== 11 && n !== 22) {
    n = String(n).split('').reduce((a, d) => a + Number(d), 0)
  }
  return n
}

// ─── Engine context builder ───────────────────────────────────────────────────

/**
 * Build a TarotAstroContext from chartData and birthDate, with no transit
 * override (null is passed for transit data so the engine uses its defaults).
 */
export function buildEngineCtx(chartData: ChartData, birthDate: string): TarotAstroContext {
  return buildTarotAstroContext(
    chartData,
    null,
    computePersonalDay(birthDate),
    null,
  )
}

// ─── Transit data hook ────────────────────────────────────────────────────────

/**
 * Pre-computed transit context shared by all reading flows.
 * Provides daily and weekly TransitData objects and the derived values
 * (moon sign, formatted summaries) that each flow passes to its child
 * components or synthesis payloads.
 */
export interface TransitContext {
  dailyTransitData: TransitData
  weeklyTransitData: TransitData
  currentMoonSign: string
  dailyTransitSummary: string
  weeklyTransitSummary: string
}

/**
 * Compute and memoize daily + weekly transit data for a chart.
 * Call once per reading flow; derived values (moon sign, formatted summaries)
 * are computed here so every flow obtains them through the same code path.
 */
export function useTransitData(chartData: ChartData): TransitContext {
  const dailyTransitData = useMemo(() => calculateTransits(chartData, 'daily'), [chartData])
  const weeklyTransitData = useMemo(() => calculateTransits(chartData, 'weekly'), [chartData])

  const currentMoonSign = useMemo(
    () => dailyTransitData.currentPlanets.find(planet => planet.name === 'Moon')?.sign ?? '',
    [dailyTransitData],
  )

  const dailyTransitSummary = useMemo(
    () => formatTransitSummary(dailyTransitData, 'Daily'),
    [dailyTransitData],
  )

  const weeklyTransitSummary = useMemo(
    () => formatTransitSummary(weeklyTransitData, 'Weekly'),
    [weeklyTransitData],
  )

  return { dailyTransitData, weeklyTransitData, currentMoonSign, dailyTransitSummary, weeklyTransitSummary }
}
