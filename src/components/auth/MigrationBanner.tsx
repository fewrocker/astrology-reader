import { useState } from 'react'
import { detectLocalData, migrateToServer, markMigrationDeclined } from '../../services/migrationService'

interface MigrationBannerProps {
  journalCount: number
  dreamCount: number
  hasBirthData: boolean
  onMigrate: () => void
  onSkip: () => void
}

type Phase = 'offer' | 'carrying' | 'done' | 'error'

function buildSupportingLine(journalCount: number, dreamCount: number, hasBirthData: boolean): string {
  const parts: string[] = []
  if (journalCount > 0) parts.push(`${journalCount} journal entr${journalCount !== 1 ? 'ies' : 'y'}`)
  if (dreamCount > 0) parts.push(`${dreamCount} dream session${dreamCount !== 1 ? 's' : ''}`)
  if (hasBirthData) parts.push('your chart')
  if (parts.length === 0) return ''
  if (parts.length === 1) return `${parts[0]} — waiting for you.`
  const last = parts.pop()!
  return `${parts.join(', ')}, and ${last} — all waiting.`
}

export default function MigrationBanner({
  journalCount,
  dreamCount,
  hasBirthData,
  onMigrate,
  onSkip,
}: MigrationBannerProps) {
  const [phase, setPhase] = useState<Phase>('offer')
  const [progressLines, setProgressLines] = useState<string[]>([])
  const [errorKind, setErrorKind] = useState<'network' | 'server' | null>(null)

  const supportingLine = buildSupportingLine(journalCount, dreamCount, hasBirthData)

  async function handleKeep() {
    setPhase('carrying')
    setProgressLines([])

    const data = detectLocalData()
    const result = await migrateToServer(data, msg => {
      setProgressLines(prev => [...prev, msg])
    })

    if (result.success) {
      setPhase('done')
      setTimeout(onMigrate, 1200)
    } else {
      setErrorKind(result.error ?? 'server')
      setPhase('error')
    }
  }

  function handleSkip() {
    markMigrationDeclined()
    onSkip()
  }

  async function handleRetry() {
    setPhase('carrying')
    setProgressLines([])
    setErrorKind(null)

    const data = detectLocalData()
    const result = await migrateToServer(data, msg => {
      setProgressLines(prev => [...prev, msg])
    })

    if (result.success) {
      setPhase('done')
      setTimeout(onMigrate, 1200)
    } else {
      setErrorKind(result.error ?? 'server')
      setPhase('error')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(6, 4, 16, 0.92)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-8 text-center"
        style={{
          background: 'linear-gradient(160deg, #100d22 0%, #0c0a1e 100%)',
          border: '1px solid rgba(201, 168, 76, 0.28)',
          boxShadow: '0 0 80px rgba(201, 168, 76, 0.06), 0 32px 80px rgba(0,0,0,0.7)',
        }}
      >
        {/* Offer phase */}
        {phase === 'offer' && (
          <>
            <div
              className="text-3xl mb-6"
              style={{ filter: 'drop-shadow(0 0 10px rgba(201, 168, 76, 0.4))' }}
            >
              ✦
            </div>

            <h2
              className="font-heading text-xl leading-snug mb-3"
              style={{ color: '#c9a84c' }}
            >
              Your journal, birth data, and dream sessions live on this device.
              <br />
              Would you like to carry them with you?
            </h2>

            {supportingLine && (
              <p
                className="text-sm mb-8"
                style={{ color: 'rgba(201, 168, 76, 0.5)' }}
              >
                {supportingLine}
              </p>
            )}

            <button
              type="button"
              onClick={handleKeep}
              className="w-full mb-3 px-6 py-3 font-heading rounded-xl text-sm transition-all"
              style={{
                background: '#c9a84c',
                color: '#060410',
                border: 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#d4b460' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#c9a84c' }}
            >
              Keep my history ✦
            </button>

            <button
              type="button"
              onClick={handleSkip}
              className="w-full text-sm transition-colors"
              style={{ color: 'rgba(201, 168, 76, 0.35)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(201, 168, 76, 0.6)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(201, 168, 76, 0.35)' }}
            >
              Start fresh
            </button>
          </>
        )}

        {/* Carrying phase */}
        {phase === 'carrying' && (
          <>
            <div
              className="text-3xl mb-6"
              style={{
                color: '#c9a84c',
                animation: 'spin 3s linear infinite',
                display: 'inline-block',
              }}
            >
              ✦
            </div>

            <div className="space-y-2 min-h-[80px]">
              {progressLines.map((line, i) => (
                <p
                  key={i}
                  className="font-heading text-sm"
                  style={{ color: i === progressLines.length - 1 ? '#c9a84c' : 'rgba(201, 168, 76, 0.45)' }}
                >
                  {line}
                </p>
              ))}
              {progressLines.length === 0 && (
                <p className="font-heading text-sm" style={{ color: 'rgba(201, 168, 76, 0.45)' }}>
                  Preparing your history...
                </p>
              )}
            </div>
          </>
        )}

        {/* Done phase */}
        {phase === 'done' && (
          <>
            <div
              className="text-3xl mb-6"
              style={{ color: '#c9a84c', filter: 'drop-shadow(0 0 12px rgba(201, 168, 76, 0.5))' }}
            >
              ✦
            </div>
            <p className="font-heading text-xl" style={{ color: '#c9a84c' }}>
              Done. Your history is yours ✦
            </p>
          </>
        )}

        {/* Error phase */}
        {phase === 'error' && (
          <>
            <div
              className="text-3xl mb-6"
              style={{ color: 'rgba(201, 168, 76, 0.4)' }}
            >
              ✦
            </div>

            <p className="font-heading text-lg mb-2" style={{ color: '#c9a84c' }}>
              {errorKind === 'network'
                ? "We couldn't reach the server — your data is still safe on this device."
                : 'Something went wrong — your data is still safe on this device.'}
            </p>
            <p className="text-sm mb-8" style={{ color: 'rgba(201, 168, 76, 0.5)' }}>
              {errorKind === 'network'
                ? 'Try again when you\'re back online.'
                : 'Try again when you\'re ready.'}
            </p>

            <button
              type="button"
              onClick={handleRetry}
              className="w-full mb-3 px-6 py-3 font-heading rounded-xl text-sm transition-all"
              style={{
                background: '#c9a84c',
                color: '#060410',
                border: 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#d4b460' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#c9a84c' }}
            >
              Try again
            </button>

            <button
              type="button"
              onClick={handleSkip}
              className="w-full text-sm transition-colors"
              style={{ color: 'rgba(201, 168, 76, 0.35)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(201, 168, 76, 0.6)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(201, 168, 76, 0.35)' }}
            >
              Continue without carrying
            </button>
          </>
        )}
      </div>
    </div>
  )
}
