import { useState, useRef, useEffect, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import {
  getDailySnapshotInterpretation,
  getDreamInterpretation,
  getDreamDiscussResponse,
  getStoredApiKey,
  type ChatMessage,
} from '../../services/gptInterpretation'
import { calculateCurrentPositions, calculateTransitAspects, getTopActiveTransits } from '../../engine/transits'
import { getCurrentMoonPhase } from '../../engine/lunar'
import { getMoonSignAndPhase } from '../../engine/astronomy'
import type { ChartData, PlanetPosition } from '../../engine/types'
import { isQuotaError } from '../../utils/storage'

const todayKey = new Date().toISOString().slice(0, 10)
const DREAM_SESSION_KEY = `dream-session-${todayKey}`

interface SkyContext {
  moonSign: string
  moonPhase: string
  moonElongation: number
  transits?: Array<{ transitPlanet: string; aspect: string; natalPlanet: string; orb: number }>
}

interface DreamSession {
  messages: ChatMessage[]
  dreamContext: string
  dreamInput: string
  skyContext?: SkyContext
}

const PLANET_GLYPHS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇', NorthNode: '☊',
}

function planetGlyph(name: string): string {
  return PLANET_GLYPHS[name] ?? name
}

const NEPTUNE_HOUSE_NOTES: Record<number, string> = {
  1: 'mystical identity', 2: 'material dissolution', 3: 'visionary mind',
  4: 'ancestral depths', 5: 'creative visions', 6: 'healing dissolution',
  7: 'idealized bonds', 8: 'transformation and shadow', 9: 'spiritual seeking',
  10: 'dissolving ambition', 11: 'collective dreaming', 12: 'native to the unseen',
}

const MOON_SIGN_NOTES: Record<string, string> = {
  Aries: 'impulsive, reactive', Taurus: 'grounded, sensory', Gemini: 'restless, verbal',
  Cancer: 'deep, instinctive', Leo: 'dramatic, proud', Virgo: 'analytical, anxious',
  Libra: 'relational, attuned', Scorpio: 'intense, depth-seeking',
  Sagittarius: 'free, expansive', Capricorn: 'controlled, reserved',
  Aquarius: 'detached, unusual', Pisces: 'porous, dissolving',
}

interface DreamModalProps {
  open: boolean
  onClose: () => void
  chartData?: ChartData | null
}

type Stage = 'input' | 'loading-sky' | 'loading-dream' | 'chat'

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
  const [skyContext, setSkyContext] = useState<SkyContext | undefined>()

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setChatInput('')

    try {
      const saved = localStorage.getItem(DREAM_SESSION_KEY)
      if (saved) {
        const session = JSON.parse(saved) as DreamSession
        setMessages(session.messages)
        setDreamContext(session.dreamContext)
        setDreamInput(session.dreamInput)
        setSkyContext(session.skyContext)
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
    setSkyContext(undefined)
    setTimeout(() => inputRef.current?.focus(), 120)
  }, [open])

  // Persist session to localStorage whenever messages or context update
  useEffect(() => {
    if (messages.length === 0) return
    try {
      const session: DreamSession = { messages, dreamContext, dreamInput, skyContext }
      localStorage.setItem(DREAM_SESSION_KEY, JSON.stringify(session))
    } catch (e) {
      if (isQuotaError(e)) {
        setError('Your browser storage is full — this dream session could not be saved. Export your data to free space.')
      }
    }
  }, [messages, dreamContext, dreamInput, skyContext])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatLoading])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const dreamscapeBlueprint = useMemo(() => {
    if (!chartData) return null
    const neptune = chartData.planets.find(p => p.name === 'Neptune')
    const moon = chartData.planets.find(p => p.name === 'Moon')
    const showHouses = !chartData.unknownTime
    const twelfthPlanets = showHouses ? chartData.planets.filter(p => p.house === 12) : []
    const ascSign = showHouses ? chartData.angles?.ascendant?.sign : undefined
    return { neptune, moon, twelfthPlanets, ascSign, showHouses }
  }, [chartData])

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

      // Capture sky context — fail open (never block the save)
      let capturedSkyCtx: SkyContext | undefined
      try {
        const moonData = getMoonSignAndPhase(now)
        capturedSkyCtx = {
          moonSign: moonData.sign,
          moonPhase: moonData.phase,
          moonElongation: moonData.elongation,
        }
        const topTransits = getTopActiveTransits(chartData, 3, 2)
        if (topTransits.length > 0) {
          capturedSkyCtx.transits = topTransits.map(t => ({
            transitPlanet: t.transitPlanet as string,
            aspect: t.symbol,
            natalPlanet: t.natalPlanet as string,
            orb: t.orb,
          }))
        }
      } catch {
        // sky context is optional — continue without it
      }
      setSkyContext(capturedSkyCtx)

      const snapshotPrompt = buildDreamSnapshotPrompt(chartData, moonPhase, transitAspects)
      const transitSummary = await getDailySnapshotInterpretation(snapshotPrompt, apiKey)

      setStage('loading-dream')

      const natalCtx = buildNatalContext(chartData, birthData.date)
      const transitAspectsText = transitAspects.slice(0, 8).map(a =>
        `Transit ${a.transitPlanet} ${a.symbol} Natal ${a.natalPlanet} (${a.type}, orb ${a.orb}°, ${a.applying ? 'applying' : 'separating'}, ${a.nature})`
      ).join('\n') || 'No tight transit aspects active today.'

      const gptSkyCtx = capturedSkyCtx ? {
        moonSign: capturedSkyCtx.moonSign,
        moonPhase: capturedSkyCtx.moonPhase,
        transits: capturedSkyCtx.transits,
      } : undefined

      const interpretation = await getDreamInterpretation(
        dream, natalCtx, transitSummary, transitAspectsText, apiKey, gptSkyCtx, chartData,
      )

      const ctx = `## Dreamer's Natal Chart\n${natalCtx}\n\n## Today's Astrological Picture\n${transitSummary}\n\n## Active Transit Aspects\n${transitAspectsText}\n\n## The Dream\n${dream}`
      setDreamContext(ctx)
      setMessages([{ role: 'assistant', content: interpretation }])
      setStage('chat')
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
                    {msg.role === 'assistant' && i === 0 && skyContext && (
                      <div
                        className="mt-3 pt-2"
                        style={{
                          borderTop: '1px solid rgba(139, 92, 246, 0.12)',
                          color: 'rgba(139, 92, 246, 0.52)',
                          fontSize: '11px',
                          letterSpacing: '0.02em',
                        }}
                      >
                        {'☽ ' + skyContext.moonSign + ' · ' + skyContext.moonPhase}
                        {skyContext.transits?.map((t, ti) => (
                          <span key={ti}>{' · '}{planetGlyph(t.transitPlanet)} {t.aspect} {planetGlyph(t.natalPlanet)}</span>
                        ))}
                      </div>
                    )}
                    {msg.role === 'assistant' && i === 0 && dreamscapeBlueprint && (
                      <DreamscapeBlueprintDisplay blueprint={dreamscapeBlueprint} />
                    )}
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
              <div className="flex gap-2">
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
            </div>
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

interface DreamscapeBlueprintProps {
  blueprint: {
    neptune: PlanetPosition | undefined
    moon: PlanetPosition | undefined
    twelfthPlanets: PlanetPosition[]
    ascSign: string | undefined
    showHouses: boolean
  }
}

function DreamscapeBlueprintDisplay({ blueprint }: DreamscapeBlueprintProps) {
  const neptuneHouseNote = blueprint.showHouses && blueprint.neptune?.house
    ? NEPTUNE_HOUSE_NOTES[blueprint.neptune.house]
    : undefined
  const moonSignNote = blueprint.moon ? MOON_SIGN_NOTES[blueprint.moon.sign] : undefined

  return (
    <div
      className="mt-2 pt-2"
      style={{ borderTop: '1px solid rgba(201, 168, 76, 0.12)' }}
    >
      <div style={{
        color: 'rgba(201, 168, 76, 0.45)',
        fontSize: '10px',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        marginBottom: '3px',
      }}>
        Your dream nature
      </div>
      <div style={{
        color: 'rgba(201, 168, 76, 0.7)',
        fontSize: '11px',
        letterSpacing: '0.02em',
        lineHeight: '1.65',
      }}>
        {blueprint.neptune && (
          <div>
            ♆ Neptune · {blueprint.neptune.sign}
            {blueprint.showHouses && blueprint.neptune.house ? ` · House ${blueprint.neptune.house}` : ''}
            {neptuneHouseNote ? ` — ${neptuneHouseNote}` : ''}
          </div>
        )}
        {blueprint.moon && (
          <div>
            ☽ Moon · {blueprint.moon.sign}
            {blueprint.showHouses && blueprint.moon.house ? ` · House ${blueprint.moon.house}` : ''}
            {moonSignNote ? ` — ${moonSignNote}` : ''}
          </div>
        )}
        {blueprint.twelfthPlanets.length > 0 && (
          <div>
            {blueprint.twelfthPlanets.map(p => `${planetGlyph(p.name)} ${p.name}`).join(' · ')} in 12th
          </div>
        )}
        {blueprint.ascSign === 'Pisces' && (
          <div>♓ Pisces Rising — porous to the dream realm</div>
        )}
      </div>
    </div>
  )
}
