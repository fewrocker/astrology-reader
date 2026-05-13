import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import {
  detectUnmigratedLocalData,
  hasUnmigratedData,
  hasMigrationBeenOffered,
  type MigrationCandidate,
} from '../services/migrationService'

export interface AuthUser {
  id: string
  email: string
}

interface AuthContextValue {
  user: AuthUser | null
  isMigrationPending: boolean
  migrationCandidate: MigrationCandidate | null
  /** Call after a successful login or register response to trigger migration detection. */
  notifyLoggedIn: (user: AuthUser) => void
  /** Call when the user completes or skips migration. */
  dismissMigration: () => void
  setUser: (user: AuthUser | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isMigrationPending, setIsMigrationPending] = useState(false)
  const [migrationCandidate, setMigrationCandidate] = useState<MigrationCandidate | null>(null)

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
      isMigrationPending,
      migrationCandidate,
      notifyLoggedIn,
      dismissMigration,
      setUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
