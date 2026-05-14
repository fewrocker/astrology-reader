import type { BirthData } from '../context/appState'

export const AUTH_TOKEN_KEY = 'astral-auth-token'

type ApiError = 'offline' | 'unauthorized' | 'server-error'

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError; status?: number }

export async function apiClient<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000,
): Promise<ApiResult<T>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
    const res = await fetch(url, { ...options, headers, signal: controller.signal })
    clearTimeout(timer)
    if (res.status === 401) return { ok: false, error: 'unauthorized', status: 401 }
    if (!res.ok) return { ok: false, error: 'server-error', status: res.status }
    const data = await res.json() as T
    return { ok: true, data }
  } catch (e) {
    clearTimeout(timer)
    if (e instanceof Error && (e.name === 'AbortError' || e instanceof TypeError)) {
      return { ok: false, error: 'offline' }
    }
    if (e instanceof TypeError) return { ok: false, error: 'offline' }
    return { ok: false, error: 'server-error' }
  }
}

interface AuthResponse {
  token: string
  user: { id: number; email: string }
}

export function login(email: string, password: string) {
  return apiClient<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function register(email: string, password: string) {
  return apiClient<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function logout() {
  return apiClient<void>('/api/auth/logout', { method: 'POST' })
}

export interface AuthUser {
  id: number
  email: string
  displayName: string
}

// Shape the server actually returns from /api/auth/me and /api/profile
export interface ServerUserProfile {
  id: number
  email: string
  fullName: string | null
  birthDate: string | null
  birthTime: string | null
  birthPlace: { name: string; lat: number; lng: number; tz: string; country: string } | null
  createdAt: string
  subscriptionTier?: 'free' | 'basic' | 'advanced'
}

export interface SessionResponse {
  user: ServerUserProfile
}

export function getSession() {
  return apiClient<SessionResponse>('/api/auth/me', {}, 5000)
}

export function saveProfile(birthData: BirthData) {
  return apiClient<void>('/api/profile', {
    method: 'PUT',
    body: JSON.stringify({
      fullName: birthData.userName ?? null,
      birthDate: birthData.date ?? null,
      birthTime: birthData.time ?? null,
      birthPlace: birthData.city ?? null,
    }),
  })
}

export function getProfile() {
  return apiClient<ServerUserProfile>('/api/profile')
}
