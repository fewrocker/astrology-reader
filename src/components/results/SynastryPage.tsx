import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import type { PlanetName, ZodiacSign } from '../../engine/types'
import { PLANET_GLYPHS, ZODIAC_GLYPHS, getBodyGlyph } from '../../engine/types'
import { formatPosition } from '../../engine/zodiac'
import type { SynastryData, SynastryAspect, HouseOverlayEntry } from '../../engine/synastry'
import AspectRow from '../reading/AspectRow'
import { computeSynastryAspectBrief } from '../../data/interpretations/synastryAspectBriefs'
import { getHouseTheme } from '../../data/interpretations/houseThemes'
import { getSynastryHouseOverlayBrief } from '../../data/interpretations/synastryHouseOverlayBriefs'
import ChartWheel from '../chart/ChartWheel'
import DiscussModal from '../discuss/DiscussModal'
import { CurrentMoonWidget } from '../reading/MoonPhaseWidget'
import GptSkeleton from '../ui/GptSkeleton'
import { isGptError, getGptErrorMessage } from '../../services/gptErrors'
import { getSynastryInterpretation } from '../../services/gptInterpretation'
import { track } from '../../services/analytics'
import CollapsibleSection from '../ui/CollapsibleSection'

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

  return (
    <CollapsibleSection title={`Synastry Aspects (${aspects.length})`} defaultOpen>
      <p className="text-mystic-muted text-xs mb-3">Aspects between Person 1's planets and Person 2's planets</p>
      <div>
        {aspects.map((a, i) => (
          <AspectRow
            key={i}
            transitPlanet={a.person1Planet}
            natalPlanet={a.person2Planet}
            aspectType={a.type}
            nature={a.nature}
            symbol={a.symbol}
            orb={a.orb}
            applying={false}
            showApplyingBadge={false}
            labelOverride={`P1 ${a.person1Planet} ${a.type.charAt(0).toUpperCase() + a.type.slice(1)} P2 ${a.person2Planet}`}
            brief={computeSynastryAspectBrief(a.person1Planet, a.type, a.person2Planet, a.nature)}
          />
        ))}
      </div>
    </CollapsibleSection>
  )
}

const INNER_PLANETS = ['Sun', 'Moon', 'Venus', 'Mars', 'Mercury']
const HIGH_SIGNAL_HOUSES = [1, 4, 5, 7, 8, 12]
const OUTER_PLANET_KEYWORDS: Record<string, string> = {
  Jupiter: 'expansive',
  Saturn: 'disciplining',
  Uranus: 'disruptive',
  Neptune: 'dissolving',
  Pluto: 'transformative',
  NorthNode: 'karmic',
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`
}

function isHighSignal(entry: HouseOverlayEntry): boolean {
  return INNER_PLANETS.includes(entry.planet as string) && HIGH_SIGNAL_HOUSES.includes(entry.house)
}

function sortOverlayEntries(entries: HouseOverlayEntry[]): HouseOverlayEntry[] {
  const high = entries
    .filter(isHighSignal)
    .sort((a, b) =>
      INNER_PLANETS.indexOf(a.planet as string) - INNER_PLANETS.indexOf(b.planet as string)
    )
  const other = entries.filter(e => !isHighSignal(e))
  return [...high, ...other]
}

function HouseOverlaySection({ entries, label }: { entries: HouseOverlayEntry[]; label: string }) {
  if (entries.length === 0) return null

  const highSignalCount = entries.filter(isHighSignal).length
  const hasHighSignal = highSignalCount > 0
  const sorted = sortOverlayEntries(entries)
  const title = hasHighSignal
    ? `${label} (${highSignalCount} key placement${highSignalCount === 1 ? '' : 's'})`
    : label

  return (
    <CollapsibleSection title={title} defaultOpen={hasHighSignal}>
      {hasHighSignal && (
        <p className="text-mystic-muted text-xs mb-4">
          Showing {highSignalCount} key placement{highSignalCount === 1 ? '' : 's'} — inner planets in relationship-defining houses.
        </p>
      )}
      <div>
        {sorted.map((entry, i) => {
          const planetGlyph = getBodyGlyph(entry.planet)
          const zodiacGlyph = ZODIAC_GLYPHS[entry.sign as ZodiacSign]
          const highSignal = isHighSignal(entry)
          const invalidHouse = entry.house <= 0 || entry.house > 12

          let houseLabel = ''
          let brief: string | null = null

          if (!invalidHouse) {
            const theme = getHouseTheme(entry.house)
            houseLabel = `${ordinal(entry.house)} House · ${theme.name}`
            const lookupBrief = getSynastryHouseOverlayBrief(entry.planet as string, entry.house)
            if (lookupBrief !== null) {
              brief = lookupBrief
            } else {
              const keyword = OUTER_PLANET_KEYWORDS[entry.planet as string] ?? 'potent'
              brief = `Your ${entry.planet} in their ${ordinal(entry.house)} House (${theme.name}) — your ${keyword} energy reaches the space they hold for ${theme.theme.toLowerCase()}.`
            }
          }

          return (
            <div key={i} className={`relative py-3 border-b border-mystic-gold/10 last:border-b-0 ${highSignal ? 'pl-4' : ''}`}>
              {highSignal && (
                <div className="absolute left-0 inset-y-0 w-0.5 bg-mystic-gold/40 rounded-sm" />
              )}
              <div className={`flex items-center gap-2 text-sm flex-wrap ${highSignal ? 'text-mystic-text' : 'text-mystic-muted'}`}>
                <span className={highSignal ? 'text-lg' : 'text-base'}>{planetGlyph}</span>
                <span className={highSignal ? 'font-medium' : ''}>{entry.planet}</span>
                <span className="opacity-60">in</span>
                <span className={highSignal ? 'text-mystic-gold' : ''}>{zodiacGlyph} {entry.sign}</span>
                {!invalidHouse && (
                  <>
                    <span className="opacity-40">·</span>
                    <span>{houseLabel}</span>
                  </>
                )}
              </div>
              {brief && (
                <p className={`text-sm leading-relaxed mt-1.5 ${highSignal ? 'text-mystic-text/80' : 'text-mystic-muted/70'}`}>
                  {brief}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </CollapsibleSection>
  )
}

function CompositeSection({ synastryData }: { synastryData: SynastryData }) {
  const { compositeChart } = synastryData
  return (
    <CollapsibleSection title="Composite Chart (Relationship Chart)">
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
                  <span className="mr-2">{getBodyGlyph(p.name)}</span>
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
    </CollapsibleSection>
  )
}

function IndividualChartSection({ title, chartData, aspects }: {
  title: string
  chartData: import('../../engine/types').ChartData
  aspects: import('../../engine/aspects').Aspect[]
}) {
  return (
    <CollapsibleSection title={title}>
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
                  <span className="mr-2">{getBodyGlyph(p.name)}</span>
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
    </CollapsibleSection>
  )
}

export default function SynastryPage() {
  const { state, dispatch } = useApp()
  const { chartData, aspects, birthData, partnerBirthData, partnerChartData, partnerAspects, synastryData, synastryInterpretation } = state
  const [discussOpen, setDiscussOpen] = useState(false)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => { track('reading_viewed', { reading_type: 'synastry' }) }, [])

  async function handleRetryGpt() {
    if (!chartData || !partnerChartData || !synastryData || retrying) return
    if (!birthData.city || !partnerBirthData.city) return
    setRetrying(true)
    const interpretation = await getSynastryInterpretation(
      { date: birthData.date, time: birthData.unknownTime ? null : (birthData.time || null), lat: birthData.city.lat, lng: birthData.city.lng, tz: birthData.city.tz },
      { date: partnerBirthData.date, time: partnerBirthData.unknownTime ? null : (partnerBirthData.time || null), lat: partnerBirthData.city.lat, lng: partnerBirthData.city.lng, tz: partnerBirthData.city.tz },
    )
    dispatch({ type: 'SET_SYNASTRY_INTERPRETATION', interpretation })
    setRetrying(false)
  }

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
      {synastryInterpretation === null || retrying ? (
        <GptSkeleton label="Reading your celestial bond..." accentColor="pink" />
      ) : isGptError(synastryInterpretation) ? (
        <div className="bg-mystic-surface/50 border border-mystic-border rounded-xl p-6 text-center space-y-3 mb-6">
          <p className="text-mystic-muted text-sm">{getGptErrorMessage(synastryInterpretation)}</p>
          <button
            type="button"
            onClick={handleRetryGpt}
            className="text-mystic-gold text-sm font-heading hover:text-mystic-gold/80 transition-colors"
          >
            ✦ Ask again
          </button>
        </div>
      ) : (
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
          onClick={() => dispatch({ type: 'SET_VIEW', view: 'form' })}
          className="px-8 py-3 bg-mystic-gold/10 border border-mystic-gold/30 text-mystic-gold font-heading rounded-lg hover:bg-mystic-gold/20 transition-colors"
        >
          ← Home
        </button>
      </div>

      <DiscussModal open={discussOpen} onClose={() => setDiscussOpen(false)} mode="synastry" />
    </div>
  )
}
