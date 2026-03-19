import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import type { TransitData, TransitPeriod } from '../../engine/transits'
import type { PlanetName, ZodiacSign } from '../../engine/types'
import { PLANET_GLYPHS, ZODIAC_GLYPHS } from '../../engine/types'
import { formatPosition } from '../../engine/zodiac'
import ChartWheel from '../chart/ChartWheel'
import DiscussModal from '../discuss/DiscussModal'

import { TRANSIT_RETROGRADE } from '../../data/interpretations/retrogrades'

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

function TransitAspectsSection({ transitData }: { transitData: TransitData }) {
  if (transitData.transitAspects.length === 0) return null

  const natureColor = (n: string) =>
    n === 'harmonious' ? 'text-green-400' : n === 'challenging' ? 'text-red-400' : 'text-mystic-gold'

  return (
    <Section title={`Transit Aspects (${transitData.transitAspects.length})`} defaultOpen>
      <div className="space-y-2">
        {transitData.transitAspects.map((a, i) => {
          const g1 = PLANET_GLYPHS[a.transitPlanet as PlanetName] ?? '☊'
          const g2 = PLANET_GLYPHS[a.natalPlanet as PlanetName] ?? '☊'
          return (
            <div key={i} className="flex items-center gap-2 py-2 border-b border-mystic-gold/5 last:border-0">
              <span className="text-lg">{g1}</span>
              <span className={`text-lg ${natureColor(a.nature)}`}>{a.symbol}</span>
              <span className="text-lg">{g2}</span>
              <div className="flex-1">
                <span className="text-mystic-text text-sm">
                  Transit {a.transitPlanet} {a.type} Natal {a.natalPlanet}
                </span>
              </div>
              <span className="text-mystic-muted text-xs">{a.orb}° orb</span>
              <span className={`text-xs px-2 py-0.5 rounded ${a.applying ? 'bg-mystic-gold/20 text-mystic-gold' : 'bg-mystic-surface text-mystic-muted'}`}>
                {a.applying ? 'applying' : 'separating'}
              </span>
            </div>
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
                  <span className="mr-2">{PLANET_GLYPHS[p.name as PlanetName] ?? '☊'}</span>
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

      {/* natal chart wheel for reference */}
      <div className="flex justify-center mb-10">
        <div className="w-full max-w-2xl">
          <ChartWheel chartData={chartData} aspects={aspects} />
          <p className="text-center text-mystic-muted text-xs mt-2">Your natal chart</p>
        </div>
      </div>

      {/* GPT interpretation */}
      {transitInterpretation && (
        <TransitInterpretation text={transitInterpretation} />
      )}

      {/* transit aspects to natal */}
      <TransitAspectsSection transitData={transitData} />

      {/* sign changes */}
      <IngressesSection transitData={transitData} />

      {/* retrograde activity */}
      <RetrogradeSection transitData={transitData} />

      {/* current planet positions */}
      <CurrentPlanetsTable transitData={transitData} />

      {/* navigation buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 mb-12">
        <button
          onClick={() => setDiscussOpen(true)}
          className="px-6 py-3 bg-mystic-blue/10 border border-mystic-blue/30 text-mystic-blue font-heading rounded-lg hover:bg-mystic-blue/20 transition-colors"
        >
          Discuss ✦
        </button>
        <button
          onClick={() => dispatch({ type: 'SET_VIEW', view: 'transit-select' })}
          className="px-6 py-3 bg-mystic-purple/10 border border-mystic-purple/30 text-mystic-purple font-heading rounded-lg hover:bg-mystic-purple/20 transition-colors"
        >
          ← Choose Another Reading
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
