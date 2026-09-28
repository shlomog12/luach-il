// The "הוספת אירוע" dialog: a small form (title, target calendar, date,
// all-day or start/end time, repeat, description) that hands the result to
// onSave. Doesn't know about Google at all — main.js wires onSave to
// GoogleAuthService + GoogleCalendarService.

import { HDate, hebMonthName, heDayStr, gematriya, hebrewRecurrenceDates, HEB_RECURRENCE_MAX } from '../services/HebrewCalendarService.js';
import { toKey, fromKey } from '../utils/dateFormat.js';
import { GREG_MONTHS, WEEKDAY_HE } from '../config/constants.js';

const HEB_FREQS = ['hyearly', 'hmonthly'];
const GREG_COUNT_MAX = 999;
const DEFAULT_REPEAT_COUNT = 10;

export class AddEventDialog {
  /**
   * @param {{dialogEl, titleEl, calendarEl, dateEl, hebDateEl, allDayEl, timeRowEl, startEl, endEl,
   *   repeatEl, repeatEndRowEl, repeatEndEl, repeatCountEl, repeatUntilEl, repeatHintEl,
   *   descEl, errEl, cancelBtn, saveBtn}} els
   * @param {{onSave: (input: {calendarId: string, title: string, date: string, allDay: boolean, startTime: string, endTime: string,
   *   description: string, recurrence: null | {freq: string, count?: number, until?: string}}) => Promise<void>}} deps
   *   freq: 'daily'|'weekly'|'monthly'|'yearly' (Gregorian) or 'hyearly'|'hmonthly' (Hebrew date)
   */
  constructor(els, { onSave }) {
    this.els = els;
    this.onSave = onSave;
    /** Last calendar saved to — preselected next time (for this visit only). */
    this.lastCalendarId = null;

    this.els.allDayEl.addEventListener('change', () => this._syncTimeRow());
    this.els.dateEl.addEventListener('input', () => { this._renderHebDate(); this._renderRepeatOptions(); this._syncRepeat(); });
    this.els.repeatEl.addEventListener('change', () => this._syncRepeat());
    this.els.repeatEndEl.addEventListener('change', () => this._syncRepeat());
    this.els.repeatCountEl.addEventListener('input', () => this._renderRepeatHint());
    this.els.repeatUntilEl.addEventListener('input', () => this._renderRepeatHint());
    // Keep the event one hour long by default as the start time moves.
    this.els.startEl.addEventListener('change', () => {
      const [h, m] = this.els.startEl.value.split(':').map(Number);
      if (!isNaN(h)) this.els.endEl.value = String(Math.min(h + 1, 23)).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    });
    this.els.cancelBtn.addEventListener('click', () => this.els.dialogEl.close());
    this.els.saveBtn.addEventListener('click', () => this._handleSave());
  }

  /**
   * Fills the calendar picker. Until this is called (or if the list fails to
   * load) the picker holds just the primary calendar.
   * @param {{id: string, summary: string, primary: boolean}[]} calendars the writable ones
   */
  setCalendars(calendars) {
    if (!calendars.length) return;
    const selectEl = this.els.calendarEl;
    const prev = selectEl.value;
    selectEl.innerHTML = '';
    // Primary first, the rest alphabetically.
    [...calendars]
      .sort((a, b) => (b.primary - a.primary) || a.summary.localeCompare(b.summary, 'he'))
      .forEach(cal => {
        const opt = document.createElement('option');
        opt.value = cal.primary ? 'primary' : cal.id;
        opt.textContent = cal.primary ? `${cal.summary} (ראשי)` : cal.summary;
        selectEl.appendChild(opt);
      });
    this._selectCalendar(prev);
  }

  _selectCalendar(id) {
    const selectEl = this.els.calendarEl;
    selectEl.value = [...selectEl.options].some(o => o.value === id) ? id : 'primary';
  }

  /** @param {Date} dateObj the day to pre-fill */
  open(dateObj) {
    this.els.titleEl.value = '';
    this._selectCalendar(this.lastCalendarId);
    this.els.dateEl.value = toKey(dateObj);
    this.els.allDayEl.checked = false;
    this.els.startEl.value = '09:00';
    this.els.endEl.value = '10:00';
    this.els.descEl.value = '';
    this.els.repeatEl.value = 'none';
    this.els.repeatEndEl.value = 'never';
    this.els.repeatCountEl.value = String(DEFAULT_REPEAT_COUNT);
    this.els.repeatUntilEl.value = '';
    this._setError('');
    this._setSaving(false);
    this._syncTimeRow();
    this._renderHebDate();
    this._renderRepeatOptions();
    this._syncRepeat();
    this.els.dialogEl.showModal();
    this.els.titleEl.focus();
  }

  _syncTimeRow() {
    this.els.timeRowEl.hidden = this.els.allDayEl.checked;
  }

  _renderHebDate() {
    const date = fromKey(this.els.dateEl.value);
    if (!date) { this.els.hebDateEl.textContent = ''; return; }
    const hd = new HDate(date);
    this.els.hebDateEl.textContent = `${heDayStr(hd.getDate())} ב${hebMonthName(hd)} ${gematriya(hd.getFullYear())}`;
  }

  /** Rebuilds the repeat choices so their labels name the chosen date's weekday/day/month. */
  _renderRepeatOptions() {
    const selectEl = this.els.repeatEl;
    const prev = selectEl.value || 'none';
    const d = fromKey(this.els.dateEl.value) || new Date();
    const hd = new HDate(d);
    const opt = (value, label) => `<option value="${value}">${label}</option>`;
    selectEl.innerHTML = opt('none', 'לא חוזר')
      + `<optgroup label="לפי התאריך הלועזי">`
      + opt('daily', 'כל יום')
      + opt('weekly', `כל שבוע ביום ${WEEKDAY_HE[d.getDay()]}`)
      + opt('monthly', `כל חודש ב-${d.getDate()} לחודש`)
      + opt('yearly', `כל שנה ב-${d.getDate()} ב${GREG_MONTHS[d.getMonth()]}`)
      + `</optgroup><optgroup label="לפי התאריך העברי">`
      + opt('hmonthly', `כל חודש ב${heDayStr(hd.getDate())} לחודש העברי`)
      + opt('hyearly', `כל שנה ב${heDayStr(hd.getDate())} ב${hebMonthName(hd)}`)
      + `</optgroup>`;
    selectEl.value = prev;
  }

  _isHebRepeat() {
    return HEB_FREQS.includes(this.els.repeatEl.value);
  }

  _syncRepeat() {
    const repeating = this.els.repeatEl.value !== 'none';
    const heb = this._isHebRepeat();
    this.els.repeatEndRowEl.hidden = !repeating;
    // Hebrew-date repeats are created as separate events, so they need an end.
    const neverOpt = this.els.repeatEndEl.querySelector('option[value="never"]');
    neverOpt.disabled = heb;
    if (heb && this.els.repeatEndEl.value === 'never') this.els.repeatEndEl.value = 'count';
    this.els.repeatCountEl.max = String(heb ? HEB_RECURRENCE_MAX : GREG_COUNT_MAX);
    this.els.repeatCountEl.hidden = this.els.repeatEndEl.value !== 'count';
    this.els.repeatUntilEl.hidden = this.els.repeatEndEl.value !== 'until';
    this._renderRepeatHint();
  }

  /** For Hebrew-date repeats: how many separate events will be created, and the last one's date. */
  _renderRepeatHint() {
    const hintEl = this.els.repeatHintEl;
    const start = fromKey(this.els.dateEl.value);
    const recurrence = this._readRecurrence();
    if (!start || !recurrence || !this._isHebRepeat() || typeof recurrence === 'string') {
      hintEl.hidden = true;
      return;
    }
    const dates = hebrewRecurrenceDates(start, recurrence.freq, {
      count: recurrence.count, until: recurrence.until && fromKey(recurrence.until),
    });
    const last = dates[dates.length - 1];
    const lastHd = new HDate(last);
    hintEl.textContent = `ייווצרו ${dates.length} אירועים נפרדים ביומן (חזרה לפי תאריך עברי אינה נתמכת ב-Google כאירוע חוזר אחד). `
      + `האחרון: ${last.getDate()} ב${GREG_MONTHS[last.getMonth()]} ${last.getFullYear()}, ${heDayStr(lastHd.getDate())} ב${hebMonthName(lastHd)} ${gematriya(lastHd.getFullYear())}.`;
    hintEl.hidden = false;
  }

  /** @returns {null | {freq: string, count?: number, until?: string} | string} null = no repeat, string = validation error */
  _readRecurrence() {
    const freq = this.els.repeatEl.value;
    if (freq === 'none') return null;
    const end = this.els.repeatEndEl.value;
    if (end === 'count') {
      const count = Number(this.els.repeatCountEl.value);
      const max = this._isHebRepeat() ? HEB_RECURRENCE_MAX : GREG_COUNT_MAX;
      if (!Number.isInteger(count) || count < 1 || count > max) return `מספר הפעמים חייב להיות בין 1 ל-${max}`;
      return { freq, count };
    }
    if (end === 'until') {
      const until = this.els.repeatUntilEl.value;
      if (!until) return 'נא לבחור תאריך סיום לחזרה';
      if (until < this.els.dateEl.value) return 'תאריך סיום החזרה חייב להיות אחרי תאריך האירוע';
      return { freq, until };
    }
    return { freq };
  }

  _setError(message) {
    this.els.errEl.textContent = message;
    this.els.errEl.hidden = !message;
  }

  _setSaving(saving) {
    this.els.saveBtn.disabled = saving;
    this.els.saveBtn.textContent = saving ? 'שומר…' : 'שמירה';
  }

  async _handleSave() {
    const input = {
      calendarId: this.els.calendarEl.value,
      title: this.els.titleEl.value.trim(),
      date: this.els.dateEl.value,
      allDay: this.els.allDayEl.checked,
      startTime: this.els.startEl.value,
      endTime: this.els.endEl.value,
      description: this.els.descEl.value.trim(),
      recurrence: this._readRecurrence(),
    };
    if (!input.title) return this._setError('נא להזין כותרת לאירוע');
    if (!input.date) return this._setError('נא לבחור תאריך');
    if (!input.allDay) {
      if (!input.startTime || !input.endTime) return this._setError('נא להזין שעת התחלה ושעת סיום');
      if (input.endTime <= input.startTime) return this._setError('שעת הסיום חייבת להיות אחרי שעת ההתחלה');
    }
    if (typeof input.recurrence === 'string') return this._setError(input.recurrence);

    this._setError('');
    this._setSaving(true);
    try {
      // onSave may open Google's permission popup, so it must be called
      // synchronously here, inside the click handler (no await before it).
      await this.onSave(input);
      this.lastCalendarId = input.calendarId;
      this.els.dialogEl.close();
    } catch (err) {
      this._setError(err.message);
    } finally {
      this._setSaving(false);
    }
  }
}
