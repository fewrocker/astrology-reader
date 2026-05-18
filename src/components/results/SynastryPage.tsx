import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { resolvePersonLabel } from '../../context/appState'
import type { PlanetName, ZodiacSign } from '../../engine/types'
import { ZODIAC_GLYPHS, getBodyGlyph } from '../../engine/types'
import { formatPosition } from '../../engine/zodiac'
import type { SynastryData, SynastryAspect, HouseOverlay, HouseOverlayEntry, CoupleProfile, DimensionValue } from '../../engine/synastry'
import AspectRow from '../reading/AspectRow'
import { computeSynastryAspectBrief } from '../../data/interpretations/synastryAspectBriefs'
import { getHouseTheme } from '../../data/interpretations/houseThemes'
import { getSynastryHouseOverlayBrief } from '../../data/interpretations/synastryHouseOverlayBriefs'
import ChartWheel from '../chart/ChartWheel'
import DiscussModal from '../discuss/DiscussModal'
import GptSkeleton from '../ui/GptSkeleton'
import { isGptError, getGptErrorMessage } from '../../services/gptErrors'
import { getSynastryInterpretation } from '../../services/gptInterpretation'
import { track } from '../../services/analytics'
import CollapsibleSection from '../ui/CollapsibleSection'

const DIMENSION_CONFIG: Record<string, {
  label: string
  icon: string
  fillColor: string
  trackColor: string
  accentClass: string
}> = {
  intensity:          { label: 'Intensity',           icon: '🔥', fillColor: 'bg-orange-400', trackColor: 'bg-orange-400/15', accentClass: 'text-orange-300' },
  emotionalFlow:      { label: 'Emotional Flow',      icon: '💧', fillColor: 'bg-sky-400',    trackColor: 'bg-sky-400/15',    accentClass: 'text-sky-300'    },
  communicationStyle: { label: 'Communication Style', icon: '💬', fillColor: 'bg-violet-400', trackColor: 'bg-violet-400/15', accentClass: 'text-violet-300' },
  intimacyRhythm:     { label: 'Intimacy Rhythm',     icon: '🌿', fillColor: 'bg-teal-400',   trackColor: 'bg-teal-400/15',   accentClass: 'text-teal-300'   },
  growthDynamic:      { label: 'Growth Dynamic',      icon: '🌱', fillColor: 'bg-emerald-400',trackColor: 'bg-emerald-400/15',accentClass: 'text-emerald-300'},
  sexualChemistry:    { label: 'Sexual Chemistry',    icon: '✨', fillColor: 'bg-rose-400',   trackColor: 'bg-rose-400/15',   accentClass: 'text-rose-300'   },
  lifePace:           { label: 'Life Pace',           icon: '⚡', fillColor: 'bg-amber-400',  trackColor: 'bg-amber-400/15',  accentClass: 'text-amber-300'  },
}

function DimensionAxis({ dim, axisKey }: { dim: DimensionValue; axisKey: string }) {
  const config = DIMENSION_CONFIG[axisKey] ?? {
    label: axisKey.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
    icon: '◆',
    fillColor: 'bg-mystic-gold',
    trackColor: 'bg-mystic-gold/15',
    accentClass: 'text-mystic-gold',
  }

  const veryLowConf = dim.confidence < 0.2
  const weakSignal = dim.confidence >= 0.2 && dim.confidence < 0.4
  const fillOpacity = dim.confidence < 0.4 ? 'opacity-40' : 'opacity-80'
  const showFill = Math.abs(dim.value) >= 0.02 && !veryLowConf
  const fillWidth = `${Math.max(Math.abs(dim.value) * 50, 3)}%`

  return (
    <div className="rounded-lg p-4 border border-white/10 bg-white/[0.03]">
      {/* Top row: icon + label on left, qualitative label on right */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-mystic-text text-sm font-medium">
          <span className="mr-1.5">{config.icon}</span>
          {config.label}
        </span>
        <span className={`text-xs font-medium ${config.accentClass}`}>{dim.label}</span>
      </div>

      {/* Bar row */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-mystic-muted text-xs w-20 text-right shrink-0">{dim.leftPole}</span>
        <div className={`relative flex-1 h-2 rounded-full overflow-hidden ${config.trackColor}`}>
          {/* Center divider */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-white/40 z-10" />
          {/* Directional fill bar */}
          {showFill && (
            dim.value > 0 ? (
              <div
                className={`absolute top-0 bottom-0 ${config.fillColor} ${fillOpacity}`}
                style={{ left: '50%', width: fillWidth }}
              />
            ) : (
              <div
                className={`absolute top-0 bottom-0 ${config.fillColor} ${fillOpacity}`}
                style={{ right: '50%', width: fillWidth }}
              />
            )
          )}
        </div>
        <span className="text-mystic-muted text-xs w-20 shrink-0">{dim.rightPole}</span>
      </div>

      {/* Weak signal note */}
      {weakSignal && (
        <p className="text-xs text-mystic-muted/60 leading-relaxed mb-1">weak signal</p>
      )}

      {/* Sentence or low-confidence message */}
      {veryLowConf ? (
        <p className="text-xs text-mystic-muted/60 leading-relaxed">
          Not enough cross-chart contacts to characterize this dimension precisely.
        </p>
      ) : (
        <p className="text-xs text-mystic-text/70 leading-relaxed">
          {dim.sentence}
        </p>
      )}
    </div>
  )
}

function CoupleProfileSection({ synastryData }: { synastryData: SynastryData }) {
  const { coupleProfile, keyThemes, elementCompatibility, modalityCompatibility } = synastryData

  return (
    <div className="mb-8">
      <h2 className="font-heading text-2xl text-mystic-gold mb-1">✦ Your Couple Profile</h2>
      <p className="text-mystic-muted text-xs mb-4">Seven dimensions of how you move together — not scores, just shape.</p>
      <div className="bg-mystic-gold/5 rounded-lg p-6 border border-mystic-gold/20">
        <div className="space-y-3">
          {(Object.entries(coupleProfile) as [keyof CoupleProfile, DimensionValue][]).map(([key, dim]) => (
            <DimensionAxis key={key} dim={dim} axisKey={key} />
          ))}
        </div>

        {/* Element & modality */}
        <div className="mt-6 pt-5 border-t border-mystic-gold/10 space-y-2 text-sm">
          <p className="text-mystic-text"><span className="text-mystic-purple">Elements:</span> {elementCompatibility}</p>
          <p className="text-mystic-text"><span className="text-mystic-purple">Modalities:</span> {modalityCompatibility}</p>
        </div>

        {/* Key themes */}
        {keyThemes.length > 0 && (
          <div className="mt-4 pt-4 border-t border-mystic-gold/10">
            <p className="text-mystic-muted text-xs uppercase tracking-wider mb-2">Key Themes</p>
            <ul className="space-y-1.5">
              {keyThemes.map((theme, i) => (
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

function SynastryAspectsSection({ aspects, label1, label2, houseOverlay }: { aspects: SynastryAspect[]; label1: string; label2: string; houseOverlay?: HouseOverlay }) {
  if (aspects.length === 0) return null

  return (
    <CollapsibleSection title={`Synastry Aspects (${aspects.length})`} defaultOpen={false}>
      <p className="text-mystic-muted text-xs mb-3">Aspects between {label1}'s planets and {label2}'s planets</p>
      <div>
        {aspects.map((a, i) => {
          const houseNote = houseOverlay ? resolveHouseNote(a, houseOverlay, label1, label2) : null
          return (
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
              labelOverride={`${label1}'s ${a.person1Planet} ${a.type.charAt(0).toUpperCase() + a.type.slice(1)} ${label2}'s ${a.person2Planet}`}
              brief={computeSynastryAspectBrief(a.person1Planet as (PlanetName | 'NorthNode'), a.type, a.person2Planet as (PlanetName | 'NorthNode'), a.nature)}
              expansionNote={houseNote ?? undefined}
            />
          )
        })}
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

const QUALIFYING_HOUSES = [1, 5, 7, 8]

function resolveHouseNote(
  aspect: SynastryAspect,
  houseOverlay: HouseOverlay,
  label1: string,
  label2: string,
): string | null {
  const candidates: Array<{ house: number; note: string }> = []

  // Check A: person1Planet in person2's houses
  if (INNER_PLANETS.includes(aspect.person1Planet as string)) {
    const entry = houseOverlay.person1InPerson2Houses.find(
      e => e.planet === aspect.person1Planet && QUALIFYING_HOUSES.includes(e.house) && e.house > 0 && e.house <= 12
    )
    if (entry) {
      const theme = getHouseTheme(entry.house)
      candidates.push({
        house: entry.house,
        note: `${label1}'s ${entry.planet} also falls in ${label2}'s ${ordinal(entry.house)} house (${theme.theme.toLowerCase()}).`,
      })
    }
  }

  // Check B: person2Planet in person1's houses
  if (INNER_PLANETS.includes(aspect.person2Planet as string)) {
    const entry = houseOverlay.person2InPerson1Houses.find(
      e => e.planet === aspect.person2Planet && QUALIFYING_HOUSES.includes(e.house) && e.house > 0 && e.house <= 12
    )
    if (entry) {
      const theme = getHouseTheme(entry.house)
      candidates.push({
        house: entry.house,
        note: `${label2}'s ${entry.planet} also falls in ${label1}'s ${ordinal(entry.house)} house (${theme.theme.toLowerCase()}).`,
      })
    }
  }

  if (candidates.length === 0) return null

  // Tie-breaking: prefer lower index in QUALIFYING_HOUSES; on equal house, prefer Check A (index 0)
  candidates.sort((a, b) => QUALIFYING_HOUSES.indexOf(a.house) - QUALIFYING_HOUSES.indexOf(b.house))
  return candidates[0].note
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

function IndividualChartSection({ title, chartData, aspects, defaultOpen }: {
  title: string
  chartData: import('../../engine/types').ChartData
  aspects: import('../../engine/aspects').Aspect[]
  defaultOpen?: boolean
}) {
  return (
    <CollapsibleSection title={title} defaultOpen={defaultOpen}>
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
  const [viewMode, setViewMode] = useState<'charts' | 'connections'>('charts')
  const [personFilter, setPersonFilter] = useState<'both' | 'person1' | 'person2'>('both')

  useEffect(() => { track('reading_viewed', { reading_type: 'synastry' }) }, [])

  async function handleRetryGpt() {
    if (!chartData || !partnerChartData || !synastryData || retrying) return
    if (!birthData.city || !partnerBirthData.city) return
    setRetrying(true)
    const interpretation = await getSynastryInterpretation(
      { date: birthData.date, time: birthData.unknownTime ? null : (birthData.time || null), lat: birthData.city.lat, lng: birthData.city.lng, tz: birthData.city.tz, name: birthData.userName?.trim() || undefined },
      { date: partnerBirthData.date, time: partnerBirthData.unknownTime ? null : (partnerBirthData.time || null), lat: partnerBirthData.city.lat, lng: partnerBirthData.city.lng, tz: partnerBirthData.city.tz, name: partnerBirthData.userName?.trim() || undefined },
    )
    dispatch({ type: 'SET_SYNASTRY_INTERPRETATION', interpretation })
    setRetrying(false)
  }

  if (!chartData || !partnerChartData || !synastryData) return null

  const label1 = resolvePersonLabel(birthData)
  const label2 = resolvePersonLabel(partnerBirthData)
  const person1City = birthData.city ? `${birthData.city.name}, ${birthData.city.country}` : ''
  const person2City = partnerBirthData.city ? `${partnerBirthData.city.name}, ${partnerBirthData.city.country}` : ''

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-block px-4 py-1 rounded-full bg-pink-900/30 border border-pink-500/30 text-pink-400 text-xs uppercase tracking-widest mb-3">
          Couple Synastry
        </div>
        <h2 className="font-heading text-3xl text-mystic-gold mb-2">{label1} & {label2}</h2>
        <div className="flex flex-col sm:flex-row gap-2 justify-center text-mystic-muted text-sm">
          <span>{birthData.date}{person1City ? ` — ${person1City}` : ''}</span>
          <span className="hidden sm:inline text-mystic-gold">✦</span>
          <span>{partnerBirthData.date}{person2City ? ` — ${person2City}` : ''}</span>
        </div>
      </div>

      {/* Bi-wheel — Person 1 inner, Person 2 outer */}
      <div className="flex flex-col items-center mb-8">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center text-xs text-center mb-3">
          <button
            onClick={() => setPersonFilter(f => f === 'person1' ? 'both' : 'person1')}
            className={`text-mystic-muted hover:text-mystic-text transition-opacity ${personFilter === 'person2' ? 'opacity-30' : ''}`}
          >
            <span style={{ color: '#c9a84c' }} className="mr-1">●</span>
            <span className={`font-medium ${personFilter === 'person1' ? 'text-[#c9a84c]' : 'text-mystic-text/80'}`}>{label1} (inner)</span>
            {' · '}{birthData.date}
          </button>
          <button
            onClick={() => setPersonFilter(f => f === 'person2' ? 'both' : 'person2')}
            className={`text-mystic-muted hover:text-mystic-text transition-opacity ${personFilter === 'person1' ? 'opacity-30' : ''}`}
          >
            <span style={{ color: '#c084fc' }} className="mr-1">●</span>
            <span className={`font-medium ${personFilter === 'person2' ? 'text-[#c084fc]' : 'text-mystic-text/80'}`}>{label2} (outer)</span>
            {' · '}{partnerBirthData.date}
          </button>
        </div>
        <div className="flex justify-center mb-3">
          <div className="inline-flex rounded-full border border-mystic-gold/20 bg-mystic-gold/5 p-0.5 gap-0.5">
            <button
              onClick={() => setViewMode('charts')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                viewMode === 'charts'
                  ? 'bg-mystic-gold/20 text-mystic-gold'
                  : 'text-mystic-muted hover:text-mystic-text'
              }`}
            >
              Show charts
            </button>
            <button
              onClick={() => setViewMode('connections')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                viewMode === 'connections'
                  ? 'bg-[#c084fc]/20 text-[#c084fc]'
                  : 'text-mystic-muted hover:text-mystic-text'
              }`}
            >
              Show connections
            </button>
          </div>
        </div>
        <div className="w-full max-w-2xl">
          <ChartWheel
            chartData={chartData}
            aspects={aspects}
            synastryPlanets={partnerChartData.planets}
            synastryAspects={synastryData.synastryAspects}
            synastryViewMode={viewMode}
            synastryPersonFilter={personFilter}
          />
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-center justify-center mt-2 text-mystic-muted">
          <span><span style={{ color: '#4a7fb5' }}>—</span> Harmonious</span>
          <span><span style={{ color: '#b54a4a' }}>—</span> Challenging</span>
          <span><span style={{ color: '#c9a84c' }}>—</span> Neutral</span>
        </div>
      </div>

      {/* Couple profile */}
      <CoupleProfileSection synastryData={synastryData} />

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
      <SynastryAspectsSection aspects={synastryData.synastryAspects} label1={label1} label2={label2} houseOverlay={synastryData.houseOverlay} />

      {/* House overlays */}
      {synastryData.houseOverlay.person1InPerson2Houses.length > 0 && (
        <HouseOverlaySection
          entries={synastryData.houseOverlay.person1InPerson2Houses}
          label={`${label1}'s Planets in ${label2}'s Houses`}
        />
      )}
      {synastryData.houseOverlay.person2InPerson1Houses.length > 0 && (
        <HouseOverlaySection
          entries={synastryData.houseOverlay.person2InPerson1Houses}
          label={`${label2}'s Planets in ${label1}'s Houses`}
        />
      )}

      {/* Composite chart */}
      <CompositeSection synastryData={synastryData} />

      {/* Individual charts */}
      <IndividualChartSection title={`${label1} — Birth Chart`} chartData={chartData} aspects={aspects} defaultOpen={false} />
      <IndividualChartSection title={`${label2} — Birth Chart`} chartData={partnerChartData} aspects={partnerAspects} defaultOpen={false} />

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
