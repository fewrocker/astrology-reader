import type { ChartData, ZodiacSign, PlanetName, BodyName, AsteroidName } from '../../engine/types'
import type { Aspect } from '../../engine/aspects'
import type { TransitPosition, TransitAspect } from '../../engine/transits'
import { ZODIAC_GLYPHS, PLANET_GLYPHS, ZODIAC_SIGNS, SIGN_ELEMENTS, ASTEROID_GLYPHS, ASTEROID_ARCHETYPES, isAsteroid, getBodyGlyph } from '../../engine/types'
import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { getPlanetInSignInterpretation, getPlanetInHouseInterpretation, getAspectInterpretation } from '../../data/interpretations'
import { getDignity } from '../../data/interpretations/dignities'
import { HOUSE_THEMES } from '../../data/interpretations/houseThemes'
import { NATAL_RETROGRADE } from '../../data/interpretations/retrogrades'

interface ChartWheelProps {
  chartData: ChartData
  aspects: Aspect[]
  transitPlanets?: TransitPosition[]
  transitAspects?: TransitAspect[]
}

const SIZE = 700
const CX = SIZE / 2
const CY = SIZE / 2
const OUTER_R = SIZE / 2 - 12
const SIGN_R = OUTER_R - 40
const INNER_R = SIGN_R - 70
const PLANET_R = INNER_R + 35
const ASTEROID_R = 240
const TRANSIT_PLANET_R = 288 // between natal planets (263) and zodiac ring inner (298)

type HoverState = { kind: string; key: string } | null

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

function getAspectNatureLabel(nature: string): string {
  switch (nature) {
    case 'harmonious': return 'Harmonious'
    case 'challenging': return 'Challenging'
    default: return 'Neutral'
  }
}

const ELEMENT_COLORS: Record<string, string> = {
  Fire: 'rgba(180,80,50,0.12)',
  Earth: 'rgba(80,140,60,0.12)',
  Air: 'rgba(160,150,200,0.12)',
  Water: 'rgba(60,100,170,0.12)',
}

/* ─── HTML Tooltip Components ─── */

function PlanetTooltip({ planet, chartData }: { planet: import('../../engine/types').PlanetPosition; chartData: ChartData }) {
  const isAsteroidBody = isAsteroid(planet.name as BodyName)
  const signInterp = getPlanetInSignInterpretation(planet.name as BodyName, planet.sign)
  const houseInterp = !chartData.unknownTime ? getPlanetInHouseInterpretation(planet.name as BodyName, planet.house) : null
  const dignity = !isAsteroidBody && planet.name !== 'NorthNode' ? getDignity(planet.name as PlanetName, planet.sign) : null
  const retroInterp = planet.retrograde && planet.name !== 'NorthNode' ? (NATAL_RETROGRADE[planet.name] ?? null) : null
  const glyph = getBodyGlyph(planet.name as BodyName)
  const archetype = isAsteroidBody ? ASTEROID_ARCHETYPES[planet.name as AsteroidName] : null

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xl">{glyph}</span>
        <span className={`font-heading text-base font-semibold ${isAsteroidBody ? 'text-amber-500' : 'text-mystic-gold'}`}>
          {planet.name === 'NorthNode' ? 'North Node' : planet.name}
        </span>
        {archetype && (
          <span className="text-xs border border-amber-500/30 rounded px-1.5 py-0.5 text-amber-500/80 bg-amber-500/10">
            {archetype}
          </span>
        )}
        {planet.retrograde && planet.name !== 'NorthNode' && (
          <span className="text-mystic-muted text-xs border border-mystic-muted/30 rounded px-1">Rx</span>
        )}
        {dignity && (
          <span className={`text-xs font-medium border rounded px-1.5 py-0.5 ${dignity.color} ${dignity.bgColor} border-current/20`}>
            {dignity.symbol} {dignity.label}
          </span>
        )}
      </div>
      <div className="text-mystic-muted text-xs">
        {planet.degree}°{planet.minute}' {ZODIAC_GLYPHS[planet.sign]} {planet.sign}
        {planet.house > 0 && ` — House ${planet.house}`}
      </div>

      {/* Asteroid archetype note */}
      {isAsteroidBody && archetype && (
        <p className="text-mystic-text/80 text-sm leading-relaxed italic">
          {planet.name} carries the {archetype.toLowerCase()} archetype — a transpersonal influence that colors themes in your chart.
        </p>
      )}

      {/* Sign interpretation */}
      {signInterp && (
        <div>
          <div className="text-mystic-gold/80 font-medium text-xs uppercase tracking-wider mb-1">
            {planet.name === 'NorthNode' ? 'North Node' : planet.name} in {planet.sign}
          </div>
          <p className="text-mystic-text/90 text-sm leading-relaxed">{signInterp.detail}</p>
        </div>
      )}

      {/* House interpretation */}
      {houseInterp && (
        <div>
          <div className="text-mystic-gold/80 font-medium text-xs uppercase tracking-wider mb-1">
            {planet.name === 'NorthNode' ? 'North Node' : planet.name} in House {planet.house}
          </div>
          <p className="text-mystic-text/90 text-sm leading-relaxed">{houseInterp.detail}</p>
        </div>
      )}

      {/* Dignity */}
      {dignity && (
        <div className={`rounded-md p-2.5 ${dignity.bgColor}`}>
          <div className={`font-medium text-xs uppercase tracking-wider mb-1 ${dignity.color}`}>
            {dignity.symbol} {dignity.label}
          </div>
          <p className="text-mystic-text/80 text-sm leading-relaxed">{dignity.description}</p>
        </div>
      )}

      {/* Retrograde */}
      {retroInterp && (
        <div className="rounded-md p-2.5 bg-red-900/10">
          <div className="font-medium text-xs uppercase tracking-wider mb-1 text-red-400">
            ℞ Retrograde at Birth
          </div>
          <p className="text-mystic-text/80 text-sm leading-relaxed">{retroInterp.detail}</p>
        </div>
      )}
    </div>
  )
}

function AspectTooltip({ aspect }: { aspect: Aspect }) {
  const interp = getAspectInterpretation(aspect)
  const g1 = getBodyGlyph(aspect.planet1 as BodyName)
  const g2 = getBodyGlyph(aspect.planet2 as BodyName)
  const aspectName = aspect.type.charAt(0).toUpperCase() + aspect.type.slice(1)
  const natureColor = aspect.nature === 'harmonious' ? 'text-green-400' : aspect.nature === 'challenging' ? 'text-red-400' : 'text-mystic-gold'

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span>{g1}</span>
        <span className={`${natureColor} text-lg`}>{aspect.symbol}</span>
        <span>{g2}</span>
        <span className="text-mystic-text font-heading text-sm font-semibold flex-1">
          {aspect.planet1} {aspectName} {aspect.planet2}
        </span>
      </div>
      <div className="text-mystic-muted text-xs">
        Orb {aspect.orb.toFixed(1)}° · {aspect.applying ? 'Applying' : 'Separating'} · {getAspectNatureLabel(aspect.nature)}
      </div>

      {/* Interpretation */}
      {interp && (
        <div className="border-t border-mystic-gold/10 pt-2">
          <p className="text-mystic-gold/80 text-xs font-medium mb-1">{interp.brief}</p>
          <p className="text-mystic-text/90 text-sm leading-relaxed">{interp.detail}</p>
        </div>
      )}
      {!interp && (
        <p className="text-mystic-muted text-sm italic">This is a minor aspect contributing subtle energy to your chart.</p>
      )}
    </div>
  )
}

function HouseTooltip({ houseNum, chartData }: { houseNum: number; chartData: ChartData }) {
  const theme = HOUSE_THEMES.find(h => h.house === houseNum)
  if (!theme) return null
  const houseData = chartData.houses.find(h => h.house === houseNum)
  const planetsInHouse = chartData.planets.filter(p => p.house === houseNum)

  return (
    <div className="space-y-2">
      <div className="text-mystic-purple font-heading text-base font-semibold">{theme.name}</div>
      <div className="text-mystic-gold text-xs">{theme.theme}</div>
      <div className="text-mystic-muted text-xs">
        Ruled by {PLANET_GLYPHS[theme.naturalRuler]} {theme.naturalRuler} · {ZODIAC_GLYPHS[theme.naturalSign]} {theme.naturalSign}
        {houseData ? ` · Cusp ${houseData.degree}°${houseData.minute}' ${houseData.sign}` : ''}
      </div>
      <p className="text-mystic-text/90 text-sm leading-relaxed">{theme.brief}</p>
      {planetsInHouse.length > 0 && (
        <div className="text-mystic-gold text-xs font-medium pt-1 border-t border-mystic-gold/10">
          Planets here: {planetsInHouse.map(p => `${getBodyGlyph(p.name as BodyName)} ${p.name}`).join(', ')}
        </div>
      )}
    </div>
  )
}

/* ─── Transit Tooltip Components ─── */

function TransitPlanetTooltip({ planet, transitAspects }: { planet: TransitPosition; transitAspects?: TransitAspect[] }) {
  const glyph = getBodyGlyph(planet.name as BodyName)
  const relatedAspects = transitAspects?.filter(a => a.transitPlanet === planet.name) ?? []

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xl">{glyph}</span>
        <span className="text-[#5ec4c4] font-heading text-base font-semibold">
          {planet.name === 'NorthNode' ? 'North Node' : planet.name}
        </span>
        <span className="text-xs border border-[#5ec4c4]/40 rounded px-1.5 py-0.5 text-[#5ec4c4]/80 bg-[#5ec4c4]/10">Transit</span>
        {planet.retrograde && planet.name !== 'NorthNode' && (
          <span className="text-mystic-muted text-xs border border-mystic-muted/30 rounded px-1">Rx</span>
        )}
      </div>
      <div className="text-mystic-muted text-xs">
        {planet.degree}°{planet.minute}' {ZODIAC_GLYPHS[planet.sign]} {planet.sign}
        {planet.house > 0 && ` — Transiting House ${planet.house}`}
      </div>
      <div className="text-mystic-muted text-xs">
        Daily motion: {Math.abs(planet.dailyMotion).toFixed(2)}°/day {planet.dailyMotion >= 0 ? 'direct' : 'retrograde'}
      </div>
      {planet.house > 0 && (
        <div className="text-[#5ec4c4]/80 text-sm">
          Currently transiting your {planet.house}{planet.house === 1 ? 'st' : planet.house === 2 ? 'nd' : planet.house === 3 ? 'rd' : 'th'} house
        </div>
      )}
      {relatedAspects.length > 0 && (
        <div className="border-t border-[#5ec4c4]/15 pt-2">
          <div className="text-[#5ec4c4]/80 font-medium text-xs uppercase tracking-wider mb-1">
            Active Aspects to Natal
          </div>
          <div className="space-y-1">
            {relatedAspects.map((a, i) => {
              const g2 = getBodyGlyph(a.natalPlanet as BodyName)
              const natureColor = a.nature === 'harmonious' ? 'text-green-400' : a.nature === 'challenging' ? 'text-red-400' : 'text-mystic-gold'
              return (
                <div key={i} className="flex items-center gap-1.5 text-xs">
                  <span className={natureColor}>{a.symbol}</span>
                  <span className="text-mystic-text">{g2} Natal {a.natalPlanet}</span>
                  <span className="text-mystic-muted">({a.orb}° orb, {a.applying ? 'applying' : 'separating'})</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function TransitAspectTooltip({ aspect }: { aspect: TransitAspect }) {
  const g1 = getBodyGlyph(aspect.transitPlanet as BodyName)
  const g2 = getBodyGlyph(aspect.natalPlanet as BodyName)
  const aspectName = aspect.type.charAt(0).toUpperCase() + aspect.type.slice(1)
  const natureColor = aspect.nature === 'harmonious' ? 'text-green-400' : aspect.nature === 'challenging' ? 'text-red-400' : 'text-mystic-gold'

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[#5ec4c4]">{g1}</span>
        <span className={`${natureColor} text-lg`}>{aspect.symbol}</span>
        <span className="text-mystic-gold">{g2}</span>
        <span className="text-mystic-text font-heading text-sm font-semibold flex-1">
          Transit {aspect.transitPlanet} {aspectName} Natal {aspect.natalPlanet}
        </span>
      </div>
      <div className="text-mystic-muted text-xs">
        Orb {aspect.orb.toFixed(1)}° · {aspect.applying ? 'Applying' : 'Separating'} · {getAspectNatureLabel(aspect.nature)}
      </div>
    </div>
  )
}

export default function ChartWheel({ chartData, aspects, transitPlanets, transitAspects }: ChartWheelProps) {
  const [hover, setHover] = useState<HoverState>(null)
  const [tapped, setTapped] = useState(false)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
  const [isTouch, setIsTouch] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const ascLon = chartData.angles.ascendant.longitude

  // Detect touch device on first touch event
  useEffect(() => {
    const onTouch = () => { setIsTouch(true) }
    window.addEventListener('touchstart', onTouch, { once: true, passive: true })
    return () => window.removeEventListener('touchstart', onTouch)
  }, [])

  const offset = useCallback((lon: number) => lon - ascLon, [ascLon])

  const hoveredPlanet = hover?.kind === 'planet' ? hover.key : null
  const hoveredTransit = hover?.kind === 'transit' ? hover.key : null

  const filteredAspects = aspects.filter(a =>
    ['conjunction', 'sextile', 'square', 'trine', 'opposition'].includes(a.type)
  )

  // ─── Interaction handlers ───

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (tapped || isTouch) return // don't track mouse when tapped or touch device
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }, [tapped, isTouch])

  const handleHoverEnter = useCallback((state: HoverState) => {
    if (tapped || isTouch) return // don't interfere when something is pinned or on touch
    setHover(state)
  }, [tapped, isTouch])

  const handleHoverLeave = useCallback(() => {
    if (tapped || isTouch) return
    setHover(null)
  }, [tapped, isTouch])

  const handleTap = useCallback((state: HoverState, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    // If tapping the same item, close it
    if (tapped && hover && state && hover.key === state.key && hover.kind === state.kind) {
      setHover(null)
      setTapped(false)
      setMousePos(null)
      return
    }
    setHover(state)
    setTapped(true)
  }, [tapped, hover])

  const dismiss = useCallback(() => {
    setHover(null)
    setTapped(false)
    setMousePos(null)
  }, [])

  const handleContainerLeave = useCallback(() => {
    if (!tapped) {
      setHover(null)
      setMousePos(null)
    }
  }, [tapped])

  // Compute tooltip position clamped within the container (desktop hover only)
  const tooltipStyle = useMemo((): React.CSSProperties => {
    if (!mousePos || !hover || !containerRef.current || tapped) return { display: 'none' }
    const rect = containerRef.current.getBoundingClientRect()
    const tooltipW = 380
    let left = mousePos.x + 16
    let top = mousePos.y + 16
    // Clamp right edge
    if (left + tooltipW > rect.width) left = mousePos.x - tooltipW - 16
    if (left < 0) left = 8
    // Clamp bottom edge — nudge up if off-screen
    if (top + 200 > rect.height) top = mousePos.y - 200 - 16
    if (top < 0) top = 8
    return {
      position: 'absolute',
      left,
      top,
      width: tooltipW,
      zIndex: 50,
      pointerEvents: 'none' as const,
    }
  }, [mousePos, hover, tapped])

  const tooltipBorderColor = useMemo(() => {
    if (!hover) return '#c9a84c'
    if (hover.kind === 'house') return '#7c5cbf'
    if (hover.kind === 'transit' || hover.kind === 'transitAspect') return '#5ec4c4'
    if (hover.kind === 'aspect') {
      const a = filteredAspects[parseInt(hover.key)]
      return a ? getAspectColor(a.nature) : '#c9a84c'
    }
    return '#c9a84c'
  }, [hover, filteredAspects])

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleContainerLeave}
    >
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full mx-auto chart-svg"
        role="img"
        aria-label="Natal birth chart wheel"
        onClick={dismiss}
      >
        <defs>
          <radialGradient id="chartBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10101a" />
            <stop offset="100%" stopColor="#0a0a0f" />
          </radialGradient>

          <filter id="planetGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="goldGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feFlood floodColor="#c9a84c" floodOpacity="0.4" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="sunGlow" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="moonGlow" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="sweepGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#c9a84c" stopOpacity="0" />
            <stop offset="30%" stopColor="#c9a84c" stopOpacity="0.18" />
            <stop offset="50%" stopColor="#e8c85c" stopOpacity="0.25" />
            <stop offset="70%" stopColor="#c9a84c" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#c9a84c" stopOpacity="0" />
          </linearGradient>

          {/* Transit planet glow filter (teal) */}
          <filter id="transitGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feFlood floodColor="#5ec4c4" floodOpacity="0.35" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Asteroid glow filter (amber) */}
          <filter id="asteroidGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feFlood floodColor="#d97706" floodOpacity="0.35" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <circle cx={CX} cy={CY} r={OUTER_R} fill="url(#chartBg)" stroke="#3a3a50" strokeWidth="1.2" className="chart-outer-ring" />

        {/* Degree tick marks on outer ring */}
        {(() => {
          let majorD = ''
          let minorD = ''
          for (let deg = 0; deg < 360; deg++) {
            const angle = offset(deg)
            const isMajor = deg % 10 === 0
            const outer = polarToXY(CX, CY, OUTER_R, angle)
            const inner = polarToXY(CX, CY, OUTER_R - (isMajor ? 5 : 2.5), angle)
            const segment = `M${outer.x.toFixed(2)},${outer.y.toFixed(2)}L${inner.x.toFixed(2)},${inner.y.toFixed(2)}`
            if (isMajor) majorD += segment
            else minorD += segment
          }
          return (
            <>
              <path d={majorD} stroke="#3a3a50" strokeWidth={0.8} fill="none" />
              <path d={minorD} stroke="#2a2a3a" strokeWidth={0.4} fill="none" />
            </>
          )
        })()}

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
              <path d={d} fill={elementColor} stroke="none" />
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

        {/* Sweeping light arc across outer ring — 120° wide, narrow band */}
        <g className="chart-sweep">
          {(() => {
            const sweepInner = OUTER_R - 18
            const ang = (2 * Math.PI) / 3
            const x1o = CX + OUTER_R * Math.sin(ang)
            const y1o = CY - OUTER_R * Math.cos(ang)
            const x1i = CX + sweepInner * Math.sin(ang)
            const y1i = CY - sweepInner * Math.cos(ang)
            return (
              <path
                d={`M ${CX} ${CY - OUTER_R} A ${OUTER_R} ${OUTER_R} 0 0 1 ${x1o} ${y1o} L ${x1i} ${y1i} A ${sweepInner} ${sweepInner} 0 0 0 ${CX} ${CY - sweepInner} Z`}
                fill="url(#sweepGrad)"
                opacity="1"
              />
            )
          })()}
        </g>

        {/* Inner circle */}
        <circle cx={CX} cy={CY} r={INNER_R} fill="none" stroke="#3a3a50" strokeWidth="1" />

        {/* Bi-wheel divider — separates natal planets (inner) from transit planets (outer) */}
        {transitPlanets && transitPlanets.length > 0 && (
          <circle cx={CX} cy={CY} r={276} fill="none" stroke="#3a5050" strokeWidth="1" strokeDasharray="4 3" opacity={0.85} />
        )}

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
            const isHouseHovered = hover?.kind === 'house' && hover.key === String(house.house)

            return (
              <g key={`house-${house.house}`}>
                <line
                  x1={outerPoint.x}
                  y1={outerPoint.y}
                  x2={innerPoint.x}
                  y2={innerPoint.y}
                  stroke={isHouseHovered ? '#c9a84c' : isAngular ? '#c9a84c88' : '#3a3a50'}
                  strokeWidth={isHouseHovered ? 2 : isAngular ? 1.5 : 0.8}
                  style={{ transition: 'stroke 200ms ease, stroke-width 200ms ease' }}
                />
                <text
                  x={numPos.x}
                  y={numPos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isHouseHovered ? '#c9a84c' : '#5a5666'}
                  fontSize="11"
                  className="cursor-pointer"
                  fontWeight={isHouseHovered ? '600' : '400'}
                  onMouseEnter={() => handleHoverEnter({ kind: 'house', key: String(house.house) })}
                  onMouseLeave={handleHoverLeave}
                  onClick={(e) => handleTap({ kind: 'house', key: String(house.house) }, e)}
                  style={{ transition: 'fill 200ms ease' }}
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

            const r1 = isAsteroid(p1.name as BodyName) ? ASTEROID_R : PLANET_R
            const r2 = isAsteroid(p2.name as BodyName) ? ASTEROID_R : PLANET_R
            const pos1 = polarToXY(CX, CY, r1, offset(p1.longitude))
            const pos2 = polarToXY(CX, CY, r2, offset(p2.longitude))
            const color = getAspectColor(aspect.nature)
            const baseOpacity = Math.max(0.15, 1 - aspect.orb / 8)
            const isAspectHovered = hover?.kind === 'aspect' && hover.key === String(i)

            const isConnected = !hoveredPlanet ||
              aspect.planet1 === hoveredPlanet ||
              aspect.planet2 === hoveredPlanet
            const opacity = isAspectHovered
              ? 1
              : hoveredTransit
                ? 0.04
                : hoveredPlanet
                  ? (isConnected ? Math.min(baseOpacity + 0.2, 0.9) : 0.04)
                  : baseOpacity

            const len = Math.sqrt((pos2.x - pos1.x) ** 2 + (pos2.y - pos1.y) ** 2)

            return (
              <g key={`aspect-${i}`}>
                <line
                  className="chart-aspect-line"
                  x1={pos1.x}
                  y1={pos1.y}
                  x2={pos2.x}
                  y2={pos2.y}
                  stroke={isAspectHovered ? '#e8e6e3' : color}
                  strokeWidth={isAspectHovered ? 2.5 : aspect.orb < 2 ? 1.5 : 0.8}
                  opacity={opacity}
                  strokeDasharray={len}
                  strokeDashoffset="0"
                  style={{ '--line-len': len, transition: 'opacity 300ms ease, stroke-width 200ms ease, stroke 200ms ease' } as React.CSSProperties}
                />
                <line
                  x1={pos1.x}
                  y1={pos1.y}
                  x2={pos2.x}
                  y2={pos2.y}
                  stroke="transparent"
                  strokeWidth="12"
                  className="cursor-pointer"
                  onMouseEnter={() => handleHoverEnter({ kind: 'aspect', key: String(i) })}
                  onMouseLeave={handleHoverLeave}
                  onClick={(e) => handleTap({ kind: 'aspect', key: String(i) }, e)}
                />
              </g>
            )
          })}
        </g>

        {/* Planets (classical — asteroids rendered separately below) */}
        {chartData.planets.filter(p => !isAsteroid(p.name as BodyName)).map((planet, idx) => {
          const pos = polarToXY(CX, CY, PLANET_R, offset(planet.longitude))
          const isHovered = hoveredPlanet === planet.name
          const glyph = PLANET_GLYPHS[planet.name as PlanetName | 'NorthNode'] ?? '?'

          const isSun = planet.name === 'Sun'
          const isMoon = planet.name === 'Moon'
          const glowFilter = isSun ? 'url(#sunGlow)' : isMoon ? 'url(#moonGlow)' : 'url(#planetGlow)'
          const glowClass = isSun ? 'chart-sun-glow' : isMoon ? 'chart-moon-glow' : 'chart-planet-glow'
          const restStroke = isSun ? '#5a4a20' : isMoon ? '#3a4a5a' : '#2a2a3a'

          return (
            <g
              key={planet.name}
              onMouseEnter={() => handleHoverEnter({ kind: 'planet', key: planet.name })}
              onMouseLeave={handleHoverLeave}
              onClick={(e) => handleTap({ kind: 'planet', key: planet.name }, e)}
              className="chart-planet cursor-pointer"
              style={{ animationDelay: `${0.5 + idx * 0.07}s` }}
            >
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isHovered ? 20 : (isSun ? 22 : isMoon ? 18 : 14)}
                fill={isSun ? '#e8a820' : isMoon ? '#b8c8e8' : '#9080c0'}
                filter={glowFilter}
                opacity={isHovered ? 0.7 : (isSun ? 0.55 : isMoon ? 0.45 : 0.2)}
                className={glowClass}
                style={{
                  animationDelay: isSun ? '0s' : isMoon ? '3s' : `${idx * 0.8}s`,
                  transition: 'r 200ms ease, opacity 200ms ease',
                }}
              />
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

        {/* Asteroids — inner amber ring at ASTEROID_R with de-collision */}
        {(() => {
          const asteroidPlanets = chartData.planets.filter(p => isAsteroid(p.name as BodyName))
          const displayAngles = asteroidPlanets.map(p => offset(p.longitude))
          for (let i = 0; i < displayAngles.length; i++) {
            for (let j = i + 1; j < displayAngles.length; j++) {
              let diff = displayAngles[j] - displayAngles[i]
              if (diff > 180) diff -= 360
              if (diff < -180) diff += 360
              if (Math.abs(diff) < 5) {
                const avg = (displayAngles[i] + displayAngles[j]) / 2
                displayAngles[i] = avg - 3
                displayAngles[j] = avg + 3
              }
            }
          }
          return asteroidPlanets.map((asteroid, idx) => {
            const pos = polarToXY(CX, CY, ASTEROID_R, displayAngles[idx])
            const isHovered = hoveredPlanet === asteroid.name
            const glyph = ASTEROID_GLYPHS[asteroid.name as AsteroidName] ?? '?'

            return (
              <g
                key={asteroid.name}
                onMouseEnter={() => handleHoverEnter({ kind: 'planet', key: asteroid.name })}
                onMouseLeave={handleHoverLeave}
                onClick={(e) => handleTap({ kind: 'planet', key: asteroid.name }, e)}
                className="chart-planet cursor-pointer"
                style={{ animationDelay: `${0.5 + idx * 0.09}s` }}
              >
                {/* Amber glow */}
                <circle
                  cx={pos.x} cy={pos.y}
                  r={isHovered ? 16 : 12}
                  fill="#d97706"
                  filter="url(#asteroidGlow)"
                  opacity={isHovered ? 0.5 : 0.15}
                  style={{ transition: 'r 200ms ease, opacity 200ms ease' }}
                />
                {/* Circle */}
                <circle
                  cx={pos.x} cy={pos.y}
                  r={isHovered ? 13 : 10}
                  fill="#0a0a0f"
                  stroke={isHovered ? '#d97706' : '#3a2800'}
                  strokeWidth={isHovered ? 1.5 : 0.7}
                  style={{ transition: 'r 200ms ease, stroke 200ms ease, stroke-width 200ms ease' }}
                />
                {/* Glyph */}
                <text
                  x={pos.x} y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isHovered ? '#d97706' : '#c49a30'}
                  fontSize={isHovered ? 13 : 11}
                  fontFamily="serif"
                  style={{ transition: 'fill 200ms ease, font-size 200ms ease' }}
                >
                  {glyph}
                </text>
                {asteroid.retrograde && (
                  <text
                    x={pos.x + 9} y={pos.y - 7}
                    fill="#b54a4a"
                    fontSize="7"
                    fontFamily="sans-serif"
                  >
                    R
                  </text>
                )}
              </g>
            )
          })
        })()}

        {/* Transit-to-natal aspect lines (dashed) — only visible when a transit planet is hovered/tapped */}
        {transitPlanets && transitAspects && (hoveredTransit || hoveredPlanet || (hover?.kind === 'transitAspect')) && (() => {
          const majorTypes = ['conjunction', 'sextile', 'square', 'trine', 'opposition']
          const filtered = transitAspects
            .map((ta, origIdx) => ({ ta, origIdx }))
            .filter(({ ta }) => majorTypes.includes(ta.type) && ta.orb <= 5)
            .filter(({ ta }) =>
              hoveredTransit ? ta.transitPlanet === hoveredTransit
              : hoveredPlanet ? ta.natalPlanet === hoveredPlanet
              : true
            )
          return (
          <g className="chart-transit-aspects-group">
            {filtered.map(({ ta, origIdx }) => {
              const tp = transitPlanets.find(p => p.name === ta.transitPlanet)
              const np = chartData.planets.find(p => p.name === ta.natalPlanet)
              if (!tp || !np) return null

              const pos1 = polarToXY(CX, CY, TRANSIT_PLANET_R, offset(tp.longitude))
              const natalR = isAsteroid(np.name as BodyName) ? ASTEROID_R : PLANET_R
              const pos2 = polarToXY(CX, CY, natalR, offset(np.longitude))
              const color = getAspectColor(ta.nature)
              const isTAHovered = hover?.kind === 'transitAspect' && hover.key === String(origIdx)
              const opacity = isTAHovered ? 1 : 0.6

              return (
                <g key={`ta-${origIdx}`}>
                  <line
                    x1={pos1.x} y1={pos1.y}
                    x2={pos2.x} y2={pos2.y}
                    stroke={isTAHovered ? '#e8e6e3' : color}
                    strokeWidth={isTAHovered ? 2.5 : ta.orb < 2 ? 1.2 : 0.7}
                    strokeDasharray="6 4"
                    opacity={opacity}
                    style={{ transition: 'opacity 300ms ease, stroke-width 200ms ease, stroke 200ms ease' }}
                  />
                  <line
                    x1={pos1.x} y1={pos1.y}
                    x2={pos2.x} y2={pos2.y}
                    stroke="transparent"
                    strokeWidth="12"
                    className="cursor-pointer"
                    onMouseEnter={() => handleHoverEnter({ kind: 'transitAspect', key: String(origIdx) })}
                    onMouseLeave={handleHoverLeave}
                    onClick={(e) => handleTap({ kind: 'transitAspect', key: String(origIdx) }, e)}
                  />
                </g>
              )
            })}
          </g>
          )
        })()}

        {/* Transit planets (outer ring) */}
        {transitPlanets && transitPlanets.map((tp, idx) => {
          // Nudge outward if within 8° of a natal planet to avoid overlap
          let r = TRANSIT_PLANET_R
          const tooClose = chartData.planets.some(np => {
            const diff = Math.abs(tp.longitude - np.longitude)
            const angleDiff = diff > 180 ? 360 - diff : diff
            return angleDiff < 8
          })
          if (tooClose) r = TRANSIT_PLANET_R + 12

          const pos = polarToXY(CX, CY, r, offset(tp.longitude))
          const isHovered = hoveredTransit === tp.name
          const glyph = getBodyGlyph(tp.name as BodyName)

          return (
            <g
              key={`transit-${tp.name}`}
              onMouseEnter={() => handleHoverEnter({ kind: 'transit', key: tp.name })}
              onMouseLeave={handleHoverLeave}
              onClick={(e) => handleTap({ kind: 'transit', key: tp.name }, e)}
              className="chart-transit-planet cursor-pointer"
              style={{ animationDelay: `${0.5 + idx * 0.07}s` }}
            >
              {/* Glow */}
              <circle
                cx={pos.x} cy={pos.y}
                r={isHovered ? 16 : 12}
                fill="#5ec4c4"
                filter="url(#transitGlow)"
                opacity={isHovered ? 0.6 : 0.15}
                style={{ transition: 'r 200ms ease, opacity 200ms ease' }}
              />
              {/* Circle */}
              <circle
                cx={pos.x} cy={pos.y}
                r={isHovered ? 14 : 11}
                fill="#0a0a0f"
                stroke={isHovered ? '#5ec4c4' : '#1e3a3a'}
                strokeWidth={isHovered ? 1.5 : 0.7}
                style={{ transition: 'r 200ms ease, stroke 200ms ease, stroke-width 200ms ease' }}
              />
              {/* Glyph */}
              <text
                x={pos.x} y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isHovered ? '#5ec4c4' : '#8adada'}
                fontSize={isHovered ? 14 : 12}
                fontFamily="serif"
                style={{ transition: 'fill 200ms ease, font-size 200ms ease' }}
              >
                {glyph}
              </text>
              {/* "T" superscript marker */}
              <text
                x={pos.x + 10} y={pos.y - 8}
                fill="#5ec4c4"
                fontSize="7"
                fontFamily="sans-serif"
                opacity={0.7}
              >
                T
              </text>
              {tp.retrograde && tp.name !== 'NorthNode' && (
                <text
                  x={pos.x + 10} y={pos.y + 2}
                  fill="#b54a4a"
                  fontSize="7"
                  fontFamily="sans-serif"
                >
                  R
                </text>
              )}
              {/* Larger touch target */}
              <circle
                cx={pos.x} cy={pos.y}
                r={16}
                fill="transparent"
              />
            </g>
          )
        })}

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

      {/* ─── Desktop Hover Tooltip (cursor-following) ─── */}
      {hover && mousePos && !tapped && (
        <div
          style={{
            ...tooltipStyle,
            borderColor: tooltipBorderColor,
          }}
          className="rounded-xl border bg-[#12121af0] backdrop-blur-sm shadow-2xl shadow-black/60 overflow-y-auto scrollbar-thin scrollbar-thumb-mystic-gold/20 scrollbar-track-transparent"
        >
          <div className="p-4">
            {hover.kind === 'planet' && (() => {
              const planet = chartData.planets.find(p => p.name === hover.key)
              if (!planet) return null
              return <PlanetTooltip planet={planet} chartData={chartData} />
            })()}
            {hover.kind === 'transit' && (() => {
              const tp = transitPlanets?.find(p => p.name === hover.key)
              if (!tp) return null
              return <TransitPlanetTooltip planet={tp} transitAspects={transitAspects} />
            })()}
            {hover.kind === 'aspect' && (() => {
              const aspect = filteredAspects[parseInt(hover.key)]
              if (!aspect) return null
              return <AspectTooltip aspect={aspect} />
            })()}
            {hover.kind === 'transitAspect' && (() => {
              const ta = transitAspects?.[parseInt(hover.key)]
              if (!ta) return null
              return <TransitAspectTooltip aspect={ta} />
            })()}
            {hover.kind === 'house' && (
              <HouseTooltip houseNum={parseInt(hover.key)} chartData={chartData} />
            )}
          </div>
        </div>
      )}

      {/* ─── Tapped / Mobile Bottom Sheet Modal ─── */}
      {hover && tapped && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={dismiss}
          />
          {/* Modal sheet */}
          <div
            className="fixed z-50 left-0 right-0 bottom-0 sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-md sm:rounded-xl"
            style={{ borderColor: tooltipBorderColor }}
          >
            <div className="bg-[#12121af5] backdrop-blur-md border-t sm:border border-mystic-gold/30 sm:rounded-xl rounded-t-2xl flex flex-col shadow-2xl shadow-black/80">
              {/* Drag handle (mobile) + close button */}
              <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
                <div className="sm:hidden w-10 h-1 rounded-full bg-mystic-muted/30 mx-auto" />
                <button
                  onClick={dismiss}
                  className="ml-auto text-mystic-muted hover:text-mystic-text transition-colors p-1 -mr-1"
                  aria-label="Close"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="5" y1="5" x2="15" y2="15" />
                    <line x1="15" y1="5" x2="5" y2="15" />
                  </svg>
                </button>
              </div>
              {/* Content */}
              <div className="overflow-y-auto px-4 pb-6 pt-1 scrollbar-thin scrollbar-thumb-mystic-gold/20 scrollbar-track-transparent">
                {hover.kind === 'planet' && (() => {
                  const planet = chartData.planets.find(p => p.name === hover.key)
                  if (!planet) return null
                  return <PlanetTooltip planet={planet} chartData={chartData} />
                })()}
                {hover.kind === 'transit' && (() => {
                  const tp = transitPlanets?.find(p => p.name === hover.key)
                  if (!tp) return null
                  return <TransitPlanetTooltip planet={tp} transitAspects={transitAspects} />
                })()}
                {hover.kind === 'aspect' && (() => {
                  const aspect = filteredAspects[parseInt(hover.key)]
                  if (!aspect) return null
                  return <AspectTooltip aspect={aspect} />
                })()}
                {hover.kind === 'transitAspect' && (() => {
                  const ta = transitAspects?.[parseInt(hover.key)]
                  if (!ta) return null
                  return <TransitAspectTooltip aspect={ta} />
                })()}
                {hover.kind === 'house' && (
                  <HouseTooltip houseNum={parseInt(hover.key)} chartData={chartData} />
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
