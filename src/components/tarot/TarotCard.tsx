import React from 'react';
import type { TarotCard as TarotCardData, TarotSuit } from '../../data/tarot/types';
import { CardBack } from './CardBack';
import './tarot.css';

export interface TarotCardProps {
  card: TarotCardData;
  face: 'up' | 'down';
  reversed?: boolean;
  imageUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  glowOnReveal?: boolean;
  onClick?: () => void;
  className?: string;
  'aria-label'?: string;
}

// ── Roman numerals ─────────────────────────────────────────────────────────
const ROMAN: Record<number, string> = {
  1:'I', 2:'II', 3:'III', 4:'IV', 5:'V', 6:'VI', 7:'VII', 8:'VIII',
  9:'IX', 10:'X', 11:'XI', 12:'XII', 13:'XIII', 14:'XIV', 15:'XV',
  16:'XVI', 17:'XVII', 18:'XVIII', 19:'XIX', 20:'XX', 21:'XXI',
};

const COURT: Record<number, string> = { 11:'Page', 12:'Knight', 13:'Queen', 14:'King' };

// ── Element tints for Minor Arcana ─────────────────────────────────────────
const ELEMENT_TINT: Record<string, string> = {
  fire:  'rgba(232,96,60,0.04)',
  water: 'rgba(74,144,217,0.04)',
  air:   'rgba(176,200,224,0.03)',
  earth: 'rgba(138,111,60,0.03)',
};

// ── Pip positions as [x%, y%] within the card face ─────────────────────────
const PIP_POS: Record<number, [number, number][]> = {
  1: [[50,50]],
  2: [[50,26],[50,74]],
  3: [[50,20],[50,50],[50,80]],
  4: [[30,26],[70,26],[30,74],[70,74]],
  5: [[30,22],[70,22],[50,50],[30,78],[70,78]],
  6: [[30,20],[70,20],[30,50],[70,50],[30,80],[70,80]],
  7: [[30,18],[70,18],[50,32],[30,52],[70,52],[30,82],[70,82]],
};

// ── Suit SVG symbol inner paths (48×48 viewBox, stroke-only) ───────────────
function SuitPaths({ suit }: { suit: TarotSuit }) {
  switch (suit) {
    case 'wands':
      return (
        <>
          <line x1="24" y1="6" x2="24" y2="42" />
          <path d="M24 6 C20 9 18 14 21 15 C17 14 15 20 19 21 C15 22 17 30 24 28 C31 30 33 22 29 21 C33 20 31 14 27 15 C30 14 28 9 24 6" />
          <ellipse cx="24" cy="32" rx="4" ry="2.5" />
        </>
      );
    case 'cups':
      return (
        <>
          <path d="M14 8 C13 17 13 23 18 27 C20 29 22 30 24 30 C26 30 28 29 30 27 C35 23 35 17 34 8" />
          <line x1="14" y1="8" x2="34" y2="8" />
          <line x1="24" y1="30" x2="24" y2="40" />
          <line x1="17" y1="40" x2="31" y2="40" />
        </>
      );
    case 'swords':
      return (
        <>
          <line x1="24" y1="4" x2="24" y2="34" />
          <path d="M24 4 L20 12" />
          <path d="M24 4 L28 12" />
          <line x1="16" y1="34" x2="32" y2="34" />
          <path d="M22 34 L22 40 L26 40 L26 34" />
          <circle cx="24" cy="43" r="3" />
        </>
      );
    case 'pentacles':
      return (
        <>
          <circle cx="24" cy="24" r="17" />
          {/* Pentagram: connecting every-other vertex of a regular pentagon */}
          <path d="M24,7 L31,34 L13,20 L35,20 L17,34 Z" />
        </>
      );
  }
}

// ── Major Arcana SVG symbol inner paths (48×48 viewBox, stroke-only) ───────
function MajorArcanaPaths({ number }: { number: number }) {
  switch (number) {
    case 0: // The Fool — figure at cliff edge
      return (
        <>
          <circle cx="24" cy="9" r="5" />
          <line x1="4" y1="22" x2="44" y2="22" />
          <path d="M24 22 L22 34 L16 42" />
          <line x1="26" y1="20" x2="36" y2="13" />
          <circle cx="37" cy="12" r="2.5" />
        </>
      );
    case 1: // The Magician — lemniscate + wand
      return (
        <>
          <path d="M24 16 C24 10 13 10 13 16 C13 22 24 22 24 16 C24 10 35 10 35 16 C35 22 24 22 24 16" />
          <line x1="24" y1="22" x2="24" y2="44" />
          <line x1="8" y1="38" x2="40" y2="38" />
          <circle cx="12" cy="42" r="2" />
          <circle cx="28" cy="42" r="2" />
          <rect x="35" y="40" width="5" height="4" rx="0.5" />
          <circle cx="17" cy="42" r="2" />
        </>
      );
    case 2: // The High Priestess — two pillars + crescent
      return (
        <>
          <rect x="8" y="12" width="5" height="26" rx="1" />
          <rect x="35" y="12" width="5" height="26" rx="1" />
          {/* Crescent moon (two arcs meeting at endpoints) */}
          <path d="M21 14 C33 14 33 34 21 34 C27 34 27 14 21 14 Z" />
        </>
      );
    case 3: // The Empress — Venus symbol + wheat
      return (
        <>
          <circle cx="24" cy="18" r="10" />
          <line x1="24" y1="28" x2="24" y2="40" />
          <line x1="16" y1="35" x2="32" y2="35" />
          <path d="M14 44 Q24 39 34 44" />
          <path d="M17 46 Q24 42 31 46" />
        </>
      );
    case 4: // The Emperor — throne with ram horns
      return (
        <>
          <rect x="14" y="8" width="20" height="14" rx="2" />
          <path d="M14 12 C9 8 8 17 14 17" />
          <path d="M34 12 C39 8 40 17 34 17" />
          <rect x="10" y="22" width="28" height="6" rx="1" />
          <rect x="12" y="28" width="24" height="14" rx="1" />
        </>
      );
    case 5: // The Hierophant — triple crown + crossed keys
      return (
        <>
          <path d="M16 24 L16 14 L24 8 L32 14 L32 24" />
          <line x1="13" y1="18" x2="35" y2="18" />
          <line x1="11" y1="24" x2="37" y2="24" />
          <line x1="18" y1="28" x2="30" y2="42" />
          <line x1="30" y1="28" x2="18" y2="42" />
          <circle cx="18" cy="28" r="3" />
          <circle cx="30" cy="28" r="3" />
        </>
      );
    case 6: // The Lovers — two figures beneath angel arc
      return (
        <>
          <circle cx="16" cy="37" r="4" />
          <line x1="16" y1="33" x2="16" y2="26" />
          <circle cx="32" cy="37" r="4" />
          <line x1="32" y1="33" x2="32" y2="26" />
          <circle cx="24" cy="9" r="5" />
          <path d="M6 19 Q24 7 42 19" />
        </>
      );
    case 7: // The Chariot — crown above two opposing sphinxes
      return (
        <>
          <path d="M12 18 L12 10 L18 5 L24 10 L30 5 L36 10 L36 18" />
          <line x1="10" y1="18" x2="38" y2="18" />
          <path d="M8 42 L18 26 L26 42 Z" />
          <path d="M22 42 L30 26 L40 42 Z" />
          <line x1="6" y1="42" x2="42" y2="42" />
        </>
      );
    case 8: // Strength — embrace arc + open lion jaw
      return (
        <>
          <path d="M8 26 C8 12 40 12 40 26" />
          <path d="M12 28 C14 38 34 38 36 28" />
          <line x1="12" y1="28" x2="36" y2="28" />
          <line x1="16" y1="28" x2="16" y2="32" />
          <line x1="20" y1="28" x2="20" y2="33" />
          <line x1="24" y1="28" x2="24" y2="34" />
          <line x1="28" y1="28" x2="28" y2="33" />
          <line x1="32" y1="28" x2="32" y2="32" />
          <circle cx="24" cy="8" r="4" />
        </>
      );
    case 9: // The Hermit — robed figure with lantern aloft
      return (
        <>
          <circle cx="24" cy="13" r="5" />
          <path d="M20 18 L14 44 L34 44 L28 18 Z" />
          <line x1="33" y1="16" x2="37" y2="44" />
          <rect x="32" y="9" width="8" height="9" rx="1" />
          <line x1="36" y1="5" x2="36" y2="9" />
        </>
      );
    case 10: // Wheel of Fortune — wheel with 8 spokes + TARO letters
      return (
        <>
          <circle cx="24" cy="24" r="18" />
          <circle cx="24" cy="24" r="9" />
          <circle cx="24" cy="24" r="2" />
          <line x1="24" y1="6" x2="24" y2="15" />
          <line x1="24" y1="33" x2="24" y2="42" />
          <line x1="6" y1="24" x2="15" y2="24" />
          <line x1="33" y1="24" x2="42" y2="24" />
          <line x1="11.3" y1="11.3" x2="17.7" y2="17.7" />
          <line x1="30.3" y1="30.3" x2="36.7" y2="36.7" />
          <line x1="36.7" y1="11.3" x2="30.3" y2="17.7" />
          <line x1="11.3" y1="36.7" x2="17.7" y2="30.3" />
        </>
      );
    case 11: // Justice — balance scale + sword
      return (
        <>
          <line x1="24" y1="8" x2="24" y2="44" />
          <line x1="10" y1="18" x2="38" y2="18" />
          <line x1="10" y1="18" x2="8" y2="28" />
          <line x1="10" y1="18" x2="14" y2="28" />
          <path d="M8 28 C8 32 14 32 14 28" />
          <line x1="38" y1="18" x2="34" y2="28" />
          <line x1="38" y1="18" x2="42" y2="28" />
          <path d="M34 28 C34 32 42 32 42 28" />
          <line x1="34" y1="6" x2="34" y2="36" />
          <path d="M34 6 L31 13" />
          <path d="M34 6 L37 13" />
          <line x1="30" y1="34" x2="38" y2="34" />
        </>
      );
    case 12: // The Hanged Man — figure suspended from foot
      return (
        <>
          <line x1="8" y1="10" x2="40" y2="10" />
          <line x1="12" y1="6" x2="12" y2="16" />
          <line x1="36" y1="6" x2="36" y2="16" />
          <line x1="24" y1="10" x2="24" y2="18" />
          <path d="M19 18 L19 34 L29 34 L29 18" />
          <path d="M19 22 L13 18" />
          <circle cx="24" cy="40" r="5" />
        </>
      );
    case 13: // Death — scythe + horizon + rising sun
      return (
        <>
          <line x1="4" y1="34" x2="44" y2="34" />
          <path d="M12 34 C12 24 36 24 36 34" />
          <line x1="22" y1="8" x2="28" y2="44" />
          <path d="M22 8 C10 14 8 30 22 30" />
        </>
      );
    case 14: // Temperance — two cups with flowing arc
      return (
        <>
          <path d="M10 32 L12 22 L18 22 L20 32" />
          <line x1="10" y1="32" x2="20" y2="32" />
          <line x1="15" y1="32" x2="15" y2="38" />
          <line x1="12" y1="38" x2="18" y2="38" />
          <path d="M28 32 L30 22 L36 22 L38 32" />
          <line x1="28" y1="32" x2="38" y2="32" />
          <line x1="33" y1="32" x2="33" y2="38" />
          <line x1="30" y1="38" x2="36" y2="38" />
          <path d="M20 26 C22 12 26 12 28 26" />
        </>
      );
    case 15: // The Devil — inverted pentagram + chained figures
      return (
        <>
          {/* Inverted pentagram (single point down) */}
          <path d="M24 38 L15 11 L38 27 L10 27 L33 11 Z" />
          <circle cx="16" cy="42" r="3" />
          <line x1="16" y1="39" x2="16" y2="34" />
          <circle cx="32" cy="42" r="3" />
          <line x1="32" y1="39" x2="32" y2="34" />
          <path d="M16 36 L24 34 L32 36" />
          <circle cx="24" cy="32" r="2" />
        </>
      );
    case 16: // The Tower — tower + lightning + falling crown
      return (
        <>
          <rect x="16" y="14" width="16" height="28" rx="1" />
          <path d="M14 14 L16 8 L20 14 L24 8 L28 14 L32 8 L34 14" />
          <path d="M38 6 L30 20 L34 20 L26 38" />
          <path d="M6 8 L8 4 L10 8 L12 4 L14 8" />
        </>
      );
    case 17: // The Star — 8-pointed star + water below
      return (
        <>
          <line x1="24" y1="8" x2="24" y2="36" />
          <line x1="10" y1="22" x2="38" y2="22" />
          <line x1="14.5" y1="12.5" x2="33.5" y2="31.5" />
          <line x1="33.5" y1="12.5" x2="14.5" y2="31.5" />
          <circle cx="24" cy="22" r="4" />
          <path d="M14 40 Q24 36 34 40" />
          <path d="M12 44 Q24 40 36 44" />
        </>
      );
    case 18: // The Moon — full moon + two towers + wave
      return (
        <>
          <circle cx="24" cy="16" r="11" />
          <rect x="5" y="28" width="8" height="14" rx="1" />
          <rect x="35" y="28" width="8" height="14" rx="1" />
          <path d="M4 28 L5 23 L7 28 L9 23 L11 28" />
          <path d="M34 28 L35 23 L37 28 L39 23 L41 28" />
          <path d="M10 40 Q17 36 24 40 Q31 44 38 40" />
          <path d="M18 44 L16 40 L20 38" />
          <path d="M30 44 L32 40 L28 38" />
        </>
      );
    case 19: // The Sun — radiant sun + child on horse
      return (
        <>
          <circle cx="24" cy="18" r="9" />
          <line x1="24" y1="5" x2="24" y2="9" />
          <line x1="24" y1="27" x2="24" y2="31" />
          <line x1="11" y1="18" x2="15" y2="18" />
          <line x1="33" y1="18" x2="37" y2="18" />
          <line x1="13.5" y1="8.5" x2="16.5" y2="11.5" />
          <line x1="31.5" y1="24.5" x2="34.5" y2="27.5" />
          <line x1="34.5" y1="8.5" x2="31.5" y2="11.5" />
          <line x1="13.5" y1="27.5" x2="16.5" y2="24.5" />
          <circle cx="24" cy="37" r="3.5" />
          <path d="M20 40 C18 40 16 42 16 44 L32 44 C32 42 30 40 28 40 Z" />
        </>
      );
    case 20: // Judgement — trumpet + rising figures
      return (
        <>
          <path d="M16 6 L16 20 L28 24 L36 18 L26 14 L26 6 Z" />
          <path d="M36 18 C40 18 42 14 40 10" />
          <circle cx="12" cy="34" r="3" />
          <line x1="12" y1="31" x2="12" y2="26" />
          <circle cx="24" cy="32" r="3" />
          <line x1="24" y1="29" x2="24" y2="24" />
          <circle cx="36" cy="34" r="3" />
          <line x1="36" y1="31" x2="36" y2="26" />
          <path d="M6 44 L18 44 L18 40 L6 40" />
          <path d="M18 44 L30 44 L30 40 L18 40" />
          <path d="M30 44 L42 44 L42 40 L30 40" />
        </>
      );
    case 21: // The World — dancing figure in laurel wreath oval
      return (
        <>
          <ellipse cx="24" cy="24" rx="16" ry="20" />
          <ellipse cx="24" cy="24" rx="13" ry="17" />
          <circle cx="24" cy="14" r="3.5" />
          <line x1="24" y1="17.5" x2="24" y2="28" />
          <line x1="16" y1="22" x2="32" y2="22" />
          <path d="M24 28 L18 36" />
          <path d="M24 28 L30 36" />
        </>
      );
    default:
      return null;
  }
}

// ── Suit pip mini-symbol (small version for pip cards) ─────────────────────
function PipSymbol({ suit, sizePx }: { suit: TarotSuit; sizePx: number }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={sizePx}
      height={sizePx}
      fill="none"
      stroke="#c9a84c"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <SuitPaths suit={suit} />
    </svg>
  );
}

// ── Card face ──────────────────────────────────────────────────────────────
interface CardFaceProps {
  card: TarotCardData;
  imageUrl?: string;
  glowing?: boolean;
  sizePx: { w: number; h: number };
}

function CardFace({ card, imageUrl, glowing, sizePx }: CardFaceProps) {
  const isMajor = card.arcana === 'major';
  const isCourtCard = !isMajor && card.number >= 11;
  const isHighPipCard = !isMajor && card.number >= 8 && card.number <= 10;
  const elementTint = card.element ? ELEMENT_TINT[card.element] : undefined;

  const pipSymbolPx = Math.round(sizePx.w * 0.22);
  const largeSuitPx = Math.round(sizePx.w * 0.48);
  const majorSymbolPx = Math.round(sizePx.w * 0.55);

  const cardNameStyle: React.CSSProperties = {
    fontFamily: "'Cormorant Garamond', 'Cormorant', Georgia, serif",
    fontVariant: 'small-caps',
    fontSize: '11px',
    letterSpacing: '0.12em',
    color: '#c9a84c',
    fontWeight: 400,
    textAlign: 'center',
    lineHeight: 1,
  };

  const silverTextStyle: React.CSSProperties = {
    fontFamily: "'Cormorant Garamond', 'Cormorant', Georgia, serif",
    fontSize: '10px',
    fontStyle: 'italic',
    fontWeight: 300,
    color: '#b8b8c0',
    lineHeight: 1,
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: `radial-gradient(ellipse at 50% 50%, #f5f0e8 60%, #e8e0d0 100%)${elementTint ? `, ${elementTint}` : ''}`,
        border: '1px solid rgba(201,168,76,0.4)',
        borderRadius: '12px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 4px',
        boxSizing: 'border-box',
      }}
      role="img"
    >
      {/* Corner vignette */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 55%, rgba(120,100,60,0.12) 100%)',
          borderRadius: 'inherit',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Reveal glow overlay */}
      {glowing && <div className="card-face-glow" aria-hidden="true" />}

      {/* ── Top label ── */}
      <div style={{ ...silverTextStyle, alignSelf: 'flex-start', paddingLeft: '4px', zIndex: 1 }}>
        {isMajor
          ? card.number === 0 ? null : ROMAN[card.number]
          : isCourtCard
          ? <span style={{ fontSize: '9px' }}>{COURT[card.number]}</span>
          : card.number
        }
      </div>

      {/* ── Main visual area ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={card.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
          />
        ) : isMajor ? (
          // Major Arcana: distinctive SVG symbol
          <svg
            viewBox="0 0 48 48"
            width={majorSymbolPx}
            height={majorSymbolPx}
            fill="none"
            stroke="#c9a84c"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <MajorArcanaPaths number={card.number} />
          </svg>
        ) : isCourtCard || isHighPipCard ? (
          // Court cards (11–14) and 8–10: one large suit symbol
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            {isCourtCard && (
              <span style={{ ...silverTextStyle, fontSize: '9px' }}>{COURT[card.number]}</span>
            )}
            <PipSymbol suit={card.suit!} sizePx={largeSuitPx} />
            {isHighPipCard && (
              <span style={{ ...silverTextStyle, fontSize: '10px' }}>{card.number}</span>
            )}
          </div>
        ) : (
          // Pip cards 1–7: arranged pip grid
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
            }}
          >
            {(PIP_POS[card.number] ?? [[50, 50]]).map(([x, y], i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <PipSymbol suit={card.suit!} sizePx={pipSymbolPx} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Card name ── */}
      <div style={{ ...cardNameStyle, zIndex: 1, paddingBottom: '2px' }}>
        {card.name}
      </div>
    </div>
  );
}

// ── Main exported component ────────────────────────────────────────────────
export function TarotCard({
  card,
  face,
  reversed = false,
  imageUrl,
  size = 'md',
  glowOnReveal = false,
  onClick,
  className = '',
  'aria-label': ariaLabel,
}: TarotCardProps) {
  const defaultAriaLabel = face === 'down'
    ? 'Face-down tarot card'
    : `${card.name}${reversed ? ', reversed' : ''}`;

  const SIZE_PX = { sm: { w: 80, h: 140 }, md: { w: 120, h: 210 }, lg: { w: 160, h: 280 } };
  const sizePx = SIZE_PX[size];

  return (
    <div
      className={`tarot-card-wrapper tarot-card-${size} ${className}`}
      data-reversed={face === 'up' && reversed ? 'true' : 'false'}
      role="img"
      aria-label={ariaLabel ?? defaultAriaLabel}
      aria-live={face === 'down' ? 'polite' : undefined}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {face === 'down' ? (
        <CardBack
          interactive={!!onClick}
          onClick={onClick ? () => {} : undefined}
        />
      ) : (
        <CardFace
          card={card}
          imageUrl={imageUrl}
          glowing={glowOnReveal}
          sizePx={sizePx}
        />
      )}
    </div>
  );
}
