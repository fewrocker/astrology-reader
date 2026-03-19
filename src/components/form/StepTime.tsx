import { useApp } from '../../context/AppContext'

export default function StepTime() {
  const { state, dispatch } = useApp()
  const { time, unknownTime } = state.birthData

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl text-mystic-gold mb-2">What time were you born?</h2>
        <p className="text-mystic-muted text-sm">
          Birth time determines your Rising sign and house placements. If unknown, we'll use solar noon — but house and ascendant data will be less precise.
        </p>
      </div>
      <div>
        <label htmlFor="birth-time" className="block text-sm text-mystic-muted mb-2">
          Time of Birth
        </label>
        <input
          id="birth-time"
          type="time"
          value={unknownTime ? '' : time}
          onChange={e => dispatch({ type: 'UPDATE_BIRTH_DATA', data: { time: e.target.value } })}
          disabled={unknownTime}
          className="w-full px-4 py-3 bg-mystic-surface border border-mystic-border rounded-lg text-mystic-text focus:outline-none focus:border-mystic-gold transition-colors disabled:opacity-40 [color-scheme:dark]"
        />
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
