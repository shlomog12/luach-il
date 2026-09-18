# Gradual Migration Plan

> **Update: the migration actually happened all at once, not gradually as
> planned here.** When asked to "implement it all" for real, the migration
> was done **in one shot** (every file written together) instead of the
> staged approach described below — with a comprehensive automated test
> suite (Puppeteer, a real browser via a local HTTP server, not jsdom —
> since ES modules don't load under `file://`) and visual screenshots
> **before** pushing, to compensate for not doing it in small steps. That
> worked, but it's a higher-risk approach than the gradual one described
> here — this document remains as a record of how it *could have* been done
> more safely, and is relevant to any future large architecture change.

**Goal**: migrate from the monolithic `index.html` to the structure
described in [01-target-file-structure.md](01-target-file-structure.md)
**without** the live site (`luach-il.netlify.app`) breaking at any
intermediate step. Every step ends in a deployable state, even if the
migration isn't finished.

## Step 0: preparation (before any structural change)

- Add the spec files (this document and its siblings) to the repo — **done**.
- Make sure there's a way to manually check the site after each step (a
  short manual checklist per the functional spec: does every feature work? —
  especially OAuth, which is the most sensitive to silent regressions).

## Step 1: extract pure utils, without touching `index.html`

- Create `src/utils/dateFormat.js` with `toKey`, `fmtTime`,
  `gregRangeLabel`, `hebRangeLabel` — **copied** (not moved) from the
  existing code, with unit tests.
- `index.html` **still doesn't** use this file — it just exists and passes
  tests, as a proof-of-concept for ES modules in the project.
- No change to the live site's behavior.

## Step 2: extract pure (non-DOM) services, still without wiring them in

- `HebrewCalendarService.js`, `ZmanimService.js`, `ElevationService.js` —
  each with unit tests confirming it produces **exactly** the same results
  as the equivalent code in the current `index.html` (a regression test, not
  just "it works").
- Still no actual connection to `index.html`.

## Step 3: replace one piece of `index.html` at a time (strangler fig)

Here `index.html` **does** change, but **one piece per commit**:

1. Add `<script type="module" src="src/main.js">` **alongside** the old
   `<script>` (not replacing it yet).
2. At this stage, `main.js` does exactly one thing: import
   `HebrewCalendarService` and use it **instead of** the equivalent code in
   the old script — e.g. replace only `heDayStr`/`hebMonthName` to use the
   new service, and confirm the site still looks identical.
3. Repeat this service by service: `ZmanimService`, then
   `GoogleAuthService` + `GoogleCalendarService`.
4. After each such commit — deploy to Netlify and manually check against
   the step-0 checklist before moving to the next step.

## Step 4: replace global state with stores

- Create the four stores ([03](03-state-management-pattern.md)).
- Replace every use of the global `VIEW_MODE`/`LOCATION`/`current`/
  `hebCursor`/`selected` with calls to the matching store — **in the old
  code still living in `index.html`**, not just in the new code. This is
  the step that needs the most care, since it touches many places in the
  existing code at once.
- Re-test the whole manual flow again (especially: switching view modes,
  jumping to a date, saving a custom location).

## Step 5: break rendering into components

- Extract every render function (`renderCalendarGrid`, `showDetail`,
  `renderEvents`, the dialog code, the jump-controls code) into its own
  component ([04](04-component-design.md)), one at a time, with each
  component registering itself with the relevant stores in `main.js`.
- Once a given component is "living" in a new module — delete the
  equivalent function from the old code still in `index.html`.

## Step 6: final cleanup

- Once `index.html` no longer contains any logic (just markup + a single
  `<script type="module" src="src/main.js">`) — delete the old `<script>`
  entirely.
- Extract the inline `<style>` block to `styles/main.css`.
- Update the [functional spec](../functional/) if any inaccuracies were
  discovered along the way (these documents need to stay an accurate source
  of truth).

## Overarching principle throughout

**Every commit leaves the site in a working, deployed state**. There's no
"broken intermediate stage" — if a given step needs more than one commit to
avoid breaking anything, split it into further sub-steps. This is exactly
the strangler-fig migration principle: replace a piece of the old code with
new code, gradually, while the whole system stays "alive" the entire time.
