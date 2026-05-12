import { useState, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import { calculateNumerology } from '../../engine/numerology'
import { getInterpretation, type NumerologyCategory } from '../../data/numerologyInterpretations'

interface NumberCardProps {
  label: string
  number: number
  category: NumerologyCategory
  badge?: string
}

function NumberCard({ label, number, category, badge }: NumberCardProps) {
  const [expanded, setExpanded] = useState(false)
  const interpretation = getInterpretation(category, number)
  if (!interpretation) return null

  const isMaster = number === 11 || number === 22 || number === 33

  return (
    <div className="bg-mystic-surface/50 border border-mystic-border rounded-xl overflow-hidden transition-all duration-300 hover:border-mystic-gold/30">
      <div className="p-6 md:p-8">
        {/* Top: number + archetype */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-5">
            <div className="relative">
              <span
                className="font-heading text-mystic-gold block leading-none select-none"
                style={{
                  fontSize: 'clamp(3rem, 8vw, 5rem)',
                  textShadow: isMaster
                    ? '0 0 30px rgba(201,168,76,0.6), 0 0 60px rgba(201,168,76,0.3)'
                    : '0 0 20px rgba(201,168,76,0.4)',
                }}
              >
                {number}
              </span>
              {isMaster && (
                <span className="absolute -top-1 -right-5 text-mystic-gold/60 text-xs font-heading">✦</span>
              )}
            </div>
            <div>
              <p className="text-mystic-muted text-xs uppercase tracking-widest mb-1">{label}</p>
              <h3 className="font-heading text-lg text-mystic-text">
                {number} — {interpretation.archetype}
              </h3>
              {isMaster && (
                <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full font-heading tracking-wider"
                  style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', color: 'rgba(201,168,76,0.9)' }}>
                  Master Number
                </span>
              )}
            </div>
          </div>
          {badge && (
            <span className="text-xs px-2 py-1 rounded-md text-mystic-muted border border-mystic-border">{badge}</span>
          )}
        </div>

        {/* Essence */}
        <p className="text-mystic-text/80 text-sm leading-relaxed mb-5">{interpretation.essence}</p>

        {/* Keywords */}
        <div className="flex flex-wrap gap-2 mb-4">
          {interpretation.keywords.map(kw => (
            <span key={kw} className="px-2.5 py-1 text-xs rounded-full text-mystic-gold/70 font-heading tracking-wide"
              style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
              {kw}
            </span>
          ))}
        </div>

        {/* Shadow toggle */}
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-2 text-mystic-muted text-xs hover:text-mystic-text transition-colors group"
        >
          <span className={`transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>›</span>
          <span>{expanded ? 'Hide' : 'Show'} shadow &amp; challenge</span>
        </button>

        {expanded && (
          <div className="mt-4 pl-4 border-l border-mystic-border/60">
            <p className="text-mystic-muted text-sm leading-relaxed italic">{interpretation.shadow}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function NumerologyPage() {
  const { state, dispatch } = useApp()
  const { birthData } = state
  const [nameInput, setNameInput] = useState(birthData.userName ?? '')
  const [editingName, setEditingName] = useState(!birthData.userName)

  const reading = useMemo(
    () => calculateNumerology(birthData.date, birthData.userName || undefined),
    [birthData.date, birthData.userName],
  )

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-')
    return `${m}/${day}/${y}`
  }

  const handleSaveName = () => {
    const trimmed = nameInput.trim()
    dispatch({ type: 'SET_USER_NAME', name: trimmed || undefined })
    setEditingName(false)
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <p className="text-mystic-muted text-xs uppercase tracking-widest mb-2">Sacred Numbers</p>
        <h2 className="font-heading text-3xl text-mystic-gold mb-1">✦ Your Numerology Reading</h2>
        <p className="text-mystic-muted text-sm">Born {formatDate(birthData.date)}</p>
      </div>

      {/* Name input for Expression Number */}
      <div className="mb-8 bg-mystic-surface/30 border border-mystic-border rounded-xl p-5">
        <p className="text-mystic-muted text-xs uppercase tracking-widest mb-3">Expression Number</p>
        {editingName ? (
          <div className="flex gap-3 items-center">
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveName()}
              placeholder="Enter your full birth name for Expression Number"
              className="flex-1 px-4 py-2.5 bg-mystic-bg border border-mystic-border rounded-lg text-mystic-text text-sm focus:border-mystic-gold/50 focus:outline-none placeholder:text-mystic-muted/50"
            />
            <button
              type="button"
              onClick={handleSaveName}
              className="px-4 py-2.5 font-heading text-sm rounded-lg transition-all"
              style={{
                background: 'rgba(201,168,76,0.12)',
                border: '1px solid rgba(201,168,76,0.35)',
                color: 'rgba(201,168,76,0.9)',
              }}
            >
              ✦ Add
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-mystic-text text-sm">
              <span className="text-mystic-muted">Name: </span>
              <span className="text-mystic-gold font-heading">{birthData.userName}</span>
            </p>
            <button
              type="button"
              onClick={() => { setNameInput(birthData.userName ?? ''); setEditingName(true) }}
              className="text-mystic-muted text-xs hover:text-mystic-text transition-colors"
            >
              Edit
            </button>
          </div>
        )}
        {!birthData.userName && !editingName && (
          <p className="text-mystic-muted/60 text-xs mt-2">Add your full birth name to reveal your Expression Number.</p>
        )}
      </div>

      {/* Number cards */}
      <div className="space-y-5 mb-10">
        <NumberCard
          label="Life Path"
          number={reading.lifePath}
          category="lifePath"
        />
        <NumberCard
          label="Birthday Number"
          number={reading.birthdayNumber}
          category="birthdayNumber"
        />
        <NumberCard
          label="Personal Year"
          number={reading.personalYear}
          category="personalYear"
          badge={String(new Date().getFullYear())}
        />
        {reading.expressionNumber ? (
          <NumberCard
            label="Expression Number"
            number={reading.expressionNumber}
            category="expressionNumber"
          />
        ) : (
          <div className="bg-mystic-surface/20 border border-dashed border-mystic-border rounded-xl p-6 text-center">
            <p className="text-mystic-gold/50 font-heading text-lg mb-1">Expression Number</p>
            <p className="text-mystic-muted text-sm">Enter your full birth name above to reveal your Expression Number.</p>
          </div>
        )}
      </div>

      {/* Back button */}
      <div className="text-center mb-12">
        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_VIEW', view: 'form' })}
          className="px-8 py-3 bg-mystic-gold/10 border border-mystic-gold/30 text-mystic-gold font-heading rounded-lg hover:bg-mystic-gold/20 transition-colors"
        >
          ← Back to Menu
        </button>
      </div>
    </div>
  )
}
