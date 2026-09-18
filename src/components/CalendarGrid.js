// Renders the weekday-grid of day cells for whichever month/mode is current.
// Owns click->selection wiring; doesn't know about the day-detail panel at all —
// selecting a cell just updates CalendarNavigationStore, and whoever cares
// (DayDetailPanel, JumpToDatePanel) reacts via its own subscription.

import * as ViewModeStore from '../state/ViewModeStore.js';
import * as NavStore from '../state/CalendarNavigationStore.js';
import * as EventsStore from '../state/EventsStore.js';
import { HDate, hebMonthName, heDayStr, getDayInfoRange } from '../services/HebrewCalendarService.js';
import { GREG_MONTHS_SHORT } from '../config/constants.js';
import { toKey } from '../utils/dateFormat.js';

export class CalendarGrid {
  constructor({ gridEl }) {
    this.gridEl = gridEl;
    this.todayStr = new Date().toDateString();
    this.dayInfo = new Map();
    NavStore.onChange(() => this.render());
    ViewModeStore.onViewModeChange(() => this.render());
    EventsStore.onEventsChange(() => this.render());
    this.render();
  }

  render() {
    if (ViewModeStore.getViewMode() === 'heb') this._renderHebMonth();
    else this._renderGregMonth();
  }

  _renderGregMonth() {
    const { year, month, firstDay, lastDay } = NavStore.getGregMonthInfo();
    this.dayInfo = getDayInfoRange(firstDay, lastDay, toKey);

    this.gridEl.innerHTML = "";
    const startOffset = firstDay.getDay();
    const totalDays = lastDay.getDate();
    for (let i = 0; i < startOffset; i++) this._appendEmptyCell();
    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(year, month, d);
      const he = new HDate(dateObj);
      this._renderDayCell(dateObj, String(d), `${heDayStr(he.getDate())} ${hebMonthName(he)}`);
    }
  }

  _renderHebMonth() {
    const { month: hMonth, year: hYear, numDays, firstGreg, lastGreg } = NavStore.getHebMonthInfo();
    this.dayInfo = getDayInfoRange(firstGreg, lastGreg, toKey);

    this.gridEl.innerHTML = "";
    const startOffset = firstGreg.getDay();
    for (let i = 0; i < startOffset; i++) this._appendEmptyCell();
    for (let d = 1; d <= numDays; d++) {
      const hd = new HDate(d, hMonth, hYear);
      const dateObj = hd.greg();
      this._renderDayCell(dateObj, heDayStr(d), `${dateObj.getDate()} ${GREG_MONTHS_SHORT[dateObj.getMonth()]}`);
    }
  }

  _appendEmptyCell() {
    const c = document.createElement('div');
    c.className = 'cell empty';
    this.gridEl.appendChild(c);
  }

  _renderDayCell(dateObj, bigLabel, smallLabel) {
    const key = toKey(dateObj);
    const isShabbat = dateObj.getDay() === 6;
    const info = this.dayInfo.get(key) || { holidays: [], parsha: null };
    const dayEvents = EventsStore.getEvents().filter(ev => toKey(ev.date) === key);

    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.key = key;
    if (isShabbat) cell.classList.add('shabbat');
    if (dateObj.toDateString() === this.todayStr) cell.classList.add('today');
    if (info.holidays.length) cell.classList.add('holiday');
    if (key === toKey(NavStore.getDisplayDate())) cell.classList.add('selected');

    let inner = `<div class="g">${bigLabel}</div><div class="h">${smallLabel}</div>`;
    if (isShabbat && info.parsha) {
      inner += `<div class="parsha">${info.parsha}</div>`;
    }

    // Small title chips (like a Google Calendar month cell): holidays first, then events.
    const chips = [];
    info.holidays.forEach(h => chips.push(`<div class="chip hol">${h}</div>`));
    dayEvents.forEach(ev => chips.push(`<div class="chip ev">${ev.title}</div>`));
    const maxChips = (isShabbat && info.parsha) ? 1 : 2;
    const shown = chips.slice(0, maxChips);
    const extra = chips.length - shown.length;
    let itemsHtml = shown.join('');
    if (extra > 0) itemsHtml += `<div class="chip more">+${extra} נוספים</div>`;
    if (itemsHtml) inner += `<div class="items">${itemsHtml}</div>`;

    cell.innerHTML = inner;
    cell.addEventListener('click', () => NavStore.setSelected(dateObj));
    this.gridEl.appendChild(cell);
  }
}
