# Principles: Clean Code and SOLID in This App

This document is **not** a general theory of SOLID — it explains how each
principle shows up **in the pre-refactor code** (the monolithic
`index.html`) and what it practically meant for the structure proposed in
[01](01-target-file-structure.md) onward — a structure that has since been
**fully implemented** (see `src/`).

## The pre-refactor state: why it was problematic

All the logic — configuration, global state, services (holidays/zmanim/
location/Google), DOM rendering, and event handling — lived in a single
`<script>` inside `index.html` (about 900 lines). Typical symptoms:

- **Scattered mutable global variables**: `current`, `hebCursor`,
  `selected`, `EVENTS`, `LOCATION`, `VIEW_MODE`, `CURRENT_DAY_INFO` — any of
  them could change from anywhere in the file, and it was hard to know who
  was responsible for updating what, when.
- **Non-declarative rendering**: after every state change you had to
  **manually remember** to call `renderCalendarGrid()` (or `showDetail()`)
  — if you forgot to call it somewhere new, the UI just wouldn't update, with
  no error.
- **Mixed layers**: a function like `renderDayCell` computed business
  information (which holidays/events apply to that day), built HTML, *and*
  registered an event listener — three different responsibilities in one
  function.
- **Direct dependency on `@hebcal/core` everywhere** via the global
  `hebcal` — hard to swap implementations, hard to test without loading the
  whole library.

## SRP — Single Responsibility Principle

**"A module should have only one reason to change."**

Example from the pre-refactor code: `showDetail()` used to be responsible
for 5 different things at once: highlighting the selected grid cell,
computing Hebrew/holiday info, computing daily zmanim, building the detail
HTML, **and also** syncing the "jump to date" controls' defaults
(`syncJumpDefaults`). A change to how times are styled shouldn't have to
touch the code that syncs dropdowns — those are two different reasons to
change, and therefore two responsibilities that belong in separate places.

**Implementation**: each "service" (holidays, zmanim, Google, location) gets
its own module that does **one thing** and knows nothing about the DOM. Each
"component" (UI element) knows how to render **one thing** and doesn't
compute business logic itself — see [02](02-module-responsibilities.md) and
[04](04-component-design.md).

## OCP — Open/Closed Principle

**"Open for extension, closed for modification."**

Example: previously, adding an alternative zmanim calculation method (say,
Magen Avraham instead of Gr"a) meant editing `getZmanim()` directly and
adding an `if`. In the module structure, `ZmanimService` would take a
calculation strategy (interface) as a parameter — adding a new method means
adding a new file that implements the same interface, without touching
existing code.

Another example: the "Hebrew"/"Gregorian" views — if a third calendar system
is ever wanted (say, an Islamic calendar), it's better for each "view
strategy" (`CalendarViewStrategy`) to implement the same contract
(`getTitle()`, `getGridDays()`, `navigate(direction)`) so the code that
navigates between months **doesn't change** when a third view is added.

## LSP — Liskov Substitution Principle

**"Any implementation of an interface must be substitutable without
breaking the contract."**

If `HebrewCalendarViewStrategy` and `GregorianCalendarViewStrategy` both
implement `CalendarViewStrategy`, code that uses the strategy (e.g. a
`CalendarNavigationController`) must behave identically no matter which one
was injected — including edge cases (e.g. what happens when the "selected
day" doesn't exist in the target month). This is a rule that should be
verified with unit tests shared between both implementations (contract
tests), not just separate tests for each.

## ISP — Interface Segregation Principle

**"Prefer several small, focused interfaces over one large one."**

Example: **don't** create one giant `CalendarService` that holds Google
event fetching, zmanim calculation, *and* location management all together.
A module that only needs to know "what time is sunset today" shouldn't have
to depend on (import) code for Google OAuth too. Splitting things up per
[02-module-responsibilities.md](02-module-responsibilities.md) ensures every
consumer depends only on what it actually needs.

## DIP — Dependency Inversion Principle

**"High-level modules shouldn't depend on low-level concrete
implementations — both should depend on an abstraction."**

A critical example: `renderDayCell`, `showDetail`, `buildDayInfo`, etc. used
to call `hebcal.HDate`, `hebcal.HebrewCalendar`, etc. directly — meaning the
rendering code was **directly coupled** to a specific third-party library.
In the module structure:

- `HebrewCalendarService` is the sole abstraction that knows about
  `@hebcal/core`.
- UI components depend on `HebrewCalendarService` (an abstract interface),
  not on the global `hebcal` directly.
- Practical benefit: a mock version of the service can be injected in tests
  without loading the entire CDN bundle, and if the library is ever swapped
  out, only one file changes.

## Clean Code — additional rules that don't fall under SOLID

- **Meaningful names**: `hebCursor` is better than `hc`; a function that
  returns a boolean starts with `is`/`has` (`isShabbat`, not `shabbat`).
- **Small functions, a single level of abstraction**: a function shouldn't
  both "compute dates" *and* "build an HTML string" *and* "register an event
  listener" (see the `showDetail` example above).
- **Avoiding magic numbers/repeated strings**: `maxChips`, `YEAR_SPAN_BACK`,
  etc. were already extracted as constants in the pre-refactor code — a good
  trend worth continuing across all new modules (e.g.: localStorage keys as
  one set of shared constants everyone imports, not repeated string literals
  in each file).
- **Consistent error handling**: previously every use of
  `localStorage`/`fetch` was wrapped in its own ad-hoc `try/catch`,
  reimplemented every time. This should be centralized in one wrapper
  (`safeStorage.js`) — see [05-coding-standards.md](05-coding-standards.md).

## What **doesn't** change — the "no server" principle stays

Important: none of these principles require adding a server/backend/heavy
build tool. The structure used (native ES modules, see
[01-target-file-structure.md](01-target-file-structure.md)) preserves the
exact same deployment simplicity that existed before — static files only.
