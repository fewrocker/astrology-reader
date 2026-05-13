import { useAuth } from '../context/AuthContext'

export default function NetworkWarningBanner() {
  const { showNetworkWarning, dismissNetworkWarning } = useAuth()

  if (!showNetworkWarning) return null

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
      <span
        className="text-xl mt-0.5 flex-shrink-0"
        style={{ color: '#c9a84c', filter: 'drop-shadow(0 0 6px rgba(201,168,76,0.4))' }}
        aria-hidden="true"
      >
        ✦
      </span>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm leading-relaxed"
          style={{ color: 'rgba(201, 168, 76, 0.9)' }}
        >
          Could not reach the server — using local data for now.
        </p>
      </div>
      <button
        onClick={dismissNetworkWarning}
        className="p-1.5 transition-colors flex-shrink-0"
        style={{ color: 'rgba(201, 168, 76, 0.4)' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'rgba(201, 168, 76, 0.8)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(201, 168, 76, 0.4)')}
        aria-label="Dismiss network warning"
      >
        ×
      </button>
    </div>
  )
}
