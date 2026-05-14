import { useState, type ReactNode } from 'react'

interface CollapsibleSectionProps {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}

export default function CollapsibleSection({ title, children, defaultOpen = false }: CollapsibleSectionProps) {
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
