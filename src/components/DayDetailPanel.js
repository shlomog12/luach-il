// The "detail" card for the currently displayed day: a always-visible block of
// that day's parsha/holidays/Google events, plus a collapsible "זמני היום"
// section with the full daily zmanim list, a location line, and a credit note.

import * as ViewModeStore from '../state/ViewModeStore.js';
import * as NavStore from '../state/CalendarNavigationStore.js';
import * as LocationStore from '../state/LocationStore.js';
import * as ZmanStore from '../state/ZmanimDisclosureStore.js';
import * as EventsStore from '../state/EventsStore.js';
import { HDate, hebMonthName, heDayStr, gematriya, getDayInfoRange } from '../services/HebrewCalendarService.js';
import { getDailyZmanim } from '../services/ZmanimService.js';
import { GREG_MONTHS, WEEKDAY_HE } from '../config/constants.js';
import { toKey, fmtTime } from '../utils/dateFormat.js';

export class DayDetailPanel {
  /**
   * @param {{containerEl: HTMLElement}} els
   * @param {{onChangeLocationRequested: () => void}} deps
   */
  constructor({ containerEl }, { onChangeLocationRequested }) {
    this.containerEl = containerEl;
    this.onChangeLocationRequested = onChangeLocationRequested;
    NavStore.onChange(() => this.render());
    ViewModeStore.onViewModeChange(() => this.render());
    LocationStore.onLocationChange(() => this.render());
    EventsStore.onEventsChange(() => this.render());
    this.render();
  }

  render() {
    const dateObj = NavStore.getDisplayDate();
    const key = toKey(dateObj);
    const hd = new HDate(dateObj);
    const isSaturday = dateObj.getDay() === 6;
    const isFriday = dateObj.getDay() === 5;

    let html = `<div class="dhead">${WEEKDAY_HE[dateObj.getDay()]}, ${dateObj.getDate()} ב${GREG_MONTHS[dateObj.getMonth()]} ${dateObj.getFullYear()}</div>`;
    html += `<div class="dsub">${heDayStr(hd.getDate())} ב${hebMonthName(hd)} ${gematriya(hd.getFullYear())}</div>`;

    const info = getDayInfoRange(dateObj, dateObj, toKey).get(key) || { holidays: [], parsha: null };
    const dayEvents = EventsStore.getEvents().filter(ev => toKey(ev.date) === key);

    // --- This day's events/holidays: the thing you actually clicked for, always visible ---
    let eventsHtml = '';
    if (isSaturday && info.parsha) {
      eventsHtml += `<div class="parsha">פרשת ${info.parsha}</div>`;
    }
    if (info.holidays.length) {
      eventsHtml += `<div class="holidays">` + info.holidays.map(h => `<span class="holiday-tag">${h}</span>`).join('') + `</div>`;
    }
    if (dayEvents.length) {
      eventsHtml += `<div class="holidays">` + dayEvents.map(ev => `<span class="holiday-tag">${ev.allDay ? '' : fmtTime(ev.date) + ' · '}${ev.title}</span>`).join('') + `</div>`;
    }
    if (!eventsHtml) {
      eventsHtml = `<div class="events-empty">אין אירועים או חגים ביום זה.</div>`;
    }
    html += `<div class="day-events">${eventsHtml}</div>`;

    // --- Daily halachic times: shown every day, but collapsed by default so it
    // doesn't bury the events above ---
    const location = LocationStore.getLocation();
    const z = getDailyZmanim(dateObj, location);
    let zmanHtml = `<div class="zman-loc-row">זמני היום לפי <span id="locLabel">${location.name}</span> · <button class="loc-link" id="locBtn" type="button">שנה מיקום</button></div>`;
    if (isFriday) {
      zmanHtml += `<div class="row"><span class="label">הדלקת נרות (משוער, שקיעה פחות 30 ד')</span><span class="val">${fmtTime(z.candleLighting)}</span></div>`;
    }
    const rows = [
      ['עלות השחר', z.alotHaShachar], ['הנץ החמה', z.sunrise],
      ["סוף זמן ק״ש (גר\"א)", z.sofZmanShma], ["סוף זמן תפילה (גר\"א)", z.sofZmanTfilla],
      ['חצות היום', z.chatzot], ['מנחה גדולה', z.minchaGedola], ['מנחה קטנה', z.minchaKetana],
      ['פלג המנחה', z.plagHaMincha], ['שקיעה', z.sunset],
      [isSaturday ? 'צאת השבת (הבדלה)' : 'צאת הכוכבים', z.tzeitHakochavim],
    ];
    zmanHtml += rows.map(([label, d]) => `<div class="row"><span class="label">${label}</span><span class="val">${fmtTime(d)}</span></div>`).join('');
    zmanHtml += `<p class="zman-credit">
      תאריכים עבריים, חגים ופרשת השבוע (לוח ישראל) מחושבים באמצעות ספריית
      <a href="https://www.hebcal.com" target="_blank" rel="noopener">Hebcal</a>.
      זמני היום מחושבים אסטרונומית לקואורדינטות שבחרתם (שיטת הגר"א).
    </p>`;
    html += `<details class="zman-details"${ZmanStore.isZmanOpen() ? ' open' : ''}><summary>זמני היום</summary>${zmanHtml}</details>`;

    this.containerEl.innerHTML = html;

    const zd = this.containerEl.querySelector('.zman-details');
    if (zd) zd.addEventListener('toggle', () => ZmanStore.setZmanOpen(zd.open));
    // #locBtn is regenerated on every render, so its listener is (re-)attached here
    // rather than once — main.js wires onChangeLocationRequested to LocationDialog.open().
    this.containerEl.querySelector('#locBtn').addEventListener('click', () => this.onChangeLocationRequested());
  }
}
