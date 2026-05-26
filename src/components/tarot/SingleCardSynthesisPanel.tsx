import { useEffect, useRef, useState } from 'react'
import GptSkeleton from '../ui/GptSkeleton'
import UpgradeModal from '../subscription/UpgradeModal'
import { RateLimitError } from '../../services/gptInterpretation'
import type { TarotSingleSynthesisPayload } from '../../services/gptInterpretation'
import { AUTH_TOKEN_KEY } from '../../services/authService'

const SYNTHESIS_LOADING_VARIANTS = [
  "Reading today's sky for you...",
  'The card and the sky are being read together...',
  "Tracing the card's meaning through your chart...",
]

const GPT_REQUEST_TIMEOUT_MS = 30_000

type SynthesisState = 'loading' | 'success' | 'unavailable' | 'rate-limited'

interface TarotSynthesisPanelProps {
  synthesisPayload: TarotSingleSynthesisPayload | null
  onDiscuss: () => void
}

function splitReadableParagraphs(text: string): string[] {
  const normalized = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  if (normalized.length > 1) return normalized

  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(sentence => sentence.trim()).filter(Boolean) ?? []
  if (sentences.length <= 3) return [text.trim()]

  const chunks: string[] = []
  for (let index = 0; index < sentences.length; index += 2) {
    chunks.push(sentences.slice(index, index + 2).join(' '))
  }
  return chunks
}

async function callTarotSynthesis(
  synthesisPayload: TarotSingleSynthesisPayload,
  signal: AbortSignal,
): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (token) headers['Authorization'] = `Bearer ${token}`
  } catch { /* localStorage unavailable */ }

  const response = await fetch('/api/gpt/interpret', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type: 'tarot-single-synthesis',
      payload: synthesisPayload,
    }),
    signal,
  })

  if (response.status === 429) {
    let authenticated = !!headers['Authorization']
    let resetAt = new Date(Date.now() + 86400000).toISOString()
    let tier: 'free' | 'basic' | 'advanced' = 'free'
    try {
      const body = await response.json() as { authenticated?: boolean; resetAt?: string; tier?: string }
      if (body.authenticated === false) authenticated = false
      if (body.resetAt) resetAt = body.resetAt
      if (body.tier === 'basic' || body.tier === 'advanced') tier = body.tier
    } catch { /* fall back to defaults */ }
    throw new RateLimitError({ resetAt, authenticated, tier })
  }

  if (!response.ok) throw new Error('server_error')

  const data = await response.json() as { result: string }
  return data.result
}

export default function SingleCardSynthesisPanel({
  synthesisPayload,
  onDiscuss,
}: TarotSynthesisPanelProps) {
  const [state, setState] = useState<SynthesisState>('loading')
  const [text, setText] = useState<string | null>(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [rateLimitInfo, setRateLimitInfo] = useState<{ resetAt: string; authenticated: boolean; tier: 'free' | 'basic' | 'advanced' } | null>(null)

  const loadingVariant = useRef(SYNTHESIS_LOADING_VARIANTS[Math.floor(Math.random() * 3)])
  const abortRef = useRef<AbortController | null>(null)
  const loadStartRef = useRef<number>(0)

  const runSynthesis = () => {
    if (!synthesisPayload) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    loadStartRef.current = Date.now()
    setState('loading')
    setText(null)

    const timeoutId = setTimeout(() => controller.abort(), GPT_REQUEST_TIMEOUT_MS)

    callTarotSynthesis(synthesisPayload, controller.signal)
      .then(result => {
        const elapsed = Date.now() - loadStartRef.current
        const delay = Math.max(0, 1000 - elapsed)
        setTimeout(() => {
          setText(result)
          setState('success')
        }, delay)
      })
      .catch(err => {
        if (err instanceof Error && err.name === 'AbortError') return
        if (err instanceof RateLimitError) {
          setRateLimitInfo(err.info)
          setState('rate-limited')
          setUpgradeOpen(true)
          return
        }
        setState('unavailable')
      })
      .finally(() => {
        clearTimeout(timeoutId)
      })
  }

  useEffect(() => {
    if (!synthesisPayload) return
    runSynthesis()
    return () => { abortRef.current?.abort() }
  }, [synthesisPayload]) // eslint-disable-line react-hooks/exhaustive-deps

  const thresholdDivider = (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-mystic-gold/20" />
      <span className="text-mystic-gold/40 text-xs">✦</span>
      <div className="flex-1 h-px bg-mystic-gold/20" />
    </div>
  )

  if (state === 'loading') {
    return (
      <div className="mb-4">
        {thresholdDivider}
        <GptSkeleton label={loadingVariant.current} accentColor="gold" lines={5} />
      </div>
    )
  }

  if (state === 'success' && text) {
    const paragraphs = splitReadableParagraphs(text)
    return (
      <div className="mb-4">
        {thresholdDivider}
        <div className="space-y-4 mb-8">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-mystic-text/90 leading-relaxed text-sm">{p}</p>
          ))}
        </div>
        <button
          type="button"
          onClick={onDiscuss}
          className="font-heading text-mystic-gold text-sm border border-mystic-gold/30 rounded-lg px-6 py-3 hover:border-mystic-gold/60 hover:text-mystic-gold transition-colors min-h-[44px]"
        >
          ✦ Discuss
        </button>
      </div>
    )
  }

  if (state === 'unavailable') {
    return (
      <div className="mb-4">
        {thresholdDivider}
        <p className="text-mystic-muted/70 text-sm italic leading-relaxed mb-3">
          The synthesis is resting. The instant interpretation above is complete.
        </p>
        <button
          type="button"
          onClick={runSynthesis}
          className="text-mystic-gold/50 hover:text-mystic-gold text-xs transition-colors cursor-pointer"
        >
          Try again
        </button>
        <div className="mt-6">
          <button
            type="button"
            onClick={onDiscuss}
            className="font-heading text-mystic-gold text-sm border border-mystic-gold/30 rounded-lg px-6 py-3 hover:border-mystic-gold/60 transition-colors min-h-[44px]"
          >
            ✦ Discuss
          </button>
        </div>
      </div>
    )
  }

  if (state === 'rate-limited') {
    return (
      <>
        {thresholdDivider}
        <p className="text-mystic-muted/70 text-sm italic leading-relaxed mb-3">
          You've reached today's synthesis limit.
        </p>
        <button
          type="button"
          onClick={() => setUpgradeOpen(true)}
          className="text-mystic-gold/50 hover:text-mystic-gold text-xs transition-colors cursor-pointer"
        >
          Upgrade
        </button>
        {rateLimitInfo && (
          <UpgradeModal
            isOpen={upgradeOpen}
            onClose={() => setUpgradeOpen(false)}
            currentTier={rateLimitInfo.tier}
            resetAt={rateLimitInfo.resetAt}
            authenticated={rateLimitInfo.authenticated}
          />
        )}
      </>
    )
  }

  return null
}
