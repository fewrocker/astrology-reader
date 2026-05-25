import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type TarotReadingType = 'single' | 'three-card' | 'celtic-cross'

export type TarotView =
  | 'intention'
  | 'mode-select'
  | 'draw'
  | 'reveal'
  | 'interpretation'
  | 'synthesis'
  | 'saved'

export interface DrawnCard {
  cardId: string
  reversed: boolean
  position: number
  spreadPositionLabel: string
}

export interface InstantInterpretation {
  cardId: string
  uprightMeaning: string
  reversedMeaning: string
  emotionalMeaning: string
  practicalGuidance: string
  reflectionQuestion: string
  numerologyResonance: string
  astroHeadline: string
  transitInfluence: string
}

export type SynthesisStatus = 'idle' | 'loading' | 'success' | 'unavailable' | 'rate-limited'

export interface TarotState {
  tarotView: TarotView
  readingType: TarotReadingType | null
  spreadMode: string | null
  userIntention: string
  drawnCards: DrawnCard[]
  interpretations: InstantInterpretation[]
  revealIndex: number
  synthesisStatus: SynthesisStatus
  synthesisText: string | null
  savedReadingIds: string[]
}

interface TarotContextType {
  tarot: TarotState
  setTarotView: (view: TarotView) => void
  setReadingType: (type: TarotReadingType | null) => void
  setSpreadMode: (mode: string | null) => void
  setUserIntention: (intention: string) => void
  setDrawnCards: (cards: DrawnCard[]) => void
  setInterpretations: (interpretations: InstantInterpretation[]) => void
  setRevealIndex: (index: number) => void
  setSynthesisStatus: (status: SynthesisStatus) => void
  setSynthesisText: (text: string | null) => void
  setSavedReadingIds: (ids: string[]) => void
}

const TarotContext = createContext<TarotContextType | null>(null)

const initialTarotState: TarotState = {
  tarotView: 'intention',
  readingType: null,
  spreadMode: null,
  userIntention: '',
  drawnCards: [],
  interpretations: [],
  revealIndex: 0,
  synthesisStatus: 'idle',
  synthesisText: null,
  savedReadingIds: [],
}

export function TarotProvider({ children }: { children: ReactNode }) {
  const [tarot, setTarot] = useState<TarotState>(initialTarotState)

  const setTarotView = useCallback((view: TarotView) => {
    setTarot(prev => ({ ...prev, tarotView: view }))
  }, [])

  const setReadingType = useCallback((type: TarotReadingType | null) => {
    setTarot(prev => ({ ...prev, readingType: type }))
  }, [])

  const setSpreadMode = useCallback((mode: string | null) => {
    setTarot(prev => ({ ...prev, spreadMode: mode }))
  }, [])

  const setUserIntention = useCallback((intention: string) => {
    setTarot(prev => ({ ...prev, userIntention: intention }))
  }, [])

  const setDrawnCards = useCallback((cards: DrawnCard[]) => {
    setTarot(prev => ({ ...prev, drawnCards: cards }))
  }, [])

  const setInterpretations = useCallback((interpretations: InstantInterpretation[]) => {
    setTarot(prev => ({ ...prev, interpretations }))
  }, [])

  const setRevealIndex = useCallback((index: number) => {
    setTarot(prev => ({ ...prev, revealIndex: index }))
  }, [])

  const setSynthesisStatus = useCallback((status: SynthesisStatus) => {
    setTarot(prev => ({ ...prev, synthesisStatus: status }))
  }, [])

  const setSynthesisText = useCallback((text: string | null) => {
    setTarot(prev => ({ ...prev, synthesisText: text }))
  }, [])

  const setSavedReadingIds = useCallback((ids: string[]) => {
    setTarot(prev => ({ ...prev, savedReadingIds: ids }))
  }, [])

  return (
    <TarotContext.Provider value={{
      tarot,
      setTarotView,
      setReadingType,
      setSpreadMode,
      setUserIntention,
      setDrawnCards,
      setInterpretations,
      setRevealIndex,
      setSynthesisStatus,
      setSynthesisText,
      setSavedReadingIds,
    }}>
      {children}
    </TarotContext.Provider>
  )
}

export function useTarot(): TarotContextType {
  const ctx = useContext(TarotContext)
  if (!ctx) throw new Error('useTarot must be used within TarotProvider')
  return ctx
}
