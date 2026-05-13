import { useState, useEffect, useRef } from 'react'
import type { JournalEntry, JournalTag } from './types'
import { TAG_LABELS, EXPANSIVE_TAGS, INWARD_TAGS, JOURNAL_STORAGE_KEY } from './types'
import type { ChartData } from '../../engine/types'
import { PLANET_GLYPHS } from '../../engine/types'
import type { BirthData } from '../../context/appState'
import { calculateCurrentPositions, calculateTransitAspects, getTopActiveTransits } from '../../engine/transits'
import type { TransitAspect } from '../../engine/transits'
import { getMoonSignAndPhase, resolveToUTC } from '../../engine/astronomy'
import { getInterpretation } from '../../data/numerologyInterpretations'
import { generateJournalEntryAnnotation, getStoredApiKey } from '../../services/gptInterpretation'
import DreamModal from '../dream/DreamModal'

// Simple concurrent annotation limiter
let activeAnnotations = 0
const MAX_CONCURRENT = 2

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

interface JournalEntryCardProps {
  entry: JournalEntry
  chartData: ChartData
  birthData: BirthData
  onDelete: (id: string) => void
  onDreamOpen?: (sessionKey: string) => void
  isPriorityEntry?: boolean  // First 5 entries get immediate annotation
}

function getTagStyle(tag: JournalTag): string {
  if (EXPANSIVE_TAGS.includes(tag)) {
    return 'bg-mystic-gold/15 text-mystic-gold border border-mystic-gold/30'
  }
  if (INWARD_TAGS.includes(tag)) {
    return 'bg-mystic-purple/15 text-mystic-purple border border-mystic-purple/30'
  }
  return 'bg-mystic-muted/10 text-mystic-muted border border-mystic-border'
}

function getDisplayTitle(body: string): string {
  if (!body.trim()) return ''
  // Try first sentence (ending with punctuation) if < 80 chars
  const firstPeriod = body.search(/[.!?]/)
  if (firstPeriod > 0 && firstPeriod < 80) {
    return body.slice(0, firstPeriod + 1)
  }
  return body.slice(0, 80) + (body.length > 80 ? '…' : '')
}

function formatEntryDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[m - 1]} ${d}, ${y}`
}

export default function JournalEntryCard({
  entry,
  chartData,
  birthData,
  onDelete,
  onDreamOpen,
  isPriorityEntry = false,
}: JournalEntryCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [annotation, setAnnotation] = useState<string | null>(entry.gptAnnotation)
  const [annotationPending, setAnnotationPending] = useState(entry.gptAnnotation === null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [dreamModalOpen, setDreamModalOpen] = useState(false)
  const [transits, setTransits] = useState<TransitAspect[]>([])
  const [moonInfo, setMoonInfo] = useState<{ sign: string; phase: string } | null>(null)
  const [significanceBorder, setSignificanceBorder] = useState<string>('border-mystic-border')
  const annotationStartedRef = useRef(false)

  // Compute sky data at entry's datetime
  useEffect(() => {
    try {
      const [y, mo, d] = entry.date.split('-').map(Number)
      const [h, min] = (entry.time || '12:00').split(':').map(Number)
      const tz = birthData.city?.tz || 'UTC'
      const entryDate = resolveToUTC(y, mo, d, h, min, tz)

      const topTransits = getTopActiveTransits(chartData, 3, 8, entryDate)
      setTransits(topTransits)

      const moon = getMoonSignAndPhase(entryDate)
      setMoonInfo({ sign: moon.sign, phase: moon.phase })

      // Significance scoring: count aspects with orb < 2°, weight Sun/Moon ×2
      const tightTransits = calculateTransitAspects(
        calculateCurrentPositions(entryDate),
        chartData.planets,
        'daily'
      )
      const score = tightTransits.reduce((acc, t) => {
        if (t.orb >= 2) return acc
        const weight = (t.transitPlanet === 'Sun' || t.transitPlanet === 'Moon' ||
          t.natalPlanet === 'Sun' || t.natalPlanet === 'Moon') ? 2 : 1
        return acc + weight
      }, 0)

      if (score > 4) setSignificanceBorder('border-mystic-gold/50 glow-gold')
      else if (score > 2) setSignificanceBorder('border-mystic-gold/50')
      else setSignificanceBorder('border-mystic-border')
    } catch {
      // silently fail — sky data is optional
    }
  }, [entry.date, entry.time, chartData, birthData])

  // Deferred annotation via IntersectionObserver
  useEffect(() => {
    if (annotation !== null || annotationStartedRef.current) return
    if (!getStoredApiKey()) {
      setAnnotationPending(false)
      return
    }

    const startAnnotation = async () => {
      if (annotationStartedRef.current) return
      if (activeAnnotations >= MAX_CONCURRENT) {
        // Retry after a delay
        setTimeout(startAnnotation, 2000)
        return
      }
      annotationStartedRef.current = true
      activeAnnotations++

      try {
        const [y, mo, d] = entry.date.split('-').map(Number)
        const [h, min] = (entry.time || '12:00').split(':').map(Number)
        const tz = birthData.city?.tz || 'UTC'
        const entryDate = resolveToUTC(y, mo, d, h, min, tz)

        const topTransits = getTopActiveTransits(chartData, 3, 8, entryDate)
        const moon = getMoonSignAndPhase(entryDate)
        const apiKey = getStoredApiKey()

        if (!apiKey) {
          setAnnotationPending(false)
          return
        }

        const result = await generateJournalEntryAnnotation(
          entry,
          topTransits,
          moon.phase,
          moon.sign,
          chartData,
          apiKey,
        )

        // Persist the annotation to localStorage
        try {
          const raw = localStorage.getItem(JOURNAL_STORAGE_KEY)
          if (raw) {
            const entries = JSON.parse(raw) as JournalEntry[]
            const updated = entries.map(e =>
              e.id === entry.id ? { ...e, gptAnnotation: result } : e
            )
            localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(updated))
          }
        } catch {
          // ignore storage errors
        }

        setAnnotation(result)
        setAnnotationPending(false)
      } catch {
        setAnnotationPending(false)
      } finally {
        activeAnnotations--
      }
    }

    if (isPriorityEntry) {
      startAnnotation()
      return
    }

    // Use IntersectionObserver for non-priority entries
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect()
          startAnnotation()
        }
      },
      { rootMargin: '200px' }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [entry, chartData, birthData, isPriorityEntry]) // eslint-disable-line react-hooks/exhaustive-deps

  const displayTitle = getDisplayTitle(entry.body)
  const interpretation = getInterpretation('personalDay', entry.numerologicalDay)
  const phaseEmoji = moonInfo ? (PHASE_EMOJIS[moonInfo.phase] ?? '🌙') : '🌙'

  const handleDreamClick = () => {
    if (entry.dreamRef) {
      if (onDreamOpen) {
        onDreamOpen(entry.dreamRef)
      } else {
        setDreamModalOpen(true)
      }
    }
  }

  return (
    <>
      <div
        ref={containerRef}
        className={`group relative bg-mystic-surface/50 border ${significanceBorder} rounded-xl p-5 transition-all duration-200`}
      >
        {/* Delete button (appears on hover) */}
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-mystic-muted/40 hover:text-red-400/70 transition-all text-lg leading-none"
          aria-label="Delete entry"
        >
          ×
        </button>

        {/* Inline delete confirmation */}
        {confirmDelete && (
          <div className="absolute inset-0 bg-mystic-bg/90 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-3 z-10">
            <p className="text-mystic-muted text-sm">Delete this entry?</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => onDelete(entry.id)}
                className="px-4 py-1.5 bg-red-900/30 border border-red-500/40 text-red-400 text-sm rounded-lg hover:bg-red-900/50 transition-colors"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-1.5 border border-mystic-border text-mystic-muted text-sm rounded-lg hover:border-mystic-gold/30 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Register 1: Human */}
        <div className="mb-3">
          <p className="text-mystic-muted/60 text-xs uppercase tracking-widest mb-1">
            {formatEntryDate(entry.date)}
          </p>
          {displayTitle ? (
            <p className="text-mystic-text text-base leading-relaxed font-medium">
              {displayTitle}
            </p>
          ) : (
            <p className="text-mystic-muted/50 text-base italic">Moment recorded</p>
          )}
        </div>

        {/* Register 2: Event */}
        <div className="mb-3">
          {entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {entry.tags.map(tag => (
                <span
                  key={tag}
                  className={`rounded-full text-xs px-2.5 py-0.5 font-medium ${getTagStyle(tag)}`}
                >
                  {TAG_LABELS[tag]}
                </span>
              ))}
            </div>
          )}

          {/* GPT Annotation */}
          {annotation !== null ? (
            <p className="text-mystic-muted/80 text-sm italic">{annotation}</p>
          ) : annotationPending ? (
            <div className="h-4 w-3/4 bg-mystic-surface rounded animate-pulse" />
          ) : !getStoredApiKey() ? (
            <p className="text-mystic-muted/40 text-xs">✦ Add an API key to unlock cosmic annotations</p>
          ) : null}
        </div>

        {/* Register 3: Cosmic — hidden on very small screens, simplified */}
        <div className="text-mystic-muted/50 text-xs font-mono space-y-0.5">
          {/* Transit glyphs — hidden on < sm */}
          {transits.length > 0 && (
            <div className="hidden sm:block">
              {transits.map((t, i) => {
                const g1 = PLANET_GLYPHS[t.transitPlanet as keyof typeof PLANET_GLYPHS] ?? t.transitPlanet
                const g2 = PLANET_GLYPHS[t.natalPlanet as keyof typeof PLANET_GLYPHS] ?? t.natalPlanet
                return (
                  <span key={i} className="mr-3">
                    {g1} {t.symbol} {g2}
                    <span className="opacity-50"> ({t.orb.toFixed(1)}°)</span>
                    {i < transits.length - 1 ? ' · ' : ''}
                  </span>
                )
              })}
            </div>
          )}

          {/* Moon + Personal Day (always visible) */}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {moonInfo && (
              <span>{phaseEmoji} {moonInfo.phase} · {moonInfo.sign}</span>
            )}
            <span>
              Day {entry.numerologicalDay}
              {interpretation?.archetype ? ` · ${interpretation.archetype}` : ''}
            </span>
            {/* On small screens, show date inline in cosmic register */}
            <span className="sm:hidden">{formatEntryDate(entry.date)}</span>
          </div>
        </div>

        {/* Dream cross-reference */}
        {entry.dreamRef && (
          <button
            type="button"
            onClick={handleDreamClick}
            className="mt-2 text-purple-400/55 text-xs italic hover:text-purple-400/80 transition-colors cursor-pointer block"
          >
            ☽ A dream lives in this night.
          </button>
        )}
      </div>

      {/* Dream Modal for cross-reference (when onDreamOpen not provided) */}
      {dreamModalOpen && entry.dreamRef && (
        <DreamModal
          open={dreamModalOpen}
          onClose={() => setDreamModalOpen(false)}
          chartData={chartData}
          initialSessionKey={entry.dreamRef}
        />
      )}
    </>
  )
}
