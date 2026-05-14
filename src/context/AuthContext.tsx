import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { AUTH_TOKEN_KEY, getSession, getProfile, login as apiLogin, register as apiRegister, logout as apiLogout } from '../services/authService'
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

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  displayName: string
  tier: 'free' | 'basic' | 'advanced'
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
  const [paymentWelcomePending, setPaymentWelcomePending] = useState(false)

  const applySessionResult = useCallback((profile: ServerUserProfile) => {
    const { id, email, subscriptionTier } = profile
    setUser({ id, email, displayName: deriveDisplayName({ id, email, displayName: '' }, state.birthData.userName) })
    const t = subscriptionTier ?? 'free'
    setTier(t)
    const birthData = serverProfileToBirthData(profile, state.birthData)
    if (birthData) {
      dispatch({ type: 'LOAD_BIRTH_DATA_FROM_SERVER', data: birthData })
      saveBirthData(birthData)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY)
    if (!storedToken) {
      setIsLoading(false)
      return
    }

    // Detect Stripe payment return — must happen before session fetch
    // so the forced re-fetch gets the newly-elevated tier from the server.
    const params = new URLSearchParams(window.location.search)
    const isPaymentReturn = params.get('payment') === 'success'
    if (isPaymentReturn) {
      window.history.replaceState(null, '', window.location.pathname)
    }

    getSession().then(result => {
      if (result.ok) {
        applySessionResult(result.data.user)
        if (isPaymentReturn) {
          setPaymentWelcomePending(true)
        }
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
      const loggedInUser = { id: userData.id, email: userData.email, displayName: deriveDisplayName({ id: userData.id, email: userData.email, displayName: '' }, state.birthData.userName) }
      setUser(loggedInUser)
      // Load birth data from server profile after login
      const profileResult = await getProfile()
      if (profileResult.ok) {
        const birthData = serverProfileToBirthData(profileResult.data, state.birthData)
        if (birthData) {
          dispatch({ type: 'LOAD_BIRTH_DATA_FROM_SERVER', data: birthData })
          saveBirthData(birthData)
        }
      }
      return { ok: true }
    }
    if (result.error === 'unauthorized') return { ok: false, error: 'Invalid email or password.' }
    if (result.error === 'offline') return { ok: false, error: 'Could not reach the server. Check your connection.' }
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }, [state.birthData.userName]) // eslint-disable-line react-hooks/exhaustive-deps

  const register = useCallback(async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    const result = await apiRegister(email, password)
    if (result.ok) {
      const { token: jwt, user: userData } = result.data
      localStorage.setItem(AUTH_TOKEN_KEY, jwt)
      setToken(jwt)
      const loggedInUser = { id: userData.id, email: userData.email, displayName: deriveDisplayName({ id: userData.id, email: userData.email, displayName: '' }, state.birthData.userName) }
      setUser(loggedInUser)
      return { ok: true }
    }
    if (result.error === 'offline') return { ok: false, error: 'Could not reach the server. Check your connection.' }
    if (result.error === 'server-error' && result.status === 409) return { ok: false, error: 'An account with this email already exists.' }
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }, [state.birthData.userName]) // eslint-disable-line react-hooks/exhaustive-deps

  const logout = useCallback(async () => {
    await apiLogout()
    localStorage.removeItem(AUTH_TOKEN_KEY)
    setToken(null)
    setUser(null)
    setTier('free')
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
