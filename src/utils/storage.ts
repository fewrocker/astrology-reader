/**
 * Storage utility helpers — quota guard, estimate, and export.
 */

export function isQuotaError(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  )
}

export interface StorageEstimate {
  usageRatio: number
  usedMB: number
  quotaMB: number
}

export async function estimateStorageUsage(): Promise<StorageEstimate> {
  try {
    if (!navigator.storage?.estimate) {
      return { usageRatio: 0, usedMB: 0, quotaMB: 0 }
    }
    const { usage = 0, quota = 0 } = await navigator.storage.estimate()
    const usageRatio = quota > 0 ? usage / quota : 0
    return {
      usageRatio,
      usedMB: usage / (1024 * 1024),
      quotaMB: quota / (1024 * 1024),
    }
  } catch {
    return { usageRatio: 0, usedMB: 0, quotaMB: 0 }
  }
}

export function exportAllLocalStorage(): void {
  try {
    const data: Record<string, unknown> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        try {
          const raw = localStorage.getItem(key)
          data[key] = raw ? JSON.parse(raw) : raw
        } catch {
          data[key] = localStorage.getItem(key)
        }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `astral-chart-data-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch {
    // Fail silently — export is best-effort
  }
}
