import { useApp } from '../../context/AppContext'

/** Parse "HH:MM" (24h) into 12h parts */
function parse24(time: string): { hour12: number; minute: string; period: 'AM' | 'PM' } {
  const [h, m] = time.split(':').map(Number)
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return { hour12, minute: String(m).padStart(2, '0'), period }
}

/** Build "HH:MM" (24h) from 12h parts */
function to24(hour12: number, minute: number, period: 'AM' | 'PM'): string {
  let h = hour12 % 12
  if (period === 'PM') h += 12
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export default function StepTime() {
  const { state, dispatch } = useApp()
  const { time, unknownTime } = state.birthData
  const parsed = parse24(time)

  const update = (h: number, m: number, p: 'AM' | 'PM') =>
    dispatch({ type: 'UPDATE_BIRTH_DATA', data: { time: to24(h, m, p) } })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl text-mystic-gold mb-2">What time were you born?</h2>
        <p className="text-mystic-muted text-sm">
          Birth time determines your Rising sign and house placements. If unknown, we'll use solar noon — but house and ascendant data will be less precise.
        </p>
      </div>
      <div>
        <label className="block text-sm text-mystic-muted mb-2">Time of Birth</label>
        <div className="flex items-center gap-2">
          {/* Hour */}
          <select
            value={parsed.hour12}
            onChange={e => update(Number(e.target.value), Number(parsed.minute), parsed.period)}
            disabled={unknownTime}
            aria-label="Hour"
            className="px-3 py-3 bg-mystic-surface border border-mystic-border rounded-lg text-mystic-text focus:outline-none focus:border-mystic-gold transition-colors disabled:opacity-40 appearance-none text-center"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>

          <span className="text-mystic-muted text-xl font-light">:</span>

          {/* Minute */}
          <select
            value={parsed.minute}
            onChange={e => update(parsed.hour12, Number(e.target.value), parsed.period)}
            disabled={unknownTime}
            aria-label="Minute"
            className="px-3 py-3 bg-mystic-surface border border-mystic-border rounded-lg text-mystic-text focus:outline-none focus:border-mystic-gold transition-colors disabled:opacity-40 appearance-none text-center"
          >
            {Array.from({ length: 60 }, (_, i) => (
              <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>
            ))}
          </select>

          {/* AM / PM */}
          <select
            value={parsed.period}
            onChange={e => update(parsed.hour12, Number(parsed.minute), e.target.value as 'AM' | 'PM')}
            disabled={unknownTime}
            aria-label="AM or PM"
            className="px-3 py-3 bg-mystic-surface border border-mystic-gold/40 rounded-lg text-mystic-gold font-medium focus:outline-none focus:border-mystic-gold transition-colors disabled:opacity-40 appearance-none text-center"
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
      </div>
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={unknownTime}
          onChange={e =>
            dispatch({
              type: 'UPDATE_BIRTH_DATA',
              data: { unknownTime: e.target.checked, time: e.target.checked ? '12:00' : time },
            })
          }
          className="w-4 h-4 accent-mystic-gold"
        />
        <span className="text-mystic-muted text-sm">I don't know my birth time</span>
      </label>
    </div>
  )
}
