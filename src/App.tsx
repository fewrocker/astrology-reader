import { useEffect } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import FormWizard from './components/form/FormWizard'
import ResultsPage from './components/results/ResultsPage'
import { calculateChart } from './engine/astronomy'
import { calculateAspects } from './engine/aspects'
import { assembleReading } from './data/interpretations'

function AppContent() {
  const { state, dispatch } = useApp()

  // Run calculation when entering loading view
  useEffect(() => {
    if (state.view !== 'loading') return
    const { birthData } = state
    if (!birthData.city) return

    // defer to next tick so loading spinner renders
    const timer = setTimeout(() => {
      try {
        const chart = calculateChart(
          birthData.date,
          birthData.time,
          birthData.city!.lat,
          birthData.city!.lng,
          birthData.city!.tz,
          birthData.unknownTime,
        )
        const aspects = calculateAspects(chart.planets)
        const reading = assembleReading(chart, aspects, birthData.focusAreas[0])
        dispatch({ type: 'SET_RESULTS', chartData: chart, aspects, reading })
      } catch (e) {
        console.error('Calculation error:', e)
        dispatch({ type: 'SET_VIEW', view: 'form' })
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [state.view]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-mystic-bg flex flex-col items-center px-4 py-12">
      <header className="text-center mb-10">
        <h1 className="font-heading text-4xl md:text-5xl text-mystic-gold mb-2">Astral Chart</h1>
        <p className="text-mystic-muted text-sm tracking-wide">Your birth chart, decoded</p>
      </header>

      {state.view === 'form' && <FormWizard />}
      {state.view === 'loading' && (
        <div className="text-center py-24">
          <div className="text-4xl mb-4 animate-spin" style={{ animationDuration: '3s' }}>✦</div>
          <p className="text-mystic-gold font-heading text-xl animate-pulse">Calculating your chart...</p>
          <p className="text-mystic-muted text-sm mt-2">Mapping the heavens at the moment of your birth</p>
        </div>
      )}
      {state.view === 'results' && <ResultsPage />}
    </div>
  )
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

export default App
