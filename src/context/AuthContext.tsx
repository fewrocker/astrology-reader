import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { AUTH_TOKEN_KEY, getSession, login as apiLogin, register as apiRegister, logout as apiLogout } from '../services/authService'
import type { AuthUser } from '../services/authService'
import { useApp } from './AppContext'

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
}

const AuthContext = createContext<AuthContextType | null>(null)

function titleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
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

  useEffect(() => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY)
    if (!storedToken) {
      setIsLoading(false)
      return
    }

    getSession().then(result => {
      if (result.ok) {
        const { id, email } = result.data
        setUser({ id, email, displayName: deriveDisplayName({ id, email, displayName: '' }, state.birthData.userName) })
        if (result.data.profile?.birthData) {
          dispatch({ type: 'LOAD_BIRTH_DATA_FROM_SERVER', data: result.data.profile.birthData })
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
      setUser({ id: userData.id, email: userData.email, displayName: deriveDisplayName({ id: userData.id, email: userData.email, displayName: '' }, state.birthData.userName) })
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
      setUser({ id: userData.id, email: userData.email, displayName: deriveDisplayName({ id: userData.id, email: userData.email, displayName: '' }, state.birthData.userName) })
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
