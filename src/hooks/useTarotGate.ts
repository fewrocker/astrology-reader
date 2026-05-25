import { useState, useEffect, useCallback } from 'react'

export interface TarotUsageStatus {
  dailyCardDrawsUsed: number
  dailyCardDrawsLimit: number | null   // null = unlimited (Advanced/Basic)
  weeklyThreeCardUsed: number
  weeklyThreeCardLimit: number | null  // null = unlimited
  celticCrossEnabled: boolean
  savedReadingsEnabled: boolean
  tier: 'free' | 'advanced'
  dailyResetAt: string                 // ISO string, next midnight UTC
  weeklyResetAt: string                // ISO string, next Monday midnight UTC
}

export interface TarotGateState {
  canDrawCard: boolean
  canDrawThreeCard: boolean
  canDrawCelticCross: boolean
  remaining: { dailyCards: number; weeklyThreeCard: number }
  status: TarotUsageStatus | null
  loading: boolean
  refresh: () => void
}

export function useTarotGate(): TarotGateState {
  const [status, setStatus] = useState<TarotUsageStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('astral-auth-token')
      const res = await fetch('/api/tarot/usage', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        setStatus(null)
        return
      }
      const data = (await res.json()) as TarotUsageStatus
      setStatus(data)
    } catch {
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchStatus()
  }, [fetchStatus])

  const canDrawCard =
    !status ||
    status.dailyCardDrawsLimit === null ||
    status.dailyCardDrawsUsed < status.dailyCardDrawsLimit

  const canDrawThreeCard =
    !status ||
    status.weeklyThreeCardLimit === null ||
    status.weeklyThreeCardUsed < status.weeklyThreeCardLimit

  const canDrawCelticCross = !status || status.celticCrossEnabled

  const remainingDailyCards =
    !status || status.dailyCardDrawsLimit === null
      ? Infinity
      : Math.max(0, status.dailyCardDrawsLimit - status.dailyCardDrawsUsed)

  const remainingWeeklyThreeCard =
    !status || status.weeklyThreeCardLimit === null
      ? Infinity
      : Math.max(0, status.weeklyThreeCardLimit - status.weeklyThreeCardUsed)

  return {
    canDrawCard,
    canDrawThreeCard,
    canDrawCelticCross,
    remaining: {
      dailyCards: remainingDailyCards,
      weeklyThreeCard: remainingWeeklyThreeCard,
    },
    status,
    loading,
    refresh: fetchStatus,
  }
}
