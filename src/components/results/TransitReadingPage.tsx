import { useState, useMemo, useEffect, useRef, useTransition } from 'react'
import { useApp } from '../../context/AppContext'
import type { TransitData, TransitPeriod } from '../../engine/transits'
import { assignTransitHouses, buildTransitPrompt } from '../../engine/transits'
import { buildTransitTimeline } from '../../engine/transitTimeline'
import type { ChartData, PlanetName, ZodiacSign } from '../../engine/types'
import { PLANET_GLYPHS, ZODIAC_GLYPHS, getBodyGlyph } from '../../engine/types'
import { formatPosition } from '../../engine/zodiac'
import ChartWheel from '../chart/ChartWheel'
import TransitTimeline from '../reading/TransitTimeline'
import AdvanceTab from '../reading/AdvanceTab'
import AspectRow from '../reading/AspectRow'
import DiscussModal from '../discuss/DiscussModal'
import { CurrentMoonWidget } from '../reading/MoonPhaseWidget'
import GptSkeleton from '../ui/GptSkeleton'
import { isGptError, getGptErrorMessage, GPT_TIMEOUT } from '../../services/gptErrors'
import { getGptInterpretation } from '../../services/gptInterpretation'
import { track } from '../../services/analytics'
import type { AdvanceSnapshot, MarkerCategory } from '../reading/AdvanceTab'
import { preCalculateSnapshots, advanceSnapshotSessionCache } from '../reading/AdvanceTab'

import { TRANSIT_RETROGRADE } from '../../data/interpretations/retrogrades'
import { computeTransitAspectBrief } from '../../data/interpretations/transitAspectBriefs'
import { LruMap } from '../../utils/lruMap'

const PERIOD_LABELS: Record<TransitPeriod, string> = {
  daily: 'Daily Reading',
  weekly: 'Weekly Reading',
  monthly: 'Monthly Reading',
}

const PERIOD_DESCRIPTIONS: Record<TransitPeriod, string> = {
  daily: 'What the stars have in store for you today',
  weekly: 'Key energies and themes for your week ahead',
  monthly: 'Major influences shaping your month',
}

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-mystic-gold/20 rounded-lg overflow-hidden mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 bg-mystic-gold/5 hover:bg-mystic-gold/10 transition-colors text-left"
      >
        <span className="font-heading text-lg text-mystic-gold">{title}</span>
        <span className="text-mystic-muted text-xl transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>
      {open && <div className="px-5 py-4">{children}</div>}
    </div>
  )
}

function TransitInterpretation({ text }: { text: string }) {
  const paragraphs = text.split('\n').filter(p => p.trim().length > 0)
  return (
    <div className="mb-8">
      <h2 className="font-heading text-2xl text-mystic-gold mb-4">✦ Your Reading</h2>
      <div className="bg-mystic-gold/5 rounded-lg p-6 border border-mystic-gold/20 space-y-4">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-mystic-text/90 leading-relaxed text-sm">{p}</p>
        ))}
      </div>
    </div>
  )
}

function TransitAspectsSection({
  transitData,
  chartData,
}: {
  transitData: TransitData
  chartData: ChartData
}) {
  if (transitData.transitAspects.length === 0) return null

  return (
    <Section title={`Transit Aspects (${transitData.transitAspects.length})`} defaultOpen>
      <div>
        {transitData.transitAspects.map((a, i) => {
          // Spec 9: unknownTime guard — house is null when time is unknown
          // Spec 10: natal planet house lookup with house-0 guard (spec 17)
          const rawHouse = chartData.unknownTime
            ? null
            : (chartData.planets.find(p => p.name === a.natalPlanet)?.house ?? null)
          const natalHouse = rawHouse && rawHouse > 0 ? rawHouse : null

          const brief = computeTransitAspectBrief(
            a.transitPlanet as (PlanetName | 'NorthNode'),
            a.type,
            a.natalPlanet as (PlanetName | 'NorthNode'),
            natalHouse,
            a.nature,
            a.applying,
          )

          return (
            <AspectRow
              key={i}
              transitPlanet={a.transitPlanet}
              natalPlanet={a.natalPlanet}
              aspectType={a.type}
              nature={a.nature}
              symbol={a.symbol}
              orb={a.orb}
              applying={a.applying}
              brief={brief}
            />
          )
        })}
      </div>
    </Section>
  )
}

function IngressesSection({ transitData }: { transitData: TransitData }) {
  const ingresses = transitData.ingresses.filter(i => i.planet !== 'Moon')
  if (ingresses.length === 0) return null

  return (
    <Section title="Sign Changes">
      <div className="space-y-3">
        {ingresses.map((ing, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-mystic-gold/5 last:border-0">
            <span className="text-lg">{PLANET_GLYPHS[ing.planet]}</span>
            <div className="flex-1">
              <span className="text-mystic-text text-sm font-medium">{ing.planet}</span>
              <span className="text-mystic-muted text-sm"> enters </span>
              <span className="text-mystic-gold text-sm">{ZODIAC_GLYPHS[ing.toSign as ZodiacSign]} {ing.toSign}</span>
            </div>
            <span className="text-mystic-muted text-xs">{ing.approximateDate}</span>
          </div>
        ))}
      </div>
    </Section>
  )
}

function RetrogradeSection({ transitData }: { transitData: TransitData }) {
  const active = transitData.retrogrades.filter(r => r.isRetro || r.status.includes('Stationing'))
  if (active.length === 0) return null

  return (
    <Section title="Retrograde Activity">
      <div className="space-y-3">
        {active.map((r, i) => {
          const interp = TRANSIT_RETROGRADE[r.planet]
          return (
            <div key={i} className="border border-red-500/15 bg-red-900/5 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-lg">{PLANET_GLYPHS[r.planet]}</span>
                <span className="text-mystic-text text-sm font-medium">{r.planet}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${r.isRetro ? 'bg-red-900/30 text-red-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                  {r.status}
                </span>
              </div>
              {interp && (
                <div className="ml-8">
                  <p className="text-red-400/80 text-xs font-medium mb-1">{interp.brief}</p>
                  <p className="text-mystic-text/80 text-sm leading-relaxed">{interp.detail}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Section>
  )
}

function CurrentPlanetsTable({ transitData }: { transitData: TransitData }) {
  return (
    <Section title="Current Planet Positions">
      <div className="overflow-x-auto">
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
            {transitData.currentPlanets.filter(p => p.name !== 'NorthNode').map((p) => (
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
    </Section>
  )
}

export default function TransitReadingPage() {
  const { state, dispatch } = useApp()
  const { chartData, aspects, transitData, transitInterpretation, transitPeriod, birthData } = state
  const [discussOpen, setDiscussOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'reading' | 'timeline' | 'advance'>('reading')
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    track('reading_viewed', { reading_type: 'transit', period: transitPeriod ?? undefined })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRetryGpt() {
    if (!chartData || !transitData || !transitPeriod || retrying) return
    setRetrying(true)
    const prompt = buildTransitPrompt(chartData, transitData, birthData.date, transitPeriod, state.transitTargetMonth ?? undefined)
    const interpretation = await getGptInterpretation(prompt)
    dispatch({ type: 'SET_TRANSIT_INTERPRETATION', interpretation })
    setRetrying(false)
  }

  const housedTransitPlanets = useMemo(
    () => chartData && transitData ? assignTransitHouses(transitData.currentPlanets, chartData.houses) : [],
    [transitData?.currentPlanets, chartData?.houses]
  )

  const timelineDays = useMemo(
    () => {
      if (!chartData || !transitPeriod) return []
      return buildTransitTimeline(chartData, transitPeriod, state.transitTargetMonth ?? undefined)
    },
    [chartData, transitPeriod, state.transitTargetMonth]
  )

  // ── Lifted snapshot state (shared between AdvanceTab and TransitTimeline) ───
  // The snapshot cache lives here so that snapshots computed when the user visits
  // the Advance tab are available to the Timeline tab without recomputation.
  // The Timeline only consumes the derived scoreByDate map — it never triggers its
  // own snapshot computation. First-time Timeline viewers whose session has not yet
  // activated the Advance tab will see the event-count heuristic as a graceful fallback.
  const snapshotCache = useRef<LruMap<string, AdvanceSnapshot[]>>(new LruMap(6))
  const [advanceSnapshots, setAdvanceSnapshots] = useState<AdvanceSnapshot[]>([])
  const [advanceIsPending, startAdvanceTransition] = useTransition()

  useEffect(() => {
    if (!chartData || !transitPeriod || !transitData) return
    const baseDate = new Date(transitData.dateRange.start + 'T12:00:00')
    const chartKey = `${chartData.angles.ascendant.longitude.toFixed(4)}:${chartData.angles.midheaven.longitude.toFixed(4)}:${chartData.unknownTime}`
    const cacheKey = `${chartKey}:${transitPeriod}:${baseDate.toISOString()}`
    const cached = snapshotCache.current.get(cacheKey)
    if (cached) {
      setAdvanceSnapshots(cached)
      return
    }
    startAdvanceTransition(() => {
      const computed = preCalculateSnapshots(chartData, transitPeriod, baseDate)
      snapshotCache.current.set(cacheKey, computed)
      advanceSnapshotSessionCache.set(cacheKey, computed)
      setAdvanceSnapshots(computed)
    })
  }, [chartData, transitPeriod, transitData])

  // Derive a date→category map from non-neutral snapshots for the Timeline to consume.
  const scoreByDate = useMemo(() => {
    const m = new Map<string, MarkerCategory>()
    for (const s of advanceSnapshots) {
      if (s.score.category !== 'neutral') m.set(s.dateStr, s.score.category)
    }
    return m
  }, [advanceSnapshots])

  if (!chartData || !transitData || !transitPeriod) return null

  const cityLabel = birthData.city ? `${birthData.city.name}, ${birthData.city.country}` : ''

  const formatDateDisplay = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* header */}
      <div className="text-center mb-8">
        <div className="inline-block px-4 py-1 rounded-full bg-mystic-purple/20 border border-mystic-purple/30 text-mystic-purple text-xs uppercase tracking-widest mb-3">
          {PERIOD_LABELS[transitPeriod]}
        </div>
        <h2 className="font-heading text-3xl text-mystic-gold mb-1">
          {PERIOD_DESCRIPTIONS[transitPeriod]}
        </h2>
        <p className="text-mystic-muted text-sm">
          {transitPeriod === 'daily'
            ? formatDateDisplay(transitData.dateRange.start)
            : `${formatDateDisplay(transitData.dateRange.start)} — ${formatDateDisplay(transitData.dateRange.end)}`
          }
        </p>
        <p className="text-mystic-muted text-xs mt-1">
          Based on your birth chart · {birthData.date} · {cityLabel}
        </p>
      </div>

      {/* natal chart wheel with transit overlay (hidden on Advance tab which has its own) */}
      {activeTab !== 'advance' && (
        <div className="flex justify-center mb-6">
          <div className="w-full max-w-2xl">
            <ChartWheel
              chartData={chartData}
              aspects={aspects}
              transitPlanets={housedTransitPlanets}
              transitAspects={transitData.transitAspects}
            />
            <p className="text-center text-mystic-muted text-xs mt-2">Your natal chart with current transits</p>
          </div>
        </div>
      )}

      {/* Tab toggle: Reading / Timeline */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex bg-mystic-surface/50 border border-mystic-border rounded-lg p-1">
          <button
            onClick={() => setActiveTab('reading')}
            className={`px-5 py-2 text-sm font-heading rounded-md transition-colors ${
              activeTab === 'reading'
                ? 'bg-mystic-gold/20 text-mystic-gold border border-mystic-gold/30'
                : 'text-mystic-muted hover:text-mystic-text border border-transparent'
            }`}
          >
            ✦ Reading
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-5 py-2 text-sm font-heading rounded-md transition-colors ${
              activeTab === 'timeline'
                ? 'bg-mystic-purple/20 text-mystic-purple border border-mystic-purple/30'
                : 'text-mystic-muted hover:text-mystic-text border border-transparent'
            }`}
          >
            ◆ Timeline
          </button>
          <button
            onClick={() => setActiveTab('advance')}
            className={`px-5 py-2 text-sm font-heading rounded-md transition-colors ${
              activeTab === 'advance'
                ? 'bg-mystic-blue/20 text-mystic-blue border border-mystic-blue/30'
                : 'text-mystic-muted hover:text-mystic-text border border-transparent'
            }`}
          >
            ◆ Advance
          </button>
        </div>
      </div>

      {/* Reading tab content */}
      {activeTab === 'reading' && (
        <>
          {/* current moon phase */}
          <CurrentMoonWidget date={new Date(transitData.dateRange.start + 'T12:00:00')} />

          {/* GPT interpretation */}
          {transitInterpretation === null || retrying ? (
            <GptSkeleton label="Consulting the stars..." accentColor="gold" />
          ) : isGptError(transitInterpretation) ? (
            <div className="bg-mystic-surface/50 border border-mystic-border rounded-xl p-6 text-center space-y-3 mb-6">
              <p className="text-mystic-muted text-sm">{getGptErrorMessage(transitInterpretation)}</p>
              <button
                type="button"
                onClick={handleRetryGpt}
                className="text-mystic-gold text-sm font-heading hover:text-mystic-gold/80 transition-colors"
              >
                {transitInterpretation === GPT_TIMEOUT ? '✦ Try again' : '✦ Ask again'}
              </button>
            </div>
          ) : (
            <TransitInterpretation text={transitInterpretation} />
          )}

          {/* transit aspects to natal */}
          <TransitAspectsSection transitData={transitData} chartData={chartData} />

          {/* sign changes */}
          <IngressesSection transitData={transitData} />

          {/* retrograde activity */}
          <RetrogradeSection transitData={transitData} />

          {/* current planet positions */}
          <CurrentPlanetsTable transitData={transitData} />
        </>
      )}

      {/* Timeline tab content */}
      {activeTab === 'timeline' && (
        <div className="mb-8">
          <h2 className="font-heading text-2xl text-mystic-purple mb-4">◆ Transit Timeline</h2>
          <p className="text-mystic-muted text-sm mb-6">
            Key astrological events for your {transitPeriod} period — when each transit perfects, planets change signs, and lunar phases occur.
          </p>
          <TransitTimeline days={timelineDays} scoreByDate={scoreByDate.size > 0 ? scoreByDate : undefined} />
        </div>
      )}

      {/* Advance tab content */}
      {activeTab === 'advance' && (
        <div className="mb-8">
          <AdvanceTab
            chartData={chartData}
            aspects={aspects}
            period={transitPeriod}
            baseDate={new Date(transitData.dateRange.start + 'T12:00:00')}
            snapshots={advanceSnapshots.length > 0 ? advanceSnapshots : undefined}
            isPending={advanceIsPending}
          />
        </div>
      )}

      {/* navigation buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 mb-12">
        {transitInterpretation !== null && !isGptError(transitInterpretation) && (
          <button
            onClick={() => setDiscussOpen(true)}
            className="px-6 py-3 bg-mystic-blue/10 border border-mystic-blue/30 text-mystic-blue font-heading rounded-lg hover:bg-mystic-blue/20 transition-colors"
          >
            Discuss ✦
          </button>
        )}
        <button
          onClick={() => dispatch({ type: 'SET_VIEW', view: 'form' })}
          className="px-6 py-3 bg-mystic-purple/10 border border-mystic-purple/30 text-mystic-purple font-heading rounded-lg hover:bg-mystic-purple/20 transition-colors"
        >
          ← Home
        </button>
        <button
          onClick={() => dispatch({ type: 'SET_VIEW', view: 'results' })}
          className="px-6 py-3 bg-mystic-gold/10 border border-mystic-gold/30 text-mystic-gold font-heading rounded-lg hover:bg-mystic-gold/20 transition-colors"
        >
          View Birth Chart
        </button>
        <button
          onClick={() => dispatch({ type: 'RESET' })}
          className="px-6 py-3 bg-mystic-surface border border-mystic-border text-mystic-muted font-heading rounded-lg hover:border-mystic-gold/40 hover:text-mystic-text transition-colors"
        >
          New Birth Data
        </button>
      </div>

      <DiscussModal open={discussOpen} onClose={() => setDiscussOpen(false)} mode="transit" />
    </div>
  )
}
