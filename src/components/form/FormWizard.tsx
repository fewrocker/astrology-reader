import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { saveProfile } from '../../services/authService'
import StepDate from './StepDate'
import StepTime from './StepTime'
import StepPlace from './StepPlace'

const STEPS = [
  { label: 'Date', component: StepDate },
  { label: 'Time', component: StepTime },
  { label: 'Place', component: StepPlace },
]

export default function FormWizard() {
  const { state, dispatch } = useApp()
  const { isAuthenticated } = useAuth()
  const { formStep, birthData } = state
  const StepComponent = STEPS[formStep].component

  const canNext = (): boolean => {
    switch (formStep) {
      case 0: return !!birthData.date
      case 1: return true // time always has default
      case 2: return !!birthData.city
      default: return false
    }
  }

  const handleNext = () => {
    if (formStep < STEPS.length - 1) {
      dispatch({ type: 'SET_STEP', step: formStep + 1 })
    } else {
      dispatch({ type: 'SET_VIEW', view: 'loading' })
      if (isAuthenticated) {
        saveProfile(birthData).catch(() => {
          dispatch({ type: 'SET_STORAGE_WARNING', message: 'Birth data saved locally — could not sync to server.' })
        })
      }
    }
  }

  const handleBack = () => {
    if (formStep > 0) {
      dispatch({ type: 'SET_STEP', step: formStep - 1 })
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {STEPS.map((step, i) => (
          <div key={step.label} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                i < formStep
                  ? 'bg-mystic-gold text-mystic-bg'
                  : i === formStep
                    ? 'border-2 border-mystic-gold text-mystic-gold'
                    : 'border border-mystic-border text-mystic-muted'
              }`}
            >
              {i < formStep ? '✓' : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-px mx-1 ${i < formStep ? 'bg-mystic-gold' : 'bg-mystic-border'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step label */}
      <div className="text-center mb-6">
        <span className="text-xs uppercase tracking-widest text-mystic-muted">
          Step {formStep + 1} of {STEPS.length} — {STEPS[formStep].label}
        </span>
      </div>

      {/* Step content */}
      <div className="bg-mystic-surface/50 border border-mystic-border rounded-xl p-6 mb-6 glow-gold step-enter" key={formStep}>
        <StepComponent />
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={formStep === 0}
          aria-label="Go to previous step"
          className="px-6 py-2 rounded-lg text-sm text-mystic-muted hover:text-mystic-text transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!canNext()}
          aria-label={formStep === STEPS.length - 1 ? 'Generate your birth chart reading' : 'Go to next step'}
          className="px-6 py-2 rounded-lg text-sm bg-mystic-gold text-mystic-bg font-medium hover:bg-mystic-gold/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {formStep === STEPS.length - 1 ? 'Generate Reading ✦' : 'Next →'}
        </button>
      </div>
    </div>
  )
}
