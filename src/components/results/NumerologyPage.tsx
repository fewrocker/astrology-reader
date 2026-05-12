import { useState, useMemo, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { calculateNumerology } from '../../engine/numerology'
import { buildNumerologyChartData } from '../../engine/numerologyChart'
import { getInterpretation, type NumerologyCategory } from '../../data/numerologyInterpretations'
import type { ChartData } from '../../engine/types'
import { calculateChart } from '../../engine/astronomy'
import { generateAstroNumerologyCrossReading, generateNumerologyNarrative, generateNumerologySkyChartReading, getStoredApiKey } from '../../services/gptInterpretation'
import NumerologyDiscussModal from './NumerologyDiscussModal'
import NumerologySkyChart, { FrequencyBar } from '../chart/NumerologySkyChart'

function getChartData(state: ReturnType<typeof useApp>['state']): ChartData | null {
  if (state.chartData) return state.chartData
  const { birthData } = state
  if (!birthData.city || !birthData.date) return null
  try {
    return calculateChart(birthData.date, birthData.time, birthData.city.lat, birthData.city.lng, birthData.city.tz, birthData.unknownTime)
  } catch {
    return null
  }
}

function calculatePersonalMonth(personalYear: number, currentMonth: number): number {
  const sum = personalYear + currentMonth
  if (sum === 11 || sum === 22 || sum === 33) return sum
  if (sum < 10) return sum
  const digits = String(sum).split('').map(Number)
  const reduced = digits.reduce((a, b) => a + b, 0)
  return reduced === 11 || reduced === 22 || reduced === 33 ? reduced : reduced < 10 ? reduced : calculatePersonalMonth(reduced, 0)
}

function buildNumerologyContext(
  reading: ReturnType<typeof calculateNumerology>,
  chartData: ChartData | null,
  userName: string | undefined,
  birthDate: string,
): string {
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()
  const personalMonth = calculatePersonalMonth(reading.personalYear, currentMonth)

  let ctx = `## Numerology Profile\n`
  if (userName) ctx += `Name: ${userName}\n`
  ctx += `Born: ${birthDate}\n\n`

  ctx += `### Core Numbers\n`
  ctx += `- Life Path: ${reading.lifePath}\n`
  ctx += `- Birthday Number: ${reading.birthdayNumber}\n`
  if (reading.expressionNumber) ctx += `- Expression Number: ${reading.expressionNumber}\n`

  ctx += `\n### Current Cycle Numbers (${currentYear})\n`
  ctx += `- Personal Year: ${reading.personalYear}\n`
  ctx += `- Personal Month: ${personalMonth} (Month ${currentMonth})\n`

  if (chartData) {
    ctx += `\n### Natal Chart Placements\n`
    for (const p of chartData.planets) {
      if (p.name === 'NorthNode') continue
      ctx += `- ${p.name}: ${p.degree}°${p.minute}' ${p.sign}${p.house ? ` (House ${p.house})` : ''}${p.retrograde ? ' [Rx]' : ''}\n`
    }
    ctx += `\nAscendant: ${chartData.angles.ascendant.degree}°${chartData.angles.ascendant.minute}' ${chartData.angles.ascendant.sign}\n`
    ctx += `Midheaven: ${chartData.angles.midheaven.degree}°${chartData.angles.midheaven.minute}' ${chartData.angles.midheaven.sign}\n`
  }

  return ctx
}

interface NumberCardProps {
  label: string
  number: number
  category: NumerologyCategory
  badge?: string
}

function NumberCard({ label, number, category, badge }: NumberCardProps) {
  const [expanded, setExpanded] = useState(false)
  const interpretation = getInterpretation(category, number)
  if (!interpretation) return null

  const isMaster = number === 11 || number === 22 || number === 33

  return (
    <div className="bg-mystic-surface/50 border border-mystic-border rounded-xl overflow-hidden transition-all duration-300 hover:border-mystic-gold/30">
      <div className="p-6 md:p-8">
        {/* Top: number + archetype */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-5">
            <div className="relative">
              <span
                className="font-heading text-mystic-gold block leading-none select-none"
                style={{
                  fontSize: 'clamp(3rem, 8vw, 5rem)',
                  textShadow: isMaster
                    ? '0 0 30px rgba(201,168,76,0.6), 0 0 60px rgba(201,168,76,0.3)'
                    : '0 0 20px rgba(201,168,76,0.4)',
                }}
              >
                {number}
              </span>
              {isMaster && (
                <span className="absolute -top-1 -right-5 text-mystic-gold/60 text-xs font-heading">✦</span>
              )}
            </div>
            <div>
              <p className="text-mystic-muted text-xs uppercase tracking-widest mb-1">{label}</p>
              <h3 className="font-heading text-lg text-mystic-text">
                {number} — {interpretation.archetype}
              </h3>
              {isMaster && (
                <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full font-heading tracking-wider"
                  style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', color: 'rgba(201,168,76,0.9)' }}>
                  Master Number
                </span>
              )}
            </div>
          </div>
          {badge && (
            <span className="text-xs px-2 py-1 rounded-md text-mystic-muted border border-mystic-border">{badge}</span>
          )}
        </div>

        {/* Essence */}
        <p className="text-mystic-text/80 text-sm leading-relaxed mb-5">{interpretation.essence}</p>

        {/* Keywords */}
        <div className="flex flex-wrap gap-2 mb-4">
          {interpretation.keywords.map(kw => (
            <span key={kw} className="px-2.5 py-1 text-xs rounded-full text-mystic-gold/70 font-heading tracking-wide"
              style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
              {kw}
            </span>
          ))}
        </div>

        {/* Shadow toggle — hidden for brief monthly notes */}
        {interpretation.shadow && (
          <>
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-2 text-mystic-muted text-xs hover:text-mystic-text transition-colors group"
            >
              <span className={`transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>›</span>
              <span>{expanded ? 'Hide' : 'Show'} shadow &amp; challenge</span>
            </button>

            {expanded && (
              <div className="mt-4 pl-4 border-l border-mystic-border/60">
                <p className="text-mystic-muted text-sm leading-relaxed italic">{interpretation.shadow}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function KarmicDebtCard({ debtNumber }: { debtNumber: number }) {
  const [expanded, setExpanded] = useState(false)
  const interpretation = getInterpretation('karmicDebt', debtNumber)
  if (!interpretation) return null

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-300"
      style={{
        background: 'rgba(30, 18, 5, 0.6)',
        border: '1px solid rgba(194, 120, 40, 0.45)',
      }}
    >
      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <span
              className="leading-none select-none"
              style={{
                fontSize: 'clamp(2.5rem, 7vw, 4rem)',
                color: 'rgba(194, 120, 40, 0.9)',
                textShadow: '0 0 24px rgba(194, 120, 40, 0.5)',
              }}
            >
              ⚖
            </span>
            <div>
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'rgba(194, 120, 40, 0.6)' }}>
                Karmic Debt
              </p>
              <h3 className="font-heading text-lg" style={{ color: 'rgba(220, 145, 60, 0.95)' }}>
                {interpretation.archetype}
              </h3>
            </div>
          </div>
        </div>

        {/* Essence */}
        <p className="text-sm leading-relaxed mb-5" style={{ color: 'rgba(220, 200, 170, 0.85)' }}>
          {interpretation.essence}
        </p>

        {/* Keywords */}
        <div className="flex flex-wrap gap-2 mb-4">
          {interpretation.keywords.map(kw => (
            <span
              key={kw}
              className="px-2.5 py-1 text-xs rounded-full font-heading tracking-wide"
              style={{
                background: 'rgba(194, 120, 40, 0.1)',
                border: '1px solid rgba(194, 120, 40, 0.3)',
                color: 'rgba(194, 120, 40, 0.85)',
              }}
            >
              {kw}
            </span>
          ))}
        </div>

        {/* Shadow toggle */}
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-2 text-xs transition-colors"
          style={{ color: 'rgba(194, 120, 40, 0.55)' }}
        >
          <span className={`transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>›</span>
          <span>{expanded ? 'Hide' : 'Show'} shadow &amp; consequence</span>
        </button>

        {expanded && (
          <div className="mt-4 pl-4" style={{ borderLeft: '1px solid rgba(194, 120, 40, 0.25)' }}>
            <p className="text-sm leading-relaxed italic" style={{ color: 'rgba(194, 120, 40, 0.65)' }}>
              {interpretation.shadow}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function NarrativeSkeleton() {
  return (
    <div className="bg-mystic-surface/50 border border-mystic-gold/25 rounded-xl p-6 md:p-8">
      <div className="flex items-center gap-2 mb-5">
        <span className="font-heading text-mystic-gold text-sm tracking-widest animate-pulse">✦ Your Reading</span>
      </div>
      <div className="space-y-3">
        {[100, 90, 75, 100, 85, 60, 95, 80].map((w, i) => (
          <div
            key={i}
            className="h-3 rounded-full"
            style={{
              width: `${w}%`,
              background: 'linear-gradient(90deg, rgba(201,168,76,0.06) 0%, rgba(201,168,76,0.14) 50%, rgba(201,168,76,0.06) 100%)',
              backgroundSize: '200% 100%',
              animation: `shimmer 1.8s ease-in-out infinite ${i * 0.1}s`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}

function CrossReadingSkeleton() {
  return (
    <div className="bg-mystic-surface/40 border border-purple-500/20 rounded-xl p-6 md:p-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-mystic-border" />
        <span className="font-heading text-mystic-gold text-sm tracking-widest">✦ Astrology & Numerology</span>
        <div className="h-px flex-1 bg-mystic-border" />
      </div>
      <p className="text-mystic-muted text-xs text-center mb-6 tracking-wide">Reading your chart connections…</p>
      <div className="space-y-3">
        <div className="h-4 rounded-full animate-pulse" style={{ background: 'rgba(201,168,76,0.08)', width: '92%' }} />
        <div className="h-4 rounded-full animate-pulse" style={{ background: 'rgba(201,168,76,0.06)', width: '85%' }} />
        <div className="h-4 rounded-full animate-pulse" style={{ background: 'rgba(201,168,76,0.08)', width: '96%' }} />
        <div className="h-4 rounded-full animate-pulse" style={{ background: 'rgba(201,168,76,0.05)', width: '78%' }} />
        <div className="mt-4 h-4 rounded-full animate-pulse" style={{ background: 'rgba(201,168,76,0.08)', width: '90%' }} />
        <div className="h-4 rounded-full animate-pulse" style={{ background: 'rgba(201,168,76,0.06)', width: '82%' }} />
        <div className="h-4 rounded-full animate-pulse" style={{ background: 'rgba(201,168,76,0.07)', width: '88%' }} />
      </div>
    </div>
  )
}

export default function NumerologyPage() {
  const { state, dispatch } = useApp()
  const { birthData } = state
  const [nameInput, setNameInput] = useState(birthData.userName ?? '')
  const [editingName, setEditingName] = useState(!birthData.userName)
  const [narrativeText, setNarrativeText] = useState<string | null>(null)
  const [narrativeLoading, setNarrativeLoading] = useState(false)
  const [narrativeError, setNarrativeError] = useState<string | null>(null)

  const [crossReadingText, setCrossReadingText] = useState<string | null>(null)
  const [crossReadingLoading, setCrossReadingLoading] = useState(false)
  const [crossReadingError, setCrossReadingError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [discussOpen, setDiscussOpen] = useState(false)

  const [skyReadingText, setSkyReadingText] = useState<string | null>(null)
  const [skyReadingLoading, setSkyReadingLoading] = useState(false)
  const [skyReadingError, setSkyReadingError] = useState<string | null>(null)

  const apiKey = getStoredApiKey()

  const chartData = useMemo(() => getChartData(state), [state.chartData, birthData]) // eslint-disable-line react-hooks/exhaustive-deps

  const skyChartData = useMemo(
    () => (chartData ? buildNumerologyChartData(chartData) : null),
    [chartData],
  )

  const reading = useMemo(
    () => calculateNumerology(birthData.date, birthData.userName || undefined),
    [birthData.date, birthData.userName],
  )

  // Narrative GPT call — fires in parallel with cross-reading
  useEffect(() => {
    if (!apiKey) return
    let cancelled = false
    setNarrativeLoading(true)
    setNarrativeText(null)
    setNarrativeError(null)
    generateNumerologyNarrative(reading, birthData.userName, apiKey)
      .then(text => { if (!cancelled) setNarrativeText(text) })
      .catch(err => { if (!cancelled) setNarrativeError((err as Error).message) })
      .finally(() => { if (!cancelled) setNarrativeLoading(false) })
    return () => { cancelled = true }
  }, [reading, birthData.userName]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cross-reading GPT call — fires in parallel with narrative
  useEffect(() => {
    if (!chartData || !apiKey) return
    let cancelled = false
    setCrossReadingLoading(true)
    setCrossReadingError(null)
    generateAstroNumerologyCrossReading(reading, chartData, birthData.userName, apiKey)
      .then(text => { if (!cancelled) setCrossReadingText(text) })
      .catch(err => { if (!cancelled) setCrossReadingError(err.message) })
      .finally(() => { if (!cancelled) setCrossReadingLoading(false) })
    return () => { cancelled = true }
  }, [chartData, reading, birthData.userName, apiKey, retryCount]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sky chart reading — fires after chart renders, never blocks it
  useEffect(() => {
    if (!skyChartData || !apiKey) return
    let cancelled = false
    setSkyReadingLoading(true)
    setSkyReadingText(null)
    setSkyReadingError(null)
    generateNumerologySkyChartReading(
      { name: birthData.userName, date: birthData.date },
      skyChartData.frequencyMap,
      apiKey,
    )
      .then(text => { if (!cancelled) setSkyReadingText(text) })
      .catch(err => { if (!cancelled) setSkyReadingError((err as Error).message) })
      .finally(() => { if (!cancelled) setSkyReadingLoading(false) })
    return () => { cancelled = true }
  }, [skyChartData, birthData.userName, birthData.date, apiKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const numerologyContext = useMemo(
    () => buildNumerologyContext(reading, chartData, birthData.userName, birthData.date),
    [reading, chartData, birthData.userName, birthData.date],
  )

  const discussChips = useMemo(() => {
    const chips = [
      'What does my Life Path mean for love?',
      `How does my Personal Year ${reading.personalYear} shape this season?`,
      'What should I focus on this Personal Month?',
      'What does my Life Path mean for my career?',
    ]
    if (reading.expressionNumber) {
      chips.splice(2, 0, `What's the interaction between my Life Path ${reading.lifePath} and Expression ${reading.expressionNumber}?`)
    }
    if (chartData) {
      chips.push('How do my numbers interact with my birth chart?')
    }
    return chips
  }, [reading, chartData])

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-')
    return `${m}/${day}/${y}`
  }

  const personalMonthBadge = useMemo(() => {
    const now = new Date()
    const monthName = now.toLocaleString('default', { month: 'long' })
    return `${monthName} ${now.getFullYear()}`
  }, [])

  const handleSaveName = () => {
    const trimmed = nameInput.trim()
    dispatch({ type: 'SET_USER_NAME', name: trimmed || undefined })
    setEditingName(false)
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <p className="text-mystic-muted text-xs uppercase tracking-widest mb-2">Sacred Numbers</p>
        <h2 className="font-heading text-3xl text-mystic-gold mb-1">✦ Your Numerology Reading</h2>
        <p className="text-mystic-muted text-sm">Born {formatDate(birthData.date)}</p>
      </div>

      {/* ─── Sky in Numbers section ─── */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 bg-mystic-border" />
          <span className="font-heading text-mystic-gold text-sm tracking-widest">✦ Your Sky in Numbers</span>
          <div className="h-px flex-1 bg-mystic-border" />
        </div>

        {chartData ? (
          <>
            {/* Chart */}
            <div className="rounded-2xl overflow-hidden mb-3" style={{ background: 'rgba(10,10,15,0.6)', border: '1px solid rgba(58,58,80,0.6)' }}>
              <NumerologySkyChart chartData={chartData} />
            </div>

            {/* Frequency bar */}
            <div className="rounded-xl mb-6" style={{ background: 'rgba(18,18,26,0.5)', border: '1px solid rgba(58,58,80,0.5)' }}>
              <p className="text-center text-mystic-muted text-xs tracking-widest pt-4 px-4">Number frequency across your sky</p>
              <FrequencyBar frequencyMap={skyChartData!.frequencyMap} />
            </div>

            {/* Sky chart GPT reading */}
            {!apiKey ? (
              <div className="bg-mystic-surface/30 border border-dashed border-mystic-border rounded-xl p-5 text-center">
                <p className="text-mystic-muted text-sm">Add your OpenAI API key to receive a reading of your numerical sky.</p>
              </div>
            ) : skyReadingLoading ? (
              <div className="bg-mystic-surface/50 border border-mystic-gold/20 rounded-xl p-6 md:p-8">
                <div className="flex items-center gap-2 mb-5">
                  <span className="font-heading text-mystic-gold text-sm tracking-widest animate-pulse">✦ Reading your sky…</span>
                </div>
                <div className="space-y-3">
                  {[95, 85, 70, 100, 80, 65, 90].map((w, i) => (
                    <div
                      key={i}
                      className="h-3 rounded-full"
                      style={{
                        width: `${w}%`,
                        background: 'linear-gradient(90deg, rgba(201,168,76,0.06) 0%, rgba(201,168,76,0.14) 50%, rgba(201,168,76,0.06) 100%)',
                        backgroundSize: '200% 100%',
                        animation: `shimmer 1.8s ease-in-out infinite ${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
                <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
              </div>
            ) : skyReadingError ? (
              <div className="bg-mystic-surface/50 border border-mystic-border rounded-xl p-6 text-center space-y-3">
                <p className="text-mystic-muted text-sm">The stars are quiet right now — try again in a moment.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSkyReadingError(null)
                    setSkyReadingLoading(true)
                    generateNumerologySkyChartReading(
                      { name: birthData.userName, date: birthData.date },
                      skyChartData!.frequencyMap,
                      apiKey,
                    )
                      .then(text => setSkyReadingText(text))
                      .catch(err => setSkyReadingError((err as Error).message))
                      .finally(() => setSkyReadingLoading(false))
                  }}
                  className="px-4 py-2 text-xs font-heading rounded-lg transition-all"
                  style={{ background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.30)', color: 'rgba(201,168,76,0.85)' }}
                >
                  ✦ Try Again
                </button>
              </div>
            ) : skyReadingText ? (
              <div className="bg-mystic-surface/50 border border-mystic-gold/20 rounded-xl p-6 md:p-8">
                <h3 className="font-heading text-mystic-gold text-lg mb-5">✦ Your Sky Reading</h3>
                <div className="space-y-4">
                  {skyReadingText.split(/\n\n+/).filter(Boolean).map((para, i) => (
                    <p key={i} className="text-mystic-text/85 text-sm leading-relaxed">{para}</p>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="bg-mystic-surface/30 border border-dashed border-mystic-border rounded-xl p-8 text-center">
            <p className="font-heading text-mystic-gold/50 text-xl mb-2">✦</p>
            <p className="text-mystic-text/70 text-sm leading-relaxed">
              Generate your birth chart above to see your sky of numbers.
            </p>
          </div>
        )}
      </div>

      {/* Name input for Expression Number */}
      <div className="mb-8 bg-mystic-surface/30 border border-mystic-border rounded-xl p-5">
        <p className="text-mystic-muted text-xs uppercase tracking-widest mb-3">Expression Number</p>
        {editingName ? (
          <div className="flex gap-3 items-center">
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveName()}
              placeholder="Enter your full birth name for Expression Number"
              className="flex-1 px-4 py-2.5 bg-mystic-bg border border-mystic-border rounded-lg text-mystic-text text-sm focus:border-mystic-gold/50 focus:outline-none placeholder:text-mystic-muted/50"
            />
            <button
              type="button"
              onClick={handleSaveName}
              className="px-4 py-2.5 font-heading text-sm rounded-lg transition-all"
              style={{
                background: 'rgba(201,168,76,0.12)',
                border: '1px solid rgba(201,168,76,0.35)',
                color: 'rgba(201,168,76,0.9)',
              }}
            >
              ✦ Add
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-mystic-text text-sm">
              <span className="text-mystic-muted">Name: </span>
              <span className="text-mystic-gold font-heading">{birthData.userName}</span>
            </p>
            <button
              type="button"
              onClick={() => { setNameInput(birthData.userName ?? ''); setEditingName(true) }}
              className="text-mystic-muted text-xs hover:text-mystic-text transition-colors"
            >
              Edit
            </button>
          </div>
        )}
        {!birthData.userName && !editingName && (
          <p className="text-mystic-muted/60 text-xs mt-2">Add your full birth name to reveal your Expression Number.</p>
        )}
      </div>

      {/* Number cards */}
      <div className="space-y-5 mb-10">
        <NumberCard
          label="Life Path"
          number={reading.lifePath}
          category="lifePath"
        />
        {reading.karmicDebt !== null && (
          <KarmicDebtCard debtNumber={reading.karmicDebt} />
        )}
        <NumberCard
          label="Birthday Number"
          number={reading.birthdayNumber}
          category="birthdayNumber"
        />
        <NumberCard
          label="Personal Year"
          number={reading.personalYear}
          category="personalYear"
          badge={String(new Date().getFullYear())}
        />
        <NumberCard
          label="Personal Month"
          number={reading.personalMonth}
          category="personalMonth"
          badge={personalMonthBadge}
        />
        {reading.expressionNumber ? (
          <NumberCard
            label="Expression Number"
            number={reading.expressionNumber}
            category="expressionNumber"
          />
        ) : (
          <div className="bg-mystic-surface/20 border border-dashed border-mystic-border rounded-xl p-6 text-center">
            <p className="text-mystic-gold/50 font-heading text-lg mb-1">Expression Number</p>
            <p className="text-mystic-muted text-sm">Enter your full birth name above to reveal your Expression Number.</p>
          </div>
        )}
        {reading.soulUrge ? (
          <NumberCard
            label="Soul Urge"
            number={reading.soulUrge}
            category="soulUrge"
          />
        ) : (
          <div className="bg-mystic-surface/20 border border-dashed border-mystic-border rounded-xl p-6 text-center">
            <p className="text-mystic-gold/50 font-heading text-lg mb-1">Soul Urge (Heart's Desire)</p>
            <p className="text-mystic-muted text-sm">Enter your full birth name above to reveal your Soul Urge Number.</p>
          </div>
        )}
      </div>

      {/* GPT Narrative Card */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px flex-1 bg-mystic-border" />
          <span className="font-heading text-mystic-gold text-sm tracking-widest">✦ Your Reading</span>
          <div className="h-px flex-1 bg-mystic-border" />
        </div>
        {!apiKey ? (
          <div className="bg-mystic-surface/30 border border-dashed border-mystic-border rounded-xl p-5 text-center">
            <p className="text-mystic-muted text-sm">Add your OpenAI API key to unlock your personalized reading.</p>
          </div>
        ) : narrativeLoading ? (
          <NarrativeSkeleton />
        ) : narrativeError ? (
          <div className="bg-mystic-surface/50 border border-mystic-border rounded-xl p-6 text-center space-y-3">
            <p className="text-mystic-muted text-sm">The stars are quiet right now — try again in a moment.</p>
            <button
              type="button"
              onClick={() => {
                setNarrativeError(null)
                setNarrativeLoading(true)
                generateNumerologyNarrative(reading, birthData.userName, apiKey)
                  .then(text => setNarrativeText(text))
                  .catch(err => setNarrativeError((err as Error).message))
                  .finally(() => setNarrativeLoading(false))
              }}
              className="px-4 py-2 text-xs font-heading rounded-lg transition-all"
              style={{
                background: 'rgba(201,168,76,0.10)',
                border: '1px solid rgba(201,168,76,0.30)',
                color: 'rgba(201,168,76,0.85)',
              }}
            >
              ✦ Try Again
            </button>
          </div>
        ) : narrativeText ? (
          <div className="bg-mystic-surface/50 border border-mystic-gold/25 rounded-xl p-6 md:p-8">
            <h3 className="font-heading text-mystic-gold text-lg mb-5">✦ Your Numerology Reading</h3>
            <div className="space-y-4">
              {narrativeText.split(/\n\n+/).filter(Boolean).map((para, i) => (
                <p key={i} className="text-mystic-text/85 text-sm leading-relaxed">{para}</p>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Astrology & Numerology GPT cross-reading */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px flex-1 bg-mystic-border" />
          <span className="font-heading text-mystic-gold text-sm tracking-widest">✦ Astrology & Numerology</span>
          <div className="h-px flex-1 bg-mystic-border" />
        </div>

        {!chartData ? (
          <div className="bg-mystic-surface/30 border border-mystic-border rounded-xl p-6 text-center">
            <p className="text-mystic-muted text-sm">Enter your birth data to unlock the astrology ↔ numerology synthesis</p>
          </div>
        ) : !apiKey ? (
          <div className="bg-mystic-surface/30 border border-mystic-border rounded-xl p-6 text-center">
            <p className="text-mystic-muted text-sm">Add an OpenAI API key in settings to unlock the live astrology ↔ numerology synthesis</p>
          </div>
        ) : crossReadingLoading ? (
          <CrossReadingSkeleton />
        ) : crossReadingError ? (
          <div className="bg-mystic-surface/40 border border-purple-500/20 rounded-xl p-6 text-center">
            <p className="text-mystic-muted text-sm mb-4">The stars are quiet right now — try again in a moment</p>
            <button
              type="button"
              onClick={() => setRetryCount(c => c + 1)}
              className="px-5 py-2 font-heading text-sm rounded-lg transition-all"
              style={{
                background: 'rgba(201,168,76,0.10)',
                border: '1px solid rgba(201,168,76,0.30)',
                color: 'rgba(201,168,76,0.85)',
              }}
            >
              ✦ Try again
            </button>
          </div>
        ) : crossReadingText ? (
          <div className="bg-mystic-surface/40 border border-purple-500/20 rounded-xl p-6 md:p-8">
            <p className="text-mystic-muted text-xs text-center mb-6 tracking-wide">Where your numbers echo in your natal chart</p>
            <div className="space-y-4">
              {crossReadingText.split('\n').filter(p => p.trim().length > 0).map((p, i) => (
                <p key={i} className="text-mystic-text/85 text-sm leading-relaxed">{p}</p>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Action buttons */}
      <div className="text-center mb-12 flex flex-col sm:flex-row gap-3 justify-center">
        <button
          type="button"
          onClick={() => setDiscussOpen(true)}
          className="px-8 py-3 bg-mystic-blue/10 border border-mystic-blue/30 text-mystic-blue font-heading rounded-lg hover:bg-mystic-blue/20 transition-colors"
        >
          Discuss ✦
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_VIEW', view: 'form' })}
          className="px-8 py-3 bg-mystic-gold/10 border border-mystic-gold/30 text-mystic-gold font-heading rounded-lg hover:bg-mystic-gold/20 transition-colors"
        >
          ← Back to Menu
        </button>
      </div>

      <NumerologyDiscussModal
        open={discussOpen}
        onClose={() => setDiscussOpen(false)}
        context={numerologyContext}
        chips={discussChips}
      />
    </div>
  )
}
