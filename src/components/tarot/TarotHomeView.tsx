import { useState } from 'react'
import { useTarot } from '../../context/TarotContext'
import type { RateLimitInfo } from '../../services/gptInterpretation'
import type { SpreadMode } from '../../types/tarot'

const FOCUS_CHIPS = ['Love', 'Career', 'Growth', 'Decision', "Today's Energy", 'General']

const THREE_CARD_SPREAD_OPTIONS: Array<{ mode: SpreadMode; label: string; description: string; positions: string[] }> = [
  {
    mode: 'past-present-future',
    label: 'Past, Present, Future',
    description: 'Trace the arc from what shaped this moment to where the energy is moving next.',
    positions: ['Past', 'Present', 'Future'],
  },
  {
    mode: 'situation-challenge-advice',
    label: 'Situation, Challenge, Advice',
    description: 'Name the circumstance, the friction within it, and the symbolic direction forward.',
    positions: ['Situation', 'Challenge', 'Advice'],
  },
  {
    mode: 'mind-heart-action',
    label: 'Mind, Heart, Action',
    description: 'See how thought, feeling, and movement are aligned or divided right now.',
    positions: ['Mind', 'Heart', 'Action'],
  },
  {
    mode: 'self-other-bridge',
    label: 'Self, Other, Bridge',
    description: 'Read the living dynamic between you, the other side, and what could connect you.',
    positions: ['Self', 'Other', 'Bridge'],
  },
  {
    mode: 'theme-shadow-gift',
    label: 'Theme, Shadow, Gift',
    description: 'Reveal the central lesson, what is hidden underneath it, and what becomes available through it.',
    positions: ['Theme', 'Shadow', 'Gift'],
  },
]

interface TarotHomeViewProps {
  onExit: () => void
  onOpenUpgrade: (info: RateLimitInfo, tier?: 'basic' | 'advanced') => void
}

export default function TarotHomeView({ onExit }: TarotHomeViewProps) {
  const { state, dispatch } = useTarot()
  const [intentionSet, setIntentionSet] = useState(false)
  const [showThreeSpreadOptions, setShowThreeSpreadOptions] = useState(false)
  const isFirstVisit = state.savedReadingIds.length === 0

  const handleChip = (chip: string) => {
    dispatch({ type: 'SET_INTENTION', intention: chip })
    setIntentionSet(true)
  }

  const handleSkip = () => {
    dispatch({ type: 'SET_INTENTION', intention: '' })
    setIntentionSet(true)
  }

  const handleSelectMode = (mode: 'single' | 'three') => {
    dispatch({ type: 'SET_READING_MODE', mode })
    if (mode === 'single') {
      setShowThreeSpreadOptions(false)
      // Navigate to the shuffle ritual — it will forward to single-reading on reveal
      dispatch({ type: 'NAVIGATE_TAROT', subView: 'shuffle-ritual' })
      return
    }
    setShowThreeSpreadOptions(true)
  }

  const handleSelectThreeSpread = (mode: SpreadMode, label: string, positions: string[]) => {
    dispatch({ type: 'SET_READING_MODE', mode: 'three' })
    dispatch({ type: 'SET_SPREAD_MODE', spreadMode: { id: mode, label, positions } })
    // Navigate to the shuffle ritual — it will forward to three-reading on reveal
    dispatch({ type: 'NAVIGATE_TAROT', subView: 'shuffle-ritual' })
  }

  return (
    <div className="w-full max-w-2xl mx-auto py-8">
      {/* Back to app home */}
      <button
        type="button"
        onClick={onExit}
        className="text-xs font-heading mb-8 block transition-colors"
        style={{ color: 'rgba(201,168,76,0.6)' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#c9a84c')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.6)')}
      >
        ← Home
      </button>

      {/* Header */}
      <div className="mb-8">
        <p className="font-heading text-3xl text-mystic-gold mb-2">✦ Tarot</p>
        {isFirstVisit ? (
          <p className="text-sm text-mystic-muted leading-relaxed">
            The symbolic language of the cards, interpreted through your personal sky.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => dispatch({ type: 'NAVIGATE_TAROT', subView: 'saved-readings' })}
            className="text-xs font-heading transition-colors"
            style={{ color: 'rgba(201,168,76,0.5)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#c9a84c')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.5)')}
          >
            Saved Readings →
          </button>
        )}
      </div>

      {/* Intention field */}
      <div className="mb-8">
        <p className="text-xs text-mystic-muted uppercase tracking-widest mb-4">What would you like clarity on today?</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {FOCUS_CHIPS.map(chip => (
            <button
              key={chip}
              type="button"
              onClick={() => handleChip(chip)}
              className="px-3 py-1.5 rounded-full text-xs font-heading transition-all duration-150"
              style={{
                background: state.userIntention === chip ? 'rgba(124,58,237,0.25)' : 'rgba(18,18,26,0.8)',
                border: `1px solid ${state.userIntention === chip ? '#7c3aed' : 'rgba(124,58,237,0.3)'}`,
                color: state.userIntention === chip ? '#a78bfa' : 'rgba(167,139,250,0.6)',
              }}
            >
              {chip}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={state.userIntention}
          onChange={e => {
            dispatch({ type: 'SET_INTENTION', intention: e.target.value })
            if (e.target.value) setIntentionSet(true)
          }}
          placeholder="or type your own..."
          className="w-full bg-transparent text-sm text-mystic-text placeholder:text-mystic-muted/40 border-b py-2 outline-none transition-colors"
          style={{ borderColor: 'rgba(124,58,237,0.3)' }}
          onFocus={e => (e.currentTarget.style.borderColor = '#7c3aed')}
          onBlur={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)')}
        />
        {!intentionSet && (
          <button
            type="button"
            onClick={handleSkip}
            className="mt-2 text-xs transition-colors"
            style={{ color: 'rgba(201,168,76,0.35)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.6)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.35)')}
          >
            Skip and draw
          </button>
        )}
      </div>

      {/* Mode selection — shown after intention is set or skipped */}
      {intentionSet && (
        <div className="space-y-3">
          <p className="text-xs text-mystic-muted uppercase tracking-widest mb-4">Choose your reading</p>

          <button
            type="button"
            onClick={() => handleSelectMode('single')}
            className="w-full flex flex-col gap-1 p-4 rounded-xl text-left transition-all duration-150"
            style={{
              background: 'rgba(18,18,26,0.8)',
              borderTop: '2px solid #7c3aed',
              borderLeft: '1px solid rgba(255,255,255,0.04)',
              borderRight: '1px solid rgba(255,255,255,0.04)',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'color-mix(in srgb, #7c3aed 8%, rgba(18,18,26,0.9))'
              e.currentTarget.style.boxShadow = '0 0 16px color-mix(in srgb, #7c3aed 12%, transparent)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(18,18,26,0.8)'
              e.currentTarget.style.boxShadow = ''
            }}
          >
            <span className="font-heading text-base text-mystic-gold">Single Card</span>
            <span className="text-xs text-mystic-muted">A daily moment of guidance. Quick, clear, personal.</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectMode('three')}
            className="w-full flex flex-col gap-1 p-4 rounded-xl text-left transition-all duration-150"
            style={{
              background: 'rgba(18,18,26,0.8)',
              borderTop: '2px solid #7c3aed',
              borderLeft: '1px solid rgba(255,255,255,0.04)',
              borderRight: '1px solid rgba(255,255,255,0.04)',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'color-mix(in srgb, #7c3aed 8%, rgba(18,18,26,0.9))'
              e.currentTarget.style.boxShadow = '0 0 16px color-mix(in srgb, #7c3aed 12%, transparent)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(18,18,26,0.8)'
              e.currentTarget.style.boxShadow = ''
            }}
          >
            <span className="font-heading text-base text-mystic-gold">Three-Card Spread</span>
            <span className="text-xs text-mystic-muted">Past, present, future — or any of five spread modes.</span>
          </button>

          {showThreeSpreadOptions && (
            <div className="mt-4 space-y-3 rounded-2xl border border-mystic-gold/15 p-4" style={{ background: 'rgba(12,12,18,0.86)' }}>
              <p className="text-xs text-mystic-muted uppercase tracking-widest">Choose the three-card structure</p>
              {THREE_CARD_SPREAD_OPTIONS.map(option => (
                <button
                  key={option.mode}
                  type="button"
                  onClick={() => handleSelectThreeSpread(option.mode, option.label, option.positions)}
                  className="w-full rounded-xl border px-4 py-3 text-left transition-all duration-150"
                  style={{
                    background: 'rgba(18,18,26,0.88)',
                    borderColor: 'rgba(201,168,76,0.14)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(28,22,18,0.96)'
                    e.currentTarget.style.borderColor = 'rgba(201,168,76,0.34)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(18,18,26,0.88)'
                    e.currentTarget.style.borderColor = 'rgba(201,168,76,0.14)'
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-heading text-mystic-gold text-base">{option.label}</span>
                    <span className="text-[11px] uppercase tracking-[0.2em] text-mystic-muted">{option.positions.join(' · ')}</span>
                  </div>
                  <p className="mt-1 text-xs text-mystic-muted leading-relaxed">{option.description}</p>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => dispatch({ type: 'NAVIGATE_TAROT', subView: 'celtic-reading' })}
            className="w-full flex flex-col gap-1 p-4 rounded-xl text-left transition-all duration-150"
            style={{
              background: 'rgba(18,18,26,0.8)',
              borderTop: '2px solid #7c3aed',
              borderLeft: '1px solid rgba(255,255,255,0.04)',
              borderRight: '1px solid rgba(255,255,255,0.04)',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'color-mix(in srgb, #7c3aed 8%, rgba(18,18,26,0.9))'
              e.currentTarget.style.boxShadow = '0 0 16px color-mix(in srgb, #7c3aed 12%, transparent)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(18,18,26,0.8)'
              e.currentTarget.style.boxShadow = ''
            }}
          >
            <div className="flex items-center gap-2">
              <span className="font-heading text-base text-mystic-gold">Celtic Cross</span>
              <span
                className="text-xs font-heading px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.4)' }}
              >
                Advanced
              </span>
            </div>
            <span className="text-xs text-mystic-muted">A full ten-position reading. Deep, slow, symbolic.</span>
          </button>
        </div>
      )}
    </div>
  )
}
