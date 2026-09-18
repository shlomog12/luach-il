# Calendar Views and Navigation

## View mode: Hebrew / Gregorian

- Two modes: `heb` (Hebrew) and `greg` (Gregorian). Default: `heb`.
- Selected via two buttons ("עברי"/"לועזי") above the calendar; the active one
  is highlighted.
- The choice **persists locally** (see [06](06-persistence-and-storage.md)) —
  a return visit opens in whichever mode was last selected.
- Switching modes preserves "context continuity": switching from Gregorian to
  Hebrew mode jumps to the Hebrew month containing the Gregorian month that
  was shown, and vice versa.

## The month grid

### A single day cell

- A "primary" (large) number and a "secondary" (small) number/text beneath it:
  - In **Gregorian** mode: primary = Gregorian day (digits), secondary =
    Hebrew day+month (in gematriya, e.g. `ו׳ תשרי`).
  - In **Hebrew** mode: primary = Hebrew day (gematriya), secondary =
    abbreviated Gregorian day+month (e.g. `17 ספט`).
- Shabbat: the cell gets a distinct background/border (amber gradient), the
  primary number is bold and larger, and a "pill" with the parsha name is
  shown.
- Holiday: the cell background gets a **distinct amber tint** vs. regular
  cells (visually distinguishes a holiday from a regular day, even without
  clicking it).
- "Today": a highlighted border.
- Selected: a highlighted outline — matching is done by date key
  (`data-key`, Gregorian `YYYY-MM-DD` format), not by parsing the displayed
  text.
- Up to **2 "chips"** (small tags, Google-Calendar-style) per cell: holidays
  first (amber tint), then Google Calendar events (blue tint). If there are
  more, "**+N more**" is shown instead of the third chip onward. On a Shabbat
  cell with a parsha, there's room for only one extra chip (since the parsha
  pill already takes space).
- Clicking a cell → selects it as the "selected day" and refreshes the detail
  card.

### The navigation title (above the calendar)

Two text lines: "primary" (large) and "secondary" (small, beneath it):

| Mode | Primary | Secondary |
|---|---|---|
| Gregorian | Gregorian month name + year (`ספטמבר 2026`) | The **range** of Hebrew dates the Gregorian month overlaps (`ד׳ בתשרי – ד׳ בחשון תשצ״א`) — written entirely in Hebrew letters |
| Hebrew | Hebrew month name + year in gematriya (`תשרי תשפ״ז`) | The **range** of Gregorian dates the Hebrew month overlaps (`12 בספטמבר – 11 באוקטובר 2026`) |

Important: the "secondary" field in Hebrew mode contains both Western digits
and Hebrew words/a dash — see [05](05-ui-and-accessibility.md#bidi-direction)
for how that's handled so it doesn't render garbled.

## Month-navigation arrows

- **The left arrow** advances to the **next month**; **the right arrow** goes
  back to the **previous month**. (This is a deliberate choice matching RTL
  reading direction, not the "universal" LTR convention of
  left=back/right=forward.)
- **In Hebrew mode**: navigation advances/retreats **one Hebrew month** per
  click (including correct handling of Adar I/Adar II in a leap year and
  Hebrew year rollover).
- **In Gregorian mode**: navigation advances/retreats **one Gregorian month**
  per click.

## Jump to a specific date

- Two separate controls — one Gregorian and one Hebrew — live inside a
  collapsed `<details>` ("Jump to date") that appears above the calendar.
  Open/closed state is **not** persisted between visits (always starts
  closed).
- **Only the control matching the current view mode is shown** (Hebrew ↔
  Hebrew, Gregorian ↔ Gregorian) — never both at once.
- Each control is three scrollable dropdowns — day, month, year — plus a "Go"
  button. **No free-text typing** in any field.
  - Day/month: update dynamically based on the selected year/month (correct
    day count, including 29/30 for a Hebrew month and 28/29/30/31 for a
    Gregorian month; the Hebrew month list includes Adar I+II only in a leap
    year).
  - Year: a fixed, reasonable range — **5 years back to 15 years forward**
    from today (not infinite). In the Hebrew control, every option is shown
    **as letters** (gematriya, e.g. `תשפ״ו`), not a number — but the
    underlying value is the number (5786, etc.).
- **Both controls' defaults auto-update to whatever date is currently being
  viewed** (the cell selected on the calendar) — every time the selected day
  changes (clicking a cell, navigating months, switching view mode, or
  jumping itself). This applies to **both** controls at once, including the
  one currently hidden — so switching to the other mode already shows the
  current date as the default there too.
- Clicking "Go" jumps the calendar so the chosen date is shown and selected
  (highlighted).

## "Selected day" behavior (`selected`)

- By default, "today" is the initially selected day when the page loads.
- If you navigate to a month where the previous selection doesn't exist, the
  detail view shows the first day of the displayed month/Hebrew month (it
  doesn't stay "stuck" on a date outside the current view).
