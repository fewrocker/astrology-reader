import type { FocusArea } from './TarotIntentionScreen'

export type ReadingMode = 'single' | 'three-card' | 'celtic-cross'

export interface TarotModeSelectorProps {
  intention: string
  focusArea: FocusArea
  onModeSelected: (mode: ReadingMode) => void
  onBack: () => void
  userTier: 'free' | 'basic' | 'advanced'
}

interface ModeCardDef {
  id: ReadingMode
  title: string
  subtitle: string
  time: string
  getTag: (tier: 'free' | 'basic' | 'advanced') => string
  isLocked: (tier: 'free' | 'basic' | 'advanced') => boolean
}

const MODE_CARDS: ModeCardDef[] = [
  {
    id: 'single',
    title: 'Single Card',
    subtitle: 'A focused moment of guidance',
    time: '2–4 minutes',
    getTag: () => 'Free',
    isLocked: () => false,
  },
  {
    id: 'three-card',
    title: 'Three-Card Spread',
    subtitle: 'Past, present, and what emerges',
    time: '8–12 minutes',
    getTag: tier => (tier === 'free' ? 'Free (1/week)' : 'Free'),
    isLocked: () => false,
  },
  {
    id: 'celtic-cross',
    title: 'Celtic Cross',
    subtitle: 'A full symbolic portrait of your moment',
    time: '20–35 minutes',
    getTag: () => 'Advanced',
    isLocked: () => false,
  },
]

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="rgba(201,168,76,0.5)" strokeWidth="1.2" />
      <path
        d="M5 7V5a3 3 0 1 1 6 0v2"
        stroke="rgba(201,168,76,0.5)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function TarotModeSelector({
  intention,
  onModeSelected,
  onBack,
  userTier,
}: TarotModeSelectorProps) {
  const truncated =
    intention.length > 60 ? intention.slice(0, 60) + '…' : intention

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: '#0a0a0f' }}
    >
      <div className="w-full max-w-2xl flex flex-col gap-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 font-body self-start"
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '13px',
            color: 'rgba(138, 134, 148, 0.6)',
            cursor: 'pointer',
            padding: '4px 0',
            minHeight: '44px',
          }}
        >
          ← Change intention
        </button>

        <h2
          className="font-heading text-center"
          style={{ fontSize: '26px', color: 'rgba(201, 168, 76, 0.85)', letterSpacing: '0.02em' }}
        >
          Choose your reading
        </h2>

        {intention.trim().length > 0 && (
          <p
            className="text-center font-body"
            style={{ fontSize: '13px', color: 'rgba(138, 134, 148, 0.65)', lineHeight: 1.5 }}
          >
            You're seeking clarity on:{' '}
            <span style={{ color: 'rgba(201, 168, 76, 0.65)', fontStyle: 'italic' }}>
              {truncated}
            </span>
          </p>
        )}

        <div className="flex flex-col md:grid md:grid-cols-3 gap-4">
          {MODE_CARDS.map(card => {
            const locked = card.isLocked(userTier)
            const tag = card.getTag(userTier)
            return (
              <button
                key={card.id}
                onClick={() => onModeSelected(card.id)}
                className="relative flex flex-col gap-3 text-left font-body"
                style={{
                  padding: '24px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(201,168,76,0.15)',
                  borderRadius: '16px',
                  opacity: locked ? 0.55 : 1,
                  cursor: 'pointer',
                  transition: 'border-color 200ms ease, background 200ms ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(201,168,76,0.35)'
                  e.currentTarget.style.background = 'rgba(201,168,76,0.04)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(201,168,76,0.15)'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                }}
              >
                {locked && (
                  <span style={{ position: 'absolute', top: '16px', right: '16px' }}>
                    <LockIcon />
                  </span>
                )}
                <div className="flex flex-col gap-1">
                  <h3
                    className="font-heading"
                    style={{ fontSize: '22px', color: 'rgba(201,168,76,0.9)' }}
                  >
                    {card.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '13px',
                      color: 'rgba(138,134,148,0.8)',
                      lineHeight: 1.4,
                    }}
                  >
                    {card.subtitle}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-auto">
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'rgba(138,134,148,0.6)',
                      fontStyle: 'italic',
                    }}
                  >
                    {card.time}
                  </span>
                  <span
                    className="ml-auto rounded-full"
                    style={{
                      padding: '2px 8px',
                      fontSize: '10px',
                      letterSpacing: '0.08em',
                      border: '1px solid rgba(201,168,76,0.3)',
                      color: 'rgba(201,168,76,0.7)',
                    }}
                  >
                    {tag}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
