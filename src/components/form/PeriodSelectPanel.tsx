import { useState } from 'react'
import { type TransitPeriod } from '../../engine/transits'

export interface PeriodOption {
  id: TransitPeriod
  label: string
  icon: string
  description: string
}

interface PeriodSelectPanelProps {
  title: string
  subtitle: React.ReactNode
  description?: string
  periods: PeriodOption[]
  onSelect: (period: TransitPeriod) => void
  onCustomMonth: (month: string) => void
  onBack: () => void
  backLabel?: string
  error?: string | null
  accentColor?: 'gold' | 'pink'
  disabled?: boolean
}

export default function PeriodSelectPanel({
  title,
  subtitle,
  description,
  periods,
  onSelect,
  onCustomMonth,
  onBack,
  backLabel = '← Back',
  error,
  accentColor = 'gold',
  disabled,
}: PeriodSelectPanelProps) {
  const now = new Date()
  const [selMonth, setSelMonth] = useState(String(now.getMonth() + 1))
  const [selYear, setSelYear] = useState(String(now.getFullYear()))

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  const years = Array.from({ length: 6 }, (_, i) => String(now.getFullYear() + i))

  const isDisabled = disabled ?? false
  const gold = accentColor === 'gold'

  const handleCustomMonth = () => {
    onCustomMonth(`${selYear}-${selMonth.padStart(2, '0')}`)
  }

  return (
    <div className="w-full max-w-lg mx-auto text-center">
      <div className="bg-mystic-surface/50 border border-mystic-border rounded-xl p-8 mb-6">
        {gold ? (
          <p className="text-mystic-muted text-xs uppercase tracking-widest mb-2">{title}</p>
        ) : (
          <div className="inline-block px-3 py-1 rounded-full bg-pink-900/30 border border-pink-500/30 text-pink-400 text-xs uppercase tracking-widest mb-3">
            {title}
          </div>
        )}
        {subtitle}

        {description && (
          <p className="text-mystic-text/80 text-sm mb-6 leading-relaxed">{description}</p>
        )}

        <div className="space-y-3 mb-6">
          {periods.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              disabled={isDisabled}
              className={`w-full text-left px-5 py-4 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed group ${
                gold
                  ? 'bg-mystic-gold/5 border border-mystic-gold/20 hover:bg-mystic-gold/10 hover:border-mystic-gold/40'
                  : 'bg-pink-900/5 border border-pink-500/20 hover:bg-pink-900/10 hover:border-pink-500/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">{p.icon}</span>
                <div>
                  <span className={`font-heading text-lg ${gold ? 'text-mystic-gold group-hover:text-mystic-gold/90' : 'text-pink-400 group-hover:text-pink-300'}`}>
                    {p.label}
                  </span>
                  <p className="text-mystic-muted text-xs mt-1">{p.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mb-6 border-t border-mystic-border pt-4">
          <p className="text-mystic-muted text-xs uppercase tracking-widest mb-3">Or pick any month</p>
          <div className="flex gap-2">
            <select
              value={selMonth}
              onChange={e => setSelMonth(e.target.value)}
              className={`flex-1 px-3 py-2.5 bg-mystic-bg border border-mystic-border rounded-lg text-mystic-text text-sm focus:outline-none appearance-none cursor-pointer ${
                gold ? 'focus:border-mystic-gold/50' : 'focus:border-pink-500/50'
              }`}
            >
              {months.map((m, i) => (
                <option key={m} value={String(i + 1)}>{m}</option>
              ))}
            </select>
            <select
              value={selYear}
              onChange={e => setSelYear(e.target.value)}
              className={`w-24 px-3 py-2.5 bg-mystic-bg border border-mystic-border rounded-lg text-mystic-text text-sm focus:outline-none appearance-none cursor-pointer ${
                gold ? 'focus:border-mystic-gold/50' : 'focus:border-pink-500/50'
              }`}
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleCustomMonth}
              disabled={isDisabled}
              className={`px-5 py-2.5 font-heading rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm ${
                gold
                  ? 'bg-mystic-gold/10 border border-mystic-gold/30 text-mystic-gold hover:bg-mystic-gold/20 hover:border-mystic-gold/50'
                  : 'bg-pink-900/10 border border-pink-500/30 text-pink-400 hover:bg-pink-900/20 hover:border-pink-500/50'
              }`}
            >
              Read ☽
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 px-4 py-2 bg-mystic-surface border border-mystic-border text-mystic-muted font-heading rounded-lg hover:border-mystic-gold/40 hover:text-mystic-text transition-colors text-sm"
          >
            {backLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
