import { useMemo, useState, useEffect, useCallback, useTransition, useRef, memo } from 'react'
import type { TransitPeriod } from '../../engine/transits'
import type { ChartData, PlanetName, ZodiacSign } from '../../engine/types'
import { PLANET_GLYPHS, ZODIAC_GLYPHS, getBodyGlyph } from '../../engine/types'
import { formatPosition } from '../../engine/zodiac'
import type { Aspect } from '../../engine/aspects'
import ChartWheel from '../chart/ChartWheel'
import AspectRow from './AspectRow'

import { computeTransitAspectBrief } from '../../data/interpretations/transitAspectBriefs'
import { TRANSIT_RETROGRADE } from '../../data/interpretations/retrogrades'
import { LruMap } from '../../utils/lruMap'
import { isQuotaError } from '../../utils/storage'

import type { MarkerCategory, SnapshotScore, AdvanceSnapshot, AdvanceConfig } from '../../engine/advanceScoring'
import { ADVANCE_CONFIG, preCalculateSnapshots } from '../../engine/advanceScoring'

// ─── Marker Colors ────────────────────────────────────────────────────────────

export const MARKER_COLORS: Record<MarkerCategory, string> = {
  power:       '#c9a84c', // mystic-gold
  favorable:   '#34d399', // emerald-400
  challenging: '#f87171', // red-400
  shift:       '#60a5fa', // blue-400
  neutral:     'transparent',
}

export const CATEGORY_LABELS: Record<MarkerCategory, string> = {
  power:       'Power Day',
  favorable:   'Favorable Window',
  challenging: 'Challenging Period',
  shift:       'Planetary Shift',
  neutral:     '',
}

/** Halo box-shadow value per category — drives the CSS variable --thumb-halo (task-0005). */
export const CATEGORY_HALO: Record<Exclude<MarkerCategory, 'neutral'>, string> = {
  power:       '0 0 10px 3px rgba(201,168,76,0.35), 0 0 20px 6px rgba(201,168,76,0.20)',
  favorable:   '0 0 10px 3px rgba(52,211,153,0.35), 0 0 20px 6px rgba(52,211,153,0.20)',
  challenging: '0 0 10px 3px rgba(248,113,113,0.35), 0 0 20px 6px rgba(248,113,113,0.20)',
  shift:       '0 0 10px 3px rgba(96,165,250,0.35), 0 0 20px 6px rgba(96,165,250,0.20)',
}

// ─── Session-level singleton cache (shared with TodayPage) ───────────────────
export const advanceSnapshotSessionCache = new LruMap<string, AdvanceSnapshot[]>(6)

// ─── Banner helpers ───────────────────────────────────────────────────────────

function formatScoreAsBannerText(score: SnapshotScore): string {
  return score.reason
}

/**
 * Compute the banner for a snapshot — delegates to pre-computed score.
 * spec 2.1
 */
function computePowerDayBanner(snapshot: AdvanceSnapshot): string | null {
  if (snapshot.offset === 0) return null
  if (snapshot.score.category === 'neutral') return null
  return formatScoreAsBannerText(snapshot.score)
}

// ─── Priority order for marker comparison ────────────────────────────────────

export const CATEGORY_PRIORITY: Record<MarkerCategory, number> = {
  power: 4,
  shift: 3,
  favorable: 2,
  challenging: 1,
  neutral: 0,
}

// ─── MarkerDot Component ─────────────────────────────────────────────────────

interface MarkerDotProps {
  marker: AdvanceSnapshot
  max: number
  active: boolean
  onClick: () => void
  onMouseEnter: (e: React.MouseEvent) => void
  onMouseLeave: () => void
}

export const MarkerDot = memo(function MarkerDot({
  marker,
  max,
  active,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: MarkerDotProps) {
  const { score } = marker
  const color = MARKER_COLORS[score.category]
  const baseSize = 5 + Math.round(score.intensity * 3) // 5–8px
  const size = active ? baseSize + 4 : baseSize
  const left = `${(marker.offset / max) * 100}%`

  const isDiamond = score.category === 'power' || score.category === 'shift'

  // Animation class by category
  const animClass = score.category === 'power'
    ? 'marker-anim-power'
    : score.category === 'challenging'
      ? 'marker-anim-challenging'
      : score.category === 'shift'
        ? 'marker-anim-shift'
        : '' // favorable: no animation

  const dotStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    flexShrink: 0,
    transform: isDiamond ? 'rotate(45deg)' : undefined,
    backgroundColor: color,
    borderRadius: isDiamond ? '1px' : '50%',
    opacity: active ? 1 : 0.85,
    // coShift ring
    outline: score.coShift ? '1px solid rgb(96 165 250)' : undefined,
    outlineOffset: score.coShift ? '1px' : undefined,
    // Active state uses larger size (already computed above) + full opacity.
    // No box-shadow animation — spec 10.6 prohibits it (CPU composited).
    // Static box-shadow on active is fine (not animated).
    boxShadow: active ? `0 0 10px 2px ${color}99` : undefined,
  }

  // Touch target wrapper (spec 13.1): invisible padding around visual dot
  const wrapperStyle: React.CSSProperties = {
    position: 'absolute',
    left,
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto',
    cursor: 'pointer',
  }

  return (
    <div
      style={wrapperStyle}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-label={`Jump to ${marker.dateStr}: ${score.reason}`}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
    >
      <div
        style={dotStyle}
        className={animClass}
      />
    </div>
  )
})

// ─── OverviewStrip Component ─────────────────────────────────────────────────

export interface OverviewStripProps {
  markers: AdvanceSnapshot[]
  max: number
  offset: number
  onJump: (offset: number) => void
  isPending: boolean
  config: AdvanceConfig
  unknownTime: boolean
  quietMessage?: string
  unknownTimeAnnotation?: string
}

export function OverviewStrip({
  markers,
  max,
  offset,
  onJump,
  isPending,
  config,
  unknownTime,
  quietMessage,
  unknownTimeAnnotation,
}: OverviewStripProps) {
  if (isPending) {
    return (
      <div className="mb-4">
        <div className="w-full h-10 rounded-full border border-mystic-border/30 bg-mystic-surface/20 flex items-center justify-center">
          <span className="text-mystic-muted text-[10px]">Reading your sky…</span>
        </div>
      </div>
    )
  }

  // Collision handling (spec 5.7): filter markers within 5% of a higher-priority one
  const sortedByPriority = [...markers].sort(
    (a, b) => CATEGORY_PRIORITY[b.score.category] - CATEGORY_PRIORITY[a.score.category]
  )
  const visibleMarkers: AdvanceSnapshot[] = []
  for (const m of sortedByPriority) {
    const pct = m.offset / max
    const tooClose = visibleMarkers.some(v => Math.abs(v.offset / max - pct) < 0.05)
    if (!tooClose) visibleMarkers.push(m)
  }

  return (
    <div className="mb-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-mystic-muted text-[10px] uppercase tracking-widest">Notable moments</span>
        <span className="text-mystic-muted text-[10px] uppercase tracking-widest">{config.max} {config.unitPlural}</span>
      </div>

      {/* Strip body */}
      <div className="w-full h-10 bg-mystic-surface/40 rounded-full border border-mystic-border/50 relative">
        {/* Dots inside strip */}
        {markers.length > 0 ? (
          visibleMarkers.map(m => {
            const isDiamond = m.score.category === 'power' || m.score.category === 'shift'
            return (
              <button
                key={m.offset}
                onClick={() => onJump(m.offset)}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                style={{
                  left: `${(m.offset / max) * 100}%`,
                  width: '10px',
                  height: '10px',
                  backgroundColor: MARKER_COLORS[m.score.category],
                  borderRadius: isDiamond ? '1px' : '50%',
                  transform: isDiamond
                    ? `translate(-50%, -50%) rotate(45deg)`
                    : 'translate(-50%, -50%)',
                }}
                aria-label={`Jump to ${m.dateStr}: ${m.score.reason}`}
              />
            )
          })
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-mystic-muted text-xs">{quietMessage ?? 'Quiet period — no exceptional moments detected'}</span>
          </div>
        )}

        {/* Current position indicator (spec 5.5) */}
        <div
          className="absolute top-0 h-full w-px bg-mystic-gold/40 pointer-events-none"
          style={{ left: `${(offset / max) * 100}%` }}
        />
      </div>

      {/* Unknown time annotation (spec 11.2) */}
      {unknownTime && (
        <p className="text-mystic-muted text-[10px] mt-1">
          {unknownTimeAnnotation ?? 'Birth time unknown — angle-contact power days not available'}
        </p>
      )}
    </div>
  )
}

// ─── Tooltip Component ────────────────────────────────────────────────────────

interface TooltipProps {
  marker: AdvanceSnapshot
  positionX: number   // percentage 0–100 of slider width
}

export function MarkerTooltip({ marker, positionX }: TooltipProps) {
  const { score } = marker
  const color = MARKER_COLORS[score.category]
  const label = CATEGORY_LABELS[score.category]

  const d = marker.date
  const dateStr = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  const orbSuffix = score.triggerAspect
    ? ` · ${score.triggerAspect.orb}° orb`
    : ''

  // Clamp left position so tooltip stays within container (spec 6.3)
  // Tooltip is 280px wide; container is ~100% wide. Adjust extremes.
  const clampedLeft = Math.max(0, Math.min(positionX, 85))

  // Truncate to first sentence for compact tooltip display; full text appears in banner.
  const firstSentence = score.reason.split('. ')[0]
  const tooltipReason = firstSentence.endsWith('.') ? firstSentence : firstSentence + '.'

  return (
    <div
      className="absolute pointer-events-none z-20"
      style={{
        bottom: 'calc(100% + 8px)',
        left: `${clampedLeft}%`,
        transform: 'translateX(-50%)',
      }}
    >
      {/* Connector line */}
      <div
        className="mx-auto w-px bg-mystic-gold/30 mb-1"
        style={{ height: '8px' }}
      />
      {/* Tooltip panel */}
      <div
        className="bg-mystic-bg/95 border border-mystic-gold/20 rounded-lg px-3 py-2 shadow-lg text-left"
        style={{ maxWidth: '280px' }}
      >
        <p className="text-[10px] text-mystic-muted mb-0.5">{dateStr}</p>
        <p className="text-[11px] font-medium mb-0.5" style={{ color }}>
          {label}{orbSuffix}
        </p>
        <p className="text-[10px] text-mystic-text/80" style={{ textWrap: 'balance' } as React.CSSProperties}>
          {tooltipReason}
        </p>
      </div>
    </div>
  )
}

// ─── Advance Tab Component ───────────────────────────────────────────────────

export default function AdvanceTab({
  chartData,
  aspects,
  period,
  baseDate,
  snapshots: snapshotsProp,
  isPending: isPendingProp,
}: {
  chartData: ChartData
  aspects: Aspect[]
  period: TransitPeriod
  baseDate: Date
  /** Pre-computed snapshots from the parent. When provided, internal computation is skipped. */
  snapshots?: AdvanceSnapshot[]
  /** Pending state from the parent's useTransition, passed through when snapshots come from the parent. */
  isPending?: boolean
}) {
  const config = ADVANCE_CONFIG[period]

  // Snapshot cache (spec 10.5): useRef-based cache keyed by chart identity + period + baseDate.
  // Chart identity is derived from ascendant/midheaven longitudes and unknownTime flag so that
  // switching charts (e.g. couple advance) always misses and recomputes instead of serving stale results.
  // Only used when the parent has not provided snapshots via prop.
  const snapshotCache = useRef<LruMap<string, AdvanceSnapshot[]>>(new LruMap(6))

  // Internal snapshot state — used only when parent does not supply snapshots via prop.
  const [internalSnapshots, setInternalSnapshots] = useState<AdvanceSnapshot[]>([])
  const [internalIsPending, startTransition] = useTransition()

  useEffect(() => {
    // If the parent supplies snapshots we skip internal computation entirely.
    if (snapshotsProp !== undefined) return

    const chartKey = `${chartData.angles.ascendant.longitude.toFixed(4)}:${chartData.angles.midheaven.longitude.toFixed(4)}:${chartData.unknownTime}`
    const cacheKey = `${chartKey}:${period}:${baseDate.toISOString()}`
    const cached = snapshotCache.current.get(cacheKey)
    if (cached) {
      setInternalSnapshots(cached)
      return
    }
    startTransition(() => {
      const computed = preCalculateSnapshots(chartData, period, baseDate)
      snapshotCache.current.set(cacheKey, computed)
      advanceSnapshotSessionCache.set(cacheKey, computed)
      setInternalSnapshots(computed)

      if (period === 'daily' && computed.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0]
        if (baseDate.toISOString().split('T')[0] === todayStr) {
          const signal = computed[0].score
          if (signal.category !== 'neutral') {
            try {
              localStorage.setItem(
                `advance-today-signal-${todayStr}`,
                JSON.stringify({ category: signal.category, intensity: signal.intensity, reason: signal.reason })
              )
            } catch (e) {
              if (isQuotaError(e)) {
                console.warn('[AdvanceTab] localStorage quota exceeded — advance signal not written.')
              }
            }
          }
        }
      }
    })
  }, [chartData, period, baseDate, snapshotsProp])

  // Use parent-provided snapshots when available, else fall back to internal state.
  const snapshots = snapshotsProp ?? internalSnapshots
  const isPending = snapshotsProp !== undefined ? (isPendingProp ?? false) : internalIsPending

  const [offset, setOffset] = useState(0)

  const snapshot = snapshots[offset]

  const handleSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setOffset(Number(e.target.value))
  }, [])

  // markers useMemo: keyed on snapshots only — not on offset (spec 1.14, 10.1)
  const markers = useMemo(
    () => snapshots.filter(s => s.score.category !== 'neutral' && s.offset > 0),
    [snapshots]
  )

  // Compute the banner for the currently selected snapshot (spec 2.1, 2.4)
  const categoryBanner = useMemo(() => {
    if (!snapshot) return null
    return computePowerDayBanner(snapshot)
  }, [snapshot])

  // Hover tooltip state (spec 6.1)
  const [hoveredMarker, setHoveredMarker] = useState<AdvanceSnapshot | null>(null)

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })

  const offsetLabel =
    offset === 0 ? 'Now' :
    offset === 1 ? `+1 ${config.unit}` :
    `+${offset} ${config.unitPlural}`

  // Count significant aspects (from snapshot when available)
  const harmonious = snapshot?.transitAspects.filter(a => a.nature === 'harmonious').length ?? 0
  const challenging = snapshot?.transitAspects.filter(a => a.nature === 'challenging').length ?? 0
  const activeRetrogrades = snapshot?.retrogrades.filter(r => r.isRetro || r.status.includes('Stationing')).length ?? 0

  // Next/prev marker navigation (spec 7.3)
  const nextMarker = markers.find(m => m.offset > offset) ?? null
  const prevMarker = [...markers].reverse().find(m => m.offset < offset && m.offset > 0) ?? null

  // Slider thumb class: power halo vs normal (spec 8.3)
  const thumbShadowClass = snapshot?.score.category === 'power'
    ? '[&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(201,168,76,0.8)]'
    : '[&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(201,168,76,0.5)]'

  // Thumb halo CSS variable (task-0005): drives the has-thumb-halo class shadow via CSS var
  const currentMarker = markers.find(m => m.offset === offset) ?? null
  const thumbHaloValue = currentMarker && currentMarker.score.category !== 'neutral'
    ? CATEGORY_HALO[currentMarker.score.category]
    : undefined

  // Aspect list header suffix (spec 8.1)
  const aspectHeaderSuffix = snapshot ? (
    snapshot.score.category === 'favorable' ? ' — Favorable window' :
    snapshot.score.category === 'challenging' ? ' — Tense configuration' :
    snapshot.score.category === 'power' ? ' — Power configuration' :
    snapshot.score.category === 'shift' ? ' — Planetary shift' :
    ''
  ) : ''

  // Retrograde section header (spec 8.2)
  const retrogradeHeader = snapshot?.score.category === 'shift' ? 'Planetary Shift' : 'Retrograde Activity'

  return (
    <div>
      {/* Animation styles (spec 4.1–4.6) — GPU-composited opacity+transform only */}
      <style>{`
        @keyframes glow-breathe-gold {
          0%, 100% { opacity: 0.75; transform: rotate(45deg) scale(1.0); }
          50%       { opacity: 1.0;  transform: rotate(45deg) scale(1.15); }
        }
        @keyframes glow-breathe-red {
          0%, 100% { opacity: 0.70; transform: scale(1.0); }
          50%       { opacity: 1.0;  transform: scale(1.1); }
        }
        @keyframes shift-rotate {
          0%, 100% { transform: rotate(40deg); opacity: 0.80; }
          50%       { transform: rotate(50deg); opacity: 1.0; }
        }
        .marker-anim-power {
          animation: glow-breathe-gold 3s ease-in-out infinite;
        }
        .marker-anim-challenging {
          animation: glow-breathe-red 2s ease-in-out infinite;
        }
        .marker-anim-shift {
          animation: shift-rotate 4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .marker-anim-power,
          .marker-anim-challenging,
          .marker-anim-shift {
            animation: none;
            opacity: 0.85;
          }
        }
      `}</style>

      {/* Overview Strip (spec 5.1–5.8) — renders above slider card */}
      {(snapshots.length > 0 || isPending) && (
        <OverviewStrip
          markers={markers}
          max={config.max}
          offset={offset}
          onJump={setOffset}
          isPending={isPending}
          config={config}
          unknownTime={chartData.unknownTime ?? false}
        />
      )}

      {/* Slider control */}
      <div className="bg-mystic-surface/50 border border-mystic-border rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-mystic-muted text-xs uppercase tracking-widest">Advance Time</span>
          <div className="flex items-center gap-3">
            {/* Prev / Next navigation (spec 7.3) */}
            <button
              onClick={() => prevMarker && setOffset(prevMarker.offset)}
              disabled={!prevMarker}
              className="text-mystic-gold/60 text-xs hover:text-mystic-gold disabled:opacity-30 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Jump to previous notable moment"
            >
              ← Prev
            </button>
            <span className="font-heading text-lg text-mystic-gold">{offsetLabel}</span>
            <button
              onClick={() => nextMarker && setOffset(nextMarker.offset)}
              disabled={!nextMarker}
              className="text-mystic-gold/60 text-xs hover:text-mystic-gold disabled:opacity-30 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Jump to next notable moment"
            >
              Next ✦
            </button>
          </div>
        </div>

        {/* Slider with marker overlay (spec 3.1–3.3) */}
        <div className="relative w-full">
          <input
            type="range"
            min={0}
            max={config.max}
            value={offset}
            onChange={handleSlider}
            className={`w-full h-2 bg-mystic-bg rounded-lg appearance-none cursor-pointer accent-mystic-gold
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-mystic-gold
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-track]:bg-mystic-border [&::-webkit-slider-track]:rounded-lg
              ${thumbShadowClass}${currentMarker ? ' has-thumb-halo' : ''}`}
            style={thumbHaloValue ? ({ '--thumb-halo': thumbHaloValue } as React.CSSProperties) : undefined}
          />

          {/* Marker dot overlay — pointer-events-none so slider drag works (spec 3.1) */}
          <div
            className="absolute pointer-events-none"
            style={{ top: '50%', transform: 'translateY(-50%)', left: '10px', right: '10px' }}
          >
            {/* Tooltip renders here, relative to the inset container */}
            {hoveredMarker && offset !== hoveredMarker.offset && (
              <MarkerTooltip
                marker={hoveredMarker}
                positionX={(hoveredMarker.offset / config.max) * 100}
              />
            )}

            {markers.map(m => (
              <MarkerDot
                key={m.offset}
                marker={m}
                max={config.max}
                active={offset === m.offset}
                onClick={() => setOffset(m.offset)}
                onMouseEnter={() => setHoveredMarker(m)}
                onMouseLeave={() => setHoveredMarker(null)}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-between mt-2 text-mystic-muted text-[10px]">
          <span>Now</span>
          <span>{config.max} {config.unitPlural}</span>
        </div>

        {/* Date display */}
        <div className="text-center mt-3">
          {snapshot ? (
            <p className="text-mystic-gold font-heading text-base">{formatDate(snapshot.date)}</p>
          ) : (
            <p className="text-mystic-muted font-heading text-base">Computing…</p>
          )}
        </div>

        {/* Quick stats */}
        {snapshot && (
          <div className="flex justify-center gap-4 mt-3">
            <span className="text-xs text-mystic-muted">
              <span className="text-mystic-gold font-medium">{snapshot.transitAspects.length}</span> aspects
            </span>
            <span className="text-xs">
              <span className="text-green-400 font-medium">{harmonious}</span>
              <span className="text-mystic-muted"> harmonious</span>
            </span>
            <span className="text-xs">
              <span className="text-red-400 font-medium">{challenging}</span>
              <span className="text-mystic-muted"> challenging</span>
            </span>
            {activeRetrogrades > 0 && (
              <span className="text-xs">
                <span className="text-red-400 font-medium">{activeRetrogrades}</span>
                <span className="text-mystic-muted"> ℞</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Generalized Category Banner — power, favorable, challenging, shift (spec 2.3) */}
      {categoryBanner && snapshot && snapshot.score.category !== 'neutral' && (
        <div className={`mb-6 rounded-xl border border-l-2 px-4 py-3 flex items-start gap-2 ${
          snapshot.score.category === 'power'
            ? 'border-mystic-gold/30 border-l-mystic-gold bg-mystic-gold/10'
            : snapshot.score.category === 'favorable'
              ? 'border-green-500/30 border-l-green-500 bg-green-900/10'
              : snapshot.score.category === 'challenging'
                ? 'border-red-500/30 border-l-red-500 bg-red-900/10'
                : 'border-blue-500/30 border-l-blue-500 bg-blue-900/10'
        }`}>
          <span className={`mt-0.5 shrink-0 ${
            snapshot.score.category === 'power'
              ? 'text-mystic-gold'
              : snapshot.score.category === 'favorable'
                ? 'text-green-400'
                : snapshot.score.category === 'challenging'
                  ? 'text-red-400'
                  : 'text-blue-400'
          }`}>
            {snapshot.score.category === 'challenging' ? '⚠' :
             snapshot.score.category === 'shift' ? '◆' : '✦'}
          </span>
          <div>
            <p className={`text-sm ${
              snapshot.score.category === 'power'
                ? 'text-mystic-gold/90'
                : snapshot.score.category === 'favorable'
                  ? 'text-green-400/90'
                  : snapshot.score.category === 'challenging'
                    ? 'text-red-400/90'
                    : 'text-blue-400/90'
            }`}>
              <span className="font-heading">{snapshot.score.bannerBoldFragment ?? categoryBanner.split(' ')[0]}</span>
              {' ' + categoryBanner.slice((snapshot.score.bannerBoldFragment ?? categoryBanner.split(' ')[0]).length).trimStart()}
            </p>
            {snapshot.score.guidance && (
              <p className="text-xs text-mystic-muted/80 mt-1.5 font-light leading-relaxed">
                {snapshot.score.guidance}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Chart wheel */}
      {snapshot ? (
        <div className="flex justify-center mb-6">
          <div className="w-full max-w-2xl">
            <ChartWheel
              chartData={chartData}
              aspects={aspects}
              transitPlanets={snapshot.housedTransitPlanets}
              transitAspects={snapshot.transitAspects}
            />
            <p className="text-center text-mystic-muted text-xs mt-2">
              {offset === 0 ? 'Current transits' : `Transits on ${formatDate(snapshot.date)}`}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex justify-center mb-6">
          <div className="w-full max-w-2xl flex items-center justify-center h-64 rounded-xl border border-mystic-gold/10 bg-mystic-surface/30">
            <span className="text-mystic-muted text-sm">Reading the next {config.max} {config.unitPlural}…</span>
          </div>
        </div>
      )}

      {/* Transit aspects (spec 8.1) */}
      {snapshot && snapshot.transitAspects.length > 0 && (
        <div className="border border-mystic-gold/20 rounded-lg overflow-hidden mb-4">
          <div className="px-5 py-3 bg-mystic-gold/5">
            <span className="font-heading text-lg text-mystic-gold">
              Transit Aspects ({snapshot.transitAspects.length})
            </span>
            {aspectHeaderSuffix && (
              <span className="text-mystic-muted text-sm font-normal">{aspectHeaderSuffix}</span>
            )}
          </div>
          <div className="px-5 py-4">
            {snapshot.transitAspects.map((a, i) => {
              // Spec 9: unknownTime guard — house is null when time is unknown
              const rawHouse = chartData.unknownTime
                ? null
                : (chartData.planets.find(p => p.name === a.natalPlanet)?.house ?? null)
              const natalHouse = rawHouse && rawHouse > 0 ? rawHouse : null

              const brief = computeTransitAspectBrief(
                a.transitPlanet as (PlanetName | 'NorthNode'),
                a.type,
                a.natalPlanet as (PlanetName | 'NorthNode'),
                natalHouse,
                a.nature,
                a.applying,
              )

              return (
                <AspectRow
                  key={i}
                  transitPlanet={a.transitPlanet}
                  natalPlanet={a.natalPlanet}
                  aspectType={a.type}
                  nature={a.nature}
                  symbol={a.symbol}
                  orb={a.orb}
                  applying={a.applying}
                  brief={brief}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Loading skeleton for aspect list while snapshots are being computed */}
      {isPending && !snapshot && (
        <div className="border border-mystic-gold/10 rounded-lg overflow-hidden mb-4 px-5 py-8 flex justify-center">
          <span className="text-mystic-muted text-sm">Computing aspects…</span>
        </div>
      )}

      {/* Retrograde / Planetary Shift activity (spec 8.2) */}
      {snapshot && (() => {
        const active = snapshot.retrogrades.filter(r => r.isRetro || r.status.includes('Stationing'))
        if (active.length === 0) return null
        return (
          <div className="border border-mystic-gold/20 rounded-lg overflow-hidden mb-4">
            <div className="px-5 py-3 bg-mystic-gold/5">
              <span className="font-heading text-lg text-mystic-gold">{retrogradeHeader}</span>
            </div>
            <div className="px-5 py-4 space-y-3">
              {active.map((r, i) => {
                const interp = TRANSIT_RETROGRADE[r.planet]
                return (
                  <div key={i} className="border border-red-500/15 bg-red-900/5 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg">{PLANET_GLYPHS[r.planet]}</span>
                      <span className="text-mystic-text text-sm font-medium">{r.planet}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${r.isRetro ? 'bg-red-900/30 text-red-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                        {r.status}
                      </span>
                    </div>
                    {interp && (
                      <div className="ml-8">
                        <p className="text-red-400/80 text-xs font-medium mb-1">{interp.brief}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Planet positions table */}
      {snapshot && (
        <div className="border border-mystic-gold/20 rounded-lg overflow-hidden mb-4">
          <div className="px-5 py-3 bg-mystic-gold/5">
            <span className="font-heading text-lg text-mystic-gold">Planet Positions</span>
          </div>
          <div className="px-5 py-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-mystic-gold/10 text-mystic-muted text-xs uppercase tracking-wider">
                  <th className="text-left px-3 py-2">Planet</th>
                  <th className="text-left px-3 py-2">Sign</th>
                  <th className="text-left px-3 py-2">Position</th>
                  <th className="text-left px-3 py-2">Motion</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.transitPlanets.filter(p => p.name !== 'NorthNode').map(p => (
                  <tr key={p.name} className="border-b border-mystic-gold/5">
                    <td className="px-3 py-2 text-mystic-text">
                      <span className="mr-2">{getBodyGlyph(p.name)}</span>
                      {p.name}
                    </td>
                    <td className="px-3 py-2 text-mystic-gold">{ZODIAC_GLYPHS[p.sign as ZodiacSign]} {p.sign}</td>
                    <td className="px-3 py-2 text-mystic-muted">{formatPosition(p)}</td>
                    <td className="px-3 py-2 text-mystic-muted">
                      {p.retrograde ? <span className="text-red-400">℞ Retrograde</span> : 'Direct'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
