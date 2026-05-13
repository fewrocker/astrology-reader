import { useState, useRef, useEffect, useMemo } from 'react'
import { getNumerologyDiscussResponse, type ChatMessage } from '../../services/gptInterpretation'

interface NumerologyDiscussModalProps {
  open: boolean
  onClose: () => void
  context: string
  chips: string[]
}

export default function NumerologyDiscussModal({ open, onClose, context, chips }: NumerologyDiscussModalProps) {
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

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

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
      const reply = await getNumerologyDiscussResponse(context, newMessages)
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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl bg-mystic-bg border border-mystic-gold/30 rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-mystic-gold/20">
          <div>
            <h3 className="font-heading text-xl text-mystic-gold">Discuss Your Numerology Reading</h3>
            <p className="text-mystic-muted text-xs mt-0.5">Ask anything about your numbers and their meaning</p>
          </div>
          <button
            onClick={onClose}
            className="text-mystic-muted hover:text-mystic-text transition-colors text-2xl leading-none p-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-[300px]">
          {messages.length === 0 && (
            <div className="text-center py-10">
              <div className="discuss-oracle-container mx-auto mb-6">
                <div className="discuss-orbit-ring">
                  <div className="discuss-orbit-dot" style={{ animationDelay: '0s' }}>✦</div>
                  <div className="discuss-orbit-dot" style={{ animationDelay: '-2s' }}>7</div>
                  <div className="discuss-orbit-dot" style={{ animationDelay: '-4s' }}>✧</div>
                </div>
                <div className="discuss-oracle-core">∞</div>
              </div>
              <p className="font-heading text-mystic-gold/80 text-base mb-1">Your Numbers Hold Answers</p>
              <p className="text-mystic-muted text-sm max-w-md mx-auto">
                Ask how your numerological profile shapes your life, relationships, and path forward.
              </p>
              {chips.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2 justify-center">
                  {chips.map(chip => (
                    <SuggestionChip key={chip} text={chip} onClick={setInput} />
                  ))}
                </div>
              )}
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

        <div className="px-6 py-4 border-t border-mystic-gold/20">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your numbers..."
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

function RevealText({ text }: { text: string }) {
  const words = useMemo(() => text.split(/(\s+)/), [text])
  const [count, setCount] = useState(0)

  useEffect(() => {
    setCount(0)
    let i = 0
    const id = setInterval(() => {
      i += 2
      if (i >= words.length) { setCount(words.length); clearInterval(id) }
      else setCount(i)
    }, 30)
    return () => clearInterval(id)
  }, [words])

  const revealed = words.slice(0, count).join('')

  return (
    <div>
      {revealed.split('\n').map((line, j) => (
        <p key={j} className={j > 0 ? 'mt-2' : ''}>{line}</p>
      ))}
    </div>
  )
}
