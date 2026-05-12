import { useEffect, useMemo, useState } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import { hasCachedBirthData } from './context/appState'
import FormWizard from './components/form/FormWizard'
import PartnerForm from './components/form/PartnerForm'
import PeriodSelectPanel, { type PeriodOption } from './components/form/PeriodSelectPanel'
import ResultsPage from './components/results/ResultsPage'
import TransitReadingPage from './components/results/TransitReadingPage'
import SynastryPage from './components/results/SynastryPage'
import SynastryTransitPage from './components/results/SynastryTransitPage'
import SkyTodayChart from './components/chart/SkyTodayChart'
import DailySnapshotCard from './components/reading/DailySnapshotCard'
import DreamModal from './components/dream/DreamModal'
import { calculateChart } from './engine/astronomy'
import { calculateAspects } from './engine/aspects'
import { assembleReading } from './data/interpretations'
import { calculateTransits, buildTransitPrompt } from './engine/transits'
import { calculateSynastry, buildSynastryPrompt, buildCoupleTransitPrompt } from './engine/synastry'
import { getGptInterpretation, getStoredApiKey } from './services/gptInterpretation'

function CachedDataLanding() {
  const { state, dispatch } = useApp()
  const { birthData } = state
  const cityLabel = birthData.city ? `${birthData.city.name}, ${birthData.city.country}` : ''
  const [dreamOpen, setDreamOpen] = useState(false)

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-')
    return `${m}/${day}/${y}`
  }

  const formatTime24 = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  const chartData = useMemo(() => {
    if (state.chartData) return state.chartData
    const { city } = birthData
    if (!city || !birthData.date) return null
    try {
      return calculateChart(birthData.date, birthData.time, city.lat, city.lng, city.tz, birthData.unknownTime)
    } catch {
      return null
    }
  }, [state.chartData, birthData])

  const now = new Date()
  const todayLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row items-center lg:items-stretch gap-8 lg:gap-0">
        {/* Left: Menu — 40% */}
        <div className="w-full lg:w-[40%] flex flex-col justify-center px-2 lg:pr-8">
          <div className="bg-mystic-surface/50 border border-mystic-border rounded-xl p-8 glow-gold">
            <p className="text-mystic-muted text-xs uppercase tracking-widest mb-4">Welcome back</p>
            <h2 className="font-heading text-2xl text-mystic-gold mb-6">Your Birth Details</h2>
            <div className="space-y-2 text-sm mb-8">
              <p className="text-mystic-text">
                <span className="text-mystic-purple">Place:</span> {cityLabel}
              </p>
              <p className="text-mystic-text">
                <span className="text-mystic-purple">Time:</span>{' '}
                {birthData.unknownTime ? 'Unknown (solar noon)' : formatTime24(birthData.time)}
              </p>
              <p className="text-mystic-text">
                <span className="text-mystic-purple">Date:</span> {formatDate(birthData.date)}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => dispatch({ type: 'SET_VIEW', view: 'loading' })}
                className="w-full px-6 py-3 bg-mystic-gold text-mystic-bg font-heading rounded-lg hover:bg-mystic-gold/90 transition-colors"
              >
                Read My Chart ✦
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!state.chartData) {
                    dispatch({ type: 'SET_VIEW', view: 'loading' })
                    dispatch({ type: 'PENDING_TRANSIT' })
                  } else {
                    dispatch({ type: 'SET_VIEW', view: 'transit-select' })
                  }
                }}
                className="w-full px-6 py-3 bg-mystic-purple/20 border border-mystic-purple/30 text-mystic-purple font-heading rounded-lg hover:bg-mystic-purple/30 transition-colors"
              >
                Daily / Weekly / Monthly Reading ☽
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'SET_VIEW', view: 'partner-form' })}
                className="w-full px-6 py-3 bg-pink-900/20 border border-pink-500/30 text-pink-400 font-heading rounded-lg hover:bg-pink-900/30 transition-colors"
              >
                Couple Synastry ♡
              </button>
              <button
                type="button"
                onClick={() => setDreamOpen(true)}
                className="w-full px-6 py-3 font-heading rounded-lg transition-all"
                style={{
                  background: 'rgba(109, 40, 217, 0.15)',
                  border: '1px solid rgba(139, 92, 246, 0.28)',
                  color: 'rgba(196, 181, 253, 0.85)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(109, 40, 217, 0.25)'
                  e.currentTarget.style.borderColor = 'rgba(167, 139, 250, 0.42)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(109, 40, 217, 0.15)'
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.28)'
                }}
              >
                Dream Interpretation ☽
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'CLEAR_CACHE' })}
                className="w-full px-6 py-3 bg-mystic-surface border border-mystic-border text-mystic-muted font-heading rounded-lg hover:border-mystic-gold/40 hover:text-mystic-text transition-colors"
              >
                Enter New Birth Data
              </button>
            </div>
          </div>
        </div>

        {/* Mobile-only: Daily Snapshot between menu and sky */}
        {chartData && (
          <div className="w-full lg:hidden">
            <DailySnapshotCard chart={chartData} />
          </div>
        )}

        {/* Right: Today's Sky — 60% */}
        <div className="w-full lg:w-[60%] flex flex-col items-center justify-center relative min-h-[400px] lg:min-h-[600px]">
          <div className="absolute inset-0 flex items-center justify-center">
            <SkyTodayChart />
          </div>
          {/* Label overlaid at the top */}
          <div className="relative z-10 text-center mt-4 lg:mt-0">
            <p className="text-mystic-muted/60 text-xs uppercase tracking-[0.25em] mb-1">The Sky Today</p>
            <p className="text-mystic-gold/40 text-xs font-heading">{todayLabel}</p>
          </div>
        </div>
      </div>

      {/* Desktop-only: Daily Snapshot below the two panels */}
      {chartData && (
        <div className="mt-8 hidden lg:block">
          <DailySnapshotCard chart={chartData} />
        </div>
      )}

      <DreamModal open={dreamOpen} onClose={() => setDreamOpen(false)} chartData={chartData} />
    </div>
  )
}

function TransitSelectScreen() {
  const { state, dispatch } = useApp()
  const { birthData } = state
  const cityLabel = birthData.city ? `${birthData.city.name}, ${birthData.city.country}` : ''

  const periods: PeriodOption[] = [
    { id: 'daily', label: 'Today', icon: '☀', description: 'Moon transits, daily energy & mood. Quick guidance for navigating your day.' },
    { id: 'weekly', label: 'This Week', icon: '✦', description: 'Sun, Mercury & Venus transits. Key themes, communication, and relationship energy.' },
    { id: 'monthly', label: 'This Month', icon: '☽', description: 'Slow planet transits, retrogrades & major shifts. Deep guidance for growth.' },
  ]

  return (
    <PeriodSelectPanel
      title="Transit Reading for"
      subtitle={
        <>
          <h2 className="font-heading text-2xl text-mystic-gold mb-1">{cityLabel}</h2>
          <p className="text-mystic-muted text-sm mb-6">Born {birthData.date}</p>
        </>
      }
      description="Transit readings show how the current planetary positions interact with your natal chart, revealing the energies and themes active in your life right now."
      periods={periods}
      onSelect={period => dispatch({ type: 'START_TRANSIT', period })}
      onCustomMonth={month => dispatch({ type: 'START_TRANSIT', period: 'monthly', targetMonth: month })}
      onBack={() => dispatch({ type: 'SET_VIEW', view: state.reading ? 'results' : 'form' })}
      error={state.transitError}
      accentColor="gold"
    />
  )
}

function SynastryTransitSelectScreen() {
  const { state, dispatch } = useApp()
  const { birthData, partnerBirthData } = state
  const person1Label = birthData.city ? `${birthData.city.name}, ${birthData.city.country}` : ''
  const person2Label = partnerBirthData.city ? `${partnerBirthData.city.name}, ${partnerBirthData.city.country}` : ''

  const periods: PeriodOption[] = [
    { id: 'daily', label: 'Today', icon: '☀', description: "How today's transits affect your relationship dynamic." },
    { id: 'weekly', label: 'This Week', icon: '✦', description: 'Key relationship themes and energies for the week ahead.' },
    { id: 'monthly', label: 'This Month', icon: '☽', description: 'Major shifts and growth opportunities for your relationship.' },
  ]

  return (
    <PeriodSelectPanel
      title="Couple Transits"
      subtitle={
        <>
          <h2 className="font-heading text-2xl text-mystic-gold mb-1">Relationship Transit Reading</h2>
          <div className="text-mystic-muted text-xs mt-1 mb-6 space-y-0.5">
            <p>Person 1: {birthData.date} — {person1Label}</p>
            <p>Person 2: {partnerBirthData.date} — {person2Label}</p>
          </div>
        </>
      }
      description="See how current planetary transits are affecting your relationship by checking the composite chart."
      periods={periods}
      onSelect={period => dispatch({ type: 'START_SYNASTRY_TRANSIT', period })}
      onCustomMonth={month => dispatch({ type: 'START_SYNASTRY_TRANSIT', period: 'monthly', targetMonth: month })}
      onBack={() => dispatch({ type: 'SET_VIEW', view: 'synastry-results' })}
      error={state.synastryError}
      accentColor="pink"
      backLabel="← Back to Compatibility"
    />
  )
}

function AppContent() {
  const { state, dispatch } = useApp()

  // Run calculation when entering loading view
  useEffect(() => {
    if (state.view !== 'loading') return
    const { birthData } = state
    if (!birthData.city) return

    // defer to next tick so loading spinner renders
    const timer = setTimeout(() => {
      try {
        const chart = calculateChart(
          birthData.date,
          birthData.time,
          birthData.city!.lat,
          birthData.city!.lng,
          birthData.city!.tz,
          birthData.unknownTime,
        )
        const aspects = calculateAspects(chart.planets)
        const reading = assembleReading(chart, aspects, birthData.focusAreas[0])
        dispatch({ type: 'SET_RESULTS', chartData: chart, aspects, reading })
      } catch (e) {
        console.error('Calculation error:', e)
        dispatch({ type: 'SET_VIEW', view: 'form' })
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [state.view]) // eslint-disable-line react-hooks/exhaustive-deps

  // Run transit calculation when entering transit-loading view
  useEffect(() => {
    if (state.view !== 'transit-loading' || !state.transitPeriod) return
    const { birthData } = state

    let cancelled = false

    const runTransit = async () => {
      try {
        // Ensure natal chart is calculated
        let chart = state.chartData
        let aspects = state.aspects
        if (!chart && birthData.city) {
          chart = calculateChart(
            birthData.date,
            birthData.time,
            birthData.city.lat,
            birthData.city.lng,
            birthData.city.tz,
            birthData.unknownTime,
          )
          aspects = calculateAspects(chart.planets)
          const reading = assembleReading(chart, aspects, birthData.focusAreas[0])
          dispatch({ type: 'SET_RESULTS', chartData: chart, aspects, reading })
        }

        if (!chart) throw new Error('Unable to calculate natal chart')

        // Calculate transits
        const transitData = calculateTransits(chart, state.transitPeriod!, state.transitTargetMonth ?? undefined)

        // Get GPT interpretation
        const prompt = buildTransitPrompt(chart, transitData, birthData.date, state.transitPeriod!, state.transitTargetMonth ?? undefined)
        const apiKey = getStoredApiKey()
        const interpretation = await getGptInterpretation(prompt, apiKey)

        if (!cancelled) {
          dispatch({ type: 'SET_TRANSIT_RESULTS', transitData, interpretation })
        }
      } catch (e) {
        console.error('Transit calculation error:', e)
        if (!cancelled) {
          dispatch({ type: 'SET_TRANSIT_ERROR', error: e instanceof Error ? e.message : 'An error occurred' })
        }
      }
    }

    const timer = setTimeout(runTransit, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [state.view, state.transitPeriod]) // eslint-disable-line react-hooks/exhaustive-deps

  // Run synastry calculation when entering synastry-loading view
  useEffect(() => {
    if (state.view !== 'synastry-loading') return
    const { birthData, partnerBirthData } = state
    if (!birthData.city || !partnerBirthData.city) return

    let cancelled = false

    const runSynastry = async () => {
      try {
        // Ensure person 1 natal chart
        let chart1 = state.chartData
        let aspects1 = state.aspects
        if (!chart1) {
          chart1 = calculateChart(birthData.date, birthData.time, birthData.city!.lat, birthData.city!.lng, birthData.city!.tz, birthData.unknownTime)
          aspects1 = calculateAspects(chart1.planets)
          const reading = assembleReading(chart1, aspects1, birthData.focusAreas[0])
          dispatch({ type: 'CACHE_NATAL_CHART', chartData: chart1, aspects: aspects1, reading })
        }

        // Calculate person 2 natal chart
        const chart2 = calculateChart(
          partnerBirthData.date, partnerBirthData.time,
          partnerBirthData.city!.lat, partnerBirthData.city!.lng, partnerBirthData.city!.tz,
          partnerBirthData.unknownTime,
        )
        const aspects2 = calculateAspects(chart2.planets)

        // Calculate synastry
        const synData = calculateSynastry(chart1, chart2)

        // Get GPT interpretation
        const prompt = buildSynastryPrompt(chart1, chart2, synData, birthData.date, partnerBirthData.date)
        const apiKey = getStoredApiKey()
        const interpretation = await getGptInterpretation(prompt, apiKey)

        if (!cancelled) {
          dispatch({ type: 'SET_SYNASTRY_RESULTS', partnerChartData: chart2, partnerAspects: aspects2, synastryData: synData, interpretation })
        }
      } catch (e) {
        console.error('Synastry calculation error:', e)
        if (!cancelled) {
          dispatch({ type: 'SET_SYNASTRY_ERROR', error: e instanceof Error ? e.message : 'An error occurred' })
        }
      }
    }

    const timer = setTimeout(runSynastry, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [state.view]) // eslint-disable-line react-hooks/exhaustive-deps

  // Run synastry transit calculation
  useEffect(() => {
    if (state.view !== 'synastry-transit-loading' || !state.synastryTransitPeriod) return
    const { birthData, partnerBirthData, chartData, partnerChartData, synastryData } = state
    if (!chartData || !partnerChartData || !synastryData) return

    let cancelled = false

    const runSynastryTransit = async () => {
      try {
        // Calculate transits against composite chart
        const compositeChartData = {
          planets: synastryData.compositeChart.planets,
          houses: [] as import('./engine/types').HouseCusp[],
          angles: synastryData.compositeChart.angles as import('./engine/types').ChartAngles,
          unknownTime: true,
        }
        const transitData = calculateTransits(compositeChartData, state.synastryTransitPeriod!, state.synastryTransitTargetMonth ?? undefined)

        // Get GPT interpretation
        const prompt = buildCoupleTransitPrompt(chartData, partnerChartData, synastryData, transitData, state.synastryTransitPeriod!, birthData.date, partnerBirthData.date, state.synastryTransitTargetMonth ?? undefined)
        const apiKey = getStoredApiKey()
        const interpretation = await getGptInterpretation(prompt, apiKey)

        if (!cancelled) {
          dispatch({ type: 'SET_SYNASTRY_TRANSIT_RESULTS', transitData, interpretation })
        }
      } catch (e) {
        console.error('Synastry transit error:', e)
        if (!cancelled) {
          dispatch({ type: 'SET_SYNASTRY_TRANSIT_ERROR', error: e instanceof Error ? e.message : 'An error occurred' })
        }
      }
    }

    const timer = setTimeout(runSynastryTransit, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [state.view, state.synastryTransitPeriod]) // eslint-disable-line react-hooks/exhaustive-deps

  const showCachedLanding = state.view === 'form' && hasCachedBirthData() && state.formStep === 0 && !!state.birthData.date && !!state.birthData.city

  const isLandingPage = state.view === 'form'

  return (
    <div className={`min-h-screen bg-mystic-bg flex flex-col items-center px-4 relative ${isLandingPage && showCachedLanding ? 'py-6 lg:py-8' : 'py-12'}`}>
      <div className="starfield" aria-hidden="true" />
      <div className="relative z-10 w-full flex flex-col items-center">
        <header className={`text-center ${isLandingPage && showCachedLanding ? 'mb-6' : 'mb-10'}`}>
          <h1 className="font-heading text-4xl md:text-5xl text-mystic-gold mb-2">Astral Chart</h1>
          <p className="text-mystic-muted text-sm tracking-wide">Your birth chart, decoded</p>
        </header>

        {state.view === 'form' && (showCachedLanding ? <CachedDataLanding /> : <FormWizard />)}
        {state.view === 'loading' && (
          <div className="text-center py-24" role="status" aria-live="polite">
            <div className="text-4xl mb-4 animate-spin" style={{ animationDuration: '3s' }} aria-hidden="true">✦</div>
            <p className="text-mystic-gold font-heading text-xl animate-pulse">Calculating your chart...</p>
            <p className="text-mystic-muted text-sm mt-2">Mapping the heavens at the moment of your birth</p>
          </div>
        )}
        {state.view === 'results' && <ResultsPage />}
        {state.view === 'transit-select' && <TransitSelectScreen />}
        {state.view === 'transit-loading' && (
          <div className="text-center py-24" role="status" aria-live="polite">
            <div className="text-4xl mb-4 animate-spin" style={{ animationDuration: '3s' }} aria-hidden="true">☽</div>
            <p className="text-mystic-purple font-heading text-xl animate-pulse">Reading the transits...</p>
            <p className="text-mystic-muted text-sm mt-2">Consulting the stars for your {state.transitPeriod} guidance</p>
          </div>
        )}
        {state.view === 'transit-results' && <TransitReadingPage />}
        {state.view === 'partner-form' && <PartnerForm />}
        {state.view === 'synastry-loading' && (
          <div className="text-center py-24" role="status" aria-live="polite">
            <div className="text-4xl mb-4 animate-spin" style={{ animationDuration: '3s' }} aria-hidden="true">♡</div>
            <p className="text-pink-400 font-heading text-xl animate-pulse">Analyzing compatibility...</p>
            <p className="text-mystic-muted text-sm mt-2">Comparing the celestial blueprints of two souls</p>
          </div>
        )}
        {state.view === 'synastry-results' && <SynastryPage />}
        {state.view === 'synastry-transit-select' && <SynastryTransitSelectScreen />}
        {state.view === 'synastry-transit-loading' && (
          <div className="text-center py-24" role="status" aria-live="polite">
            <div className="text-4xl mb-4 animate-spin" style={{ animationDuration: '3s' }} aria-hidden="true">☽</div>
            <p className="text-pink-400 font-heading text-xl animate-pulse">Reading couple transits...</p>
            <p className="text-mystic-muted text-sm mt-2">Consulting the stars for your relationship's {state.synastryTransitPeriod} guidance</p>
          </div>
        )}
        {state.view === 'synastry-transit-results' && <SynastryTransitPage />}
      </div>
    </div>
  )
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

export default App
