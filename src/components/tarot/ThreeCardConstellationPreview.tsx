import type { ThreeCardSynthesisInput } from '../../engine/tarot'

// ─── ThreeCardConstellationPreview ────────────────────────────────────────────
//
// A minimal bridge section that surfaces the structural picture of the three
// drawn cards immediately after they are all revealed — before GPT synthesis
// arrives. Purely client-side, zero latency.

interface ThreeCardConstellationPreviewProps {
  synthesis: ThreeCardSynthesisInput
}

export default function ThreeCardConstellationPreview({ synthesis }: ThreeCardConstellationPreviewProps) {
  const { astroResonanceNote, elementDistribution, polarityProfile, suitPattern, archetypeFraming } = synthesis

  // noMinorArcana is true when every card is Major Arcana
  const allMajorArcana = suitPattern.noMinorArcana

  const lines: string[] = []

  if (allMajorArcana) {
    lines.push('All three cards are Major Arcana — archetypal forces are in motion, not merely personal patterns.')
  }

  if (elementDistribution.fireWaterTension) {
    lines.push('Fire and Water in tension across these positions — creative drive and emotional depth are in direct conversation.')
  }

  if (polarityProfile.allReversed) {
    lines.push('All three cards are reversed — the spread is working from the inside out.')
  } else if (polarityProfile.centerReversed) {
    lines.push('The center card is reversed — the core of the matter is working beneath the surface.')
  }

  if (archetypeFraming.hasFool && archetypeFraming.hasWorld) {
    lines.push('The Fool and The World appear together — this spread holds both the beginning and the completion of a cycle.')
  } else if (archetypeFraming.hasFool) {
    lines.push('The Fool is present — a leap of faith, a new threshold, a story beginning rather than ending.')
  } else if (archetypeFraming.hasWorld) {
    lines.push('The World is present — a cycle completing, an arrival, something truly integrated.')
  }

  return (
    <div className="my-8">
      {/* Thin divider with star accent */}
      <div className="relative flex items-center justify-center mb-6">
        <div
          className="absolute inset-x-0 top-1/2"
          style={{ height: '1px', background: 'rgba(201,168,76,0.18)' }}
        />
        <span
          className="relative px-3 font-heading"
          style={{
            background: '#0d0d14',
            color: 'rgba(201,168,76,0.45)',
            fontSize: '0.9rem',
            zIndex: 1,
          }}
        >
          ✦
        </span>
      </div>

      {/* Constellation notes */}
      <div className="space-y-2 max-w-prose mx-auto text-center px-2">
        {astroResonanceNote && (
          <p
            className="text-mystic-muted/80 text-sm italic leading-relaxed"
            style={{ color: 'rgba(180,160,120,0.72)' }}
          >
            {astroResonanceNote}
          </p>
        )}
        {lines.map((line, i) => (
          <p
            key={i}
            className="text-sm italic leading-relaxed"
            style={{ color: 'rgba(180,160,120,0.58)' }}
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}
