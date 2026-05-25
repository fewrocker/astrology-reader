import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { listReadings, getReading, deleteReading } from '../../services/readingsService'
import type { SlimReading, FullReading } from '../../services/readingsService'

const PAGE_SIZE = 20

const MOON_GLYPHS: Record<string, string> = {
  'New Moon': '🌑',
  'Waxing Crescent': '🌒',
  'First Quarter': '🌓',
  'Waxing Gibbous': '🌔',
  'Full Moon': '🌕',
  'Waning Gibbous': '🌖',
  'Last Quarter': '🌗',
  'Waning Crescent': '🌘',
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
  // older than 60 days — show actual date
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
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

interface DetailModalProps {
  reading: FullReading
  onClose: () => void
  onDelete: (id: string) => void
}

function DetailModal({ reading, onClose, onDelete }: DetailModalProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { token } = useAuth()

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
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1a1a2e', border: '1px solid #3a3a5c',
          borderRadius: '12px', maxWidth: '480px', width: '100%',
          padding: '1.5rem', position: 'relative', maxHeight: '80vh', overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '1rem', right: '1rem',
            background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1.2rem',
          }}
        >
          ✕
        </button>

        <p style={{ color: '#888', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
          {readingTypeLabel(reading.readingType, reading.spreadMode)}
        </p>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", color: '#c9a84c', margin: '0 0 0.5rem', fontSize: '1.5rem' }}>
          {reading.firstCardName}
        </h2>
        <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: '1rem' }}>
          {relativeTime(reading.createdAt)}
        </p>

        {reading.intentPreview && (
          <p style={{ fontStyle: 'italic', color: '#bbb', fontSize: '0.9rem', marginBottom: '1rem' }}>
            "{reading.intentPreview}"
          </p>
        )}

        {reading.synthesis && (
          <div style={{ borderTop: '1px solid #3a3a5c', paddingTop: '1rem', marginBottom: '1rem' }}>
            <p style={{ color: '#888', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Synthesis</p>
            <p style={{ color: '#ccc', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
              {typeof reading.synthesis === 'string'
                ? reading.synthesis
                : JSON.stringify(reading.synthesis, null, 2)}
            </p>
          </div>
        )}

        <div style={{ borderTop: '1px solid #3a3a5c', paddingTop: '1rem' }}>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{ background: 'none', border: '1px solid #555', color: '#888', borderRadius: '6px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              Delete this reading
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ color: '#888', fontSize: '0.85rem' }}>Are you sure? This cannot be undone.</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ background: '#8b2020', border: 'none', color: '#fff', borderRadius: '6px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ background: 'none', border: '1px solid #555', color: '#888', borderRadius: '6px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.8rem' }}
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
    try {
      const data = await getReading(id, token)
      setFullReading(data)
    } catch {
      setSelectedId(null)
    } finally {
      setDetailLoading(false)
    }
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
            <p style={{ color: '#c9a84c' }}>Gathering your reading...</p>
          </div>
        ) : fullReading ? (
          <DetailModal reading={fullReading} onClose={closeModal} onDelete={handleDelete} />
        ) : null
      )}
    </div>
  )
}
