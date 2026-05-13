import { useEffect, useRef } from 'react'
import type { AppAction } from '../../context/appState'

interface ReadingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (action: AppAction) => void
  onOpenDream: () => void
}

interface ModalItem {
  glyph: string
  label: string
  descriptor: string
  action?: AppAction
  isDream?: boolean
}

interface ModalGroup {
  heading: string
  items: ModalItem[]
}

const GROUPS: ModalGroup[] = [
  {
    heading: 'You',
    items: [
      {
        glyph: '✦',
        label: 'Birth Chart',
        descriptor: 'Your natal positions, decoded once and kept forever',
        action: { type: 'SET_VIEW', view: 'loading' },
      },
      {
        glyph: '✦',
        label: 'Numerology',
        descriptor: 'Your life numbers and what they say about your path',
        action: { type: 'SET_VIEW', view: 'numerology' },
      },
    ],
  },
  {
    heading: 'Transits',
    items: [
      {
        glyph: '☀',
        label: 'Daily Reading',
        descriptor: 'What the sky is doing to your chart right now, today',
        action: { type: 'START_TRANSIT', period: 'daily' },
      },
      {
        glyph: '✦',
        label: 'Weekly Reading',
        descriptor: 'This week\'s planetary influence — themes, communication, energy',
        action: { type: 'START_TRANSIT', period: 'weekly' },
      },
      {
        glyph: '☽',
        label: 'Monthly Reading',
        descriptor: 'Slow-moving planets, retrogrades, and deeper currents this month',
        action: { type: 'START_TRANSIT', period: 'monthly' },
      },
      {
        glyph: '☀',
        label: 'Year Ahead',
        descriptor: 'Your solar return chart — the sky on your next birthday',
        action: { type: 'START_SOLAR_RETURN' },
      },
      {
        glyph: '♡',
        label: 'Couple Synastry',
        descriptor: 'Two charts overlaid — where you align and where you stretch',
        action: { type: 'SET_VIEW', view: 'partner-form' },
      },
    ],
  },
  {
    heading: 'Journals',
    items: [
      {
        glyph: '✦',
        label: 'Cosmic Journal',
        descriptor: 'Your annotated sky record — entries, tags, and reflections',
        action: { type: 'SET_VIEW', view: 'journal' },
      },
      {
        glyph: '☽',
        label: 'Dream Interpretation',
        descriptor: 'Symbols from your sleep, read through your natal chart',
        isDream: true,
      },
      {
        glyph: '✦',
        label: 'Today',
        descriptor: 'Moon phase, personal day number, and a reading for this exact day',
        action: { type: 'SET_VIEW', view: 'today' },
      },
    ],
  },
]

export default function ReadingsModal({ isOpen, onClose, onSelect, onOpenDream }: ReadingsModalProps) {
  const firstItemRef = useRef<HTMLButtonElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Escape key and focus trap
  useEffect(() => {
    if (!isOpen) return

    const modal = modalRef.current
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Tab' && modal) {
        const focusables = Array.from(
          modal.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        )
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
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

  // Focus first item on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => firstItemRef.current?.focus(), 50)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleItemClick = (item: ModalItem) => {
    if (item.isDream) {
      onOpenDream()
    } else if (item.action) {
      onSelect(item.action)
    }
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:items-center sm:pt-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, rgba(22,16,8,0.98) 0%, rgba(15,11,5,0.99) 100%)',
          border: '1px solid rgba(201,168,76,0.3)',
          boxShadow: '0 0 48px rgba(201,168,76,0.08), 0 24px 64px rgba(0,0,0,0.7)',
          animation: 'modal-in 150ms ease-out both',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Choose a reading"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-lg transition-colors z-10 hover:text-mystic-gold/75 text-mystic-gold/35"
          aria-label="Close"
        >
          ×
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <h2 className="font-heading text-xl text-mystic-gold mb-1">Your Readings ✦</h2>
          <p className="text-xs text-mystic-muted tracking-widest uppercase">What calls to you today</p>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto max-h-[70vh] px-6 pb-6">
          {GROUPS.map((group, gi) => (
            <div key={group.heading} className={gi > 0 ? 'mt-6' : ''}>
              {gi > 0 && (
                <div
                  className="border-t mb-4"
                  style={{ borderColor: 'rgba(201,168,76,0.15)' }}
                />
              )}
              <p className="font-heading text-xs text-mystic-gold/60 tracking-widest uppercase mb-3">
                {group.heading}
              </p>

              {group.items.map((item, ii) => (
                <button
                  key={item.label}
                  ref={gi === 0 && ii === 0 ? firstItemRef : undefined}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={`w-full flex items-start gap-3 px-2 py-3 rounded-lg hover:bg-mystic-gold/5 transition-colors duration-150 text-left ${
                    ii < group.items.length - 1 ? 'border-b border-mystic-border/30' : ''
                  }`}
                >
                  <span className="w-8 text-right flex-shrink-0 text-mystic-gold/50 text-base leading-6 pt-0.5">
                    {item.glyph}
                  </span>
                  <span className="flex flex-col min-w-0">
                    <span className="font-heading text-base text-mystic-gold leading-tight">
                      {item.label}
                    </span>
                    <span className="text-xs text-mystic-muted mt-0.5 leading-snug">
                      {item.descriptor}
                    </span>
                  </span>
                </button>
              ))}
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
