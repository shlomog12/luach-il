# Hebrew Calendar: Dates, Holidays, Weekly Parsha

## Calculation source

All Hebrew-calendar calculations (Hebrew↔Gregorian conversion, holidays,
weekly parsha, Hebrew month arithmetic including leap years) are done via the
**`@hebcal/core`** library, not a hand-rolled formula. There's no date-range
limit (unlike an earlier version of the app, which relied on a hardcoded
"anchor" table valid only for 2025–2027).

## Date conversion

- Any Gregorian date can be converted to a Hebrew date (`HDate`) and back,
  with no range limit (past or future).
- Hebrew day/year numbers are always shown **in gematriya** (Hebrew letters
  with standard gershayim, e.g. `ט״ו`, `תשפ״ז`), never as digits.
- Hebrew month names are shown without niqqud (`תשרי`, not `תִּשְׁרֵי`).
- In a leap year, "Adar I" and "Adar II" are shown as two separate months; in
  a regular year, just "Adar".

## Holidays and observances

Shown (as a text tag + a visual marker on the calendar cell):
- Biblical/rabbinic holidays (CHAG)
- Minor/modern holidays (MINOR_HOLIDAY, MODERN_HOLIDAY — e.g. Yom
  Ha'atzmaut, Yom Yerushalayim)
- Minor/major fasts (MINOR_FAST, MAJOR_FAST)
- Special Shabbatot (SPECIAL_SHABBAT — e.g. "Shabbat Shuva", "Shabbat
  HaGadol")
- Rosh Chodesh (ROSH_CHODESH) — including both days when Rosh Chodesh falls
  on two days
- Chol HaMoed (CHOL_HAMOED)

**Not** shown as a separate tag (to avoid information overload):
- "Erev" a holiday (EREV) — e.g. "Erev Yom Kippur" doesn't appear as a
  separate tag on the day before
- Omer count, daily daf/mishna/yerushalmi/tanach, molad, Shabbat Mevarchim —
  not relevant to a general calendar app

Holiday names are shown without niqqud, and without the "5787"/year suffix
some event names include (stripped automatically).

## Weekly parsha

- Shown only on Saturdays (PARSHA_HASHAVUA), per the **Israel** reading cycle
  (not Diaspora — no doubled portions from that split).
- On the calendar cell (grid): just the parsha name, without the word
  "Parashat" (e.g. `Nitzavim-Vayeilech`).
- On the day-detail card: shown as "Parashat [name]" (e.g. `Parashat
  Nitzavim-Vayeilech`).
- If that Saturday is also a "special Shabbat" (e.g. "Shabbat Shuva") — that
  shows up separately as a regular holiday tag (not merged into the parsha
  text).

## Known limitations

- No Diaspora calendar support — deliberately targets the "Israel calendar"
  only.
- No molad time, Omer count, or daily-learning calendar (daf yomi, etc.) shown.
