import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import CityAutocomplete from './CityAutocomplete'
import type { City } from '../../data/cityTypes'

export default function PartnerForm() {
  const { state, dispatch } = useApp()
  const { partnerBirthData, birthData } = state
  const [errors, setErrors] = useState<string[]>([])

  const person1City = birthData.city ? `${birthData.city.name}, ${birthData.city.country}` : ''

  const handleSubmit = () => {
    const errs: string[] = []
    if (!partnerBirthData.date) errs.push('Date of birth is required')
    if (!partnerBirthData.city) errs.push('Place of birth is required')
    setErrors(errs)
    if (errs.length > 0) return

    dispatch({ type: 'SET_VIEW', view: 'synastry-loading' })
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-mystic-surface/50 border border-mystic-border rounded-xl p-8 mb-6">
        {/* Header showing Person 1 */}
        <div className="mb-6 pb-4 border-b border-mystic-border">
          <p className="text-mystic-muted text-xs uppercase tracking-widest mb-1">Person 1</p>
          <p className="text-mystic-gold font-heading text-lg">
            {birthData.date} — {person1City}
          </p>
        </div>

        <p className="text-mystic-muted text-xs uppercase tracking-widest mb-2">Person 2</p>
        <h2 className="font-heading text-2xl text-mystic-gold mb-6">Partner's Birth Details</h2>

        {/* Date */}
        <div className="mb-5">
          <label className="block text-mystic-muted text-xs uppercase tracking-wider mb-2">
            Date of Birth
          </label>
          <input
            type="date"
            value={partnerBirthData.date}
            max={new Date().toISOString().split('T')[0]}
            onChange={e => dispatch({ type: 'UPDATE_PARTNER_DATA', data: { date: e.target.value } })}
            className="w-full px-4 py-3 bg-mystic-bg border border-mystic-border rounded-lg text-mystic-text focus:border-mystic-gold/50 focus:outline-none"
          />
        </div>

        {/* Time */}
        <div className="mb-5">
          <label className="block text-mystic-muted text-xs uppercase tracking-wider mb-2">
            Time of Birth
          </label>
          <input
            type="time"
            value={partnerBirthData.time}
            disabled={partnerBirthData.unknownTime}
            onChange={e => dispatch({ type: 'UPDATE_PARTNER_DATA', data: { time: e.target.value } })}
            className="w-full px-4 py-3 bg-mystic-bg border border-mystic-border rounded-lg text-mystic-text focus:border-mystic-gold/50 focus:outline-none disabled:opacity-40"
          />
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={partnerBirthData.unknownTime}
              onChange={e =>
                dispatch({
                  type: 'UPDATE_PARTNER_DATA',
                  data: { unknownTime: e.target.checked, time: '12:00' },
                })
              }
              className="accent-mystic-gold"
            />
            <span className="text-mystic-muted text-xs">I don't know the birth time</span>
          </label>
        </div>

        {/* City */}
        <div className="mb-6">
          <label className="block text-mystic-muted text-xs uppercase tracking-wider mb-2">
            Place of Birth
          </label>
          <CityAutocomplete
            value={partnerBirthData.city}
            onChange={(city: City | null) =>
              dispatch({ type: 'UPDATE_PARTNER_DATA', data: { city } })
            }
          />
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
            {errors.map((e, i) => (
              <p key={i} className="text-red-400 text-sm">{e}</p>
            ))}
          </div>
        )}

        {state.synastryError && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {state.synastryError}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_VIEW', view: 'form' })}
            className="flex-1 px-4 py-3 bg-mystic-surface border border-mystic-border text-mystic-muted font-heading rounded-lg hover:border-mystic-gold/40 hover:text-mystic-text transition-colors"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 px-6 py-3 bg-mystic-gold text-mystic-bg font-heading rounded-lg hover:bg-mystic-gold/90 transition-colors"
          >
            Analyze Compatibility ✦
          </button>
        </div>
      </div>
    </div>
  )
}
