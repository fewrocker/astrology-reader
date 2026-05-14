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
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  register: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
  showNetworkWarning: boolean
  dismissNetworkWarning: () => void
  isMigrationPending: boolean
  migrationCandidate: MigrationCandidate | null
  notifyLoggedIn: (user: AuthUser) => void
  dismissMigration: () => void
  oauthError: string | null
  dismissOauthError: () => void
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
  const [oauthError, setOauthError] = useState<string | null>(null)

  useEffect(() => {
    // Handle OAuth JWT handoff and error parameters
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

    getSession().then(result => {
      if (result.ok) {
        const { id, email } = result.data.user
        setUser({ id, email, displayName: deriveDisplayName({ id, email, displayName: '' }, state.birthData.userName) })
        const birthData = serverProfileToBirthData(result.data.user, state.birthData)
        if (birthData) {
          dispatch({ type: 'LOAD_BIRTH_DATA_FROM_SERVER', data: birthData })
          saveBirthData(birthData)
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
  }, [state.birthData.userName])

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
  }, [state.birthData.userName])

  const logout = useCallback(async () => {
    await apiLogout()
    localStorage.removeItem(AUTH_TOKEN_KEY)
    setToken(null)
    setUser(null)
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

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      isAuthenticated: user !== null,
      displayName,
      login,
      register,
      logout,
      showNetworkWarning,
      dismissNetworkWarning,
      isMigrationPending,
      migrationCandidate,
      notifyLoggedIn,
      dismissMigration,
      oauthError,
      dismissOauthError,
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
