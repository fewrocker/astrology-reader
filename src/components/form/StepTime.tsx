import { useApp } from '../../context/AppContext'

function parseTime(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(':').map(Number)
  return { hour: h, minute: m }
}

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export default function StepTime() {
  const { state, dispatch } = useApp()
  const { time, unknownTime } = state.birthData
  const { hour, minute } = parseTime(time)

  const update = (h: number, m: number) =>
    dispatch({ type: 'UPDATE_BIRTH_DATA', data: { time: formatTime(h, m) } })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl text-mystic-gold mb-2">What time were you born?</h2>
        <p className="text-mystic-muted text-sm">
          Birth time determines your Rising sign and house placements. If unknown, we'll use solar noon — but house and ascendant data will be less precise.
        </p>
      </div>
      <div>
        <label className="block text-sm text-mystic-muted mb-2">Time of Birth (24h format)</label>
        <div className="flex items-center gap-2">
          {/* Hour */}
          <input
            type="number"
            min={0}
            max={23}
            value={hour}
            onChange={e => {
              const v = Math.max(0, Math.min(23, Number(e.target.value) || 0))
              update(v, minute)
            }}
            disabled={unknownTime}
            aria-label="Hour"
            className="w-16 px-3 py-3 bg-mystic-surface border border-mystic-border rounded-lg text-mystic-text focus:outline-none focus:border-mystic-gold transition-colors disabled:opacity-40 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />

          <span className="text-mystic-muted text-xl font-light">:</span>

          {/* Minute */}
          <input
            type="number"
            min={0}
            max={59}
            value={String(minute).padStart(2, '0')}
            onChange={e => {
              const v = Math.max(0, Math.min(59, Number(e.target.value) || 0))
              update(hour, v)
            }}
            disabled={unknownTime}
            aria-label="Minute"
            className="w-16 px-3 py-3 bg-mystic-surface border border-mystic-border rounded-lg text-mystic-text focus:outline-none focus:border-mystic-gold transition-colors disabled:opacity-40 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
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
