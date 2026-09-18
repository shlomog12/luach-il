# Design, Bidi Direction (RTL), and UI Components

## Theme

- Fixed dark mode — no light mode and no automatic system-preference
  detection. (This differs from Claude Artifacts' standard recommendation;
  this is a standalone site with no such constraint, and it's a deliberate
  decision: the colors are tuned for a "calendar/ember-amber" theme.)
- Fonts: `Frank Ruhl Libre` (headings, Hebrew serif) and `Heebo` (body text).
- Color palette: dark-blue background, amber/gold accents, green for
  "connected" status, red for errors, sky-blue for Google events.

## Bidi direction

The whole page is `dir="rtl"`. Two spots where mixed content (Hebrew +
Western digits + a dash) can render visually garbled due to the browser's
bidi algorithm, and how they're handled:

1. **Month-navigation arrows**: to avoid depending on RTL flexbox behavior
   (which can be misjudged), the arrow row (`.nav`) is explicitly set to
   `direction: ltr` — so DOM order (first/last child) always deterministically
   matches left/right visually, independent of the page's overall
   direction.
2. **The nav title itself** (`.nav .title`): since `.nav` is `direction:
   ltr` (for the arrow layout above), its children would inherit that `ltr`
   — which garbles mixed digit+Hebrew content (see item 3 below). `.nav
   .title` is explicitly set back to `direction: rtl` to stop that
   inheritance. This was the actual root cause of a real, reported bug (the
   Gregorian-range subtitle shown in Hebrew view rendered out of order) —
   two earlier fix attempts (forcing `direction: ltr` directly on the
   subtitle, then wrapping it in Unicode isolate marks) both targeted the
   wrong layer and one of them made the ordering worse; the plain,
   unmodified text renders correctly on its own once the inherited `ltr` is
   removed.
3. **The "secondary" title line in month navigation** (the range shown below
   the month name): when it holds a Gregorian range (digits + Hebrew month
   names + a dash, e.g. `12 בספטמבר – 11 באוקטובר 2026`) — thanks to fix #2
   above, it now renders correctly under plain, default RTL, with no
   direction override or isolate marks needed on the string itself. When it
   holds a **Hebrew** range (written entirely in gematriya letters, no
   Western digits at all) — there was never any bidi mixing to begin with.
4. **Day numbers in the calendar cell** (`.cell .g`): fixed `direction: ltr`
   in CSS, so a two-digit number displays in the right order inside a small
   cell.

**General principle**: don't force `ltr` on text that's **entirely** Hebrew
(even if it contains gematriya/gershayim characters) — that's unnecessary and
can be confusing. Only force `ltr` when there's an actual mix of Western
digits + Hebrew words + a separator (dash) **in the same string** — and even
then, check whether the real fix is removing an *inherited* direction rather
than adding an override.

## The Disclosure pattern (expand/collapse)

Three places in the app use the browser's native `<details>`/`<summary>`
element (not custom JS) to collapse heavy content:

| Location | Initial state | Persisted between interactions? |
|---|---|---|
| "Events in Google Calendar" card | Collapsed | Yes — naturally (its DOM isn't rebuilt, only the inner content updates) |
| "זמני היום" on the day-detail card | Collapsed | Yes — **explicitly via localStorage** (`luach_zman_open`), because the whole card is rebuilt on every day selection |
| "Jump to date" | Collapsed | Not persisted — always starts collapsed on page load |

Shared base styling for all three: a small amber arrow (▾) that rotates 180°
when open, with the browser's default "triangle" marker removed. But **"Jump
to date" is deliberately different** from the other two: it **looks like an
actual clickable button** — background (`--panel-2`), border, rounded
corners, and a 📅 icon — rather than plain text with just a small arrow.
Reason: user feedback that this toggle wasn't clear enough as an interactive
element when styled like the other two (small, subtle text). "Events in
Google Calendar" and "זמני היום" stay in the more restrained style (small
text + arrow), since they're headings inside an existing card, not
standalone opener buttons.

## Principle: content placement follows context, not "traditional fixed
location"

Content leaves its "traditional" spot (header/footer) in favor of wherever
it's **actually relevant**, even if that departs from convention (e.g. "the
whole site depends on a top header, a fixed footer at the bottom"). Examples
already applied:

- The "זמני היום לפי [location] · change location" line — **not** in the
  page header, but inside the "זמני היום" card itself (see
  [03](03-zmanim.md)), because it's only relevant there.
- The Hebcal/calculation-method credit line — **not** in the general footer,
  but in that same card, below the times list.
- The Google auth control — **not** in a prominent card at the top of the
  page, but a small row near the bottom (see
  [04](04-google-calendar-integration.md)) — because the calendar itself
  matters more than the connection status.

**The page footer** (the general one, at the very bottom) stays reserved only
for content that's **truly** global and not tied to a specific card —
currently: creation credit and contact details:

> Built and maintained privately · Contact: `shlomog12@gmail.com`
> (`mailto:` link) · Privacy policy link

## Progressive Web App (PWA)

- `manifest.json` defines name, icon, and standalone display.
- `sw.js` (service worker): **network-first** strategy for all same-origin
  requests (tries the network first, falls back to cache only if the network
  fails — not meant to block updates). Cross-origin requests (Google APIs,
  the hebcal CDN, Google Fonts) are **not** intercepted by the service worker
  at all — handled directly by the browser.
- The cache name (`CACHE`) is bumped with every significant change to the
  shell (`index.html`/`src/`/`styles/`) so a new version takes effect for
  users who've added the site to their home screen.
- iOS Safari ignores manifest.json's `name`/`short_name` for the "Add to Home
  Screen" label — it needs the `apple-mobile-web-app-title` meta tag
  specifically (it otherwise falls back to the `<title>` tag).
