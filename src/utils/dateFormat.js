// Pure formatting functions — no state, no DOM, no side effects.

import { hebMonthName, heDayStr, gematriya } from '../services/HebrewCalendarService.js';
import { GREG_MONTHS } from '../config/constants.js';

export function toKey(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
}

export function fmtTime(d) {
  return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
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
