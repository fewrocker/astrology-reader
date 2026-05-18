import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react'
import { appReducer, initialState, saveBirthData, saveChartResults, saveTransitResults, savePartnerData, saveSynastryResults, type AppState, type AppAction } from './appState'
import { isGptError } from '../services/gptErrors'

const AppContext = createContext<{
  state: AppState
  dispatch: React.Dispatch<AppAction>
} | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  function onQuotaError(message: string) {
    dispatch({ type: 'SET_STORAGE_WARNING', message })
  }

  useEffect(() => {
    saveBirthData(state.birthData, onQuotaError)
  }, [state.birthData]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state.chartData && state.reading) {
      saveChartResults({ chartData: state.chartData, aspects: state.aspects, reading: state.reading }, onQuotaError)
    }
  }, [state.chartData, state.aspects, state.reading]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Do not cache GPT error strings — timeout or server errors must not be persisted (spec 11)
    if (state.transitData && state.transitInterpretation && state.transitPeriod && !isGptError(state.transitInterpretation)) {
      saveTransitResults({ transitPeriod: state.transitPeriod, transitData: state.transitData, transitInterpretation: state.transitInterpretation }, onQuotaError)
    }
  }, [state.transitData, state.transitInterpretation, state.transitPeriod]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    savePartnerData(state.partnerBirthData, onQuotaError)
  }, [state.partnerBirthData]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Do not cache GPT error strings — timeout or server errors must not be persisted (spec 11)
    if (state.partnerChartData && state.synastryData && state.synastryInterpretation && !isGptError(state.synastryInterpretation)) {
      saveSynastryResults({
        partnerChartData: state.partnerChartData,
        partnerAspects: state.partnerAspects,
        synastryData: state.synastryData,
        synastryInterpretation: state.synastryInterpretation,
      }, onQuotaError)
    }
  }, [state.partnerChartData, state.partnerAspects, state.synastryData, state.synastryInterpretation]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
