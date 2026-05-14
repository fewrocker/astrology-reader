import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import type { SolarReturnData } from '../../engine/solarReturn'
import { buildSolarReturnPrompt } from '../../engine/solarReturn'
import type { ZodiacSign, PlanetName } from '../../engine/types'
import { PLANET_GLYPHS, ZODIAC_GLYPHS } from '../../engine/types'
import { PLANET_IN_HOUSE } from '../../data/interpretations/planetInHouse'
import SolarReturnBiWheel from '../chart/SolarReturnBiWheel'
import DiscussModal from '../discuss/DiscussModal'
import GptSkeleton from '../ui/GptSkeleton'
import { isGptError, getGptErrorMessage } from '../../services/gptErrors'
import { getGptInterpretation } from '../../services/gptInterpretation'
import { track } from '../../services/analytics'

function SRReading({ text }: { text: string }) {
  const paragraphs = text.split('\n').filter(p => p.trim().length > 0)
  return (
    <div className="bg-mystic-gold/5 rounded-lg p-6 border border-mystic-gold/20 space-y-4">
      {paragraphs.map((p, i) => (
        <p key={i} className="text-mystic-text/90 leading-relaxed text-sm">{p}</p>
      ))}
    </div>
  )
}

function SRPlanetTable({ srData }: { srData: SolarReturnData }) {
  const { srChart } = srData
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-mystic-gold/10 text-mystic-muted text-xs uppercase tracking-wider">
            <th className="text-left px-3 py-2">Planet</th>
            <th className="text-left px-3 py-2">SR Sign</th>
            <th className="text-left px-3 py-2">SR House</th>
            <th className="text-left px-3 py-2">Natal Sign</th>
          </tr>
        </thead>
        <tbody>
          {srChart.planets.filter(p => p.name !== 'NorthNode').map((sp) => {
            const np = srData.natalChart.planets.find(p => p.name === sp.name)
            return (
              <tr key={sp.name} className="border-b border-mystic-gold/5">
                <td className="px-3 py-2 text-mystic-text">
                  <span className="mr-2 text-amber-400">{PLANET_GLYPHS[sp.name as PlanetName]}</span>
                  {sp.name}
                </td>
                <td className="px-3 py-2 text-amber-400">
                  {ZODIAC_GLYPHS[sp.sign as ZodiacSign]} {sp.sign}
                  {sp.retrograde && <span className="text-red-400 ml-1">℞</span>}
                </td>
                <td className="px-3 py-2 text-mystic-muted">{sp.house}</td>
                <td className="px-3 py-2 text-mystic-gold/70">
                  {np ? `${ZODIAC_GLYPHS[np.sign as ZodiacSign]} ${np.sign}` : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function KeyPlacements({ srData }: { srData: SolarReturnData }) {
  const { srChart } = srData
  const srSun = srChart.planets.find(p => p.name === 'Sun')
  const srMoon = srChart.planets.find(p => p.name === 'Moon')
  const srAsc = srChart.angles.ascendant
  const srMC = srChart.angles.midheaven

  const placements = [
    { label: 'ASC', value: `${srAsc.sign}`, icon: '↑', desc: 'Year theme' },
    { label: 'Sun', value: `${srSun?.sign ?? '—'} H${srSun?.house ?? '—'}`, icon: '☉', desc: 'Primary focus' },
    { label: 'Moon', value: `${srMoon?.sign ?? '—'} H${srMoon?.house ?? '—'}`, icon: '☽', desc: 'Emotional climate' },
    { label: 'MC', value: `${srMC.sign}`, icon: '⬆', desc: 'Career direction' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {placements.map(p => (
        <div key={p.label}
          className="bg-amber-900/10 border border-amber-500/20 rounded-lg px-4 py-3 text-center">
          <div className="text-amber-400 text-lg mb-1">{p.icon}</div>
          <div className="text-amber-300 font-heading text-sm font-semibold">{p.value}</div>
          <div className="text-mystic-muted text-xs mt-0.5">{p.desc}</div>
        </div>
      ))}
    </div>
  )
}

function SRStaticBriefs({ srData }: { srData: SolarReturnData }) {
  const { srChart } = srData
  const srSun = srChart.planets.find(p => p.name === 'Sun')
  const srMoon = srChart.planets.find(p => p.name === 'Moon')

  const sunHouse = srSun?.house
  const moonHouse = srMoon?.house

  const sunBrief = (sunHouse && sunHouse >= 1 && sunHouse <= 12)
    ? PLANET_IN_HOUSE[`Sun_H${sunHouse}`]?.brief
    : undefined

  const moonBrief = (moonHouse && moonHouse >= 1 && moonHouse <= 12)
    ? PLANET_IN_HOUSE[`Moon_H${moonHouse}`]?.brief
    : undefined

  if (!sunBrief && !moonBrief) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
      {sunBrief && (
        <div className="bg-amber-900/5 border border-amber-500/10 rounded-lg px-4 py-3">
          <p className="text-amber-500/60 text-xs uppercase tracking-wider mb-1">Primary Focus</p>
          <p className="text-amber-300/80 font-heading text-sm font-semibold mb-1">SR Sun in House {sunHouse}</p>
          <p className="text-mystic-text/70 text-sm leading-relaxed">This year: {sunBrief}</p>
        </div>
      )}
      {moonBrief && (
        <div className="bg-amber-900/5 border border-amber-500/10 rounded-lg px-4 py-3">
          <p className="text-amber-500/60 text-xs uppercase tracking-wider mb-1">Emotional Climate</p>
          <p className="text-amber-300/80 font-heading text-sm font-semibold mb-1">SR Moon in House {moonHouse}</p>
          <p className="text-mystic-text/70 text-sm leading-relaxed">This year: {moonBrief}</p>
        </div>
      )}
    </div>
  )
}

export default function SolarReturnPage() {
  const { state, dispatch } = useApp()
  const { solarReturnData, solarReturnInterpretation, birthData, solarReturnError } = state
  const [activeTab, setActiveTab] = useState<'reading' | 'chart'>('reading')
  const [discussOpen, setDiscussOpen] = useState(false)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => { track('reading_viewed', { reading_type: 'solar_return' }) }, [])

  const currentYear = new Date().getFullYear()
  const targetYear = solarReturnData?.targetYear ?? currentYear

  const handleYearChange = (year: number) => {
    if (!birthData.city) return
    dispatch({ type: 'START_SOLAR_RETURN', targetYear: year })
  }

  async function handleRetryGpt() {
    if (!solarReturnData || !state.chartData || retrying) return
    setRetrying(true)
    const prompt = buildSolarReturnPrompt(state.chartData, solarReturnData.srChart, solarReturnData.srMoment, birthData.date)
    const interpretation = await getGptInterpretation(prompt)
    dispatch({ type: 'SET_SOLAR_RETURN_INTERPRETATION', interpretation })
    setRetrying(false)
  }

  const formatSRMoment = (date: Date): string => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December']
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()} at ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`
  }

  if (solarReturnError) {
    return (
      <div className="w-full max-w-2xl mx-auto text-center py-16">
        <p className="text-red-400 mb-4">{solarReturnError}</p>
        <button onClick={() => dispatch({ type: 'SET_VIEW', view: 'form' })}
          className="px-6 py-3 bg-mystic-surface border border-mystic-border text-mystic-muted font-heading rounded-lg hover:border-mystic-gold/40 hover:text-mystic-text transition-colors">
          Back
        </button>
      </div>
    )
  }

  if (!solarReturnData) return null

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-block px-4 py-1 rounded-full mb-3"
          style={{ background: 'rgba(232,168,48,0.12)', border: '1px solid rgba(232,168,48,0.3)', color: 'rgba(232,168,48,0.9)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          Solar Return {targetYear}
        </div>
        <h2 className="font-heading text-3xl mb-2" style={{ color: '#e8a830' }}>
          Your Year Ahead
        </h2>
        <div className="inline-block px-5 py-2 rounded-lg mb-2"
          style={{ background: 'rgba(232,168,48,0.06)', border: '1px solid rgba(232,168,48,0.18)' }}>
          <p className="text-amber-300/90 text-sm font-heading">
            Your Sun returns on <span className="font-bold text-amber-200">{formatSRMoment(solarReturnData.srMoment)}</span>
          </p>
        </div>
        <p className="text-mystic-muted text-xs mt-1">
          Calculated for your birth coordinates · {birthData.city?.name}, {birthData.city?.country}
        </p>
      </div>

      {/* Key placements */}
      <KeyPlacements srData={solarReturnData} />

      {/* Year selector */}
      <div className="flex justify-center gap-2 mb-8">
        <button
          onClick={() => handleYearChange(currentYear)}
          className={`px-4 py-2 text-sm font-heading rounded-lg transition-colors ${
            targetYear === currentYear
              ? 'border text-amber-300'
              : 'text-mystic-muted border border-mystic-border hover:border-amber-500/40 hover:text-mystic-text'
          }`}
          style={targetYear === currentYear ? { background: 'rgba(232,168,48,0.12)', borderColor: 'rgba(232,168,48,0.35)' } : {}}
        >
          {currentYear}
        </button>
        <button
          onClick={() => handleYearChange(currentYear + 1)}
          className={`px-4 py-2 text-sm font-heading rounded-lg transition-colors ${
            targetYear === currentYear + 1
              ? 'border text-amber-300'
              : 'text-mystic-muted border border-mystic-border hover:border-amber-500/40 hover:text-mystic-text'
          }`}
          style={targetYear === currentYear + 1 ? { background: 'rgba(232,168,48,0.12)', borderColor: 'rgba(232,168,48,0.35)' } : {}}
        >
          {currentYear + 1}
        </button>
      </div>

      {/* Tab toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex bg-mystic-surface/50 border border-mystic-border rounded-lg p-1">
          <button
            onClick={() => setActiveTab('reading')}
            className={`px-5 py-2 text-sm font-heading rounded-md transition-colors ${
              activeTab === 'reading'
                ? 'border text-amber-300'
                : 'text-mystic-muted hover:text-mystic-text border border-transparent'
            }`}
            style={activeTab === 'reading' ? { background: 'rgba(232,168,48,0.12)', borderColor: 'rgba(232,168,48,0.3)' } : {}}
          >
            Reading
          </button>
          <button
            onClick={() => setActiveTab('chart')}
            className={`px-5 py-2 text-sm font-heading rounded-md transition-colors ${
              activeTab === 'chart'
                ? 'border text-amber-300'
                : 'text-mystic-muted hover:text-mystic-text border border-transparent'
            }`}
            style={activeTab === 'chart' ? { background: 'rgba(232,168,48,0.12)', borderColor: 'rgba(232,168,48,0.3)' } : {}}
          >
            Chart
          </button>
        </div>
      </div>

      {/* Reading tab */}
      {activeTab === 'reading' && (
        <div>
          <SRStaticBriefs srData={solarReturnData} />
          {solarReturnInterpretation === null || retrying ? (
            <GptSkeleton label="Tracking the Sun's return..." accentColor="amber" />
          ) : isGptError(solarReturnInterpretation) ? (
            <div className="bg-mystic-surface/50 border border-mystic-border rounded-xl p-6 text-center space-y-3 mb-6">
              <p className="text-mystic-muted text-sm">{getGptErrorMessage(solarReturnInterpretation)}</p>
              <button
                type="button"
                onClick={handleRetryGpt}
                className="text-mystic-gold text-sm font-heading hover:text-mystic-gold/80 transition-colors"
              >
                ✦ Ask again
              </button>
            </div>
          ) : (
            <>
              <h2 className="font-heading text-2xl mb-4" style={{ color: '#e8a830' }}>Year Ahead Reading</h2>
              <SRReading text={solarReturnInterpretation} />
            </>
          )}
        </div>
      )}

      {/* Chart tab */}
      {activeTab === 'chart' && (
        <div>
          <div className="flex justify-center mb-6">
            <div className="w-full max-w-2xl">
              <SolarReturnBiWheel natalChart={solarReturnData.natalChart} srChart={solarReturnData.srChart} />
              <p className="text-center text-mystic-muted text-xs mt-2">
                Inner ring: natal chart · Outer ring: solar return {targetYear}
              </p>
            </div>
          </div>

          <div className="border border-mystic-gold/20 rounded-lg overflow-hidden mb-6">
            <div className="px-5 py-3 bg-amber-900/10 border-b border-amber-500/15">
              <span className="font-heading text-amber-300">SR Planet Positions</span>
            </div>
            <div className="px-5 py-4">
              <SRPlanetTable srData={solarReturnData} />
            </div>
          </div>

          {/* SR Ascendant and MC */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-amber-900/10 border border-amber-500/20 rounded-lg p-4">
              <p className="text-mystic-muted text-xs uppercase tracking-wider mb-1">SR Ascendant</p>
              <p className="text-amber-300 font-heading text-lg">
                {ZODIAC_GLYPHS[solarReturnData.srChart.angles.ascendant.sign as ZodiacSign]} {solarReturnData.srChart.angles.ascendant.sign}
              </p>
              <p className="text-mystic-muted text-xs mt-1">
                {solarReturnData.srChart.angles.ascendant.degree}°{solarReturnData.srChart.angles.ascendant.minute}'
              </p>
            </div>
            <div className="bg-amber-900/10 border border-amber-500/20 rounded-lg p-4">
              <p className="text-mystic-muted text-xs uppercase tracking-wider mb-1">SR Midheaven</p>
              <p className="text-amber-300 font-heading text-lg">
                {ZODIAC_GLYPHS[solarReturnData.srChart.angles.midheaven.sign as ZodiacSign]} {solarReturnData.srChart.angles.midheaven.sign}
              </p>
              <p className="text-mystic-muted text-xs mt-1">
                {solarReturnData.srChart.angles.midheaven.degree}°{solarReturnData.srChart.angles.midheaven.minute}'
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 mb-12">
        {solarReturnInterpretation !== null && !isGptError(solarReturnInterpretation) && (
          <button onClick={() => setDiscussOpen(true)}
            className="px-6 py-3 font-heading rounded-lg transition-colors"
            style={{ background: 'rgba(232,168,48,0.08)', border: '1px solid rgba(232,168,48,0.28)', color: 'rgba(232,168,48,0.85)' }}>
            Discuss
          </button>
        )}
        <button onClick={() => dispatch({ type: 'SET_VIEW', view: 'results' })}
          className="px-6 py-3 bg-mystic-gold/10 border border-mystic-gold/30 text-mystic-gold font-heading rounded-lg hover:bg-mystic-gold/20 transition-colors">
          View Birth Chart
        </button>
        <button onClick={() => dispatch({ type: 'SET_VIEW', view: 'form' })}
          className="px-6 py-3 bg-mystic-surface border border-mystic-border text-mystic-muted font-heading rounded-lg hover:border-mystic-gold/40 hover:text-mystic-text transition-colors">
          Back
        </button>
      </div>

      <DiscussModal open={discussOpen} onClose={() => setDiscussOpen(false)} mode="transit" />
    </div>
  )
}
