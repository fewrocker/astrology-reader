import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: 'login' | 'register'
}

export default function AuthModal({ isOpen, onClose, initialTab = 'login' }: AuthModalProps) {
  const { login, register } = useAuth()
  const [tab, setTab] = useState<'login' | 'register'>(initialTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [forgotShown, setForgotShown] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab)
      setEmail('')
      setPassword('')
      setError('')
      setForgotShown(false)
      setShowPassword(false)
      setTimeout(() => emailRef.current?.focus(), 50)
    }
  }, [isOpen, initialTab])

  useEffect(() => {
    setError('')
    setForgotShown(false)
  }, [tab])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
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
          onClick={onClose}
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
              onClick={() => setTab(t)}
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
                    onClick={() => setTab('register')}
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
                    onClick={() => setTab('login')}
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
