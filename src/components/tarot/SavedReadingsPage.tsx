import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { listReadings, getReading, deleteReading } from '../../services/readingsService'
import type { SlimReading, FullReading } from '../../services/readingsService'
import { TAROT_CARD_BY_ID } from '../../data/tarot/cards'
import { CELTIC_CROSS_POSITIONS } from '../../data/tarot/spreadPositions'

const PAGE_SIZE = 20

// ─── Design token constants (matching TarotInterpretationPanel) ────────────────
const SECTION_HEADER = 'text-mystic-muted text-xs uppercase tracking-widest mb-3'
const SECTION_CONTAINER = 'border border-mystic-gold/20 rounded-xl bg-mystic-surface/50 p-6 mb-4'
const BODY_TEXT = 'text-mystic-text/90 text-sm leading-relaxed'

// ─── Synthesis type guards ─────────────────────────────────────────────────────

interface SynthesisChapter {
  heading: string
  body: string
}

interface ThreeCardSynthesisObject {
  openingSentence?: string
  mainTheme?: string
  mainTension?: string
  direction?: string
  hiddenInfluence?: string
  advice?: string
  psychologicalPattern?: string
  astrologySynthesis?: string
  timing?: string
  reflectionPrompts?: string[]
}

function isSynthesisChapterArray(v: unknown): v is SynthesisChapter[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    typeof (v[0] as Record<string, unknown>).heading === 'string' &&
    typeof (v[0] as Record<string, unknown>).body === 'string'
  )
}

function isThreeCardSynthesisObject(v: unknown): v is ThreeCardSynthesisObject {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false
  const obj = v as Record<string, unknown>
  return (
    typeof obj.openingSentence === 'string' ||
    typeof obj.mainTheme === 'string'
  )
}

// ─── Stored card shape ─────────────────────────────────────────────────────────

interface StoredCard {
  position?: number
  cardId?: string
  reversed?: boolean
  // other possible fields
  [key: string]: unknown
}

function isStoredCard(v: unknown): v is StoredCard {
  if (typeof v !== 'object' || v === null) return false
  return true
}

// ─── Moon phase extraction ─────────────────────────────────────────────────────

function extractMoonPhase(reading: FullReading): string | null {
  // Check synthesis object for moonPhaseName
  if (reading.synthesis && typeof reading.synthesis === 'object' && !Array.isArray(reading.synthesis)) {
    const s = reading.synthesis as Record<string, unknown>
    if (typeof s.moonPhaseName === 'string' && s.moonPhaseName) return s.moonPhaseName as string
  }
  // Check cards array for astroContextSnapshot (celtic cross format)
  if (Array.isArray(reading.cards)) {
    for (const card of reading.cards) {
      if (typeof card === 'object' && card !== null) {
        const c = card as Record<string, unknown>
        if (typeof c.astroContextSnapshot === 'object' && c.astroContextSnapshot !== null) {
          const snap = c.astroContextSnapshot as Record<string, unknown>
          if (typeof snap.moonPhase === 'string' && snap.moonPhase) return snap.moonPhase as string
        }
      }
    }
  }
  return null
}

// ─── Personal day extraction ───────────────────────────────────────────────────

function extractPersonalDay(reading: FullReading): number | null {
  if (reading.synthesis && typeof reading.synthesis === 'object' && !Array.isArray(reading.synthesis)) {
    const s = reading.synthesis as Record<string, unknown>
    if (typeof s.personalDay === 'number') return s.personalDay as number
  }
  if (Array.isArray(reading.cards)) {
    for (const card of reading.cards) {
      if (typeof card === 'object' && card !== null) {
        const c = card as Record<string, unknown>
        if (typeof c.astroContextSnapshot === 'object' && c.astroContextSnapshot !== null) {
          const snap = c.astroContextSnapshot as Record<string, unknown>
          if (typeof snap.personalDay === 'number') return snap.personalDay as number
        }
      }
    }
  }
  return null
}

// ─── Element tint ──────────────────────────────────────────────────────────────

function elementTint(element: string | null | undefined): string {
  if (element === 'Fire') return 'rgba(255,120,0,0.03)'
  if (element === 'Water') return 'rgba(0,80,180,0.03)'
  if (element === 'Air') return 'rgba(180,200,255,0.03)'
  if (element === 'Earth') return 'rgba(80,140,60,0.03)'
  return 'transparent'
}

// ─── Date formatting ───────────────────────────────────────────────────────────

function absoluteDate(iso: string): string {
  return new Date(iso + (iso.endsWith('Z') ? '' : 'Z')).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function relativeTime(iso: string): string {
  const now = Date.now()
  const then = new Date(iso + (iso.endsWith('Z') ? '' : 'Z')).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
  const days = Math.floor(diff / 86400)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'a week ago'
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  if (days < 60) return 'a month ago'
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return new Date(iso + (iso.endsWith('Z') ? '' : 'Z')).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function dateDisplay(iso: string): { primary: string; secondary: string | null } {
  const now = Date.now()
  const then = new Date(iso + (iso.endsWith('Z') ? '' : 'Z')).getTime()
  const days = Math.floor((now - then) / 86400000)
  if (days >= 7) {
    return { primary: absoluteDate(iso), secondary: relativeTime(iso) }
  }
  return { primary: relativeTime(iso), secondary: null }
}

// ─── Paragraph splitter (matches SingleCardSynthesisPanel) ────────────────────

function splitReadableParagraphs(text: string): string[] {
  const normalized = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
  if (normalized.length > 1) return normalized

  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(s => s.trim()).filter(Boolean) ?? []
  if (sentences.length <= 3) return [text.trim()]

  const chunks: string[] = []
  for (let i = 0; i < sentences.length; i += 2) {
    chunks.push(sentences.slice(i, i + 2).join(' '))
  }
  return chunks
}

function readingTypeLabel(type: string, spreadMode: string | null): string {
  if (type === 'single') return 'Single Card'
  if (type === 'three-card') {
    const modeLabel: Record<string, string> = {
      'past-present-future': 'Past · Present · Future',
      'situation-challenge-advice': 'Situation · Challenge · Advice',
      'mind-heart-action': 'Mind · Heart · Action',
      'self-other-bridge': 'Self · Other · Bridge',
      'theme-shadow-gift': 'Theme · Shadow · Gift',
    }
    const spread = spreadMode ? (modeLabel[spreadMode] ?? spreadMode) : ''
    return spread ? `Three Card · ${spread}` : 'Three Card'
  }
  if (type === 'celtic-cross') return 'Celtic Cross'
  return type
}

// ─── Synthesis renderers ───────────────────────────────────────────────────────

function ThresholdDivider() {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-mystic-gold/20" />
      <span className="text-mystic-gold/40 text-xs">✦</span>
      <div className="flex-1 h-px bg-mystic-gold/20" />
    </div>
  )
}

function StringSynthesisView({ text }: { text: string }) {
  const paragraphs = splitReadableParagraphs(text)
  return (
    <div className="space-y-4">
      {paragraphs.map((p, i) => (
        <p key={i} className={BODY_TEXT}>{p}</p>
      ))}
    </div>
  )
}

function ChapterSynthesisView({ chapters }: { chapters: SynthesisChapter[] }) {
  return (
    <div>
      {chapters.map((chapter, i) => (
        <div key={i} className={SECTION_CONTAINER}>
          <p className={SECTION_HEADER}>{chapter.heading}</p>
          <div className={BODY_TEXT}>
            {chapter.body.split('\n').map((line, li) => (
              line.startsWith('·') ? (
                <p
                  key={li}
                  style={{ paddingLeft: '1rem', color: 'rgba(201,168,76,0.75)', marginTop: '0.4rem', fontSize: '0.9rem', fontStyle: 'italic' }}
                >
                  {line}
                </p>
              ) : (
                <p key={li} style={{ marginTop: li > 0 ? '0.5rem' : 0 }}>{line}</p>
              )
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const THREE_CARD_SECTIONS: Array<{ key: keyof ThreeCardSynthesisObject; label: string; isArray?: boolean }> = [
  { key: 'openingSentence', label: 'Opening' },
  { key: 'mainTheme', label: 'Main Theme' },
  { key: 'mainTension', label: 'Tension' },
  { key: 'direction', label: 'Direction' },
  { key: 'hiddenInfluence', label: 'Hidden Influence' },
  { key: 'advice', label: 'Advice' },
  { key: 'psychologicalPattern', label: 'Pattern' },
  { key: 'astrologySynthesis', label: 'Astrology' },
  { key: 'timing', label: 'Timing' },
  { key: 'reflectionPrompts', label: 'Reflection', isArray: true },
]

function ThreeCardSynthesisView({ synthesis }: { synthesis: ThreeCardSynthesisObject }) {
  const sections = THREE_CARD_SECTIONS.filter(s => {
    const v = synthesis[s.key]
    if (s.isArray) return Array.isArray(v) && (v as string[]).length > 0
    return typeof v === 'string' && (v as string).trim().length > 0
  })

  if (sections.length === 0) return null

  return (
    <div>
      {sections.map((section, i) => {
        if (section.isArray) {
          const prompts = synthesis[section.key] as string[]
          return (
            <div key={i} className={SECTION_CONTAINER}>
              <p className={SECTION_HEADER}>{section.label}</p>
              <ul className="space-y-2">
                {prompts.map((prompt, pi) => (
                  <li key={pi} className="font-heading italic leading-relaxed" style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.85)' }}>
                    {prompt}
                  </li>
                ))}
              </ul>
            </div>
          )
        }
        const text = synthesis[section.key] as string
        const paragraphs = splitReadableParagraphs(text)
        return (
          <div key={i} className={SECTION_CONTAINER}>
            <p className={SECTION_HEADER}>{section.label}</p>
            <div className="space-y-3">
              {paragraphs.map((p, pi) => (
                <p key={pi} className={BODY_TEXT}>{p}</p>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SynthesisRegion({ synthesis }: { synthesis: unknown }) {
  if (!synthesis) return null

  if (typeof synthesis === 'string' && synthesis.trim().length > 0) {
    return (
      <>
        <ThresholdDivider />
        <StringSynthesisView text={synthesis} />
      </>
    )
  }

  if (isSynthesisChapterArray(synthesis)) {
    return (
      <>
        <ThresholdDivider />
        <ChapterSynthesisView chapters={synthesis} />
      </>
    )
  }

  if (isThreeCardSynthesisObject(synthesis)) {
    return (
      <>
        <ThresholdDivider />
        <ThreeCardSynthesisView synthesis={synthesis} />
      </>
    )
  }

  return null
}

// ─── Card list renderer ────────────────────────────────────────────────────────

function CardEntry({
  cardName,
  positionLabel,
  reversed,
  element,
}: {
  cardName: string
  positionLabel?: string
  reversed: boolean
  element?: string | null
}) {
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <span
        className="font-heading"
        style={{ fontSize: '1.1rem', color: '#c9a84c' }}
      >
        {cardName}
      </span>
      {reversed && (
        <span className="text-mystic-muted/70 text-xs italic">reversed</span>
      )}
      {positionLabel && (
        <span className={SECTION_HEADER} style={{ marginBottom: 0 }}>
          {positionLabel}
        </span>
      )}
      {element && (
        <span className="text-mystic-muted/60 text-xs">{element}</span>
      )}
    </div>
  )
}

function CardsSection({ reading }: { reading: FullReading }) {
  if (!Array.isArray(reading.cards) || reading.cards.length === 0) {
    // Fallback: just show firstCardName
    return (
      <div className="mb-4">
        <span
          className="font-heading"
          style={{ fontSize: '1.5rem', color: '#c9a84c' }}
        >
          {reading.firstCardName}
        </span>
      </div>
    )
  }

  const cards = reading.cards.filter(isStoredCard)

  if (reading.readingType === 'celtic-cross') {
    return (
      <div className="mb-4">
        <p className={SECTION_HEADER}>Cards</p>
        <div className="divide-y divide-mystic-gold/10">
          {cards.map((storedCard, i) => {
            const posNum = typeof storedCard.position === 'number' ? storedCard.position : i + 1
            const posInfo = CELTIC_CROSS_POSITIONS.find(p => p.number === posNum)
            const cardId = typeof storedCard.cardId === 'string' ? storedCard.cardId : null
            const cardData = cardId ? TAROT_CARD_BY_ID[cardId] : null
            const cardName = cardData?.name ?? (typeof storedCard.cardId === 'string' ? storedCard.cardId : reading.firstCardName)
            const reversed = Boolean(storedCard.reversed)
            return (
              <CardEntry
                key={i}
                cardName={cardName}
                positionLabel={posInfo?.name}
                reversed={reversed}
                element={cardData?.element ?? undefined}
              />
            )
          })}
        </div>
      </div>
    )
  }

  if (reading.readingType === 'three-card') {
    const spreadModeLabels: Record<string, string[]> = {
      'past-present-future': ['Past', 'Present', 'Future'],
      'situation-challenge-advice': ['Situation', 'Challenge', 'Advice'],
      'mind-heart-action': ['Mind', 'Heart', 'Action'],
      'self-other-bridge': ['Self', 'Other', 'Bridge'],
      'theme-shadow-gift': ['Theme', 'Shadow', 'Gift'],
    }
    const posLabels = reading.spreadMode ? (spreadModeLabels[reading.spreadMode] ?? []) : []

    return (
      <div className="mb-4">
        <p className={SECTION_HEADER}>Cards</p>
        <div className="divide-y divide-mystic-gold/10">
          {cards.map((storedCard, i) => {
            const cardId = typeof storedCard.cardId === 'string' ? storedCard.cardId : null
            const cardData = cardId ? TAROT_CARD_BY_ID[cardId] : null
            const cardName = cardData?.name ?? (i === 0 ? reading.firstCardName : `Card ${i + 1}`)
            const reversed = Boolean(storedCard.reversed)
            const posLabel = posLabels[i]
            return (
              <CardEntry
                key={i}
                cardName={cardName}
                positionLabel={posLabel}
                reversed={reversed}
                element={cardData?.element ?? undefined}
              />
            )
          })}
        </div>
      </div>
    )
  }

  // Single card
  const firstCard = cards[0]
  const cardId = firstCard && typeof firstCard.cardId === 'string' ? firstCard.cardId : null
  const cardData = cardId ? TAROT_CARD_BY_ID[cardId] : null
  const cardName = cardData?.name ?? reading.firstCardName
  const reversed = firstCard ? Boolean(firstCard.reversed) : false

  return (
    <div className="mb-4">
      <span
        className="font-heading"
        style={{ fontSize: '1.5rem', color: '#c9a84c' }}
      >
        {cardName}
      </span>
      {reversed && (
        <p className="text-mystic-muted/70 text-xs italic mt-0.5">reversed</p>
      )}
      {cardData?.element && (
        <p className="text-mystic-muted/60 text-xs mt-0.5">{cardData.element}</p>
      )}
    </div>
  )
}

// ─── DetailModal ───────────────────────────────────────────────────────────────

interface DetailModalProps {
  reading: FullReading
  onClose: () => void
  onDelete: (id: string) => void
}

function DetailModal({ reading, onClose, onDelete }: DetailModalProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { token } = useAuth()

  // Resolve first card element for tint
  const firstCardData = (() => {
    if (Array.isArray(reading.cards) && reading.cards.length > 0) {
      const fc = reading.cards[0]
      if (isStoredCard(fc)) {
        const cardId = typeof fc.cardId === 'string' ? fc.cardId : null
        if (cardId) return TAROT_CARD_BY_ID[cardId] ?? null
      }
    }
    return null
  })()
  const bgTint = elementTint(firstCardData?.element)

  const moonPhase = extractMoonPhase(reading)
  const personalDay = extractPersonalDay(reading)
  const { primary: datePrimary, secondary: dateSecondary } = dateDisplay(reading.createdAt)

  const handleDelete = async () => {
    if (!token) return
    setDeleting(true)
    try {
      await deleteReading(reading.id, token)
      onDelete(reading.id)
      onClose()
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    // Backdrop — bottom-sheet on mobile, centered on sm+
    <div
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      {/* Element tint overlay on backdrop */}
      {bgTint !== 'transparent' && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: bgTint,
          }}
        />
      )}

      {/* Modal panel — bottom sheet on mobile, centered floating on sm+ */}
      <div
        style={{
          background: 'linear-gradient(160deg, rgba(28,20,40,0.98) 0%, rgba(13,10,26,0.98) 100%)',
          border: '1px solid rgba(201,168,76,0.2)',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '92vh',
          overflowY: 'auto',
          position: 'relative',
          padding: '1.5rem',
        }}
        className="rounded-t-xl sm:rounded-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="text-mystic-muted hover:text-mystic-gold transition-colors"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.2rem',
            lineHeight: 1,
          }}
          aria-label="Close"
        >
          ✕
        </button>

        {/* Header: spread type */}
        <p className={`${SECTION_HEADER} mb-1`}>
          {readingTypeLabel(reading.readingType, reading.spreadMode)}
        </p>

        {/* Cards display */}
        <CardsSection reading={reading} />

        {/* Intention */}
        {reading.intentPreview && (
          <p
            className="font-heading italic mb-3"
            style={{ fontSize: '1rem', color: 'rgba(201,168,76,0.85)' }}
          >
            "{reading.intentPreview}"
          </p>
        )}

        {/* Date */}
        <div className="mb-1">
          <p className="text-mystic-muted/80 text-sm">{datePrimary}</p>
          {dateSecondary && (
            <p className="text-mystic-muted/50 text-xs">{dateSecondary}</p>
          )}
        </div>

        {/* Lunar phase */}
        {moonPhase && (
          <p className="text-mystic-muted/80 text-sm mb-4">
            ☽ {moonPhase}
          </p>
        )}

        {/* Personal day (if present) */}
        {personalDay !== null && (
          <p className="text-mystic-muted/60 text-xs mb-4">
            Personal day: {personalDay}
          </p>
        )}

        {/* Synthesis */}
        <SynthesisRegion synthesis={reading.synthesis} />

        {/* Delete section */}
        <div
          className="mt-6 pt-4"
          style={{ borderTop: '1px solid rgba(201,168,76,0.12)' }}
        >
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-mystic-muted/60 hover:text-mystic-muted transition-colors text-sm"
              style={{
                background: 'none',
                border: '1px solid rgba(138,134,148,0.25)',
                borderRadius: '6px',
                padding: '0.4rem 0.8rem',
                cursor: 'pointer',
              }}
            >
              Delete this reading
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="text-mystic-muted/80 text-sm">Are you sure? This cannot be undone.</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  background: '#8b2020',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '6px',
                  padding: '0.4rem 0.8rem',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-mystic-muted/60 hover:text-mystic-muted transition-colors"
                style={{
                  background: 'none',
                  border: '1px solid rgba(138,134,148,0.25)',
                  borderRadius: '6px',
                  padding: '0.4rem 0.8rem',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── ReadingTile ───────────────────────────────────────────────────────────────

interface ReadingTileProps {
  reading: SlimReading
  onClick: () => void
}

function ReadingTile({ reading, onClick }: ReadingTileProps) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid #3a3a5c',
        borderRadius: '10px',
        padding: '1rem',
        textAlign: 'left',
        cursor: 'pointer',
        width: '100%',
        transition: 'border-color 0.2s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#c9a84c')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#3a3a5c')}
    >
      <p style={{ color: '#888', fontSize: '0.7rem', marginBottom: '0.25rem' }}>
        {readingTypeLabel(reading.readingType, reading.spreadMode)}
      </p>
      <p style={{ fontFamily: "'Cormorant Garamond', serif", color: '#c9a84c', fontSize: '1.1rem', margin: '0 0 0.4rem', fontWeight: 600 }}>
        {reading.firstCardName}
      </p>
      <p style={{ color: '#777', fontSize: '0.78rem', marginBottom: reading.intentPreview ? '0.4rem' : 0 }}>
        {relativeTime(reading.createdAt)}
      </p>
      {reading.intentPreview && (
        <p style={{ fontStyle: 'italic', color: '#aaa', fontSize: '0.82rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          "{reading.intentPreview}"
        </p>
      )}
    </button>
  )
}

// ─── SkeletonTile ──────────────────────────────────────────────────────────────

function SkeletonTile() {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid #3a3a5c',
      borderRadius: '10px', padding: '1rem',
    }}>
      <div style={{ height: '10px', width: '40%', background: '#2a2a4a', borderRadius: '4px', marginBottom: '0.5rem' }} />
      <div style={{ height: '18px', width: '65%', background: '#2a2a4a', borderRadius: '4px', marginBottom: '0.5rem' }} />
      <div style={{ height: '10px', width: '30%', background: '#2a2a4a', borderRadius: '4px' }} />
    </div>
  )
}

// ─── SavedReadingsPage ─────────────────────────────────────────────────────────

export default function SavedReadingsPage() {
  const { token, tier, isAuthenticated } = useAuth()
  const [items, setItems] = useState<SlimReading[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [fullReading, setFullReading] = useState<FullReading | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(false)

  const fetchReadings = useCallback(async (currentOffset = 0) => {
    if (!token) return
    try {
      const data = await listReadings(token, PAGE_SIZE, currentOffset)
      if (currentOffset === 0) {
        setItems(data.items)
      } else {
        setItems(prev => [...prev, ...data.items])
      }
      setTotal(data.total)
      setOffset(currentOffset + data.items.length)
      setError(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown_error'
      setError(msg)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [token])

  useEffect(() => {
    if (isAuthenticated && tier === 'advanced') {
      fetchReadings(0)
    } else {
      setLoading(false)
    }
  }, [isAuthenticated, tier, fetchReadings])

  const handleLoadMore = () => {
    setLoadingMore(true)
    fetchReadings(offset)
  }

  const handleTileClick = async (id: string) => {
    if (!token) return
    setSelectedId(id)
    setFullReading(null)
    setDetailLoading(true)
    setDetailError(false)
    try {
      const data = await getReading(id, token)
      setFullReading(data)
    } catch {
      setDetailError(true)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleRetryDetail = () => {
    if (selectedId) handleTileClick(selectedId)
  }

  const handleDelete = (id: string) => {
    setItems(prev => prev.filter(r => r.id !== id))
    setTotal(prev => Math.max(0, prev - 1))
    setSelectedId(null)
    setFullReading(null)
  }

  const closeModal = () => {
    setSelectedId(null)
    setFullReading(null)
    setDetailError(false)
  }

  // Subscription gate
  if (!isAuthenticated) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
        <p>Sign in to view your saved readings.</p>
      </div>
    )
  }

  if (tier !== 'advanced') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem', opacity: 0.4 }}>✦</div>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", color: '#c9a84c', marginBottom: '0.5rem' }}>
          Keep your readings.
        </h2>
        <p style={{ color: '#888', fontSize: '0.9rem', maxWidth: '340px', margin: '0 auto' }}>
          Advanced unlocks saved readings, the full Celtic Cross, and unlimited draws. Your symbolic history, preserved.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: '1.5rem' }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", color: '#c9a84c', marginBottom: '1rem', fontSize: '1.4rem' }}>
          Your Readings
        </h2>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[0, 1, 2].map(i => <SkeletonTile key={i} />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#888', marginBottom: '1rem' }}>Your readings could not be loaded. Try again.</p>
        <button
          onClick={() => { setLoading(true); fetchReadings(0) }}
          style={{ background: 'none', border: '1px solid #3a3a5c', color: '#c9a84c', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer' }}
        >
          Retry
        </button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem', color: '#c9a84c', opacity: 0.3 }}>✦</div>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", color: '#c9a84c', marginBottom: '0.5rem', fontSize: '1.3rem' }}>
          Your readings will live here.
        </h2>
        <p style={{ color: '#777', fontSize: '0.85rem', maxWidth: '320px', margin: '0 auto 1.5rem' }}>
          When you save a reading, it joins your personal collection — marked by the moon that was present when you drew.
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif", color: '#c9a84c', marginBottom: '1rem', fontSize: '1.4rem' }}>
        Your Readings <span style={{ color: '#555', fontSize: '0.85rem', fontFamily: 'inherit', fontWeight: 400 }}>— {total}</span>
      </h2>

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {items.map(r => (
          <ReadingTile key={r.id} reading={r} onClick={() => handleTileClick(r.id)} />
        ))}
      </div>

      {items.length < total && (
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            style={{
              background: 'none', border: '1px solid #3a3a5c', color: '#c9a84c',
              borderRadius: '6px', padding: '0.5rem 1.5rem', cursor: 'pointer', fontSize: '0.85rem',
            }}
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}

      {selectedId && (
        detailLoading ? (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <p className="text-mystic-gold">Gathering your reading...</p>
          </div>
        ) : detailError ? (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem',
          }}
            onClick={closeModal}
          >
            <p className="text-mystic-muted text-sm">This reading could not be loaded. Try again.</p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={e => { e.stopPropagation(); handleRetryDetail() }}
                className="text-mystic-gold text-sm"
                style={{ background: 'none', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '6px', padding: '0.4rem 0.9rem', cursor: 'pointer' }}
              >
                Retry
              </button>
              <button
                onClick={closeModal}
                className="text-mystic-muted text-sm"
                style={{ background: 'none', border: '1px solid rgba(138,134,148,0.25)', borderRadius: '6px', padding: '0.4rem 0.9rem', cursor: 'pointer' }}
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : fullReading ? (
          <DetailModal reading={fullReading} onClose={closeModal} onDelete={handleDelete} />
        ) : null
      )}
    </div>
  )
}
