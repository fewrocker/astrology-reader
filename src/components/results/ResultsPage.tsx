import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import type { PlanetName } from '../../engine/types'
import { PLANET_GLYPHS, ZODIAC_GLYPHS } from '../../engine/types'
import { formatPosition } from '../../engine/zodiac'
import ChartWheel from '../chart/ChartWheel'
import { ReadingSummary, PlanetSection, AspectSection, AspectPatternsSection, BalanceSection, FocusSection, HousesOverview } from '../reading/ReadingDisplay'
import DiscussModal from '../discuss/DiscussModal'

export default function ResultsPage() {
  const { state, dispatch } = useApp()
  const { chartData, aspects, reading, birthData } = state
  const [discussOpen, setDiscussOpen] = useState(false)

  if (!chartData || !reading) return null

  const cityLabel = birthData.city ? `${birthData.city.name}, ${birthData.city.country}` : ''

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* header */}
      <div className="text-center mb-8">
        <h2 className="font-heading text-3xl text-mystic-gold mb-1">Your Birth Chart</h2>
        <p className="text-mystic-muted text-sm">
          {birthData.date} {!birthData.unknownTime && `at ${birthData.time}`} — {cityLabel}
        </p>
      </div>

      {/* chart wheel */}
      <div className="flex justify-center mb-10">
        <div className="w-full max-w-2xl">
          <ChartWheel chartData={chartData} aspects={aspects} />
        </div>
      </div>

      {/* reading */}
      <ReadingSummary reading={reading} chart={chartData} />

      {/* focus area */}
      {reading.focus && <FocusSection focus={reading.focus} />}

      {/* detailed sections */}
      <PlanetSection reading={reading} showHouse={!chartData.unknownTime} />
      <AspectSection reading={reading} />
      <AspectPatternsSection patterns={reading.patterns} />
      <BalanceSection elements={reading.elements} modalities={reading.modalities} />
      {!chartData.unknownTime && <HousesOverview chart={chartData} />}

      {/* planet positions table */}
      <div className="border border-mystic-gold/20 rounded-lg overflow-hidden mb-4">
        <div className="px-5 py-3 bg-mystic-gold/5">
          <span className="font-heading text-lg text-mystic-gold">Planet Positions</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-mystic-gold/10 text-mystic-muted text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-2">Planet</th>
                <th className="text-left px-3 py-2">Sign</th>
                <th className="text-left px-3 py-2">Position</th>
                {!chartData.unknownTime && <th className="text-left px-3 py-2">House</th>}
                <th className="text-left px-3 py-2">Rx</th>
              </tr>
            </thead>
            <tbody>
              {chartData.planets.map((p) => (
                <tr key={p.name} className="border-b border-mystic-gold/5">
                  <td className="px-5 py-2 text-mystic-text">
                    <span className="mr-2">{PLANET_GLYPHS[p.name as PlanetName] ?? '☊'}</span>
                    {p.name}
                  </td>
                  <td className="px-3 py-2 text-mystic-gold">{ZODIAC_GLYPHS[p.sign]} {p.sign}</td>
                  <td className="px-3 py-2 text-mystic-muted">{formatPosition(p)}</td>
                  {!chartData.unknownTime && <td className="px-3 py-2 text-mystic-muted">{p.house}</td>}
                  <td className="px-3 py-2 text-mystic-muted">{p.retrograde ? '℞' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* aspects table */}
      <div className="border border-mystic-gold/20 rounded-lg overflow-hidden mb-8">
        <div className="px-5 py-3 bg-mystic-gold/5">
          <span className="font-heading text-lg text-mystic-gold">Aspects Table</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-mystic-gold/10 text-mystic-muted text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-2">Aspect</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Orb</th>
                <th className="text-left px-3 py-2">Nature</th>
              </tr>
            </thead>
            <tbody>
              {aspects.map((a, i) => {
                const natureColor = a.nature === 'harmonious' ? 'text-green-400' : a.nature === 'challenging' ? 'text-red-400' : 'text-mystic-gold'
                return (
                  <tr key={i} className="border-b border-mystic-gold/5">
                    <td className="px-5 py-2 text-mystic-text">
                      {a.planet1} {a.symbol} {a.planet2}
                    </td>
                    <td className="px-3 py-2 text-mystic-muted capitalize">{a.type}</td>
                    <td className="px-3 py-2 text-mystic-muted">{a.orb.toFixed(1)}°</td>
                    <td className={`px-3 py-2 capitalize ${natureColor}`}>{a.nature}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* action buttons */}
      <div className="text-center mb-12 flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={() => setDiscussOpen(true)}
          className="px-8 py-3 bg-mystic-blue/10 border border-mystic-blue/30 text-mystic-blue font-heading rounded-lg hover:bg-mystic-blue/20 transition-colors"
        >
          Discuss ✦
        </button>
        <button
          onClick={() => dispatch({ type: 'RESET' })}
          className="px-8 py-3 bg-mystic-gold/10 border border-mystic-gold/30 text-mystic-gold font-heading rounded-lg hover:bg-mystic-gold/20 transition-colors"
        >
          Back to Menu
        </button>
      </div>

      <DiscussModal open={discussOpen} onClose={() => setDiscussOpen(false)} mode="birth" />
    </div>
  )
}
