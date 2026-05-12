import { useState, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import { calculateNumerology } from '../../engine/numerology'
import { getInterpretation, type NumerologyCategory } from '../../data/numerologyInterpretations'
import type { ChartData } from '../../engine/types'
import { calculateChart } from '../../engine/astronomy'

function getChartData(state: ReturnType<typeof useApp>['state']): ChartData | null {
  if (state.chartData) return state.chartData
  const { birthData } = state
  if (!birthData.city || !birthData.date) return null
  try {
    return calculateChart(birthData.date, birthData.time, birthData.city.lat, birthData.city.lng, birthData.city.tz, birthData.unknownTime)
  } catch {
    return null
  }
}

function buildChartCrossRef(lifePath: number, chartData: ChartData | null): string | null {
  if (!chartData) return null

  const planets = chartData.planets
  const sun = planets.find(p => p.name === 'Sun')
  const moon = planets.find(p => p.name === 'Moon')
  const neptune = planets.find(p => p.name === 'Neptune')
  const saturn = planets.find(p => p.name === 'Saturn')
  const mars = planets.find(p => p.name === 'Mars')
  const venus = planets.find(p => p.name === 'Venus')
  const mercury = planets.find(p => p.name === 'Mercury')
  const jupiter = planets.find(p => p.name === 'Jupiter')
  const pluto = planets.find(p => p.name === 'Pluto')

  const waterSigns = ['Cancer', 'Scorpio', 'Pisces']
  const earthSigns = ['Taurus', 'Virgo', 'Capricorn']
  const fireSigns = ['Aries', 'Leo', 'Sagittarius']
  const airSigns = ['Gemini', 'Libra', 'Aquarius']

  switch (lifePath) {
    case 1: {
      const sunNote = sun ? `Your Sun in ${sun.sign}${sun.house ? ` in the ${ordinal(sun.house)} house` : ''} amplifies your Life Path 1's core drive for self-expression and authentic leadership.` : ''
      const marsNote = mars && fireSigns.includes(mars.sign) ? ` Mars in ${mars.sign} adds a bold, pioneering edge to your natural independence.` : ''
      return `${sunNote}${marsNote} The Life Path 1's need for self-determination finds its astrological mirror in the placement and strength of the Sun in your chart — the planet of identity, will, and creative self-expression. Wherever your Sun is placed, that is where your leadership instinct is most alive.`
    }
    case 2: {
      const moonNote = moon ? `Your Moon in ${moon.sign}${moon.house ? ` in the ${ordinal(moon.house)} house` : ''} deepens your Life Path 2's emotional intelligence and relational sensitivity.` : ''
      const venusNote = venus ? ` Venus in ${venus.sign} colors how your diplomatic gifts express in relationships — ${waterSigns.includes(venus.sign) ? 'with intuitive emotional depth' : airSigns.includes(venus.sign) ? 'with graceful social intelligence' : 'with quiet, steady devotion'}.` : ''
      return `${moonNote}${venusNote} The Life Path 2's gifts of receptivity and partnership find their astrological home in the Moon and Venus — the planets of feeling, beauty, and relational attunement. Their placements in your chart reveal where and how your capacity for deep connection is most naturally expressed.`
    }
    case 3: {
      const mercNote = mercury ? `Your Mercury in ${mercury.sign}${mercury.house ? ` in the ${ordinal(mercury.house)} house` : ''} reveals the specific texture of your Life Path 3's expressive gifts.` : ''
      const jupNote = jupiter ? ` Jupiter in ${jupiter.sign} expands your creative range with ${fireSigns.includes(jupiter.sign) ? 'visionary enthusiasm' : waterSigns.includes(jupiter.sign) ? 'emotional depth and artistic sensitivity' : earthSigns.includes(jupiter.sign) ? 'practical creative mastery' : 'intellectually adventurous breadth'}.` : ''
      return `${mercNote}${jupNote} The Life Path 3's creative and communicative gifts are mirrored in Mercury — the planet of mind and expression — and Jupiter, the great amplifier. Their signs and houses tell you which domains will be most richly rewarded by your natural creative intelligence.`
    }
    case 4: {
      const satNote = saturn ? `Your Saturn in ${saturn.sign}${saturn.house ? ` in the ${ordinal(saturn.house)} house` : ''} is the astrological echo of your Life Path 4's devotion to structure, discipline, and lasting achievement.` : ''
      const earthNote = planets.filter(p => earthSigns.includes(p.sign)).length >= 3 ? ' With multiple planets in earth signs, your chart amplifies the 4\'s natural affinity for the tangible, the well-built, and the enduring.' : ''
      return `${satNote}${earthNote} Saturn is the ruling planet of Life Path 4's themes: responsibility, mastery through sustained effort, and the architecture of enduring structures. Where Saturn sits in your chart is where your life demands — and ultimately rewards — your most serious and dedicated attention.`
    }
    case 5: {
      const mercNote = mercury ? `Your Mercury in ${mercury.sign} gives your Life Path 5's restless curiosity a distinctive flavor — ${airSigns.includes(mercury.sign) ? 'intellectually wide-ranging and socially electric' : fireSigns.includes(mercury.sign) ? 'bold, direct, and inventive' : 'perceptive and strategically adaptive'}.` : ''
      const uranNote = planets.find(p => p.name === 'Uranus') ? ` Uranus in your chart marks where the unexpected breaks through — and for a Life Path 5, those breakthroughs are not obstacles but the very territory where you thrive.` : ''
      return `${mercNote}${uranNote} The Life Path 5's hunger for freedom and experience resonates through Mercury and Uranus in your chart — the planets of mobility, awakening, and the refusal of limitation. Their placements reveal where your capacity for inspired adaptation is most potently available to you.`
    }
    case 6: {
      const venusNote = venus ? `Your Venus in ${venus.sign}${venus.house ? ` in the ${ordinal(venus.house)} house` : ''} is the astrological signature of your Life Path 6's gifts of beauty, care, and relational devotion.` : ''
      const moonNote = moon && waterSigns.includes(moon.sign) ? ` Your Moon in ${moon.sign} adds a deep empathic current to your nurturing nature — you feel the needs of those you love before they can articulate them.` : ''
      return `${venusNote}${moonNote} Venus is the natural ruler of Life Path 6's themes of love, beauty, harmony, and service. Where Venus sits in your chart tells you the arena where your gifts of care and aesthetic intelligence are most powerfully and naturally expressed.`
    }
    case 7: {
      const nepNote = neptune ? `Your Neptune in ${neptune.sign}${neptune.house ? ` in the ${ordinal(neptune.house)} house` : ''} — the planet of the invisible, the mystical, and the transcendent — carries the deep frequency of your Life Path 7's quest for truth beyond appearances.` : ''
      const moon12 = moon && moon.house === 12 ? ` Your Moon in the 12th house adds a profound interiority and psychic permeability to your already contemplative nature.` : ''
      const waterNote = !moon || moon.house !== 12 ? (moon && waterSigns.includes(moon.sign) ? ` Your Moon in ${moon.sign} gives your inner world a fluid, emotionally intelligent depth that enriches your capacity for mystical understanding.` : '') : ''
      return `${nepNote}${moon12}${waterNote} Neptune and the 12th house are the astrological home of Life Path 7's themes: the search for hidden truth, the value of solitude and contemplation, and the willingness to surrender to something vaster than the rational mind can fully comprehend.`
    }
    case 8: {
      const satNote = saturn ? `Your Saturn in ${saturn.sign}${saturn.house ? ` in the ${ordinal(saturn.house)} house` : ''} — the planet of mastery through time and effort — is the astrological anchor of your Life Path 8's drive for lasting, meaningful achievement.` : ''
      const plutNote = pluto ? ` Pluto in ${pluto.sign}${pluto.house ? ` in the ${ordinal(pluto.house)} house` : ''} adds depth and transformative intensity to your executive gifts — the capacity not just to build power but to wield it with genuine wisdom and consequence.` : ''
      return `${satNote}${plutNote} Saturn and Pluto are the primary astrological resonances of Life Path 8: the disciplined pursuit of mastery, the responsible use of authority, and the understanding that the most enduring power is built on integrity rather than force.`
    }
    case 9: {
      const jupNote = jupiter ? `Your Jupiter in ${jupiter.sign}${jupiter.house ? ` in the ${ordinal(jupiter.house)} house` : ''} — the planet of abundance, wisdom, and universal vision — amplifies your Life Path 9's gift for inclusive, philosophical compassion.` : ''
      const nepNote = neptune ? ` Neptune in your chart marks where the boundaries of self dissolve into something larger — and for a Life Path 9, that dissolving is not loss but the very opening through which universal love flows.` : ''
      return `${jupNote}${nepNote} Jupiter and Neptune carry the vibrational signature of Life Path 9: the broad compassion that sees the divine in every person, the artistic sensitivity that transmutes experience into meaning, and the spiritual understanding that completion and release are always the prelude to rebirth.`
    }
    case 11: {
      const nepNote = neptune ? `Your Neptune in ${neptune.sign}${neptune.house ? ` in the ${ordinal(neptune.house)} house` : ''} resonates directly with the Master Number 11's extraordinary sensitivity to the invisible currents that move through all things.` : ''
      const moonNote = moon ? ` Your Moon in ${moon.sign}${moon.house ? ` in the ${ordinal(moon.house)} house` : ''} — the planet of intuition and the unconscious — is the channel through which your 11's illuminating gifts most directly flow.` : ''
      return `${nepNote}${moonNote} The Master Number 11 finds its astrological mirrors in Neptune and the Moon — the two luminaries of the hidden, the intuitive, and the psychically perceptive. Their placements in your chart mark the domains where your capacity for spiritual illumination is most available and most needed.`
    }
    case 22: {
      const satNote = saturn ? `Your Saturn in ${saturn.sign}${saturn.house ? ` in the ${ordinal(saturn.house)} house` : ''} — the disciplined architect of time — is the astrological backbone of your Master Number 22's extraordinary capacity to turn vision into enduring reality.` : ''
      const earthNote = planets.filter(p => earthSigns.includes(p.sign)).length >= 2 ? ' The presence of multiple earth sign placements in your chart gives the Master Builder\'s gifts their essential foundation of practical intelligence and grounded organizational wisdom.' : ''
      return `${satNote}${earthNote} Saturn in its highest expression is the Master Builder's planet: the one who works patiently within the laws of time and matter to create something that will stand. For the Master Number 22, this planet is not a limitation but a collaborator — the force that transforms grand vision into architecture that actually exists in the world.`
    }
    case 33: {
      const jupNote = jupiter ? `Your Jupiter in ${jupiter.sign}${jupiter.house ? ` in the ${ordinal(jupiter.house)} house` : ''} expands your Master Number 33's capacity for compassionate wisdom and philosophical generosity of spirit.` : ''
      const waterNote = planets.filter(p => waterSigns.includes(p.sign)).length >= 3 ? ' With multiple planets in water signs, your chart amplifies the 33\'s gift of emotional attunement and empathic healing presence.' : ''
      return `${jupNote}${waterNote} The Master Number 33's extraordinary compassion resonates through Jupiter and Neptune — the planets of universal love, spiritual wisdom, and the capacity for grace that transcends the merely personal. Where these planets sit in your chart marks the arenas where your sacred service is most powerfully called forth.`
    }
    default:
      return null
  }
}

function buildPersonalYearCrossRef(personalYear: number, chartData: ChartData | null): string {
  if (!chartData) {
    switch (personalYear) {
      case 1: return 'A Personal Year 1 resonates with Solar energy — a time of new beginnings aligned with the vitality and creative will of the Sun. Any natal Sun placements in your chart become especially activated this year.'
      case 2: return 'A Personal Year 2 resonates with Lunar and Venusian energy — a year when relationships, emotions, and the quiet work of receptivity are cosmically supported. Your natal Moon and Venus speak directly to how this year\'s gifts are most available.'
      case 3: return 'A Personal Year 3 resonates with Mercury and Jupiter — the planets of expression, communication, and expansive creative intelligence. Your natal placements of these planets reveal where creative opportunities will be most abundant.'
      case 4: return 'A Personal Year 4 resonates with Saturn — the planet of disciplined mastery, responsibility, and structures built to last. This is a year when Saturn\'s lessons are gifts in disguise.'
      case 5: return 'A Personal Year 5 resonates with Mercury and Uranus — the planets of mobility, intellectual freedom, and the liberating shock of the unexpected. Prepare for a year of necessary change and expansive new experiences.'
      case 6: return 'A Personal Year 6 resonates with Venus and the Moon — the planets of love, beauty, and nurturing. Relationships and home are the primary arena of growth and meaning this year.'
      case 7: return 'A Personal Year 7 resonates with Neptune and the 12th house — the domain of solitude, contemplation, and spiritual deepening. This is a year to honor the inner life above external achievement.'
      case 8: return 'A Personal Year 8 resonates with Saturn and Pluto — the planets of material mastery and transformative power. Effort is rewarded with unusual directness; integrity is the key that unlocks the year\'s abundance.'
      case 9: return 'A Personal Year 9 resonates with Jupiter and Neptune — the planets of completion, release, and the compassionate wisdom that comes from having lived through the full cycle. This year asks you to let go with grace.'
      case 11: return 'A Master Year 11 resonates with Neptune and the Moon — amplifying intuitive sensitivity and spiritual awareness to extraordinary levels. Trust the inner voice above all external noise this year.'
      case 22: return 'A Master Year 22 resonates with Saturn and Jupiter together — the disciplined builder paired with the expansive visionary. What you build this year can genuinely outlast you.'
      case 33: return 'A Master Year 33 resonates with Neptune, Jupiter, and the compassionate impulse at the heart of all sacred service. This year\'s most important work will be done in the service of others.'
      default: return ''
    }
  }

  const planets = chartData.planets
  const sun = planets.find(p => p.name === 'Sun')
  const moon = planets.find(p => p.name === 'Moon')
  const mercury = planets.find(p => p.name === 'Mercury')

  const sunDesc = sun ? `Sun in ${sun.sign}` : 'your natal Sun'
  const moonDesc = moon ? `Moon in ${moon.sign}` : 'your natal Moon'
  const mercDesc = mercury ? `Mercury in ${mercury.sign}` : 'your natal Mercury'

  switch (personalYear) {
    case 1: return `Your Personal Year 1 activates the Solar force in your chart — particularly ${sunDesc}, which becomes a focal point for the new creative direction opening before you. This year's energy asks you to lead from your most authentic center.`
    case 2: return `Your Personal Year 2 works through ${moonDesc} — the planet most attuned to the subtle, relational, and receptive qualities that define this year's gifts. Partnership and emotional attunement are your primary fields of growth.`
    case 3: return `Your Personal Year 3 activates ${mercDesc} — the planet of mind, communication, and creative expression. Your natal Mercury placement reveals the specific domain where creative and communicative gifts will flourish most abundantly this year.`
    case 4: return 'Your Personal Year 4 works through Saturn — the planet of disciplined mastery. This year, your natal Saturn placement becomes a focal point for serious, sustained work that builds structures meant to last well beyond this single year.'
    case 5: return `Your Personal Year 5 energizes the most dynamic and mercurial placements in your chart — particularly ${mercDesc} and any Uranian influences. Flexibility and openness to the unexpected are your greatest assets this year.`
    case 6: return 'Your Personal Year 6 works through Venus and the Moon — the planets of love, care, and relational beauty. Your natal Venus and Moon placements reveal where the deepest relational growth and healing are available to you this year.'
    case 7: return 'Your Personal Year 7 activates Neptune and the 12th house in your chart — the domain of solitude, mystical understanding, and the patient inner work that transforms without spectacle. Honor the depth this year asks of you.'
    case 8: return 'Your Personal Year 8 works through Saturn and Pluto — the planets of earned authority and transformative power. Your natal placements of these planets reveal where material mastery and consequential achievement are most accessible to you this year.'
    case 9: return 'Your Personal Year 9 activates the Jupiterian and Neptunian dimensions of your chart — the domain of release, completion, and the compassionate wisdom that comes from having lived through the full arc of the cycle.'
    case 11: return `A Master Year 11 amplifies the most sensitive and intuitive dimensions of your chart — particularly ${moonDesc} and any Neptunian placements. Trust the inner knowing that arrives clearly this year, even when it contradicts external appearances.`
    case 22: return 'A Master Year 22 brings Saturn and Jupiter into powerful collaboration in your chart — the disciplined builder and the expansive visionary working in concert. The structures you commit to building this year will be among your most lasting contributions.'
    case 33: return 'A Master Year 33 activates the highest frequencies of compassion and spiritual service available in your chart. Any placements in the 12th house, in Pisces, or involving Neptune or Jupiter become especially resonant with the year\'s call to selfless giving.'
    default: return ''
  }
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

interface NumberCardProps {
  label: string
  number: number
  category: NumerologyCategory
  badge?: string
}

function NumberCard({ label, number, category, badge }: NumberCardProps) {
  const [expanded, setExpanded] = useState(false)
  const interpretation = getInterpretation(category, number)
  if (!interpretation) return null

  const isMaster = number === 11 || number === 22 || number === 33

  return (
    <div className="bg-mystic-surface/50 border border-mystic-border rounded-xl overflow-hidden transition-all duration-300 hover:border-mystic-gold/30">
      <div className="p-6 md:p-8">
        {/* Top: number + archetype */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-5">
            <div className="relative">
              <span
                className="font-heading text-mystic-gold block leading-none select-none"
                style={{
                  fontSize: 'clamp(3rem, 8vw, 5rem)',
                  textShadow: isMaster
                    ? '0 0 30px rgba(201,168,76,0.6), 0 0 60px rgba(201,168,76,0.3)'
                    : '0 0 20px rgba(201,168,76,0.4)',
                }}
              >
                {number}
              </span>
              {isMaster && (
                <span className="absolute -top-1 -right-5 text-mystic-gold/60 text-xs font-heading">✦</span>
              )}
            </div>
            <div>
              <p className="text-mystic-muted text-xs uppercase tracking-widest mb-1">{label}</p>
              <h3 className="font-heading text-lg text-mystic-text">
                {number} — {interpretation.archetype}
              </h3>
              {isMaster && (
                <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full font-heading tracking-wider"
                  style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', color: 'rgba(201,168,76,0.9)' }}>
                  Master Number
                </span>
              )}
            </div>
          </div>
          {badge && (
            <span className="text-xs px-2 py-1 rounded-md text-mystic-muted border border-mystic-border">{badge}</span>
          )}
        </div>

        {/* Essence */}
        <p className="text-mystic-text/80 text-sm leading-relaxed mb-5">{interpretation.essence}</p>

        {/* Keywords */}
        <div className="flex flex-wrap gap-2 mb-4">
          {interpretation.keywords.map(kw => (
            <span key={kw} className="px-2.5 py-1 text-xs rounded-full text-mystic-gold/70 font-heading tracking-wide"
              style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
              {kw}
            </span>
          ))}
        </div>

        {/* Shadow toggle */}
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-2 text-mystic-muted text-xs hover:text-mystic-text transition-colors group"
        >
          <span className={`transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>›</span>
          <span>{expanded ? 'Hide' : 'Show'} shadow &amp; challenge</span>
        </button>

        {expanded && (
          <div className="mt-4 pl-4 border-l border-mystic-border/60">
            <p className="text-mystic-muted text-sm leading-relaxed italic">{interpretation.shadow}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function NumerologyPage() {
  const { state, dispatch } = useApp()
  const { birthData } = state
  const [nameInput, setNameInput] = useState(birthData.userName ?? '')
  const [editingName, setEditingName] = useState(!birthData.userName)

  const chartData = useMemo(() => getChartData(state), [state.chartData, birthData]) // eslint-disable-line react-hooks/exhaustive-deps

  const reading = useMemo(
    () => calculateNumerology(birthData.date, birthData.userName || undefined),
    [birthData.date, birthData.userName],
  )

  const lifepathCrossRef = useMemo(
    () => buildChartCrossRef(reading.lifePath, chartData),
    [reading.lifePath, chartData],
  )

  const personalYearCrossRef = useMemo(
    () => buildPersonalYearCrossRef(reading.personalYear, chartData),
    [reading.personalYear, chartData],
  )

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-')
    return `${m}/${day}/${y}`
  }

  const handleSaveName = () => {
    const trimmed = nameInput.trim()
    dispatch({ type: 'SET_USER_NAME', name: trimmed || undefined })
    setEditingName(false)
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <p className="text-mystic-muted text-xs uppercase tracking-widest mb-2">Sacred Numbers</p>
        <h2 className="font-heading text-3xl text-mystic-gold mb-1">✦ Your Numerology Reading</h2>
        <p className="text-mystic-muted text-sm">Born {formatDate(birthData.date)}</p>
      </div>

      {/* Name input for Expression Number */}
      <div className="mb-8 bg-mystic-surface/30 border border-mystic-border rounded-xl p-5">
        <p className="text-mystic-muted text-xs uppercase tracking-widest mb-3">Expression Number</p>
        {editingName ? (
          <div className="flex gap-3 items-center">
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveName()}
              placeholder="Enter your full birth name for Expression Number"
              className="flex-1 px-4 py-2.5 bg-mystic-bg border border-mystic-border rounded-lg text-mystic-text text-sm focus:border-mystic-gold/50 focus:outline-none placeholder:text-mystic-muted/50"
            />
            <button
              type="button"
              onClick={handleSaveName}
              className="px-4 py-2.5 font-heading text-sm rounded-lg transition-all"
              style={{
                background: 'rgba(201,168,76,0.12)',
                border: '1px solid rgba(201,168,76,0.35)',
                color: 'rgba(201,168,76,0.9)',
              }}
            >
              ✦ Add
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-mystic-text text-sm">
              <span className="text-mystic-muted">Name: </span>
              <span className="text-mystic-gold font-heading">{birthData.userName}</span>
            </p>
            <button
              type="button"
              onClick={() => { setNameInput(birthData.userName ?? ''); setEditingName(true) }}
              className="text-mystic-muted text-xs hover:text-mystic-text transition-colors"
            >
              Edit
            </button>
          </div>
        )}
        {!birthData.userName && !editingName && (
          <p className="text-mystic-muted/60 text-xs mt-2">Add your full birth name to reveal your Expression Number.</p>
        )}
      </div>

      {/* Number cards */}
      <div className="space-y-5 mb-10">
        <NumberCard
          label="Life Path"
          number={reading.lifePath}
          category="lifePath"
        />
        <NumberCard
          label="Birthday Number"
          number={reading.birthdayNumber}
          category="birthdayNumber"
        />
        <NumberCard
          label="Personal Year"
          number={reading.personalYear}
          category="personalYear"
          badge={String(new Date().getFullYear())}
        />
        {reading.expressionNumber ? (
          <NumberCard
            label="Expression Number"
            number={reading.expressionNumber}
            category="expressionNumber"
          />
        ) : (
          <div className="bg-mystic-surface/20 border border-dashed border-mystic-border rounded-xl p-6 text-center">
            <p className="text-mystic-gold/50 font-heading text-lg mb-1">Expression Number</p>
            <p className="text-mystic-muted text-sm">Enter your full birth name above to reveal your Expression Number.</p>
          </div>
        )}
      </div>

      {/* Cosmic Connections */}
      {chartData && (
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-mystic-border" />
            <span className="font-heading text-mystic-gold text-sm tracking-widest">✦ Cosmic Connections</span>
            <div className="h-px flex-1 bg-mystic-border" />
          </div>
          <p className="text-mystic-muted text-xs text-center mb-6 tracking-wide">Where your numbers echo in your natal chart</p>

          <div className="space-y-4">
            {lifepathCrossRef && (
              <div className="bg-mystic-surface/30 border border-mystic-gold/15 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-mystic-gold text-sm font-heading">Life Path {reading.lifePath}</span>
                  <span className="text-mystic-muted text-xs">in your natal chart</span>
                </div>
                <p className="text-mystic-text/75 text-sm leading-relaxed">{lifepathCrossRef}</p>
              </div>
            )}

            {personalYearCrossRef && (
              <div className="bg-mystic-surface/30 border border-mystic-gold/15 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-mystic-gold text-sm font-heading">Personal Year {reading.personalYear}</span>
                  <span className="text-mystic-muted text-xs">— current cycle energy</span>
                </div>
                <p className="text-mystic-text/75 text-sm leading-relaxed">{personalYearCrossRef}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Back button */}
      <div className="text-center mb-12">
        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_VIEW', view: 'form' })}
          className="px-8 py-3 bg-mystic-gold/10 border border-mystic-gold/30 text-mystic-gold font-heading rounded-lg hover:bg-mystic-gold/20 transition-colors"
        >
          ← Back to Menu
        </button>
      </div>
    </div>
  )
}
