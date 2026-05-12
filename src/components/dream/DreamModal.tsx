import { useState, useRef, useEffect, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import {
  getDailySnapshotInterpretation,
  getDreamInterpretation,
  getDreamDiscussResponse,
  getStoredApiKey,
  type ChatMessage,
} from '../../services/gptInterpretation'
import { calculateCurrentPositions, calculateTransitAspects } from '../../engine/transits'
import { getCurrentMoonPhase } from '../../engine/lunar'
import type { ChartData } from '../../engine/types'

// Persistent journal key — all dream entries survive across days
const DREAM_JOURNAL_KEY = 'astral-dream-journal'
// Current active session key (sessionStorage so it clears when browser session ends)
const DREAM_SESSION_KEY = 'dream-session-current'
const MAX_JOURNAL_ENTRIES = 60

interface DreamEntry {
  id: string
  date: string        // ISO date string e.g. "2025-05-12"
  dateLabel: string   // Human-readable e.g. "May 12, 2025"
  dreamText: string
  interpretation: string
}

interface DreamSession {
  messages: ChatMessage[]
  dreamContext: string
  dreamInput: string
}

interface DreamModalProps {
  open: boolean
  onClose: () => void
  chartData?: ChartData | null
}

type Stage = 'input' | 'loading-sky' | 'loading-dream' | 'chat'
type ActiveView = 'dream' | 'journal'

function buildDreamSnapshotPrompt(chart: ChartData, moon: ReturnType<typeof getCurrentMoonPhase>, aspects: ReturnType<typeof calculateTransitAspects>): string {
  const sun = chart.planets.find(p => p.name === 'Sun')
  const moonNatal = chart.planets.find(p => p.name === 'Moon')
  const asc = chart.angles?.ascendant

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  const aspectLines = aspects.slice(0, 6).map(a =>
    `${a.transitPlanet} ${a.symbol} natal ${a.natalPlanet} (${a.type}, ${a.nature}, orb ${a.orb}°, ${a.applying ? 'applying' : 'separating'})`
  ).join('\n')

  return `Write a 2-3 sentence personalized daily astrological briefing for ${today}.

Natal chart:
- Sun: ${sun?.sign} ${sun?.degree}°
- Moon: ${moonNatal?.sign} ${moonNatal?.degree}°
${asc ? `- Ascendant: ${asc.sign}` : ''}

Today's Moon: ${moon.moonSign}, ${moon.phaseName}, ${Math.round(moon.illumination)}% illuminated${moon.isVoid ? ' (void of course)' : ''}

Active transit aspects today (tightest first):
${aspectLines || 'No tight aspects active today.'}

Write 2-3 specific, honest sentences about what this person's day looks like astrologically. Be direct and personal.`
}

function buildNatalContext(chart: ChartData, birthDate: string): string {
  let ctx = `Born: ${birthDate}\n`
  for (const p of chart.planets) {
    ctx += `${p.name}: ${p.sign} ${p.degree}°${p.minute}' (House ${p.house})${p.retrograde ? ' [Rx]' : ''}\n`
  }
  ctx += `Ascendant: ${chart.angles.ascendant.sign} ${chart.angles.ascendant.degree}°\n`
  ctx += `Midheaven: ${chart.angles.midheaven.sign} ${chart.angles.midheaven.degree}°\n`
  return ctx
}

function loadJournal(): DreamEntry[] {
  try {
    const raw = localStorage.getItem(DREAM_JOURNAL_KEY)
    if (!raw) return []
    return JSON.parse(raw) as DreamEntry[]
  } catch {
    return []
  }
}

function saveJournal(entries: DreamEntry[]): void {
  try {
    localStorage.setItem(DREAM_JOURNAL_KEY, JSON.stringify(entries))
  } catch {
    // ignore quota errors
  }
}

function addJournalEntry(dreamText: string, interpretation: string): DreamEntry[] {
  const existing = loadJournal()
  const now = new Date()
  const entry: DreamEntry = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    date: now.toISOString().slice(0, 10),
    dateLabel: now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    dreamText,
    interpretation,
  }
  // Prepend newest first, evict if over cap
  const updated = [entry, ...existing].slice(0, MAX_JOURNAL_ENTRIES)
  saveJournal(updated)
  return updated
}

function buildPastDreamsContext(journal: DreamEntry[]): string | null {
  if (journal.length < 3) return null
  const snippets = journal.slice(0, 8).map(e => e.dreamText.slice(0, 60).trim())
  return `This person's recent dreams include: ${snippets.map(s => `"${s}"`).join('; ')}. Note any recurring themes or symbols across these dreams and connect them to the current interpretation.`
}

export default function DreamModal({ open, onClose, chartData: chartDataProp }: DreamModalProps) {
  const { state } = useApp()
  const { birthData } = state
  const chartData = chartDataProp ?? state.chartData

  const [stage, setStage] = useState<Stage>('input')
  const [dreamInput, setDreamInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [restoredCount, setRestoredCount] = useState(0)
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dreamContext, setDreamContext] = useState('')
  const [activeView, setActiveView] = useState<ActiveView>('dream')
  const [journal, setJournal] = useState<DreamEntry[]>([])
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null)
  const [clearConfirm, setClearConfirm] = useState(false)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setChatInput('')
    // Load journal on open
    setJournal(loadJournal())

    try {
      const saved = sessionStorage.getItem(DREAM_SESSION_KEY)
      if (saved) {
        const session = JSON.parse(saved) as DreamSession
        setMessages(session.messages)
        setDreamContext(session.dreamContext)
        setDreamInput(session.dreamInput)
        setRestoredCount(session.messages.length)
        setStage('chat')
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'instant' }), 80)
        return
      }
    } catch {
      // fall through to fresh state
    }

    setStage('input')
    setDreamInput('')
    setMessages([])
    setRestoredCount(0)
    setDreamContext('')
    setTimeout(() => inputRef.current?.focus(), 120)
  }, [open])

  // Persist active session to sessionStorage whenever messages or context update
  useEffect(() => {
    if (messages.length === 0) return
    try {
      const session: DreamSession = { messages, dreamContext, dreamInput }
      sessionStorage.setItem(DREAM_SESSION_KEY, JSON.stringify(session))
    } catch {
      // ignore quota errors
    }
  }, [messages, dreamContext, dreamInput])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatLoading])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open || !chartData) return null

  const handleInterpret = async () => {
    const dream = dreamInput.trim()
    if (!dream) return

    const apiKey = getStoredApiKey()
    if (!apiKey) {
      setError('An OpenAI API key is required. Add one from the Transit Reading screen.')
      return
    }

    setError(null)
    setStage('loading-sky')

    try {
      const now = new Date()
      const transitPlanets = calculateCurrentPositions(now)
      const transitAspects = calculateTransitAspects(transitPlanets, chartData.planets, 'daily')
      const moonPhase = getCurrentMoonPhase(now)

      const snapshotPrompt = buildDreamSnapshotPrompt(chartData, moonPhase, transitAspects)
      const transitSummary = await getDailySnapshotInterpretation(snapshotPrompt, apiKey)

      setStage('loading-dream')

      const natalCtx = buildNatalContext(chartData, birthData.date)
      const transitAspectsText = transitAspects.slice(0, 8).map(a =>
        `Transit ${a.transitPlanet} ${a.symbol} Natal ${a.natalPlanet} (${a.type}, orb ${a.orb}°, ${a.applying ? 'applying' : 'separating'}, ${a.nature})`
      ).join('\n') || 'No tight transit aspects active today.'

      // Build past dreams context for pattern awareness (activates with 3+ entries)
      const currentJournal = loadJournal()
      const pastDreamsContext = buildPastDreamsContext(currentJournal)

      const interpretation = await getDreamInterpretation(
        dream, natalCtx, transitSummary, transitAspectsText, apiKey, pastDreamsContext,
      )

      const ctx = `## Dreamer's Natal Chart\n${natalCtx}\n\n## Today's Astrological Picture\n${transitSummary}\n\n## Active Transit Aspects\n${transitAspectsText}\n\n## The Dream\n${dream}`
      setDreamContext(ctx)
      setMessages([{ role: 'assistant', content: interpretation }])
      setStage('chat')

      // Persist this dream + interpretation to the journal
      const updatedJournal = addJournalEntry(dream, interpretation)
      setJournal(updatedJournal)

      setTimeout(() => chatInputRef.current?.focus(), 100)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred')
      setStage('input')
    }
  }

  const handleChatSend = async () => {
    const trimmed = chatInput.trim()
    if (!trimmed || chatLoading) return

    const userMsg: ChatMessage = { role: 'user', content: trimmed }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setChatInput('')
    setError(null)
    setChatLoading(true)

    try {
      const apiKey = getStoredApiKey()
      const reply = await getDreamDiscussResponse(dreamContext, newMessages, apiKey)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred')
    } finally {
      setChatLoading(false)
    }
  }

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleChatSend()
    }
  }

  const handleClearJournal = () => {
    if (!clearConfirm) {
      setClearConfirm(true)
      return
    }
    try {
      localStorage.removeItem(DREAM_JOURNAL_KEY)
    } catch {
      // ignore
    }
    setJournal([])
    setClearConfirm(false)
  }

  const handleNewDream = () => {
    try { sessionStorage.removeItem(DREAM_SESSION_KEY) } catch { /* ignore */ }
    setStage('input')
    setDreamInput('')
    setMessages([])
    setRestoredCount(0)
    setDreamContext('')
    setActiveView('dream')
    setTimeout(() => inputRef.current?.focus(), 120)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl rounded-2xl flex flex-col max-h-[90vh]"
        style={{
          background: 'linear-gradient(160deg, #0d0b1a 0%, #0a0812 60%, #0c0a18 100%)',
          border: '1px solid rgba(167, 139, 250, 0.22)',
          boxShadow: '0 0 80px rgba(139, 92, 246, 0.12), 0 0 30px rgba(139, 92, 246, 0.06), 0 25px 60px rgba(0,0,0,0.8)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid rgba(167, 139, 250, 0.14)' }}
        >
          <div>
            <h3 className="font-heading text-xl flex items-center gap-2.5" style={{ color: 'rgba(216, 180, 254, 0.92)' }}>
              <span style={{ filter: 'drop-shadow(0 0 6px rgba(167, 139, 250, 0.5))' }}>☽</span>
              Dream Interpretation
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(167, 139, 250, 0.5)' }}>
              The cosmos speaks through the language of dreams
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Tab toggle */}
            <div
              className="flex rounded-lg overflow-hidden"
              style={{ border: '1px solid rgba(139, 92, 246, 0.22)' }}
            >
              <button
                onClick={() => setActiveView('dream')}
                className="px-3 py-1.5 text-xs font-heading transition-all"
                style={{
                  background: activeView === 'dream' ? 'rgba(109, 40, 217, 0.45)' : 'transparent',
                  color: activeView === 'dream' ? 'rgba(216, 180, 254, 0.9)' : 'rgba(167, 139, 250, 0.5)',
                  borderRight: '1px solid rgba(139, 92, 246, 0.22)',
                }}
              >
                ☽ Dream
              </button>
              <button
                onClick={() => { setActiveView('journal'); setClearConfirm(false) }}
                className="px-3 py-1.5 text-xs font-heading transition-all flex items-center gap-1.5"
                style={{
                  background: activeView === 'journal' ? 'rgba(109, 40, 217, 0.45)' : 'transparent',
                  color: activeView === 'journal' ? 'rgba(216, 180, 254, 0.9)' : 'rgba(167, 139, 250, 0.5)',
                }}
              >
                ✦ Journal
                {journal.length > 0 && (
                  <span
                    className="rounded-full px-1.5 py-0.5 leading-none"
                    style={{
                      background: 'rgba(109, 40, 217, 0.35)',
                      color: 'rgba(216, 180, 254, 0.7)',
                      fontSize: '10px',
                    }}
                  >
                    {journal.length}
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-2xl leading-none p-1 transition-colors"
              style={{ color: 'rgba(167, 139, 250, 0.45)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(216, 180, 254, 0.85)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(167, 139, 250, 0.45)')}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* ── Journal View ── */}
        {activeView === 'journal' && (
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {journal.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="text-4xl mb-4" style={{ filter: 'drop-shadow(0 0 10px rgba(167, 139, 250, 0.3))' }}>✦</span>
                <p className="font-heading text-base mb-2" style={{ color: 'rgba(216, 180, 254, 0.7)' }}>
                  No dream entries yet
                </p>
                <p className="text-sm" style={{ color: 'rgba(167, 139, 250, 0.45)' }}>
                  Interpret your first dream and it will be remembered here.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {journal.map(entry => (
                    <div
                      key={entry.id}
                      className="rounded-xl overflow-hidden"
                      style={{
                        background: 'rgba(13, 11, 26, 0.6)',
                        border: '1px solid rgba(139, 92, 246, 0.18)',
                      }}
                    >
                      <button
                        className="w-full text-left px-4 py-3 flex items-start justify-between gap-3"
                        onClick={() => setExpandedEntryId(expandedEntryId === entry.id ? null : entry.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs mb-1 font-heading" style={{ color: 'rgba(167, 139, 250, 0.55)' }}>
                            {entry.dateLabel}
                          </p>
                          <p className="text-sm leading-snug truncate" style={{ color: 'rgba(221, 214, 254, 0.75)' }}>
                            {entry.dreamText.slice(0, 80)}{entry.dreamText.length > 80 ? '…' : ''}
                          </p>
                        </div>
                        <span
                          className="text-xs mt-1 shrink-0 transition-transform"
                          style={{
                            color: 'rgba(167, 139, 250, 0.45)',
                            transform: expandedEntryId === entry.id ? 'rotate(180deg)' : 'rotate(0deg)',
                          }}
                        >
                          ▾
                        </span>
                      </button>

                      {expandedEntryId === entry.id && (
                        <div
                          className="px-4 pb-4"
                          style={{ borderTop: '1px solid rgba(139, 92, 246, 0.1)' }}
                        >
                          <p className="text-xs font-heading mt-3 mb-1.5" style={{ color: 'rgba(167, 139, 250, 0.55)' }}>
                            Dream
                          </p>
                          <p className="text-sm leading-relaxed mb-3" style={{ color: 'rgba(221, 214, 254, 0.7)' }}>
                            {entry.dreamText}
                          </p>
                          <p className="text-xs font-heading mb-1.5" style={{ color: 'rgba(216, 180, 254, 0.65)' }}>
                            Interpretation
                          </p>
                          <div className="text-sm leading-relaxed space-y-2" style={{ color: 'rgba(221, 214, 254, 0.82)' }}>
                            {entry.interpretation.split('\n').filter(l => l.trim()).map((line, i) => (
                              <p key={i}>{line}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Clear journal */}
                <div className="flex justify-end pb-2">
                  {clearConfirm ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'rgba(167, 139, 250, 0.55)' }}>
                        Clear all {journal.length} entries?
                      </span>
                      <button
                        onClick={handleClearJournal}
                        className="px-3 py-1.5 rounded-lg text-xs transition-all"
                        style={{
                          background: 'rgba(220, 38, 38, 0.2)',
                          border: '1px solid rgba(220, 38, 38, 0.35)',
                          color: 'rgba(252, 165, 165, 0.85)',
                        }}
                      >
                        Yes, clear
                      </button>
                      <button
                        onClick={() => setClearConfirm(false)}
                        className="px-3 py-1.5 rounded-lg text-xs"
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(139, 92, 246, 0.22)',
                          color: 'rgba(167, 139, 250, 0.6)',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleClearJournal}
                      className="text-xs px-3 py-1.5 rounded-lg transition-all"
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(139, 92, 246, 0.16)',
                        color: 'rgba(167, 139, 250, 0.45)',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.3)'
                        e.currentTarget.style.color = 'rgba(252, 165, 165, 0.7)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.16)'
                        e.currentTarget.style.color = 'rgba(167, 139, 250, 0.45)'
                      }}
                    >
                      Clear Journal
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Dream View ── */}
        {activeView === 'dream' && (
          <>
            {/* ── Input Stage ── */}
            {stage === 'input' && (
              <div className="flex-1 px-6 py-8 flex flex-col items-center overflow-y-auto">
                {/* Moon animation */}
                <div className="dream-moon-container mb-5">
                  <div className="dream-moon-core">☽</div>
                  <span className="dream-star" style={{ top: '8px', right: '12px', fontSize: '13px' }}>✦</span>
                  <span className="dream-star" style={{ bottom: '14px', left: '10px', fontSize: '10px', animationDelay: '1s' }}>✧</span>
                  <span className="dream-star" style={{ top: '6px', left: '20px', fontSize: '9px', animationDelay: '0.5s' }}>⋆</span>
                  <span className="dream-star" style={{ bottom: '8px', right: '16px', fontSize: '11px', animationDelay: '1.8s' }}>✦</span>
                  <span className="dream-star" style={{ top: '30px', right: '4px', fontSize: '8px', animationDelay: '2.5s' }}>⋆</span>
                </div>

                <h4 className="font-heading text-lg mb-1.5" style={{ color: 'rgba(216, 180, 254, 0.9)' }}>
                  Describe Your Dream
                </h4>
                <p className="text-sm mb-6 text-center max-w-sm leading-relaxed" style={{ color: 'rgba(167, 139, 250, 0.6)' }}>
                  Tell the cosmos what you saw in the night. The more detail you share, the deeper the reading.
                </p>

                <textarea
                  ref={inputRef}
                  value={dreamInput}
                  onChange={e => setDreamInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleInterpret() }}
                  placeholder="I was walking through a misty forest when the moon appeared low on the horizon..."
                  rows={6}
                  className="w-full px-4 py-3 text-sm resize-none focus:outline-none leading-relaxed rounded-xl"
                  style={{
                    background: 'rgba(13, 11, 26, 0.8)',
                    border: '1px solid rgba(139, 92, 246, 0.22)',
                    color: 'rgba(221, 214, 254, 0.88)',
                    boxShadow: 'inset 0 0 24px rgba(139, 92, 246, 0.04)',
                    caretColor: 'rgba(167, 139, 250, 0.8)',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.45)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.22)')}
                />

                {error && (
                  <p className="mt-3 text-xs text-red-400/80">{error}</p>
                )}

                <button
                  onClick={handleInterpret}
                  disabled={!dreamInput.trim()}
                  className="mt-5 px-8 py-3 font-heading rounded-xl text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    background: 'rgba(109, 40, 217, 0.45)',
                    border: '1px solid rgba(139, 92, 246, 0.38)',
                    color: 'rgba(221, 214, 254, 0.9)',
                    boxShadow: '0 0 24px rgba(139, 92, 246, 0.15)',
                  }}
                  onMouseEnter={e => {
                    if (!dreamInput.trim()) return
                    e.currentTarget.style.background = 'rgba(109, 40, 217, 0.65)'
                    e.currentTarget.style.borderColor = 'rgba(167, 139, 250, 0.55)'
                    e.currentTarget.style.boxShadow = '0 0 32px rgba(139, 92, 246, 0.28)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(109, 40, 217, 0.45)'
                    e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.38)'
                    e.currentTarget.style.boxShadow = '0 0 24px rgba(139, 92, 246, 0.15)'
                  }}
                >
                  ✦ Interpret Dream
                </button>

                <p className="mt-3 text-xs" style={{ color: 'rgba(139, 92, 246, 0.38)' }}>
                  Ctrl+Enter to interpret
                </p>
              </div>
            )}

            {/* ── Loading Stage 1: Sky ── */}
            {stage === 'loading-sky' && (
              <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="dream-loading-moon mb-6">☽</div>
                <p className="font-heading text-xl mb-2" style={{ color: 'rgba(216, 180, 254, 0.9)' }}>
                  Reading the Night Sky...
                </p>
                <p className="text-sm" style={{ color: 'rgba(167, 139, 250, 0.55)' }}>
                  Mapping tonight's celestial positions for your chart
                </p>
                <div className="dream-thinking mt-5">
                  <span className="dream-thinking-dot">✦</span>
                  <span className="dream-thinking-dot">✧</span>
                  <span className="dream-thinking-dot">✦</span>
                </div>
              </div>
            )}

            {/* ── Loading Stage 2: Dream Weaving ── */}
            {stage === 'loading-dream' && (
              <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="dream-loading-nebula mb-6">✦</div>
                <p className="font-heading text-xl mb-2" style={{ color: 'rgba(216, 180, 254, 0.9)' }}>
                  Weaving Your Dream...
                </p>
                <p className="text-sm" style={{ color: 'rgba(167, 139, 250, 0.55)' }}>
                  The stars are reading the symbols of your night
                </p>
                <div className="dream-thinking mt-5">
                  <span className="dream-thinking-dot">☽</span>
                  <span className="dream-thinking-dot">✦</span>
                  <span className="dream-thinking-dot">☾</span>
                </div>
              </div>
            )}

            {/* ── Chat Stage ── */}
            {stage === 'chat' && (
              <>
                <div className="dream-chat-appear flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-[300px]">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className="max-w-[88%] rounded-xl px-4 py-3 text-sm leading-relaxed"
                        style={msg.role === 'user' ? {
                          background: 'rgba(109, 40, 217, 0.22)',
                          border: '1px solid rgba(139, 92, 246, 0.28)',
                          color: 'rgba(221, 214, 254, 0.9)',
                        } : {
                          background: 'rgba(13, 11, 26, 0.7)',
                          border: '1px solid rgba(139, 92, 246, 0.14)',
                          color: 'rgba(221, 214, 254, 0.85)',
                        }}
                      >
                        {msg.role === 'assistant' && i >= restoredCount && i === messages.length - 1
                          ? <RevealText text={msg.content} />
                          : msg.content.split('\n').map((line, j) => (
                              <p key={j} className={j > 0 ? 'mt-2' : ''}>{line}</p>
                            ))
                        }
                      </div>
                    </div>
                  ))}

                  {/* Suggestion chips only after first interpretation, hide if conversation continued */}
                  {messages.length === 1 && !chatLoading && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <DreamChip text="What do the symbols in my dream mean?" onClick={setChatInput} />
                      <DreamChip text="How do tonight's transits connect to this?" onClick={setChatInput} />
                      <DreamChip text="Is this dream a recurring theme in my chart?" onClick={setChatInput} />
                      <DreamChip text="What action should I take from this?" onClick={setChatInput} />
                    </div>
                  )}

                  {chatLoading && (
                    <div className="flex justify-start">
                      <div
                        className="rounded-xl px-5 py-4"
                        style={{ background: 'rgba(13, 11, 26, 0.7)', border: '1px solid rgba(139, 92, 246, 0.14)' }}
                      >
                        <div className="dream-thinking">
                          <span className="dream-thinking-dot">☽</span>
                          <span className="dream-thinking-dot">✦</span>
                          <span className="dream-thinking-dot">☾</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Input bar */}
                <div
                  className="px-6 py-4"
                  style={{ borderTop: '1px solid rgba(139, 92, 246, 0.14)' }}
                >
                  <div className="flex gap-2 mb-2">
                    <textarea
                      ref={chatInputRef}
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={handleChatKeyDown}
                      placeholder="Ask about your dream..."
                      rows={1}
                      className="flex-1 px-4 py-2.5 text-sm resize-none focus:outline-none rounded-xl"
                      style={{
                        background: 'rgba(13, 11, 26, 0.8)',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                        color: 'rgba(221, 214, 254, 0.88)',
                        caretColor: 'rgba(167, 139, 250, 0.8)',
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.42)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.2)')}
                    />
                    <button
                      onClick={handleChatSend}
                      disabled={!chatInput.trim() || chatLoading}
                      className="px-5 py-2.5 font-heading rounded-xl text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{
                        background: 'rgba(109, 40, 217, 0.45)',
                        border: '1px solid rgba(139, 92, 246, 0.38)',
                        color: 'rgba(221, 214, 254, 0.9)',
                      }}
                      onMouseEnter={e => {
                        if (chatInput.trim() && !chatLoading) {
                          e.currentTarget.style.background = 'rgba(109, 40, 217, 0.65)'
                        }
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(109, 40, 217, 0.45)'
                      }}
                    >
                      Send
                    </button>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleNewDream}
                      className="text-xs transition-colors"
                      style={{ color: 'rgba(167, 139, 250, 0.38)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'rgba(167, 139, 250, 0.65)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(167, 139, 250, 0.38)')}
                    >
                      + New dream
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function DreamChip({ text, onClick }: { text: string; onClick: (t: string) => void }) {
  return (
    <button
      onClick={() => onClick(text)}
      className="px-3 py-1.5 rounded-full text-xs transition-colors"
      style={{
        background: 'rgba(109, 40, 217, 0.1)',
        border: '1px solid rgba(139, 92, 246, 0.18)',
        color: 'rgba(167, 139, 250, 0.7)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(167, 139, 250, 0.38)'
        e.currentTarget.style.color = 'rgba(216, 180, 254, 0.85)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.18)'
        e.currentTarget.style.color = 'rgba(167, 139, 250, 0.7)'
      }}
    >
      {text}
    </button>
  )
}

function RevealText({ text }: { text: string }) {
  const words = useMemo(() => text.split(/(\s+)/), [text])
  const [count, setCount] = useState(1)

  useEffect(() => {
    let i = 1
    const id = setInterval(() => {
      i += 2
      if (i >= words.length) { setCount(words.length); clearInterval(id) }
      else setCount(i)
    }, 30)
    return () => clearInterval(id)
  }, [words])

  const revealed = words.slice(0, count).join('')
  return (
    <div>
      {revealed.split('\n').map((line, j) => (
        <p key={j} className={j > 0 ? 'mt-2' : ''}>{line}</p>
      ))}
    </div>
  )
}
