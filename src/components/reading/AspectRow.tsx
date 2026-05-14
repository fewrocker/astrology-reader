import { useState } from 'react'
import type { PlanetName } from '../../engine/types'
import type { AspectType } from '../../engine/aspects'
import { PLANET_GLYPHS } from '../../engine/types'

// ─── Props ───────────────────────────────────────────────────────────────────

export interface AspectRowProps {
  transitPlanet: PlanetName | 'NorthNode'
  natalPlanet: PlanetName | 'NorthNode'
  aspectType: AspectType
  nature: 'harmonious' | 'challenging' | 'neutral'
  /** Aspect symbol (e.g. "□", "△", "☌") */
  symbol: string
  orb: number
  applying: boolean
  /** Pre-computed interpretation brief. Null → no expand toggle shown. */
  brief: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function natureColor(nature: string): string {
  if (nature === 'harmonious') return 'text-green-400'
  if (nature === 'challenging') return 'text-red-400'
  return 'text-mystic-gold'
}

function briefBorderColor(nature: string): string {
  if (nature === 'harmonious') return 'border-green-400/30'
  if (nature === 'challenging') return 'border-red-400/30'
  return 'border-mystic-gold/30'
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Shared aspect row component used in both TransitAspectsSection (TransitReadingPage)
 * and AdvanceTab. Renders glyph pair, orb, applying/separating badge, and an
 * optional expand/collapse brief.
 *
 * Spec refs: 1, 2, 11–15, 22–24, 29
 */
export default function AspectRow({
  transitPlanet,
  natalPlanet,
  aspectType,
  nature,
  symbol,
  orb,
  applying,
  brief,
}: AspectRowProps) {
  const [expanded, setExpanded] = useState(false)

  const g1 = PLANET_GLYPHS[transitPlanet as PlanetName] ?? '☊'
  const g2 = PLANET_GLYPHS[natalPlanet as PlanetName] ?? '☊'

  const hasBrief = brief !== null && brief.trim().length > 0

  // Spec 14: border color matches aspect nature
  const briefBorder = briefBorderColor(nature)

  return (
    <div className="border-b border-mystic-gold/5 last:border-0">
      {/* Row: entire area is clickable (spec 12, 22, 23, 24) */}
      <button
        type="button"
        onClick={() => hasBrief && setExpanded(prev => !prev)}
        aria-expanded={hasBrief ? expanded : undefined}
        className={[
          'w-full flex items-center gap-2 py-3 min-h-[44px] text-left',
          hasBrief ? 'cursor-pointer hover:bg-mystic-gold/5 focus-visible:ring-1 focus-visible:ring-mystic-gold/50 focus-visible:outline-none rounded' : 'cursor-default',
        ].join(' ')}
        // Prevent focus ring from appearing on mouse click (only on keyboard)
        tabIndex={hasBrief ? 0 : -1}
      >
        {/* Glyph pair */}
        <span className="text-lg flex-shrink-0">{g1}</span>
        <span className={`text-lg flex-shrink-0 ${natureColor(nature)}`}>{symbol}</span>
        <span className="text-lg flex-shrink-0">{g2}</span>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <span className="text-mystic-text text-sm">
            Transit {transitPlanet} {aspectType} Natal {natalPlanet}
          </span>
        </div>

        {/* Orb */}
        <span className="text-mystic-muted text-xs flex-shrink-0">{orb}° orb</span>

        {/* Applying/Separating badge */}
        <span
          className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${
            applying
              ? 'bg-mystic-gold/20 text-mystic-gold'
              : 'bg-mystic-surface text-mystic-muted'
          }`}
        >
          {applying ? 'applying' : 'separating'}
        </span>

        {/* Expand chevron — only shown when brief is available (spec 14) */}
        {hasBrief && (
          <span
            className="text-mystic-muted text-sm flex-shrink-0 transition-transform duration-200"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}
            aria-hidden="true"
          >
            ▾
          </span>
        )}
      </button>

      {/* Brief reveal area (spec 13, 14, 15, 23) */}
      {hasBrief && (
        <div
          className="overflow-hidden transition-all duration-200"
          style={{
            maxHeight: expanded ? '6rem' : '0',
            opacity: expanded ? 1 : 0,
          }}
        >
          {/* Indented to align with planet names — past the three glyphs (spec 14) */}
          <div className={`ml-[4.5rem] mr-4 mb-3 pl-3 border-l-2 ${briefBorder}`}>
            <p className="text-mystic-text/80 text-xs leading-relaxed italic">
              {brief}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
