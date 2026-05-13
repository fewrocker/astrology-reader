import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { fetchWithTimeout, getStoredToken, setStoredToken, clearStoredToken } from '../services/authService'
import type { AuthUser } from '../services/authService'

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  displayName: string
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => void
  showNetworkWarning: boolean
  dismissNetworkWarning: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showNetworkWarning, setShowNetworkWarning] = useState(false)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const storedToken = getStoredToken()
    let cancelled = false

    if (!storedToken) {
      // No JWT — proceed unauthenticated silently, no notification
      setIsLoading(false)
      return
    }

    setToken(storedToken)

    fetchWithTimeout('/api/auth/me', {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then(async res => {
        if (cancelled) return
        if (res.ok) {
          const data = await res.json()
          setUser(data as AuthUser)
        }
        // non-OK (e.g. 401 expired token): silently unauthenticated, no banner
      })
      .catch(() => {
        // Network error or 5-second timeout: user had a token but server unreachable
        if (cancelled) return
        setShowNetworkWarning(true)
        dismissTimerRef.current = setTimeout(() => {
          if (!cancelled) setShowNetworkWarning(false)
        }, 6000)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    }
  }, [])

  function dismissNetworkWarning() {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    setShowNetworkWarning(false)
  }

  async function login(email: string, password: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) throw new Error('Login failed')
    const { token: newToken, user: newUser } = await res.json()
    setStoredToken(newToken)
    setToken(newToken)
    setUser(newUser)
  }

  async function register(email: string, password: string, displayName: string) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName }),
    })
    if (!res.ok) throw new Error('Registration failed')
    const { token: newToken, user: newUser } = await res.json()
    setStoredToken(newToken)
    setToken(newToken)
    setUser(newUser)
  }

  function logout() {
    clearStoredToken()
    setToken(null)
    setUser(null)
  }

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    displayName: user?.displayName ?? user?.email ?? '',
    login,
    register,
    logout,
    showNetworkWarning,
    dismissNetworkWarning,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
