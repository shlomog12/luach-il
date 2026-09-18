# Breaking Down UI Components

## What counts as a "component" here

Without a framework — a component is a class/factory function that receives
**one DOM container** and is responsible for everything that happens inside
it: rendering, updating, and registering event listeners **only on elements
within its assigned container**. No component touches DOM outside the
container it was given.

## Shared contract for every component

```
constructor(container, dependencies)  // dependencies = the stores/services it needs
render()                               // draws/updates its internal DOM
destroy()                              // (optional) cancels subscriptions, cleans up listeners
```

A component **doesn't** call `document.getElementById` itself to find its
container — it's injected via the constructor from `main.js`. This is what
makes it testable: it can be created in a test with an artificial container
(JSDOM) without loading the whole page.

## The component list and their responsibilities

### `CalendarGrid`
Renders the month grid (weekday header + day cells). Depends on
`CalendarNavigationStore`, `ViewModeStore`, `HebrewCalendarService`, and the
current events array (injected/read from a `GoogleCalendarService` cache).
When a cell is clicked — it does **not** call `DayDetailPanel.render()`
directly; instead it calls `CalendarNavigationStore.setSelected(date)`, and
`DayDetailPanel` itself is subscribed to that change.

### `DayDetailPanel`
Renders the "day detail" card: an always-visible events/holidays block +
a `<details>` for daily zmanim. Depends on `CalendarNavigationStore` (which
day is selected), `HebrewCalendarService`, `ZmanimService`, `LocationStore`,
`ZmanimDisclosureStore` (to remember whether the details are open), and the
Google events array. **Doesn't** know how Google events are obtained — only
reads from the cache injected into it.

### `EventsListPanel`
Renders the "Events in Google Calendar" card (the 60-day list). Depends on
`GoogleCalendarService` (or a shared cache it populates). Has **exclusive
ownership** of its `<details>` — no other component touches it.

### `LocationDialog`
Renders the location picker/edit dialog. Depends on `LocationStore` (read/
write) and `ElevationService` (to look up elevation for a custom location).
Calls `LocationStore.set(...)` when done — it does **not** call
`CalendarGrid` or `DayDetailPanel` directly to "refresh the times"; they
update themselves via their own subscription to `LocationStore`.

### `JumpToDatePanel`
Renders the two jump controls (Hebrew/Gregorian) inside a shared
`<details>`. Depends on `ViewModeStore` (which control to show),
`CalendarNavigationStore` (to read the selected day for defaults, and to
write to it on "Go"), `HebrewCalendarService` (to build the day/month/year
lists). Subscribes to both `ViewModeStore` and `CalendarNavigationStore` —
when either changes, it re-syncs the dropdowns' defaults.

### `ModeToggle`
The two "Hebrew"/"Gregorian" buttons. Depends only on `ViewModeStore`. The
simplest component — a good example of the minimum a component needs.

### `NavControls`
The month-navigation arrows + the title (primary/secondary). Depends on
`CalendarNavigationStore`, `ViewModeStore`, `HebrewCalendarService` (to
build the date ranges for the title). Also responsible for deciding which
direction (`ltr`/default) the secondary field needs — see
[00-principles.md](00-principles.md) and the bidi note in
[../functional/05-ui-and-accessibility.md](../functional/05-ui-and-accessibility.md).

### `AuthStatusBar`
The Google-connection row at the bottom of the page. Depends only on
`GoogleAuthService` (subscribes to `onAuthChange`). Knows **nothing** about
events/the calendar — its job is limited to status + a button.

## Principle: components don't talk directly to each other

The most important rule in this chapter: **communication between components
always goes through shared state (stores) or events, never through direct
calls**. If component A "needs component B to update" — the right solution
is for both to subscribe to the same store, not for A to hold a reference to
B and call `B.render()` directly. This is what allows adding/removing
components without changing existing code (OCP), and what makes every
component testable in isolation with mock stores.
