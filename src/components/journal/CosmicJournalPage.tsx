import { useState, useEffect, useCallback, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import type { ChartData } from '../../engine/types'
import { PLANET_GLYPHS } from '../../engine/types'
import type { BirthData } from '../../context/appState'
import { getDreamSessionKey } from '../../context/appState'
import type { JournalEntry, JournalTag } from './types'
import { JOURNAL_STORAGE_KEY, TAG_LABELS, normalizeDreamRef } from './types'
import JournalEntryCard from './JournalEntryCard'
import PatternPanel from './PatternPanel'
import { calculatePersonalDay } from '../../engine/numerology'
import { getMoonSignAndPhase, resolveToUTC } from '../../engine/astronomy'
import { getTopActiveTransits } from '../../engine/transits'
import { getInterpretation } from '../../data/numerologyInterpretations'
import { syncJournalEntry } from '../../services/entrySync'
import { isQuotaError } from '../../utils/storage'
import DreamModal from '../dream/DreamModal'

const PHASE_EMOJIS: Record<string, string> = {
  'New Moon': '🌑',
  'Waxing Crescent': '🌒',
  'First Quarter': '🌓',
  'Waxing Gibbous': '🌔',
  'Full Moon': '🌕',
  'Waning Gibbous': '🌖',
  'Last Quarter': '🌗',
  'Waning Crescent': '🌘',
}

const ALL_TAGS: JournalTag[] = [
  'breakthrough', 'turning-point', 'decision', 'love', 'grief', 'creative-peak', 'dream', 'blocked'
]

function loadEntries(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(JOURNAL_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>
    return parsed.map(e => ({ ...e, dreamRef: normalizeDreamRef(e.dreamRef) }) as JournalEntry)
  } catch {
    return []
  }
}

function saveEntries(entries: JournalEntry[]): 'ok' | 'quota' {
  try {
    localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries))
    return 'ok'
  } catch (e) {
    if (isQuotaError(e)) return 'quota'
    return 'quota'
  }
}

function getTodayString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function getCurrentTimeString(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

interface SkyPreview {
  moonPhase: string
  moonSign: string
  personalDay: number
  topTransits: Array<{ planet: string; symbol: string; natal: string }>
}

interface CosmicJournalPageProps {
  chartData: ChartData | null
  birthData: BirthData
}

export default function CosmicJournalPage({ chartData, birthData }: CosmicJournalPageProps) {
  const { dispatch } = useApp()
  const { isAuthenticated, token } = useAuth()
  const [entries, setEntries] = useState<JournalEntry[]>(() => loadEntries())
  const [composerOpen, setComposerOpen] = useState(false)
  const [body, setBody] = useState('')
  const [entryDate, setEntryDate] = useState(getTodayString())
  const [entryTime, setEntryTime] = useState(getCurrentTimeString())
  const [selectedTags, setSelectedTags] = useState<JournalTag[]>([])
  const [skyPreview, setSkyPreview] = useState<SkyPreview | null>(null)
  const [storageWarning, setStorageWarning] = useState<'full' | 'near' | null>(null)
  const [storageWarningDismissed, setStorageWarningDismissed] = useState(false)
  const [quotaError, setQuotaError] = useState(false)
  const [dreamModalOpen, setDreamModalOpen] = useState(false)
  const [dreamModalKey, setDreamModalKey] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const skyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Check storage on mount
  useEffect(() => {
    if ('storage' in navigator && navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(({ usage, quota }) => {
        if (quota && usage) {
          const ratio = usage / quota
          if (ratio > 0.7) setStorageWarning('near')
        }
      }).catch(() => {})
    }
  }, [])

  // Authenticated mount: retry failed syncs then merge server entries
  useEffect(() => {
    if (!isAuthenticated || !token) return
    const authToken = token

    setTimeout(async () => {
      // 1. Retry entries that failed to sync, oldest-first
      const currentEntries = loadEntries()
      const failed = currentEntries
        .filter(e => e._syncFailed === true)
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date)
          return a.createdAt.localeCompare(b.createdAt)
        })
      for (const entry of failed) {
        await syncJournalEntry(entry, authToken)
      }

      // 2. Fetch server entries and merge (server wins on ID collision)
      try {
        const response = await fetch('/api/entries?kind=journal', {
          headers: { 'Authorization': `Bearer ${authToken}` },
        })
        if (!response.ok) return
        const serverEntries = await response.json() as JournalEntry[]
        const local = loadEntries()
        const localById = new Map(local.map(e => [e.id, e]))

        let changed = false
        for (const se of serverEntries) {
          const le = localById.get(se.id)
          if (le) {
            if (le._syncFailed || !le._serverId) {
              localById.set(se.id, { ...le, ...se, _serverId: se.id, _syncFailed: undefined })
              changed = true
            }
          } else {
            localById.set(se.id, { ...se, _serverId: se.id })
            changed = true
          }
        }

        if (changed) {
          const merged = Array.from(localById.values())
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          saveEntries(merged)
          setEntries(merged)
        }
      } catch {
        // silently ignore — local entries are displayed as-is
      }
    }, 0)
  }, [isAuthenticated, token])

  // Compute sky preview (debounced)
  const computeSkyPreview = useCallback((date: string, time: string) => {
    if (skyDebounceRef.current) clearTimeout(skyDebounceRef.current)
    skyDebounceRef.current = setTimeout(() => {
      try {
        const [y, mo, d] = date.split('-').map(Number)
        const [h, min] = time.split(':').map(Number)
        if (!y || !mo || !d) {
          setSkyPreview(null)
          return
        }
        const tz = birthData.city?.tz || 'UTC'
        const resolvedDate = resolveToUTC(y, mo, d, h || 12, min || 0, tz)
        const moon = getMoonSignAndPhase(resolvedDate)
        const personalDay = calculatePersonalDay(birthData.date, resolvedDate)
        let topTransits: Array<{ planet: string; symbol: string; natal: string }> = []
        if (chartData) {
          const transits = getTopActiveTransits(chartData, 2, 8, resolvedDate)
          topTransits = transits.map(t => ({
            planet: PLANET_GLYPHS[t.transitPlanet as keyof typeof PLANET_GLYPHS] ?? t.transitPlanet,
            symbol: t.symbol,
            natal: PLANET_GLYPHS[t.natalPlanet as keyof typeof PLANET_GLYPHS] ?? t.natalPlanet,
          }))
        }
        setSkyPreview({ moonPhase: moon.phase, moonSign: moon.sign, personalDay, topTransits })
      } catch {
        setSkyPreview(null)
      }
    }, 300)
  }, [birthData, chartData])

  useEffect(() => {
    computeSkyPreview(entryDate, entryTime)
  }, [entryDate, entryTime, computeSkyPreview])

  // Focus textarea when composer opens
  useEffect(() => {
    if (composerOpen) {
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [composerOpen])

  const handleOpenComposer = () => {
    setBody('')
    setEntryDate(getTodayString())
    setEntryTime(getCurrentTimeString())
    setSelectedTags([])
    setComposerOpen(true)
  }

  const handleToggleTag = (tag: JournalTag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const handleSubmit = () => {
    if (!body.trim() && !entryDate) return

    const [y, mo, d] = entryDate.split('-').map(Number)
    const [h, min] = entryTime.split(':').map(Number)
    const tz = birthData.city?.tz || 'UTC'

    let resolvedDate: Date
    try {
      resolvedDate = resolveToUTC(y, mo, d, h || 12, min || 0, tz)
    } catch {
      resolvedDate = new Date()
    }

    const numerologicalDay = calculatePersonalDay(birthData.date, resolvedDate)
    const dreamKey = getDreamSessionKey(entryDate)
    const dreamRef = localStorage.getItem(dreamKey) ? { type: 'local' as const, key: dreamKey } : null

    const newEntry: JournalEntry = {
      id: crypto.randomUUID(),
      date: entryDate,
      time: entryTime || '12:00',
      body: body,
      tags: selectedTags,
      numerologicalDay,
      gptAnnotation: null,
      dreamRef,
      createdAt: new Date().toISOString(),
    }

    const updated = [newEntry, ...entries]
    const result = saveEntries(updated)

    if (result === 'quota') {
      setQuotaError(true)
      return
    }

    setEntries(updated)
    setComposerOpen(false)

    if (isAuthenticated && token) {
      void syncJournalEntry(newEntry, token)
    }
  }

  const handleDelete = useCallback((id: string) => {
    const updated = entries.filter(e => e.id !== id)
    setEntries(updated)
    saveEntries(updated)
  }, [entries])

  const handleDreamOpen = useCallback((sessionKey: string) => {
    setDreamModalKey(sessionKey)
    setDreamModalOpen(true)
  }, [])

  const handleExport = () => {
    const json = JSON.stringify(entries, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cosmic-journal-${getTodayString()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const today = getTodayString()

  // Live sky for empty state
  const nowSky = (() => {
    try {
      const now = new Date()
      const moon = getMoonSignAndPhase(now)
      const personalDay = calculatePersonalDay(birthData.date, now)
      let topTransits: Array<{ planet: string; symbol: string; natal: string }> = []
      if (chartData) {
        const transits = getTopActiveTransits(chartData, 2, 8, now)
        topTransits = transits.map(t => ({
          planet: PLANET_GLYPHS[t.transitPlanet as keyof typeof PLANET_GLYPHS] ?? t.transitPlanet,
          symbol: t.symbol,
          natal: PLANET_GLYPHS[t.natalPlanet as keyof typeof PLANET_GLYPHS] ?? t.natalPlanet,
        }))
      }
      return { moon, personalDay, topTransits }
    } catch {
      return null
    }
  })()

  const personalDayInterpretation = nowSky
    ? getInterpretation('personalDay', nowSky.personalDay)
    : null

  return (
    <div className="w-full max-w-2xl mx-auto px-2 pb-16">
      {/* Back button */}
      <button
        type="button"
        onClick={() => dispatch({ type: 'SET_VIEW', view: 'form' })}
        className="mb-8 text-mystic-muted hover:text-mystic-gold transition-colors text-sm font-heading"
      >
        ← Back
      </button>

      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-mystic-muted text-xs uppercase tracking-[0.25em] mb-1">Personal</p>
          <h2 className="font-heading text-2xl text-mystic-gold">Cosmic Journal ✦</h2>
        </div>
        <div className="flex items-center gap-2">
          {entries.length > 0 && (
            <button
              type="button"
              onClick={handleExport}
              className="text-mystic-muted/50 text-xs hover:text-mystic-gold transition-colors"
              title="Export journal as JSON"
            >
              Export ↓
            </button>
          )}
        </div>
      </div>

      {/* Storage warnings */}
      {quotaError && (
        <div className="bg-red-900/30 border border-red-500/40 rounded-lg p-3 mb-4">
          <p className="text-red-400 text-sm">
            Storage is full. Your entry could not be saved. Export your journal to free up space.
          </p>
        </div>
      )}
      {storageWarning === 'near' && !storageWarningDismissed && (
        <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3 mb-4 flex items-center justify-between">
          <p className="text-amber-400/80 text-xs">
            Your storage is over 70% full. Consider exporting your journal.
          </p>
          <button
            type="button"
            onClick={() => setStorageWarningDismissed(true)}
            className="text-amber-400/50 hover:text-amber-400 text-xs ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* No chartData edge case */}
      {!chartData && (
        <div className="bg-mystic-surface/50 border border-mystic-border rounded-xl p-8 text-center">
          <p className="text-mystic-muted text-sm mb-4">
            Open your chart first to unlock the Cosmic Journal.
          </p>
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_VIEW', view: 'loading' })}
            className="px-6 py-2 bg-mystic-gold text-mystic-bg font-heading rounded-lg hover:bg-mystic-gold/90 transition-colors text-sm"
          >
            Read My Chart ✦
          </button>
        </div>
      )}

      {chartData && (
        <>
          {/* Pattern Panel (only with >= 5 entries) */}
          {entries.length >= 5 && (
            <PatternPanel entries={entries} chartData={chartData} birthData={birthData} />
          )}

          {/* Compose button (when entries exist) */}
          {entries.length > 0 && !composerOpen && (
            <button
              type="button"
              onClick={handleOpenComposer}
              className="w-full mb-6 px-6 py-3 font-heading rounded-lg transition-all text-sm"
              style={{
                background: 'rgba(201,168,76,0.12)',
                border: '1px solid rgba(201,168,76,0.35)',
                color: '#c9a84c',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(201,168,76,0.22)'
                e.currentTarget.style.borderColor = 'rgba(201,168,76,0.55)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(201,168,76,0.12)'
                e.currentTarget.style.borderColor = 'rgba(201,168,76,0.35)'
              }}
            >
              + Record a moment
            </button>
          )}

          {/* Composer */}
          {composerOpen && (
            <div className="mb-6 bg-mystic-bg/95 backdrop-blur-sm border border-mystic-border rounded-xl p-6">
              {/* Question */}
              <p className="text-mystic-muted/60 text-sm tracking-widest uppercase text-center mb-4 italic">
                What happened?
              </p>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Write freely…"
                rows={5}
                className="w-full min-h-[120px] bg-transparent border-0 border-b border-mystic-border/50 focus:border-mystic-gold/50 focus:ring-0 focus:outline-none text-mystic-text text-base resize-none placeholder-mystic-muted/30 pb-3 mb-4"
              />

              {/* Date / Time row */}
              <div className="flex gap-4 mb-4 opacity-70">
                <div className="flex flex-col gap-1">
                  <label className="text-mystic-muted/50 text-xs">Date</label>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={e => setEntryDate(e.target.value)}
                    max={today}
                    min="1900-01-01"
                    className="bg-transparent text-mystic-text text-sm border border-mystic-border/40 rounded px-2 py-1 focus:outline-none focus:border-mystic-gold/50"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-mystic-muted/50 text-xs">Time (optional)</label>
                  <input
                    type="time"
                    value={entryTime}
                    onChange={e => setEntryTime(e.target.value)}
                    className="bg-transparent text-mystic-text text-sm border border-mystic-border/40 rounded px-2 py-1 focus:outline-none focus:border-mystic-gold/50"
                  />
                </div>
              </div>

              {/* Live sky preview */}
              {skyPreview ? (
                <div className="text-mystic-muted/50 text-xs font-mono mb-4 flex flex-wrap gap-x-3 gap-y-1">
                  <span>
                    {PHASE_EMOJIS[skyPreview.moonPhase] ?? '🌙'} {skyPreview.moonPhase} · {skyPreview.moonSign}
                  </span>
                  <span>Day {skyPreview.personalDay}</span>
                  {skyPreview.topTransits.map((t, i) => (
                    <span key={i}>{t.planet} {t.symbol} {t.natal}</span>
                  ))}
                </div>
              ) : (
                <div className="text-mystic-muted/30 text-xs mb-4">— sky preview —</div>
              )}

              {/* Tag pills */}
              <div className="flex flex-wrap gap-2 mb-4">
                {ALL_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    className={`rounded-full text-xs px-3 py-1 transition-colors ${
                      selectedTags.includes(tag)
                        ? 'border-mystic-gold/50 text-mystic-gold bg-mystic-gold/10 border'
                        : 'border border-mystic-border/50 text-mystic-muted'
                    }`}
                  >
                    {TAG_LABELS[tag]}
                  </button>
                ))}
              </div>

              {/* Tags note */}
              <p className="text-mystic-muted/40 text-xs mb-4">
                Tags will be refined after you record.
              </p>

              {/* Submit */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!body.trim() && !entryDate}
                className="w-full bg-mystic-gold text-mystic-bg font-heading rounded-lg px-6 py-3 hover:bg-mystic-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-2"
              >
                Record This Moment
              </button>

              {/* Cancel */}
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                className="w-full text-mystic-muted/50 text-sm underline cursor-pointer hover:text-mystic-muted text-center"
              >
                cancel
              </button>
            </div>
          )}

          {/* Empty state */}
          {entries.length === 0 && !composerOpen && nowSky && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl text-mystic-purple/60 mb-3">
                {PHASE_EMOJIS[nowSky.moon.phase] ?? '🌙'}
              </div>
              <p className="text-mystic-muted/50 text-sm mb-2">
                Moon in {nowSky.moon.sign} · {nowSky.moon.phase}
              </p>
              <p className="text-mystic-gold/60 font-heading mb-2">
                Personal Day {nowSky.personalDay}
                {personalDayInterpretation?.archetype ? ` · ${personalDayInterpretation.archetype}` : ''}
              </p>
              {nowSky.topTransits.length > 0 && (
                <div className="text-mystic-muted/40 text-xs font-mono mb-6 flex gap-3">
                  {nowSky.topTransits.map((t, i) => (
                    <span key={i}>{t.planet} {t.symbol} {t.natal}</span>
                  ))}
                </div>
              )}
              <p className="text-mystic-text/70 text-base max-w-sm mx-auto mb-2 leading-relaxed">
                The cosmos has been moving through your sky for a long time.
              </p>
              <p className="text-mystic-muted/50 text-sm mb-8">
                You can start recording it now.
              </p>
              <button
                type="button"
                onClick={handleOpenComposer}
                className="text-mystic-gold/70 text-sm underline cursor-pointer hover:text-mystic-gold transition-colors"
              >
                Record your first entry
              </button>
            </div>
          )}

          {/* Entry list */}
          {entries.length > 0 && (
            <div className="space-y-4">
              {entries.map((entry, i) => (
                <JournalEntryCard
                  key={entry.id}
                  entry={entry}
                  chartData={chartData}
                  birthData={birthData}
                  onDelete={handleDelete}
                  onDreamOpen={handleDreamOpen}
                  isPriorityEntry={i < 5}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Dream modal for cross-references */}
      <DreamModal
        open={dreamModalOpen}
        onClose={() => setDreamModalOpen(false)}
        chartData={chartData}
        initialSessionKey={dreamModalKey}
      />
    </div>
  )
}
