import { createContext, useContext, useReducer } from 'react'
import type { ReactNode } from 'react'
import type { DrawnCard, InstantInterpretation, TarotAstroContext } from '../engine/tarot'

export type { DrawnCard, InstantInterpretation, TarotAstroContext }

export interface SpreadMode {
  id: string
  label: string
  positions: string[]
}

export type TarotSubView =
  | 'home'
  | 'shuffle-ritual'
  | 'single-reading'
  | 'three-reading'
  | 'celtic-reading'
  | 'saved-readings'

export type ReadingMode = 'single' | 'three' | 'celtic'

export interface TarotState {
  subView: TarotSubView
  readingMode: ReadingMode | null
  userIntention: string
  drawnCards: DrawnCard[]
  reversals: boolean[]
  instantInterpretations: InstantInterpretation[]
  spreadMode: SpreadMode | null
  gptSynthesis: string | null
  gptSynthesisStatus: 'idle' | 'loading' | 'success' | 'error' | 'rate-limited'
  gptSynthesisError: string | null
  savedReadingIds: string[]
  currentReadingId: string | null
  // Card indices drawn during the shuffle ritual — fed into the reading flow
  ritualCardIndices: number[]
}

export type TarotAction =
  | { type: 'NAVIGATE_TAROT'; subView: TarotSubView }
  | { type: 'SET_INTENTION'; intention: string }
  | { type: 'SET_READING_MODE'; mode: ReadingMode }
  | { type: 'SET_SPREAD_MODE'; spreadMode: SpreadMode }
  | { type: 'SET_DRAWN_CARDS'; cards: DrawnCard[]; reversals: boolean[] }
  | { type: 'SET_INSTANT_INTERPRETATIONS'; interpretations: InstantInterpretation[] }
  | { type: 'SET_GPT_SYNTHESIS_STATUS'; status: TarotState['gptSynthesisStatus'] }
  | { type: 'SET_GPT_SYNTHESIS'; synthesis: string }
  | { type: 'SET_GPT_SYNTHESIS_ERROR'; error: string }
  | { type: 'SAVE_READING'; readingId: string }
  | { type: 'RESET_READING' }
  | { type: 'SET_RITUAL_CARD_INDICES'; indices: number[] }

const initialTarotState: TarotState = {
  subView: 'home',
  readingMode: null,
  userIntention: '',
  drawnCards: [],
  reversals: [],
  instantInterpretations: [],
  spreadMode: null,
  gptSynthesis: null,
  gptSynthesisStatus: 'idle',
  gptSynthesisError: null,
  savedReadingIds: [],
  currentReadingId: null,
  ritualCardIndices: [],
}

function tarotReducer(state: TarotState, action: TarotAction): TarotState {
  switch (action.type) {
    case 'NAVIGATE_TAROT':
      return { ...state, subView: action.subView }
    case 'SET_INTENTION':
      return { ...state, userIntention: action.intention }
    case 'SET_READING_MODE':
      return { ...state, readingMode: action.mode }
    case 'SET_SPREAD_MODE':
      return { ...state, spreadMode: action.spreadMode }
    case 'SET_DRAWN_CARDS':
      return { ...state, drawnCards: action.cards, reversals: action.reversals }
    case 'SET_INSTANT_INTERPRETATIONS':
      return { ...state, instantInterpretations: action.interpretations }
    case 'SET_GPT_SYNTHESIS_STATUS':
      return { ...state, gptSynthesisStatus: action.status }
    case 'SET_GPT_SYNTHESIS':
      return { ...state, gptSynthesis: action.synthesis, gptSynthesisStatus: 'success' }
    case 'SET_GPT_SYNTHESIS_ERROR':
      return { ...state, gptSynthesisError: action.error, gptSynthesisStatus: 'error' }
    case 'SAVE_READING':
      return {
        ...state,
        currentReadingId: action.readingId,
        savedReadingIds: state.savedReadingIds.includes(action.readingId)
          ? state.savedReadingIds
          : [...state.savedReadingIds, action.readingId],
      }
    case 'SET_RITUAL_CARD_INDICES':
      return { ...state, ritualCardIndices: action.indices }
    case 'RESET_READING':
      return {
        ...state,
        drawnCards: [],
        reversals: [],
        instantInterpretations: [],
        gptSynthesis: null,
        gptSynthesisStatus: 'idle',
        gptSynthesisError: null,
        readingMode: null,
        spreadMode: null,
        userIntention: '',
        ritualCardIndices: [],
      }
    default:
      return state
  }
}

interface TarotContextValue {
  state: TarotState
  dispatch: React.Dispatch<TarotAction>
  astroContext: TarotAstroContext | null
}

const TarotContext = createContext<TarotContextValue | null>(null)

export function TarotProvider({
  children,
  astroContext,
}: {
  children: ReactNode
  astroContext: TarotAstroContext | null
}) {
  const [state, dispatch] = useReducer(tarotReducer, initialTarotState)
  return (
    <TarotContext.Provider value={{ state, dispatch, astroContext }}>
      {children}
    </TarotContext.Provider>
  )
}

export function useTarot(): TarotContextValue {
  const ctx = useContext(TarotContext)
  if (!ctx) throw new Error('useTarot must be used within TarotProvider')
  return ctx
}
