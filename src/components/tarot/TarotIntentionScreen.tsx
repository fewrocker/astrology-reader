import { useState, useEffect, useRef } from 'react'

export type FocusArea =
  | 'todays-energy'
  | 'love-relationships'
  | 'career-purpose'
  | 'growth'
  | 'custom-question'
  | 'general'

export interface TarotIntentionScreenProps {
  onIntentionSet: (intention: string, focusArea: FocusArea) => void
  onSkip: () => void
  defaultFocusArea?: FocusArea
  hasDrawnBefore?: boolean
}

const FOCUS_CHIPS: { id: FocusArea; label: string }[] = [
  { id: 'todays-energy', label: "Today's Energy" },
  { id: 'love-relationships', label: 'Love & Relationships' },
  { id: 'career-purpose', label: 'Career & Purpose' },
  { id: 'growth', label: 'Growth' },
  { id: 'custom-question', label: 'Custom Question' },
]

export function resolveEffectiveFocusArea(
  intentionText: string,
  selectedChip: FocusArea | null,
): FocusArea {
  if (selectedChip !== null) return selectedChip
  if (intentionText.trim().length > 0) return 'custom-question'
  return 'general'
}

export default function TarotIntentionScreen({
  onIntentionSet,
  onSkip,
  defaultFocusArea,
  hasDrawnBefore = false,
}: TarotIntentionScreenProps) {
  const [intentionText, setIntentionText] = useState('')
  const [selectedChip, setSelectedChip] = useState<FocusArea | null>(defaultFocusArea ?? null)
  const [subtextVisible, setSubtextVisible] = useState(hasDrawnBefore)
  const [firstTimeVisible, setFirstTimeVisible] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const charCount = intentionText.length
  const canSubmit = intentionText.trim().length > 0 || selectedChip !== null

  useEffect(() => {
    if (hasDrawnBefore) return
    const t1 = setTimeout(() => setFirstTimeVisible(true), 100)
    const t2 = setTimeout(() => setSubtextVisible(true), 600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [hasDrawnBefore])

  function handleChipClick(chipId: FocusArea) {
    if (selectedChip === chipId) {
      setSelectedChip(null)
    } else {
      setSelectedChip(chipId)
      if (chipId === 'custom-question') {
        textareaRef.current?.focus()
      }
    }
  }

  function handleSubmit() {
    if (!canSubmit) return
    onIntentionSet(intentionText, resolveEffectiveFocusArea(intentionText, selectedChip))
  }

  function getCounterColor(): string {
    if (charCount >= 280) return 'rgba(255, 120, 80, 0.7)'
    if (charCount >= 250) return 'rgba(201, 168, 76, 0.8)'
    return 'rgba(138, 134, 148, 0.45)'
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: '#0a0a0f' }}
    >
      <div className="w-full max-w-lg flex flex-col gap-8">
        {!hasDrawnBefore && (
          <p
            className="font-heading text-center"
            style={{
              fontSize: '16px',
              color: 'rgba(201, 168, 76, 0.5)',
              lineHeight: 2,
              opacity: firstTimeVisible ? 1 : 0,
              transition: 'opacity 800ms ease',
            }}
          >
            The cards speak differently to each person.
            <br />
            Before you draw, take a moment.
          </p>
        )}

        <div className="flex flex-col gap-2">
          <h1
            className="font-heading text-center"
            style={{ fontSize: '28px', color: 'rgba(201, 168, 76, 0.85)', letterSpacing: '0.02em' }}
          >
            What would you like clarity on today?
          </h1>
          <p
            className="text-center font-body text-sm"
            style={{
              color: 'rgba(138, 134, 148, 0.7)',
              opacity: subtextVisible ? 1 : 0,
              transition: 'opacity 600ms ease',
            }}
          >
            Your words will shape the reading.
          </p>
        </div>

        <div className="relative">
          <textarea
            ref={textareaRef}
            aria-label="Reading intention"
            placeholder="What are you seeking guidance on?"
            value={intentionText}
            onChange={e => setIntentionText(e.target.value)}
            maxLength={280}
            rows={3}
            className="w-full rounded-lg resize-none outline-none font-body"
            style={{
              minHeight: '80px',
              maxHeight: '200px',
              padding: '14px 16px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(201, 168, 76, 0.2)',
              color: 'rgba(232, 230, 227, 0.9)',
              fontSize: '16px',
              lineHeight: 1.6,
              transition: 'border-color 200ms ease',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.5)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.2)' }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              fontSize: '11px',
              color: getCounterColor(),
              opacity: charCount >= 50 ? 0.45 : 0,
              transition: 'opacity 300ms ease, color 200ms ease',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {charCount}/280
          </div>
        </div>

        <div role="radiogroup" aria-label="Focus area" className="flex flex-wrap gap-2">
          {FOCUS_CHIPS.map(chip => {
            const isSelected = selectedChip === chip.id
            return (
              <button
                key={chip.id}
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleChipClick(chip.id)}
                className="rounded-full font-body"
                style={{
                  height: '44px',
                  padding: '0 16px',
                  fontSize: '13px',
                  letterSpacing: '0.08em',
                  border: isSelected
                    ? '1px solid rgba(201, 168, 76, 0.7)'
                    : '1px solid rgba(201, 168, 76, 0.2)',
                  background: isSelected ? 'rgba(201, 168, 76, 0.08)' : 'transparent',
                  color: isSelected ? 'rgba(232, 230, 227, 0.95)' : 'rgba(138, 134, 148, 0.8)',
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                }}
              >
                {chip.label}
              </button>
            )
          })}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full rounded-lg font-body"
          style={{
            height: '52px',
            fontSize: '15px',
            letterSpacing: '0.04em',
            border: '1px solid rgba(201, 168, 76, 0.5)',
            background: canSubmit ? 'rgba(201, 168, 76, 0.08)' : 'transparent',
            color: canSubmit ? 'rgba(201, 168, 76, 0.9)' : 'rgba(138, 134, 148, 0.4)',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            transition: 'all 200ms ease',
          }}
        >
          Set Intention & Continue
        </button>

        <div className="flex justify-center">
          <button
            onClick={onSkip}
            aria-label="Skip intention and proceed to card draw"
            className="font-body"
            style={{
              minHeight: '44px',
              padding: '0 12px',
              background: 'transparent',
              border: 'none',
              fontSize: '13px',
              color: hasDrawnBefore
                ? 'rgba(138, 134, 148, 0.5)'
                : 'rgba(138, 134, 148, 0.3)',
              cursor: 'pointer',
            }}
          >
            Skip and draw
          </button>
        </div>
      </div>
    </div>
  )
}
