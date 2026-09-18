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
