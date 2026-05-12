import { useMemo, useState } from 'react'
import type { LunarPhaseName } from '../../engine/lunar'
import { getCurrentMoonPhase, getNatalMoonPhase, getLunarCalendar } from '../../engine/lunar'
import { LUNAR_PHASE_INTERPRETATIONS, MOON_SIGN_QUALITIES } from '../../data/interpretations/lunarPhases'
import { ZODIAC_GLYPHS } from '../../engine/types'
import type { ZodiacSign } from '../../engine/types'

const PHASE_EMOJIS: Record<LunarPhaseName, string> = {
  'New Moon': '🌑',
  'Waxing Crescent': '🌒',
  'First Quarter': '🌓',
  'Waxing Gibbous': '🌔',
  'Full Moon': '🌕',
  'Waning Gibbous': '🌖',
  'Last Quarter': '🌗',
  'Waning Crescent': '🌘',
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Natal Moon phase — shown inside the birth chart Big Three section */
export function NatalMoonPhaseWidget({
  sunLongitude,
  moonLongitude,
}: {
  sunLongitude: number
  moonLongitude: number
}) {
  const { phaseName } = useMemo(
    () => getNatalMoonPhase(sunLongitude, moonLongitude),
    [sunLongitude, moonLongitude]
  )
  const interp = LUNAR_PHASE_INTERPRETATIONS[phaseName]

  return (
    <div className="mt-4 pt-4 border-t border-mystic-gold/10">
      <div className="flex items-start gap-3">
        <span className="text-3xl leading-none mt-0.5">{PHASE_EMOJIS[phaseName]}</span>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-mystic-muted text-xs uppercase tracking-wider">Natal Moon Phase</span>
            <span className="text-mystic-gold text-sm font-heading">{phaseName}</span>
          </div>
          <p className="text-mystic-muted text-xs italic mb-1">{interp.natalBrief}</p>
          <p className="text-mystic-text/80 text-sm leading-relaxed">{interp.natalDetail}</p>
        </div>
      </div>
    </div>
  )
}

/** Current Moon phase widget — shown on transit and synastry pages */
export function CurrentMoonWidget({
  date,
  showCalendar = true,
}: {
  date: Date
  showCalendar?: boolean
}) {
  const dateKey = date.toDateString()
  const moonData = useMemo(() => getCurrentMoonPhase(date), [dateKey])
  const calendar = useMemo(
    () => (showCalendar ? getLunarCalendar(date, 7) : []),
    [dateKey, showCalendar]
  )

  const [selectedDay, setSelectedDay] = useState(0)

  const interp = LUNAR_PHASE_INTERPRETATIONS[moonData.phaseName]
  const signQuality = MOON_SIGN_QUALITIES[moonData.moonSign] ?? ''

  const formatVoidTime = () => {
    if (!moonData.nextSignChange) return null
    const diffMs = new Date(moonData.nextSignChange).getTime() - date.getTime()
    const diffH = Math.floor(diffMs / (1000 * 60 * 60))
    const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    if (diffH === 0) return `${diffM}m`
    if (diffM === 0) return `${diffH}h`
    return `${diffH}h ${diffM}m`
  }

  const selectedEntry = calendar[selectedDay]
  const selectedInterp = selectedEntry ? LUNAR_PHASE_INTERPRETATIONS[selectedEntry.phase] : null
  const selectedSignQuality = selectedEntry ? (MOON_SIGN_QUALITIES[selectedEntry.sign] ?? '') : ''

  return (
    <div className="mb-8">
      <h2 className="font-heading text-2xl text-mystic-gold mb-4">☽ Current Moon</h2>
      <div className="bg-mystic-gold/5 rounded-lg p-5 border border-mystic-gold/20">
        {/* Phase display */}
        <div className="flex items-start gap-4 mb-4">
          <span className="text-5xl leading-none">{PHASE_EMOJIS[moonData.phaseName]}</span>
          <div>
            <div className="font-heading text-xl text-mystic-gold">{moonData.phaseName}</div>
            <div className="text-mystic-text text-sm mt-0.5">
              {ZODIAC_GLYPHS[moonData.moonSign as ZodiacSign]} Moon in {moonData.moonSign}
              <span className="text-mystic-muted ml-2">· {moonData.illumination}% illuminated</span>
            </div>
            {signQuality && (
              <div className="text-mystic-muted text-xs mt-1">{signQuality}</div>
            )}
            <div className="text-mystic-text/70 text-xs mt-1.5 italic">{interp.transitBrief}</div>
          </div>
        </div>

        {/* Void of course */}
        {moonData.isVoid && moonData.nextSignName && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-yellow-900/20 border border-yellow-600/20 rounded-lg">
            <span className="text-yellow-400 text-sm">⚠</span>
            <span className="text-yellow-300/90 text-sm">
              Void of Course — Moon enters {moonData.nextSignName} in {formatVoidTime()}
            </span>
          </div>
        )}

        {/* 7-day lunar calendar */}
        {showCalendar && calendar.length > 0 && (
          <div className="mt-4 pt-4 border-t border-mystic-gold/10">
            <p className="text-mystic-muted text-xs uppercase tracking-wider mb-3">7-Day Lunar Outlook</p>
            <div className="grid grid-cols-7 gap-1">
              {calendar.map((entry, i) => {
                const dayDate = new Date(entry.date + 'T12:00:00')
                const dayLabel = DAY_LABELS[dayDate.getDay()]
                const isToday = i === 0
                const isSelected = i === selectedDay
                return (
                  <button
                    key={entry.date}
                    onClick={() => setSelectedDay(i)}
                    className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-mystic-gold/20 border border-mystic-gold/50'
                        : isToday
                        ? 'bg-mystic-gold/10 border border-mystic-gold/20 hover:bg-mystic-gold/15'
                        : 'hover:bg-mystic-gold/10 border border-transparent'
                    }`}
                  >
                    <span className={`text-xs ${isSelected ? 'text-mystic-gold font-semibold' : isToday ? 'text-mystic-gold' : 'text-mystic-muted'}`}>
                      {dayLabel}
                    </span>
                    <span className="text-lg leading-none">{PHASE_EMOJIS[entry.phase]}</span>
                    <span className="text-mystic-muted text-xs">{ZODIAC_GLYPHS[entry.sign as ZodiacSign]}</span>
                    {entry.phaseMilestone && (
                      <span className="text-mystic-gold text-xs text-center leading-tight">
                        {entry.phaseMilestone === 'New Moon' ? 'New' : entry.phaseMilestone === 'Full Moon' ? 'Full' : entry.phaseMilestone === 'First Quarter' ? '1st Q' : 'Last Q'}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Selected day detail panel */}
            {selectedEntry && selectedInterp && (
              <div className="mt-3 pt-3 border-t border-mystic-gold/10 animate-fade-in">
                <div className="flex items-start gap-3">
                  <span className="text-3xl leading-none mt-0.5">{PHASE_EMOJIS[selectedEntry.phase]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-mystic-gold text-sm font-heading">{selectedEntry.phase}</span>
                      <span className="text-mystic-muted text-xs">·</span>
                      <span className="text-mystic-text text-sm">
                        {ZODIAC_GLYPHS[selectedEntry.sign as ZodiacSign]} Moon in {selectedEntry.sign}
                      </span>
                      <span className="text-mystic-muted text-xs">· {selectedEntry.illumination}%</span>
                      {selectedDay === 0 && (
                        <span className="text-mystic-gold/60 text-xs uppercase tracking-wider">Today</span>
                      )}
                    </div>
                    {selectedSignQuality && (
                      <p className="text-mystic-muted text-xs mb-1">{selectedSignQuality}</p>
                    )}
                    <p className="text-mystic-text/80 text-sm italic">{selectedInterp.transitBrief}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
