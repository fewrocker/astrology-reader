import { useApp } from '../../context/AppContext'
import { FOCUS_AREAS, type FocusArea } from '../../context/appState'

export default function StepFocus() {
  const { state, dispatch } = useApp()
  const { focusAreas } = state.birthData

  const toggle = (id: FocusArea) => {
    const next = focusAreas.includes(id)
      ? focusAreas.filter(a => a !== id)
      : [...focusAreas, id]
    dispatch({ type: 'UPDATE_BIRTH_DATA', data: { focusAreas: next } })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl text-mystic-gold mb-2">What would you like to focus on?</h2>
        <p className="text-mystic-muted text-sm">
          Select the life areas you'd like your reading to emphasize. Leave all unselected for a full reading.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {FOCUS_AREAS.map(area => {
          const selected = focusAreas.includes(area.id)
          return (
            <button
              key={area.id}
              type="button"
              onClick={() => toggle(area.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all text-left ${
                selected
                  ? 'border-mystic-gold bg-mystic-gold/10 text-mystic-gold'
                  : 'border-mystic-border bg-mystic-surface text-mystic-text hover:border-mystic-muted'
              }`}
            >
              <span className="text-lg">{area.icon}</span>
              <span className="text-sm">{area.label}</span>
            </button>
          )
        })}
      </div>
      {focusAreas.length === 0 && (
        <p className="text-mystic-muted text-xs italic">No focus selected — you'll get a full reading covering all areas.</p>
      )}
    </div>
  )
}
