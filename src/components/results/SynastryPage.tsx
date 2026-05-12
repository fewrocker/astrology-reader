import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import type { PlanetName, ZodiacSign } from '../../engine/types'
import { PLANET_GLYPHS, ZODIAC_GLYPHS } from '../../engine/types'
import { formatPosition } from '../../engine/zodiac'
import type { SynastryData, SynastryAspect, HouseOverlayEntry } from '../../engine/synastry'
import ChartWheel from '../chart/ChartWheel'
import DiscussModal from '../discuss/DiscussModal'
import { CurrentMoonWidget } from '../reading/MoonPhaseWidget'

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

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-mystic-text text-sm w-32 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-mystic-surface rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-mystic-muted text-xs w-8 text-right">{value}%</span>
    </div>
  )
}

function CompatibilitySection({ synastryData }: { synastryData: SynastryData }) {
  const { compatibility } = synastryData
  return (
    <div className="mb-8">
      <h2 className="font-heading text-2xl text-mystic-gold mb-4">✦ Compatibility Overview</h2>
      <div className="bg-mystic-gold/5 rounded-lg p-6 border border-mystic-gold/20">
        {/* Overall score */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-2 border-mystic-gold/40 mb-2">
            <span className="font-heading text-3xl text-mystic-gold">{compatibility.overall}</span>
          </div>
          <p className="text-mystic-muted text-xs uppercase tracking-wider">Overall Resonance</p>
        </div>

        {/* Score bars */}
        <ScoreBar label="Romantic ♡" value={compatibility.romantic} color="bg-pink-500" />
        <ScoreBar label="Emotional ☽" value={compatibility.emotional} color="bg-blue-400" />
        <ScoreBar label="Communication ☿" value={compatibility.communication} color="bg-yellow-400" />
        <ScoreBar label="Growth ♃" value={compatibility.growth} color="bg-green-400" />
        <ScoreBar label="Challenge ♄" value={compatibility.challenge} color="bg-red-400" />

        {/* Aspect counts */}
        <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-mystic-gold/10">
          <div className="text-center">
            <span className="text-green-400 font-heading text-lg">{compatibility.harmoniousCount}</span>
            <p className="text-mystic-muted text-xs">Harmonious</p>
          </div>
          <div className="text-center">
            <span className="text-mystic-gold font-heading text-lg">{compatibility.neutralCount}</span>
            <p className="text-mystic-muted text-xs">Neutral</p>
          </div>
          <div className="text-center">
            <span className="text-red-400 font-heading text-lg">{compatibility.challengingCount}</span>
            <p className="text-mystic-muted text-xs">Challenging</p>
          </div>
        </div>

        {/* Element & modality */}
        <div className="mt-4 pt-4 border-t border-mystic-gold/10 space-y-2 text-sm">
          <p className="text-mystic-text"><span className="text-mystic-purple">Elements:</span> {compatibility.elementCompatibility}</p>
          <p className="text-mystic-text"><span className="text-mystic-purple">Modalities:</span> {compatibility.modalityCompatibility}</p>
        </div>

        {/* Key themes */}
        {compatibility.keyThemes.length > 0 && (
          <div className="mt-4 pt-4 border-t border-mystic-gold/10">
            <p className="text-mystic-muted text-xs uppercase tracking-wider mb-2">Key Themes</p>
            <ul className="space-y-1.5">
              {compatibility.keyThemes.map((theme, i) => (
                <li key={i} className="text-mystic-text/90 text-sm flex gap-2">
                  <span className="text-mystic-gold">✦</span> {theme}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function InterpretationSection({ text }: { text: string }) {
  const paragraphs = text.split('\n').filter(p => p.trim().length > 0)
  return (
    <div className="mb-8">
      <h2 className="font-heading text-2xl text-mystic-gold mb-4">✦ Your Couple Reading</h2>
      <div className="bg-mystic-gold/5 rounded-lg p-6 border border-mystic-gold/20 space-y-4">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-mystic-text/90 leading-relaxed text-sm">{p}</p>
        ))}
      </div>
    </div>
  )
}

function SynastryAspectsSection({ aspects }: { aspects: SynastryAspect[] }) {
  if (aspects.length === 0) return null

  const natureColor = (n: string) =>
    n === 'harmonious' ? 'text-green-400' : n === 'challenging' ? 'text-red-400' : 'text-mystic-gold'

  return (
    <Section title={`Synastry Aspects (${aspects.length})`} defaultOpen>
      <p className="text-mystic-muted text-xs mb-3">Aspects between Person 1's planets and Person 2's planets</p>
      <div className="space-y-2">
        {aspects.map((a, i) => {
          const g1 = PLANET_GLYPHS[a.person1Planet as PlanetName] ?? '☊'
          const g2 = PLANET_GLYPHS[a.person2Planet as PlanetName] ?? '☊'
          return (
            <div key={i} className="flex items-center gap-2 py-2 border-b border-mystic-gold/5 last:border-0">
              <span className="text-mystic-muted text-xs w-6">P1</span>
              <span className="text-lg">{g1}</span>
              <span className={`text-lg ${natureColor(a.nature)}`}>{a.symbol}</span>
              <span className="text-lg">{g2}</span>
              <span className="text-mystic-muted text-xs w-6">P2</span>
              <div className="flex-1">
                <span className="text-mystic-text text-sm">
                  {a.person1Planet} {a.type} {a.person2Planet}
                </span>
              </div>
              <span className="text-mystic-muted text-xs">{a.orb}° orb</span>
              <span className={`text-xs px-2 py-0.5 rounded capitalize ${natureColor(a.nature)}`}>
                {a.nature}
              </span>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

function HouseOverlaySection({ entries, label }: { entries: HouseOverlayEntry[]; label: string }) {
  if (entries.length === 0) return null
  return (
    <Section title={label}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mystic-gold/10 text-mystic-muted text-xs uppercase tracking-wider">
              <th className="text-left px-3 py-2">Planet</th>
              <th className="text-left px-3 py-2">In Sign</th>
              <th className="text-left px-3 py-2">Falls in House</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((h, i) => (
              <tr key={i} className="border-b border-mystic-gold/5">
                <td className="px-3 py-2 text-mystic-text">
                  <span className="mr-2">{PLANET_GLYPHS[h.planet as PlanetName] ?? '☊'}</span>
                  {h.planet}
                </td>
                <td className="px-3 py-2 text-mystic-gold">{ZODIAC_GLYPHS[h.sign as ZodiacSign]} {h.sign}</td>
                <td className="px-3 py-2 text-mystic-text font-heading">House {h.house}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

function CompositeSection({ synastryData }: { synastryData: SynastryData }) {
  const { compositeChart } = synastryData
  return (
    <Section title="Composite Chart (Relationship Chart)">
      <p className="text-mystic-muted text-xs mb-3">
        The midpoint between both people's planets — representing the relationship itself
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mystic-gold/10 text-mystic-muted text-xs uppercase tracking-wider">
              <th className="text-left px-3 py-2">Planet</th>
              <th className="text-left px-3 py-2">Sign</th>
              <th className="text-left px-3 py-2">Position</th>
            </tr>
          </thead>
          <tbody>
            {compositeChart.planets.map((p) => (
              <tr key={p.name} className="border-b border-mystic-gold/5">
                <td className="px-3 py-2 text-mystic-text">
                  <span className="mr-2">{PLANET_GLYPHS[p.name as PlanetName] ?? '☊'}</span>
                  {p.name}
                </td>
                <td className="px-3 py-2 text-mystic-gold">{ZODIAC_GLYPHS[p.sign as ZodiacSign]} {p.sign}</td>
                <td className="px-3 py-2 text-mystic-muted">{formatPosition(p)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 pt-3 border-t border-mystic-gold/10 text-sm space-y-1">
        <p className="text-mystic-text">
          <span className="text-mystic-purple">Composite ASC:</span>{' '}
          {compositeChart.angles.ascendant.degree}°{compositeChart.angles.ascendant.minute}' {compositeChart.angles.ascendant.sign}
        </p>
        <p className="text-mystic-text">
          <span className="text-mystic-purple">Composite MC:</span>{' '}
          {compositeChart.angles.midheaven.degree}°{compositeChart.angles.midheaven.minute}' {compositeChart.angles.midheaven.sign}
        </p>
      </div>
    </Section>
  )
}

function IndividualChartSection({ title, chartData, aspects }: {
  title: string
  chartData: import('../../engine/types').ChartData
  aspects: import('../../engine/aspects').Aspect[]
}) {
  return (
    <Section title={title}>
      <div className="flex justify-center mb-4">
        <div className="w-full max-w-md">
          <ChartWheel chartData={chartData} aspects={aspects} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mystic-gold/10 text-mystic-muted text-xs uppercase tracking-wider">
              <th className="text-left px-3 py-2">Planet</th>
              <th className="text-left px-3 py-2">Sign</th>
              <th className="text-left px-3 py-2">Position</th>
              {!chartData.unknownTime && <th className="text-left px-3 py-2">House</th>}
            </tr>
          </thead>
          <tbody>
            {chartData.planets.map((p) => (
              <tr key={p.name} className="border-b border-mystic-gold/5">
                <td className="px-3 py-2 text-mystic-text">
                  <span className="mr-2">{PLANET_GLYPHS[p.name as PlanetName] ?? '☊'}</span>
                  {p.name}
                </td>
                <td className="px-3 py-2 text-mystic-gold">{ZODIAC_GLYPHS[p.sign as ZodiacSign]} {p.sign}</td>
                <td className="px-3 py-2 text-mystic-muted">{formatPosition(p)}</td>
                {!chartData.unknownTime && <td className="px-3 py-2 text-mystic-muted">{p.house}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

export default function SynastryPage() {
  const { state, dispatch } = useApp()
  const { chartData, aspects, birthData, partnerBirthData, partnerChartData, partnerAspects, synastryData, synastryInterpretation } = state
  const [discussOpen, setDiscussOpen] = useState(false)

  if (!chartData || !partnerChartData || !synastryData) return null

  const person1Label = birthData.city ? `${birthData.city.name}, ${birthData.city.country}` : ''
  const person2Label = partnerBirthData.city ? `${partnerBirthData.city.name}, ${partnerBirthData.city.country}` : ''

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-block px-4 py-1 rounded-full bg-pink-900/30 border border-pink-500/30 text-pink-400 text-xs uppercase tracking-widest mb-3">
          Couple Synastry
        </div>
        <h2 className="font-heading text-3xl text-mystic-gold mb-2">Compatibility Reading</h2>
        <div className="flex flex-col sm:flex-row gap-2 justify-center text-mystic-muted text-sm">
          <span>Person 1: {birthData.date} — {person1Label}</span>
          <span className="hidden sm:inline text-mystic-gold">✦</span>
          <span>Person 2: {partnerBirthData.date} — {person2Label}</span>
        </div>
      </div>

      {/* Side-by-side chart wheels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="text-center">
          <p className="text-mystic-muted text-xs uppercase tracking-wider mb-2">Person 1</p>
          <ChartWheel chartData={chartData} aspects={aspects} />
        </div>
        <div className="text-center">
          <p className="text-mystic-muted text-xs uppercase tracking-wider mb-2">Person 2</p>
          <ChartWheel chartData={partnerChartData} aspects={partnerAspects} />
        </div>
      </div>

      {/* Compatibility overview */}
      <CompatibilitySection synastryData={synastryData} />

      {/* current moon phase */}
      <CurrentMoonWidget date={new Date()} />

      {/* GPT interpretation */}
      {synastryInterpretation && (
        <InterpretationSection text={synastryInterpretation} />
      )}

      {/* Synastry aspects */}
      <SynastryAspectsSection aspects={synastryData.synastryAspects} />

      {/* House overlays */}
      {synastryData.houseOverlay.person1InPerson2Houses.length > 0 && (
        <HouseOverlaySection
          entries={synastryData.houseOverlay.person1InPerson2Houses}
          label="Person 1's Planets in Person 2's Houses"
        />
      )}
      {synastryData.houseOverlay.person2InPerson1Houses.length > 0 && (
        <HouseOverlaySection
          entries={synastryData.houseOverlay.person2InPerson1Houses}
          label="Person 2's Planets in Person 1's Houses"
        />
      )}

      {/* Composite chart */}
      <CompositeSection synastryData={synastryData} />

      {/* Individual charts */}
      <IndividualChartSection title="Person 1 — Birth Chart" chartData={chartData} aspects={aspects} />
      <IndividualChartSection title="Person 2 — Birth Chart" chartData={partnerChartData} aspects={partnerAspects} />

      {/* Action buttons */}
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
          Couple Transits ☽
        </button>
        <button
          onClick={() => dispatch({ type: 'RESET' })}
          className="px-8 py-3 bg-mystic-gold/10 border border-mystic-gold/30 text-mystic-gold font-heading rounded-lg hover:bg-mystic-gold/20 transition-colors"
        >
          Back to Menu
        </button>
      </div>

      <DiscussModal open={discussOpen} onClose={() => setDiscussOpen(false)} mode="synastry" />
    </div>
  )
}
