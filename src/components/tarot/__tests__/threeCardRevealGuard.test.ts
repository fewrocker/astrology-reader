import { describe, it, expect, vi } from 'vitest'

// Regression test for: three-card tap guard stale closure bug.
// After placementComplete transitions true, activeCardIndex becomes 0. The old
// handleCardTap closure captured activeCardIndex===null and silently dropped the
// first tap. The fix stores activeCardIndex in a ref updated each render so the
// handler always reads the current value.

describe('three-card reveal guard — ref vs closure staleness', () => {
  it('stale closure blocks the first tap (demonstrates the bug)', () => {
    // Old pattern: activeCardIndex is captured in closure and becomes stale
    const activeCardIndex = null // stale value from before placementComplete
    const handleCardTap = (index: number) => {
      if (index !== activeCardIndex) return 'blocked'
      return 'processed'
    }
    // Card 0 tap is silently dropped — user is stuck
    expect(handleCardTap(0)).toBe('blocked')
  })

  it('ref pattern processes tap(0) when activeCardIndexRef.current is 0', () => {
    const activeCardIndexRef = { current: null as number | null }
    // Simulate render after placementComplete: ref updated synchronously
    activeCardIndexRef.current = 0

    const revealedMask = [false, false, false]
    let phase = 'idle'
    const triggerRevealOverlay = vi.fn()
    const setRevealedMask = (fn: (m: boolean[]) => boolean[]) => {
      const next = fn(revealedMask)
      next.forEach((v, i) => { revealedMask[i] = v })
    }
    const setPhase = (p: string) => { phase = p }

    const handleCardTap = (index: number) => {
      if (index !== activeCardIndexRef.current) return
      triggerRevealOverlay()
      setRevealedMask(m => m.map((v, j) => (j === index ? true : v)))
      if (index === 0) setPhase('card-revealed-0')
      else if (index === 1) setPhase('card-revealed-1')
      else setPhase('card-revealed-2')
    }

    handleCardTap(0)

    expect(triggerRevealOverlay).toHaveBeenCalledOnce()
    expect(revealedMask[0]).toBe(true)
    expect(phase).toBe('card-revealed-0')
  })

  it('ref pattern still blocks taps on non-active cards', () => {
    const activeCardIndexRef = { current: 0 as number | null }
    const triggerRevealOverlay = vi.fn()

    const handleCardTap = (index: number) => {
      if (index !== activeCardIndexRef.current) return
      triggerRevealOverlay()
    }

    handleCardTap(1) // wrong card
    handleCardTap(2) // wrong card
    expect(triggerRevealOverlay).not.toHaveBeenCalled()

    handleCardTap(0) // correct card
    expect(triggerRevealOverlay).toHaveBeenCalledOnce()
  })

  it('ref advances correctly through all three reveals', () => {
    const activeCardIndexRef = { current: null as number | null }
    const revealedMask = [false, false, false]
    const phases: string[] = []
    const triggerRevealOverlay = vi.fn()

    const setRevealedMask = (fn: (m: boolean[]) => boolean[]) => {
      const next = fn(revealedMask)
      next.forEach((v, i) => { revealedMask[i] = v })
    }

    const handleCardTap = (index: number) => {
      if (index !== activeCardIndexRef.current) return
      triggerRevealOverlay()
      setRevealedMask(m => m.map((v, j) => (j === index ? true : v)))
      if (index === 0) phases.push('card-revealed-0')
      else if (index === 1) phases.push('card-revealed-1')
      else phases.push('card-revealed-2')
      // Simulate next render: activeRevealIndex = revealedCount
      const next = revealedMask.filter(Boolean).length
      activeCardIndexRef.current = next < 3 ? next : null
    }

    // All three placements complete — ref set to 0
    activeCardIndexRef.current = 0

    handleCardTap(0)
    expect(revealedMask[0]).toBe(true)
    expect(phases).toEqual(['card-revealed-0'])

    handleCardTap(1)
    expect(revealedMask[1]).toBe(true)
    expect(phases).toEqual(['card-revealed-0', 'card-revealed-1'])

    handleCardTap(2)
    expect(revealedMask[2]).toBe(true)
    expect(phases).toEqual(['card-revealed-0', 'card-revealed-1', 'card-revealed-2'])

    expect(activeCardIndexRef.current).toBeNull()
  })
})
