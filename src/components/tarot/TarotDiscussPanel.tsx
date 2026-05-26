import { useState, useRef, useEffect } from 'react'
import { getTarotDiscussResponse } from '../../services/gptInterpretation'
import type { ChatMessage } from '../../services/gptInterpretation'

interface TarotDiscussPanelProps {
  isOpen: boolean
  onClose: () => void
  contextString: string
  userIntention?: string | null
}

export default function TarotDiscussPanel({ isOpen, onClose, contextString, userIntention }: TarotDiscussPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60)
    }
  }, [isOpen])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    const userMsg: ChatMessage = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const response = await getTarotDiscussResponse(contextString, [...messages, userMsg], userIntention)
      setMessages(prev => [...prev, { role: 'assistant', content: response }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'The sky is briefly unavailable. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Discuss your reading"
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          height: '70vh',
          background: 'linear-gradient(160deg, #16100a 0%, #0a0818 100%)',
          border: '1px solid rgba(201,168,76,0.25)',
          borderBottom: 'none',
          borderRadius: '16px 16px 0 0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.25rem 0.75rem',
          borderBottom: '1px solid rgba(201,168,76,0.12)',
        }}>
          <span className="font-heading" style={{ color: '#c9a84c', fontSize: '1rem' }}>
            Discuss ✦
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close discussion"
            style={{ color: 'rgba(201,168,76,0.4)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {messages.length === 0 && (
            <p style={{ color: 'rgba(201,168,76,0.45)', fontSize: '0.875rem', fontStyle: 'italic', textAlign: 'center', marginTop: '2rem' }}>
              Ask anything about your reading.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                background: m.role === 'user' ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${m.role === 'user' ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '10px',
                padding: '0.6rem 0.875rem',
                fontSize: '0.875rem',
                color: 'rgba(232,230,227,0.9)',
                lineHeight: 1.6,
              }}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: 'flex-start', color: 'rgba(201,168,76,0.5)', fontSize: '0.875rem', fontStyle: 'italic' }}>
              reading the sky…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '0.75rem 1.25rem 1rem', borderTop: '1px solid rgba(201,168,76,0.12)', display: 'flex', gap: '0.5rem' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
            placeholder="Ask about your reading…"
            rows={2}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(201,168,76,0.2)',
              borderRadius: '8px',
              color: '#e8e6e3',
              fontSize: '0.875rem',
              padding: '0.6rem 0.75rem',
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={!input.trim() || loading}
            style={{
              alignSelf: 'flex-end',
              background: input.trim() && !loading ? '#c9a84c' : 'rgba(201,168,76,0.2)',
              color: input.trim() && !loading ? '#0f0b05' : 'rgba(201,168,76,0.4)',
              border: 'none',
              borderRadius: '8px',
              padding: '0.6rem 1rem',
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              fontSize: '0.875rem',
              fontFamily: 'inherit',
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
