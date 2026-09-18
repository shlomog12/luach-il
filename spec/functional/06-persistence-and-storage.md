# Local Storage

All storage is **client-side only** — no database/server. Two browser
storage mechanisms are used, deliberately differing by intended lifetime:

## `localStorage` (persists across visits/browser sessions)

| Key | Value | Default if missing | Who reads/writes it |
|---|---|---|---|
| `luach_loc` | JSON: `{name, lat, lon, elevation}` | Jerusalem | Location picker |
| `luach_mode` | `'heb'` or `'greg'` | `'heb'` | View-mode toggle |
| `luach_zman_open` | `'1'` or `'0'` | `'0'` (closed) | "זמני היום" disclosure |

- Every read/write is wrapped in `try/catch` — if `localStorage` is
  unavailable (strict private-browsing mode, browser permissions, etc.) the
  app keeps working with defaults, without throwing an error.

## `sessionStorage` (cleared when the tab/browser closes)

| Key | Value | Note |
|---|---|---|
| `gcal_token` | Google OAuth access token | Deliberately not persisted — a new visit relies on silent refresh, not a surviving old token |
| `gcal_token_exp` | Expiry timestamp (milliseconds) | |

## What's **not** stored anywhere

- The "selected day" (`selected`) — resets at most to the start of the
  displayed month on every page load; there's no memory of "where I was last
  time".
- The open/closed state of "Jump to date" and of the "Events" card —
  irrelevant for the events card since it isn't rebuilt between interactions
  (see [05](05-ui-and-accessibility.md)); for "Jump to date" it's a
  deliberate decision that it always starts collapsed.
- Google Calendar events themselves — refetched on every load/refresh, not
  stored locally between visits.
