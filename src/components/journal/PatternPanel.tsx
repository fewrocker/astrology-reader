import { useState, useEffect, useRef } from 'react'
import type { JournalEntry, JournalTag } from './types'
import { TAG_LABELS } from './types'
import type { ChartData } from '../../engine/types'
import type { BirthData } from '../../context/appState'
import { getTopActiveTransits } from '../../engine/transits'
import { getMoonSignAndPhase, resolveToUTC } from '../../engine/astronomy'
import { generateCosmicPatternReading, getStoredApiKey } from '../../services/gptInterpretation'
import type { PatternSummary, PatternReading } from '../../services/gptInterpretation'

interface PatternPanelProps {
  entries: JournalEntry[]
  chartData: ChartData
  birthData: BirthData
}

const SLOW_PLANETS = new Set(['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'])

interface TagGroupData {
  tag: JournalTag
  entries: JournalEntry[]
  planetCounts: Map<string, number>
  phaseCounts: Map<string, number>
  personalDayCounts: Map<number, number>
}

interface PatternCardData {
  tag: JournalTag
  heading: string
  dates: string[]
  dominantPlanets: string[]
  dominantPhases: string[]
  dominantPersonalDays: number[]
  sampleSize: number
  gptBody?: string
}

function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[m - 1]} ${d}`
}

function tagToHeading(tag: JournalTag): string {
  const headings: Record<JournalTag, string> = {
    'breakthrough': 'Jupiter at Your Thresholds',
    'turning-point': 'Saturn at the Crossroads',
    'grief': 'Moon in the Dark',
    'love': 'Venus Opens the Heart',
    'decision': 'Mercury at the Fork',
    'creative-peak': 'Sun in Full Expression',
    'dream': 'Neptune Speaks',
    'blocked': 'Saturn Demands Patience',
  }
  return headings[tag] ?? `${TAG_LABELS[tag]} Pattern`
}

export default function PatternPanel({ entries, chartData, birthData }: PatternPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [patternCards, setPatternCards] = useState<PatternCardData[]>([])
  const [aggregationDone, setAggregationDone] = useState(false)
  const [gptReading, setGptReading] = useState<PatternReading[] | null>(null)
  const [gptLoading, setGptLoading] = useState(false)
  const gptFiredRef = useRef(false)

  // Build tag group data on mount
  useEffect(() => {
    if (entries.length < 5) return

    const tagGroups = new Map<JournalTag, JournalEntry[]>()
    for (const entry of entries) {
      for (const tag of entry.tags) {
        const group = tagGroups.get(tag) ?? []
        group.push(entry)
        tagGroups.set(tag, group)
      }
    }

    const groups: TagGroupData[] = []
    for (const [tag, tagEntries] of tagGroups) {
      groups.push({
        tag,
        entries: tagEntries,
        planetCounts: new Map(),
        phaseCounts: new Map(),
        personalDayCounts: new Map(),
      })
    }

    // Count personal days synchronously from stored data
    for (const group of groups) {
      for (const entry of group.entries) {
        const pd = entry.numerologicalDay
        group.personalDayCounts.set(pd, (group.personalDayCounts.get(pd) ?? 0) + 1)
      }
    }

    // Queue transit recomputation via requestAnimationFrame
    let entryIndex = 0
    let groupIndex = 0

    const processNext = () => {
      if (groupIndex >= groups.length) {
        // All done — compute final pattern cards
        const cards: PatternCardData[] = []

        for (const group of groups) {
          const size = group.entries.length
          const threshold8 = size >= 8

          // Find dominant planets (>= 40% for full groups, all for < 8)
          const dominantPlanets: string[] = []
          for (const [planet, count] of group.planetCounts) {
            const weight = SLOW_PLANETS.has(planet) ? 0.6 : 1.0
            const effectiveCount = count * weight
            if (threshold8 && effectiveCount / size >= 0.4) dominantPlanets.push(planet)
            else if (!threshold8 && effectiveCount / size >= 0.2) dominantPlanets.push(planet)
          }
          dominantPlanets.sort((a, b) =>
            (group.planetCounts.get(b) ?? 0) - (group.planetCounts.get(a) ?? 0)
          )

          // Find dominant moon phases (>= 30%)
          const dominantPhases: string[] = []
          for (const [phase, count] of group.phaseCounts) {
            if (count / size >= 0.3) dominantPhases.push(phase)
          }

          // Find dominant personal days (>= 35%)
          const dominantPersonalDays: number[] = []
          for (const [day, count] of group.personalDayCounts) {
            if (count / size >= 0.35) dominantPersonalDays.push(day)
          }

          cards.push({
            tag: group.tag,
            heading: tagToHeading(group.tag),
            dates: group.entries.map(e => e.date),
            dominantPlanets: dominantPlanets.slice(0, 3),
            dominantPhases: dominantPhases.slice(0, 2),
            dominantPersonalDays: dominantPersonalDays.slice(0, 3),
            sampleSize: size,
          })
        }

        // Also compute a "strongest planet" across all entries for < 8 threshold
        if (cards.length === 0) {
          const allPlanetCounts = new Map<string, number>()
          for (const group of groups) {
            for (const [planet, count] of group.planetCounts) {
              allPlanetCounts.set(planet, (allPlanetCounts.get(planet) ?? 0) + count)
            }
          }
          // No pattern cards but we have entries — add summary card
          if (allPlanetCounts.size > 0) {
            const topPlanet = [...allPlanetCounts.entries()].sort((a, b) => b[1] - a[1])[0]
            cards.push({
              tag: 'breakthrough',
              heading: 'Emerging Pattern',
              dates: entries.slice(0, 5).map(e => e.date),
              dominantPlanets: topPlanet ? [topPlanet[0]] : [],
              dominantPhases: [],
              dominantPersonalDays: [],
              sampleSize: entries.length,
            })
          }
        }

        setPatternCards(cards)
        setAggregationDone(true)
        return
      }

      const group = groups[groupIndex]
      const entry = group.entries[entryIndex]

      if (entry) {
        // Process this entry
        try {
          const [y, mo, d] = entry.date.split('-').map(Number)
          const [h, min] = (entry.time || '12:00').split(':').map(Number)
          const tz = birthData.city?.tz || 'UTC'
          const entryDate = resolveToUTC(y, mo, d, h, min, tz)

          const topTransits = getTopActiveTransits(chartData, 20, 10, entryDate)
          for (const t of topTransits) {
            group.planetCounts.set(
              t.transitPlanet,
              (group.planetCounts.get(t.transitPlanet) ?? 0) + 1
            )
          }

          const moon = getMoonSignAndPhase(entryDate)
          group.phaseCounts.set(moon.phase, (group.phaseCounts.get(moon.phase) ?? 0) + 1)
        } catch {
          // silently skip failed entries
        }
      }

      entryIndex++
      if (entryIndex >= group.entries.length) {
        groupIndex++
        entryIndex = 0
      }

      requestAnimationFrame(processNext)
    }

    if (groups.length > 0) {
      requestAnimationFrame(processNext)
    } else {
      setAggregationDone(true)
    }
  }, [entries.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fire GPT on first expand
  useEffect(() => {
    if (!expanded || gptFiredRef.current || !aggregationDone) return
    if (patternCards.length === 0) return

    const apiKey = getStoredApiKey()
    if (!apiKey) return

    gptFiredRef.current = true
    setGptLoading(true)

    const patterns: PatternSummary[] = patternCards.map(card => ({
      tagGroup: card.tag,
      dominantPlanets: card.dominantPlanets,
      dominantPhases: card.dominantPhases,
      dominantPersonalDays: card.dominantPersonalDays,
      sampleSize: card.sampleSize,
      entryDates: card.dates.slice(0, 8),
    }))

    generateCosmicPatternReading(patterns, chartData, entries.length, apiKey)
      .then(readings => {
        setGptReading(readings)
      })
      .catch(() => {
        // silently fail
      })
      .finally(() => {
        setGptLoading(false)
      })
  }, [expanded, aggregationDone, patternCards, chartData, entries.length])

  // Not enough entries
  if (entries.length < 5) return null

  // Get top planet across all entries for summary line
  const getTopPatternSummary = (): string => {
    if (patternCards.length === 0) return 'Your patterns are emerging.'
    const topCard = patternCards.find(c => c.dominantPlanets.length > 0)
    if (topCard) {
      return `${topCard.dominantPlanets[0]} appears in ${topCard.sampleSize} of your entries — a recurring cosmic signature.`
    }
    return `${patternCards[0].sampleSize} entries recorded — patterns are forming.`
  }

  return (
    <div className="bg-mystic-surface/50 border border-mystic-border rounded-xl mb-6 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <p className="text-mystic-muted/60 text-xs uppercase tracking-widest mb-3">what the cosmos reveals</p>

        {/* Collapsed state: summary line */}
        <div className="flex items-center justify-between">
          <p className="text-mystic-text/70 text-sm flex-1 pr-4">
            {aggregationDone ? getTopPatternSummary() : (
              <span className="flex items-center gap-2">
                <span className="animate-pulse text-mystic-gold">✦</span>
                <span className="text-mystic-muted/60">Reading your patterns…</span>
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={() => setExpanded(e => !e)}
            className="text-mystic-muted/50 hover:text-mystic-gold transition-colors text-lg leading-none flex-shrink-0"
            aria-label={expanded ? 'Collapse patterns' : 'Expand patterns'}
          >
            {expanded ? '▴' : '▾'}
          </button>
        </div>
      </div>

      {/* Expanded state */}
      {expanded && (
        <div className="border-t border-mystic-border/30">
          {!aggregationDone && (
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 text-mystic-muted/60 text-sm">
                <span className="animate-spin" style={{ animationDuration: '3s' }}>✦</span>
                <span>Computing your cosmic patterns…</span>
              </div>
              <div className="mt-3 space-y-2">
                <div className="h-4 w-2/3 bg-mystic-surface rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-mystic-surface rounded animate-pulse" />
              </div>
            </div>
          )}

          {aggregationDone && patternCards.length === 0 && (
            <div className="px-5 py-4 text-center">
              <p className="text-mystic-muted/60 text-sm">
                Your cosmic patterns will surface after a few more entries.
              </p>
            </div>
          )}

          {aggregationDone && patternCards.map((card, i) => {
            const gptCard = gptReading?.find(r => r.tagGroup === card.tag)
            const hasEnoughForPattern = card.sampleSize >= 8

            return (
              <div
                key={card.tag}
                className={`px-5 py-4 ${i < patternCards.length - 1 ? 'border-b border-mystic-border/30' : ''}`}
              >
                <h4 className="text-mystic-gold font-heading text-sm mb-1">
                  {gptCard?.heading ?? card.heading}
                </h4>

                <p className="text-mystic-muted/60 text-xs mb-2">
                  {card.dates.slice(0, 5).map(formatDate).join(' · ')}
                  {card.dates.length > 5 ? ` · +${card.dates.length - 5} more` : ''}
                </p>

                {!hasEnoughForPattern && (
                  <p className="text-mystic-muted/50 text-xs italic mb-1">
                    {card.sampleSize} {TAG_LABELS[card.tag].toLowerCase()} entries logged — patterns emerge at 8.
                  </p>
                )}

                {hasEnoughForPattern && (
                  <>
                    {gptLoading && !gptCard && (
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-full bg-mystic-surface rounded animate-pulse" />
                        <div className="h-3.5 w-4/5 bg-mystic-surface rounded animate-pulse" />
                      </div>
                    )}
                    {gptCard?.body && (
                      <p className="text-mystic-muted/80 text-sm leading-relaxed">{gptCard.body}</p>
                    )}
                    {!gptLoading && !gptCard && !getStoredApiKey() && (
                      <p className="text-mystic-muted/40 text-xs italic">
                        Add an API key to unlock pattern synthesis.
                      </p>
                    )}
                    {card.dominantPlanets.length > 0 && !gptCard && !gptLoading && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {card.dominantPlanets.map(p => (
                          <span key={p} className="text-xs text-mystic-muted/50 bg-mystic-surface/80 rounded px-2 py-0.5">
                            {p}
                          </span>
                        ))}
                        {card.dominantPersonalDays.map(d => (
                          <span key={d} className="text-xs text-mystic-gold/50 bg-mystic-gold/5 rounded px-2 py-0.5">
                            Day {d}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
