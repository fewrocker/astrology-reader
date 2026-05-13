export type JournalTag =
  | 'breakthrough'
  | 'turning-point'
  | 'grief'
  | 'love'
  | 'decision'
  | 'creative-peak'
  | 'dream'
  | 'blocked'

export interface JournalEntry {
  id: string                    // UUID v4, generated at save time
  date: string                  // YYYY-MM-DD (local date of the event)
  time: string                  // HH:MM (24h, local time; defaults to '12:00' if not specified)
  title?: string                // Optional one-line title (max 120 chars)
  body: string                  // Free-text body (optional, but must exist as empty string not null)
  tags: JournalTag[]            // Assigned by GPT; may be empty until annotation completes
  numerologicalDay: number      // Result of calculatePersonalDay(birthDate, entryDate) — stored at write time
  gptAnnotation: string | null  // One-sentence cosmic tag; null until GPT resolves; stored permanently on first generation
  dreamRef: string | null       // localStorage key of linked dream session, e.g. 'dream-session-2025-05-13'; null if none
  createdAt: string             // ISO 8601 UTC datetime of when the entry was created in the app
  // --- sync state (sprint-0007+) ---
  _serverId?: string            // set after confirmed server persistence; equals id when server uses client UUID as PK
  _syncFailed?: boolean         // true if the most recent background sync attempt failed
}

export const JOURNAL_STORAGE_KEY = 'cosmic-journal-entries'

export const TAG_LABELS: Record<JournalTag, string> = {
  'breakthrough': 'Breakthrough',
  'turning-point': 'Turning Point',
  'grief': 'Grief',
  'love': 'Love',
  'decision': 'Decision',
  'creative-peak': 'Creative Peak',
  'dream': 'Dream',
  'blocked': 'Blocked',
}

export const EXPANSIVE_TAGS: JournalTag[] = ['breakthrough', 'love', 'creative-peak']
export const INWARD_TAGS: JournalTag[] = ['grief', 'dream', 'turning-point']
