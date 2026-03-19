import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import type { TransitData, TransitPeriod } from '../../engine/transits'
import type { PlanetName } from '../../engine/types'
import { PLANET_GLYPHS, ZODIAC_GLYPHS } from '../../engine/types'
import { formatPosition } from '../../engine/zodiac'
import DiscussModal from '../discuss/DiscussModal'

const PERIOD_LABELS: Record<TransitPeriod, string> = {
  daily: 'Daily Couple Reading',
  weekly: 'Weekly Couple Reading',
  monthly: 'Monthly Couple Reading',
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

function TransitAspectsToComposite({ transitData }: { transitData: TransitData }) {
  if (transitData.transitAspects.length === 0) return null

  const natureColor = (n: string) =>
    n === 'harmonious' ? 'text-green-400' : n === 'challenging' ? 'text-red-400' : 'text-mystic-gold'

  return (
    <Section title={`Transit Aspects to Composite (${transitData.transitAspects.length})`} defaultOpen>
      <p className="text-mystic-muted text-xs mb-3">How current transits affect the relationship as a whole</p>
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
                  Transit {a.transitPlanet} {a.type} Composite {a.natalPlanet}
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
    </Section>
  )
}

export default function SynastryTransitPage() {
  const { state, dispatch } = useApp()
  const { birthData, partnerBirthData, synastryTransitData, synastryTransitInterpretation, synastryTransitPeriod } = state
  const [discussOpen, setDiscussOpen] = useState(false)

  if (!synastryTransitData || !synastryTransitPeriod) return null

  const person1Label = birthData.city ? `${birthData.city.name}, ${birthData.city.country}` : ''
  const person2Label = partnerBirthData.city ? `${partnerBirthData.city.name}, ${partnerBirthData.city.country}` : ''

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
          <span>Person 1: {birthData.date} — {person1Label}</span>
          <span className="hidden sm:inline text-mystic-gold">✦</span>
          <span>Person 2: {partnerBirthData.date} — {person2Label}</span>
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

      <DiscussModal open={discussOpen} onClose={() => setDiscussOpen(false)} mode="synastry" />
    </div>
  )
}
