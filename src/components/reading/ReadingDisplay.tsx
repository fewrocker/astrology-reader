import { useState } from 'react'
import type { FullReading, PlanetReading, AspectReading, ElementBalance, ModalityBalance, FocusReading, PatternReading } from '../../data/interpretations'
import type { ChartData, PlanetName } from '../../engine/types'
import { PLANET_GLYPHS, ZODIAC_GLYPHS } from '../../engine/types'
import { formatPosition } from '../../engine/zodiac'
import { HOUSE_THEMES } from '../../data/interpretations/houseThemes'
import { dignityScore } from '../../data/interpretations/dignities'
import type { MutualReception } from '../../data/interpretations/dignities'

// ---------- shared ----------

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-mystic-gold/20 rounded-lg overflow-hidden mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 bg-mystic-gold/5 hover:bg-mystic-gold/10 transition-colors text-left"
      >
        <span className="font-heading text-lg text-mystic-gold">{title}</span>
        <span className="text-mystic-muted text-xl transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>
      {open && <div className="px-5 py-4">{children}</div>}
    </div>
  )
}

// ---------- summary ----------

function BigThreeRow({ label, glyph, sign, signGlyph, position }: { label: string; glyph: string; sign: string; signGlyph: string; position: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-2xl" title={label}>{glyph}</span>
      <div>
        <span className="text-mystic-text font-medium">{label}</span>
        <span className="text-mystic-muted mx-2">in</span>
        <span className="text-mystic-gold font-heading text-lg">{signGlyph} {sign}</span>
        <span className="text-mystic-muted text-sm ml-2">{position}</span>
      </div>
    </div>
  )
}

export function ReadingSummary({ reading, chart }: { reading: FullReading; chart: ChartData }) {
  const sun = reading.planets.find(p => p.planet.name === 'Sun')
  const moon = reading.planets.find(p => p.planet.name === 'Moon')
  const asc = chart.angles.ascendant

  const bigThree = [
    sun && { label: 'Sun', glyph: PLANET_GLYPHS.Sun, sign: sun.planet.sign, signGlyph: ZODIAC_GLYPHS[sun.planet.sign], position: formatPosition(sun.planet) },
    moon && { label: 'Moon', glyph: PLANET_GLYPHS.Moon, sign: moon.planet.sign, signGlyph: ZODIAC_GLYPHS[moon.planet.sign], position: formatPosition(moon.planet) },
    !chart.unknownTime && { label: 'Rising', glyph: '⬆', sign: asc.sign, signGlyph: ZODIAC_GLYPHS[asc.sign], position: `${asc.degree}°${asc.minute}′ ${asc.sign}` },
  ].filter(Boolean) as { label: string; glyph: string; sign: string; signGlyph: string; position: string }[]

  return (
    <div className="mb-8">
      <h2 className="font-heading text-2xl text-mystic-gold mb-4">Your Big Three</h2>
      <div className="bg-mystic-gold/5 rounded-lg p-5 border border-mystic-gold/20">
        {bigThree.map(bt => <BigThreeRow key={bt.label} {...bt} />)}
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-mystic-purple/10 rounded-lg p-3 text-center border border-mystic-purple/20">
          <div className="text-mystic-muted text-xs uppercase tracking-wider mb-1">Dominant Element</div>
          <div className="text-mystic-text font-heading text-lg">{reading.elements.dominant}</div>
        </div>
        <div className="bg-mystic-blue/10 rounded-lg p-3 text-center border border-mystic-blue/20">
          <div className="text-mystic-muted text-xs uppercase tracking-wider mb-1">Dominant Modality</div>
          <div className="text-mystic-text font-heading text-lg">{reading.modalities.dominant}</div>
        </div>
      </div>
    </div>
  )
}

// ---------- planet section ----------

function PlanetCard({ pr, showHouse }: { pr: PlanetReading; showHouse: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const name = pr.planet.name as PlanetName
  const glyph = PLANET_GLYPHS[name] ?? PLANET_GLYPHS[pr.planet.name as keyof typeof PLANET_GLYPHS]

  return (
    <div className="border border-mystic-gold/10 rounded-lg p-4 mb-2">
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left flex items-start gap-3">
        <span className="text-xl mt-0.5">{glyph}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-mystic-text font-medium">{pr.planet.name}</span>
            {pr.planet.retrograde && <span className="text-mystic-muted text-xs border border-mystic-muted/30 rounded px-1">Rx</span>}
            {pr.dignity && (
              <span className={`text-xs font-medium border rounded px-1.5 py-0.5 ${pr.dignity.color} ${pr.dignity.bgColor} border-current/20`}>
                {pr.dignity.symbol} {pr.dignity.label}
              </span>
            )}
            <span className="text-mystic-muted">in</span>
            <span className="text-mystic-gold">{ZODIAC_GLYPHS[pr.planet.sign]} {pr.planet.sign}</span>
            {showHouse && <span className="text-mystic-muted text-sm">· House {pr.planet.house}</span>}
          </div>
          {pr.signInterpretation && <p className="text-mystic-muted text-sm mt-1">{pr.signInterpretation.brief}</p>}
        </div>
        <span className="text-mystic-muted text-sm">{expanded ? '−' : '+'}</span>
      </button>

      {expanded && (
        <div className="mt-3 ml-9 space-y-3 text-sm">
          {pr.signInterpretation && (
            <div>
              <div className="text-mystic-gold/80 font-medium text-xs uppercase tracking-wider mb-1">{pr.planet.name} in {pr.planet.sign}</div>
              <p className="text-mystic-text/90 leading-relaxed">{pr.signInterpretation.detail}</p>
            </div>
          )}
          {showHouse && pr.houseInterpretation && (
            <div>
              <div className="text-mystic-gold/80 font-medium text-xs uppercase tracking-wider mb-1">{pr.planet.name} in House {pr.planet.house}</div>
              <p className="text-mystic-text/90 leading-relaxed">{pr.houseInterpretation.detail}</p>
            </div>
          )}
          {pr.dignity && (
            <div className={`rounded-md p-3 ${pr.dignity.bgColor}`}>
              <div className={`font-medium text-xs uppercase tracking-wider mb-1 ${pr.dignity.color}`}>
                {pr.dignity.symbol} {pr.dignity.label}
              </div>
              <p className="text-mystic-text/80 leading-relaxed">{pr.dignity.description}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function PlanetSection({ reading, showHouse }: { reading: FullReading; showHouse: boolean }) {
  return (
    <Section title="Planets in Signs & Houses" defaultOpen>
      {reading.planets.map(pr => (
        <PlanetCard key={pr.planet.name} pr={pr} showHouse={showHouse} />
      ))}
    </Section>
  )
}

// ---------- aspects section ----------

function AspectRow({ ar }: { ar: AspectReading }) {
  const [expanded, setExpanded] = useState(false)
  const g1 = PLANET_GLYPHS[ar.aspect.planet1 as PlanetName] ?? '☊'
  const g2 = PLANET_GLYPHS[ar.aspect.planet2 as PlanetName] ?? '☊'
  const natureColor = ar.aspect.nature === 'harmonious' ? 'text-green-400' : ar.aspect.nature === 'challenging' ? 'text-red-400' : 'text-mystic-gold'

  return (
    <div className="border border-mystic-gold/10 rounded-lg p-3 mb-2">
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left flex items-center gap-2">
        <span>{g1}</span>
        <span className={`${natureColor} text-lg`}>{ar.aspect.symbol}</span>
        <span>{g2}</span>
        <span className="text-mystic-text text-sm flex-1">{ar.aspect.planet1} {ar.aspect.type} {ar.aspect.planet2}</span>
        <span className="text-mystic-muted text-xs">{ar.aspect.orb.toFixed(1)}° orb</span>
        <span className="text-mystic-muted text-sm ml-2">{expanded ? '−' : '+'}</span>
      </button>
      {expanded && ar.interpretation && (
        <div className="mt-2 ml-8 text-sm">
          <p className="text-mystic-gold/80 text-xs font-medium mb-1">{ar.interpretation.brief}</p>
          <p className="text-mystic-text/90 leading-relaxed">{ar.interpretation.detail}</p>
        </div>
      )}
      {expanded && !ar.interpretation && (
        <p className="mt-2 ml-8 text-mystic-muted text-sm italic">This is a minor aspect contributing subtle energy to your chart.</p>
      )}
    </div>
  )
}

export function AspectSection({ reading }: { reading: FullReading }) {
  const major = reading.aspects.filter(a => ['conjunction', 'opposition', 'trine', 'square', 'sextile'].includes(a.aspect.type))
  const minor = reading.aspects.filter(a => !['conjunction', 'opposition', 'trine', 'square', 'sextile'].includes(a.aspect.type))

  return (
    <Section title={`Aspects (${reading.aspects.length})`}>
      {major.length > 0 && (
        <>
          <h3 className="text-mystic-muted text-xs uppercase tracking-wider mb-2">Major Aspects</h3>
          {major.map((ar, i) => <AspectRow key={i} ar={ar} />)}
        </>
      )}
      {minor.length > 0 && (
        <>
          <h3 className="text-mystic-muted text-xs uppercase tracking-wider mb-2 mt-4">Minor Aspects</h3>
          {minor.map((ar, i) => <AspectRow key={`m${i}`} ar={ar} />)}
        </>
      )}
    </Section>
  )
}

// ---------- element / modality balance ----------

function BalanceBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="mb-2">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-mystic-text">{label}</span>
        <span className="text-mystic-muted">{count} planets</span>
      </div>
      <div className="h-2 bg-mystic-gold/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const ELEMENT_COLORS: Record<string, string> = { Fire: 'bg-red-500', Earth: 'bg-green-600', Air: 'bg-yellow-400', Water: 'bg-blue-500' }
const MODALITY_COLORS: Record<string, string> = { Cardinal: 'bg-mystic-gold', Fixed: 'bg-mystic-purple', Mutable: 'bg-mystic-blue' }

export function BalanceSection({ elements, modalities }: { elements: ElementBalance; modalities: ModalityBalance }) {
  const totalPlanets = Object.values(elements.counts).reduce((s, v) => s + v, 0)

  return (
    <Section title="Element & Modality Balance">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-mystic-gold text-sm font-heading mb-3">Elements</h3>
          {(Object.entries(elements.counts) as [string, number][]).map(([el, count]) => (
            <BalanceBar key={el} label={el} count={count} total={totalPlanets} color={ELEMENT_COLORS[el]} />
          ))}
          <p className="text-mystic-text/90 text-sm mt-3 leading-relaxed">{elements.interpretation.dominant}</p>
          {elements.interpretation.lacking && (
            <p className="text-mystic-muted text-sm mt-2 leading-relaxed">{elements.interpretation.lacking}</p>
          )}
        </div>
        <div>
          <h3 className="text-mystic-gold text-sm font-heading mb-3">Modalities</h3>
          {(Object.entries(modalities.counts) as [string, number][]).map(([mod, count]) => (
            <BalanceBar key={mod} label={mod} count={count} total={totalPlanets} color={MODALITY_COLORS[mod]} />
          ))}
          <p className="text-mystic-text/90 text-sm mt-3 leading-relaxed">{modalities.interpretation.dominant}</p>
          {modalities.interpretation.lacking && (
            <p className="text-mystic-muted text-sm mt-2 leading-relaxed">{modalities.interpretation.lacking}</p>
          )}
        </div>
      </div>
    </Section>
  )
}

// ---------- aspect patterns section ----------

const PATTERN_COLORS: Record<string, string> = {
  'Grand Trine': 'border-green-500/30 bg-green-900/10',
  'T-Square': 'border-red-500/30 bg-red-900/10',
  'Grand Cross': 'border-red-400/30 bg-red-900/10',
  'Yod': 'border-mystic-purple/30 bg-mystic-purple/10',
}

const PATTERN_TITLE_COLORS: Record<string, string> = {
  'Grand Trine': 'text-green-400',
  'T-Square': 'text-red-400',
  'Grand Cross': 'text-red-300',
  'Yod': 'text-mystic-purple',
}

function PatternCard({ pr }: { pr: PatternReading }) {
  const [expanded, setExpanded] = useState(false)
  const colors = PATTERN_COLORS[pr.pattern.type] ?? 'border-mystic-gold/20 bg-mystic-gold/5'
  const titleColor = PATTERN_TITLE_COLORS[pr.pattern.type] ?? 'text-mystic-gold'

  return (
    <div className={`border rounded-lg p-4 mb-3 ${colors}`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{pr.interpretation.symbol}</span>
          <div className="flex-1">
            <h4 className={`font-heading text-lg ${titleColor}`}>{pr.pattern.type}</h4>
            <div className="flex flex-wrap gap-2 mt-1">
              {pr.planetSigns.map((ps) => (
                <span key={ps.name} className="text-mystic-text text-sm">
                  {PLANET_GLYPHS[ps.name as PlanetName] ?? '☊'}{' '}
                  {ps.name} in {ZODIAC_GLYPHS[ps.sign]} {ps.sign}
                </span>
              ))}
            </div>
          </div>
          <span className="text-mystic-muted text-sm">{expanded ? '−' : '+'}</span>
        </div>
        <p className="text-mystic-muted text-sm leading-relaxed">{pr.interpretation.brief}</p>
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-mystic-gold/10">
          <p className="text-mystic-text/90 text-sm leading-relaxed">{pr.interpretation.detail}</p>
          {pr.elementFlavor && (
            <p className="text-mystic-gold/80 text-sm mt-3 italic leading-relaxed">{pr.elementFlavor}</p>
          )}
        </div>
      )}
    </div>
  )
}

export function AspectPatternsSection({ patterns }: { patterns: PatternReading[] }) {
  if (patterns.length === 0) return null

  return (
    <Section title={`Aspect Patterns (${patterns.length})`} defaultOpen>
      <p className="text-mystic-muted text-sm mb-4">
        Aspect patterns are rare configurations formed when three or more planets align in specific geometric relationships.
        They reveal deep themes and powerful dynamics in your chart.
      </p>
      {patterns.map((pr, i) => (
        <PatternCard key={i} pr={pr} />
      ))}
    </Section>
  )
}

// ---------- focus area section ----------

export function FocusSection({ focus }: { focus: FocusReading }) {
  return (
    <Section title={`Focus: ${focus.area.charAt(0).toUpperCase() + focus.area.slice(1)}`} defaultOpen>
      <p className="text-mystic-text/90 text-sm mb-4 leading-relaxed">{focus.description}</p>

      {focus.relevantPlanets.length > 0 && (
        <div className="mb-4">
          <h3 className="text-mystic-gold text-xs uppercase tracking-wider mb-2">Key Planets</h3>
          {focus.relevantPlanets.map(pr => (
            <div key={pr.planet.name} className="mb-3 pl-3 border-l-2 border-mystic-gold/30">
              <div className="text-mystic-text font-medium text-sm">
                {PLANET_GLYPHS[pr.planet.name as PlanetName] ?? '☊'} {pr.planet.name} in {ZODIAC_GLYPHS[pr.planet.sign]} {pr.planet.sign}
              </div>
              {pr.signInterpretation && <p className="text-mystic-muted text-sm mt-1">{pr.signInterpretation.detail}</p>}
              {pr.houseInterpretation && <p className="text-mystic-muted text-sm mt-1">{pr.houseInterpretation.detail}</p>}
            </div>
          ))}
        </div>
      )}

      {focus.relevantAspects.length > 0 && (
        <div>
          <h3 className="text-mystic-gold text-xs uppercase tracking-wider mb-2">Related Aspects</h3>
          {focus.relevantAspects.map((ar, i) => (
            <div key={i} className="mb-2 pl-3 border-l-2 border-mystic-purple/30">
              <div className="text-mystic-text text-sm">
                {ar.aspect.planet1} {ar.aspect.symbol} {ar.aspect.planet2}
                {ar.interpretation && <span className="text-mystic-muted"> — {ar.interpretation.brief}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

// ---------- houses overview section ----------

function HouseCard({ houseNum, cuspSign, planets }: { houseNum: number; cuspSign: string; planets: { name: string; glyph: string }[] }) {
  const [expanded, setExpanded] = useState(false)
  const theme = HOUSE_THEMES[houseNum - 1]
  const signGlyph = ZODIAC_GLYPHS[cuspSign as keyof typeof ZODIAC_GLYPHS] ?? ''

  return (
    <div className="border border-mystic-gold/10 rounded-lg p-4 mb-2">
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left flex items-start gap-3">
        <span className="text-xl font-heading text-mystic-gold/70 w-8 text-center mt-0.5">{houseNum}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-mystic-text font-medium">{theme.name}</span>
            <span className="text-mystic-muted">·</span>
            <span className="text-mystic-gold">{signGlyph} {cuspSign}</span>
          </div>
          <p className="text-mystic-muted text-xs mt-0.5">{theme.theme}</p>
          {planets.length > 0 && (
            <div className="flex gap-2 mt-1.5">
              {planets.map(p => (
                <span key={p.name} className="text-mystic-text text-xs bg-mystic-gold/10 border border-mystic-gold/15 rounded px-1.5 py-0.5">
                  {p.glyph} {p.name}
                </span>
              ))}
            </div>
          )}
          {planets.length === 0 && (
            <p className="text-mystic-muted/60 text-xs mt-1 italic">
              Ruled by {theme.naturalRuler} — look to its placement for this house's influence
            </p>
          )}
        </div>
        <span className="text-mystic-muted text-sm">{expanded ? '−' : '+'}</span>
      </button>

      {expanded && (
        <div className="mt-3 ml-11 text-sm">
          <p className="text-mystic-text/90 leading-relaxed">{theme.brief}</p>
          <div className="mt-2 text-mystic-muted text-xs">
            <span className="text-mystic-gold/60">Natural ruler:</span> {PLANET_GLYPHS[theme.naturalRuler]} {theme.naturalRuler} · {ZODIAC_GLYPHS[theme.naturalSign]} {theme.naturalSign}
          </div>
        </div>
      )}
    </div>
  )
}

export function HousesOverview({ chart }: { chart: ChartData }) {
  // Map planets to their houses
  const planetsByHouse: Record<number, { name: string; glyph: string }[]> = {}
  for (let i = 1; i <= 12; i++) planetsByHouse[i] = []
  for (const p of chart.planets) {
    const glyph = PLANET_GLYPHS[p.name as PlanetName] ?? '☊'
    planetsByHouse[p.house]?.push({ name: p.name, glyph })
  }

  return (
    <Section title="Houses Overview">
      <p className="text-mystic-muted text-sm mb-4">
        The twelve houses represent different areas of life. The sign on each house cusp colors how you experience that domain.
      </p>
      {chart.houses.map(h => (
        <HouseCard
          key={h.house}
          houseNum={h.house}
          cuspSign={h.sign}
          planets={planetsByHouse[h.house]}
        />
      ))}
    </Section>
  )
}

// ---------- planetary strength section ----------

function StrengthBar({ planet, score, dignity }: { planet: PlanetReading; score: number; dignity: PlanetReading['dignity'] }) {
  const name = planet.planet.name as PlanetName
  const glyph = PLANET_GLYPHS[name] ?? '☊'
  // Map score (-4 to +5) to visual width (0-100%), centered at ~44%
  const pct = Math.round(((score + 4) / 9) * 100)
  const barColor = score > 0 ? 'bg-yellow-400/70' : score < 0 ? 'bg-red-400/50' : 'bg-gray-500/40'
  const labelColor = dignity ? dignity.color : 'text-mystic-muted'

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between text-sm mb-1">
        <div className="flex items-center gap-2">
          <span className="text-base">{glyph}</span>
          <span className="text-mystic-text">{planet.planet.name}</span>
          <span className="text-mystic-muted text-xs">in {ZODIAC_GLYPHS[planet.planet.sign]} {planet.planet.sign}</span>
        </div>
        <span className={`text-xs font-medium ${labelColor}`}>
          {dignity ? `${dignity.symbol} ${dignity.label}` : 'Peregrine'}
        </span>
      </div>
      <div className="h-2 bg-mystic-gold/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function MutualReceptionCard({ mr }: { mr: MutualReception }) {
  const g1 = PLANET_GLYPHS[mr.planet1] ?? '☊'
  const g2 = PLANET_GLYPHS[mr.planet2] ?? '☊'

  return (
    <div className="border border-mystic-purple/20 bg-mystic-purple/5 rounded-lg p-4 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{g1}</span>
        <span className="text-mystic-purple text-sm">⇄</span>
        <span className="text-lg">{g2}</span>
        <span className="text-mystic-purple font-heading text-sm ml-1">Mutual Reception</span>
      </div>
      <div className="text-mystic-muted text-xs mb-2">
        {mr.planet1} in {ZODIAC_GLYPHS[mr.sign1]} {mr.sign1} · {mr.planet2} in {ZODIAC_GLYPHS[mr.sign2]} {mr.sign2}
      </div>
      <p className="text-mystic-text/80 text-sm leading-relaxed">{mr.interpretation}</p>
    </div>
  )
}

export function PlanetaryStrengthSection({ reading }: { reading: FullReading }) {
  const scoredPlanets = reading.planets
    .filter(pr => pr.planet.name !== 'NorthNode')
    .map(pr => ({
      pr,
      score: dignityScore(pr.planet.name as PlanetName, pr.planet.sign),
    }))
    .sort((a, b) => b.score - a.score)

  const dignified = scoredPlanets.filter(sp => sp.score > 0)
  const debilitated = scoredPlanets.filter(sp => sp.score < 0)

  // Build narrative
  let narrative = ''
  if (dignified.length > 0) {
    const names = dignified.map(sp => sp.pr.planet.name).join(', ')
    narrative += `Your strongest placements are ${names} — these planets operate with natural ease and power in your chart.`
  }
  if (debilitated.length > 0) {
    const names = debilitated.map(sp => sp.pr.planet.name).join(', ')
    narrative += `${narrative ? ' ' : ''}${names} ${debilitated.length === 1 ? 'faces' : 'face'} more challenge — ${debilitated.length === 1 ? 'its' : 'their'} expression requires conscious effort and growth.`
  }
  if (!narrative) {
    narrative = 'All your planets are peregrine — none are in signs of special dignity or debility. Your chart expresses a balanced, unaccented energy across all planets.'
  }

  return (
    <Section title="Planetary Strength">
      <p className="text-mystic-muted text-sm mb-4">
        Essential dignities reveal how comfortable each planet is in its zodiac sign. A planet in its domicile or exaltation operates with natural strength,
        while one in detriment or fall must work harder to express its energy.
      </p>

      {scoredPlanets.map(({ pr, score }) => (
        <StrengthBar key={pr.planet.name} planet={pr} score={score} dignity={pr.dignity} />
      ))}

      <p className="text-mystic-text/80 text-sm mt-4 leading-relaxed italic">{narrative}</p>

      {reading.mutualReceptions.length > 0 && (
        <div className="mt-6">
          <h3 className="text-mystic-gold text-sm font-heading mb-3">Mutual Receptions</h3>
          <p className="text-mystic-muted text-sm mb-3">
            A mutual reception occurs when two planets each occupy the other's home sign, creating a powerful cooperative exchange.
          </p>
          {reading.mutualReceptions.map((mr, i) => (
            <MutualReceptionCard key={i} mr={mr} />
          ))}
        </div>
      )}
    </Section>
  )
}
