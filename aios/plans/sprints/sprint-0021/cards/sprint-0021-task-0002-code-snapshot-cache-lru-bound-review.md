---
# Code Review — Sprint-0021 Task-0002: Snapshot Cache LRU Bounding

**Reviewer:** Claude Sonnet 4.6
**Date:** 2026-05-17
**Branch:** sprint-0021-task-0002-code-snapshot-cache-lru-bound

---

## Checklist

### LruMap class (`src/utils/lruMap.ts`)

- **Extends Map:** PASS — `export class LruMap<K, V> extends Map<K, V>` exactly matches the spec.
- **Enforces capacity:** PASS — `this.size >= this.capacity` guard is evaluated before each new insertion.
- **Moves accessed key to MRU on set:** PASS — `if (this.has(key)) this.delete(key)` re-inserts the key at the tail (MRU position) before calling `super.set`, matching the specified behavior.
- **Evicts LRU on overflow:** PASS — `this.keys().next().value as K` correctly targets the head of the insertion-order Map (the oldest / least-recently-used entry) and deletes it before inserting the new entry.
- **No external dependencies:** PASS — the file contains only a single class declaration with no imports.
- **Implementation matches spec verbatim:** PASS — the eight lines are identical to the suggested shape in the card.

### `AdvanceTab.tsx`

- **Import present:** PASS — line 15: `import { LruMap } from '../../utils/lruMap'`
- **useRef changed to LruMap(6):** PASS — line 1285: `const snapshotCache = useRef<LruMap<string, AdvanceSnapshot[]>>(new LruMap(6))`
- **Import path correct:** PASS — `src/components/reading/` + `../../utils/lruMap` resolves to `src/utils/lruMap`.

### `CoupleAdvanceTab.tsx`

- **Import present:** PASS — line 14: `import { LruMap } from '../../utils/lruMap'`
- **useRef changed to LruMap(6):** PASS — line 848: `const snapshotCache = useRef<LruMap<string, AdvanceSnapshot[]>>(new LruMap(6))`
- **Import path correct:** PASS — `src/components/reading/` + `../../utils/lruMap` resolves to `src/utils/lruMap`.

### `SolarReturnPage.tsx`

- **Import present:** PASS — line 14: `import { LruMap } from '../../utils/lruMap'`
- **useRef changed to LruMap(6):** PASS — line 44: `const snapshotCache = useRef<LruMap<string, AdvanceSnapshot[]>>(new LruMap(6))`
- **Import path correct:** PASS — `src/components/results/` + `../../utils/lruMap` resolves to `src/utils/lruMap`.

### `TransitReadingPage.tsx`

- **Import present:** PASS — line 24: `import { LruMap } from '../../utils/lruMap'`
- **useRef changed to LruMap(6):** PASS — line 244: `const snapshotCache = useRef<LruMap<string, AdvanceSnapshot[]>>(new LruMap(6))`
- **Import path correct:** PASS — `src/components/results/` + `../../utils/lruMap` resolves to `src/utils/lruMap`.

### Call-site integrity

- **No .get/.has call sites modified:** PASS — all eight `.get` and `.has` calls across the four files are untouched; they remain on the `snapshotCache.current` ref and require no changes because `LruMap` fully extends `Map`.
- **No .set call sites other than useRef initialization modified:** PASS — all four `snapshotCache.current.set(cacheKey, ...)` calls at the cache-population sites are unchanged in structure and argument signatures. The only change to `.set` behavior is the LruMap override, which is transparent to callers.

---

## Overall Verdict: APPROVED

All checklist items pass. The implementation is a clean, minimal solution: the `LruMap` class is an exact match of the spec, all four cache sites are correctly updated with the right type parameter and cap of 6, all imports resolve correctly, and no call sites other than the `useRef` initializations were touched. No blocking issues found.
