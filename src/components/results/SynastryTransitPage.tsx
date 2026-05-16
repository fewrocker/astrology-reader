import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import { resolvePersonLabel } from '../../context/appState'
import type { TransitData, TransitPeriod } from '../../engine/transits'
import type { PlanetName } from '../../engine/types'
import { ZODIAC_GLYPHS, getBodyGlyph } from '../../engine/types'
import { formatPosition } from '../../engine/zodiac'
import DiscussModal from '../discuss/DiscussModal'
import { CurrentMoonWidget } from '../reading/MoonPhaseWidget'
import { track } from '../../services/analytics'
import CollapsibleSection from '../ui/CollapsibleSection'
import AspectRow from '../reading/AspectRow'
import { computeTransitAspectBrief } from '../../data/interpretations/transitAspectBriefs'
import CoupleAdvanceTab from '../reading/CoupleAdvanceTab'

const PERIOD_LABELS: Record<TransitPeriod, string> = {
  daily: 'Daily Couple Reading',
  weekly: 'Weekly Couple Reading',
  monthly: 'Monthly Couple Reading',
}

function TransitAspectsToComposite({ transitData }: { transitData: TransitData }) {
  if (transitData.transitAspects.length === 0) return null

  return (
    <CollapsibleSection title={`Transit Aspects to Composite (${transitData.transitAspects.length})`} defaultOpen>
      <p className="text-mystic-muted text-xs mb-3">How current transits affect the relationship as a whole</p>
      <div>
        {transitData.transitAspects.map((a, i) => {
          // Composite planets have house: 0 — computeTransitAspectBrief falls to generic ASPECT_BRIEFS fallback.
          // When composite house calculation is implemented, briefs will auto-upgrade via the fallback chain.
          // At that point, subject ("your") will need to be adapted for composite voice.
          const rawBrief = computeTransitAspectBrief(
            a.transitPlanet as PlanetName,
            a.type,
            a.natalPlanet as PlanetName,
            a.natalHouse ?? null,
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
    </CollapsibleSection>
  )
}

function CurrentPlanetsTable({ transitData }: { transitData: TransitData }) {
  return (
    <CollapsibleSection title="Current Planet Positions">
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
                <td className="px-3 py-2 text-mystic-gold">{ZODIAC_GLYPHS[p.sign]} {p.sign}</td>
                <td className="px-3 py-2 text-mystic-muted">{formatPosition(p)}</td>
                <td className="px-3 py-2 text-mystic-muted">
                  {p.retrograde ? <span className="text-red-400">℞ Retrograde</span> : 'Direct'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CollapsibleSection>
  )
}

export default function SynastryTransitPage() {
  const { state, dispatch } = useApp()
  const {
    birthData, partnerBirthData,
    chartData, partnerChartData, synastryData,
    synastryTransitData, synastryTransitInterpretation, synastryTransitPeriod,
  } = state
  const [discussOpen, setDiscussOpen] = useState(false)

  // Stable base date reference for CoupleAdvanceTab cache key
  const baseDate = useMemo(() => new Date(), [])

  useEffect(() => {
    track('reading_viewed', { reading_type: 'synastry_transit', period: synastryTransitPeriod ?? undefined })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!synastryTransitData || !synastryTransitPeriod) return null

  const label1 = resolvePersonLabel(birthData)
  const label2 = resolvePersonLabel(partnerBirthData)
  const person1CityStr = birthData.city ? `${birthData.city.name}, ${birthData.city.country}` : ''
  const person2CityStr = partnerBirthData.city ? `${partnerBirthData.city.name}, ${partnerBirthData.city.country}` : ''

  const formatDateDisplay = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-block px-4 py-1 rounded-full bg-pink-900/30 border border-pink-500/30 text-pink-400 text-xs uppercase tracking-widest mb-3">
          {PERIOD_LABELS[synastryTransitPeriod]}
        </div>
        <h2 className="font-heading text-3xl text-mystic-gold mb-2">Couple Transit Reading</h2>
        <p className="text-mystic-muted text-sm">
          {synastryTransitPeriod === 'daily'
            ? formatDateDisplay(synastryTransitData.dateRange.start)
            : `${formatDateDisplay(synastryTransitData.dateRange.start)} — ${formatDateDisplay(synastryTransitData.dateRange.end)}`
          }
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center text-mystic-muted text-xs mt-1">
          <span>{label1}{person1CityStr ? ` — ${person1CityStr}` : ''}</span>
          <span className="hidden sm:inline text-mystic-gold">✦</span>
          <span>{label2}{person2CityStr ? ` — ${person2CityStr}` : ''}</span>
        </div>
      </div>

      {/* GPT interpretation */}
      {synastryTransitInterpretation && (
        <div className="mb-8">
          <h2 className="font-heading text-2xl text-mystic-gold mb-4">✦ Your Couple Reading</h2>
          <div className="bg-mystic-gold/5 rounded-lg p-6 border border-mystic-gold/20 space-y-4">
            {synastryTransitInterpretation.split('\n').filter(p => p.trim()).map((p, i) => (
              <p key={i} className="text-mystic-text/90 leading-relaxed text-sm">{p}</p>
            ))}
          </div>
        </div>
      )}

      {/* Look Ahead — couple advance tab (spec 5.1) */}
      {chartData && partnerChartData && synastryData && (
        <div className="mb-8">
          <div className="mb-4">
            <h2 className="font-heading text-2xl text-mystic-gold">Look Ahead</h2>
            <p className="text-mystic-muted text-sm mt-1">Notable moments ahead for this relationship</p>
          </div>
          <CoupleAdvanceTab
            chart1={chartData}
            chart2={partnerChartData}
            synastryData={synastryData}
            period={synastryTransitPeriod}
            baseDate={baseDate}
          />
        </div>
      )}

      {/* current moon phase */}
      <CurrentMoonWidget date={new Date(synastryTransitData.dateRange.start + 'T12:00:00')} />

      {/* Transit aspects to composite */}
      <TransitAspectsToComposite transitData={synastryTransitData} />

      {/* Current planet positions */}
      <CurrentPlanetsTable transitData={synastryTransitData} />

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 mb-12">
        <button
          onClick={() => setDiscussOpen(true)}
          className="px-6 py-3 bg-mystic-blue/10 border border-mystic-blue/30 text-mystic-blue font-heading rounded-lg hover:bg-mystic-blue/20 transition-colors"
        >
          Discuss ✦
        </button>
        <button
          onClick={() => dispatch({ type: 'SET_VIEW', view: 'synastry-transit-select' })}
          className="px-6 py-3 bg-mystic-purple/10 border border-mystic-purple/30 text-mystic-purple font-heading rounded-lg hover:bg-mystic-purple/20 transition-colors"
        >
          ← Choose Another Period
        </button>
        <button
          onClick={() => dispatch({ type: 'SET_VIEW', view: 'synastry-results' })}
          className="px-6 py-3 bg-mystic-gold/10 border border-mystic-gold/30 text-mystic-gold font-heading rounded-lg hover:bg-mystic-gold/20 transition-colors"
        >
          View Compatibility
        </button>
      </div>

      <DiscussModal open={discussOpen} onClose={() => setDiscussOpen(false)} mode="synastry-transit" />
    </div>
  )
}
