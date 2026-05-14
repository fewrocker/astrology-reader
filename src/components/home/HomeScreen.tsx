import { useMemo, useRef, useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { calculateChart } from '../../engine/astronomy'
import { ZODIAC_GLYPHS } from '../../engine/types'
import SkyTodayChart from '../chart/SkyTodayChart'
import DailySnapshotCard from '../reading/DailySnapshotCard'
import DreamModal from '../dream/DreamModal'
import ReadingsModal from '../navigation/ReadingsModal'
import { track } from '../../services/analytics'

interface HomeScreenProps {
  onOpenAuth: () => void
}

export default function HomeScreen({ onOpenAuth }: HomeScreenProps) {
  const { state, dispatch } = useApp()
  const { isAuthenticated } = useAuth()
  const { birthData } = state
  const [readingsOpen, setReadingsOpen] = useState(false)
  const [dreamOpen, setDreamOpen] = useState(false)
  const ctaRef = useRef<HTMLButtonElement>(null)
  const nudgeRef = useRef<HTMLButtonElement>(null)

  const NUDGE_COPY = 'Save your readings ✦'

  // Fire auth_nudge_seen once when the nudge button enters the viewport
  useEffect(() => {
    if (isAuthenticated) return
    const el = nudgeRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          track('auth_nudge_seen', { nudge_copy: NUDGE_COPY })
          observer.disconnect()
        }
      },
      { threshold: 0.5 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [isAuthenticated])

  const chartData = useMemo(() => {
    if (state.chartData) return state.chartData
    if (!birthData.city || !birthData.date) return null
    try {
      return calculateChart(
        birthData.date,
        birthData.time,
        birthData.city.lat,
        birthData.city.lng,
        birthData.city.tz,
        birthData.unknownTime,
      )
    } catch {
      return null
    }
  }, [state.chartData, birthData])

  // Derive sign identity from computed chart
  const sunPlanet = chartData?.planets.find(p => p.name === 'Sun')
  const moonPlanet = chartData?.planets.find(p => p.name === 'Moon')
  const ascSign = chartData?.angles.ascendant.sign

  const identityLine =
    chartData && sunPlanet && moonPlanet && ascSign
      ? `Sun in ${ZODIAC_GLYPHS[sunPlanet.sign]} ${sunPlanet.sign} · ${ZODIAC_GLYPHS[ascSign]} ${ascSign} Rising · Moon in ${ZODIAC_GLYPHS[moonPlanet.sign]} ${moonPlanet.sign}`
      : null

  // Secondary reference line: "October 28, 1992 · London, UK"
  const formatLongDate = (d: string) => {
    if (!d) return ''
    const [y, m, day] = d.split('-').map(Number)
    return new Date(y, m - 1, day).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const cityLabel = birthData.city ? `${birthData.city.name}, ${birthData.city.country}` : ''
  const dateLabel = birthData.date ? formatLongDate(birthData.date) : ''
  const secondaryLine = [dateLabel, cityLabel].filter(Boolean).join(' · ')

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row items-center lg:items-stretch gap-8 lg:gap-0">
        {/* Left panel — 40% */}
        <div className="w-full lg:w-[40%] flex flex-col justify-center px-2 lg:pr-8">
          <div className="bg-mystic-surface/50 border border-mystic-border rounded-xl p-8 glow-gold flex flex-col">
            {/* Birth identity block */}
            <p className="text-mystic-muted text-xs uppercase tracking-widest mb-3">Welcome back</p>

            {/* Primary identity line — sign placements */}
            <p
              className="font-heading text-lg text-mystic-gold leading-snug mb-1"
              style={{ wordBreak: 'break-word' }}
            >
              {identityLine ?? secondaryLine}
            </p>

            {/* Secondary reference line — only when identity is shown */}
            {identityLine && secondaryLine && (
              <p className="text-xs text-mystic-muted mb-4">{secondaryLine}</p>
            )}
            {/* Spacer when identity falls back to secondary (no chartData) */}
            {!identityLine && <div className="mb-4" />}

            {/* Change birth information */}
            <button
              type="button"
              onClick={() => dispatch({ type: 'CLEAR_CACHE' })}
              className="text-xs text-mystic-muted hover:text-mystic-text transition-colors text-left mb-2 self-start"
              aria-label="Change birth information"
              onKeyDown={e => { if (e.key === ' ') { e.preventDefault(); dispatch({ type: 'CLEAR_CACHE' }) } }}
            >
              Change birth information
            </button>

            {/* Auth nudge — unauthenticated only */}
            {!isAuthenticated && (
              <button
                ref={nudgeRef}
                type="button"
                onClick={() => {
                  track('auth_nudge_clicked', { nudge_copy: NUDGE_COPY })
                  onOpenAuth()
                }}
                className="text-xs text-left mb-6 transition-colors self-start text-mystic-gold/60 hover:text-mystic-gold"
                aria-label="Create an account to save your readings"
              >
                {NUDGE_COPY}
              </button>
            )}
            {isAuthenticated && <div className="mb-6" />}

            {/* DailySnapshotCard embedded */}
            {chartData ? (
              <DailySnapshotCard chart={chartData} birthDate={birthData.date} embedded />
            ) : (
              // Visual weight placeholder when snapshot can't render
              <div className="flex-1 min-h-[120px] flex items-center justify-center mb-4">
                <p className="text-mystic-muted/40 text-xs text-center leading-relaxed">
                  Your daily sky reading will appear here
                </p>
              </div>
            )}

            {/* Primary CTA */}
            <button
              ref={ctaRef}
              type="button"
              onClick={() => setReadingsOpen(true)}
              className="w-full py-3 bg-mystic-gold text-mystic-bg font-heading rounded-lg hover:bg-mystic-gold/90 transition-colors mt-auto"
              aria-label="Get Your Readings"
            >
              Get Your Readings ✦
            </button>
          </div>
        </div>

        {/* Right panel — 60%, SkyTodayChart unchanged */}
        <div className="w-full lg:w-[60%] flex flex-col items-center justify-center relative min-h-[400px] lg:min-h-[600px]">
          <div className="absolute inset-0 flex items-center justify-center">
            <SkyTodayChart />
          </div>
          <div className="relative z-10 text-center mt-4 lg:mt-0">
            <p className="text-mystic-muted/60 text-xs uppercase tracking-[0.25em] mb-1">The Sky Today</p>
            <p className="text-mystic-gold/40 text-xs font-heading">{todayLabel}</p>
          </div>
        </div>
      </div>

      <ReadingsModal
        isOpen={readingsOpen}
        onClose={() => setReadingsOpen(false)}
        onSelect={action => dispatch(action)}
        onOpenDream={() => setDreamOpen(true)}
      />

      <DreamModal
        open={dreamOpen}
        onClose={() => setDreamOpen(false)}
        chartData={chartData}
      />
    </div>
  )
}
