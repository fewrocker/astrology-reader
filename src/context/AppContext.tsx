import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react'
import { appReducer, initialState, saveBirthData, saveChartResults, saveTransitResults, savePartnerData, saveSynastryResults, type AppState, type AppAction } from './appState'

const AppContext = createContext<{
  state: AppState
  dispatch: React.Dispatch<AppAction>
} | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  useEffect(() => {
    saveBirthData(state.birthData)
  }, [state.birthData])

  useEffect(() => {
    if (state.chartData && state.reading) {
      saveChartResults({ chartData: state.chartData, aspects: state.aspects, reading: state.reading })
    }
  }, [state.chartData, state.aspects, state.reading])

  useEffect(() => {
    if (state.transitData && state.transitInterpretation && state.transitPeriod) {
      saveTransitResults({ transitPeriod: state.transitPeriod, transitData: state.transitData, transitInterpretation: state.transitInterpretation })
    }
  }, [state.transitData, state.transitInterpretation, state.transitPeriod])

  useEffect(() => {
    savePartnerData(state.partnerBirthData)
  }, [state.partnerBirthData])

  useEffect(() => {
    if (state.partnerChartData && state.synastryData && state.synastryInterpretation) {
      saveSynastryResults({
        partnerChartData: state.partnerChartData,
        partnerAspects: state.partnerAspects,
        synastryData: state.synastryData,
        synastryInterpretation: state.synastryInterpretation,
      })
    }
  }, [state.partnerChartData, state.partnerAspects, state.synastryData, state.synastryInterpretation])

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
