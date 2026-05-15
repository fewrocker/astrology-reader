import { useState, useRef, useEffect, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import { resolvePersonLabel } from '../../context/appState'
import { getDiscussResponse, type ChatMessage } from '../../services/gptInterpretation'
import type { ChartData } from '../../engine/types'
import type { FullReading } from '../../data/interpretations'
import type { TransitData, TransitPeriod } from '../../engine/transits'
import type { SynastryData } from '../../engine/synastry'
import { HOUSE_THEMES } from '../../data/interpretations/houseThemes'

interface DiscussModalProps {
  open: boolean
  onClose: () => void
  mode: 'birth' | 'transit' | 'synastry' | 'synastry-transit'
}

function buildBirthChartContext(
  chartData: ChartData,
  reading: FullReading,
  birthDate: string,
  cityLabel: string,
): string {
  let ctx = `## Birth Chart\nBorn: ${birthDate} — ${cityLabel}\n\n`

  ctx += `### Natal Planet Positions\n`
  for (const pr of reading.planets) {
    const p = pr.planet
    ctx += `- ${p.name}: ${p.degree}°${p.minute}' ${p.sign} (House ${p.house})${p.retrograde ? ' [Rx]' : ''}`
    if (pr.dignity) ctx += ` [${pr.dignity.label}]`
    if (pr.signInterpretation) ctx += ` — ${pr.signInterpretation.brief}`
    ctx += '\n'
  }

  ctx += `\nAscendant: ${chartData.angles.ascendant.degree}°${chartData.angles.ascendant.minute}' ${chartData.angles.ascendant.sign}\n`
  ctx += `Midheaven: ${chartData.angles.midheaven.degree}°${chartData.angles.midheaven.minute}' ${chartData.angles.midheaven.sign}\n`
  ctx += `Descendant: ${chartData.angles.descendant.degree}°${chartData.angles.descendant.minute}' ${chartData.angles.descendant.sign}\n`
  ctx += `IC: ${chartData.angles.imumCoeli.degree}°${chartData.angles.imumCoeli.minute}' ${chartData.angles.imumCoeli.sign}\n`

  ctx += `\n### Houses Overview\n`
  for (const h of chartData.houses) {
    const theme = HOUSE_THEMES[h.house - 1]
    const occupants = chartData.planets.filter(p => p.house === h.house)
    const occupantStr = occupants.length > 0
      ? ` — Planets: ${occupants.map(p => p.name).join(', ')}`
      : ' — Empty (look to ruler placement)'
    ctx += `- House ${h.house} (${theme.name}): ${h.degree}°${h.minute}' ${h.sign} | ${theme.theme}${occupantStr}\n`
  }

  ctx += `\n### Natal Aspects & Interpretations\n`
  for (const ar of reading.aspects) {
    const a = ar.aspect
    ctx += `- ${a.planet1} ${a.symbol} ${a.planet2} (${a.type}, orb ${a.orb.toFixed(1)}°, ${a.nature})`
    if (ar.interpretation) ctx += `: ${ar.interpretation.brief} — ${ar.interpretation.detail}`
    ctx += '\n'
  }

  if (reading.patterns?.length > 0) {
    ctx += `\n### Aspect Patterns\n`
    for (const pr of reading.patterns) {
      ctx += `- ${pr.interpretation.symbol} ${pr.pattern.type}: ${pr.pattern.planets.join(', ')}\n`
      ctx += `  ${pr.interpretation.brief}\n`
      ctx += `  ${pr.interpretation.detail}\n`
      if (pr.elementFlavor) ctx += `  ${pr.elementFlavor}\n`
    }
  }

  ctx += `\n### Element Balance\n`
  const el = reading.elements
  ctx += `Fire: ${el.counts.Fire}, Earth: ${el.counts.Earth}, Air: ${el.counts.Air}, Water: ${el.counts.Water}\n`
  ctx += `Dominant: ${el.dominant}${el.lacking ? `, Lacking: ${el.lacking}` : ''}\n`
  ctx += `${el.interpretation.dominant}\n`
  if (el.interpretation.lacking) ctx += `${el.interpretation.lacking}\n`

  ctx += `\n### Modality Balance\n`
  const mod = reading.modalities
  ctx += `Cardinal: ${mod.counts.Cardinal}, Fixed: ${mod.counts.Fixed}, Mutable: ${mod.counts.Mutable}\n`
  ctx += `Dominant: ${mod.dominant}${mod.lacking ? `, Lacking: ${mod.lacking}` : ''}\n`
  ctx += `${mod.interpretation.dominant}\n`
  if (mod.interpretation.lacking) ctx += `${mod.interpretation.lacking}\n`

  if (reading.mutualReceptions?.length > 0) {
    ctx += `\n### Mutual Receptions\n`
    for (const mr of reading.mutualReceptions) {
      ctx += `- ${mr.planet1} in ${mr.sign1} ⇄ ${mr.planet2} in ${mr.sign2}: ${mr.interpretation}\n`
    }
  }

  const retrogradePlanets = reading.planets.filter(pr => pr.retrogradeInterpretation)
  if (retrogradePlanets.length > 0 && reading.retrogradeSummary) {
    ctx += `\n### Natal Retrograde Planets (${retrogradePlanets.length})\n`
    ctx += `${reading.retrogradeSummary.headline}: ${reading.retrogradeSummary.narrative}\n`
    for (const pr of retrogradePlanets) {
      ctx += `- ${pr.planet.name} ℞ in ${pr.planet.sign}: ${pr.retrogradeInterpretation!.brief} — ${pr.retrogradeInterpretation!.detail}\n`
    }
  }

  if (reading.focus) {
    ctx += `\n### Focus Area: ${reading.focus.area}\n${reading.focus.description}\n`
    if (reading.focus.relevantPlanets?.length > 0) {
      ctx += `Key planets for this area:\n`
      for (const rp of reading.focus.relevantPlanets) {
        ctx += `- ${rp.planet.name} in ${rp.planet.sign} (House ${rp.planet.house})`
        if (rp.signInterpretation) ctx += ` — ${rp.signInterpretation.brief}`
        ctx += '\n'
      }
    }
    if (reading.focus.relevantAspects?.length > 0) {
      ctx += `Key aspects for this area:\n`
      for (const ra of reading.focus.relevantAspects) {
        ctx += `- ${ra.aspect.planet1} ${ra.aspect.symbol} ${ra.aspect.planet2} (${ra.aspect.type})`
        if (ra.interpretation) ctx += `: ${ra.interpretation.brief}`
        ctx += '\n'
      }
    }
  }

  return ctx
}

function buildTransitContext(
  transitData: TransitData,
  transitPeriod: TransitPeriod,
  transitInterpretation: string | null,
): string {
  let ctx = `\n## Current Transit Reading (${transitPeriod})\n`
  ctx += `Period: ${transitData.dateRange.start} to ${transitData.dateRange.end}\n\n`

  ctx += `### Current Planet Positions\n`
  for (const p of transitData.currentPlanets) {
    if (p.name === 'NorthNode') continue
    ctx += `- Transit ${p.name}: ${p.degree}°${p.minute}' ${p.sign}${p.retrograde ? ' [Rx]' : ''}\n`
  }

  ctx += `\n### Transit Aspects to Natal\n`
  if (transitData.transitAspects.length === 0) {
    ctx += `No major transit aspects within orb.\n`
  } else {
    for (const a of transitData.transitAspects) {
      ctx += `- Transit ${a.transitPlanet} ${a.symbol} Natal ${a.natalPlanet} (${a.type}, orb ${a.orb}°, ${a.applying ? 'applying' : 'separating'}, ${a.nature})\n`
    }
  }

  const ingresses = transitData.ingresses.filter(i => i.planet !== 'Moon')
  if (ingresses.length > 0) {
    ctx += `\n### Sign Changes\n`
    for (const ing of ingresses) {
      ctx += `- ${ing.planet} enters ${ing.toSign} around ${ing.approximateDate}\n`
    }
  }

  const retros = transitData.retrogrades.filter(r => r.isRetro || r.status.includes('Stationing'))
  if (retros.length > 0) {
    ctx += `\n### Retrograde Activity\n`
    for (const r of retros) {
      ctx += `- ${r.planet}: ${r.status}\n`
    }
  }

  if (transitInterpretation) {
    ctx += `\n### Previous Transit Interpretation\n${transitInterpretation}\n`
  }

  return ctx
}

function buildSynastryContext(
  chart1: ChartData,
  chart2: ChartData,
  synastryData: SynastryData,
  person1Date: string,
  person2Date: string,
  person1City: string,
  person2City: string,
  synastryInterpretation: string | null,
  label1: string,
  label2: string,
): string {
  let ctx = `## Couple Synastry Analysis\n\n`

  ctx += `### ${label1}\nBorn: ${person1Date} — ${person1City}\n`
  for (const p of chart1.planets) {
    ctx += `- ${p.name}: ${p.degree}°${p.minute}' ${p.sign}${!chart1.unknownTime ? ` (House ${p.house})` : ''}${p.retrograde ? ' [Rx]' : ''}\n`
  }

  ctx += `\n### ${label2}\nBorn: ${person2Date} — ${person2City}\n`
  for (const p of chart2.planets) {
    ctx += `- ${p.name}: ${p.degree}°${p.minute}' ${p.sign}${!chart2.unknownTime ? ` (House ${p.house})` : ''}${p.retrograde ? ' [Rx]' : ''}\n`
  }

  ctx += `\n### Synastry Aspects (Cross-Chart)\n`
  for (const a of synastryData.synastryAspects) {
    ctx += `- ${label1} ${a.person1Planet} ${a.symbol} ${label2} ${a.person2Planet} (${a.type}, orb ${a.orb}°, ${a.nature})\n`
  }

  if (synastryData.houseOverlay?.person1InPerson2Houses?.length > 0) {
    ctx += `\n### House Overlays\n`
    ctx += `${label1} planets in ${label2} houses:\n`
    for (const h of synastryData.houseOverlay.person1InPerson2Houses) {
      ctx += `- ${h.planet} → ${label2} House ${h.house}\n`
    }
    ctx += `${label2} planets in ${label1} houses:\n`
    for (const h of synastryData.houseOverlay.person2InPerson1Houses) {
      ctx += `- ${h.planet} → ${label1} House ${h.house}\n`
    }
  }

  ctx += `\n### Composite Chart\n`
  for (const p of synastryData.compositeChart.planets) {
    ctx += `- Composite ${p.name}: ${p.degree}°${p.minute}' ${p.sign}\n`
  }

  ctx += `\n### Compatibility\n`
  ctx += `Elements: ${synastryData.compatibility.elementCompatibility}\n`
  ctx += `Modalities: ${synastryData.compatibility.modalityCompatibility}\n`
  ctx += `Harmonious: ${synastryData.compatibility.harmoniousCount}, Challenging: ${synastryData.compatibility.challengingCount}\n`
  ctx += `Key themes: ${synastryData.compatibility.keyThemes.join('; ')}\n`

  if (synastryInterpretation) {
    ctx += `\n### Previous Synastry Interpretation\n${synastryInterpretation}\n`
  }

  return ctx
}

function buildSynastryTransitContext(
  synastryData: SynastryData,
  transitData: TransitData,
  transitPeriod: TransitPeriod,
  transitInterpretation: string | null,
  person1Date: string,
  person2Date: string,
  person1City: string,
  person2City: string,
  label1: string,
  label2: string,
): string {
  let ctx = `## Couple Transit Reading (${transitPeriod})\n`
  ctx += `Period: ${transitData.dateRange.start} to ${transitData.dateRange.end}\n`
  ctx += `${label1}: ${person1Date} — ${person1City}\n`
  ctx += `${label2}: ${person2Date} — ${person2City}\n\n`

  ctx += `### Composite Chart\n`
  for (const p of synastryData.compositeChart.planets) {
    ctx += `- Composite ${p.name}: ${p.degree}°${p.minute}' ${p.sign}\n`
  }

  ctx += `\n### Key Synastry Aspects\n`
  for (const a of synastryData.synastryAspects.slice(0, 15)) {
    ctx += `- ${label1} ${a.person1Planet} ${a.symbol} ${label2} ${a.person2Planet} (${a.type}, orb ${a.orb}°, ${a.nature})\n`
  }

  ctx += `\n### Current Transit Planet Positions\n`
  for (const p of transitData.currentPlanets) {
    if (p.name === 'NorthNode') continue
    ctx += `- Transit ${p.name}: ${p.degree}°${p.minute}' ${p.sign}${p.retrograde ? ' [Rx]' : ''}\n`
  }

  ctx += `\n### Transit Aspects to Composite Chart\n`
  if (transitData.transitAspects.length === 0) {
    ctx += `No major transit aspects to composite within orb.\n`
  } else {
    for (const a of transitData.transitAspects) {
      ctx += `- Transit ${a.transitPlanet} ${a.symbol} Composite ${a.natalPlanet} (${a.type}, orb ${a.orb}°, ${a.applying ? 'applying' : 'separating'}, ${a.nature})\n`
    }
  }

  if (transitInterpretation) {
    ctx += `\n### Transit Interpretation for This Period\n${transitInterpretation}\n`
  }

  ctx += `\n### Compatibility Summary\n`
  ctx += `Elements: ${synastryData.compatibility.elementCompatibility}\n`
  ctx += `Modalities: ${synastryData.compatibility.modalityCompatibility}\n`
  ctx += `Harmonious: ${synastryData.compatibility.harmoniousCount}, Challenging: ${synastryData.compatibility.challengingCount}\n`
  ctx += `Key themes: ${synastryData.compatibility.keyThemes.join('; ')}\n`

  return ctx
}

export default function DiscussModal({ open, onClose, mode }: DiscussModalProps) {
  const { state } = useApp()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const { chartData, reading, birthData, transitData, transitPeriod, transitInterpretation, partnerBirthData, partnerChartData, synastryData, synastryInterpretation, synastryTransitData, synastryTransitPeriod, synastryTransitInterpretation } = state
  if (!chartData || !reading) return null

  const cityLabel = birthData.city ? `${birthData.city.name}, ${birthData.city.country}` : ''
  const partnerCityLabel = partnerBirthData.city ? `${partnerBirthData.city.name}, ${partnerBirthData.city.country}` : ''
  const label1 = resolvePersonLabel(birthData)
  const label2 = resolvePersonLabel(partnerBirthData)

  const buildContext = (): string => {
    if (mode === 'synastry-transit' && synastryData && synastryTransitData && synastryTransitPeriod) {
      return buildSynastryTransitContext(synastryData, synastryTransitData, synastryTransitPeriod, synastryTransitInterpretation, birthData.date, partnerBirthData.date, cityLabel, partnerCityLabel, label1, label2)
    }
    if (mode === 'synastry' && partnerChartData && synastryData) {
      return buildSynastryContext(chartData, partnerChartData, synastryData, birthData.date, partnerBirthData.date, cityLabel, partnerCityLabel, synastryInterpretation, label1, label2)
    }
    let ctx = buildBirthChartContext(chartData, reading, birthData.date, cityLabel)
    if (mode === 'transit' && transitData && transitPeriod) {
      ctx += buildTransitContext(transitData, transitPeriod, transitInterpretation)
    }
    return ctx
  }

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    const userMsg: ChatMessage = { role: 'user', content: trimmed }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setError(null)
    setLoading(true)

    try {
      const context = buildContext()
      const reply = await getDiscussResponse(context, newMessages)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* modal */}
      <div className="relative w-full max-w-3xl bg-mystic-bg border border-mystic-gold/30 rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-mystic-gold/20">
          <div>
            <h3 className="font-heading text-xl text-mystic-gold">
              Discuss Your {mode === 'synastry-transit' ? 'Couple Transits' : mode === 'synastry' ? 'Compatibility' : mode === 'transit' ? 'Transit Reading' : 'Birth Chart'}
            </h3>
            <p className="text-mystic-muted text-xs mt-0.5">
              Ask anything about your {mode === 'synastry-transit' ? 'couple transit reading for this period' : mode === 'synastry' ? 'couple synastry and compatibility' : mode === 'transit' ? 'transits and natal chart' : 'natal chart and placements'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-mystic-muted hover:text-mystic-text transition-colors text-2xl leading-none p-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* chat area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-[300px]">
          {messages.length === 0 && (
            <div className="text-center py-10">
              <div className="discuss-oracle-container mx-auto mb-6">
                <div className="discuss-orbit-ring">
                  <div className="discuss-orbit-dot" style={{ animationDelay: '0s' }}>☉</div>
                  <div className="discuss-orbit-dot" style={{ animationDelay: '-2s' }}>☽</div>
                  <div className="discuss-orbit-dot" style={{ animationDelay: '-4s' }}>✦</div>
                </div>
                <div className="discuss-oracle-core">✧</div>
              </div>
              <p className="font-heading text-mystic-gold/80 text-base mb-1">
                {mode === 'synastry-transit' ? 'The Heavens Move Between You' : mode === 'synastry' ? 'The Stars Speak of Two Souls' : mode === 'transit' ? 'The Cosmos Is in Motion' : 'Your Stars Await'}
              </p>
              <p className="text-mystic-muted text-sm max-w-md mx-auto">
                {mode === 'synastry-transit'
                  ? 'Ask how current transits are shaping your relationship during this period.'
                  : mode === 'synastry'
                  ? 'Ask about your celestial connection — the planets reveal what draws you together and where you grow.'
                  : mode === 'transit'
                    ? 'The heavens shift above you. Ask what the current transits illuminate in your journey.'
                    : 'Your birth chart holds the map of your soul. Ask anything and let the planets guide.'
                }
              </p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {mode === 'synastry-transit' ? (
                  <>
                    <SuggestionChip text="What should we focus on this period?" onClick={setInput} />
                    <SuggestionChip text="Any relationship challenges ahead?" onClick={setInput} />
                    <SuggestionChip text="How do these transits affect our communication?" onClick={setInput} />
                    <SuggestionChip text="What's the best energy for us right now?" onClick={setInput} />
                  </>
                ) : mode === 'synastry' ? (
                  <>
                    <SuggestionChip text="What's our strongest connection?" onClick={setInput} />
                    <SuggestionChip text="How can we communicate better?" onClick={setInput} />
                    <SuggestionChip text="What challenges should we work on?" onClick={setInput} />
                    <SuggestionChip text="Tell me about our romantic chemistry" onClick={setInput} />
                  </>
                ) : mode === 'birth' ? (
                  <>
                    <SuggestionChip text="What does my Sun-Moon combination mean?" onClick={setInput} />
                    <SuggestionChip text="Tell me about my career potential" onClick={setInput} />
                    <SuggestionChip text="What are my strongest placements?" onClick={setInput} />
                  </>
                ) : (
                  <>
                    <SuggestionChip text="What should I focus on right now?" onClick={setInput} />
                    <SuggestionChip text="How do today's transits affect my love life?" onClick={setInput} />
                    <SuggestionChip text="Any challenges I should watch out for?" onClick={setInput} />
                  </>
                )}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-mystic-gold/15 border border-mystic-gold/25 text-mystic-text'
                    : 'bg-mystic-surface border border-mystic-border text-mystic-text/90'
                }`}
              >
                {msg.role === 'assistant' && i === messages.length - 1
                  ? <RevealText text={msg.content} />
                  : msg.content.split('\n').map((line, j) => (
                      <p key={j} className={j > 0 ? 'mt-2' : ''}>{line}</p>
                    ))
                }
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-mystic-surface border border-mystic-border rounded-lg px-5 py-4">
                <div className="discuss-thinking">
                  <span className="discuss-thinking-dot">✦</span>
                  <span className="discuss-thinking-dot">✧</span>
                  <span className="discuss-thinking-dot">✦</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* input area */}
        <div className="px-6 py-4 border-t border-mystic-gold/20">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your chart..."
              rows={1}
              className="flex-1 px-4 py-2.5 bg-mystic-surface border border-mystic-border rounded-lg text-mystic-text text-sm resize-none focus:border-mystic-gold/50 focus:outline-none placeholder:text-mystic-muted/50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="px-5 py-2.5 bg-mystic-gold text-mystic-bg font-heading rounded-lg hover:bg-mystic-gold/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SuggestionChip({ text, onClick }: { text: string; onClick: (text: string) => void }) {
  return (
    <button
      onClick={() => onClick(text)}
      className="px-3 py-1.5 bg-mystic-gold/5 border border-mystic-gold/15 rounded-full text-xs text-mystic-muted hover:text-mystic-gold hover:border-mystic-gold/30 transition-colors"
    >
      {text}
    </button>
  )
}

/** Streams text word-by-word like a GPT response. */
function RevealText({ text }: { text: string }) {
  const words = useMemo(() => text.split(/(\s+)/), [text])
  const [count, setCount] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCount(0)
    let i = 0
    const id = setInterval(() => {
      i += 2 // reveal 2 tokens (word + space) per tick
      if (i >= words.length) { setCount(words.length); clearInterval(id) }
      else setCount(i)
    }, 30)
    return () => clearInterval(id)
  }, [words])

  const revealed = words.slice(0, count).join('')

  return (
    <div ref={containerRef}>
      {revealed.split('\n').map((line, j) => (
        <p key={j} className={j > 0 ? 'mt-2' : ''}>{line}</p>
      ))}
    </div>
  )
}
