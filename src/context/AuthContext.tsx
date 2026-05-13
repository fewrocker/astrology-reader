import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'

export interface AuthUser {
  id: number
  email: string
}

export interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  displayName: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>
  register: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>
  logout: () => Promise<void>
}

const defaultValue: AuthContextValue = {
  user: null,
  token: null,
  displayName: null,
  isAuthenticated: false,
  isLoading: false,
  login: async () => ({ ok: false as const, error: 'Not implemented' }),
  register: async () => ({ ok: false as const, error: 'Not implemented' }),
  logout: async () => {},
}

export const AuthContext = createContext<AuthContextValue>(defaultValue)

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}

// Stub provider — task 0005 replaces this with the real implementation
export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthContext.Provider value={defaultValue}>{children}</AuthContext.Provider>
}
