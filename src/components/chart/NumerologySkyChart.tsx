import { useState, useMemo } from 'react'
import type { ChartData, ZodiacSign } from '../../engine/types'
import { ZODIAC_SIGNS, ZODIAC_GLYPHS, SIGN_ELEMENTS } from '../../engine/types'
import { buildNumerologyChartData, type NumerologyChartPoint } from '../../engine/numerologyChart'

const SIZE = 700
const CX = SIZE / 2
const CY = SIZE / 2
const OUTER_R = SIZE / 2 - 12   // 338
const SIGN_R = OUTER_R - 40     // 298
const INNER_R = SIGN_R - 70     // 228
const PLANET_R = 265
const CUSP_R = 215

const ELEMENT_COLORS: Record<string, string> = {
  Fire: 'rgba(180,80,50,0.12)',
  Earth: 'rgba(80,140,60,0.12)',
  Air: 'rgba(160,150,200,0.12)',
  Water: 'rgba(60,100,170,0.12)',
}

const SERIF = "'Playfair Display', serif"

function eclipticToXY(r: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180 - Math.PI / 2
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

function formatSignDegree(ecliptic: number): string {
  const norm = ((ecliptic % 360) + 360) % 360
  const signIndex = Math.floor(norm / 30)
  const degInSign = norm - signIndex * 30
  const deg = Math.floor(degInSign)
  const min = Math.floor((degInSign - deg) * 60)
  return `${deg}°${min}' ${ZODIAC_SIGNS[signIndex]}`
}

function eclipticArcPath(innerR: number, outerR: number, startDeg: number, endDeg: number): string {
  const p1 = eclipticToXY(outerR, startDeg)
  const p2 = eclipticToXY(outerR, endDeg)
  const p3 = eclipticToXY(innerR, endDeg)
  const p4 = eclipticToXY(innerR, startDeg)
  const span = ((endDeg - startDeg) + 360) % 360
  const la = span > 180 ? 1 : 0
  return [
    `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 ${la} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 ${la} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
    'Z',
  ].join(' ')
}

// Assign adjusted radii to avoid overlapping labels within a group
function computeRadii(points: NumerologyChartPoint[], baseR: number): number[] {
  const n = points.length
  const radii = new Array<number>(n).fill(baseR)
  const sorted = Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => points[a].eclipticDegree - points[b].eclipticDegree,
  )
  for (let si = 0; si < sorted.length - 1; si++) {
    const i = sorted[si]
    const j = sorted[si + 1]
    let diff = Math.abs(points[j].eclipticDegree - points[i].eclipticDegree)
    if (diff > 180) diff = 360 - diff
    if (diff < 8) {
      radii[j] = radii[i] === baseR ? baseR + 20 : baseR
    }
  }
  return radii
}

function getEmphasis(count: number, isMax: boolean): { fontSize: number; opacity: number; glow: boolean } {
  if (count >= 3 || isMax) return { fontSize: 20, opacity: 1.0, glow: true }
  if (count >= 2) return { fontSize: 17, opacity: 0.88, glow: false }
  return { fontSize: 15, opacity: 0.75, glow: false }
}

// ─── FrequencyBar ────────────────────────────────────────────────────────────

interface FrequencyBarProps {
  frequencyMap: Record<number, NumerologyChartPoint[]>
}

export function FrequencyBar({ frequencyMap }: FrequencyBarProps) {
  const [hovered, setHovered] = useState<number | null>(null)

  const baseNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  const masterNumbers = [11, 22, 33].filter(n => (frequencyMap[n]?.length ?? 0) > 0)
  const displayNumbers = [...baseNumbers, ...masterNumbers]

  const maxCount = useMemo(
    () => Math.max(...displayNumbers.map(n => frequencyMap[n]?.length ?? 0), 1),
    [frequencyMap, displayNumbers],
  )

  return (
    <div className="flex items-end justify-center gap-4 py-5 px-4">
      {displayNumbers.map(n => {
        const count = frequencyMap[n]?.length ?? 0
        const isMaster = n === 11 || n === 22 || n === 33
        const isHovered = hovered === n
        const sources = frequencyMap[n] ?? []
        const opacity = count === 0 ? 0.22 : 0.55 + (count / maxCount) * 0.45
        const fs = count === 0 ? 13 : 13 + Math.round((count / maxCount) * 11)
        const color = isMaster ? '#c9a84c' : '#e8e6e3'
        const glow = isMaster && count > 0 ? '0 0 10px rgba(201,168,76,0.45)' : 'none'

        return (
          <div
            key={n}
            className="relative flex flex-col items-center"
            style={{ cursor: count > 0 ? 'default' : 'default' }}
            onMouseEnter={() => count > 0 && setHovered(n)}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Tooltip */}
            {isHovered && sources.length > 0 && (
              <div
                className="absolute bottom-full mb-2 z-10 rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-2xl shadow-black/60"
                style={{
                  background: 'rgba(18,18,26,0.97)',
                  border: '1px solid rgba(201,168,76,0.3)',
                  color: '#e8e6e3',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  pointerEvents: 'none',
                }}
              >
                <div className="font-heading text-mystic-gold mb-1">
                  Number {n} · {count}×
                </div>
                {sources.map((p, i) => (
                  <div key={i} className="text-mystic-muted" style={{ fontSize: 10 }}>
                    {p.label} — {formatSignDegree(p.eclipticDegree)}
                  </div>
                ))}
              </div>
            )}

            {/* Number */}
            <span
              style={{
                fontFamily: SERIF,
                fontSize: fs,
                opacity,
                color,
                textShadow: glow,
                transition: 'all 200ms ease',
                lineHeight: 1,
                userSelect: 'none',
              }}
            >
              {n}
            </span>

            {/* Count dot */}
            {count > 0 && (
              <span
                style={{
                  fontSize: 8,
                  color: isMaster ? '#c9a84c' : '#8a8694',
                  opacity: opacity * 0.8,
                  marginTop: 3,
                  fontFamily: SERIF,
                }}
              >
                {count}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── NumerologySkyChart ───────────────────────────────────────────────────────

interface NumerologySkyChartProps {
  chartData: ChartData
}

export default function NumerologySkyChart({ chartData }: NumerologySkyChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const { points, frequencyMap } = useMemo(
    () => buildNumerologyChartData(chartData),
    [chartData],
  )

  const maxCount = useMemo(
    () => Math.max(...Object.values(frequencyMap).map(arr => arr.length), 1),
    [frequencyMap],
  )

  // Separate planets/node vs house cusps for independent collision avoidance
  const planetPoints = useMemo(
    () => points.filter(p => p.source === 'planet' || p.source === 'node'),
    [points],
  )
  const cuspPoints = useMemo(
    () => points.filter(p => p.source === 'house_cusp'),
    [points],
  )

  const planetRadii = useMemo(() => computeRadii(planetPoints, PLANET_R), [planetPoints])
  const cuspRadii = useMemo(() => computeRadii(cuspPoints, CUSP_R), [cuspPoints])

  // Merge radii back into a single lookup by original point index
  const radiusForPoint = useMemo(() => {
    const map = new Map<number, number>()
    let pi = 0
    let ci = 0
    for (let i = 0; i < points.length; i++) {
      const p = points[i]
      if (p.source === 'planet' || p.source === 'node') {
        map.set(i, planetRadii[pi++])
      } else {
        map.set(i, cuspRadii[ci++])
      }
    }
    return map
  }, [points, planetRadii, cuspRadii])

  return (
    <div className="relative select-none" onMouseLeave={() => setHoveredIdx(null)}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full mx-auto"
        role="img"
        aria-label="Numerology sky chart — your birth chart as numbers"
      >
        <defs>
          <radialGradient id="numBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10101a" />
            <stop offset="100%" stopColor="#0a0a0f" />
          </radialGradient>

          <filter id="numGoldGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feFlood floodColor="#c9a84c" floodOpacity="0.5" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="numHighGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <circle cx={CX} cy={CY} r={OUTER_R} fill="url(#numBg)" stroke="#3a3a50" strokeWidth="1.2" />

        {/* Zodiac sign segments */}
        {ZODIAC_SIGNS.map((sign, i) => {
          const startDeg = i * 30
          const endDeg = (i + 1) * 30
          const midDeg = i * 30 + 15
          const element = SIGN_ELEMENTS[sign as ZodiacSign]
          const elementColor = ELEMENT_COLORS[element] || 'transparent'
          const glyphPos = eclipticToXY((OUTER_R + SIGN_R) / 2, midDeg)

          return (
            <g key={sign}>
              <path
                d={eclipticArcPath(SIGN_R, OUTER_R, startDeg, endDeg)}
                fill={elementColor}
                stroke="none"
              />
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

        {/* Zodiac ring divider lines */}
        {ZODIAC_SIGNS.map((_, i) => {
          const deg = i * 30
          const outer = eclipticToXY(OUTER_R, deg)
          const inner = eclipticToXY(SIGN_R, deg)
          return (
            <line
              key={`zodiv-${i}`}
              x1={outer.x} y1={outer.y}
              x2={inner.x} y2={inner.y}
              stroke="#3a3a50"
              strokeWidth="0.8"
            />
          )
        })}

        {/* Inner ring */}
        <circle cx={CX} cy={CY} r={INNER_R} fill="none" stroke="#3a3a50" strokeWidth="1" />

        {/* House cusp divider lines */}
        {!chartData.unknownTime && chartData.houses.map(house => {
          const outer = eclipticToXY(SIGN_R, house.longitude)
          const inner = eclipticToXY(INNER_R - 10, house.longitude)
          const isAngular = [1, 4, 7, 10].includes(house.house)
          return (
            <line
              key={`hcusp-${house.house}`}
              x1={outer.x} y1={outer.y}
              x2={inner.x} y2={inner.y}
              stroke={isAngular ? '#c9a84c55' : '#3a3a50'}
              strokeWidth={isAngular ? 1.2 : 0.7}
            />
          )
        })}

        {/* Center empty space */}
        <circle cx={CX} cy={CY} r={INNER_R - 40} fill="none" stroke="#2a2a3a" strokeWidth="0.5" strokeDasharray="2 4" opacity={0.5} />

        {/* Number points */}
        {points.map((point, idx) => {
          const r = radiusForPoint.get(idx) ?? PLANET_R
          const pos = eclipticToXY(r, point.eclipticDegree)
          const count = frequencyMap[point.reducedNumber]?.length ?? 0
          const isMax = count === maxCount && count > 1
          const { fontSize, opacity, glow } = getEmphasis(count, isMax)
          const isMaster = point.reducedNumber === 11 || point.reducedNumber === 22 || point.reducedNumber === 33
          const isHouse = point.source === 'house_cusp'
          const isHovered = hoveredIdx === idx

          const color = isMaster ? '#c9a84c' : isHovered ? '#e8e6e3' : '#d8d4e0'
          const actualFontSize = isHouse ? Math.max(fontSize - 3, 11) : fontSize
          const actualOpacity = isHouse ? opacity * 0.85 : opacity
          const filter = (glow || isHovered) ? 'url(#numHighGlow)' : isMaster ? 'url(#numGoldGlow)' : 'none'

          return (
            <g
              key={`numpt-${idx}`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: 'default' }}
            >
              {/* Subtle glow ring for high-frequency numbers */}
              {glow && !isHouse && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={actualFontSize * 0.85}
                  fill="none"
                  stroke={isMaster ? 'rgba(201,168,76,0.2)' : 'rgba(216,212,224,0.12)'}
                  strokeWidth="1"
                />
              )}

              {/* Number text */}
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={color}
                fontSize={actualFontSize}
                fontFamily={SERIF}
                opacity={isHovered ? 1 : actualOpacity}
                filter={filter}
                style={{ transition: 'opacity 200ms ease, fill 200ms ease' }}
              >
                {point.reducedNumber}
              </text>

              {/* Invisible touch target */}
              <circle cx={pos.x} cy={pos.y} r={14} fill="transparent" />
            </g>
          )
        })}
      </svg>

      {/* Hover tooltip */}
      {hoveredIdx !== null && (() => {
        const point = points[hoveredIdx]
        if (!point) return null
        const r = radiusForPoint.get(hoveredIdx) ?? PLANET_R
        const pos = eclipticToXY(r, point.eclipticDegree)
        // Convert SVG coords to percentage for positioning
        const pctX = (pos.x / SIZE) * 100
        const pctY = (pos.y / SIZE) * 100
        const alignRight = pctX > 60
        const alignBottom = pctY > 60
        const isMaster = point.reducedNumber === 11 || point.reducedNumber === 22 || point.reducedNumber === 33

        return (
          <div
            className="absolute pointer-events-none rounded-lg px-3 py-2 text-xs shadow-2xl shadow-black/70 z-10"
            style={{
              left: `${pctX}%`,
              top: `${pctY}%`,
              transform: `translate(${alignRight ? '-100%' : '8px'}, ${alignBottom ? '-100%' : '8px'})`,
              background: 'rgba(18,18,26,0.97)',
              border: `1px solid ${isMaster ? 'rgba(201,168,76,0.4)' : 'rgba(58,58,80,0.8)'}`,
              maxWidth: 180,
              backdropFilter: 'blur(4px)',
            }}
          >
            <div className="font-heading mb-0.5" style={{ color: isMaster ? '#c9a84c' : '#e8e6e3', fontSize: 13 }}>
              {point.label}
            </div>
            <div style={{ color: '#8a8694', fontSize: 10 }}>
              {formatSignDegree(point.eclipticDegree)} → {point.reducedNumber}
              {isMaster && ' ✦ master number'}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
