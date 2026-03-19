import type { ChartData, ZodiacSign } from '../../engine/types'
import type { Aspect } from '../../engine/aspects'
import { ZODIAC_GLYPHS, PLANET_GLYPHS, ZODIAC_SIGNS, SIGN_ELEMENTS } from '../../engine/types'
import { useState } from 'react'

interface ChartWheelProps {
  chartData: ChartData
  aspects: Aspect[]
}

const SIZE = 700
const CX = SIZE / 2
const CY = SIZE / 2
const OUTER_R = SIZE / 2 - 12
const SIGN_R = OUTER_R - 40
const INNER_R = SIGN_R - 70
const PLANET_R = INNER_R + 35
const ASPECT_R = INNER_R - 18

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (180 + angleDeg) * (Math.PI / 180)
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

const ELEMENT_COLORS: Record<string, string> = {
  Fire: 'rgba(180,80,50,0.07)',
  Earth: 'rgba(80,140,60,0.07)',
  Air: 'rgba(160,150,200,0.07)',
  Water: 'rgba(60,100,170,0.07)',
}

export default function ChartWheel({ chartData, aspects }: ChartWheelProps) {
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null)
  const ascLon = chartData.angles.ascendant.longitude

  const offset = (lon: number) => lon - ascLon

  // Compute filtered aspects for rendering
  const filteredAspects = aspects.filter(a =>
    ['conjunction', 'sextile', 'square', 'trine', 'opposition'].includes(a.type)
  )

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full mx-auto chart-svg"
      role="img"
      aria-label="Natal birth chart wheel"
    >
      <defs>
        {/* Radial gradient for chart background */}
        <radialGradient id="chartBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#10101a" />
          <stop offset="100%" stopColor="#0a0a0f" />
        </radialGradient>

        {/* Planet glow filter */}
        <filter id="planetGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Gold glow for angular labels */}
        <filter id="goldGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feFlood floodColor="#c9a84c" floodOpacity="0.4" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Sun warm radiance filter */}
        <filter id="sunGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feFlood floodColor="#e8a820" floodOpacity="0.5" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Moon silvery shimmer filter */}
        <filter id="moonGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.8" result="blur" />
          <feFlood floodColor="#b8c8e8" floodOpacity="0.45" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Sweeping light gradient for outer ring */}
        <linearGradient id="sweepGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="40%" stopColor="white" stopOpacity="0.03" />
          <stop offset="50%" stopColor="white" stopOpacity="0.045" />
          <stop offset="60%" stopColor="white" stopOpacity="0.03" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Background */}
      <circle cx={CX} cy={CY} r={OUTER_R} fill="url(#chartBg)" stroke="#1e1e2e" strokeWidth="1" className="chart-outer-ring" />

      {/* Degree tick marks on outer ring */}
      {Array.from({ length: 360 }, (_, deg) => {
        const angle = offset(deg)
        const isMajor = deg % 10 === 0
        const outerTick = polarToXY(CX, CY, OUTER_R, angle)
        const innerTick = polarToXY(CX, CY, OUTER_R - (isMajor ? 5 : 2.5), angle)
        return (
          <line
            key={`tick-${deg}`}
            x1={outerTick.x}
            y1={outerTick.y}
            x2={innerTick.x}
            y2={innerTick.y}
            stroke={isMajor ? '#2a2a3a' : '#1a1a28'}
            strokeWidth={isMajor ? 0.6 : 0.3}
          />
        )
      })}

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

        const element = SIGN_ELEMENTS[sign as ZodiacSign]
        const elementColor = ELEMENT_COLORS[element] || 'transparent'

        const largeArc = 0
        const d = [
          `M ${p4.x} ${p4.y}`,
          `A ${SIGN_R} ${SIGN_R} 0 ${largeArc} 1 ${p3.x} ${p3.y}`,
          `L ${p2.x} ${p2.y}`,
          `A ${OUTER_R} ${OUTER_R} 0 ${largeArc} 0 ${p1.x} ${p1.y}`,
          'Z',
        ].join(' ')

        return (
          <g key={sign} className="chart-sign-group">
            <path d={d} fill={elementColor} stroke="#1e1e2e" strokeWidth="0.5" />
            <text
              x={glyphPos.x}
              y={glyphPos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#a8a4b4"
              fontSize="18"
              fontFamily="serif"
            >
              {ZODIAC_GLYPHS[sign]}
            </text>
          </g>
        )
      })}

      {/* Sweeping light arc across outer ring */}
      <g className="chart-sweep">
        <path
          d={`M ${CX} ${CY - OUTER_R} A ${OUTER_R} ${OUTER_R} 0 0 1 ${CX + OUTER_R * Math.sin(Math.PI / 5)} ${CY - OUTER_R * Math.cos(Math.PI / 5)} L ${CX + SIGN_R * Math.sin(Math.PI / 5)} ${CY - SIGN_R * Math.cos(Math.PI / 5)} A ${SIGN_R} ${SIGN_R} 0 0 0 ${CX} ${CY - SIGN_R} Z`}
          fill="url(#sweepGrad)"
          opacity="1"
        />
      </g>

      {/* Inner circle */}
      <circle cx={CX} cy={CY} r={INNER_R} fill="none" stroke="#1e1e2e" strokeWidth="0.5" />

      {/* House cusps */}
      <g className="chart-houses">
        {chartData.houses.map((house, i) => {
          const angle = offset(house.longitude)
          const outerPoint = polarToXY(CX, CY, SIGN_R, angle)
          const innerPoint = polarToXY(CX, CY, INNER_R, angle)

          const nextLon = chartData.houses[(i + 1) % 12].longitude
          let midLon = house.longitude + ((nextLon - house.longitude + 360) % 360) / 2
          if (midLon > 360) midLon -= 360
          const midAngle = offset(midLon)
          const numPos = polarToXY(CX, CY, INNER_R + 20, midAngle)

          const isAngular = [1, 4, 7, 10].includes(house.house)

          return (
            <g key={`house-${house.house}`}>
              <line
                x1={outerPoint.x}
                y1={outerPoint.y}
                x2={innerPoint.x}
                y2={innerPoint.y}
                stroke={isAngular ? '#c9a84c66' : '#1e1e2e'}
                strokeWidth={isAngular ? 1.5 : 0.5}
              />
              <text
                x={numPos.x}
                y={numPos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#5a5666"
                fontSize="11"
              >
                {house.house}
              </text>
            </g>
          )
        })}
      </g>

      {/* Aspect lines */}
      <g className="chart-aspects-group">
        {filteredAspects.map((aspect, i) => {
          const p1 = chartData.planets.find(p => p.name === aspect.planet1)
          const p2 = chartData.planets.find(p => p.name === aspect.planet2)
          if (!p1 || !p2) return null

          const pos1 = polarToXY(CX, CY, ASPECT_R, offset(p1.longitude))
          const pos2 = polarToXY(CX, CY, ASPECT_R, offset(p2.longitude))
          const color = getAspectColor(aspect.nature)
          const baseOpacity = Math.max(0.15, 1 - aspect.orb / 8)

          // Dim non-connected aspects when a planet is hovered
          const isConnected = !hoveredPlanet ||
            aspect.planet1 === hoveredPlanet ||
            aspect.planet2 === hoveredPlanet
          const opacity = hoveredPlanet
            ? (isConnected ? Math.min(baseOpacity + 0.2, 0.9) : 0.04)
            : baseOpacity

          const len = Math.sqrt((pos2.x - pos1.x) ** 2 + (pos2.y - pos1.y) ** 2)

          return (
            <line
              key={`aspect-${i}`}
              className="chart-aspect-line"
              x1={pos1.x}
              y1={pos1.y}
              x2={pos2.x}
              y2={pos2.y}
              stroke={color}
              strokeWidth={aspect.orb < 2 ? 1.5 : 0.8}
              opacity={opacity}
              strokeDasharray={len}
              strokeDashoffset="0"
              style={{ '--line-len': len, transition: 'opacity 300ms ease' } as React.CSSProperties}
            />
          )
        })}
      </g>

      {/* Planets */}
      {chartData.planets.map((planet, idx) => {
        const pos = polarToXY(CX, CY, PLANET_R, offset(planet.longitude))
        const isHovered = hoveredPlanet === planet.name
        const glyph = PLANET_GLYPHS[planet.name]

        const isSun = planet.name === 'Sun'
        const isMoon = planet.name === 'Moon'
        const glowFilter = isSun ? 'url(#sunGlow)' : isMoon ? 'url(#moonGlow)' : 'url(#planetGlow)'
        const glowClass = isSun ? 'chart-sun-glow' : isMoon ? 'chart-moon-glow' : 'chart-planet-glow'
        const restStroke = isSun ? '#5a4a20' : isMoon ? '#3a4a5a' : '#2a2a3a'

        return (
          <g
            key={planet.name}
            onMouseEnter={() => setHoveredPlanet(planet.name)}
            onMouseLeave={() => setHoveredPlanet(null)}
            className="chart-planet cursor-pointer"
            style={{ animationDelay: `${0.5 + idx * 0.07}s` }}
          >
            {/* Glow circle behind planet */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={isHovered ? 18 : (isSun || isMoon ? 16 : 14)}
              fill="transparent"
              filter={glowFilter}
              opacity={isHovered ? 0.7 : (isSun ? 0.5 : isMoon ? 0.45 : 0.35)}
              className={glowClass}
              style={{
                animationDelay: isSun ? '0s' : isMoon ? '3s' : `${idx * 0.8}s`,
                transition: 'r 200ms ease, opacity 200ms ease',
              }}
            />
            {/* Background circle for readability */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={isHovered ? 16 : 13}
              fill="#0a0a0f"
              stroke={isHovered ? '#c9a84c' : restStroke}
              strokeWidth={isHovered ? 1.5 : 0.7}
              style={{ transition: 'r 200ms ease, stroke 200ms ease, stroke-width 200ms ease' }}
            />
            <text
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill={isHovered ? '#c9a84c' : '#e8e6e3'}
              fontSize={isHovered ? 16 : 14}
              fontFamily="serif"
              style={{ transition: 'fill 200ms ease, font-size 200ms ease' }}
            >
              {glyph}
            </text>
            {planet.retrograde && planet.name !== 'NorthNode' && (
              <text
                x={pos.x + 12}
                y={pos.y - 10}
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
          <g className="chart-tooltip">
            <rect
              x={CX - 85}
              y={CY - 28}
              width={170}
              height={56}
              rx={8}
              fill="#12121a"
              stroke="#c9a84c"
              strokeWidth={1}
              opacity={0.96}
              filter="url(#goldGlow)"
            />
            <text x={CX} y={CY - 8} textAnchor="middle" fill="#c9a84c" fontSize="13" fontWeight="600" fontFamily="'Playfair Display', serif">
              {planet.name === 'NorthNode' ? 'North Node' : planet.name}
              {planet.retrograde && planet.name !== 'NorthNode' ? ' ℞' : ''}
            </text>
            <text x={CX} y={CY + 12} textAnchor="middle" fill="#e8e6e3" fontSize="11" fontFamily="'Inter', sans-serif">
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
        const point = polarToXY(CX, CY, OUTER_R + 4, offset(pos.longitude))
        return (
          <text
            key={label}
            x={point.x}
            y={point.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#c9a84c"
            fontSize="11"
            fontWeight="600"
            filter="url(#goldGlow)"
          >
            {label}
          </text>
        )
      })}
    </svg>
  )
}
