import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import MigrationBanner from './components/auth/MigrationBanner'
import ErrorBoundary from './components/ErrorBoundary'
import StorageWarningBanner from './components/StorageWarningBanner'
import NetworkWarningBanner from './components/NetworkWarningBanner'
import AuthModal from './components/auth/AuthModal'
import UpgradeModal from './components/subscription/UpgradeModal'
import HomeScreen from './components/home/HomeScreen'
import FormWizard from './components/form/FormWizard'
import PartnerForm from './components/form/PartnerForm'
import PeriodSelectPanel, { type PeriodOption } from './components/form/PeriodSelectPanel'
import ResultsPage from './components/results/ResultsPage'
import TransitReadingPage from './components/results/TransitReadingPage'
import SynastryPage from './components/results/SynastryPage'
import SynastryTransitPage from './components/results/SynastryTransitPage'
import SolarReturnPage from './components/results/SolarReturnPage'
import NumerologyPage from './components/results/NumerologyPage'
import TodayPage from './components/reading/TodayPage'
import CosmicJournalPage from './components/journal/CosmicJournalPage'
import { calculateChart } from './engine/astronomy'
import { calculateAspects } from './engine/aspects'
import { assembleReading } from './data/interpretations'
import { calculateTransits, buildTransitPrompt } from './engine/transits'
import { calculateSynastry } from './engine/synastry'
import { calculateSolarReturn } from './engine/solarReturn'
import { getGptInterpretation, getSolarReturnInterpretation, getSynastryInterpretation, getCoupleTransitInterpretation, RateLimitError } from './services/gptInterpretation'
import type { RateLimitInfo } from './services/gptInterpretation'
import { hasCachedBirthData, resolvePersonLabel } from './context/appState'
import { track } from './services/analytics'

function SessionBadge({ onOpenAuth }: { onOpenAuth: () => void }) {
  const { isAuthenticated, displayName, logout, tier, todayUsed } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!isAuthenticated) {
    return (
      <button
        type="button"
        onClick={onOpenAuth}
        className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-heading tracking-wide transition-all duration-150"
        style={{
          color: 'rgba(201,168,76,0.75)',
          border: '1px solid rgba(201,168,76,0.25)',
          background: 'rgba(201,168,76,0.06)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = '#c9a84c'
          e.currentTarget.style.borderColor = 'rgba(201,168,76,0.55)'
          e.currentTarget.style.background = 'rgba(201,168,76,0.12)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = 'rgba(201,168,76,0.75)'
          e.currentTarget.style.borderColor = 'rgba(201,168,76,0.25)'
          e.currentTarget.style.background = 'rgba(201,168,76,0.06)'
        }}
        aria-label="Sign in"
      >
        <span style={{ fontSize: '0.75rem', lineHeight: 1 }}>✦</span>
        Sign in
      </button>
    )
  }

  // For free-tier: show remaining reads count (spec §37)
  // For paid tiers: show tier name badge (spec §38-39)
  const tierLimits: Record<string, number> = { free: 3, basic: 20, advanced: 100 }
  const remaining = (tierLimits[tier] ?? 3) - todayUsed
  const tierLabel = tier === 'basic' ? 'Basic ✦' : tier === 'advanced' ? 'Advanced ✦' : null
  const readingsLabel = tier === 'free' ? `${remaining} reading${remaining !== 1 ? 's' : ''} left today` : null
  return (
    <div ref={ref} className="absolute right-0 top-1/2 -translate-y-1/2">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center text-xl transition-colors"
        style={{ color: '#c9a84c', lineHeight: 1, filter: 'drop-shadow(0 0 6px rgba(201,168,76,0.5))' }}
        aria-label="Account menu"
        title={displayName}
      >
        {tier === 'free' && remaining <= 1 && (
          <span
            className="font-heading"
            aria-hidden="true"
            style={{
              fontSize: '0.65rem',
              color: 'rgba(201,168,76,0.55)',
              letterSpacing: '0.04em',
              marginRight: '0.35rem',
              lineHeight: 1,
            }}
          >
            {remaining === 1 ? '1 left' : '0 left'}
          </span>
        )}
        ✦
      </button>
      {open && (
        <div
          className="absolute right-0 top-8 z-50 min-w-[160px] rounded-xl overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, rgba(22,16,8,0.98) 0%, rgba(15,11,5,0.99) 100%)',
            border: '1px solid rgba(201,168,76,0.28)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          <div
            className="px-4 py-3 text-xs font-heading border-b"
            style={{ color: '#c9a84c', borderColor: 'rgba(201,168,76,0.15)' }}
          >
            {displayName}
            {/* Tier indicator — readings left (free) or tier badge (paid) (spec §36-39) */}
            {readingsLabel && (
              <div
                className="text-xs font-heading mt-1"
                style={{ color: 'rgba(201,168,76,0.45)' }}
                role="status"
                aria-live="polite"
              >
                {readingsLabel}
              </div>
            )}
            {tierLabel && (
              <div
                className="text-xs font-heading mt-1"
                style={{ color: 'rgba(201,168,76,0.75)' }}
                role="status"
                aria-live="polite"
              >
                {tierLabel}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={async () => { setOpen(false); await logout() }}
            className="w-full text-left px-4 py-3 text-xs transition-colors"
            style={{ color: 'rgba(201,168,76,0.6)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#c9a84c')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.6)')}
          >
            Sign Out
          </button>
        </div>
      )}
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
  const label1 = resolvePersonLabel(birthData)
  const label2 = resolvePersonLabel(partnerBirthData)
  const person1CityStr = birthData.city ? `${birthData.city.name}, ${birthData.city.country}` : ''
  const person2CityStr = partnerBirthData.city ? `${partnerBirthData.city.name}, ${partnerBirthData.city.country}` : ''

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
            <p>{label1}{person1CityStr ? ` — ${person1CityStr}` : ''}</p>
            <p>{label2}{person2CityStr ? ` — ${person2CityStr}` : ''}</p>
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
  const { isAuthenticated, tier, isLoading: authLoading, incrementTodayUsed } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login')
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null)
  const [intendedUpgradeTier, setIntendedUpgradeTier] = useState<'basic' | 'advanced' | undefined>(undefined)

  const openAuth = (tab: 'login' | 'register' = 'login') => {
    setAuthModalTab(tab)
    setAuthModalOpen(true)
  }

  // Track page_view on initial mount
  useEffect(() => {
    track('page_view', {
      view: state.view,
      has_cached_data: hasCachedBirthData(),
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const openUpgrade = useCallback((info: RateLimitInfo, intendedTier?: 'basic' | 'advanced') => {
    setRateLimitInfo(info)
    setIntendedUpgradeTier(intendedTier)
    setUpgradeModalOpen(true)
  }, [])

  const journalChartData = useMemo(() => {
    if (state.chartData) return state.chartData
    const { city } = state.birthData
    if (!city || !state.birthData.date) return null
    try {
      return calculateChart(state.birthData.date, state.birthData.time, city.lat, city.lng, city.tz, state.birthData.unknownTime)
    } catch {
      return null
    }
  }, [state.chartData, state.birthData])

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
        track('form_completed', { has_birth_time: !birthData.unknownTime })
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

        // Calculate transits synchronously and transition to results immediately
        const transitData = calculateTransits(chart, state.transitPeriod!, state.transitTargetMonth ?? undefined)
        if (!cancelled) {
          dispatch({ type: 'SET_TRANSIT_DATA', transitData, transitPeriod: state.transitPeriod!, transitTargetMonth: state.transitTargetMonth })
        }

        // Get GPT interpretation asynchronously (server computes prompt from period + birth data)
        const prompt = buildTransitPrompt(chart, transitData, birthData.date, state.transitPeriod!, state.transitTargetMonth ?? undefined)
        void prompt // built for local display only; server recomputes from period
        const interpretation = await getGptInterpretation(state.transitPeriod!, state.transitTargetMonth ?? undefined)

        if (!cancelled) {
          dispatch({ type: 'SET_TRANSIT_INTERPRETATION', interpretation })
          incrementTodayUsed()
        }
      } catch (e) {
        if (e instanceof RateLimitError) {
          if (!cancelled) openUpgrade(e.info)
          return
        }
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

        // Calculate synastry synchronously and transition to results immediately
        const synData = calculateSynastry(chart1, chart2)
        if (!cancelled) {
          dispatch({ type: 'SET_SYNASTRY_DATA', partnerChartData: chart2, partnerAspects: aspects2, synastryData: synData })
        }

        // Get GPT interpretation asynchronously (server-sovereign — raw birth fields sent, prompt built server-side)
        const interpretation = await getSynastryInterpretation(
          { date: birthData.date, time: birthData.unknownTime ? null : (birthData.time || null), lat: birthData.city!.lat, lng: birthData.city!.lng, tz: birthData.city!.tz, name: birthData.userName?.trim() || undefined },
          { date: partnerBirthData.date, time: partnerBirthData.unknownTime ? null : (partnerBirthData.time || null), lat: partnerBirthData.city!.lat, lng: partnerBirthData.city!.lng, tz: partnerBirthData.city!.tz, name: partnerBirthData.userName?.trim() || undefined },
        )

        dispatch({ type: 'SET_SYNASTRY_INTERPRETATION', interpretation })
        if (!cancelled) incrementTodayUsed()
      } catch (e) {
        if (e instanceof RateLimitError) {
          if (!cancelled) openUpgrade(e.info)
          return
        }
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
          houseSystem: 'placidus' as const,
        }
        const transitData = calculateTransits(compositeChartData, state.synastryTransitPeriod!, state.synastryTransitTargetMonth ?? undefined)

        // Get GPT interpretation (server-sovereign — raw birth fields sent, prompt built server-side)
        const interpretation = await getCoupleTransitInterpretation(
          { date: birthData.date, time: birthData.unknownTime ? null : (birthData.time || null), lat: birthData.city!.lat, lng: birthData.city!.lng, tz: birthData.city!.tz, name: birthData.userName?.trim() || undefined },
          { date: partnerBirthData.date, time: partnerBirthData.unknownTime ? null : (partnerBirthData.time || null), lat: partnerBirthData.city!.lat, lng: partnerBirthData.city!.lng, tz: partnerBirthData.city!.tz, name: partnerBirthData.userName?.trim() || undefined },
          state.synastryTransitPeriod!,
          state.synastryTransitTargetMonth ?? undefined,
        )

        if (!cancelled) {
          dispatch({ type: 'SET_SYNASTRY_TRANSIT_RESULTS', transitData, interpretation })
          incrementTodayUsed()
        }
      } catch (e) {
        if (e instanceof RateLimitError) {
          if (!cancelled) openUpgrade(e.info)
          return
        }
        console.error('Synastry transit error:', e)
        if (!cancelled) {
          dispatch({ type: 'SET_SYNASTRY_TRANSIT_ERROR', error: e instanceof Error ? e.message : 'An error occurred' })
        }
      }
    }

    const timer = setTimeout(runSynastryTransit, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [state.view, state.synastryTransitPeriod]) // eslint-disable-line react-hooks/exhaustive-deps

  // Run solar return calculation when entering solar-return-loading view
  useEffect(() => {
    if (state.view !== 'solar-return-loading') return
    const { birthData } = state
    if (!birthData.city) return

    let cancelled = false

    const runSolarReturn = async () => {
      try {
        // Ensure natal chart is calculated
        let chart = state.chartData
        let aspects = state.aspects
        if (!chart) {
          chart = calculateChart(
            birthData.date,
            birthData.time,
            birthData.city!.lat,
            birthData.city!.lng,
            birthData.city!.tz,
            birthData.unknownTime,
          )
          aspects = calculateAspects(chart.planets)
          const reading = assembleReading(chart, aspects, birthData.focusAreas[0])
          dispatch({ type: 'CACHE_NATAL_CHART', chartData: chart, aspects, reading })
        }

        if (!chart) throw new Error('Unable to calculate natal chart')

        // Calculate solar return synchronously and transition to results immediately
        const srData = calculateSolarReturn(chart, birthData.date, birthData.city!.lat, birthData.city!.lng, state.solarReturnTargetYear ?? undefined)
        if (!cancelled) {
          dispatch({ type: 'SET_SOLAR_RETURN_DATA', data: srData, targetYear: srData.targetYear })
        }

        // Get GPT interpretation asynchronously — server computes from stored birth data
        const interpretation = await getSolarReturnInterpretation(srData.targetYear)

        if (!cancelled) {
          dispatch({ type: 'SET_SOLAR_RETURN_INTERPRETATION', interpretation })
          incrementTodayUsed()
        }
      } catch (e) {
        if (e instanceof RateLimitError) {
          if (!cancelled) openUpgrade(e.info)
          return
        }
        console.error('Solar return error:', e)
        if (!cancelled) {
          dispatch({ type: 'SET_SOLAR_RETURN_ERROR', error: e instanceof Error ? e.message : 'An error occurred' })
        }
      }
    }

    const timer = setTimeout(runSolarReturn, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [state.view, state.solarReturnTargetYear]) // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading) {
    return (
      <div className="min-h-screen bg-mystic-bg flex flex-col items-center justify-center gap-4">
        <div className="starfield" aria-hidden="true" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="text-4xl animate-spin" style={{ animationDuration: '3s' }} aria-hidden="true">✦</div>
          <p className="font-heading text-mystic-gold text-xl">Astral Chart</p>
          <p className="text-mystic-muted text-sm tracking-wide">Your birth chart, decoded</p>
        </div>
      </div>
    )
  }

  const showCachedLanding = state.view === 'form' && state.formCompleted && !!state.birthData.date && !!state.birthData.city

  const isLandingPage = state.view === 'form'

  return (
    <div className={`min-h-screen bg-mystic-bg flex flex-col items-center px-4 relative ${isLandingPage && showCachedLanding ? 'py-6 lg:py-8' : 'py-12'}`}>
      <div className="starfield" aria-hidden="true" />
      <div className="relative z-10 w-full flex flex-col items-center">
        {state.storageWarning && (
          <div className="w-full max-w-2xl mb-4">
            <StorageWarningBanner />
          </div>
        )}
        <div className="w-full max-w-2xl mb-2">
          <NetworkWarningBanner />
        </div>
        <header className={`text-center relative z-20 ${isLandingPage && showCachedLanding ? 'mb-6' : 'mb-10'} w-full max-w-2xl`}>
          <h1 className="font-heading text-4xl md:text-5xl text-mystic-gold mb-2">Astral Chart</h1>
          <p className="text-mystic-muted text-sm tracking-wide">Your birth chart, decoded</p>
          <SessionBadge onOpenAuth={() => openAuth('login')} />
        </header>

        {state.view === 'form' && (showCachedLanding ? <HomeScreen onOpenAuth={() => openAuth('register')} /> : <FormWizard />)}
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
            <p className="text-mystic-purple font-heading text-xl animate-pulse">Consulting the stars...</p>
            <p className="text-mystic-muted text-sm mt-2">Mapping the sky for your chart...</p>
          </div>
        )}
        {state.view === 'transit-results' && <TransitReadingPage />}
        {state.view === 'partner-form' && <PartnerForm />}
        {state.view === 'synastry-loading' && (
          <div className="text-center py-24" role="status" aria-live="polite">
            <div className="text-4xl mb-4 animate-spin" style={{ animationDuration: '3s' }} aria-hidden="true">♡</div>
            <p className="text-pink-400 font-heading text-xl animate-pulse">Reading your celestial bond...</p>
            <p className="text-mystic-muted text-sm mt-2">Aligning two cosmic blueprints...</p>
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
        {state.view === 'numerology' && <NumerologyPage />}
        {state.view === 'solar-return-loading' && (
          <div className="text-center py-24" role="status" aria-live="polite">
            <div className="text-4xl mb-4 animate-spin" style={{ animationDuration: '3s', color: '#e8a830' }} aria-hidden="true">☀</div>
            <p className="font-heading text-xl animate-pulse" style={{ color: '#e8a830' }}>Tracking the Sun's return...</p>
            <p className="text-mystic-muted text-sm mt-2">Calculating your solar threshold...</p>
          </div>
        )}
        {state.view === 'solar-return' && <SolarReturnPage />}
        {state.view === 'today' && (
          <TodayPage chartData={journalChartData} birthDate={state.birthData.date} />
        )}
        {state.view === 'journal' && (
          <CosmicJournalPage chartData={journalChartData} birthData={state.birthData} />
        )}
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authModalTab}
      />

      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        currentTier={tier}
        resetAt={rateLimitInfo?.resetAt ?? null}
        authenticated={isAuthenticated}
        intendedTier={intendedUpgradeTier}
      />
    </div>
  )
}

function MigrationGate({ children }: { children: React.ReactNode }) {
  const { isMigrationPending, migrationCandidate, dismissMigration } = useAuth()

  if (isMigrationPending && migrationCandidate) {
    return (
      <>
        {children}
        <MigrationBanner
          journalCount={migrationCandidate.journalCount}
          dreamCount={migrationCandidate.dreamCount}
          hasBirthData={migrationCandidate.hasBirthData}
          onMigrate={dismissMigration}
          onSkip={dismissMigration}
        />
      </>
    )
  }

  return <>{children}</>
}

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AuthProvider>
          <MigrationGate>
            <AppContent />
          </MigrationGate>
        </AuthProvider>
      </AppProvider>
    </ErrorBoundary>
  )
}

export default App
