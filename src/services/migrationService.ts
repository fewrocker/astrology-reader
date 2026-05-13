import { DREAM_SESSION_KEY_PREFIX } from '../context/appState'
import { JOURNAL_STORAGE_KEY, normalizeDreamRef } from '../components/journal/types'
import type { JournalEntry, DreamRef } from '../components/journal/types'
import type { BirthData } from '../context/appState'
import { AUTH_TOKEN_KEY } from './authService'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface SkyContext {
  moonSign: string
  moonPhase: string
  moonElongation: number
  transits?: Array<{ transitPlanet: string; aspect: string; natalPlanet: string; orb: number }>
}

interface DreamSession {
  messages: ChatMessage[]
  dreamContext: string
  dreamInput: string
  skyContext?: SkyContext
  _serverId?: string
  _pendingServerId?: string
}

export interface LocalDataSummary {
  journalEntries: JournalEntry[]
  dreamSessions: Array<{ key: string; date: string; session: DreamSession }>
  hasBirthData: boolean
  birthData: BirthData | null
}

export interface MigrationCandidate {
  journalCount: number
  dreamCount: number
  hasBirthData: boolean
}

export interface MigrationResult {
  success: boolean
  migratedCount: number
  error?: 'network' | 'server'
}

const MIGRATION_OFFERED_KEY = 'astral-migration-offered'
const MIGRATION_DECLINED_KEY = 'astral-migration-declined'
const FETCH_TIMEOUT_MS = 15_000

export function detectLocalData(): LocalDataSummary {
  const journalEntries: JournalEntry[] = []
  try {
    const raw = localStorage.getItem(JOURNAL_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Array<Record<string, unknown>>
      for (const e of parsed) {
        if (e._serverId) continue
        journalEntries.push({
          ...e,
          dreamRef: normalizeDreamRef(e.dreamRef),
        } as JournalEntry)
      }
    }
  } catch { /* ignore malformed */ }

  const dreamSessions: Array<{ key: string; date: string; session: DreamSession }> = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith(DREAM_SESSION_KEY_PREFIX)) continue
      try {
        const raw = localStorage.getItem(key)
        if (!raw) continue
        const session = JSON.parse(raw) as DreamSession
        if (session._serverId) continue
        if (!session.messages || session.messages.length === 0) continue
        const date = key.slice(DREAM_SESSION_KEY_PREFIX.length)
        dreamSessions.push({ key, date, session })
      } catch { /* skip malformed session */ }
    }
  } catch { /* ignore */ }

  let birthData: BirthData | null = null
  let hasBirthData = false
  try {
    const raw = localStorage.getItem('astral-chart-birth-data')
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BirthData>
      if (parsed.date && parsed.city) {
        birthData = parsed as BirthData
        hasBirthData = true
      }
    }
  } catch { /* ignore */ }

  return { journalEntries, dreamSessions, hasBirthData, birthData }
}

export function detectUnmigratedLocalData(): MigrationCandidate {
  const data = detectLocalData()
  return {
    journalCount: data.journalEntries.length,
    dreamCount: data.dreamSessions.length,
    hasBirthData: data.hasBirthData,
  }
}

export function hasUnmigratedData(): boolean {
  const c = detectUnmigratedLocalData()
  return c.journalCount > 0 || c.dreamCount > 0 || c.hasBirthData
}

export function hasMigrationBeenOffered(): boolean {
  return (
    localStorage.getItem(MIGRATION_OFFERED_KEY) === 'true' ||
    localStorage.getItem(MIGRATION_DECLINED_KEY) === 'true'
  )
}

export function markMigrationOffered(): void {
  try { localStorage.setItem(MIGRATION_OFFERED_KEY, 'true') } catch { /* quota-safe */ }
}

export function markMigrationDeclined(): void {
  try { localStorage.setItem(MIGRATION_DECLINED_KEY, 'true') } catch { /* quota-safe */ }
}

function timedFetch(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  return fetch(url, { ...init, headers, signal: controller.signal }).finally(() => clearTimeout(id))
}

export async function migrateToServer(
  data: LocalDataSummary,
  onProgress: (message: string) => void,
): Promise<MigrationResult> {
  let migratedCount = 0

  try {
    // Step 1 — Birth data
    if (data.hasBirthData && data.birthData) {
      onProgress('Carrying your chart...')
      const bd = data.birthData
      const res = await timedFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthDate: bd.date,
          birthTime: bd.time,
          birthPlace: bd.city ? `${bd.city.name}, ${bd.city.country}` : '',
          fullName: bd.userName ?? '',
        }),
      })
      if (!res.ok) throw new Error(`profile ${res.status}`)
      try {
        const existing = JSON.parse(localStorage.getItem('astral-chart-birth-data') ?? '{}') as Record<string, unknown>
        localStorage.setItem('astral-chart-birth-data', JSON.stringify({ ...existing, _serverSynced: true }))
      } catch { /* ignore */ }
    }

    // Step 2 — Dream sessions
    if (data.dreamSessions.length > 0) {
      const count = data.dreamSessions.length
      onProgress(`Carrying ${count} dream session${count !== 1 ? 's' : ''}...`)

      // Assign stable UUIDs before the request (idempotent on retry)
      const sessionsWithIds = data.dreamSessions.map(({ key, date, session }) => {
        let id = session._pendingServerId
        if (!id) {
          id = crypto.randomUUID()
          try {
            const raw = localStorage.getItem(key)
            if (raw) {
              const s = JSON.parse(raw) as DreamSession
              s._pendingServerId = id
              localStorage.setItem(key, JSON.stringify(s))
            }
          } catch { /* ignore */ }
        }
        return { key, date, session: { ...session, _pendingServerId: id }, id }
      })

      for (const { key, id, date, session } of sessionsWithIds) {
        const res = await timedFetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            kind: 'dream',
            date,
            body: session.dreamContext,
            metadata: {
              messages: session.messages,
              dreamInput: session.dreamInput,
              skyContext: session.skyContext,
            },
          }),
        })
        if (!res.ok) throw new Error(`entries ${res.status}`)
        try {
          const raw = localStorage.getItem(key)
          if (raw) {
            const s = JSON.parse(raw) as DreamSession
            s._serverId = id
            localStorage.setItem(key, JSON.stringify(s))
          }
        } catch { /* ignore */ }
      }
      migratedCount += count
    }

    // Step 3 — Journal entries
    if (data.journalEntries.length > 0) {
      const count = data.journalEntries.length
      onProgress(`Carrying ${count} journal entr${count !== 1 ? 'ies' : 'y'}...`)

      // Build local-key → server-id map from dream migration
      const dreamKeyToServerId: Record<string, string> = {}
      for (const { key, session } of data.dreamSessions) {
        const id = session._pendingServerId ?? session._serverId
        if (id) dreamKeyToServerId[key] = id
      }

      const migratedIds = new Set<string>()
      for (const entry of data.journalEntries) {
        let dreamRef: DreamRef = entry.dreamRef
        if (dreamRef?.type === 'local' && dreamKeyToServerId[dreamRef.key]) {
          dreamRef = { type: 'server', id: dreamKeyToServerId[dreamRef.key] }
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _serverId, _syncFailed, ...rest } = entry
        const res = await timedFetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...rest, dreamRef, kind: 'journal' }),
        })
        if (!res.ok) throw new Error(`entries ${res.status}`)
        migratedIds.add(entry.id)
      }

      try {
        const raw = localStorage.getItem(JOURNAL_STORAGE_KEY)
        if (raw) {
          const all = JSON.parse(raw) as Array<JournalEntry>
          const updated = all.map(e => migratedIds.has(e.id) ? { ...e, _serverId: e.id } : e)
          localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(updated))
        }
      } catch { /* ignore */ }
      migratedCount += count
    }

    markMigrationOffered()
    return { success: true, migratedCount }
  } catch (e) {
    const isNetwork = e instanceof TypeError && (e.message.includes('fetch') || e.message.includes('abort'))
    return { success: false, migratedCount, error: isNetwork ? 'network' : 'server' }
  }
}
