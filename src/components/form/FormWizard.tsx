import { useState, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { saveProfile } from '../../services/authService'
import { track } from '../../services/analytics'
import CityAutocomplete from './CityAutocomplete'
import type { City } from '../../data/cityTypes'

export default function FormWizard() {
  const { state, dispatch } = useApp()
  const { isAuthenticated } = useAuth()
  const { birthData } = state
  const [errors, setErrors] = useState<string[]>([])
  const formStartedRef = useRef(false)

  const handleSubmit = () => {
    const errs: string[] = []
    if (!birthData.date) errs.push('Date of birth is required')
    if (!birthData.city) errs.push('Place of birth is required')
    setErrors(errs)
    if (errs.length > 0) return

    if (!formStartedRef.current) {
      formStartedRef.current = true
      track('form_started')
    }

    dispatch({ type: 'COMPLETE_FORM' })
    if (isAuthenticated) {
      saveProfile(birthData).catch(() => {
        dispatch({ type: 'SET_STORAGE_WARNING', message: 'Birth data saved locally — could not sync to server.' })
      })
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-mystic-surface/50 border border-mystic-border rounded-xl p-8 mb-6 glow-gold">

        <p className="text-mystic-muted text-xs uppercase tracking-widest mb-2">Your details</p>
        <h2 className="font-heading text-2xl text-mystic-gold mb-6">Your Birth Details</h2>

        {/* Name */}
        <div className="mb-5">
          <label htmlFor="your-name" className="block text-mystic-muted text-xs uppercase tracking-wider mb-2">
            Name (optional)
          </label>
          <input
            id="your-name"
            type="text"
            placeholder="e.g., Emma"
            value={birthData.userName ?? ''}
            onChange={e => dispatch({ type: 'UPDATE_BIRTH_DATA', data: { userName: e.target.value } })}
            className="w-full px-4 py-3 bg-mystic-bg border border-mystic-border rounded-lg text-mystic-text focus:border-mystic-gold/50 focus:outline-none"
            maxLength={40}
          />
        </div>

        {/* Date */}
        <div className="mb-5">
          <label className="block text-mystic-muted text-xs uppercase tracking-wider mb-2">
            Date of Birth
          </label>
          <input
            type="date"
            value={birthData.date}
            max={new Date().toISOString().split('T')[0]}
            onChange={e => dispatch({ type: 'UPDATE_BIRTH_DATA', data: { date: e.target.value } })}
            className="w-full px-4 py-3 bg-mystic-bg border border-mystic-border rounded-lg text-mystic-text focus:border-mystic-gold/50 focus:outline-none [color-scheme:dark]"
          />
        </div>

        {/* Time */}
        <div className="mb-5">
          <label className="block text-mystic-muted text-xs uppercase tracking-wider mb-2">
            Time of Birth
          </label>
          <input
            type="time"
            value={birthData.time}
            disabled={birthData.unknownTime}
            onChange={e => dispatch({ type: 'UPDATE_BIRTH_DATA', data: { time: e.target.value } })}
            className="w-full px-4 py-3 bg-mystic-bg border border-mystic-border rounded-lg text-mystic-text focus:border-mystic-gold/50 focus:outline-none disabled:opacity-40 [color-scheme:dark]"
          />
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={birthData.unknownTime}
              onChange={e =>
                dispatch({
                  type: 'UPDATE_BIRTH_DATA',
                  data: { unknownTime: e.target.checked, time: '12:00' },
                })
              }
              className="accent-mystic-gold"
            />
            <span className="text-mystic-muted text-xs">I don't know my birth time</span>
          </label>
        </div>

        {/* City */}
        <div className="mb-6">
          <label className="block text-mystic-muted text-xs uppercase tracking-wider mb-2">
            Place of Birth
          </label>
          <CityAutocomplete
            value={birthData.city}
            onChange={(city: City | null) => dispatch({ type: 'UPDATE_BIRTH_DATA', data: { city } })}
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

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full px-6 py-3 bg-mystic-gold text-mystic-bg font-heading rounded-lg hover:bg-mystic-gold/90 transition-colors"
        >
          Generate Reading ✦
        </button>
      </div>
    </div>
  )
}
