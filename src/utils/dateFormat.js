// Pure formatting functions — no state, no DOM, no side effects.

import { hebMonthName, heDayStr, gematriya } from '../services/HebrewCalendarService.js';
import { GREG_MONTHS, GREG_MONTHS_SHORT } from '../config/constants.js';

export function toKey(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
}

/** Inverse of toKey: 'YYYY-MM-DD' -> local-midnight Date, or null if incomplete. */
export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return (y && m && d) ? new Date(y, m - 1, d) : null;
}

/** 'YYYY-MM-DD' shifted by n days. */
export function addDaysKey(key, n) {
  const d = fromKey(key);
  return toKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

/** Whole days from key a to key b (DST-safe). */
export function daysBetweenKeys(a, b) {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

export function fmtTime(d) {
  return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

/**
 * "18 אוק 20:00 – 19 אוק 10:00" (timed) or "18 אוק – 19 אוק" (all-day), for a
 * multi-day event. An all-day event's end is exclusive, so its last day is end - 1.
 */
export function fmtEventRange(ev) {
  const day = (d) => `${d.getDate()} ${GREG_MONTHS_SHORT[d.getMonth()]}`;
  if (ev.allDay) {
    const last = new Date(ev.end.getFullYear(), ev.end.getMonth(), ev.end.getDate() - 1);
    return `${day(ev.date)} – ${day(last)}`;
  }
  return `${day(ev.date)} ${fmtTime(ev.date)} – ${day(ev.end)} ${fmtTime(ev.end)}`;
}

// This mixed digit+Hebrew-word range renders correctly under plain, default RTL
// as long as its container isn't inheriting a stray direction:ltr (see NavControls
// / styles — .nav .title has an explicit direction:rtl for exactly this reason).
// Forcing ltr directly on this string, or wrapping it in Unicode isolate marks,
// both actively broke the ordering — confirmed empirically with local screenshots.
export function gregRangeLabel(a, b) {
  const fmt = (d) => `${d.getDate()} ב${GREG_MONTHS[d.getMonth()]}`;
  if (a.getFullYear() === b.getFullYear()) {
    return `${fmt(a)} – ${fmt(b)} ${a.getFullYear()}`;
  }
  return `${fmt(a)} ${a.getFullYear()} – ${fmt(b)} ${b.getFullYear()}`;
}

// Pure Hebrew-letter range (day/month/year all as gematriya) — no Western digits,
// so it reads correctly under normal RTL without any direction override.
export function hebRangeLabel(a, b) { // a, b are HDate
  const fmt = (hd) => `${heDayStr(hd.getDate())} ב${hebMonthName(hd)}`;
  if (a.getFullYear() === b.getFullYear()) {
    return `${fmt(a)} – ${fmt(b)} ${gematriya(a.getFullYear() % 1000)}`;
  }
  return `${fmt(a)} ${gematriya(a.getFullYear() % 1000)} – ${fmt(b)} ${gematriya(b.getFullYear() % 1000)}`;
}
