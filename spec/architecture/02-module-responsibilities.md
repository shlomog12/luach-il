# Each Module's Responsibility

For every module: **purpose** (why it exists), **public API** (conceptual
level, not an exact signature), **allowed dependencies**, and **what it must
not do** (SRP boundaries).

---

## `config/constants.js`

**Purpose**: global constants that aren't "data" (locations) but behavior
settings.

**Exports**: `localStorage`/`sessionStorage` keys (as single shared string
constants — not duplicated as string literals across files),
`YEAR_SPAN_BACK/FWD`, the pinned `@hebcal/core` CDN version, the number of
days to fetch Google events for (60).

**Allowed dependencies**: none (a pure values file).

**Must not**: contain any logic, any DOM import.

---

## `config/locations.js`

**Purpose**: the source of truth for the 20 preset locations.

**Exports**: a `PRESET_LOCATIONS` array (constant, immutable).

**Allowed dependencies**: none.

**Must not**: contain calculation logic, storage access.

---

## `services/HebrewCalendarService.js`

**Purpose**: the only module that knows about `@hebcal/core` for the Hebrew
calendar/holidays/parsha. All other code "doesn't know" `@hebcal/core`
exists — it only talks to this interface.

**Public API (conceptual)**:
- `toHebrewDate(gregorianDate) -> {day, monthName, year}`
- `fromHebrewDate(day, month, year) -> gregorianDate`
- `getMonthsInHebrewYear(year) -> number`
- `getDaysInHebrewMonth(month, year) -> number`
- `addHebrewMonths(month, year, delta) -> {month, year}`
- `getDayInfoRange(startDate, endDate) -> Map<dateKey, {holidays: string[], parsha: string|null}>`
- `formatHebrewNumber(n) -> string` (gematriya)
- `formatHebrewYear(year) -> string`

**Allowed dependencies**: `hebcal` (the CDN global) only.

**Must not**: touch the DOM, know about `localStorage`, know about Google
Calendar.

---

## `services/ZmanimService.js`

**Purpose**: halachic daily-times calculation, including elevation
adjustment ("visible sunset").

**Public API**:
- `getDailyZmanim(date, location) -> {alotHaShachar, sunrise, sofZmanShma, ..., tzeit, candleLighting}`
  where `location` is `{lat, lon, elevation}` (doesn't depend on
  `LocationStore` — receives the data as a parameter, doesn't fetch it
  itself).

**Allowed dependencies**: `hebcal` (`Location`, `Zmanim`) only.

**Must not**: know what "the currently selected location" is (that's
`LocationStore`'s responsibility) — every call receives an explicit location
parameter. This is what makes the service testable in isolation.

---

## `services/ElevationService.js`

**Purpose**: look up elevation above sea level for given coordinates, via
Open-Meteo.

**Public API**:
- `async lookupElevation(lat, lon) -> number` (returns `null` on failure —
  the caller decides the fallback, not the service itself)

**Allowed dependencies**: the global `fetch` only.

**Must not**: handle the fallback (0m) — that's the caller's responsibility
(`LocationStore`/`LocationDialog`), not the service's.

---

## `services/GoogleAuthService.js`

**Purpose**: the entire Google auth lifecycle — creating the token client,
silent refresh, manual fallback, token storage.

**Public API**:
- `initialize(clientId, scope) -> void`
- `getValidAccessToken() -> Promise<string | null>` (tries a cached session
  token → silent refresh → returns `null` if manual consent is needed)
- `requestConsent() -> void` (triggers the consent popup)
- `onAuthChange(callback)` — pub/sub to announce connection-status changes
  (used by `AuthStatusBar`, see [03](03-state-management-pattern.md))

**Allowed dependencies**: `google.accounts.oauth2` (global), `sessionStorage`
via `utils/safeStorage.js` only (not directly).

**Must not**: know what happens with the token after it's obtained (fetching
events is `GoogleCalendarService`'s responsibility).

---

## `services/GoogleCalendarService.js`

**Purpose**: fetch events from the Google Calendar API, given a valid token.

**Public API**:
- `async fetchUpcomingEvents(accessToken, daysAhead) -> Event[]`
  where `Event = {date, title, allDay, calendarName}`

**Allowed dependencies**: the global `fetch`, `config/constants.js` (for the
day count).

**Must not**: know how a token is obtained (receives it as a parameter) —
fully decoupled from `GoogleAuthService`. The two services are only
connected via `main.js`.

---

## `state/*Store.js` (the four/five stores)

See the full Store pattern writeup in
[03-state-management-pattern.md](03-state-management-pattern.md). Briefly,
every store has: `get()`, `set(value)` (including writing to storage if
applicable), `subscribe(callback)`.

| Store | Holds | Persisted? |
|---|---|---|
| `ViewModeStore` | `'heb' \| 'greg'` | Yes (`localStorage`) |
| `LocationStore` | `{name, lat, lon, elevation}` | Yes (`localStorage`) |
| `CalendarNavigationStore` | `current`, `hebCursor`, `selected` | No |
| `ZmanimDisclosureStore` | `boolean` (open/closed) | Yes (`localStorage`) |
| `EventsStore` (added beyond the original 4 — see the update note at the top of [01](01-target-file-structure.md)) | Fetched Google Calendar events | No |

**Allowed dependencies**: `utils/safeStorage.js` only (for the ones that
persist).

**Must not**: no store knows about `services/*` or `components/*` — the data
flow is **one-directional**: components → stores/services → components
(via subscribe), never stores calling components.

---

## `components/*.js`

See the full writeup in [04-component-design.md](04-component-design.md).
Rule of thumb: a component receives a DOM container + the relevant
stores/services (**injected via its constructor/factory function**, not a
global lookup), knows how to render itself, and publishes events (callbacks)
instead of calling other components directly.

---

## `utils/dateFormat.js`

**Purpose**: pure functions for formatting dates/ranges — `toKey`,
`fmtTime`, `gregRangeLabel`, `hebRangeLabel`. No state, no side effects.

**Allowed dependencies**: none (or `services/HebrewCalendarService` only,
for `hebRangeLabel`, which needs `formatHebrewYear`/`heDayStr`).

---

## `utils/safeStorage.js`

**Purpose**: centralize the `try{...}catch(e){}` pattern around
`localStorage`/`sessionStorage` **in one place**, instead of duplicating it
in every store.

**Public API**:
- `safeGet(storage, key) -> string | null`
- `safeSet(storage, key, value) -> boolean` (returns whether it succeeded)

**Allowed dependencies**: none.

**Must not**: know *what* the keys mean (that's the responsibility of the
stores that use it).
