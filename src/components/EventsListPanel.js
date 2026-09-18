// The "אירועים ביומן Google" disclosure card — the full 60-day upcoming list.
// The <details> wrapper itself is static markup in index.html (not touched here),
// so its open/closed state survives these content refreshes automatically.

import * as EventsStore from '../state/EventsStore.js';
import { GREG_MONTHS_SHORT } from '../config/constants.js';
import { fmtTime } from '../utils/dateFormat.js';

export class EventsListPanel {
  constructor({ boxEl }) {
    this.boxEl = boxEl;
    EventsStore.onEventsChange(() => this.render());
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
    this.boxEl.innerHTML = events.map(ev => {
      const d = ev.date;
      const dateStr = `${d.getDate()} ${GREG_MONTHS_SHORT[d.getMonth()]}`;
      const timeStr = ev.allDay ? '' : `, ${fmtTime(d)}`;
      return `<div class="event-item"><span class="edate">${dateStr}${timeStr}</span><span class="etitle">${ev.title}</span></div>`;
    }).join('');
  }
}
