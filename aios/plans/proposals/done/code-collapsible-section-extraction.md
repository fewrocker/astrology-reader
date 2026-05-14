**Type:** Code Enhancement
**Originated by:** Carmack
**User guidance:** (none — sprint vision overrides)

## Problem / Opportunity

`SynastryPage.tsx` (lines 16–30) and `SynastryTransitPage.tsx` (lines 17–31) each define a local `Section` function component that is byte-for-byte identical. Both copies share the same props signature, the same class names, and the same inline style for the chevron rotation:

```tsx
function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
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
```

The duplication is maintenance debt: any future change to the accordion's visual behavior — animation, accessibility attributes, keyboard handling, chevron icon — must be made twice, and there is no mechanism to ensure both copies stay in sync. Sprint 0011 will have both files open simultaneously for the aspect row wiring tasks, making this the natural moment to eliminate the duplication.

The only shared UI component in `src/components/ui/` is `GptSkeleton.tsx`. The naming convention is PascalCase single-responsibility component files. There is no existing collapsible/accordion primitive in the directory.

## Desired State

A new file `src/components/ui/CollapsibleSection.tsx` exports the extracted component as the default export under the name `CollapsibleSection`. The props interface is unchanged from both current copies:

```tsx
interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}
```

The implementation is a direct lift of the existing duplicated body — no logic changes, no style changes, no prop additions. The component name changes from `Section` (module-local) to `CollapsibleSection` (exported, globally unambiguous).

Both import sites are updated:

- `src/components/results/SynastryPage.tsx`: remove the local `Section` function (lines 16–30), add `import CollapsibleSection from '../ui/CollapsibleSection'`, rename all JSX call sites (`<Section` → `<CollapsibleSection`, `</Section>` → `</CollapsibleSection>`). Call sites: `SynastryAspectsSection` (line 129), `HouseOverlaySection` (line 162), `CompositeSection` (line 193), `IndividualChartSection` (line 240).
- `src/components/results/SynastryTransitPage.tsx`: remove the local `Section` function (lines 17–31), add `import CollapsibleSection from '../ui/CollapsibleSection'`, rename all JSX call sites. Call sites: `TransitAspectsToComposite` (line 40), `CurrentPlanetsTable` (line 70).

Zero behavioral change. The rendered HTML, class names, and open/close logic are identical to what both files produce today. TypeScript compilation and existing snapshot tests must pass without modification.
