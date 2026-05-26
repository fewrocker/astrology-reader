import React from 'react';
import './tarot.css';

interface CardBackProps {
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  tabIndex?: number;
  'aria-label'?: string;
  'aria-pressed'?: boolean;
}

export function CardBack({
  className = '',
  interactive = false,
  onClick,
  onKeyDown,
  tabIndex,
  'aria-label': ariaLabel = 'Face-down tarot card',
  'aria-pressed': ariaPressed,
}: CardBackProps) {
  return (
    <div
      className={`card-face-down ${className}`}
      role={interactive ? 'button' : 'img'}
      aria-label={ariaLabel}
      aria-pressed={interactive ? ariaPressed : undefined}
      onClick={onClick}
      onKeyDown={onKeyDown}
      tabIndex={tabIndex}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#1a1040',
        border: '1px solid rgba(201, 168, 76, 0.35)',
        borderRadius: '12px',
        overflow: 'hidden',
        pointerEvents: interactive ? 'auto' : 'none',
      }}
    >
      {/* Inset gold frame */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '8px',
          border: '1px solid rgba(201, 168, 76, 0.15)',
          borderRadius: '7px',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Star pattern + diagonal structural lines */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      >
        {/* Structural lines from star points to inset-frame corners */}
        <line x1="50" y1="22" x2="17" y2="17" stroke="rgba(201,168,76,0.08)" strokeWidth="0.5" />
        <line x1="50" y1="22" x2="83" y2="17" stroke="rgba(201,168,76,0.08)" strokeWidth="0.5" />
        <line x1="50" y1="78" x2="17" y2="83" stroke="rgba(201,168,76,0.08)" strokeWidth="0.5" />
        <line x1="50" y1="78" x2="83" y2="83" stroke="rgba(201,168,76,0.08)" strokeWidth="0.5" />
        <line x1="22" y1="50" x2="17" y2="17" stroke="rgba(201,168,76,0.08)" strokeWidth="0.5" />
        <line x1="78" y1="50" x2="83" y2="17" stroke="rgba(201,168,76,0.08)" strokeWidth="0.5" />
        <line x1="22" y1="50" x2="17" y2="83" stroke="rgba(201,168,76,0.08)" strokeWidth="0.5" />
        <line x1="78" y1="50" x2="83" y2="83" stroke="rgba(201,168,76,0.08)" strokeWidth="0.5" />

        {/* Eight-pointed star — 4 crossing lines */}
        <line x1="50" y1="22" x2="50" y2="78" stroke="rgba(201,168,76,0.25)" strokeWidth="0.8" />
        <line x1="22" y1="50" x2="78" y2="50" stroke="rgba(201,168,76,0.25)" strokeWidth="0.8" />
        <line x1="30" y1="30" x2="70" y2="70" stroke="rgba(201,168,76,0.25)" strokeWidth="0.8" />
        <line x1="70" y1="30" x2="30" y2="70" stroke="rgba(201,168,76,0.25)" strokeWidth="0.8" />

        {/* Star point diamonds */}
        <path
          d="M50,22 L53,38 L50,50 L47,38 Z"
          fill="rgba(201,168,76,0.10)"
          stroke="rgba(201,168,76,0.18)"
          strokeWidth="0.4"
        />
        <path
          d="M50,78 L53,62 L50,50 L47,62 Z"
          fill="rgba(201,168,76,0.10)"
          stroke="rgba(201,168,76,0.18)"
          strokeWidth="0.4"
        />
        <path
          d="M22,50 L38,47 L50,50 L38,53 Z"
          fill="rgba(201,168,76,0.10)"
          stroke="rgba(201,168,76,0.18)"
          strokeWidth="0.4"
        />
        <path
          d="M78,50 L62,47 L50,50 L62,53 Z"
          fill="rgba(201,168,76,0.10)"
          stroke="rgba(201,168,76,0.18)"
          strokeWidth="0.4"
        />
        <path
          d="M30,30 L42,42 L50,50 L42,42 Z"
          fill="rgba(201,168,76,0.10)"
          stroke="rgba(201,168,76,0.18)"
          strokeWidth="0.4"
        />
        <path
          d="M70,30 L58,42 L50,50 L58,42 Z"
          fill="rgba(201,168,76,0.10)"
          stroke="rgba(201,168,76,0.18)"
          strokeWidth="0.4"
        />
        <path
          d="M70,70 L58,58 L50,50 L58,58 Z"
          fill="rgba(201,168,76,0.10)"
          stroke="rgba(201,168,76,0.18)"
          strokeWidth="0.4"
        />
        <path
          d="M30,70 L42,58 L50,50 L42,58 Z"
          fill="rgba(201,168,76,0.10)"
          stroke="rgba(201,168,76,0.18)"
          strokeWidth="0.4"
        />

        {/* Center hub */}
        <circle cx="50" cy="50" r="3" fill="none" stroke="rgba(201,168,76,0.2)" strokeWidth="0.8" />
      </svg>
    </div>
  );
}
