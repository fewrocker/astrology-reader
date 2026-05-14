import { useEffect, useRef, useState } from 'react'
import AuthModal from '../auth/AuthModal'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  currentTier: 'free' | 'basic' | 'advanced'
  resetAt: string | null
  authenticated: boolean
  intendedTier?: 'basic' | 'advanced'
}

const BASIC_PRICE = import.meta.env.VITE_BASIC_PRICE ?? '9'
const ADVANCED_PRICE = import.meta.env.VITE_ADVANCED_PRICE ?? '29'

const BASIC_PRICE_ID = import.meta.env.VITE_STRIPE_BASIC_PRICE_ID ?? ''
const ADVANCED_PRICE_ID = import.meta.env.VITE_STRIPE_ADVANCED_PRICE_ID ?? ''

function formatResetAt(resetAt: string | null): string {
  if (!resetAt) return 'midnight UTC'
  try {
    const d = new Date(resetAt)
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short',
    })
  } catch {
    return 'midnight UTC'
  }
}

function getHeading(
  currentTier: 'free' | 'basic' | 'advanced',
  authenticated: boolean,
  intendedTier?: 'basic' | 'advanced',
): string {
  if (intendedTier === 'advanced') {
    return 'This reading requires the Advanced sky.'
  }
  if (!authenticated) {
    return "Three free readings per day. You've used yours."
  }
  if (currentTier === 'free') {
    return 'Your readings for today have ended.'
  }
  if (currentTier === 'basic') {
    return "You've explored the full sky today."
  }
  return 'Your readings for today have ended.'
}

export default function UpgradeModal({
  isOpen,
  onClose,
  currentTier,
  resetAt,
  authenticated,
  intendedTier,
}: UpgradeModalProps) {
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [pendingTierForAuth, setPendingTierForAuth] = useState<'basic' | 'advanced' | null>(null)
  const [checkoutState, setCheckoutState] = useState<'idle' | 'ceremony' | 'error'>('idle')
  const [ceremonyStartedAt, setCeremonyStartedAt] = useState<number>(0)
  const firstFocusRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setCheckoutState('idle')
      setTimeout(() => firstFocusRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      // Trap focus inside modal
      if (e.key === 'Tab' && containerRef.current) {
        const focusable = Array.from(
          containerRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter(el => !el.hasAttribute('disabled'))
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen && !authModalOpen) return null

  const heading = getHeading(currentTier, authenticated, intendedTier)
  const resetTime = formatResetAt(resetAt)

  const handleCheckout = async (priceId: string, tier: 'basic' | 'advanced') => {
    if (!authenticated) {
      setPendingTierForAuth(tier)
      setAuthModalOpen(true)
      return
    }

    const start = Date.now()
    setCeremonyStartedAt(start)
    setCheckoutState('ceremony')

    try {
      const token = localStorage.getItem('astral-auth-token')
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ priceId }),
      })

      const elapsed = Date.now() - start
      const remaining = Math.max(0, 2000 - elapsed)

      if (!res.ok) {
        await new Promise(r => setTimeout(r, remaining))
        setCheckoutState('error')
        return
      }

      const data = await res.json() as { url?: string }
      if (!data.url) {
        await new Promise(r => setTimeout(r, remaining))
        setCheckoutState('error')
        return
      }

      // Hold for ceremony minimum (2s), cap at 4s total
      const waitMs = Math.max(remaining, 0)
      await new Promise(r => setTimeout(r, waitMs))
      window.location.href = data.url
    } catch {
      const elapsed = Date.now() - ceremonyStartedAt
      await new Promise(r => setTimeout(r, Math.max(0, 2000 - elapsed)))
      setCheckoutState('error')
    }
  }

  const handleAuthComplete = async () => {
    setAuthModalOpen(false)
    if (pendingTierForAuth) {
      const priceId = pendingTierForAuth === 'basic' ? BASIC_PRICE_ID : ADVANCED_PRICE_ID
      const tier = pendingTierForAuth
      setPendingTierForAuth(null)
      // Small delay to let auth context settle
      await new Promise(r => setTimeout(r, 300))
      await handleCheckout(priceId, tier)
    }
  }

  const primaryTier: 'basic' | 'advanced' =
    intendedTier ?? (currentTier === 'basic' ? 'advanced' : 'basic')
  const showSecondaryAdvanced = primaryTier === 'basic' && currentTier !== 'advanced'

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) onClose() }}
        >
          <div
            ref={containerRef}
            className="relative w-full max-w-lg rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, rgba(22,16,8,0.98) 0%, rgba(10,8,24,0.99) 100%)',
              border: '1px solid rgba(201,168,76,0.28)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Upgrade your sky"
          >
            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-lg transition-colors z-10"
              style={{ color: 'rgba(201,168,76,0.35)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.75)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.35)')}
              aria-label="Close"
            >
              ×
            </button>

            <div className="px-8 pt-8 pb-10">
              {checkoutState === 'ceremony' ? (
                <CeremonyState />
              ) : (
                <TierPresentation
                  heading={heading}
                  currentTier={currentTier}
                  authenticated={authenticated}
                  resetTime={resetTime}
                  primaryTier={primaryTier}
                  showSecondaryAdvanced={showSecondaryAdvanced}
                  checkoutError={checkoutState === 'error'}
                  onCheckout={handleCheckout}
                  onClose={onClose}
                  firstFocusRef={firstFocusRef}
                />
              )}
            </div>
          </div>
        </div>
      )}

      <AuthModal
        isOpen={authModalOpen}
        onClose={handleAuthComplete}
        initialTab="register"
      />
    </>
  )
}

function CeremonyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-6">
      <div
        className="text-4xl animate-spin"
        style={{ animationDuration: '3s', color: '#c9a84c', filter: 'drop-shadow(0 0 12px rgba(201,168,76,0.5))' }}
        aria-hidden="true"
      >
        ✦
      </div>
      <p
        className="font-heading text-xl text-center"
        style={{ color: 'rgba(201,168,76,0.80)' }}
      >
        Opening your account with the sky.
      </p>
    </div>
  )
}

interface TierPresentationProps {
  heading: string
  currentTier: 'free' | 'basic' | 'advanced'
  authenticated: boolean
  resetTime: string
  primaryTier: 'basic' | 'advanced'
  showSecondaryAdvanced: boolean
  checkoutError: boolean
  onCheckout: (priceId: string, tier: 'basic' | 'advanced') => void
  onClose: () => void
  firstFocusRef: React.RefObject<HTMLButtonElement>
}

function TierPresentation({
  heading,
  currentTier,
  authenticated,
  resetTime,
  primaryTier,
  showSecondaryAdvanced,
  checkoutError,
  onCheckout,
  onClose,
  firstFocusRef,
}: TierPresentationProps) {
  return (
    <>
      {/* Heading */}
      <h2
        className="font-heading text-2xl mb-2 text-center"
        style={{ color: '#c9a84c' }}
      >
        {heading}
      </h2>

      {/* Reset time — shown for authenticated free/basic users not on a feature gate */}
      {authenticated && currentTier !== 'advanced' && (
        <p className="text-center text-xs mb-6" style={{ color: 'rgba(201,168,76,0.45)' }}>
          Your sky resets at {resetTime}.
        </p>
      )}
      {!authenticated && (
        <p className="text-center text-xs mb-6" style={{ color: 'rgba(201,168,76,0.45)' }}>
          Your sky resets at {resetTime}.
        </p>
      )}

      {/* Tier sections */}
      <div className="space-y-4 mb-8">
        <TierSection
          name="Free"
          description="Three readings a day — a morning consultation with the sky. No cost, no card."
          isCurrentTier={currentTier === 'free'}
          price={null}
        />
        <TierSection
          name="Basic"
          description={`Twenty readings a day. Enough to explore every corner of your chart across a full day's reflection.`}
          isCurrentTier={currentTier === 'basic'}
          price={`$${BASIC_PRICE}/month`}
        />
        <TierSection
          name="Advanced"
          description="One hundred readings a day, and a new power that only time can reveal: patterns across your journal and your dreams — what the sky has been building while you were keeping it."
          isCurrentTier={currentTier === 'advanced'}
          price={`$${ADVANCED_PRICE}/month`}
        />
      </div>

      {/* Error note */}
      {checkoutError && (
        <p
          className="text-xs mb-4 px-3 py-2 rounded-lg text-center"
          style={{
            color: 'rgba(220,100,100,0.9)',
            background: 'rgba(220,100,100,0.08)',
            border: '1px solid rgba(220,100,100,0.18)',
          }}
          role="alert"
        >
          Something went wrong — please try again.
        </p>
      )}

      {/* CTAs */}
      <div className="space-y-3">
        {/* Primary CTA */}
        <button
          ref={firstFocusRef}
          type="button"
          onClick={() => {
            const priceId = primaryTier === 'basic' ? BASIC_PRICE_ID : ADVANCED_PRICE_ID
            onCheckout(priceId, primaryTier)
          }}
          className="w-full py-3.5 font-heading text-sm rounded-lg transition-all"
          style={{ background: '#c9a84c', color: '#0f0b05' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,168,76,0.85)')}
          onMouseLeave={e => (e.currentTarget.style.background = '#c9a84c')}
        >
          {primaryTier === 'basic'
            ? `Open Basic — $${BASIC_PRICE}/month`
            : `Open Advanced — $${ADVANCED_PRICE}/month`}
        </button>

        {/* Secondary: Advanced (if primary is Basic) */}
        {showSecondaryAdvanced && (
          <button
            type="button"
            onClick={() => onCheckout(ADVANCED_PRICE_ID, 'advanced')}
            className="w-full py-2.5 text-xs font-heading rounded-lg transition-all"
            style={{
              color: 'rgba(201,168,76,0.6)',
              border: '1px solid rgba(201,168,76,0.2)',
              background: 'transparent',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#c9a84c'
              e.currentTarget.style.borderColor = 'rgba(201,168,76,0.45)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'rgba(201,168,76,0.6)'
              e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)'
            }}
          >
            Or open Advanced — ${ADVANCED_PRICE}/month
          </button>
        )}

        {/* Dismiss */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 text-xs transition-colors text-center"
          style={{ color: 'rgba(201,168,76,0.35)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.6)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.35)')}
        >
          Continue with free — your sky resets at {resetTime}
        </button>
      </div>
    </>
  )
}

interface TierSectionProps {
  name: string
  description: string
  isCurrentTier: boolean
  price: string | null
}

function TierSection({ name, description, isCurrentTier, price }: TierSectionProps) {
  return (
    <div
      className="rounded-xl px-5 py-4"
      style={{
        background: isCurrentTier ? 'rgba(201,168,76,0.06)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isCurrentTier ? 'rgba(201,168,76,0.25)' : 'rgba(201,168,76,0.10)'}`,
      }}
    >
      <div className="flex items-baseline gap-2 mb-1.5">
        <span
          className="font-heading text-base"
          style={{ color: isCurrentTier ? '#c9a84c' : 'rgba(201,168,76,0.65)' }}
        >
          {name}
        </span>
        {price && (
          <span className="text-xs" style={{ color: 'rgba(201,168,76,0.45)' }}>
            {price}
          </span>
        )}
        {isCurrentTier && (
          <span className="text-xs ml-auto" style={{ color: 'rgba(201,168,76,0.4)' }}>
            you are reading on {name.toLowerCase()}
          </span>
        )}
      </div>
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(201,168,76,0.55)' }}>
        {description}
      </p>
    </div>
  )
}
