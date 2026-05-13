import { useApp } from '../context/AppContext'
import { exportAllLocalStorage } from '../utils/storage'

export default function StorageWarningBanner() {
  const { state, dispatch } = useApp()

  if (!state.storageWarning) return null

  function handleExport() {
    exportAllLocalStorage()
  }

  function handleDismiss() {
    dispatch({ type: 'CLEAR_STORAGE_WARNING' })
  }

  return (
    <div
      className="w-full flex items-start gap-3 px-5 py-3.5 rounded-xl"
      style={{
        background: 'linear-gradient(135deg, rgba(30, 20, 5, 0.95) 0%, rgba(25, 18, 4, 0.98) 100%)',
        border: '1px solid rgba(201, 168, 76, 0.38)',
        boxShadow: '0 0 24px rgba(201, 168, 76, 0.08), 0 4px 16px rgba(0,0,0,0.5)',
      }}
      role="alert"
    >
      {/* Icon */}
      <span
        className="text-xl mt-0.5 flex-shrink-0"
        style={{ color: '#c9a84c', filter: 'drop-shadow(0 0 6px rgba(201,168,76,0.4))' }}
        aria-hidden="true"
      >
        ◆
      </span>

      {/* Message */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm leading-relaxed"
          style={{ color: 'rgba(201, 168, 76, 0.9)' }}
        >
          {state.storageWarning}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleExport}
          className="px-4 py-1.5 text-xs font-heading rounded-lg transition-all"
          style={{
            background: 'rgba(201, 168, 76, 0.18)',
            border: '1px solid rgba(201, 168, 76, 0.38)',
            color: '#c9a84c',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(201, 168, 76, 0.28)'
            e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.55)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(201, 168, 76, 0.18)'
            e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.38)'
          }}
        >
          Export my data ↓
        </button>
        <button
          onClick={handleDismiss}
          className="p-1.5 transition-colors"
          style={{ color: 'rgba(201, 168, 76, 0.4)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(201, 168, 76, 0.8)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(201, 168, 76, 0.4)')}
          aria-label="Dismiss storage warning"
        >
          ×
        </button>
      </div>
    </div>
  )
}
