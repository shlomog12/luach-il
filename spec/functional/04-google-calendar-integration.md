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

In both the grid and the day-detail card, a multi-day event appears on
**every day it overlaps** (Google's end is exclusive, so an all-day event
ending on the 20th shows through the 19th), not only on its start day.
3. **"Events in Google Calendar" card (next 60 days)**: a full,
   chronologically sorted list, inside a `<details>` **collapsed by
   default**.

## Adding an event

- When connected, the day-detail card shows a "+ הוספת אירוע" button, which
  opens a dialog pre-filled with that day's date (the Hebrew date is shown
  next to the date field).
- Fields: title (required), target calendar, date, repeat, "all day" checkbox, start/end time
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
- **Repeat** (default "לא חוזר"), with labels naming the chosen date:
  - *By Gregorian date* — daily, weekly (same weekday), monthly (same day of
    month), yearly: created as **one recurring Google event** (`RRULE`), so
    it can be edited/deleted as a series in Google Calendar. Ends: never,
    after N times (≤ 999), or on a date (inclusive — `UNTIL` is a plain date
    for all-day events, the end of that local day in UTC for timed ones).
    Like Google itself, a monthly repeat on the 31st skips shorter months.
  - *By Hebrew date* — every Hebrew month / every Hebrew year on the same
    Hebrew day. Google's `RRULE` only knows the Gregorian calendar, so the
    occurrences are computed with hebcal and created as **separate events**
    (tagged with a shared `extendedProperties.private.luachSeriesId`), up to
    4 requests in parallel. Needs an end (after N times or on a date, max
    100 occurrences); a hint in the form says how many events will be
    created and when the last one is. Yearly follows hebcal's
    birthday/anniversary rules (`getBirthdayOrAnniversary`: Adar in leap
    years, 30 Cheshvan/Kislev in short years, etc.); monthly counts both
    Adar I and Adar II in a leap year, and day 30 falls back to the 29th in
    29-day months.
  - If only some of a Hebrew series fails to save, the dialog still closes
    (saving again would duplicate the ones that were created) and an alert
    says how many were created.
- After a successful insert the events are refetched, so the new event
  appears in the grid, the day card and the 60-day list exactly as Google
  stored it.

## Editing and deleting an event

- Events the user may change are clickable — in the day-detail card and in
  the 60-day list — and open the same dialog in edit mode ("עריכת אירוע").
  Changeable = the calendar is `owner`/`writer` **and** the user is the
  organizer (or the event allows guests to modify it). Other events (e.g.
  invitations from others) stay plain text.
- Title, date, all-day/times and description are pre-filled and editable.
  The calendar and the repeat rule can't be changed from here.
- Only fields that changed are sent (`events.patch`): if date/times weren't
  touched, only title and description are patched, so nothing else about the
  event is disturbed. `start`/`end` always carry both `date` and `dateTime`
  (one of them `null`) so an event can switch between all-day and timed.
- **Multi-day events**: the form only models single-day events, so for these
  only title and description are editable (date/time fields disabled, with a
  note).
- **Events in a series** — an instance of a Google recurring event
  (`recurringEventId`) or an event of a Hebrew-date series (`luachSeriesId`)
  — get a scope picker: "רק המופע הזה" (default) or "כל המופעים בסדרה".
  - *This one*: patch/delete just this event. For a Google recurring event
    that makes the instance an exception; the rest of the series is untouched.
  - *All*: the date field is locked (each occurrence keeps its own date); a
    time change applies to each on its own date. For a Google recurring event
    the series **master** is fetched and patched on its own (first) date, or
    deleted. For a Hebrew-date series, all its events are listed via
    `privateExtendedProperty=luachSeriesId=…` (past and future) and each is
    patched/deleted (4 in parallel). A partial failure closes the dialog and
    reports counts, like creation.
- **Delete** takes two clicks on the same button ("מחיקה" → "לחצו שוב
  למחיקה"), not a `confirm()` popup, so the confirming click is still a user
  gesture if Google's permission popup needs to open. A `410 Gone` (already
  deleted) counts as success.
- After any change the events are refetched.
- Event titles come from Google (anyone who invites the user controls them),
  so they are always HTML-escaped (`utils/html.js`) before going into
  `innerHTML` — in the grid chips, the day card and the list.

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
