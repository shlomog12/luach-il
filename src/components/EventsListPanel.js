// The "אירועים ביומן Google" disclosure card — the full 60-day upcoming list.
// The <details> wrapper itself is static markup in index.html (not touched here),
// so its open/closed state survives these content refreshes automatically.

import * as EventsStore from '../state/EventsStore.js';
import { GREG_MONTHS_SHORT } from '../config/constants.js';
import { fmtTime, fmtEventRange } from '../utils/dateFormat.js';
import { escapeHtml } from '../utils/html.js';

export class EventsListPanel {
  /** @param {{onEventSelected: (ev: object) => void}} deps */
  constructor({ boxEl }, { onEventSelected }) {
    this.boxEl = boxEl;
    this.onEventSelected = onEventSelected;
    EventsStore.onEventsChange(() => this.render());
    // Rows are re-rendered wholesale, so one delegated listener on the box.
    this.boxEl.addEventListener('click', (e) => {
      const row = e.target.closest('[data-ev]');
      if (row) this.onEventSelected(EventsStore.getEvents()[Number(row.dataset.ev)]);
    });
  }

  showLoading() {
    this.boxEl.innerHTML = `<div class="events-empty">טוען אירועים…</div>`;
  }

  showError(message) {
    this.boxEl.innerHTML = `<div class="err">שגיאה בטעינת האירועים (${message}). נסו "רענן" שוב.</div>`;
  }

  render() {
    const events = EventsStore.getEvents();
    if (!events.length) {
      this.boxEl.innerHTML = `<div class="events-empty">אין אירועים ב-60 הימים הקרובים.</div>`;
      return;
    }
    this.boxEl.innerHTML = events.map((ev, i) => {
      const d = ev.date;
      const dateStr = `${d.getDate()} ${GREG_MONTHS_SHORT[d.getMonth()]}`;
      const timeStr = ev.allDay ? '' : `, ${fmtTime(d)}`;
      const inner = `<span class="edate">${ev.multiDay ? fmtEventRange(ev) : dateStr + timeStr}</span><span class="etitle">${escapeHtml(ev.title)}</span>`;
      return ev.editable
        ? `<button class="event-item" type="button" data-ev="${i}" title="עריכה או מחיקה">${inner}</button>`
        : `<div class="event-item">${inner}</div>`;
    }).join('');
  }
}
