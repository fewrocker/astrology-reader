import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { track } from '../../services/analytics'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: 'login' | 'register'
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#1877F2" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.791-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
    </svg>
  )
}

export default function AuthModal({ isOpen, onClose, initialTab = 'login' }: AuthModalProps) {
  const { login, register, oauthError, dismissOauthError } = useAuth()
  const [tab, setTab] = useState<'login' | 'register'>(initialTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [forgotShown, setForgotShown] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  // Auto-open and display OAuth error if one arrived via redirect
  useEffect(() => {
    if (oauthError && !isOpen) {
      // The parent should open the modal; we surface the error when it's open
    }
  }, [oauthError, isOpen])

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab)
      setEmail('')
      setPassword('')
      setError('')
      setForgotShown(false)
      setShowPassword(false)
      setTimeout(() => emailRef.current?.focus(), 50)
      // Spec 6 — auth_modal_seen fires once per modal open.
      // initialTab distinguishes upgrade flow (opens at 'register') from direct sign-in ('login').
      track('auth_modal_seen', { initialTab })
    }
  }, [isOpen, initialTab])

  useEffect(() => {
    setError('')
    setForgotShown(false)
  }, [tab])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismissOauthError()
        onClose()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose, dismissOauthError])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (tab === 'register' && password.length < 12) {
      setError('Password must be at least 12 characters.')
      return
    }
    setSubmitting(true)
    const result = tab === 'login'
      ? await login(email, password)
      : await register(email, password)
    setSubmitting(false)
    if (result.ok) {
      onClose()
    } else {
      setError(result.error ?? 'Something went wrong.')
    }
  }

  const handleClose = () => {
    // Spec 7 — auth_modal_dismissed fires only when the modal closes WITHOUT successful auth.
    // Successful auth calls onClose() directly from handleSubmit, not via handleClose.
    track('auth_modal_dismissed', { tab })
    dismissOauthError()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, rgba(22,16,8,0.98) 0%, rgba(15,11,5,0.99) 100%)',
          border: '1px solid rgba(201,168,76,0.3)',
          boxShadow: '0 0 48px rgba(201,168,76,0.08), 0 24px 64px rgba(0,0,0,0.7)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={tab === 'login' ? 'Sign in' : 'Create account'}
      >
        {/* Close */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-lg transition-colors z-10"
          style={{ color: 'rgba(201,168,76,0.35)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.75)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.35)')}
          aria-label="Close"
        >
          ×
        </button>

        {/* Tab switcher */}
        <div className="flex border-b" style={{ borderColor: 'rgba(201,168,76,0.15)' }}>
          {(['login', 'register'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => {
                // Spec 8 — auth_tab_switched fires only when switching to a different tab.
                if (t !== tab) track('auth_tab_switched', { from: tab, to: t })
                setTab(t)
              }}
              className="flex-1 py-4 text-xs uppercase tracking-widest font-heading transition-colors"
              style={{
                color: tab === t ? '#c9a84c' : 'rgba(201,168,76,0.35)',
                borderBottom: tab === t ? '2px solid #c9a84c' : '2px solid transparent',
                background: 'transparent',
              }}
            >
              {t === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <div className="px-8 pt-8 pb-10">
          {/* Heading */}
          <h2
            className="font-heading text-3xl mb-8 text-center"
            style={{ color: '#c9a84c' }}
          >
            {tab === 'login' ? 'Return ✦' : 'Open Your Account ✦'}
          </h2>

          {/* OAuth error */}
          {oauthError && (
            <p
              className="text-xs mb-5 px-3 py-2 rounded-lg"
              style={{
                color: 'rgba(220,100,100,0.9)',
                background: 'rgba(220,100,100,0.08)',
                border: '1px solid rgba(220,100,100,0.18)',
              }}
              role="alert"
            >
              {oauthError}
            </p>
          )}

          {/* OAuth buttons */}
          <a
            href="/api/auth/google"
            className="flex items-center justify-center gap-3 w-full py-3 rounded-lg text-sm transition-all mb-3"
            style={{
              background: 'rgba(201,168,76,0.06)',
              border: '1px solid rgba(201,168,76,0.18)',
              color: '#e8dcc8',
              textDecoration: 'none',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.40)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.18)')}
          >
            <GoogleIcon />
            Continue with Google
          </a>

          <a
            href="/api/auth/facebook"
            className="flex items-center justify-center gap-3 w-full py-3 rounded-lg text-sm transition-all mb-3"
            style={{
              background: 'rgba(201,168,76,0.06)',
              border: '1px solid rgba(201,168,76,0.18)',
              color: '#e8dcc8',
              textDecoration: 'none',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.40)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.18)')}
          >
            <FacebookIcon />
            Continue with Facebook
          </a>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(201,168,76,0.12)' }} />
            <span className="text-xs" style={{ color: 'rgba(201,168,76,0.30)' }}>✦</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(201,168,76,0.12)' }} />
          </div>
          <p className="text-xs text-center mb-5" style={{ color: 'rgba(201,168,76,0.30)' }}>
            or arrive another way
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="mb-5">
              <label
                htmlFor="auth-email"
                className="block text-xs uppercase tracking-widest mb-2"
                style={{ color: 'rgba(201,168,76,0.6)' }}
              >
                Email
              </label>
              <input
                ref={emailRef}
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-colors"
                style={{
                  background: 'rgba(201,168,76,0.06)',
                  border: '1px solid rgba(201,168,76,0.22)',
                  color: '#e8dcc8',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#c9a84c')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.22)')}
              />
            </div>

            {/* Password */}
            <div className="mb-2">
              <label
                htmlFor="auth-password"
                className="block text-xs uppercase tracking-widest mb-2"
                style={{ color: 'rgba(201,168,76,0.6)' }}
              >
                a word only you know
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-11 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    background: 'rgba(201,168,76,0.06)',
                    border: '1px solid rgba(201,168,76,0.22)',
                    color: '#e8dcc8',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#c9a84c')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.22)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm transition-colors"
                  style={{ color: 'rgba(201,168,76,0.4)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.8)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.4)')}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
              {tab === 'register' && (
                <p className="mt-1.5 text-xs" style={{ color: 'rgba(201,168,76,0.4)' }}>
                  Minimum 12 characters
                </p>
              )}
            </div>

            {/* Forgot password */}
            {tab === 'login' && (
              <div className="mb-5 text-right">
                {forgotShown ? (
                  <p className="text-xs" style={{ color: 'rgba(201,168,76,0.45)' }}>
                    Password reset isn't available yet — reach out directly if you're locked out.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setForgotShown(true)}
                    className="text-xs transition-colors"
                    style={{ color: 'rgba(201,168,76,0.4)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.7)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.4)')}
                  >
                    Forgot your password?
                  </button>
                )}
              </div>
            )}

            {tab === 'register' && <div className="mb-5" />}

            {/* Error */}
            {error && (
              <p
                className="text-xs mb-5 px-3 py-2 rounded-lg"
                style={{
                  color: 'rgba(220,100,100,0.9)',
                  background: 'rgba(220,100,100,0.08)',
                  border: '1px solid rgba(220,100,100,0.18)',
                }}
                role="alert"
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !email || !password}
              className="w-full py-3.5 font-heading text-sm rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: submitting ? 'rgba(201,168,76,0.5)' : '#c9a84c',
                color: '#0f0b05',
              }}
            >
              {submitting ? '...' : tab === 'login' ? 'Enter ✦' : 'Begin ✦'}
            </button>

            {/* Switch tab hint */}
            <p className="mt-5 text-center text-xs" style={{ color: 'rgba(201,168,76,0.35)' }}>
              {tab === 'login' ? (
                <>
                  New here?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      // Spec 8 — auth_tab_switched from login to register via hint link
                      track('auth_tab_switched', { from: 'login', to: 'register' })
                      setTab('register')
                    }}
                    className="transition-colors underline underline-offset-2"
                    style={{ color: 'rgba(201,168,76,0.55)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.85)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.55)')}
                  >
                    Open your account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      // Spec 8 — auth_tab_switched from register to login via hint link
                      track('auth_tab_switched', { from: 'register', to: 'login' })
                      setTab('login')
                    }}
                    className="transition-colors underline underline-offset-2"
                    style={{ color: 'rgba(201,168,76,0.55)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.85)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.55)')}
                  >
                    Return
                  </button>
                </>
              )}
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
