import { useState } from 'react'
import type { TimelineDay, TimelineEvent } from '../../engine/transitTimeline'
import { ZODIAC_GLYPHS, getBodyGlyph, isAsteroid } from '../../engine/types'
import type { BodyName, PlanetName, ZodiacSign } from '../../engine/types'
import { getIngressBrief, getStationBrief, EVENT_TYPE_INFO } from '../../data/interpretations/transitEvents'
import { computeTransitAspectBrief } from '../../data/interpretations/transitAspectBriefs'
import type { MarkerCategory } from '../../engine/advanceScoring'
import { CATEGORY_LABELS } from './AdvanceTab'

function formatTimelineDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function EventCard({ event, expanded, onToggle }: { event: TimelineEvent; expanded: boolean; onToggle: () => void }) {
  const typeInfo = EVENT_TYPE_INFO[event.type] ?? { icon: '•', color: 'text-mystic-muted', label: event.type }

  const planetGlyph = event.planet ? getBodyGlyph(event.planet as BodyName) : ''
  const secondGlyph = event.secondPlanet ? getBodyGlyph(event.secondPlanet as BodyName) : ''

  // Determine background based on nature
  let bgClass = 'bg-mystic-surface/50 border-mystic-border/30'
  if (event.type === 'aspect-perfection') {
    if (event.aspectNature === 'harmonious') bgClass = 'bg-green-900/10 border-green-500/20'
    else if (event.aspectNature === 'challenging') bgClass = 'bg-red-900/10 border-red-500/20'
    else bgClass = 'bg-mystic-gold/5 border-mystic-gold/20'
  } else if (event.type === 'lunar-phase') {
    bgClass = 'bg-blue-900/10 border-blue-500/20'
  } else if (event.type === 'retrograde-station') {
    bgClass = 'bg-red-900/10 border-red-500/20'
  } else if (event.type === 'sign-ingress') {
    bgClass = 'bg-mystic-purple/5 border-mystic-purple/20'
  }

  // Get enriched interpretation
  let detailText = ''
  if (event.type === 'aspect-perfection' && event.aspectType && event.planet && event.secondPlanet && event.aspectNature) {
    detailText = computeTransitAspectBrief(
      event.planet as string,
      event.aspectType,
      event.secondPlanet as string,
      event.natalHouse ?? null,
      event.aspectNature,
      true,
    )
  } else if (event.type === 'sign-ingress' && event.planet && event.planet !== 'NorthNode' && !isAsteroid(event.planet as BodyName) && event.toSign) {
    detailText = getIngressBrief(event.planet as PlanetName, event.toSign)
  } else if (event.type === 'retrograde-station' && event.planet && event.planet !== 'NorthNode' && !isAsteroid(event.planet as BodyName) && event.stationType) {
    detailText = getStationBrief(event.planet as PlanetName, event.stationType)
  }

  return (
    <button
      onClick={onToggle}
      className={`w-full text-left border rounded-lg p-3 transition-colors hover:brightness-110 ${bgClass}`}
    >
      <div className="flex items-center gap-2">
        {/* Type icon */}
        <span className={`text-sm ${typeInfo.color}`}>{typeInfo.icon}</span>

        {/* Planet glyphs */}
        {planetGlyph && <span className="text-lg">{planetGlyph}</span>}
        {event.aspectSymbol && (
          <span className={`text-sm ${
            event.aspectNature === 'harmonious' ? 'text-green-400' :
            event.aspectNature === 'challenging' ? 'text-red-400' : 'text-mystic-gold'
          }`}>{event.aspectSymbol}</span>
        )}
        {secondGlyph && <span className="text-lg">{secondGlyph}</span>}

        {/* Sign glyphs for ingresses */}
        {event.toSign && !event.secondPlanet && (
          <span className="text-mystic-gold text-sm">
            {ZODIAC_GLYPHS[event.toSign as ZodiacSign] ?? ''} {event.toSign}
          </span>
        )}

        {/* Lunar phase icon */}
        {event.lunarPhase && (
          <span className="text-blue-400 text-sm">
            {event.lunarPhase === 'New Moon' ? '🌑' :
             event.lunarPhase === 'Full Moon' ? '🌕' :
             event.lunarPhase === 'First Quarter' ? '🌓' : '🌗'}
          </span>
        )}

        {/* Label */}
        <span className="flex-1 text-mystic-text text-sm font-medium truncate">{event.label}</span>

        {/* Type badge */}
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${typeInfo.color} bg-mystic-bg/50 hidden sm:inline`}>
          {typeInfo.label}
        </span>
      </div>

      {/* Brief description */}
      <p className="text-mystic-muted text-xs mt-1 ml-6">{event.brief}</p>

      {/* Expanded detail */}
      {expanded && detailText && (
        <div className="mt-2 ml-6 pl-3 border-l-2 border-mystic-gold/20">
          <p className="text-mystic-text/80 text-xs leading-relaxed">{detailText}</p>
        </div>
      )}
    </button>
  )
}

// Badge styling per advance category — mirrors AdvanceTab's color conventions.
const CATEGORY_BADGE_STYLE: Record<Exclude<MarkerCategory, 'neutral' | 'shift'>, string> = {
  power:       'bg-mystic-gold/20 text-mystic-gold border border-mystic-gold/30',
  favorable:   'bg-green-900/20 text-green-400 border border-green-500/30',
  challenging: 'bg-red-900/20 text-red-400 border border-red-500/30',
}

const CATEGORY_DOT_STYLE: Record<Exclude<MarkerCategory, 'neutral' | 'shift'>, string> = {
  power:       'bg-mystic-gold border-mystic-gold shadow-[0_0_8px_rgba(201,168,76,0.5)]',
  favorable:   'bg-green-400 border-green-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]',
  challenging: 'bg-red-400 border-red-400 shadow-[0_0_8px_rgba(248,113,113,0.4)]',
}

const CATEGORY_ICON: Record<Exclude<MarkerCategory, 'neutral' | 'shift'>, string> = {
  power:       '✦',
  favorable:   '◆',
  challenging: '⚠',
}

function DaySection({ day, scoreByDate }: { day: TimelineDay; scoreByDate?: Map<string, MarkerCategory> }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // When advance snapshot data is available for this date, use its category.
  // If the category is 'shift' or 'neutral' we fall back to the event-count heuristic
  // so that the badge remains meaningful (shift has no timeline-visible label).
  // When scoreByDate is not provided (advance engine hasn't run yet), fall back
  // to the raw isPowerDay heuristic — acceptable degraded state documented in card.
  const advanceCategory = scoreByDate?.get(day.dateStr)
  const badgeCategory: Exclude<MarkerCategory, 'neutral' | 'shift'> | null =
    advanceCategory && advanceCategory !== 'neutral' && advanceCategory !== 'shift'
      ? advanceCategory
      : day.isPowerDay
        ? 'power'
        : null

  const dotStyle = badgeCategory ? CATEGORY_DOT_STYLE[badgeCategory] : 'bg-mystic-bg border-mystic-gold/40'

  return (
    <div className="relative pl-6 pb-6 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-[7px] top-0 bottom-0 w-px bg-mystic-gold/15" />

      {/* Date dot */}
      <div className={`absolute left-0 top-0.5 w-[15px] h-[15px] rounded-full border-2 ${dotStyle}`} />

      {/* Date header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="font-heading text-sm text-mystic-gold">
          {formatTimelineDate(day.date)}
        </span>
        {badgeCategory && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${CATEGORY_BADGE_STYLE[badgeCategory]}`}>
            {CATEGORY_ICON[badgeCategory]} {CATEGORY_LABELS[badgeCategory]}
          </span>
        )}
        <span className="text-mystic-muted text-xs">
          {day.events.length} event{day.events.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Event cards */}
      <div className="space-y-2">
        {day.events.map(event => (
          <EventCard
            key={event.id}
            event={event}
            expanded={expandedId === event.id}
            onToggle={() => setExpandedId(expandedId === event.id ? null : event.id)}
          />
        ))}
      </div>
    </div>
  )
}

export default function TransitTimeline({ days, scoreByDate }: { days: TimelineDay[]; scoreByDate?: Map<string, MarkerCategory> }) {
  const [filter, setFilter] = useState<string | null>(null)

  if (days.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-mystic-muted text-sm">No timeline events found for this period.</p>
      </div>
    )
  }

  // Filter buttons
  const filterOptions: { key: string | null; label: string; icon: string }[] = [
    { key: null, label: 'All', icon: '◆' },
    { key: 'aspect-perfection', label: 'Aspects', icon: '✦' },
    { key: 'sign-ingress', label: 'Ingresses', icon: '→' },
    { key: 'retrograde-station', label: 'Stations', icon: '℞' },
    { key: 'lunar-phase', label: 'Lunar', icon: '◐' },
    { key: 'moon-sign-change', label: 'Moon', icon: '☽' },
  ]

  // Apply filter
  const filteredDays = days.map(day => ({
    ...day,
    events: filter ? day.events.filter(e => e.type === filter) : day.events,
  })).filter(day => day.events.length > 0)

  // Stats
  const totalEvents = days.reduce((sum, d) => sum + d.events.length, 0)
  // When advance data is available, count notable days from the score map;
  // otherwise fall back to the raw event-count heuristic.
  const notableDays = scoreByDate
    ? days.filter(d => {
        const cat = scoreByDate.get(d.dateStr)
        return cat && cat !== 'neutral' && cat !== 'shift'
      }).length
    : days.filter(d => d.isPowerDay).length

  return (
    <div>
      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-4 text-xs text-mystic-muted">
        <span>{totalEvents} events</span>
        <span>·</span>
        <span>{days.length} days with activity</span>
        {notableDays > 0 && (
          <>
            <span>·</span>
            <span className="text-mystic-gold">{notableDays} notable day{notableDays !== 1 ? 's' : ''}</span>
          </>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {filterOptions.map(opt => (
          <button
            key={opt.key ?? 'all'}
            onClick={() => setFilter(opt.key)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              filter === opt.key
                ? 'bg-mystic-gold/20 border-mystic-gold/40 text-mystic-gold'
                : 'bg-mystic-surface/50 border-mystic-border/30 text-mystic-muted hover:border-mystic-gold/30 hover:text-mystic-text'
            }`}
          >
            {opt.icon} {opt.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        {filteredDays.map(day => (
          <DaySection key={day.dateStr} day={day} scoreByDate={scoreByDate} />
        ))}
      </div>
    </div>
  )
}
