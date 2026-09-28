// The only module that reads the `hebcal` global (loaded via the CDN <script> tag
// in index.html, before this module runs as part of main.js). Every other module
// imports HDate/gematriya/etc. from here rather than touching `window.hebcal`
// directly — a single seam if the underlying library ever needs to change.
//
// Pragmatic note vs. the original spec sketch: HDate itself is re-exported as a
// class rather than wrapped in a fully functional API (toHebrewDate/fromHebrewDate/
// etc.). HDate is a mature, well-tested class with a wide surface area (add(),
// daysInMonth(), greg(), ...); wrapping every method individually would add
// boilerplate without real abstraction value for an app that isn't going to swap
// out @hebcal/core. The higher-value abstractions (holiday/parsha lookup, Hebrew
// text formatting) ARE wrapped as plain functions below.

const { HDate, HebrewCalendar, flags: HFLAGS, Locale, gematriya } = window.hebcal;

export { HDate, gematriya };

export function hebMonthName(hd) {
  return Locale.hebrewStripNikkud(Locale.gettext(hd.getMonthName(), 'he'));
}

export function heDayStr(n) {
  return gematriya(n);
}

// Which event categories count as a "holiday tag" on a given day (parsha is
// handled separately, via getDayInfoRange's `parsha` field).
const HOLIDAY_FLAGS = HFLAGS.CHAG | HFLAGS.MINOR_HOLIDAY | HFLAGS.MODERN_HOLIDAY |
  HFLAGS.MINOR_FAST | HFLAGS.MAJOR_FAST | HFLAGS.SPECIAL_SHABBAT |
  HFLAGS.ROSH_CHODESH | HFLAGS.CHOL_HAMOED;

function cleanHebText(s) {
  return Locale.hebrewStripNikkud(s).replace(/\s+\d{4}$/, '');
}

/**
 * @param {Date} rangeStart
 * @param {Date} rangeEnd
 * @param {(d: Date) => string} toKey - date-key function, injected so this
 *   module doesn't need to import utils/dateFormat.js (which itself imports
 *   hebMonthName/heDayStr from here — importing toKey directly would cycle).
 * @returns {Map<string, {holidays: string[], parsha: string|null}>}
 */
export function getDayInfoRange(rangeStart, rangeEnd, toKey) {
  const map = new Map();
  const events = HebrewCalendar.calendar({ start: rangeStart, end: rangeEnd, il: true, sedrot: true, candlelighting: false });
  events.forEach(ev => {
    const key = toKey(ev.getDate().greg());
    const f = ev.getFlags();
    if (!map.has(key)) map.set(key, { holidays: [], parsha: null });
    const entry = map.get(key);
    if (f & HFLAGS.PARSHA_HASHAVUA) {
      entry.parsha = cleanHebText(ev.render('he')).replace(/^פרשת\s*/, '');
    } else if ((f & HOLIDAY_FLAGS) && !(f & HFLAGS.EREV)) {
      entry.holidays.push(cleanHebText(ev.render('he')));
    }
  });
  return map;
}

/** Hebrew-date recurrences can't be expressed as a Google RRULE, so they're expanded here. */
export const HEB_RECURRENCE_MAX = 100;

/**
 * The Gregorian dates of a recurrence by Hebrew date, starting with `start` itself.
 * - 'hyearly': same Hebrew day and month each year, per the halachic birthday/
 *   anniversary rules (Adar in leap years, 30 Cheshvan/Kislev in short years...).
 * - 'hmonthly': same Hebrew day each month (Adar I and Adar II both count in a
 *   leap year); day 30 falls back to the 29th in 29-day months.
 * Stops after `count` dates or past `until` (whichever is given), capped at
 * HEB_RECURRENCE_MAX.
 * @param {Date} start
 * @param {'hyearly'|'hmonthly'} freq
 * @param {{count?: number, until?: Date}} end
 * @returns {Date[]}
 */
export function hebrewRecurrenceDates(start, freq, { count, until }) {
  const limit = Math.min(count || HEB_RECURRENCE_MAX, HEB_RECURRENCE_MAX);
  const first = new HDate(start);
  const dates = [];
  let year = first.getFullYear();
  let month = first.getMonth();
  while (dates.length < limit) {
    let hd;
    if (dates.length === 0) {
      hd = first;
    } else if (freq === 'hyearly') {
      year++;
      hd = HebrewCalendar.getBirthdayOrAnniversary(year, first);
    } else {
      [year, month] = nextHebMonth(year, month);
      hd = new HDate(Math.min(first.getDate(), HDate.daysInMonth(month, year)), month, year);
    }
    const g = hd.greg();
    if (until && g > until) break;
    dates.push(g);
  }
  return dates;
}

// Hebrew months are numbered from Nisan (1) but the year turns over at Tishrei (7);
// a leap year has Adar I (12) followed by Adar II (13).
function nextHebMonth(year, month) {
  if (month === 6) return [year + 1, 7];
  if (month === 12 && HDate.isLeapYear(year)) return [year, 13];
  if (month === 12 || month === 13) return [year, 1];
  return [year, month + 1];
}
