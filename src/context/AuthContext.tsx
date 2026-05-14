import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { AUTH_TOKEN_KEY, getSession, getProfile, getUsage, login as apiLogin, register as apiRegister, logout as apiLogout } from '../services/authService'
import { track } from '../services/analytics'
import type { AuthUser, ServerUserProfile } from '../services/authService'
import { saveBirthData } from './appState'
import type { BirthData } from './appState'
import { useApp } from './AppContext'
import {
  detectUnmigratedLocalData,
  hasUnmigratedData,
  hasMigrationBeenOffered,
  type MigrationCandidate,
} from '../services/migrationService'

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  denied: 'You chose not to connect. You can still sign in with email.',
  state_mismatch: 'Something went wrong with the sign-in link. Please try again.',
  exchange_failed: "We couldn't complete the sign-in. Please try again or use email.",
  email_conflict: 'That email address is linked to a different sign-in method. Please use your original sign-in.',
  no_email: 'Your Facebook account does not have a confirmed email address. Please add one to Facebook first, or sign in with email.',
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  displayName: string
  tier: 'free' | 'basic' | 'advanced'
  todayUsed: number
  incrementTodayUsed: () => void
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  register: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
  showNetworkWarning: boolean
  dismissNetworkWarning: () => void
  isMigrationPending: boolean
  migrationCandidate: MigrationCandidate | null
  notifyLoggedIn: (user: AuthUser) => void
  dismissMigration: () => void
  oauthError: string | null
  dismissOauthError: () => void
  paymentWelcomePending: boolean
  dismissPaymentWelcome: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

function titleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

function serverProfileToBirthData(u: ServerUserProfile, existing: BirthData): BirthData | null {
  if (!u.birthDate || !u.birthPlace) return null
  return {
    date: u.birthDate,
    time: u.birthTime ?? '12:00',
    unknownTime: !u.birthTime,
    city: {
      name: u.birthPlace.name,
      lat: u.birthPlace.lat,
      lng: u.birthPlace.lng,
      tz: u.birthPlace.tz,
      country: u.birthPlace.country,
      region: '',
      pop: 0,
    },
    focusAreas: existing.focusAreas,
    userName: u.fullName ?? existing.userName,
  }
}

function deriveDisplayName(user: AuthUser | null, userName?: string): string {
  if (userName) return userName
  if (!user) return ''
  const local = user.email.split('@')[0]
  return titleCase(local)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useApp()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_KEY))
  const [tier, setTier] = useState<'free' | 'basic' | 'advanced'>('free')
  const [isLoading, setIsLoading] = useState(true)
  const [showNetworkWarning, setShowNetworkWarning] = useState(false)
  const [isMigrationPending, setIsMigrationPending] = useState(false)
  const [migrationCandidate, setMigrationCandidate] = useState<MigrationCandidate | null>(null)
  const [oauthError, setOauthError] = useState<string | null>(null)
  const [paymentWelcomePending, setPaymentWelcomePending] = useState(false)
  const [todayUsed, setTodayUsed] = useState(0)

  const incrementTodayUsed = useCallback(() => { setTodayUsed(prev => prev + 1) }, [])

  // After session is restored, fetch today's usage count.
  // todayUsed reflects state at session load — not a real-time counter.
  // If this fetch fails, todayUsed stays at 0 — no error is shown.
  const fetchUsage = useCallback(async () => {
    const result = await getUsage()
    if (result.ok) {
      setTodayUsed(result.data.todayUsed)
    }
    // On failure: silently keep todayUsed at 0
  }, [])

  const applySessionResult = useCallback((profile: ServerUserProfile) => {
    const { id, email, subscriptionTier } = profile
    const t = (subscriptionTier ?? 'free') as 'free' | 'basic' | 'advanced'
    setUser({ id, email, displayName: deriveDisplayName({ id, email, displayName: '', tier: t }, state.birthData.userName), tier: t })
    setTier(t)
    const birthData = serverProfileToBirthData(profile, state.birthData)
    if (birthData) {
      dispatch({ type: 'LOAD_BIRTH_DATA_FROM_SERVER', data: birthData })
      saveBirthData(birthData)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Handle OAuth JWT handoff and error parameters first
    const params = new URLSearchParams(window.location.search)
    const oauthToken = params.get('token')
    const oauthErrorCode = params.get('oauth_error')

    if (oauthErrorCode) {
      // Clean the URL immediately
      history.replaceState(null, '', window.location.pathname)
      const message = OAUTH_ERROR_MESSAGES[oauthErrorCode] ?? "Something went wrong with sign-in. Please try again."
      setOauthError(message)
      setIsLoading(false)
      return
    }

    if (oauthToken) {
      // Write token to localStorage and clean the URL so it doesn't linger
      // in browser history, referrer headers, or analytics
      localStorage.setItem(AUTH_TOKEN_KEY, oauthToken)
      setToken(oauthToken)
      history.replaceState(null, '', window.location.pathname)
      // Fall through to normal session check — it will now find the token
    }

    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY)
    if (!storedToken) {
      setIsLoading(false)
      return
    }

    // Detect Stripe payment return — must happen before session fetch
    // so the forced re-fetch gets the newly-elevated tier from the server.
    const isPaymentReturn = params.get('payment') === 'success'
    if (isPaymentReturn) {
      window.history.replaceState(null, '', window.location.pathname)
    }

    getSession().then(async result => {
      if (result.ok) {
        applySessionResult(result.data.user)
        if (isPaymentReturn) {
          setPaymentWelcomePending(true)
        }
        // Fetch usage count after session restore
        await fetchUsage()
      } else {
        if (result.error === 'offline') {
          setShowNetworkWarning(true)
        }
        localStorage.removeItem(AUTH_TOKEN_KEY)
        setToken(null)
        setUser(null)
      }
      setIsLoading(false)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const refreshSession = useCallback(async (): Promise<void> => {
    const result = await getSession()
    if (result.ok) {
      applySessionResult(result.data.user)
    }
  }, [applySessionResult])

  const displayName = deriveDisplayName(user, state.birthData.userName)

  const login = useCallback(async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    const result = await apiLogin(email, password)
    if (result.ok) {
      const { token: jwt, user: userData } = result.data
      localStorage.setItem(AUTH_TOKEN_KEY, jwt)
      setToken(jwt)
      const userTier = (userData.subscriptionTier ?? 'free') as 'free' | 'basic' | 'advanced'
      const loggedInUser: AuthUser = {
        id: userData.id,
        email: userData.email,
        displayName: deriveDisplayName({ id: userData.id, email: userData.email, displayName: '', tier: userTier }, state.birthData.userName),
        tier: userTier,
      }
      setUser(loggedInUser)
      setTier(userTier)
      track('login_completed', { method: 'email' })
      // Load birth data from server profile after login
      const profileResult = await getProfile()
      if (profileResult.ok) {
        const birthData = serverProfileToBirthData(profileResult.data, state.birthData)
        if (birthData) {
          dispatch({ type: 'LOAD_BIRTH_DATA_FROM_SERVER', data: birthData })
          saveBirthData(birthData)
        }
      }
      // Fetch today's usage
      await fetchUsage()
      return { ok: true }
    }
    if (result.error === 'unauthorized') return { ok: false, error: 'Invalid email or password.' }
    if (result.error === 'offline') return { ok: false, error: 'Could not reach the server. Check your connection.' }
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }, [state.birthData.userName, fetchUsage]) // eslint-disable-line react-hooks/exhaustive-deps

  const register = useCallback(async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    const result = await apiRegister(email, password)
    if (result.ok) {
      const { token: jwt, user: userData } = result.data
      localStorage.setItem(AUTH_TOKEN_KEY, jwt)
      setToken(jwt)
      const userTier = (userData.subscriptionTier ?? 'free') as 'free' | 'basic' | 'advanced'
      const loggedInUser: AuthUser = {
        id: userData.id,
        email: userData.email,
        displayName: deriveDisplayName({ id: userData.id, email: userData.email, displayName: '', tier: userTier }, state.birthData.userName),
        tier: userTier,
      }
      setUser(loggedInUser)
      track('signup_completed', { method: 'email' })
      // Set sessionStorage flag so HomeScreen shows the first-visit welcome sentence once
      sessionStorage.setItem('just-registered', 'true')
      // Load birth data from server profile after registration (matches pattern in login())
      const profileResult = await getProfile()
      if (profileResult.ok) {
        const birthData = serverProfileToBirthData(profileResult.data, state.birthData)
        if (birthData) {
          dispatch({ type: 'LOAD_BIRTH_DATA_FROM_SERVER', data: birthData })
          saveBirthData(birthData)
        }
      }
      // Spec 11 — fetch today's usage after registration, matching the pattern in login().
      // For a new account this returns todayUsed: 0 (matching initial useState(0)), making
      // this a no-op on the happy path while ensuring structural consistency with login().
      await fetchUsage()
      return { ok: true }
    }
    if (result.error === 'offline') return { ok: false, error: 'Could not reach the server. Check your connection.' }
    if (result.error === 'server-error' && result.status === 409) return { ok: false, error: 'An account with this email already exists.' }
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }, [state.birthData.userName, fetchUsage]) // eslint-disable-line react-hooks/exhaustive-deps

  const logout = useCallback(async () => {
    await apiLogout()
    localStorage.removeItem(AUTH_TOKEN_KEY)
    setToken(null)
    setUser(null)
    setTier('free')
    setTodayUsed(0)
  }, [])

  // Spec 11 — incrementTodayUsed is a stable useCallback (empty deps) so App.tsx can call
  // it from useEffect bodies without triggering unnecessary re-renders.
  const incrementTodayUsed = useCallback(() => {
    setTodayUsed(prev => prev + 1)
  }, [])

  const dismissNetworkWarning = useCallback(() => setShowNetworkWarning(false), [])

  const notifyLoggedIn = useCallback((loggedInUser: AuthUser) => {
    setUser(loggedInUser)
    if (hasMigrationBeenOffered()) return
    if (!hasUnmigratedData()) return
    const candidate = detectUnmigratedLocalData()
    if (candidate.journalCount === 0 && candidate.dreamCount === 0 && !candidate.hasBirthData) return
    setMigrationCandidate(candidate)
    setIsMigrationPending(true)
  }, [])

  const dismissMigration = useCallback(() => {
    setIsMigrationPending(false)
    setMigrationCandidate(null)
  }, [])

  const dismissOauthError = useCallback(() => setOauthError(null), [])

  const incrementTodayUsed = useCallback(() => setTodayUsed(prev => prev + 1), [])

  const dismissPaymentWelcome = useCallback(() => {
    setPaymentWelcomePending(false)
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      isAuthenticated: user !== null,
      displayName,
      tier,
      todayUsed,
      incrementTodayUsed,
      login,
      register,
      logout,
      refreshSession,
      showNetworkWarning,
      dismissNetworkWarning,
      isMigrationPending,
      migrationCandidate,
      notifyLoggedIn,
      dismissMigration,
      oauthError,
      dismissOauthError,
      paymentWelcomePending,
      dismissPaymentWelcome,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
