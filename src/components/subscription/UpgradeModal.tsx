import { useCallback, useEffect, useRef, useState } from 'react'
import AuthModal from '../auth/AuthModal'
import { track } from '../../services/analytics'

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
    return "You've had three readings today — that's a good beginning."
  }
  if (currentTier === 'free') {
    return "You've read your sky for today."
  }
  if (currentTier === 'basic') {
    return "You've explored the full sky today."
  }
  return "You've read your sky for today."
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
  const [checkoutState, setCheckoutState] = useState<'idle' | 'ceremony' | 'error'>('idle')
  const firstFocusRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const ceremonyStartedAtRef = useRef<number>(0)
  const pendingTierAfterAuth = useRef<{ tier: 'basic' | 'advanced'; priceId: string } | null>(null)

  // Spec 5 — handleDismiss wraps onClose with upgrade_dismissed tracking.
  // The checkoutState property captures whether the user dismissed during an error
  // (tried and failed) vs at idle (decided not to upgrade) — qualitatively different signals.
  // Defined before the keyboard useEffect so the handler closure can reference it.
  const handleDismiss = useCallback(() => {
    track('upgrade_dismissed', {
      currentTier,
      authenticated,
      intendedTier: intendedTier ?? null,
      checkoutState,
    })
    onClose()
  }, [currentTier, authenticated, intendedTier, checkoutState, onClose])

  useEffect(() => {
    if (isOpen) {
      setCheckoutState('idle')
      setTimeout(() => firstFocusRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Spec 1 — fire upgrade_modal_seen when modal opens.
  // Separate from the reset effect above so the analytics call is never coupled
  // to focus management. The heading property is the exact string shown, which
  // enables future copy-experiment attribution without a new deploy.
  useEffect(() => {
    if (!isOpen) return
    track('upgrade_modal_seen', {
      currentTier,
      authenticated,
      intendedTier: intendedTier ?? null,
      heading: getHeading(currentTier, authenticated, intendedTier),
    })
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      // Spec 5 — Escape key calls handleDismiss so the dismissal is tracked.
      if (e.key === 'Escape') handleDismiss()
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
  }, [isOpen, handleDismiss])

  const runCheckoutSession = useCallback(async (priceId: string, tier: 'basic' | 'advanced') => {
    const start = Date.now()
    ceremonyStartedAtRef.current = start
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
        // Spec 4 — upgrade_checkout_failed with reason 'server_error' (non-2xx response).
        // Fires before the ceremony wait so the event is not suppressed by the timer.
        track('upgrade_checkout_failed', { tier, currentTier, authenticated, reason: 'server_error' })
        await new Promise(r => setTimeout(r, remaining))
        setCheckoutState('error')
        return
      }

      const data = await res.json() as { url?: string }
      if (!data.url) {
        // Spec 4 — upgrade_checkout_failed with reason 'no_url' (2xx but no url in body).
        track('upgrade_checkout_failed', { tier, currentTier, authenticated, reason: 'no_url' })
        await new Promise(r => setTimeout(r, remaining))
        setCheckoutState('error')
        return
      }

      // Spec 3 — upgrade_checkout_started fires after data.url is confirmed, before redirect.
      // This event represents a Stripe session successfully created.
      track('upgrade_checkout_started', { tier, currentTier, authenticated })

      // Hold for ceremony minimum (2s), cap at 4s total
      const waitMs = Math.max(remaining, 0)
      await new Promise(r => setTimeout(r, waitMs))
      window.location.href = data.url
    } catch {
      // Spec 4 — upgrade_checkout_failed with reason 'network_error' (fetch threw).
      track('upgrade_checkout_failed', { tier, currentTier, authenticated, reason: 'network_error' })
      const elapsed = Date.now() - ceremonyStartedAtRef.current
      await new Promise(r => setTimeout(r, Math.max(0, 2000 - elapsed)))
      setCheckoutState('error')
    }
  }, [])

  const handleCheckout = async (priceId: string, tier: 'basic' | 'advanced') => {
    // Spec 2 — upgrade_cta_clicked fires as the FIRST statement, before any auth guard.
    // This ensures the event fires even for unauthenticated users who are redirected to
    // the auth flow, not just for users who proceed directly to Stripe.
    track('upgrade_cta_clicked', {
      tier,
      currentTier,
      authenticated,
      intendedTier: intendedTier ?? null,
    })

    if (!authenticated) {
      pendingTierAfterAuth.current = { tier, priceId }
      setAuthModalOpen(true)
      return
    }
    await runCheckoutSession(priceId, tier)
  }

  const handleAuthComplete = () => {
    setAuthModalOpen(false)
    // pendingTierAfterAuth.current holds { tier, priceId } — useEffect below picks it up
  }

  // After auth completes, authenticated prop will update to true on next render.
  // If pendingTierAfterAuth.current is set, trigger the checkout in the React render cycle
  // where the authenticated prop is guaranteed to be fresh — no stale closure risk.
  const authenticatedRef = useRef(authenticated)
  useEffect(() => {
    authenticatedRef.current = authenticated
  }, [authenticated])

  useEffect(() => {
    if (authenticated && pendingTierAfterAuth.current && !authModalOpen) {
      const { priceId, tier } = pendingTierAfterAuth.current
      pendingTierAfterAuth.current = null
      void runCheckoutSession(priceId, tier)
    }
  }, [authenticated, authModalOpen, runCheckoutSession])

  if (!isOpen && !authModalOpen) return null

  const heading = getHeading(currentTier, authenticated, intendedTier)
  const resetTime = formatResetAt(resetAt)

  const primaryTier: 'basic' | 'advanced' =
    intendedTier ?? (currentTier === 'basic' ? 'advanced' : 'basic')
  const showSecondaryAdvanced = primaryTier === 'basic' && currentTier !== 'advanced'

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) handleDismiss() }}
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
            {/* Close — Spec 5: calls handleDismiss instead of onClose directly */}
            <button
              type="button"
              onClick={handleDismiss}
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
                  onDismiss={handleDismiss}
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
  onDismiss: () => void
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
  onDismiss,
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
          description="Every feature — natal chart, transits, synastry, solar return, journal, and dreams — is available on every plan. Basic adds twenty readings per day, enough to explore your chart from multiple angles."
          isCurrentTier={currentTier === 'basic'}
          price={`$${BASIC_PRICE}/month`}
        />
        <TierSection
          name="Advanced"
          description="Every feature — natal chart, transits, synastry, solar return, journal, and dreams — is available on every plan. Advanced gives you a hundred readings per day — the depth for an astrologer's practice or a season of intensive inquiry."
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

        {/* Dismiss — Spec 5: calls onDismiss (wraps onClose with analytics) */}
        <button
          type="button"
          onClick={onDismiss}
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
