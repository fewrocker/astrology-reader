import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { AUTH_TOKEN_KEY, getSession, getProfile, getUsage, login as apiLogin, register as apiRegister, logout as apiLogout } from '../services/authService'
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
  todayUsed: number
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  register: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
  showNetworkWarning: boolean
  dismissNetworkWarning: () => void
  isMigrationPending: boolean
  migrationCandidate: MigrationCandidate | null
  notifyLoggedIn: (user: AuthUser) => void
  dismissMigration: () => void
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
  const [isLoading, setIsLoading] = useState(true)
  const [showNetworkWarning, setShowNetworkWarning] = useState(false)
  const [isMigrationPending, setIsMigrationPending] = useState(false)
  const [migrationCandidate, setMigrationCandidate] = useState<MigrationCandidate | null>(null)
  const [todayUsed, setTodayUsed] = useState(0)

  // After session is restored, fetch today's usage count.
  // todayUsed reflects state at session load — not a real-time counter (spec §51).
  // If this fetch fails, todayUsed stays at 0 — no error is shown (spec §52).
  const fetchUsage = useCallback(async () => {
    const result = await getUsage()
    if (result.ok) {
      setTodayUsed(result.data.todayUsed)
    }
    // On failure: silently keep todayUsed at 0
  }, [])

  useEffect(() => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY)
    if (!storedToken) {
      setIsLoading(false)
      return
    }

    // Check for payment=success query param — force session re-fetch to pick up
    // tier change from Stripe checkout (spec §31).
    const searchParams = new URLSearchParams(window.location.search)
    const paymentSuccess = searchParams.get('payment') === 'success'

    getSession().then(async result => {
      if (result.ok) {
        const { id, email, subscriptionTier } = result.data.user
        const tier = subscriptionTier ?? 'free'
        setUser({ id, email, displayName: deriveDisplayName({ id, email, displayName: '', tier }, state.birthData.userName), tier })
        const birthData = serverProfileToBirthData(result.data.user, state.birthData)
        if (birthData) {
          dispatch({ type: 'LOAD_BIRTH_DATA_FROM_SERVER', data: birthData })
          saveBirthData(birthData)
        }
        // Fetch usage count after session restore
        await fetchUsage()
        // Clean up payment=success from URL
        if (paymentSuccess) {
          window.history.replaceState({}, '', window.location.pathname)
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

  const displayName = deriveDisplayName(user, state.birthData.userName)
  // Derive tier from authenticated user; default to 'free' when unauthenticated (spec §28)
  const tier = user?.tier ?? 'free'

  const login = useCallback(async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    const result = await apiLogin(email, password)
    if (result.ok) {
      const { token: jwt, user: userData } = result.data
      localStorage.setItem(AUTH_TOKEN_KEY, jwt)
      setToken(jwt)
      const userTier = userData.subscriptionTier ?? 'free'
      const loggedInUser: AuthUser = {
        id: userData.id,
        email: userData.email,
        displayName: deriveDisplayName({ id: userData.id, email: userData.email, displayName: '', tier: userTier }, state.birthData.userName),
        tier: userTier,
      }
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
      // Fetch today's usage
      await fetchUsage()
      return { ok: true }
    }
    if (result.error === 'unauthorized') return { ok: false, error: 'Invalid email or password.' }
    if (result.error === 'offline') return { ok: false, error: 'Could not reach the server. Check your connection.' }
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }, [state.birthData.userName, fetchUsage])

  const register = useCallback(async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    const result = await apiRegister(email, password)
    if (result.ok) {
      const { token: jwt, user: userData } = result.data
      localStorage.setItem(AUTH_TOKEN_KEY, jwt)
      setToken(jwt)
      const userTier = userData.subscriptionTier ?? 'free'
      const loggedInUser: AuthUser = {
        id: userData.id,
        email: userData.email,
        displayName: deriveDisplayName({ id: userData.id, email: userData.email, displayName: '', tier: userTier }, state.birthData.userName),
        tier: userTier,
      }
      setUser(loggedInUser)
      // Set sessionStorage flag so HomeScreen shows the first-visit welcome sentence once
      sessionStorage.setItem('just-registered', 'true')
      return { ok: true }
    }
    if (result.error === 'offline') return { ok: false, error: 'Could not reach the server. Check your connection.' }
    if (result.error === 'server-error' && result.status === 409) return { ok: false, error: 'An account with this email already exists.' }
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }, [state.birthData.userName])

  const logout = useCallback(async () => {
    await apiLogout()
    localStorage.removeItem(AUTH_TOKEN_KEY)
    setToken(null)
    setUser(null)
    setTodayUsed(0)
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

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      isAuthenticated: user !== null,
      displayName,
      tier,
      todayUsed,
      login,
      register,
      logout,
      showNetworkWarning,
      dismissNetworkWarning,
      isMigrationPending,
      migrationCandidate,
      notifyLoggedIn,
      dismissMigration,
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
