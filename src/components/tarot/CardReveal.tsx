import React, { useEffect, useRef } from 'react';
import type { TarotCard } from '../../data/tarot/types';
import { TarotCard as TarotCardComponent } from './TarotCard';
import { CardBack } from './CardBack';
import './tarot.css';

export interface CardRevealProps {
  card: TarotCard;
  reversed?: boolean;
  revealed: boolean;
  imageUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  onRevealComplete?: () => void;
  delayMs?: number;
  'aria-label'?: string;
}

export function CardReveal({
  card,
  reversed = false,
  revealed,
  imageUrl,
  size = 'md',
  onRevealComplete,
  delayMs = 0,
  'aria-label': ariaLabel,
}: CardRevealProps) {
  const flipperRef = useRef<HTMLDivElement>(null);
  const didRevealRef = useRef(false);

  // Fire onRevealComplete when the flip transition ends
  useEffect(() => {
    const el = flipperRef.current;
    if (!el || !onRevealComplete) return;

    const handleTransitionEnd = (e: TransitionEvent) => {
      if (e.propertyName === 'transform' && revealed) {
        onRevealComplete();
      }
    };
    el.addEventListener('transitionend', handleTransitionEnd);
    return () => el.removeEventListener('transitionend', handleTransitionEnd);
  }, [revealed, onRevealComplete]);

  // Track first reveal for glow effect
  const isFirstReveal = revealed && !didRevealRef.current;
  if (revealed) didRevealRef.current = true;

  const revealedAttr = revealed ? 'true' : 'false';

  // Apply delayMs via CSS transition-delay on the flipper
  const flipperStyle: React.CSSProperties = delayMs > 0 && !revealed
    ? { transitionDelay: `${delayMs}ms` }
    : {};

  return (
    <div
      className={`card-reveal-scene tarot-card-${size}`}
      aria-live="polite"
      aria-label={ariaLabel ?? (revealed ? `${card.name}${reversed ? ', reversed' : ''}` : 'Face-down tarot card')}
    >
      <div
        ref={flipperRef}
        className="card-reveal-flipper"
        data-revealed={revealedAttr}
        style={flipperStyle}
      >
        {revealed ? (
          <div className="card-reveal-front is-visible">
            <TarotCardComponent
              card={card}
              face="up"
              reversed={reversed}
              imageUrl={imageUrl}
              size={size}
              glowOnReveal={isFirstReveal}
            />
          </div>
        ) : (
          <div className="card-reveal-back is-visible">
            <CardBack
              aria-label="Face-down tarot card"
            />
          </div>
        )}
      </div>
    </div>
  );
}
