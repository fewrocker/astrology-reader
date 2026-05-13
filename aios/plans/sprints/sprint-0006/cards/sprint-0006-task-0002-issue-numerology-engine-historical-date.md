# issue-numerology-engine-historical-date

**Type:** Issue Fix  
**Originated by:** Carmack, Taleb  
**User guidance:** Every feature and design has to be beautiful and follow the majestic designs that are currently on the app — and every feature that accumulates user data over time must produce data that is correct, not merely plausible.

## Problem

Three functions in `/projects/astrology-reader/src/engine/numerology.ts` hardcode `new Date()` internally, making it impossible to compute numerological values for any date other than today.

**`calculatePersonalDay` — lines 69–80**

Current signature:
```ts
export function calculatePersonalDay(birthDate: string): number {
```

At line 74, the function ignores the concept of a target date entirely:
```ts
const now = new Date()
const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
```

No matter what `birthDate` is passed, `now` is always the current system time. A call made on 2026-05-13 for a journal entry dated 2025-11-03 returns the personal day for 2026-05-13, not for 2025-11-03.

**`calculatePersonalYear` — lines 32–38**

Current signature:
```ts
export function calculatePersonalYear(birthDate: string, currentYear?: number): number {
  const year = currentYear ?? new Date().getFullYear()
```

The year can be overridden, but there is no way to derive it from a `Date` object atomically. A caller must manually extract `.getFullYear()` — and it is easy to pass an inconsistent year while `calculatePersonalMonth` still picks up the wrong month from its own `new Date()` call.

**`calculatePersonalMonth` — lines 61–64**

Current signature:
```ts
export function calculatePersonalMonth(personalYear: number, currentMonth?: number): number {
  const month = currentMonth ?? (new Date().getMonth() + 1)
```

Same pattern: month defaults to the current system month with no `Date`-driven override.

**`calculateNumerology` — lines 93–109**

The aggregate function calls all three with no date argument:
```ts
const personalYear = calculatePersonalYear(birthDate)
// ...
personalMonth: calculatePersonalMonth(personalYear),
personalDay: calculatePersonalDay(birthDate),
```

Every caller of `calculateNumerology` for a historical date receives today's personal cycle numbers instead of those for the target date.

**Call sites that are already affected:**

- `/projects/astrology-reader/src/components/reading/DailySnapshotCard.tsx`, line 91:
  ```ts
  const personalDay = birthDate ? calculatePersonalDay(birthDate) : null
  ```
  This component always renders for the current day, so the bug is latent here — it produces correct output today but would break if the component were ever passed a historical date.

- `/projects/astrology-reader/src/components/reading/TodayPage.tsx`, line 75:
  ```ts
  const personalDayNum = calculatePersonalDay(birthDate)
  ```
  Also currently used only for "today," so the bug is latent. The Cosmic Journal's entry composer is the first context where historical dates will be passed — and both files serve as the natural template for how journal entry display code will be written.

**Why this is a silent data-integrity bug:**

When the Cosmic Journal feature stores a `JournalEntry` with a `numerologicalDay` field, it will call `calculatePersonalDay(birthDate)` (or `calculateNumerology(birthDate)`) with the birth date — but there is no parameter to pass the entry's date. The function silently returns today's number. The stored entry looks correct; there is no error, no warning, no type-system signal. Once written to localStorage, there is no recovery path: the wrong number is stored with no metadata indicating it was computed from the wrong date. A schema migration cannot fix entries that carry no record of when they were created versus when their numerological annotation was computed.

The same problem applies to `calculatePersonalYear` and `calculatePersonalMonth`: a retrospective reading for December 2023 will show the 2026 personal year and month numbers, not the 2023 ones.

## Expected Behavior

All three functions should accept an optional `targetDate: Date` parameter. When provided, the function computes for that date. When omitted, it defaults to `new Date()`, preserving all existing call-site behavior with no breaking changes.

**`calculatePersonalDay` — target signature:**
```ts
export function calculatePersonalDay(birthDate: string, targetDate?: Date): number {
  const [, birthMonthStr, birthDayStr] = birthDate.split('-')
  const birthMonth = parseInt(birthMonthStr, 10)
  const birthDay = parseInt(birthDayStr, 10)

  const now = targetDate ?? new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const universalDaySum = dateStr.split('').reduce((acc, d) => acc + Number(d), 0)
  const universalDay = reduceToSingleDigit(universalDaySum)

  return reduceToSingleDigit(birthMonth + birthDay + universalDay)
}
```

**`calculatePersonalYear` — target signature:**
```ts
export function calculatePersonalYear(birthDate: string, targetDate?: Date): number {
  const year = targetDate ? targetDate.getFullYear() : new Date().getFullYear()
  const [, month, day] = birthDate.split('-')
  const digits = `${month}${day}${year}`.split('').map(Number)
  const sum = digits.reduce((acc, d) => acc + d, 0)
  return reduceToSingleDigit(sum)
}
```

Note: the existing optional `currentYear?: number` parameter should be replaced with `targetDate?: Date` so all three functions use a consistent interface. If the raw year override is needed elsewhere it can be derived from a `Date` at the call site.

**`calculatePersonalMonth` — target signature:**
```ts
export function calculatePersonalMonth(personalYear: number, targetDate?: Date): number {
  const month = targetDate ? (targetDate.getMonth() + 1) : (new Date().getMonth() + 1)
  return reduceToSingleDigit(personalYear + month)
}
```

**`calculateNumerology` — target signature:**
```ts
export function calculateNumerology(birthDate: string, name?: string, targetDate?: Date): NumerologyReading {
```

Internally it passes `targetDate` to each of the three sub-calls, ensuring the entire reading is coherent for a single target moment.

**Cosmic Journal usage (once that feature is built):**
```ts
const entryDate = new Date(`${entry.date}T${entry.time ?? '12:00'}`)
const personalYear = calculatePersonalYear(birthData.date, entryDate)
const personalMonth = calculatePersonalMonth(personalYear, entryDate)
const personalDay = calculatePersonalDay(birthData.date, entryDate)
```

All existing call sites in `DailySnapshotCard.tsx` and `TodayPage.tsx` pass no second argument and continue to receive today's values without any modification.

**Scope of change:** approximately 10 lines changed across 4 functions in a single file (`src/engine/numerology.ts`). No UI changes required. The fix must land before any Cosmic Journal code persists journal entries, or the first version of the feature ships with a systematic error in every historical numerological annotation.
