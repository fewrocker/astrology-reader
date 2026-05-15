import { useApp } from '../../context/AppContext'
import CityAutocomplete from './CityAutocomplete'

export default function StepPlace() {
  const { state, dispatch } = useApp()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl text-mystic-gold mb-2">Where were you born?</h2>
        <p className="text-mystic-muted text-sm">
          Your birth location determines your Rising sign and house positions via local sidereal time.
        </p>
      </div>
      <div>
        <label htmlFor="birth-city" className="block text-sm text-mystic-muted mb-2">
          City of Birth
        </label>
        <CityAutocomplete
          value={state.birthData.city}
          onChange={city => dispatch({ type: 'UPDATE_BIRTH_DATA', data: { city } })}
        />
      </div>
      {state.birthData.city && (
        <div className="text-sm text-mystic-muted">
          <span className="text-mystic-purple">Coordinates:</span>{' '}
          {state.birthData.city.lat.toFixed(4)}°, {state.birthData.city.lng.toFixed(4)}°
          <br />
          <span className="text-mystic-purple">Timezone:</span> {state.birthData.city.tz}
        </div>
      )}
      <div>
        <label htmlFor="your-name" className="block text-sm text-mystic-muted mb-2">
          Your name (optional)
        </label>
        <input
          id="your-name"
          type="text"
          placeholder="e.g., Emma"
          value={state.birthData.userName ?? ''}
          onChange={e => dispatch({ type: 'UPDATE_BIRTH_DATA', data: { userName: e.target.value } })}
          className="w-full px-4 py-3 bg-mystic-bg border border-mystic-border rounded-lg text-mystic-text focus:border-mystic-gold/50 focus:outline-none"
          maxLength={40}
        />
      </div>
    </div>
  )
}
