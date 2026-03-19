import { useApp } from '../../context/AppContext'

export default function StepDate() {
  const { state, dispatch } = useApp()
  const { date } = state.birthData

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl text-mystic-gold mb-2">When were you born?</h2>
        <p className="text-mystic-muted text-sm">Your birth date determines your Sun sign and planetary positions.</p>
      </div>
      <div>
        <label htmlFor="birth-date" className="block text-sm text-mystic-muted mb-2">
          Date of Birth
        </label>
        <input
          id="birth-date"
          type="date"
          value={date}
          onChange={e => dispatch({ type: 'UPDATE_BIRTH_DATA', data: { date: e.target.value } })}
          className="w-full px-4 py-3 bg-mystic-surface border border-mystic-border rounded-lg text-mystic-text focus:outline-none focus:border-mystic-gold transition-colors [color-scheme:dark]"
          max={new Date().toISOString().split('T')[0]}
        />
      </div>
    </div>
  )
}
