import { useReducer, useEffect, useRef, useState } from 'react'
import type { FocusArea } from './TarotIntentionScreen'
import type { ReadingMode } from './TarotModeSelector'
import RitualFadeOverlay from './RitualFadeOverlay'

// ─── State Machine Types ──────────────────────────────────────────────────────

type RitualPhase =
  | 'idle'
  | 'intention-set'
  | 'shuffling'
  | 'card-selected'
  | 'revealing'
  | 'revealed'

type RitualError =
  | { kind: 'draw-failed'; attempts: number }
  | { kind: 'data-missing'; cardId: string }

interface RitualCtx {
  phase: RitualPhase
  intention: string
  focusArea: FocusArea
  readingMode: ReadingMode
  shuffleStartedAt: number | null
  drawnCardIndices: number[]
  currentCardIndex: number
  error: RitualError | null
}

type RitualAction =
  | { type: 'START_INTENTION'; intention: string; focusArea: FocusArea }
  | { type: 'BEGIN_SHUFFLE' }
  | { type: 'CARD_READY'; cardIndices: number[] }
  | { type: 'USER_FLIP' }
  | { type: 'FLIP_COMPLETE' }
  | { type: 'RETRY' }
  | { type: 'ERROR'; error: RitualError }

function ritualReducer(ctx: RitualCtx, action: RitualAction): RitualCtx {
  switch (action.type) {
    case 'START_INTENTION':
      return { ...ctx, phase: 'intention-set', intention: action.intention, focusArea: action.focusArea }
    case 'BEGIN_SHUFFLE':
      return { ...ctx, phase: 'shuffling', shuffleStartedAt: Date.now() }
    case 'CARD_READY':
      return { ...ctx, phase: 'card-selected', drawnCardIndices: action.cardIndices }
    case 'USER_FLIP':
      if (ctx.phase !== 'card-selected') return ctx
      return { ...ctx, phase: 'revealing' }
    case 'FLIP_COMPLETE':
      return { ...ctx, phase: 'revealed' }
    case 'RETRY':
      return { ...ctx, phase: 'shuffling', shuffleStartedAt: Date.now(), error: null }
    case 'ERROR':
      return { ...ctx, error: action.error }
    default:
      return ctx
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RevealedState {
  drawnCardIndices: number[]
  currentCardIndex: number
}

export interface DeckShuffleAnimationProps {
  intention: string
  focusArea: FocusArea
  readingMode: ReadingMode
  onCardSelected: (cardIndex: number) => void
  onRevealComplete: (state: RevealedState) => void
  cardCount: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function drawCards(count: number): number[] {
  const pool = Array.from({ length: 78 }, (_, i) => i)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}

function EightPointedStar() {
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" aria-hidden="true">
      <path
        d="M30 4 L33 27 L56 30 L33 33 L30 56 L27 33 L4 30 L27 27 Z"
        fill="rgba(201,168,76,0.15)"
      />
    </svg>
  )
}

const CARD_W = 140
const CARD_H = 220
const SELECTED_W = 160
const SELECTED_H = 250

function CardBack({
  width = CARD_W,
  height = CARD_H,
  style,
}: {
  width?: number
  height?: number
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 12,
        background: '#1a1040',
        border: '1px solid rgba(201,168,76,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style,
      }}
    >
      <EightPointedStar />
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DeckShuffleAnimation({
  intention,
  focusArea,
  readingMode,
  onCardSelected,
  onRevealComplete,
  cardCount,
}: DeckShuffleAnimationProps) {
  const prefersReduced = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  const [hintSeen] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('tarot_hint_seen') === 'true'
  })
  const [showHint, setShowHint] = useState(false)
  const [fadeActive, setFadeActive] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)

  const shuffleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ariaLiveRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const initial: RitualCtx = {
    phase: 'idle',
    intention,
    focusArea,
    readingMode,
    shuffleStartedAt: null,
    drawnCardIndices: [],
    currentCardIndex: 0,
    error: null,
  }

  const [ctx, dispatch] = useReducer(ritualReducer, initial)

  // idle → intention-set on mount
  useEffect(() => {
    dispatch({ type: 'START_INTENTION', intention, focusArea })
  }, [])

  // intention-set → shuffling after 600ms
  useEffect(() => {
    if (ctx.phase !== 'intention-set') return
    const t = setTimeout(() => dispatch({ type: 'BEGIN_SHUFFLE' }), 600)
    return () => clearTimeout(t)
  }, [ctx.phase])

  // shuffling: draw cards synchronously, enforce 2000ms minimum
  useEffect(() => {
    if (ctx.phase !== 'shuffling') return
    const indices = drawCards(cardCount)
    shuffleTimerRef.current = setTimeout(() => {
      dispatch({ type: 'CARD_READY', cardIndices: indices })
    }, 2000)
    return () => {
      if (shuffleTimerRef.current) clearTimeout(shuffleTimerRef.current)
    }
  }, [ctx.phase, cardCount])

  // shuffling → card-selected: fade-through-black
  useEffect(() => {
    if (ctx.phase !== 'card-selected') return
    if (!prefersReduced.current) {
      setFadeActive(true)
      const t = setTimeout(() => setFadeActive(false), 500)
      return () => clearTimeout(t)
    }
  }, [ctx.phase])

  // card-selected: focus card, announce, show hint
  useEffect(() => {
    if (ctx.phase !== 'card-selected') return

    cardRef.current?.focus()
    onCardSelected(ctx.drawnCardIndices[0] ?? 0)

    if (ariaLiveRef.current) {
      ariaLiveRef.current.textContent =
        'Your card has been selected. Tap or click the card to reveal it.'
    }

    if (!hintSeen) {
      hintTimerRef.current = setTimeout(() => {
        setShowHint(true)
        localStorage.setItem('tarot_hint_seen', 'true')
        setTimeout(() => setShowHint(false), 3000)
      }, 1200)
    }

    return () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    }
  }, [ctx.phase])

  // revealing: start flip, auto-advance after 600ms
  useEffect(() => {
    if (ctx.phase !== 'revealing') return
    setIsFlipped(true)
    flipTimerRef.current = setTimeout(() => dispatch({ type: 'FLIP_COMPLETE' }), 600)
    return () => {
      if (flipTimerRef.current) clearTimeout(flipTimerRef.current)
    }
  }, [ctx.phase])

  // revealed: announce and notify parent
  useEffect(() => {
    if (ctx.phase !== 'revealed') return
    if (ariaLiveRef.current) {
      ariaLiveRef.current.textContent = `Card ${(ctx.drawnCardIndices[0] ?? 0) + 1} has been revealed.`
    }
    onRevealComplete({ drawnCardIndices: ctx.drawnCardIndices, currentCardIndex: ctx.currentCardIndex })
  }, [ctx.phase])

  function handleFlip() {
    if (ctx.phase !== 'card-selected') return
    dispatch({ type: 'USER_FLIP' })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleFlip()
    }
    if (e.key === 'Escape') {
      // Parent can listen for this if needed
    }
  }

  const showDeck =
    ctx.phase === 'idle' || ctx.phase === 'intention-set' || ctx.phase === 'shuffling'

  const showSingleCard =
    ctx.phase === 'card-selected' || ctx.phase === 'revealing' || ctx.phase === 'revealed'

  const isShuffling = ctx.phase === 'shuffling'

  const intentionLabel = intention.trim()
    ? (intention.length > 60 ? intention.slice(0, 60) + '…' : intention)
    : focusArea.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

  const isTouchDevice =
    typeof window !== 'undefined' && 'ontouchstart' in window

  // Flip card style — reduced motion: opacity swap instead of 3D rotation
  const flipTransform = prefersReduced.current
    ? undefined
    : isFlipped
      ? 'rotateY(180deg) scale(1.0)'
      : 'rotateY(0deg) scale(0.95)'

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: '#0a0a0f', position: 'relative' }}
    >
      <RitualFadeOverlay visible={fadeActive} />

      {/* Screen reader live region */}
      <div ref={ariaLiveRef} aria-live="polite" className="sr-only" />

      <div className="flex flex-col items-center gap-10">

        {/* Intention echo above deck */}
        {(ctx.phase === 'intention-set' || ctx.phase === 'shuffling') && (
          <p
            className="font-heading text-center"
            style={{
              fontSize: '18px',
              fontStyle: 'italic',
              color: 'rgba(201, 168, 76, 0.7)',
              maxWidth: '320px',
              lineHeight: 1.4,
              opacity: ctx.phase === 'intention-set' ? 1 : 0.65,
              transition: 'opacity 400ms ease',
            }}
          >
            Seeking clarity on: {intentionLabel}
          </p>
        )}

        {/* Three-card deck */}
        {showDeck && (
          <div
            aria-hidden={isShuffling ? 'true' : undefined}
            style={{ position: 'relative', width: CARD_W, height: CARD_H }}
          >
            {/* Card 0 — left fan */}
            <div
              className={isShuffling ? 'tarot-fan-left' : undefined}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 3,
                animation: isShuffling && !prefersReduced.current
                  ? 'tarotFanLeft 1000ms ease-in-out infinite 0ms'
                  : ctx.phase === 'intention-set'
                    ? 'tarotDeckBreathe 1.5s ease-in-out 1'
                    : 'none',
                transform:
                  isShuffling || ctx.phase === 'intention-set'
                    ? undefined
                    : `translateX(-4px) translateY(-4px) rotate(0deg)`,
                transition: isShuffling ? undefined : 'transform 400ms ease',
              }}
            >
              <CardBack />
            </div>

            {/* Card 1 — center */}
            <div
              className={isShuffling ? 'tarot-fan-center' : undefined}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 2,
                animation: isShuffling && !prefersReduced.current
                  ? 'tarotFanCenter 1000ms ease-in-out infinite 100ms'
                  : ctx.phase === 'intention-set'
                    ? 'tarotDeckBreathe 1.5s ease-in-out 1 50ms'
                    : 'none',
              }}
            >
              <CardBack />
            </div>

            {/* Card 2 — right fan */}
            <div
              className={isShuffling ? 'tarot-fan-right' : undefined}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 1,
                animation: isShuffling && !prefersReduced.current
                  ? 'tarotFanRight 1000ms ease-in-out infinite 200ms'
                  : ctx.phase === 'intention-set'
                    ? 'tarotDeckBreathe 1.5s ease-in-out 1 100ms'
                    : 'none',
                transform:
                  isShuffling || ctx.phase === 'intention-set'
                    ? undefined
                    : `translateX(4px) translateY(4px) rotate(0deg)`,
                transition: isShuffling ? undefined : 'transform 400ms ease',
              }}
            >
              <CardBack />
            </div>
          </div>
        )}

        {/* Single face-down / flip card */}
        {showSingleCard && (
          <div style={{ position: 'relative' }}>
            <div style={{ perspective: '1200px' }}>
              {prefersReduced.current ? (
                // Reduced motion: simple opacity swap
                <div
                  ref={cardRef}
                  role={ctx.phase === 'card-selected' ? 'button' : undefined}
                  tabIndex={ctx.phase === 'card-selected' ? 0 : undefined}
                  aria-label={ctx.phase === 'card-selected' ? 'Reveal card' : undefined}
                  onClick={handleFlip}
                  onKeyDown={handleKeyDown}
                  style={{
                    width: SELECTED_W,
                    height: SELECTED_H,
                    cursor: ctx.phase === 'card-selected' ? 'pointer' : 'default',
                    position: 'relative',
                  }}
                >
                  {/* Back */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: isFlipped ? 0 : 1,
                      transition: 'opacity 200ms ease',
                    }}
                  >
                    <CardBack width={SELECTED_W} height={SELECTED_H} />
                  </div>
                  {/* Front */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: isFlipped ? 1 : 0,
                      transition: 'opacity 200ms ease',
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #1a1040 0%, #0d0820 100%)',
                      border: '1px solid rgba(201,168,76,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ color: 'rgba(201,168,76,0.8)', fontSize: '32px' }}>✦</span>
                  </div>
                </div>
              ) : (
                // Full 3D flip
                <div
                  ref={cardRef}
                  role={ctx.phase === 'card-selected' ? 'button' : undefined}
                  tabIndex={ctx.phase === 'card-selected' ? 0 : undefined}
                  aria-label={ctx.phase === 'card-selected' ? 'Reveal card' : undefined}
                  onClick={handleFlip}
                  onKeyDown={handleKeyDown}
                  className={ctx.phase === 'card-selected' ? 'tarot-card-breathe' : ''}
                  style={{
                    width: SELECTED_W,
                    height: SELECTED_H,
                    position: 'relative',
                    transformStyle: 'preserve-3d',
                    transform: flipTransform,
                    filter: isFlipped ? 'brightness(1.0)' : 'brightness(0.8)',
                    transition: 'transform 600ms ease-in-out, filter 600ms ease-in-out',
                    cursor: ctx.phase === 'card-selected' ? 'pointer' : 'default',
                    animation:
                      ctx.phase === 'card-selected'
                        ? 'tarotCardBreathe 3s ease-in-out infinite'
                        : 'none',
                  }}
                >
                  {/* Back face */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      borderRadius: 12,
                      background: '#1a1040',
                      border: '1px solid rgba(201,168,76,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <EightPointedStar />
                  </div>

                  {/* Front face */}
                  <div
                    aria-hidden={!isFlipped ? 'true' : undefined}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #1a1040 0%, #0d0820 100%)',
                      border: '1px solid rgba(201,168,76,0.4)',
                      transform: 'rotateY(180deg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        color: 'rgba(201,168,76,0.8)',
                        fontSize: '32px',
                        opacity: isFlipped && ctx.phase === 'revealed' ? 1 : 0,
                        transition: 'opacity 300ms ease 300ms',
                      }}
                    >
                      ✦
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Tap-to-reveal hint */}
            {ctx.phase === 'card-selected' && showHint && (
              <p
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginTop: '16px',
                  fontSize: '11px',
                  color: 'rgba(201,168,76,0.4)',
                  whiteSpace: 'nowrap',
                  opacity: showHint ? 1 : 0,
                  transition: 'opacity 400ms ease',
                  pointerEvents: 'none',
                }}
              >
                {isTouchDevice ? 'Tap' : 'Click'} to reveal
              </p>
            )}

            {/* Error message */}
            {ctx.error && ctx.phase === 'card-selected' && (
              <p
                className="font-body text-center"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginTop: '16px',
                  fontSize: '13px',
                  color: 'rgba(138,134,148,0.7)',
                  whiteSpace: 'nowrap',
                }}
              >
                Something shifted.{' '}
                <button
                  onClick={() => dispatch({ type: 'RETRY' })}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(201,168,76,0.7)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    padding: 0,
                  }}
                >
                  Tap to draw again.
                </button>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
