import { useEffect, useRef } from 'react'
import { useApp } from '../../context/AppContext'

interface ReadingsModalProps {
  isOpen: boolean
  onClose: () => void
  onDreamOpen: () => void
  triggerRef?: React.RefObject<HTMLButtonElement>
}

interface ReadingItem {
  glyph: string
  label: string
  descriptor: string
  action: () => void
}

interface ReadingGroup {
  id: string
  title: string
  items: ReadingItem[]
}

export default function ReadingsModal({ isOpen, onClose, onDreamOpen, triggerRef }: ReadingsModalProps) {
  const { dispatch } = useApp()
  const modalRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const wasOpenRef = useRef(false)

  const handleSelect = (action: () => void) => {
    onClose()
    action()
  }

  const handleDream = () => {
    onClose()
    onDreamOpen()
  }

  const groups: ReadingGroup[] = [
    {
      id: 'you',
      title: 'You',
      items: [
        {
          glyph: '✦',
          label: 'Birth Chart',
          descriptor: 'Your natal positions, decoded once and kept forever',
          action: () => dispatch({ type: 'SET_VIEW', view: 'loading' }),
        },
        {
          glyph: '✦',
          label: 'Numerology',
          descriptor: 'Your life path, personal year, and frequency decoded',
          action: () => dispatch({ type: 'SET_VIEW', view: 'numerology' }),
        },
      ],
    },
    {
      id: 'transits',
      title: 'Transits',
      items: [
        {
          glyph: '☀',
          label: 'Daily Reading',
          descriptor: 'What the sky is doing to your chart today',
          action: () => dispatch({ type: 'START_TRANSIT', period: 'daily' }),
        },
        {
          glyph: '✦',
          label: 'Weekly Reading',
          descriptor: 'Key themes, communication, and relationship energy this week',
          action: () => dispatch({ type: 'START_TRANSIT', period: 'weekly' }),
        },
        {
          glyph: '☽',
          label: 'Monthly Reading',
          descriptor: 'Slow planet transits, retrogrades, and major shifts this month',
          action: () => dispatch({ type: 'START_TRANSIT', period: 'monthly' }),
        },
        {
          glyph: '☀',
          label: 'Year Ahead',
          descriptor: 'Your solar return chart and the year\'s defining themes',
          action: () => dispatch({ type: 'START_SOLAR_RETURN' }),
        },
        {
          glyph: '♡',
          label: 'Couple Synastry',
          descriptor: 'Compare two charts and read your relationship\'s celestial blueprint',
          action: () => dispatch({ type: 'SET_VIEW', view: 'partner-form' }),
        },
      ],
    },
    {
      id: 'journals',
      title: 'Journals',
      items: [
        {
          glyph: '✦',
          label: 'Cosmic Journal',
          descriptor: 'Your personal archive of readings, reflections, and insights',
          action: () => dispatch({ type: 'SET_VIEW', view: 'journal' }),
        },
        {
          glyph: '☽',
          label: 'Dream Interpretation',
          descriptor: 'Decode last night\'s dream through your natal chart',
          action: handleDream,
        },
        {
          glyph: '✦',
          label: 'Today',
          descriptor: 'Moon phase, personal day number, and today\'s sky at a glance',
          action: () => dispatch({ type: 'SET_VIEW', view: 'today' }),
        },
      ],
    },
  ]

  // Focus trap + Escape key
  useEffect(() => {
    if (!isOpen) return

    const modal = modalRef.current
    if (!modal) return

    const focusables = Array.from(
      modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    )
    const first = focusables[0]
    const last = focusables[focusables.length - 1]

    // Move focus into modal
    first?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Tab') {
        if (focusables.length === 0) return
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last?.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first?.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Return focus to trigger only on close transition, not on initial mount
  useEffect(() => {
    if (!isOpen && wasOpenRef.current) {
      triggerRef?.current?.focus()
    }
    wasOpenRef.current = isOpen
  }, [isOpen, triggerRef])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      aria-hidden="false"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Get Your Readings"
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-6"
        style={{
          background: 'linear-gradient(160deg, rgba(18,14,6,0.98) 0%, rgba(12,9,4,0.99) 100%)',
          border: '1px solid rgba(201,168,76,0.28)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(201,168,76,0.08)',
          animation: 'modal-in 180ms ease-out both',
        }}
      >
        {/* Close button */}
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-mystic-muted hover:text-mystic-text transition-colors text-lg leading-none"
          aria-label="Close readings menu"
        >
          ✕
        </button>

        <h2 className="font-heading text-2xl text-mystic-gold mb-1">Your Readings</h2>
        <p className="text-mystic-muted text-xs mb-6 tracking-wide">Choose a path for your chart</p>

        <div className="space-y-6">
          {groups.map((group, gi) => (
            <div key={group.id} role="group" aria-labelledby={`group-${group.id}`}>
              <h3
                id={`group-${group.id}`}
                className="font-heading text-base text-mystic-gold/60 uppercase tracking-widest mb-3 pb-2"
                style={{ borderBottom: '1px solid rgba(201,168,76,0.12)' }}
              >
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.items.map(item => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleSelect(item.action)}
                    className="w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-mystic-gold/8 group"
                  >
                    <span
                      className="text-mystic-gold/50 text-base leading-none mt-0.5 flex-shrink-0 group-hover:text-mystic-gold/80 transition-colors"
                      aria-hidden="true"
                    >
                      {item.glyph}
                    </span>
                    <span className="flex flex-col min-w-0">
                      <span className="font-heading text-mystic-text text-sm group-hover:text-mystic-gold transition-colors">
                        {item.label}
                      </span>
                      <span className="text-xs text-mystic-muted leading-snug mt-0.5">
                        {item.descriptor}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              {gi < groups.length - 1 && <div className="mt-4" />}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
      `}</style>
    </div>
  )
}
