import { useEffect, useRef } from 'react'
import {
  Sun, Wind, Moon, Compass, Heart,
  BookOpen, Eye, Hash, Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { AppAction } from '../../context/appState'

interface ReadingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (action: AppAction) => void
  onOpenDream: () => void
}

interface ModalItem {
  icon: LucideIcon
  accent: string
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
    heading: 'Charts',
    items: [
      {
        icon: Sparkles,
        accent: '#c9a84c',
        label: 'Birth Chart',
        descriptor: 'Your natal positions, decoded once and kept forever',
        action: { type: 'SET_VIEW', view: 'loading' },
      },
      {
        icon: Hash,
        accent: '#f59e0b',
        label: 'Numerology',
        descriptor: 'Your life numbers and what they say about your path',
        action: { type: 'SET_VIEW', view: 'numerology' },
      },
      {
        icon: Heart,
        accent: '#f43f5e',
        label: 'Couple Synastry',
        descriptor: 'Two charts overlaid — where you align and where you stretch',
        action: { type: 'SET_VIEW', view: 'partner-form' },
      },
    ],
  },
  {
    heading: 'Transits',
    items: [
      {
        icon: Sun,
        accent: '#eab308',
        label: 'Daily Reading',
        descriptor: 'What the sky is doing to your chart right now, today',
        action: { type: 'START_TRANSIT', period: 'daily' },
      },
      {
        icon: Wind,
        accent: '#14b8a6',
        label: 'Weekly Reading',
        descriptor: "This week's planetary influence — themes, communication, energy",
        action: { type: 'START_TRANSIT', period: 'weekly' },
      },
      {
        icon: Moon,
        accent: '#3b82f6',
        label: 'Monthly Reading',
        descriptor: 'Slow-moving planets, retrogrades, and deeper currents this month',
        action: { type: 'START_TRANSIT', period: 'monthly' },
      },
      {
        icon: Compass,
        accent: '#f97316',
        label: 'Year Ahead',
        descriptor: 'Your solar return chart — the sky on your next birthday',
        action: { type: 'START_SOLAR_RETURN' },
      },
    ],
  },
  {
    heading: 'Journals',
    items: [
      {
        icon: BookOpen,
        accent: '#10b981',
        label: 'Cosmic Journal',
        descriptor: 'Your annotated sky record — entries, tags, and reflections',
        action: { type: 'SET_VIEW', view: 'journal' },
      },
      {
        icon: Eye,
        accent: '#8b5cf6',
        label: 'Dream Interpretation',
        descriptor: 'Symbols from your sleep, read through your natal chart',
        isDream: true,
      },
    ],
  },
]

export default function ReadingsModal({ isOpen, onClose, onSelect, onOpenDream }: ReadingsModalProps) {
  const firstItemRef = useRef<HTMLButtonElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const modal = modalRef.current
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'Tab' && modal) {
        const focusables = Array.from(
          modal.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        )
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (!focusables.length) return
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last?.focus() }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first?.focus() }
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) setTimeout(() => firstItemRef.current?.focus(), 50)
  }, [isOpen])

  if (!isOpen) return null

  const handleItemClick = (item: ModalItem) => {
    if (item.isDream) onOpenDream()
    else if (item.action) onSelect(item.action)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 sm:items-center sm:pt-4"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl rounded-2xl overflow-hidden"
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
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-xl transition-colors z-10 hover:text-mystic-gold/75 text-mystic-gold/35 leading-none"
          aria-label="Close"
        >
          ×
        </button>

        {/* Header */}
        <div
          className="px-7 pt-7 pb-5"
          style={{ borderBottom: '1px solid rgba(201,168,76,0.1)' }}
        >
          <h2 className="font-heading text-xl text-mystic-gold mb-1">Your Readings ✦</h2>
          <p className="text-xs text-mystic-muted tracking-widest uppercase">What calls to you today</p>
        </div>

        {/* Scrollable groups */}
        <div className="overflow-y-auto max-h-[75vh] px-7 py-6 space-y-7">
          {GROUPS.map((group, gi) => (
            <div key={group.heading}>
              {gi > 0 && (
                <div className="mb-6" style={{ borderTop: '1px solid rgba(201,168,76,0.1)' }} />
              )}

              <p className="font-heading text-xs tracking-widest uppercase mb-4"
                style={{ color: 'rgba(201,168,76,0.5)' }}>
                {group.heading}
              </p>

              <div className="grid grid-cols-2 gap-3">
                {group.items.map((item, ii) => {
                  const Icon = item.icon
                  const isLastOdd = group.items.length % 2 !== 0 && ii === group.items.length - 1
                  return (
                    <button
                      key={item.label}
                      ref={gi === 0 && ii === 0 ? firstItemRef : undefined}
                      type="button"
                      onClick={() => handleItemClick(item)}
                      className="flex flex-col gap-3 p-4 rounded-xl text-left transition-all duration-150"
                      style={{
                        gridColumn: isLastOdd ? '1 / -1' : undefined,
                        background: 'rgba(18,18,26,0.8)',
                        borderTop: `2px solid ${item.accent}`,
                        borderLeft: '1px solid rgba(255,255,255,0.04)',
                        borderRight: '1px solid rgba(255,255,255,0.04)',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget
                        el.style.background = `color-mix(in srgb, ${item.accent} 8%, rgba(18,18,26,0.9))`
                        el.style.boxShadow = `0 0 16px color-mix(in srgb, ${item.accent} 12%, transparent)`
                        el.style.borderTopColor = item.accent
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget
                        el.style.background = 'rgba(18,18,26,0.8)'
                        el.style.boxShadow = ''
                        el.style.borderTopColor = item.accent
                      }}
                    >
                      <Icon size={32} color={item.accent} strokeWidth={1.5} />
                      <div>
                        <div className="font-heading text-base text-mystic-gold leading-tight mb-1">
                          {item.label}
                        </div>
                        <div className="text-xs text-mystic-muted leading-snug">
                          {item.descriptor}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </div>
  )
}
