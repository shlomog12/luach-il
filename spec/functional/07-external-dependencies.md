# External Services and Dependencies

Every external dependency loads directly in the browser (no build
step/bundler) — either via a plain `<script src>`, or via `fetch` to a public
API.

## Google Identity Services

- `https://accounts.google.com/gsi/client` (loaded `async defer`).
- Handles the OAuth flow (token client). See
  [04-google-calendar-integration.md](04-google-calendar-integration.md).

## Google Calendar API v3

- `https://www.googleapis.com/calendar/v3/...` — `calendarList` + `events`
  per calendar. Called directly from the browser with the access token
  (Authorization header), no proxy.

## `@hebcal/core`

- Loaded via: `<script src="https://cdn.jsdelivr.net/npm/@hebcal/core@6.9.2/dist/bundle.min.js">`
  — a **pinned version**, not `latest`, so a library update can't break the
  site without a deliberate change.
- Exposes a global named `hebcal` (UMD bundle) — consumed directly; the
  source code doesn't use a modular `import` for it (it's the one library
  loaded as a classic global rather than an ES module, since it ships as a
  UMD bundle, not an ES module, on the CDN).
- Usage: `HDate` (date conversion), `HebrewCalendar.calendar()` (holidays +
  parsha), `Location`/`Zmanim` (daily times), `Locale`/`gematriya` (Hebrew
  translation/formatting).
- **Why a library and not a hand-rolled formula**: accurate Hebrew-calendar
  calculation (molad, leap years, doubled/single parshiot depending on the
  year) is complex enough that it's worth relying on a widely-used,
  maintained library instead of implementing/maintaining that logic alone.

## Google Fonts

- `Frank Ruhl Libre` + `Heebo` via `fonts.googleapis.com` /
  `fonts.gstatic.com`.

## Open-Meteo Elevation API

- `https://api.open-meteo.com/v1/elevation?latitude=...&longitude=...`
- A public service, no API key, no CORS restriction. Called **only** when a
  user saves a custom location (not on every page load), to know the
  elevation above sea level for the zmanim calculation ("visible sunset" —
  see [03](03-zmanim.md)).
- A failed call (offline, etc.) doesn't block saving the location — it falls
  back to elevation 0.

## Note on yeshiva.org.il

**The site never accesses yeshiva.org.il or its backend at any point.** This
was explicitly checked (see design decision), and it turned out that:

1. The site is protected by Cloudflare with a JS challenge ("Just a
   moment...") that blocks automated/programmatic access.
2. Even if their internal API could be identified, calling it from a
   different domain would be blocked by CORS (it's not meant for external
   consumption).
3. Deliberately bypassing bot protection to "scrape" data from another
   site's server isn't a proper practice, even if it were technically
   possible.

**The solution chosen instead**: use their calculation method (elevation-based
times, "visible sunset") **via the local `@hebcal/core` library**, which
computes similar results with zero dependency on the network/third-party
site — see [03-zmanim.md](03-zmanim.md).
