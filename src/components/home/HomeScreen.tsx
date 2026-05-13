import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import SkyTodayChart from '../chart/SkyTodayChart'
import DailySnapshotCard from '../reading/DailySnapshotCard'
import DreamModal from '../dream/DreamModal'
import { calculateChart } from '../../engine/astronomy'

const NUDGE_DISMISS_KEY = 'auth-nudge-dismissed-at'
const JOURNAL_KEY = 'cosmic-journal-entries'

function getJournalCount(): number {
  try {
    const raw = localStorage.getItem(JOURNAL_KEY)
    if (!raw) return 0
    const entries = JSON.parse(raw)
    return Array.isArray(entries) ? entries.length : 0
  } catch {
    return 0
  }
}

function getNudgeDismissedCount(): number {
  try {
    return parseInt(localStorage.getItem(`${NUDGE_DISMISS_KEY}-count`) ?? '0', 10) || 0
  } catch {
    return 0
  }
}

function CachedDataNudge({ onOpenAuth }: { onOpenAuth: () => void }) {
  const { isAuthenticated } = useAuth()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const journalCount = getJournalCount()
    const dismissedCount = getNudgeDismissedCount()

    if (dismissedCount > 0 && journalCount < dismissedCount + 10) return

    if (journalCount > 0) {
      setVisible(true)
      return
    }

    try {
      const raw = localStorage.getItem('astral-chart-birth-data')
      if (!raw) return
      const parsed = JSON.parse(raw) as { createdAt?: string }
      if (!parsed.createdAt) {
        setVisible(true)
        return
      }
      const daysSince = (Date.now() - new Date(parsed.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince > 7) setVisible(true)
    } catch {
      // ignore
    }
  }, [])

  if (isAuthenticated || !visible) return null

  const handleDismiss = () => {
    const count = getJournalCount()
    localStorage.setItem(NUDGE_DISMISS_KEY, Date.now().toString())
    localStorage.setItem(`${NUDGE_DISMISS_KEY}-count`, count.toString())
    setVisible(false)
  }

  return (
    <div className="mt-4 flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border-t border-mystic-gold/10">
      <button
        type="button"
        onClick={onOpenAuth}
        className="text-xs transition-colors text-left text-[rgba(201,168,76,0.5)] hover:text-[rgba(201,168,76,0.8)]"
      >
        ✦ Protect your cosmic record
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        className="flex-shrink-0 text-xs transition-colors text-[rgba(201,168,76,0.25)] hover:text-[rgba(201,168,76,0.6)]"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}

export default function HomeScreen({ onOpenAuth }: { onOpenAuth: () => void }) {
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
  }, [state.chartData, birthData.date, birthData.time, birthData.city, birthData.unknownTime])

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
                onClick={() => dispatch({ type: 'SET_VIEW', view: 'today' })}
                className="w-full px-6 py-3 font-heading rounded-lg transition-all bg-[rgba(201,168,76,0.12)] border border-[rgba(201,168,76,0.35)] text-mystic-gold hover:bg-[rgba(201,168,76,0.22)] hover:border-[rgba(201,168,76,0.55)]"
              >
                Today ✦
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'SET_VIEW', view: 'journal' })}
                className="w-full px-6 py-3 font-heading rounded-lg transition-all bg-[rgba(201,168,76,0.12)] border border-[rgba(201,168,76,0.35)] text-mystic-gold hover:bg-[rgba(201,168,76,0.22)] hover:border-[rgba(201,168,76,0.55)]"
              >
                Journal ✦
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
                onClick={() => dispatch({ type: 'START_SOLAR_RETURN' })}
                className="w-full px-6 py-3 font-heading rounded-lg transition-all bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.22)] text-[rgba(201,168,76,0.75)] hover:bg-[rgba(201,168,76,0.16)] hover:border-[rgba(201,168,76,0.40)]"
              >
                Year Ahead ☀
              </button>
              <button
                type="button"
                onClick={() => setDreamOpen(true)}
                className="w-full px-6 py-3 font-heading rounded-lg transition-all bg-[rgba(109,40,217,0.15)] border border-[rgba(139,92,246,0.28)] text-[rgba(196,181,253,0.85)] hover:bg-[rgba(109,40,217,0.25)] hover:border-[rgba(167,139,250,0.42)]"
              >
                Dream Interpretation ☽
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'SET_VIEW', view: 'numerology' })}
                className="w-full px-6 py-3 font-heading rounded-lg transition-all bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.25)] text-[rgba(201,168,76,0.85)] hover:bg-[rgba(201,168,76,0.18)] hover:border-[rgba(201,168,76,0.45)]"
              >
                Numerology ✦
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'CLEAR_CACHE' })}
                className="w-full px-6 py-3 bg-mystic-surface border border-mystic-border text-mystic-muted font-heading rounded-lg hover:border-mystic-gold/40 hover:text-mystic-text transition-colors"
              >
                Enter New Birth Data
              </button>
            </div>

            <CachedDataNudge onOpenAuth={onOpenAuth} />
          </div>
        </div>

        {/* Mobile-only: Daily Snapshot between menu and sky */}
        {chartData && (
          <div className="w-full lg:hidden">
            <DailySnapshotCard chart={chartData} birthDate={birthData.date} />
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
          <DailySnapshotCard chart={chartData} birthDate={birthData.date} />
        </div>
      )}

      <DreamModal open={dreamOpen} onClose={() => setDreamOpen(false)} chartData={chartData} />
    </div>
  )
}
