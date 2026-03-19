import type { ChartData } from '../../engine/types'
import type { Aspect } from '../../engine/aspects'
import { ZODIAC_GLYPHS, PLANET_GLYPHS, ZODIAC_SIGNS } from '../../engine/types'
import { useState } from 'react'

interface ChartWheelProps {
  chartData: ChartData
  aspects: Aspect[]
}

const SIZE = 600
const CX = SIZE / 2
const CY = SIZE / 2
const OUTER_R = SIZE / 2 - 10
const SIGN_R = OUTER_R - 35
const INNER_R = SIGN_R - 60
const PLANET_R = INNER_R + 30
const ASPECT_R = INNER_R - 15

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  // In astrology charts, 0° Aries is at the left (9 o'clock) and goes counter-clockwise
  // We rotate so ASC (the chart's 0 point) is at the left
  const rad = (180 - angleDeg) * (Math.PI / 180)
  return {
    x: cx + r * Math.cos(rad),
    y: cy - r * Math.sin(rad),
  }
}

function getAspectColor(nature: string): string {
  switch (nature) {
    case 'harmonious': return '#4a7fb5'
    case 'challenging': return '#b54a4a'
    default: return '#c9a84c'
  }
}

export default function ChartWheel({ chartData, aspects }: ChartWheelProps) {
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null)
  const ascLon = chartData.angles.ascendant.longitude

  // All positions are offset by ASC so ASC appears on the left
  const offset = (lon: number) => lon - ascLon

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full max-w-[600px] mx-auto"
      role="img"
      aria-label="Natal birth chart wheel"
    >
      {/* Background */}
      <circle cx={CX} cy={CY} r={OUTER_R} fill="#0a0a0f" stroke="#1e1e2e" strokeWidth="1" />

      {/* Zodiac sign segments */}
      {ZODIAC_SIGNS.map((sign, i) => {
        const startAngle = offset(i * 30)
        const endAngle = offset((i + 1) * 30)
        const midAngle = offset(i * 30 + 15)
        const p1 = polarToXY(CX, CY, OUTER_R, startAngle)
        const p2 = polarToXY(CX, CY, OUTER_R, endAngle)
        const p3 = polarToXY(CX, CY, SIGN_R, endAngle)
        const p4 = polarToXY(CX, CY, SIGN_R, startAngle)
        const glyphPos = polarToXY(CX, CY, (OUTER_R + SIGN_R) / 2, midAngle)

        // Alternating subtle fills for sign segments
        const fills = ['#12121a', '#0e0e16']
        const fill = fills[i % 2]

        // Use arc path for the segment
        const largeArc = 0
        const d = [
          `M ${p4.x} ${p4.y}`,
          `A ${SIGN_R} ${SIGN_R} 0 ${largeArc} 0 ${p3.x} ${p3.y}`,
          `L ${p2.x} ${p2.y}`,
          `A ${OUTER_R} ${OUTER_R} 0 ${largeArc} 1 ${p1.x} ${p1.y}`,
          'Z',
        ].join(' ')

        return (
          <g key={sign}>
            <path d={d} fill={fill} stroke="#1e1e2e" strokeWidth="0.5" />
            <text
              x={glyphPos.x}
              y={glyphPos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#8a8694"
              fontSize="16"
              fontFamily="serif"
            >
              {ZODIAC_GLYPHS[sign]}
            </text>
          </g>
        )
      })}

      {/* Inner circle */}
      <circle cx={CX} cy={CY} r={INNER_R} fill="none" stroke="#1e1e2e" strokeWidth="0.5" />

      {/* House cusps */}
      {chartData.houses.map((house, i) => {
        const angle = offset(house.longitude)
        const outerPoint = polarToXY(CX, CY, SIGN_R, angle)
        const innerPoint = polarToXY(CX, CY, INNER_R, angle)

        // House number at the midpoint between this cusp and next
        const nextLon = chartData.houses[(i + 1) % 12].longitude
        let midLon = house.longitude + ((nextLon - house.longitude + 360) % 360) / 2
        if (midLon > 360) midLon -= 360
        const midAngle = offset(midLon)
        const numPos = polarToXY(CX, CY, INNER_R + 18, midAngle)

        const isAngular = [1, 4, 7, 10].includes(house.house)

        return (
          <g key={`house-${house.house}`}>
            <line
              x1={outerPoint.x}
              y1={outerPoint.y}
              x2={innerPoint.x}
              y2={innerPoint.y}
              stroke={isAngular ? '#c9a84c44' : '#1e1e2e'}
              strokeWidth={isAngular ? 1 : 0.5}
            />
            <text
              x={numPos.x}
              y={numPos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#5a5666"
              fontSize="10"
            >
              {house.house}
            </text>
          </g>
        )
      })}

      {/* Aspect lines */}
      {aspects
        .filter(a => ['conjunction', 'sextile', 'square', 'trine', 'opposition'].includes(a.type))
        .map((aspect, i) => {
          const p1 = chartData.planets.find(p => p.name === aspect.planet1)
          const p2 = chartData.planets.find(p => p.name === aspect.planet2)
          if (!p1 || !p2) return null

          const pos1 = polarToXY(CX, CY, ASPECT_R, offset(p1.longitude))
          const pos2 = polarToXY(CX, CY, ASPECT_R, offset(p2.longitude))
          const color = getAspectColor(aspect.nature)
          const opacity = Math.max(0.15, 1 - aspect.orb / 8)

          return (
            <line
              key={`aspect-${i}`}
              x1={pos1.x}
              y1={pos1.y}
              x2={pos2.x}
              y2={pos2.y}
              stroke={color}
              strokeWidth={aspect.orb < 2 ? 1.5 : 0.8}
              opacity={opacity}
            />
          )
        })}

      {/* Planets */}
      {chartData.planets.map(planet => {
        const pos = polarToXY(CX, CY, PLANET_R, offset(planet.longitude))
        const isHovered = hoveredPlanet === planet.name
        const glyph = PLANET_GLYPHS[planet.name]

        return (
          <g
            key={planet.name}
            onMouseEnter={() => setHoveredPlanet(planet.name)}
            onMouseLeave={() => setHoveredPlanet(null)}
            className="cursor-pointer"
          >
            {/* Background circle for readability */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={isHovered ? 14 : 11}
              fill="#0a0a0f"
              stroke={isHovered ? '#c9a84c' : '#1e1e2e'}
              strokeWidth={isHovered ? 1.5 : 0.5}
            />
            <text
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill={isHovered ? '#c9a84c' : '#e8e6e3'}
              fontSize={isHovered ? 14 : 12}
              fontFamily="serif"
            >
              {glyph}
            </text>
            {planet.retrograde && planet.name !== 'NorthNode' && (
              <text
                x={pos.x + 10}
                y={pos.y - 8}
                fill="#b54a4a"
                fontSize="8"
                fontFamily="sans-serif"
              >
                R
              </text>
            )}
          </g>
        )
      })}

      {/* Tooltip for hovered planet */}
      {hoveredPlanet && (() => {
        const planet = chartData.planets.find(p => p.name === hoveredPlanet)
        if (!planet) return null
        return (
          <g>
            <rect
              x={CX - 75}
              y={CY - 25}
              width={150}
              height={50}
              rx={6}
              fill="#12121a"
              stroke="#c9a84c"
              strokeWidth={1}
              opacity={0.95}
            />
            <text x={CX} y={CY - 8} textAnchor="middle" fill="#c9a84c" fontSize="12" fontWeight="600">
              {planet.name === 'NorthNode' ? 'North Node' : planet.name}
              {planet.retrograde && planet.name !== 'NorthNode' ? ' ℞' : ''}
            </text>
            <text x={CX} y={CY + 10} textAnchor="middle" fill="#e8e6e3" fontSize="11">
              {planet.degree}° {planet.sign} {planet.minute}' — House {planet.house}
            </text>
          </g>
        )
      })()}

      {/* ASC/DSC/MC/IC labels */}
      {[
        { label: 'ASC', pos: chartData.angles.ascendant },
        { label: 'DSC', pos: chartData.angles.descendant },
        { label: 'MC', pos: chartData.angles.midheaven },
        { label: 'IC', pos: chartData.angles.imumCoeli },
      ].map(({ label, pos }) => {
        const point = polarToXY(CX, CY, OUTER_R + 2, offset(pos.longitude))
        return (
          <text
            key={label}
            x={point.x}
            y={point.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#c9a84c"
            fontSize="9"
            fontWeight="600"
          >
            {label}
          </text>
        )
      })}
    </svg>
  )
}
