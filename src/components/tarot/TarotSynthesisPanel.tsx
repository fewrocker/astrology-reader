import { useEffect, useRef } from 'react'
import type { SynthesisChapter } from './types'

interface TarotSynthesisPanelProps {
  chapters: SynthesisChapter[]
  chaptersDisplayed: number   // how many chapters are currently visible
  loadingMessage?: string     // shown while chapters are loading
  onChapterDisplayed?: (n: number) => void
}

export default function TarotSynthesisPanel({
  chapters,
  chaptersDisplayed,
  loadingMessage,
}: TarotSynthesisPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to newly-revealed chapter
  useEffect(() => {
    if (!panelRef.current || chaptersDisplayed === 0) return
    const chapterEls = panelRef.current.querySelectorAll<HTMLElement>('[data-chapter]')
    const latest = chapterEls[chaptersDisplayed - 1]
    if (latest) latest.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [chaptersDisplayed])

  const visibleChapters = chapters.slice(0, chaptersDisplayed)

  return (
    <div ref={panelRef} style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {/* Loading skeleton */}
      {loadingMessage && chaptersDisplayed === 0 && (
        <p
          className="font-heading"
          style={{
            color: 'rgba(201,168,76,0.55)',
            fontSize: '1.05rem',
            fontStyle: 'italic',
            textAlign: 'center',
            padding: '2rem 0',
            animation: 'tarot-fade-in 0.5s ease-in',
          }}
        >
          {loadingMessage}
        </p>
      )}

      {visibleChapters.map((chapter, i) => (
        <div key={i} data-chapter={i}>
          {/* Gold divider between chapters */}
          {i > 0 && (
            <div
              aria-hidden="true"
              style={{
                height: '1px',
                background: 'rgba(201,168,76,0.2)',
                margin: '1.5rem 0',
              }}
            />
          )}

          <div
            style={{
              animation: 'tarot-fade-in 0.5s ease-in',
              opacity: 1,
            }}
          >
            <h3
              className="font-heading"
              style={{
                color: '#c9a84c',
                fontSize: '1rem',
                fontWeight: 600,
                marginBottom: '0.6rem',
                letterSpacing: '0.03em',
              }}
            >
              {chapter.heading}
            </h3>
            <div
              style={{
                color: 'rgba(232,230,227,0.82)',
                fontSize: '0.92rem',
                lineHeight: 1.75,
                whiteSpace: 'pre-wrap',
              }}
            >
              {chapter.body.split('\n').map((line, li) => (
                line.startsWith('·') ? (
                  <p
                    key={li}
                    style={{
                      paddingLeft: '1rem',
                      color: 'rgba(201,168,76,0.75)',
                      marginTop: '0.4rem',
                      fontSize: '0.9rem',
                      fontStyle: 'italic',
                    }}
                  >
                    {line}
                  </p>
                ) : (
                  <p key={li} style={{ marginTop: li > 0 ? '0.5rem' : 0 }}>{line}</p>
                )
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
