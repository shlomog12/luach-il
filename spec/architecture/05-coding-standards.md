# Coding Conventions

## Naming

- **Files**: `PascalCase.js` for components/classes (`CalendarGrid.js`),
  `camelCase.js` for helper functions/utils (`dateFormat.js`).
- **Functions**: start with a verb (`renderGrid`, `fetchEvents`,
  `formatTime`). A function returning a boolean: `is`/`has`/`should`
  (`isShabbat`, `hasEventsToday`).
- **Constants**: `UPPER_SNAKE_CASE` only for values that are genuinely
  globally constant (`YEAR_SPAN_BACK`, `STORAGE_KEYS`); don't use this just
  for a regular `let`.
- **Storage keys**: defined **once** in `config/constants.js` (e.g.
  `STORAGE_KEYS.LOCATION = 'luach_loc'`), not as a string literal scattered
  across several files.

## Types without full TypeScript

Using **JSDoc** for light type annotations is proposed, without moving the
whole project to TypeScript (that would add a build step, against the
principle in [01](01-target-file-structure.md)). Example:

```js
/**
 * @typedef {{name: string, lat: number, lon: number, elevation: number}} Location
 */

/**
 * @param {Date} date
 * @param {Location} location
 * @returns {{sunrise: Date, sunset: Date, ...}}
 */
export function getDailyZmanim(date, location) { ... }
```

For editor-time type checking (VS Code) without a real build step, a
`jsconfig.json` with `"checkJs": true` can be added. This is optional, not
required to start.

## Error handling

- Every access to `localStorage`/`sessionStorage` goes through
  `utils/safeStorage.js` — **no other file writes its own
  `try{...}catch(e){}`** around storage.
- External `fetch` calls (Google APIs, Open-Meteo) **always** fail
  gracefully (graceful degradation) — never throw an unhandled error that
  brings down the rest of the app. For example: a failure fetching one
  Google calendar doesn't prevent showing the rest (already true in the
  pre-refactor code — this principle should be preserved).
- Errors worth showing the user (e.g. invalid coordinates in the location
  dialog) are shown through the UI, not a raw `alert()` (a future
  improvement; there's currently one use of `alert()`, worth replacing with
  an in-dialog message component).

## Testing

The pure services (`services/*`, `utils/*`) are the natural candidates for
**unit tests** — they don't depend on the DOM, and can be tested directly in
Node:

- `HebrewCalendarService`: test date conversions, leap-year month counts,
  holiday detection — there's real business logic here worth pinning down
  (regression protection) before future changes.
- `ZmanimService`: test that different elevation values shift sunset in the
  correct direction (this kind of test was already done manually in Node
  during development — it deserves to be a standing test, not a one-off).
- `dateFormat.js`: fully pure functions — the easiest and cheapest to test.

Suggested tool: Node's built-in **`node:test`** (no extra dev dependency to
install) — preferable to adding Jest/Vitest unless a real gap is felt.
Example structure:

```
src/services/HebrewCalendarService.test.js
src/services/ZmanimService.test.js
src/utils/dateFormat.test.js
```

Components (`components/*`) usually aren't worth full unit-testing (heavy
DOM involvement) — manual/exploratory testing in an actual browser is
preferable (there's a dedicated skill for this project for that purpose),
unless recurring regression bugs are found that justify JSDOM integration
tests.

## Linting/Formatting (optional)

Not required at this stage, but if enforcing these rules automatically is
wanted: ESLint with basic rules (`no-unused-vars`, `eqeqeq`, `no-var`) +
Prettier for consistent formatting. Both are **dev dependencies only** —
they don't enter the runtime, and don't affect the deployment step (Netlify
still serves static files as-is).
