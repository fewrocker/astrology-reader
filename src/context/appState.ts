import type { City } from '../data/cityTypes'
import type { ChartData } from '../engine/types'
import type { Aspect } from '../engine/aspects'
import type { FullReading } from '../data/interpretations'
import type { TransitData, TransitPeriod } from '../engine/transits'
import type { SynastryData } from '../engine/synastry'
import type { SolarReturnData } from '../engine/solarReturn'

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
  userName?: string
}

export type AppView = 'form' | 'loading' | 'results' | 'transit-select' | 'transit-loading' | 'transit-results'
  | 'partner-form' | 'synastry-loading' | 'synastry-results'
  | 'synastry-transit-select' | 'synastry-transit-loading' | 'synastry-transit-results'
  | 'numerology'
  | 'solar-return-loading' | 'solar-return'

export interface AppState {
  view: AppView
  formStep: number
  birthData: BirthData
  chartData: ChartData | null
  aspects: Aspect[]
  reading: FullReading | null
  // Transit reading state
  pendingTransit: boolean
  transitPeriod: TransitPeriod | null
  transitData: TransitData | null
  transitInterpretation: string | null
  transitLoading: boolean
  transitError: string | null
  // Synastry state
  partnerBirthData: BirthData
  partnerChartData: ChartData | null
  partnerAspects: Aspect[]
  synastryData: SynastryData | null
  synastryInterpretation: string | null
  synastryTransitPeriod: TransitPeriod | null
  synastryTransitData: TransitData | null
  synastryTransitInterpretation: string | null
  synastryError: string | null
  transitTargetMonth: string | null
  synastryTransitTargetMonth: string | null
  // Solar Return state
  solarReturnData: SolarReturnData | null
  solarReturnInterpretation: string | null
  solarReturnTargetYear: number | null
  solarReturnError: string | null
}

export type AppAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'UPDATE_BIRTH_DATA'; data: Partial<BirthData> }
  | { type: 'SET_VIEW'; view: AppView }
  | { type: 'SET_RESULTS'; chartData: ChartData; aspects: Aspect[]; reading: FullReading }
  | { type: 'RESET' }
  | { type: 'CLEAR_CACHE' }
  | { type: 'START_TRANSIT'; period: TransitPeriod; targetMonth?: string }
  | { type: 'PENDING_TRANSIT' }
  | { type: 'SET_TRANSIT_RESULTS'; transitData: TransitData; interpretation: string }
  | { type: 'SET_TRANSIT_ERROR'; error: string }
  | { type: 'UPDATE_PARTNER_DATA'; data: Partial<BirthData> }
  | { type: 'CACHE_NATAL_CHART'; chartData: ChartData; aspects: Aspect[]; reading: FullReading }
  | { type: 'SET_SYNASTRY_RESULTS'; partnerChartData: ChartData; partnerAspects: Aspect[]; synastryData: SynastryData; interpretation: string }
  | { type: 'SET_SYNASTRY_ERROR'; error: string }
  | { type: 'START_SYNASTRY_TRANSIT'; period: TransitPeriod; targetMonth?: string }
  | { type: 'SET_SYNASTRY_TRANSIT_RESULTS'; transitData: TransitData; interpretation: string }
  | { type: 'SET_SYNASTRY_TRANSIT_ERROR'; error: string }
  | { type: 'SET_USER_NAME'; name: string | undefined }
  | { type: 'START_SOLAR_RETURN'; targetYear?: number }
  | { type: 'SET_SOLAR_RETURN_RESULTS'; data: SolarReturnData; interpretation: string }
  | { type: 'SET_SOLAR_RETURN_ERROR'; error: string }

export const initialBirthData: BirthData = {
  date: '',
  time: '12:00',
  unknownTime: false,
  city: null,
  focusAreas: [],
  userName: undefined,
}

const BIRTH_DATA_CACHE_KEY = 'astral-chart-birth-data'
const CHART_RESULTS_CACHE_KEY = 'astral-chart-results'
const TRANSIT_RESULTS_CACHE_KEY = 'astral-chart-transit-results'
const PARTNER_DATA_CACHE_KEY = 'astral-chart-partner-data'
const SYNASTRY_RESULTS_CACHE_KEY = 'astral-chart-synastry-results'

export function loadCachedBirthData(): BirthData {
  try {
    const raw = localStorage.getItem(BIRTH_DATA_CACHE_KEY)
    if (!raw) return { ...initialBirthData }
    const cached = JSON.parse(raw) as Partial<BirthData>
    return {
      date: typeof cached.date === 'string' ? cached.date : '',
      time: typeof cached.time === 'string' ? cached.time : '12:00',
      unknownTime: typeof cached.unknownTime === 'boolean' ? cached.unknownTime : false,
      city: cached.city && typeof cached.city === 'object' ? cached.city : null,
      focusAreas: Array.isArray(cached.focusAreas) ? cached.focusAreas : [],
      userName: typeof cached.userName === 'string' ? cached.userName : undefined,
    }
  } catch {
    return { ...initialBirthData }
  }
}

export function saveBirthData(data: BirthData): void {
  try {
    localStorage.setItem(BIRTH_DATA_CACHE_KEY, JSON.stringify(data))
  } catch {
    // localStorage may be unavailable — silently ignore
  }
}

export function clearBirthDataCache(): void {
  try {
    localStorage.removeItem(BIRTH_DATA_CACHE_KEY)
    localStorage.removeItem(CHART_RESULTS_CACHE_KEY)
    localStorage.removeItem(TRANSIT_RESULTS_CACHE_KEY)
    localStorage.removeItem(PARTNER_DATA_CACHE_KEY)
    localStorage.removeItem(SYNASTRY_RESULTS_CACHE_KEY)
  } catch {
    // silently ignore
  }
}

export function savePartnerData(data: BirthData): void {
  try {
    localStorage.setItem(PARTNER_DATA_CACHE_KEY, JSON.stringify(data))
  } catch { /* ignore */ }
}

export function loadCachedPartnerData(): BirthData {
  try {
    const raw = localStorage.getItem(PARTNER_DATA_CACHE_KEY)
    if (!raw) return { ...initialBirthData }
    const cached = JSON.parse(raw) as Partial<BirthData>
    return {
      date: typeof cached.date === 'string' ? cached.date : '',
      time: typeof cached.time === 'string' ? cached.time : '12:00',
      unknownTime: typeof cached.unknownTime === 'boolean' ? cached.unknownTime : false,
      city: cached.city && typeof cached.city === 'object' ? cached.city : null,
      focusAreas: [],
    }
  } catch {
    return { ...initialBirthData }
  }
}

export interface CachedSynastryResults {
  partnerChartData: ChartData
  partnerAspects: Aspect[]
  synastryData: SynastryData
  synastryInterpretation: string
}

export function saveSynastryResults(data: CachedSynastryResults): void {
  try {
    localStorage.setItem(SYNASTRY_RESULTS_CACHE_KEY, JSON.stringify(data))
  } catch { /* ignore */ }
}

export function loadCachedSynastryResults(): CachedSynastryResults | null {
  try {
    const raw = localStorage.getItem(SYNASTRY_RESULTS_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CachedSynastryResults
  } catch {
    return null
  }
}

export interface CachedChartResults {
  chartData: ChartData
  aspects: Aspect[]
  reading: FullReading
}

export function saveChartResults(data: CachedChartResults): void {
  try {
    localStorage.setItem(CHART_RESULTS_CACHE_KEY, JSON.stringify(data))
  } catch { /* ignore */ }
}

export function loadCachedChartResults(): CachedChartResults | null {
  try {
    const raw = localStorage.getItem(CHART_RESULTS_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CachedChartResults
  } catch {
    return null
  }
}

export interface CachedTransitResults {
  transitPeriod: TransitPeriod
  transitData: TransitData
  transitInterpretation: string
}

export function saveTransitResults(data: CachedTransitResults): void {
  try {
    localStorage.setItem(TRANSIT_RESULTS_CACHE_KEY, JSON.stringify(data))
  } catch { /* ignore */ }
}

export function loadCachedTransitResults(): CachedTransitResults | null {
  try {
    const raw = localStorage.getItem(TRANSIT_RESULTS_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CachedTransitResults
  } catch {
    return null
  }
}

export function hasCachedBirthData(): boolean {
  const data = loadCachedBirthData()
  return !!data.date && !!data.city
}

function buildInitialState(): AppState {
  const cachedChart = loadCachedChartResults()
  const cachedTransit = loadCachedTransitResults()
  const cachedSynastry = loadCachedSynastryResults()
  return {
    view: 'form',
    formStep: 0,
    birthData: loadCachedBirthData(),
    chartData: cachedChart?.chartData ?? null,
    aspects: cachedChart?.aspects ?? [],
    reading: cachedChart?.reading ?? null,
    pendingTransit: false,
    transitPeriod: cachedTransit?.transitPeriod ?? null,
    transitData: cachedTransit?.transitData ?? null,
    transitInterpretation: cachedTransit?.transitInterpretation ?? null,
    transitLoading: false,
    transitError: null,
    partnerBirthData: loadCachedPartnerData(),
    partnerChartData: cachedSynastry?.partnerChartData ?? null,
    partnerAspects: cachedSynastry?.partnerAspects ?? [],
    synastryData: cachedSynastry?.synastryData ?? null,
    synastryInterpretation: cachedSynastry?.synastryInterpretation ?? null,
    synastryTransitPeriod: null,
    synastryTransitData: null,
    synastryTransitInterpretation: null,
    synastryError: null,
    transitTargetMonth: null,
    synastryTransitTargetMonth: null,
    solarReturnData: null,
    solarReturnInterpretation: null,
    solarReturnTargetYear: null,
    solarReturnError: null,
  }
}

export const initialState: AppState = buildInitialState()

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, formStep: action.step }
    case 'UPDATE_BIRTH_DATA':
      return { ...state, birthData: { ...state.birthData, ...action.data } }
    case 'SET_VIEW':
      return { ...state, view: action.view }
    case 'SET_RESULTS':
      return { ...state, chartData: action.chartData, aspects: action.aspects, reading: action.reading, view: state.pendingTransit ? 'transit-select' : 'results', pendingTransit: false }
    case 'RESET':
      return { ...initialState, birthData: loadCachedBirthData() }
    case 'CLEAR_CACHE':
      clearBirthDataCache()
      return { ...initialState, birthData: { ...initialBirthData } }
    case 'START_TRANSIT':
      return { ...state, view: 'transit-loading', transitPeriod: action.period, transitTargetMonth: action.targetMonth ?? null, transitData: null, transitInterpretation: null, transitError: null, transitLoading: true }
    case 'PENDING_TRANSIT':
      return { ...state, pendingTransit: true }
    case 'SET_TRANSIT_RESULTS':
      return { ...state, view: 'transit-results', transitData: action.transitData, transitInterpretation: action.interpretation, transitLoading: false }
    case 'SET_TRANSIT_ERROR':
      return { ...state, transitError: action.error, transitLoading: false, view: 'transit-select' }
    case 'CACHE_NATAL_CHART':
      return { ...state, chartData: action.chartData, aspects: action.aspects, reading: action.reading }
    case 'UPDATE_PARTNER_DATA':
      return { ...state, partnerBirthData: { ...state.partnerBirthData, ...action.data } }
    case 'SET_SYNASTRY_RESULTS':
      return { ...state, partnerChartData: action.partnerChartData, partnerAspects: action.partnerAspects, synastryData: action.synastryData, synastryInterpretation: action.interpretation, synastryError: null, view: 'synastry-results' }
    case 'SET_SYNASTRY_ERROR':
      return { ...state, synastryError: action.error, view: 'partner-form' }
    case 'START_SYNASTRY_TRANSIT':
      return { ...state, view: 'synastry-transit-loading', synastryTransitPeriod: action.period, synastryTransitTargetMonth: action.targetMonth ?? null, synastryTransitData: null, synastryTransitInterpretation: null, synastryError: null }
    case 'SET_SYNASTRY_TRANSIT_RESULTS':
      return { ...state, view: 'synastry-transit-results', synastryTransitData: action.transitData, synastryTransitInterpretation: action.interpretation }
    case 'SET_SYNASTRY_TRANSIT_ERROR':
      return { ...state, synastryError: action.error, view: 'synastry-transit-select' }
    case 'SET_USER_NAME':
      return { ...state, birthData: { ...state.birthData, userName: action.name } }
    case 'START_SOLAR_RETURN':
      return { ...state, view: 'solar-return-loading', solarReturnData: null, solarReturnInterpretation: null, solarReturnTargetYear: action.targetYear ?? null, solarReturnError: null }
    case 'SET_SOLAR_RETURN_RESULTS':
      return { ...state, view: 'solar-return', solarReturnData: action.data, solarReturnInterpretation: action.interpretation, solarReturnTargetYear: action.data.targetYear }
    case 'SET_SOLAR_RETURN_ERROR':
      return { ...state, solarReturnError: action.error, view: 'form' }
    default:
      return state
  }
}
