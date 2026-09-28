# Google Calendar Sync

## Feature goal

If a user adds an event to their Google Calendar, the event **also appears on
the site's calendar** — with no action needed from the user beyond opening
the site. And the other way around: an event added **from the site** is
created directly in their Google Calendar.

## Authentication (OAuth)

- Uses **Google Identity Services** (`google.accounts.oauth2`), the **token
  client** (implicit) flow — **not** the authorization-code flow — meaning
  there's **no** `client_secret` at all, and no Authorized redirect URIs
  (only Authorized JavaScript origins).
- Scope: `https://www.googleapis.com/auth/calendar.readonly` for connecting
  and the silent refresh. Write access
  (`https://www.googleapis.com/auth/calendar.events`) is requested with
  **incremental authorization** — only the first time the user saves a new
  event (see "Adding an event" below). Since GIS's `include_granted_scopes`
  defaults to `true`, later silent refreshes (still asking for readonly only)
  return a token that keeps the write scope too, so the extra consent is
  one-time.
- **Silent refresh on every visit**: on every page load, the app tries to get
  a token **with no popup** (`prompt: ''`) automatically — as long as the
  user is still signed into their Google account in that browser and has
  already granted access before. If that succeeds, events load and display
  **with zero user interaction**.
- If the silent refresh fails (e.g. no active Google session in the browser,
  or access was revoked) — a "Connect with Google" button is shown as a
  one-time manual fallback (`prompt: 'consent'`).
- The token and its expiry are stored in `sessionStorage` (cleared when the
  tab/browser closes, deliberately **not** persisted to the next session —
  the silent refresh is what handles the next visit).

## Fetching events

- After obtaining a valid token: call `calendarList` (all of the user's
  calendars), then a parallel call (`Promise.all`) to `events` **for every
  calendar**, over the **60 days ahead from load time** (not including the
  past), up to 50 events per calendar.
- Cancelled events (`status === 'cancelled'`) are filtered out.
- All events from all calendars are merged into one array, sorted
  chronologically.
- A failure fetching one calendar **doesn't** bring down the whole process —
  that calendar is simply skipped.

## Where events are shown

1. **Calendar cell (grid)**: up to 2 chips per day (holidays first, then
   events; see [02](02-calendar-views-and-navigation.md)), with "+N more"
   under load.
2. **Day-detail card**: all of that specific day's events, with time (if not
   "all day") and full title — always visible (not collapsed), part of the
   "day's events" block alongside holidays/parsha.
3. **"Events in Google Calendar" card (next 60 days)**: a full,
   chronologically sorted list, inside a `<details>` **collapsed by
   default**.

## Adding an event

- When connected, the day-detail card shows a "+ הוספת אירוע" button, which
  opens a dialog pre-filled with that day's date (the Hebrew date is shown
  next to the date field).
- Fields: title (required), target calendar, date, "all day" checkbox, start/end time
  (default 09:00–10:00; changing the start keeps a one-hour length), and an
  optional description. End time must be after start time.
- On save: if the current token lacks `calendar.events`, the permission
  popup opens (from the save click itself, so it isn't popup-blocked). If the
  user declines, an error is shown in the dialog and nothing is created —
  read access is unaffected.
- The calendar picker lists only calendars the user can write to
  (`accessRole` `owner`/`writer` from the same `calendarList` call used for
  fetching events) — primary first, marked "(ראשי)", then alphabetically.
  It defaults to primary, and after a save it preselects the last calendar
  used, for the rest of the visit. If the list failed to load, only the
  primary calendar is offered.
- The event is created with `events.insert` on the chosen calendar.
  Timed events send the wall-clock `dateTime` (no offset) plus the browser's
  IANA `timeZone`, so DST is resolved for the event's own date. All-day
  events use `date`, with the exclusive end date set to the next day.
- After a successful insert the events are refetched, so the new event
  appears in the grid, the day card and the 60-day list exactly as Google
  stored it.

## Auth control placement and prominence

The auth control (connection status + button) is **not** at the top of the
page/in a prominent card — it's placed as a small, low-key row **after** the
calendar, the detail card, and the events card, right before the page
footer. Rationale: the calendar itself is the most important thing on
screen, not the Google connection status.

## What happens without a connection

- If `CLIENT_ID` isn't configured in the code: an appropriate message is
  shown, the button is disabled.
- If the user isn't connected: the events card shows a "sign in to see your
  events" message, and calendar cells simply don't show blue chips
  (holidays still display normally).
