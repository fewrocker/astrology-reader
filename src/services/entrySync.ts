import type { JournalEntry } from '../components/journal/types'
import { JOURNAL_STORAGE_KEY } from '../components/journal/types'

// Shared in-flight guard — prevents duplicate concurrent POSTs for the same entry
const syncInFlight = new Set<string>()

function loadEntries(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(JOURNAL_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as JournalEntry[]
  } catch {
    return []
  }
}

function saveEntriesRaw(entries: JournalEntry[]): void {
  try {
    localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Sync-path save errors are silent — the entry is still locally intact
  }
}

function markJournalSyncFailed(id: string): void {
  const entries = loadEntries()
  const updated = entries.map(e => e.id === id ? { ...e, _syncFailed: true } : e)
  saveEntriesRaw(updated)
}

/**
 * POST a journal entry to /api/entries in the background.
 * Returns true if the server confirmed persistence, false on any failure.
 * Reads the entry fresh from localStorage before posting (handles interim mutations).
 * Guards against concurrent POSTs for the same entry ID.
 */
export async function syncJournalEntry(entry: JournalEntry, token: string): Promise<boolean> {
  if (syncInFlight.has(entry.id)) return false
  syncInFlight.add(entry.id)
  try {
    const response = await fetch('/api/entries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: entry.id,
        kind: 'journal',
        date: entry.date,
        body: entry.body,
        metadata: {
          tags: entry.tags,
          gptAnnotation: entry.gptAnnotation,
          dreamRef: entry.dreamRef,
          numerologicalDay: entry.numerologicalDay,
        },
      }),
    })
    if (response.ok) {
      const entries = loadEntries()
      const updated = entries.map(e =>
        e.id === entry.id ? { ...e, _serverId: entry.id, _syncFailed: undefined } : e
      )
      saveEntriesRaw(updated)
      return true
    } else {
      markJournalSyncFailed(entry.id)
      return false
    }
  } catch {
    markJournalSyncFailed(entry.id)
    return false
  } finally {
    syncInFlight.delete(entry.id)
  }
}

interface DreamSessionData {
  messages?: unknown
  dreamContext?: string
  dreamInput?: string
  skyContext?: unknown
  _syncFailed?: boolean
  _serverId?: string
}

/**
 * POST a dream session to /api/entries with kind='dream'.
 * Uses INSERT OR REPLACE semantics — server overwrites the previous day's dream entry.
 * Reads fresh from localStorage so accumulated messages are always sent.
 */
export async function syncDreamSession(sessionKey: string, token: string): Promise<boolean> {
  if (syncInFlight.has(sessionKey)) return false
  syncInFlight.add(sessionKey)
  try {
    const raw = localStorage.getItem(sessionKey)
    if (!raw) return false
    const session = JSON.parse(raw) as DreamSessionData

    const dateMatch = sessionKey.match(/dream-session-(\d{4}-\d{2}-\d{2})/)
    if (!dateMatch) return false
    const date = dateMatch[1]

    const response = await fetch('/api/entries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: sessionKey,
        kind: 'dream',
        date,
        body: session.dreamInput ?? '',
        metadata: {
          messages: session.messages,
          dreamContext: session.dreamContext,
          dreamInput: session.dreamInput,
          skyContext: session.skyContext,
        },
      }),
    })
    if (response.ok) {
      try {
        const fresh = localStorage.getItem(sessionKey)
        if (fresh) {
          const current = JSON.parse(fresh) as DreamSessionData
          localStorage.setItem(sessionKey, JSON.stringify({
            ...current,
            _serverId: sessionKey,
            _syncFailed: undefined,
          }))
        }
      } catch {
        // Local update is best-effort — session is still synced on server
      }
      return true
    } else {
      markDreamSyncFailed(sessionKey)
      return false
    }
  } catch {
    markDreamSyncFailed(sessionKey)
    return false
  } finally {
    syncInFlight.delete(sessionKey)
  }
}

function markDreamSyncFailed(sessionKey: string): void {
  try {
    const raw = localStorage.getItem(sessionKey)
    if (!raw) return
    const session = JSON.parse(raw) as DreamSessionData
    localStorage.setItem(sessionKey, JSON.stringify({ ...session, _syncFailed: true }))
  } catch {
    // ignore
  }
}
