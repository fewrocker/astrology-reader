type AccentColor = 'gold' | 'pink' | 'amber'

const GRADIENTS: Record<AccentColor, string> = {
  gold: 'linear-gradient(90deg, rgba(201,168,76,0.06) 0%, rgba(201,168,76,0.14) 50%, rgba(201,168,76,0.06) 100%)',
  pink: 'linear-gradient(90deg, rgba(236,72,153,0.06) 0%, rgba(236,72,153,0.14) 50%, rgba(236,72,153,0.06) 100%)',
  amber: 'linear-gradient(90deg, rgba(232,168,48,0.06) 0%, rgba(232,168,48,0.14) 50%, rgba(232,168,48,0.06) 100%)',
}

const LINE_WIDTHS = [100, 90, 75, 100, 85, 60, 95, 80]

interface GptSkeletonProps {
  label?: string
  accentColor?: AccentColor
  lines?: number
}

export default function GptSkeleton({ label, accentColor = 'gold', lines = 8 }: GptSkeletonProps) {
  const gradient = GRADIENTS[accentColor]
  const widths = LINE_WIDTHS.slice(0, lines)

  return (
    <div className="bg-mystic-surface/50 border border-mystic-gold/25 rounded-xl p-6 md:p-8">
      {label && (
        <div className="flex items-center gap-2 mb-5">
          <span className="animate-pulse">✦</span>
          <span className="font-heading text-mystic-muted text-sm tracking-widest">{label}</span>
        </div>
      )}
      <div className="space-y-3">
        {widths.map((w, i) => (
          <div
            key={i}
            className="h-3 rounded-full"
            style={{
              width: `${w}%`,
              background: gradient,
              backgroundSize: '200% 100%',
              animation: `shimmer 1.8s ease-in-out infinite ${i * 0.1}s`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
