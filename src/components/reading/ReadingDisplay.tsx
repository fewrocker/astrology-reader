import { useState } from 'react'
import type { FullReading, PlanetReading, AspectReading, ElementBalance, ModalityBalance, FocusReading } from '../../data/interpretations'
import type { ChartData, PlanetName } from '../../engine/types'
import { PLANET_GLYPHS, ZODIAC_GLYPHS } from '../../engine/types'
import { formatPosition } from '../../engine/zodiac'

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
