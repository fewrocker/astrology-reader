// Types expected from src/engine/tarot.ts (feat-tarot-engine) and src/data/tarot/cards.ts (feat-tarot-card-data-layer)

export interface TarotCard {
  id: string
  name: string
  number: number
  arcana: 'major' | 'minor'
  suit?: string
  uprightMeaning: string
  reversedMeaning: string
  keywords: string[]
  element?: string
  reflectionQuestion?: string
}

export interface AstroConnection {
  headline: string
  transitInfluence: string | null
  resonanceNote: string
  lunarNote?: string
  transitNotes?: string[]
}

export interface InstantInterpretation {
  coreMeaning: string
  symbolicTheme: string
  emotionalMeaning: string
  practicalGuidance: string
  astroConnection: AstroConnection
  numerologyNote: string
  reflectionQuestion: string
}

interface TarotInterpretationPanelProps {
  interpretation: InstantInterpretation
  card: TarotCard
  personalDay: number
  personalDayMatchesCard: boolean
}

const SECTION_HEADER = 'text-mystic-muted text-xs uppercase tracking-widest mb-3'
const SECTION_CONTAINER = 'border border-mystic-gold/20 rounded-xl bg-mystic-surface/50 p-6 mb-4'
const BODY_TEXT = 'text-mystic-text/90 text-sm leading-relaxed'

export default function TarotInterpretationPanel({
  interpretation,
  card,
  personalDay,
  personalDayMatchesCard,
}: TarotInterpretationPanelProps) {
  const coreMeaning = interpretation.coreMeaning || card.uprightMeaning

  return (
    <div>
      {/* Section 1: Core Meaning */}
      <div className={SECTION_CONTAINER}>
        <p className={SECTION_HEADER}>Core Meaning</p>
        <p className={BODY_TEXT}>{coreMeaning}</p>
      </div>

      {/* Section 2: What It Carries */}
      <div className={SECTION_CONTAINER}>
        <p className={SECTION_HEADER}>What It Carries</p>
        {interpretation.symbolicTheme && (
          <p
            className="font-heading italic mb-3 pl-4 border-l-2 border-mystic-gold/30"
            style={{ fontSize: '1.125rem', color: 'rgba(201,168,76,0.80)' }}
          >
            {interpretation.symbolicTheme}
          </p>
        )}
        {interpretation.emotionalMeaning && (
          <p className={BODY_TEXT}>{interpretation.emotionalMeaning}</p>
        )}
      </div>

      {/* Section 3: Today's Invitation */}
      {interpretation.practicalGuidance && (
        <div className={SECTION_CONTAINER}>
          <p className={SECTION_HEADER}>Today's Invitation</p>
          <p className={BODY_TEXT}>{interpretation.practicalGuidance}</p>
        </div>
      )}

      {/* Section 4: In Your Sky Now */}
      <div className={`${SECTION_CONTAINER} border-l-2 border-l-mystic-gold/40`}>
        <p className={SECTION_HEADER}>In Your Sky Now</p>
        {interpretation.astroConnection.transitInfluence ? (
          <>
            {interpretation.astroConnection.headline && (
              <p
                className="font-heading italic mb-3"
                style={{ fontSize: '1.125rem', color: '#c9a84c' }}
              >
                {interpretation.astroConnection.headline}
              </p>
            )}
            {interpretation.astroConnection.transitNotes?.map((note, i) => (
              <p key={i} className="text-mystic-text/80 text-sm mb-1">{note}</p>
            ))}
            <p className="text-mystic-text/80 text-sm">{interpretation.astroConnection.transitInfluence}</p>
            {interpretation.astroConnection.lunarNote && (
              <p className="text-mystic-muted/80 text-sm mt-2">
                ☽ {interpretation.astroConnection.lunarNote}
              </p>
            )}
          </>
        ) : interpretation.astroConnection.resonanceNote ? (
          <p className="text-mystic-text/80 text-sm">{interpretation.astroConnection.resonanceNote}</p>
        ) : (
          <p className="text-mystic-muted text-sm italic">
            Enter your birth data to see your sky connection.
          </p>
        )}
      </div>

      {/* Section 5: Numerology */}
      <div className={SECTION_CONTAINER}>
        <p className={SECTION_HEADER}>Number</p>
        <div
          className="font-heading leading-none text-center mb-3"
          style={{ fontSize: 'clamp(4rem, 15vw, 7rem)', color: '#c9a84c' }}
        >
          {card.number}
        </div>
        {interpretation.numerologyNote && (
          <p className="text-mystic-text/80 text-sm leading-relaxed">{interpretation.numerologyNote}</p>
        )}
        {personalDayMatchesCard && (
          <p
            className="font-heading italic text-xs mt-2"
            style={{ color: 'rgba(201,168,76,0.70)' }}
          >
            Your personal day is also a {personalDay}.
          </p>
        )}
      </div>

      {/* Section 6: Sit With This */}
      {interpretation.reflectionQuestion && (
        <div className={SECTION_CONTAINER}>
          <p className={SECTION_HEADER}>Sit With This</p>
          <p
            className="font-heading italic leading-relaxed"
            style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.90)' }}
          >
            {interpretation.reflectionQuestion}
          </p>
        </div>
      )}
    </div>
  )
}
