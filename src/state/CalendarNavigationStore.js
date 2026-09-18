// Holds the calendar's navigation state: which Gregorian month is being browsed
// (`current`), which Hebrew month (`hebCursor`), and which specific day is
// selected. Also exposes derived "what period/date is currently on screen"
// getters so CalendarGrid, NavControls, and JumpToDatePanel all compute the same
// thing the same way instead of duplicating this logic.

import { HDate } from '../services/HebrewCalendarService.js';
import * as ViewModeStore from './ViewModeStore.js';

let current = new Date(); current.setDate(1); // Gregorian-mode cursor: always the 1st of the displayed month
let hebCursor = (() => {
  const hd = new HDate(new Date());
  return { month: hd.getMonth(), year: hd.getFullYear() };
})(); // Hebrew-mode cursor
let selected = new Date();

const listeners = new Set();
function notify() {
  listeners.forEach(fn => fn());
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getCurrent() { return current; }
export function getHebCursor() { return hebCursor; }
export function getSelected() { return selected; }

export function setSelected(dateObj) {
  selected = dateObj;
  notify();
}

/** direction: 1 = advance to next month, -1 = go back to previous month */
export function navigateMonth(direction) {
  if (ViewModeStore.getViewMode() === 'heb') {
    const hd = new HDate(1, hebCursor.month, hebCursor.year).add(direction, 'month');
    hebCursor = { month: hd.getMonth(), year: hd.getFullYear() };
  } else {
    current.setMonth(current.getMonth() + direction);
  }
  notify();
}

export function jumpToDate(dateObj) {
  selected = dateObj;
  if (ViewModeStore.getViewMode() === 'heb') {
    const hd = new HDate(dateObj);
    hebCursor = { month: hd.getMonth(), year: hd.getFullYear() };
  } else {
    current = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
  }
  notify();
}

// Switching view mode re-anchors the OTHER mode's cursor to the day actually
// being viewed (`selected`), not to `current` (always the 1st of the Gregorian
// month) — otherwise switching modes jumps to the start of the month instead of
// staying on the viewed date.
export function switchViewMode(mode) {
  if (mode === ViewModeStore.getViewMode()) return;
  if (mode === 'heb') {
    const hd = new HDate(selected);
    hebCursor = { month: hd.getMonth(), year: hd.getFullYear() };
  } else {
    current = new Date(selected.getFullYear(), selected.getMonth(), 1);
  }
  ViewModeStore.setViewMode(mode);
  notify();
}

export function getGregMonthInfo() {
  const year = current.getFullYear(), month = current.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return { year, month, firstDay, lastDay };
}

export function getHebMonthInfo() {
  const { month, year } = hebCursor;
  const firstHD = new HDate(1, month, year);
  const numDays = firstHD.daysInMonth();
  const firstGreg = firstHD.greg();
  const lastGreg = new HDate(numDays, month, year).greg();
  return { month, year, firstHD, numDays, firstGreg, lastGreg };
}

// The date the day-detail panel (and jump-control defaults) should show: the
// selected day if it falls within the currently displayed period, otherwise the
// first day of that period — mirrors the original app's per-render fallback,
// now centralized so every consumer resolves it the same way.
export function getDisplayDate() {
  if (ViewModeStore.getViewMode() === 'heb') {
    const { month, year, firstGreg } = getHebMonthInfo();
    const selHD = new HDate(selected);
    return (selHD.getMonth() === month && selHD.getFullYear() === year) ? selected : firstGreg;
  }
  const { year, month, firstDay } = getGregMonthInfo();
  return (selected.getMonth() === month && selected.getFullYear() === year) ? selected : firstDay;
}
