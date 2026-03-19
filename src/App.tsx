import { AppProvider, useApp } from './context/AppContext'
import FormWizard from './components/form/FormWizard'

function AppContent() {
  const { state } = useApp()

  return (
    <div className="min-h-screen bg-mystic-bg flex flex-col items-center justify-center px-4 py-12">
      <header className="text-center mb-10">
        <h1 className="font-heading text-4xl md:text-5xl text-mystic-gold mb-2">Astral Chart</h1>
        <p className="text-mystic-muted text-sm tracking-wide">Your birth chart, decoded</p>
      </header>

      {state.view === 'form' && <FormWizard />}
      {state.view === 'loading' && (
        <div className="text-center">
          <p className="text-mystic-gold font-heading text-xl animate-pulse">Calculating your chart...</p>
        </div>
      )}
      {state.view === 'results' && (
        <div className="text-center">
          <p className="text-mystic-text">Results will appear here.</p>
        </div>
      )}
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
