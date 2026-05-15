import type { ChartData, ZodiacSign } from '../../engine/types'
import { ZODIAC_GLYPHS, ZODIAC_SIGNS, SIGN_ELEMENTS, getBodyGlyph } from '../../engine/types'
import { useState, useCallback } from 'react'

interface SolarReturnBiWheelProps {
  natalChart: ChartData
  srChart: ChartData
}

const SIZE = 700
const CX = SIZE / 2
const CY = SIZE / 2

// Ring radii
const OUTER_R = SIZE / 2 - 12       // Outermost edge
const ZODIAC_OUTER = OUTER_R        // Zodiac ring outer
const ZODIAC_INNER = OUTER_R - 40   // Zodiac ring inner
const SR_PLANET_R = ZODIAC_INNER - 18  // SR planet ring
const SR_RING_OUTER = ZODIAC_INNER - 5
const SR_RING_INNER = ZODIAC_INNER - 30
const NATAL_PLANET_R = SR_RING_INNER - 18  // Natal planet ring
const NATAL_RING_OUTER = SR_RING_INNER - 5
const NATAL_RING_INNER = SR_RING_INNER - 30
const HOUSE_RING_R = NATAL_RING_INNER - 5
const INNER_FILL_R = NATAL_RING_INNER - 30

const SR_COLOR = '#e8a830'       // Amber-gold for SR planets
const SR_RING_COLOR = 'rgba(232,168,48,0.08)'
const SR_BORDER_COLOR = 'rgba(232,168,48,0.35)'
const NATAL_COLOR = '#c9a84c'    // Standard gold for natal planets
const NATAL_RING_COLOR = 'rgba(201,168,76,0.06)'
const NATAL_BORDER_COLOR = 'rgba(201,168,76,0.25)'

const ELEMENT_COLORS: Record<string, string> = {
  Fire: 'rgba(180,80,50,0.12)',
  Earth: 'rgba(80,140,60,0.12)',
  Air: 'rgba(160,150,200,0.12)',
  Water: 'rgba(60,100,170,0.12)',
}

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (180 + angleDeg) * (Math.PI / 180)
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) }
}

function sectorPath(cx: number, cy: number, rOuter: number, rInner: number, startDeg: number, endDeg: number): string {
  const s1 = polarToXY(cx, cy, rOuter, startDeg)
  const e1 = polarToXY(cx, cy, rOuter, endDeg)
  const s2 = polarToXY(cx, cy, rInner, endDeg)
  const e2 = polarToXY(cx, cy, rInner, startDeg)
  const large = ((endDeg - startDeg + 360) % 360) > 180 ? 1 : 0
  return `M ${s1.x} ${s1.y} A ${rOuter} ${rOuter} 0 ${large} 1 ${e1.x} ${e1.y} L ${s2.x} ${s2.y} A ${rInner} ${rInner} 0 ${large} 0 ${e2.x} ${e2.y} Z`
}

export default function SolarReturnBiWheel({ natalChart, srChart }: SolarReturnBiWheelProps) {
  const [hoveredNatal, setHoveredNatal] = useState<string | null>(null)
  const [hoveredSR, setHoveredSR] = useState<string | null>(null)
  const ascLon = natalChart.angles.ascendant.longitude

  const offset = useCallback((lon: number) => lon - ascLon, [ascLon])

  return (
    <div className="relative w-full" style={{ maxWidth: SIZE }}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full h-auto"
        style={{ filter: 'drop-shadow(0 0 24px rgba(201,168,76,0.15))' }}
      >
        <defs>
          <filter id="sr-glow-gold">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="sr-glow-amber">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="sr-bg-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(201,168,76,0.04)" />
            <stop offset="100%" stopColor="rgba(5,5,15,0)" />
          </radialGradient>
        </defs>

        {/* Background */}
        <circle cx={CX} cy={CY} r={OUTER_R} fill="rgba(5,5,15,0.85)" />
        <circle cx={CX} cy={CY} r={OUTER_R} fill="url(#sr-bg-gradient)" />

        {/* Zodiac ring with element colors */}
        {ZODIAC_SIGNS.map((sign, i) => {
          const startDeg = offset(i * 30)
          const endDeg = offset((i + 1) * 30)
          const element = SIGN_ELEMENTS[sign]
          const midDeg = offset(i * 30 + 15)
          const glyphPos = polarToXY(CX, CY, (ZODIAC_OUTER + ZODIAC_INNER) / 2, midDeg)
          return (
            <g key={sign}>
              <path d={sectorPath(CX, CY, ZODIAC_OUTER, ZODIAC_INNER, startDeg, endDeg)}
                fill={ELEMENT_COLORS[element]} stroke="rgba(201,168,76,0.15)" strokeWidth="0.5" />
              <text x={glyphPos.x} y={glyphPos.y} textAnchor="middle" dominantBaseline="central"
                fontSize="13" fill="rgba(201,168,76,0.7)"
                style={{ userSelect: 'none' }}>
                {ZODIAC_GLYPHS[sign as ZodiacSign]}
              </text>
            </g>
          )
        })}

        {/* Zodiac divider lines */}
        {ZODIAC_SIGNS.map((_, i) => {
          const p1 = polarToXY(CX, CY, ZODIAC_INNER, offset(i * 30))
          const p2 = polarToXY(CX, CY, ZODIAC_OUTER, offset(i * 30))
          return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(201,168,76,0.2)" strokeWidth="0.5" />
        })}

        {/* SR planet ring background */}
        <circle cx={CX} cy={CY} r={SR_RING_OUTER} fill={SR_RING_COLOR} stroke={SR_BORDER_COLOR} strokeWidth="0.5" />
        <circle cx={CX} cy={CY} r={SR_RING_INNER} fill="rgba(5,5,15,0.5)" stroke={SR_BORDER_COLOR} strokeWidth="0.5" />

        {/* Natal planet ring background */}
        <circle cx={CX} cy={CY} r={NATAL_RING_OUTER} fill={NATAL_RING_COLOR} stroke={NATAL_BORDER_COLOR} strokeWidth="0.5" />
        <circle cx={CX} cy={CY} r={NATAL_RING_INNER} fill="rgba(5,5,15,0.5)" stroke={NATAL_BORDER_COLOR} strokeWidth="0.5" />

        {/* House lines (using natal ASC as reference) */}
        {natalChart.houses.map((house, i) => {
          const isAngle = i === 0 || i === 3 || i === 6 || i === 9
          const p1 = polarToXY(CX, CY, INNER_FILL_R, offset(house.longitude))
          const p2 = polarToXY(CX, CY, ZODIAC_INNER, offset(house.longitude))
          return (
            <line key={i}
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke={isAngle ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.15)'}
              strokeWidth={isAngle ? 1.5 : 0.5}
              strokeDasharray={isAngle ? 'none' : '3,3'}
            />
          )
        })}

        {/* House numbers */}
        {natalChart.houses.map((house, i) => {
          const nextHouse = natalChart.houses[(i + 1) % 12]
          const midLon = house.longitude + ((nextHouse.longitude - house.longitude + 360) % 360) / 2
          const pos = polarToXY(CX, CY, (HOUSE_RING_R + INNER_FILL_R) / 2, offset(midLon))
          return (
            <text key={i} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="central"
              fontSize="9" fill="rgba(201,168,76,0.35)" style={{ userSelect: 'none' }}>
              {house.house}
            </text>
          )
        })}

        {/* Inner fill */}
        <circle cx={CX} cy={CY} r={INNER_FILL_R} fill="rgba(5,5,15,0.6)" />

        {/* ASC/DESC/MC/IC lines */}
        {[
          { lon: natalChart.angles.ascendant.longitude, label: 'ASC', color: '#c9a84c' },
          { lon: natalChart.angles.midheaven.longitude, label: 'MC', color: '#c9a84c' },
          { lon: natalChart.angles.descendant.longitude, label: 'DSC', color: 'rgba(201,168,76,0.5)' },
          { lon: natalChart.angles.imumCoeli.longitude, label: 'IC', color: 'rgba(201,168,76,0.5)' },
        ].map(({ lon, label, color }) => {
          const p1 = polarToXY(CX, CY, INNER_FILL_R, offset(lon))
          const p2 = polarToXY(CX, CY, ZODIAC_INNER, offset(lon))
          const labelPos = polarToXY(CX, CY, INNER_FILL_R - 12, offset(lon))
          return (
            <g key={label}>
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={color} strokeWidth="1.5" />
              <text x={labelPos.x} y={labelPos.y} textAnchor="middle" dominantBaseline="central"
                fontSize="8" fill={color} fontWeight="600" style={{ userSelect: 'none' }}>
                {label}
              </text>
            </g>
          )
        })}

        {/* SR Ascendant marker on outer ring */}
        {(() => {
          const srAscLon = srChart.angles.ascendant.longitude
          const p1 = polarToXY(CX, CY, ZODIAC_INNER, offset(srAscLon))
          const p2 = polarToXY(CX, CY, ZODIAC_OUTER, offset(srAscLon))
          const labelPos = polarToXY(CX, CY, ZODIAC_OUTER + 10, offset(srAscLon))
          return (
            <g>
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={SR_COLOR} strokeWidth="2" />
              <text x={labelPos.x} y={labelPos.y} textAnchor="middle" dominantBaseline="central"
                fontSize="7" fill={SR_COLOR} fontWeight="700" style={{ userSelect: 'none' }}>
                ☀ASC
              </text>
            </g>
          )
        })()}

        {/* SR Planets (outer ring, amber) */}
        {srChart.planets.map((p) => {
          const pos = polarToXY(CX, CY, SR_PLANET_R, offset(p.longitude))
          const isHovered = hoveredSR === p.name
          const glyph = getBodyGlyph(p.name)
          return (
            <g key={`sr-${p.name}`}
              onMouseEnter={() => setHoveredSR(p.name)}
              onMouseLeave={() => setHoveredSR(null)}
              style={{ cursor: 'pointer' }}>
              <circle cx={pos.x} cy={pos.y} r={isHovered ? 11 : 9}
                fill={isHovered ? SR_COLOR + '33' : 'transparent'}
                stroke={SR_COLOR} strokeWidth={isHovered ? 1.5 : 0.5}
                filter={isHovered ? 'url(#sr-glow-amber)' : undefined} />
              <text x={pos.x} y={pos.y}
                textAnchor="middle" dominantBaseline="central"
                fontSize={isHovered ? '13' : '11'}
                fill={SR_COLOR}
                filter={isHovered ? 'url(#sr-glow-amber)' : undefined}
                style={{ userSelect: 'none' }}>
                {glyph}
              </text>
              {p.retrograde && p.name !== 'NorthNode' && (
                <text x={pos.x + 8} y={pos.y - 7} fontSize="6" fill={SR_COLOR} style={{ userSelect: 'none' }}>℞</text>
              )}
            </g>
          )
        })}

        {/* Natal Planets (inner ring, gold) */}
        {natalChart.planets.map((p) => {
          const pos = polarToXY(CX, CY, NATAL_PLANET_R, offset(p.longitude))
          const isHovered = hoveredNatal === p.name
          const glyph = getBodyGlyph(p.name)
          return (
            <g key={`natal-${p.name}`}
              onMouseEnter={() => setHoveredNatal(p.name)}
              onMouseLeave={() => setHoveredNatal(null)}
              style={{ cursor: 'pointer' }}>
              <circle cx={pos.x} cy={pos.y} r={isHovered ? 11 : 9}
                fill={isHovered ? NATAL_COLOR + '33' : 'transparent'}
                stroke={NATAL_COLOR} strokeWidth={isHovered ? 1.5 : 0.5}
                filter={isHovered ? 'url(#sr-glow-gold)' : undefined} />
              <text x={pos.x} y={pos.y}
                textAnchor="middle" dominantBaseline="central"
                fontSize={isHovered ? '13' : '11'}
                fill={NATAL_COLOR}
                filter={isHovered ? 'url(#sr-glow-gold)' : undefined}
                style={{ userSelect: 'none' }}>
                {glyph}
              </text>
              {p.retrograde && p.name !== 'NorthNode' && (
                <text x={pos.x + 8} y={pos.y - 7} fontSize="6" fill={NATAL_COLOR} style={{ userSelect: 'none' }}>℞</text>
              )}
            </g>
          )
        })}

        {/* Outer border */}
        <circle cx={CX} cy={CY} r={OUTER_R} fill="none" stroke="rgba(201,168,76,0.3)" strokeWidth="1" />
      </svg>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: NATAL_COLOR, opacity: 0.8 }} />
          <span className="text-mystic-muted">Natal (inner)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: SR_COLOR, opacity: 0.8 }} />
          <span className="text-mystic-muted">Solar Return (outer)</span>
        </div>
      </div>

      {/* Hover tooltip */}
      {(hoveredNatal || hoveredSR) && (() => {
        const planet = hoveredNatal
          ? natalChart.planets.find(p => p.name === hoveredNatal)
          : srChart.planets.find(p => p.name === hoveredSR)
        const isNatal = !!hoveredNatal
        if (!planet) return null
        return (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-mystic-surface border border-mystic-gold/30 rounded-lg px-4 py-3 text-xs shadow-xl z-10 pointer-events-none min-w-48">
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: isNatal ? NATAL_COLOR : SR_COLOR }} className="text-base">
                {getBodyGlyph(planet.name)}
              </span>
              <span className="font-heading text-sm" style={{ color: isNatal ? NATAL_COLOR : SR_COLOR }}>
                {isNatal ? 'Natal' : 'SR'} {planet.name === 'NorthNode' ? 'North Node' : planet.name}
              </span>
            </div>
            <p className="text-mystic-muted">{planet.degree}°{planet.minute}' {planet.sign} · House {planet.house}</p>
            {planet.retrograde && planet.name !== 'NorthNode' && (
              <p className="text-red-400">℞ Retrograde</p>
            )}
          </div>
        )
      })()}
    </div>
  )
}
