# Google Calendar Sync

## Feature goal

If a user adds an event to their Google Calendar, the event **also appears on
the site's calendar** — with no action needed from the user beyond opening
the site.

## Authentication (OAuth)

- Uses **Google Identity Services** (`google.accounts.oauth2`), the **token
  client** (implicit) flow — **not** the authorization-code flow — meaning
  there's **no** `client_secret` at all, and no Authorized redirect URIs
  (only Authorized JavaScript origins).
- Scope: `https://www.googleapis.com/auth/calendar.readonly` — read only.
  No ability to add/edit events from the site. (For write access, the scope
  would need to be consciously extended to `.../auth/calendar` plus an
  event-creation form added; that's a separate product decision, not
  implemented.)
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
