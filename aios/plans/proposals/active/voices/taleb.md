# Nassim Taleb — Voice Analysis

## Sprint 0012 Focus: Backend Sovereignty

---

## Preamble

The sprint vision has identified a real fragility. The server is an execution node, not a knowledge node. The client builds the prompts, assembles the data, does the astronomy — and the server obediently fires the GPT call with whatever string arrived. That is not sovereignty. That is a proxy.

The correction is conceptually correct. Now let me tell you what everyone is assuming that is not true, what breaks when porting is done half-heartedly, and where this sprint introduces its own fragilities.

---

## What Everyone Is Assuming

### The central assumption nobody has examined: `birth_place` will always be a valid, parseable JSON object with `lat`, `lng`, and `tz` present

The entire server-side calculation path for every ported handler begins at the same point in `gpt.ts` line 225:

```typescript
const place = JSON.parse(row.birth_place) as { lat?: number; lng?: number; tz?: string }
if (typeof place.lat === 'number' && typeof place.lng === 'number' && place.tz) {
```

This is the sole data source for server-side chart computation. The field is `TEXT` in SQLite. It is stored by the client. It is never validated on write beyond what the profile route accepts. There is no schema constraint enforcing that `lat`, `lng`, and `tz` are present.

Now consider: What is `birth_place` for a user who registered via OAuth and skipped the birth profile? It is `null`. The guard handles `null` correctly — `row.birth_place` check catches it. Fine.

What is `birth_place` for a user who registered early in the product's lifecycle, before the current JSON structure was canonical? It depends on what the client sent. What if the client sent `{"lat": "40.71", "lng": "-74.00", "tz": "America/New_York"}` — string lat/lng instead of numbers? The `typeof place.lat === 'number'` guard fails silently. The server falls back to empty context or no context. No error is logged. The GPT call proceeds with empty astrological data. Nobody knows.

What is `birth_place` for a user whose city lookup returned a result without a timezone — a legitimate edge case for certain cities near timezone boundaries? `place.tz` is falsy. The guard fails. Silent fallback.

The dream handler had one server-side computation path. Sprint 0012 proposes adding this same fragile DB read as the foundation for transit, synastry, solar return, and numerology computations. Every new handler that reads `birth_place` inherits this silent failure mode. The failure mode is not an error — it is a degraded response. The user submits a transit request, the server falls back to empty natal context, GPT produces a generic response, nobody logs anything, nobody knows the DB field was unusable.

This is the highest-leverage fragility in the sprint. The fix is one function, written once, that either returns a validated `{ lat: number; lng: number; tz: string }` or throws a typed error. Every handler calls this function. Silences are audible.

---

### The assumption about synastry: both people's birth data will be in the DB

For server-side synastry computation, the server needs two natal charts: the authenticated user's and their partner's. The authenticated user's birth data is in the DB. The partner's birth data is entered in the frontend form and has never been stored anywhere.

The sprint vision does not mention this. It describes `buildSynastryPrompt` as a port target and says "the server can produce the same data structure the frontend produces for any authenticated user whose birth data is stored." But synastry requires two users. The partner is not a user. They have no account. They have no DB row. Their birth data exists only in the client's state for the duration of the session.

There are two paths here: (a) accept the partner's birth data as a payload from the client (meaning the client still does or at least validates some data), or (b) restrict server-side synastry to registered couples — which does not exist as a product feature. Path (a) is the only workable option, and it means the synastry handler will take a different shape than every other handler — it cannot be purely DB-sovereign; it must accept partner data from the client.

If the implementer does not notice this, they will write a synastry handler that queries only the primary user's birth data and cannot compute Person 2's chart at all. The handler will either fail or produce a Person 1-only reading labeled as a synastry reading. Neither is acceptable, and neither will be obvious in code review.

---

### The assumption about solar return: the birth location is the return location

In `src/engine/solarReturn.ts`, `calculateSolarReturn` takes `birthLat` and `birthLng` — the birth location — as the observation point for the solar return chart. This matches standard relocation-birthplace practice.

But some astrological traditions and some calculation tools compute the solar return for the location where the person currently lives, not where they were born. This question is live among practitioners.

More concretely: the server has `birth_lat` and `birth_lng` from the stored `birth_place`. It does not have the user's current location. When the frontend calculates the solar return, it uses the birth coordinates because that is what it has. The server will use the same. For now, these match. But the fragility is that a user who is aware of relocation SR charts cannot get one from either the client or the server, and the server port will silently cement the birth-location assumption into the backend with no way to override it — not because someone decided this, but because nobody noticed the assumption was being ported along with the calculation.

---

## The Specific Fragilities

### 1. The duplicate utilities problem will get worse before it gets better

Count how many times `normalizeAngle`, `longitudeToZodiac`, `getPlanetLongitude`, and `getMeanNodeLongitude` already appear in the codebase:

- `src/engine/astronomy.ts` — all four
- `src/engine/transits.ts` — `getPlanetLongitude`, `getMeanNodeLongitude` (local copies)
- `server/engine/chartEngine.ts` — all four (local copies)

The sprint vision acknowledges this and says "duplicate logic should be resolved by establishing a clean shared module structure in `server/engine/`, not by accumulating more copies."

Here is what will actually happen: the sprint ports five engine files. Each port starts from the corresponding frontend file. Each frontend file has local copies of `getPlanetLongitude` and `getMeanNodeLongitude`. The porter copies the file, adjusts imports, verifies the output matches the frontend. They do not extract the shared utilities because that requires changing `chartEngine.ts` and all new files simultaneously — a refactor that touches more surface area than the vision scoped.

Result: after sprint 0012, there will be six copies of `normalizeAngle` and five copies of `getMeanNodeLongitude` across `server/engine/`. The shared module recommendation in the vision will remain a recommendation. The next sprint will inherit five files with divergent copies of the same 8-line function, and when a precision bug is found in `normalizeAngle`, the fix will be applied to one copy and missed in four.

This is textbook accumulation of fragility through incremental shortcuts. The sprint vision correctly identifies the problem and incorrectly scopes the solution as something that can be deferred.

The fix is simple: write `server/engine/astroUtils.ts` first, before porting a single engine file. It contains `normalizeAngle`, `longitudeToZodiac`, `getMeanNodeLongitude`, and the `BODY_MAP`. Every ported file imports from it. This is not extra work — it is the same work done once instead of five times.

---

### 2. The orb tables are not consistent between frontend and backend, and nobody has written a test to prove they are

The vision's quality bar: "server-assembled prompts must be identical in information density to frontend-assembled prompts."

Look at `server/engine/chartEngine.ts` lines 78–84:

```typescript
const ASPECT_DEFS = [
  { angle: 0,   orb: 2.4, symbol: '☌', name: 'conjunction'  },
  { angle: 60,  orb: 1.8, symbol: '⚹', name: 'sextile'      },
  { angle: 90,  orb: 2.4, symbol: '□', name: 'square'       },
  { angle: 120, orb: 2.4, symbol: '△', name: 'trine'        },
  { angle: 180, orb: 2.4, symbol: '☍', name: 'opposition'   },
]
```

Now look at `src/engine/aspects.ts` lines 22–29:

```typescript
export const ASPECT_DEFINITIONS: AspectDefinition[] = [
  { name: 'conjunction', angle: 0, orb: 8, symbol: '☌', nature: 'neutral' },
  { name: 'sextile', angle: 60, orb: 6, symbol: '⚹', nature: 'harmonious' },
  { name: 'square', angle: 90, orb: 8, symbol: '□', nature: 'challenging' },
  { name: 'trine', angle: 120, orb: 8, symbol: '△', nature: 'harmonious' },
  { name: 'opposition', angle: 180, orb: 8, symbol: '☍', nature: 'challenging' },
  { name: 'semi-sextile', angle: 30, orb: 2, symbol: '⚺', nature: 'neutral' },
  { name: 'quincunx', angle: 150, orb: 3, symbol: '⚻', nature: 'challenging' },
]
```

The server's orbs are tight (designed for transit snapshots at `getActiveTransitAspects`). The frontend natal orbs are 8°. The server currently applies its tight orbs correctly — for the purpose of the dream handler's sky context. But when the sprint ports `calculateTransitAspects` and `calculateSynastryAspects`, those functions have their own orb tables derived from the 8° natal table scaled by a period multiplier (`0.3` for daily, `0.5` for weekly, `0.7` for monthly). If the porter copies the transit engine file and imports from `chartEngine.ts`'s `ASPECT_DEFS` instead of recreating the frontend's `ASPECT_DEFINITIONS` as the base, the scaling chain will produce different aspect lists than the frontend.

The frontend produces: "Mars square natal Mercury" (7.2° orb, monthly scaling at 0.7 → max 5.6°). Wait, that does not pass either. Let me be more precise: the frontend's daily period uses `orb: 8 * 0.3 = 2.4` for conjunction, which happens to match the server's hardcoded 2.4. That is a coincidence for conjunction, not a design match. For sextile: frontend daily is `6 * 0.3 = 1.8`, server is `1.8`. Also coincidental. For the monthly period: frontend monthly conjunction orb is `8 * 0.7 = 5.6`. The server has 2.4. These are not the same.

Nobody will notice because the current server only uses tight orbs for the dream handler. The moment a monthly transit handler is ported and the server uses `getActiveTransitAspects` with `maxOrb: 2` instead of `maxOrb: 5.6`, it will miss aspects the frontend shows, and the GPT response will not mention "that Jupiter trine" the user saw on their transit page. The reading will not match.

The vision says "identical in information density." This is achievable only if the orb tables are explicitly verified to match for each use case.

---

### 3. The "no schema change" constraint is a ticking clock for the numerology case

The sprint vision explicitly says: "Not a database schema change. No new tables, no new columns. The sprint reads from `birth_date`, `birth_time`, `birth_place` which already exist."

Now look at what numerology requires on the server side. The server can compute `calculateLifePath` from `birth_date`. It can compute `calculateBirthdayNumber` from `birth_date`. It can compute `calculatePersonalYear` from `birth_date`.

It cannot compute `calculateExpressionNumber` or `calculateSoulUrge` without the user's full name as entered — specifically, the birth name used for Pythagorean reduction. The `full_name` column exists in the DB. But `full_name` is the display name or registered name. It may or may not be the birth name. For many users these differ. For OAuth users who registered with their social media name, they almost certainly differ.

So: the backend can compute partial numerology (life path, birthday number, personal year) from stored data. It cannot compute expression number or soul urge without a birth name the DB may not have accurately.

The current frontend `astro-numerology-cross` handler receives `numbers` from the client, including `expressionNumber`. The server has no way to verify or recompute this. If the sprint ports a numerology handler that claims server sovereignty over numerology calculations, it will produce a partial computation (3 of 5 numbers) while silently omitting the two numbers that require birth name data not stored in canonical form.

The partial result is worse than the current client-sends-all approach because it will be presented as server-computed without the user or the GPT prompt knowing that two numbers are client-computed. The reading will mix server-verified and client-unverified data in the same payload with no labeling.

The constraint "no schema change" means the numerology backend sovereignty is inherently partial. This should be documented explicitly, not discovered after shipping.

---

### 4. The half-hearted port is more dangerous than no port at all

The vision warns: "A handler that builds only a partial prompt, or relies on the client for orb sorting, or skips house context, fails the bar."

Here is the specific failure mode that will occur at sprint's end if the quality bar is not enforced rigorously: a porter writes a `handleTransitInterpretation` server handler that computes the natal chart from DB, computes transit positions, computes transit aspects — but uses the wrong orb table, or omits the ingress detection that `calculateTransits` includes, or skips the retrograde status section that `buildTransitPrompt` appends.

The resulting server-side prompt is 80% equivalent to the client prompt. The GPT response reads well. The sprint ships with this handler marked as complete.

Now the system has two code paths that diverge in unspecified ways:
1. The client still assembles the full prompt (correctly, as always) and sends it via `getGptInterpretation`
2. The server assembles a partial prompt for some future use case (subscriptions, journal annotations, scheduled readings)

In six months, when the server path is used for a paid feature, users on that path receive readings that omit ingresses and retrograde context that the client path always included. Nobody knows why the readings feel different. Nobody can bisect back to the orb table discrepancy from sprint 0012.

A partial port that ships as complete creates a category of invisible regressions that are impossible to detect without a reference comparison test.

---

### 5. The `resolveToUTC` function is the most dangerous shared function and nobody is testing it

Both `src/engine/astronomy.ts` and `server/engine/chartEngine.ts` contain implementations of timezone-aware UTC resolution. The function takes a date string, a time string, and an IANA timezone identifier, and returns a UTC Date.

This function is the single most fragile piece of the entire calculation chain. The rest of the astronomy is deterministic given a UTC time. The timezone resolution is not. It is subject to:

- DST transitions (is a time in the gap or fold during spring/fall transitions?)
- Historical timezone changes (IANA database evolves; a timezone that existed in 1985 may have different rules than today)
- Ambiguous times in the fold (2:30 AM on fall-back day maps to two UTC moments)

The server and client currently run different JavaScript engines with potentially different IANA timezone database versions. The server uses Node.js. The client uses the browser's `Intl.DateTimeFormat`. For most birth dates and locations, these produce identical results. For birth times during DST transitions in jurisdictions that have changed timezone rules since the birth occurred, they may not.

Nobody is testing this. There is no automated comparison of server-computed vs client-computed chart positions for any birth date. The vision says "the backend should be able to compute the same chart data structure that the frontend produces." The vision does not say "verify this is true for boundary cases."

The fragility here is not theoretical. Someone born at 2:15 AM on October 4, 1987 in São Paulo (Brazil had complex DST rules that changed multiple times in the 1980s and 1990s) will receive a different chart from the server than from the client if their IANA database versions diverge on historical Brazilian DST. The chart difference may be 1 hour = approximately 15° ASC shift = completely different rising sign. This is not an edge case for anyone born in South America, Eastern Europe, or parts of Asia between 1970 and 1995.

The fix is a contract test: for a fixed set of known birth data with known astrological outputs (e.g., "Audrey Hepburn, born May 4, 1929, 03:00, Brussels, Belgium — should have Cancer ASC"), run both the client and server calculations and assert identical planet positions within 0.1°. Without this test, "identical" is a claim, not a fact.

---

## Where the Sprint Will Underestimate Scope

### The `buildTransitPrompt` function alone is 200+ lines

Read the frontend `buildTransitPrompt` in `src/engine/transits.ts` carefully. It includes:
- Natal position formatting with retrograde markers
- Transit positions with daily motion and retrograde status
- Aspect lists with applying/separating distinctions and house context
- Ingress detection across the period
- Retrograde status changes for every planet
- Element and modality analysis of the natal chart
- Period-appropriate orb scaling

This is not a function. It is a small report assembler. Porting it faithfully while also porting `calculateTransits` (which calls `detectIngresses`, `getRetrogradeStatus`, `assignTransitHouses`, `calculateCurrentPositions`, `calculateTransitAspects`) means porting at minimum 5 interconnected functions before a single transit handler can match the frontend's output.

The vision shows a table of 7 missing engine files. Each row in that table represents not one function but an ecosystem of 3–8 interconnected functions. The scope is 4–5x what the table suggests.

### The `calculateSynastry` function requires a composite chart, house overlay, and compatibility score

`calculateSynastry` in `src/engine/synastry.ts` returns a `SynastryData` object containing:
- `synastryAspects` (cross-chart aspects)
- `houseOverlay` (person 1's planets in person 2's houses and vice versa)
- `compositeChart` (midpoint chart)
- `compatibility` (scored summary)

Porting `buildSynastryPrompt` faithfully requires all four of these. The house overlay requires both charts' house cusps. The composite chart requires midpoint calculations for angles and planets. None of this is trivially additive.

On top of this: as noted above, Person 2's chart comes from client-provided data, not the DB. The sprint's architecture cannot be purely "query DB, compute, return" for synastry.

---

## Where Backend Sovereignty Introduces Its Own Fragilities

### The fallback pattern makes failures invisible

The dream handler introduced a fallback pattern: if the client sends no chart data, fall back to server-computed data; if the server computation fails, fall through silently. This is operationally gentle but diagnostically opaque.

When sprint 0012 extends this pattern to transit, synastry, and solar return handlers, the operational question becomes: how often is the server computing the data independently? How often is it falling through? Is the fallback actually working for 95% of users or 30% of users?

There is no observability into this. No metric tracks "server computed natal chart from DB" vs "server received client-provided chart data" vs "server fell through without chart". A fallback that silently degrades is indistinguishable from a fallback that never succeeds. You cannot fix what you cannot see.

### Making the server sovereign creates a new dependency on DB data quality that did not exist before

Before this sprint, a user with corrupted `birth_place` data had a working application. The client computed everything locally; the DB was only consulted for auth and journal entries. GPT calls relied entirely on client-provided data, and the client always had access to the user's locally-entered birth data even if it never reached the DB properly.

After this sprint, certain server-side features will depend on DB-stored birth data being correct and complete. A user who updated their birth city through a third-party tool, or who has a DB row from a migration that lost their timezone, or who never completed their profile — that user will receive degraded server-side readings from a source they do not know exists.

The sovereignty model transfers correctness responsibility from the client (which has direct user input) to the DB (which has stored and potentially stale data). This is the right direction for long-term reliability, but it requires a data quality baseline that does not currently exist. There is no validation job that verifies all users' `birth_place` fields are valid, complete, and parseable. There is no UI that tells a user their birth data is incomplete for server-side computation.

---

## What Would Make This Sprint Antifragile

An antifragile port is one that gets more reliable under adversarial conditions — bad data, missing fields, unexpected inputs — rather than one that fails when inputs deviate from assumptions.

**One function, validated early.** Write `resolveUserBirthContext(userId: number): BirthContext | null` as the first function of the sprint. It reads `birth_date`, `birth_time`, `birth_place` from the DB, validates all required fields including `typeof lat === 'number'`, handles string-encoded coordinates gracefully, logs when fields are missing or malformed, and returns a typed object or null. Every server handler that needs birth context calls this function. The DB read pattern is written once, validated once, monitored once.

**A contract test.** Before any ported engine function is merged, it must pass a reference test: given the same inputs, the server function and the frontend function produce identical planetary longitudes within 0.1° for a fixed set of known birth dates. This catches timezone resolution divergence before it ships. Five test cases takes two hours to write and catches the class of error that is otherwise invisible for years.

**Explicit partial computation labels.** For numerology and any other domain where the server cannot compute all fields from stored data, the handler should label what is server-computed and what was client-provided. The GPT prompt should state which numbers were verified server-side. Silence about data provenance is the mechanism by which degraded readings become trusted readings.

**A `server/engine/astroUtils.ts` shared module, written first.** This prevents the six-copies-of-normalizeAngle problem before it forms. It is not extra work. It is discipline applied before the copy-paste reflex fires.

**Structured logging for fallback events.** Every time a handler falls back from server-computed to client-provided data (or from client-provided to empty), it should emit a structured log event with the fallback reason. Not an error — a metric. After one week in production, you know whether the server computation is working. Before structured logging, you are flying blind.

---

## What This Sprint Will Actually Look Like When It Ships

The transit handler gets ported first. It is the most canonical case and the vision spends the most time on it. The orb tables will not be carefully verified — the porter will see that daily orbs match by coincidence and assume the monthly period also matches. They do not.

The synastry handler will be discovered to require partner data from the client, and the handler will accept it as a payload parameter. This is the right solution, but it means the handler has a different shape than the pure "DB-sovereign" vision implies. The sprint will ship with a comment saying "partner data from client, server computes chart." The semantic difference between "client provides data" and "client builds prompt" will be blurred.

The numerology handler will compute 3 of 5 numbers. The handler comment will say "expression number and soul urge are client-provided when name is unavailable." Nobody will ask whether the DB `full_name` field is actually the correct birth name for numerology calculation.

The shared utility duplication will not be resolved. The vision says it should be; the sprint will have six files open simultaneously and nobody will want to restructure imports while also verifying calculation outputs. The `server/engine/astroUtils.ts` file will remain a recommendation.

`resolveToUTC` will not be contract-tested. The server and client will produce identical results for the birth dates used in manual testing. They will produce different results for specific historical dates in certain jurisdictions. Nobody will know.

The sprint ships. The backend is more sovereign than before. The fragilities above will not surface for six months, and when they do, they will be attributed to "edge cases" and "unexpected user data" rather than to assumptions that were baked in without verification during sprint 0012.

---

## The One Thing to Get Right

If this sprint does only one thing well, it should be the `resolveUserBirthContext` function and a contract test for `resolveToUTC`. Everything else can be incrementally improved. An unverified timezone resolution function is a silent, user-specific error that produces authoritative-looking wrong output, and there is no category of error more destructive to user trust in an astrology application than a wrong rising sign.
