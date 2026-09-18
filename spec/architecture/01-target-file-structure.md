# Proposed File Structure

> **Update: this is already the actual structure**, not just a proposal —
> see `src/` and `styles/main.css` in the repo. Two small, deliberate
> deviations from the original spec:
> 1. A `state/EventsStore.js` was added (not in the original 4-store list)
>    — something had to hold the Google Calendar events as shared state
>    between `CalendarGrid`/`DayDetailPanel`/`EventsListPanel`, since
>    `GoogleCalendarService` stays stateless (SRP) per the spec.
> 2. `HebrewCalendarService` re-exports the `HDate` class itself (not just a
>    functional API as implied in [02](02-module-responsibilities.md)) — full
>    rationale at the top of `src/services/HebrewCalendarService.js`.
> Components receive only DOM refs via their constructor (not
> stores/services by injection) — ES modules' own imports already provide
> enough DI for an app this size.

## Core decision: native ES Modules, no bundler

Introducing Webpack/Vite/esbuild or a framework (React, etc.) is **not**
proposed. Rationale:

- Deployment today is raw static files via Netlify, with no build command at
  all — that's a simplicity worth preserving.
- Modern browsers (Chrome, Safari — the app's stated target) natively
  support `<script type="module">` and relative `import`/`export`, with no
  build tooling.
- The app is small enough (not tens of thousands of lines) that a bundler's
  benefits (tree-shaking, code-splitting) don't justify the added
  maintenance complexity (a package.json with dev dependencies, a build
  config file, a CI build step).

If the app grows significantly in the future (dozens of components, slow
loading), this could be reconsidered — but it's **not** the right default
right now.

## Proposed folder structure

```
/
├── index.html              # shell only: <head>, markup, <script type="module" src="src/main.js">
├── manifest.json
├── sw.js
├── icon.svg
├── src/
│   ├── main.js              # composition root — the only file that wires everything together
│   │
│   ├── config/
│   │   ├── constants.js      # storage keys, year spans, pinned CDN version, etc.
│   │   └── locations.js      # the LOCATIONS array (20 preset locations)
│   │
│   ├── services/             # pure business logic — never touches the DOM
│   │   ├── HebrewCalendarService.js   # wraps HDate/HebrewCalendar
│   │   ├── ZmanimService.js           # wraps Location/Zmanim
│   │   ├── ElevationService.js        # Open-Meteo lookup
│   │   ├── GoogleAuthService.js       # token client, silent refresh
│   │   └── GoogleCalendarService.js   # fetches events
│   │
│   ├── state/                 # "stores" — state + change notifications (see 03)
│   │   ├── ViewModeStore.js
│   │   ├── LocationStore.js
│   │   ├── CalendarNavigationStore.js  # current/hebCursor/selected
│   │   └── ZmanimDisclosureStore.js
│   │
│   ├── components/            # UI elements — each one renders exactly one thing (see 04)
│   │   ├── CalendarGrid.js
│   │   ├── DayDetailPanel.js
│   │   ├── EventsListPanel.js
│   │   ├── LocationDialog.js
│   │   ├── JumpToDatePanel.js
│   │   ├── ModeToggle.js
│   │   ├── NavControls.js
│   │   └── AuthStatusBar.js
│   │
│   └── utils/
│       ├── dateFormat.js      # toKey, fmtTime, gregRangeLabel, hebRangeLabel
│       └── safeStorage.js     # a uniform try/catch wrapper for localStorage/sessionStorage
│
├── styles/
│   └── main.css               # extracted from the <style> block formerly inside index.html
│
└── spec/                       # these documents
    ├── functional/
    └── architecture/
```

## Mapping rules (what moves where)

| In the pre-refactor code | Moves to |
|---|---|
| `HDate`, `hebMonthName`, `buildDayInfo`, `HOLIDAY_FLAGS` | `services/HebrewCalendarService.js` |
| `getZmanim`, `LOCATIONS`, angle constants | `services/ZmanimService.js` + `config/locations.js` |
| The `open-meteo` fetch call | `services/ElevationService.js` |
| `initGoogleAuth`, `setAuthUI`, token management | `services/GoogleAuthService.js` |
| `loadEvents`, event parsing | `services/GoogleCalendarService.js` |
| `loadLocation`/`saveLocation` | `state/LocationStore.js` |
| `loadMode`/`saveMode`/`VIEW_MODE` | `state/ViewModeStore.js` |
| `current`, `hebCursor`, `selected` | `state/CalendarNavigationStore.js` |
| `loadZmanOpen`/`saveZmanOpen` | `state/ZmanimDisclosureStore.js` |
| `renderCalendarGrid`, `renderGregMonth`, `renderHebMonth`, `renderDayCell` | `components/CalendarGrid.js` |
| `showDetail` (the DOM-building part) | `components/DayDetailPanel.js` |
| `renderEvents` | `components/EventsListPanel.js` |
| The location dialog | `components/LocationDialog.js` |
| The jump-to-date controls | `components/JumpToDatePanel.js` |
| `toKey`, `fmtTime`, `gregRangeLabel`, `hebRangeLabel` | `utils/dateFormat.js` |

## What `index.html` looks like after the split

`index.html` stays the shell file: all of the `<head>`, the CSS (a `<link>`
to `styles/main.css`), and the static markup (the cards, the dialog, etc.)
— but **with no `<script>` containing any logic**. The one relevant line:

```html
<script type="module" src="./src/main.js"></script>
```

`main.js` is the **composition root**: the only file that knows about *every*
module, creates instances, wires dependencies (manual dependency
injection — no framework DI needed), and connects components to stores. No
other file should import the whole project directly — only what it actually
needs.
