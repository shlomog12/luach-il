# Location and Daily Zmanim (Halachic Times)

## Location

- A predefined list of **20 locations in Israel** (common cities/towns +
  Maale Levona), each with `{name, lat, lon, elevation}` (elevation in
  meters above sea level).
- Default: **Jerusalem**.
- A "custom location" option: enter a name + latitude/longitude manually. On
  save, **elevation is fetched automatically** from a public service
  (Open-Meteo Elevation API) for the entered coordinates; if the lookup fails
  (e.g. offline), it falls back to elevation 0 (sea level) without blocking
  the save.
- The chosen location **persists locally** and loads automatically on future
  visits.
- Changing location happens via a dialog (`<dialog>`) opened from a "change
  location" button — the button **and** the "זמני היום לפי [location]" line
  both live inside the "זמני היום" `<details>` on the day-detail card (**not**
  in the page header), right above the times list — because that's exactly
  where the location matters. A select list + a custom-entry field that only
  appears when "other location..." is chosen.
  - Since the "זמני היום" card is rebuilt (fresh DOM) on every day selection,
    the "change location" button's click listener is re-attached **on every
    render** — there's no one-time wiring at startup.

## Zmanim calculation method

- **Not** calculated against a flat horizon/sea level ("שקיעה מישורית" —
  flat sunset) — calculated using the **location's actual elevation**
  ("שקיעה נראית" — visible sunset), matching the method yeshiva.org.il uses
  for its times. Practical effect: at a high-elevation location (e.g. Maale
  Levona, ~770m) sunrise "appears" earlier and sunset later (roughly 4
  minutes each way, season-dependent) compared to a flat calculation.
- The calculation itself is done via the `Location`/`Zmanim` classes of the
  `@hebcal/core` library (not an independent astronomical formula) — see
  [07](07-external-dependencies.md).
- There's **no** access to yeshiva.org.il's backend or any other third-party
  site for times — see the note in
  [07](07-external-dependencies.md#note-on-yeshivaorgil) for why (Cloudflare
  blocking + ethical considerations).

## Which times are shown

Shown **every day** (not just Shabbat), inside a collapsed `<details>` named
"זמני היום" on the day-detail card (see [05](05-ui-and-accessibility.md)):

1. Alot HaShachar / dawn (16.1°)
2. Sunrise (Netz)
3. Sof Zman Kriat Shema (Gr"a)
4. Sof Zman Tefilla (Gr"a)
5. Chatzot (midday)
6. Mincha Gedola
7. Mincha Ketana
8. Plag HaMincha
9. Sunset (Shkiah)
10. **Tzeit HaKochavim / nightfall** (8.5°) — on Shabbat only, labeled
    "**Tzeit Shabbat (Havdalah)**" instead (same time, different label)

In addition, **only on Fridays**: a "candle lighting" row (estimated — **30
minutes before sunset**, not 20 — this is the required value), shown **above**
the general times list (not inside it).

Times aren't shown on the calendar cell (grid) — only on a specific day's
detail card.

Below the times list (inside that same "זמני היום" `<details>`, **not** in
the page-wide footer) there's also a short credit line: "Hebrew dates,
holidays, and the weekly parsha (Israel calendar) are calculated using the
Hebcal library. Daily times are calculated astronomically for the
coordinates you chose (Gr"a method)." — placed there rather than in the
general header/footer, because it's specifically relevant to that card's
content.

## Possible future extensions (not implemented)

- Alternative zmanim opinions (Magen Avraham, etc.) — the library supports
  this, not exposed in the UI.
- Kiddush levana times, Taanit Esther, etc.
