import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught rendering error:', error, info)
  }

  handleStartOver = () => {
    localStorage.clear()
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: '#0a0a0f' }}
      >
        <div className="w-full max-w-md text-center">
          <div
            className="bg-mystic-surface border border-mystic-border rounded-xl p-12"
            style={{ boxShadow: '0 0 60px rgba(201, 168, 76, 0.08)' }}
          >
            {/* Golden glyph with glow */}
            <div
              className="text-6xl mb-8 select-none"
              style={{
                color: '#c9a84c',
                textShadow: '0 0 20px rgba(201, 168, 76, 0.6), 0 0 40px rgba(201, 168, 76, 0.3)',
              }}
            >
              ✦
            </div>

            <h2 className="font-heading text-2xl text-mystic-gold mb-3">
              Something shifted in the cosmos
            </h2>

            <p className="text-mystic-muted text-sm leading-relaxed mb-8">
              An unexpected error occurred. Your chart data is safe.
            </p>

            <button
              type="button"
              onClick={this.handleStartOver}
              className="w-full px-6 py-3 bg-mystic-gold text-mystic-bg font-heading rounded-lg hover:bg-mystic-gold/90 transition-colors"
            >
              Start Over
            </button>
          </div>
        </div>
      </div>
    )
  }
}
