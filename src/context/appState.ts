import type { City } from '../data/cityTypes'

export type FocusArea =
  | 'love'
  | 'career'
  | 'growth'
  | 'health'
  | 'finances'
  | 'spirituality'

export const FOCUS_AREAS: { id: FocusArea; label: string; icon: string }[] = [
  { id: 'love', label: 'Love & Relationships', icon: '♡' },
  { id: 'career', label: 'Career & Purpose', icon: '★' },
  { id: 'growth', label: 'Personal Growth', icon: '◈' },
  { id: 'health', label: 'Health & Wellness', icon: '☘' },
  { id: 'finances', label: 'Finances', icon: '◆' },
  { id: 'spirituality', label: 'Spirituality', icon: '☽' },
]

export interface BirthData {
  date: string // YYYY-MM-DD
  time: string // HH:MM (24h)
  unknownTime: boolean
  city: City | null
  focusAreas: FocusArea[]
}

export type AppView = 'form' | 'loading' | 'results'

export interface AppState {
  view: AppView
  formStep: number
  birthData: BirthData
}

export type AppAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'UPDATE_BIRTH_DATA'; data: Partial<BirthData> }
  | { type: 'SET_VIEW'; view: AppView }
  | { type: 'RESET' }

export const initialBirthData: BirthData = {
  date: '',
  time: '12:00',
  unknownTime: false,
  city: null,
  focusAreas: [],
}

export const initialState: AppState = {
  view: 'form',
  formStep: 0,
  birthData: { ...initialBirthData },
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, formStep: action.step }
    case 'UPDATE_BIRTH_DATA':
      return { ...state, birthData: { ...state.birthData, ...action.data } }
    case 'SET_VIEW':
      return { ...state, view: action.view }
    case 'RESET':
      return { ...initialState }
    default:
      return state
  }
}
