// The event dialog: a small form (title, target calendar, start and end date
// and time or all-day, repeat, description) used both to add an event (open) and to
// edit or delete an existing one (openEdit). Hands the result to onSave /
// onUpdate / onDelete. Doesn't know about Google at all — main.js wires those
// to GoogleAuthService + GoogleCalendarService.

import { HDate, hebMonthName, heDayStr, gematriya, hebrewRecurrenceDates, HEB_RECURRENCE_MAX } from '../services/HebrewCalendarService.js';
import { toKey, fromKey, addDaysKey, daysBetweenKeys } from '../utils/dateFormat.js';
import { GREG_MONTHS, WEEKDAY_HE } from '../config/constants.js';

const HEB_FREQS = ['hyearly', 'hmonthly'];
const GREG_COUNT_MAX = 999;
const DEFAULT_REPEAT_COUNT = 10;

const ADD_HEADING = 'הוספת אירוע ליומן Google';
const EDIT_HEADING = 'עריכת אירוע';
const DELETE_LABEL = 'מחיקה';
const DELETE_CONFIRM_LABEL = 'לחצו שוב למחיקה';
const HOUR_MS = 3600000;

const hhmm = (d) => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');

export class EventDialog {
  /**
   * @param {{dialogEl, headingEl, scopeEl, noteEl, deleteBtn, titleEl, calendarEl, dateEl, hebDateEl, endDateEl, hebEndDateEl, allDayEl, startEl, endEl,
   *   repeatEl, repeatEndRowEl, repeatEndEl, repeatCountEl, repeatUntilEl, repeatHintEl,
   *   descEl, errEl, cancelBtn, saveBtn}} els
   * @param {{onSave: (input: {calendarId: string, title: string, date: string, endDate: string, allDay: boolean, startTime: string, endTime: string,
   *   description: string, recurrence: null | {freq: string, count?: number, until?: string}}) => Promise<void>}} deps
   *   freq: 'daily'|'weekly'|'monthly'|'yearly' (Gregorian) or 'hyearly'|'hmonthly' (Hebrew date)
   * @param {(ev: object, scope: 'one'|'all', changes: {title: string, description: string,
   *   timing: null | {date?: string, spanDays: number, allDay: boolean, startTime: string, endTime: string}}) => Promise<void>} deps.onUpdate
   *   timing null = date/times unchanged; no timing.date = keep each event's own date (scope 'all');
   *   spanDays = days from the start date to the end date
   * @param {(ev: object, scope: 'one'|'all') => Promise<void>} deps.onDelete
   */
  constructor(els, { onSave, onUpdate, onDelete }) {
    this.els = els;
    this.onSave = onSave;
    this.onUpdate = onUpdate;
    this.onDelete = onDelete;
    /** Last calendar saved to — preselected next time (for this visit only). */
    this.lastCalendarId = null;
    this.primaryId = null;
    /** The event being edited (null when adding), and its date/times as loaded. */
    this.editing = null;
    this.original = null;
    this.deleteArmed = false;
    /** The event's length, kept as the start moves (like Google): in ms for timed events, in days for all-day ones. */
    this.durationMs = HOUR_MS;
    this.spanDays = 0;

    this.els.scopeEl.addEventListener('change', () => this._syncScope());
    this.els.deleteBtn.addEventListener('click', () => this._handleDelete());

    this.els.allDayEl.addEventListener('change', () => { this._syncTimeRow(); this._rememberDuration(); });
    this.els.dateEl.addEventListener('change', () => {
      this._moveEndWithStart();
      this._renderHebDate(); this._renderRepeatOptions(); this._syncRepeat();
    });
    this.els.startEl.addEventListener('change', () => this._moveEndWithStart());
    this.els.endDateEl.addEventListener('change', () => { this._rememberDuration(); this._renderHebDate(); });
    this.els.endEl.addEventListener('change', () => this._rememberDuration());
    this.els.repeatEl.addEventListener('change', () => this._syncRepeat());
    this.els.repeatEndEl.addEventListener('change', () => this._syncRepeat());
    this.els.repeatCountEl.addEventListener('input', () => this._renderRepeatHint());
    this.els.repeatUntilEl.addEventListener('input', () => this._renderRepeatHint());
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
    this.primaryId = calendars.find(cal => cal.primary)?.id || null;
    // Primary first, the rest alphabetically.
    [...calendars]
      .sort((a, b) => (b.primary - a.primary) || a.summary.localeCompare(b.summary, 'he'))
      .forEach(cal => {
        const opt = document.createElement('option');
        opt.value = cal.id;
        opt.textContent = cal.primary ? `${cal.summary} (ראשי)` : cal.summary;
        selectEl.appendChild(opt);
      });
    this._selectCalendar(prev);
  }

  /** Selects calendar `id`, falling back to the primary calendar (or the first option). */
  _selectCalendar(id) {
    const selectEl = this.els.calendarEl;
    const has = (v) => [...selectEl.options].some(o => o.value === v);
    selectEl.value = has(id) ? id : has(this.primaryId) ? this.primaryId : selectEl.options[0].value;
  }

  /** Add mode. @param {Date} dateObj the day to pre-fill */
  open(dateObj) {
    this._setMode(null);
    this.els.titleEl.value = '';
    this._selectCalendar(this.lastCalendarId);
    this.els.dateEl.value = toKey(dateObj);
    this.els.endDateEl.value = toKey(dateObj);
    this.els.allDayEl.checked = false;
    this.els.startEl.value = '09:00';
    this.els.endEl.value = '10:00';
    this.els.descEl.value = '';
    this.els.repeatEl.value = 'none';
    this.els.repeatEndEl.value = 'never';
    this.els.repeatCountEl.value = String(DEFAULT_REPEAT_COUNT);
    this.els.repeatUntilEl.value = '';
    this.durationMs = HOUR_MS;
    this._rememberDuration();
    this._setError('');
    this._setSaving(false);
    this._syncTimeRow();
    this._renderHebDate();
    this._renderRepeatOptions();
    this._syncRepeat();
    this._syncScope();
    this.els.dialogEl.showModal();
    this.els.titleEl.focus();
  }

  /**
   * Edit mode, for an event from EventsStore (see GoogleCalendarService's CalEvent).
   * The calendar and the repeat rule can't be changed here; for an event that's
   * part of a series, the user picks whether changes apply to it or to all of it.
   */
  openEdit(ev) {
    this._setMode(ev);
    this.original = {
      date: toKey(ev.date),
      // All-day ends are exclusive (the day after the last day); the form shows the last day.
      endDate: ev.allDay ? addDaysKey(toKey(ev.end), -1) : toKey(ev.end),
      allDay: ev.allDay,
      startTime: ev.allDay ? '09:00' : hhmm(ev.date),
      endTime: ev.allDay ? '10:00' : hhmm(ev.end),
    };
    this.els.titleEl.value = ev.summary;
    if (![...this.els.calendarEl.options].some(o => o.value === ev.calendarId)) {
      this.els.calendarEl.add(new Option(ev.calName, ev.calendarId));
    }
    this.els.calendarEl.value = ev.calendarId;
    this.els.dateEl.value = this.original.date;
    this.els.endDateEl.value = this.original.endDate;
    this.els.allDayEl.checked = ev.allDay;
    this.els.startEl.value = this.original.startTime;
    this.els.endEl.value = this.original.endTime;
    this.els.descEl.value = ev.description;
    this.els.repeatEl.value = 'none';
    this.els.scopeEl.value = 'one';
    this.durationMs = HOUR_MS;
    this._rememberDuration();
    this._setError('');
    this._setSaving(false);
    this._syncTimeRow();
    this._renderHebDate();
    this._renderRepeatOptions();
    this._syncRepeat();
    this._syncScope();
    this.els.dialogEl.showModal();
    this.els.titleEl.focus();
  }

  /** @param {object|null} ev the event being edited, or null for add mode */
  _setMode(ev) {
    const editing = !!ev;
    this.editing = ev;
    this.original = null;
    this.els.headingEl.textContent = editing ? EDIT_HEADING : ADD_HEADING;
    this.els.calendarEl.disabled = editing;
    this.els.repeatEl.hidden = editing;
    this.els.scopeEl.hidden = !(editing && (ev.recurringEventId || ev.seriesId));
    this.els.deleteBtn.hidden = !editing;
    this._disarmDelete();
  }

  /** Which date/time fields are editable, and the note explaining why not. */
  _syncScope() {
    const ev = this.editing;
    let note = '';
    let lockDates = false;
    if (ev && this.els.scopeEl.value === 'all') {
      // Every event in the series keeps its own dates; only the times can change together.
      lockDates = true;
      this.els.dateEl.value = this.original.date;
      this.els.endDateEl.value = this.original.endDate;
      this._rememberDuration();
      this._renderHebDate();
      note = 'השינויים יחולו על כל המופעים בסדרה, כל אחד בתאריך שלו.';
    }
    this.els.dateEl.disabled = lockDates;
    this.els.endDateEl.disabled = lockDates;
    this.els.noteEl.textContent = note;
    this.els.noteEl.hidden = !note;
    this._disarmDelete();
  }

  _disarmDelete() {
    this.deleteArmed = false;
    this.els.deleteBtn.textContent = DELETE_LABEL;
  }

  _syncTimeRow() {
    this.els.startEl.hidden = this.els.endEl.hidden = this.els.allDayEl.checked;
  }

  /** Start/end as local Dates from the fields (times ignored when all-day); null if incomplete. */
  _fieldsDate(dateEl, timeEl) {
    const d = fromKey(dateEl.value);
    if (!d || this.els.allDayEl.checked) return d;
    const [h, m] = timeEl.value.split(':').map(Number);
    if (isNaN(h)) return null;
    d.setHours(h, m);
    return d;
  }

  /** Records the current length, so moving the start keeps it (only a valid, non-negative one). */
  _rememberDuration() {
    const start = this._fieldsDate(this.els.dateEl, this.els.startEl);
    const end = this._fieldsDate(this.els.endDateEl, this.els.endEl);
    if (!start || !end || end < start) return;
    this.spanDays = daysBetweenKeys(this.els.dateEl.value, this.els.endDateEl.value);
    if (!this.els.allDayEl.checked) this.durationMs = end - start;
  }

  /** The start moved: move the end with it, keeping the event's length. */
  _moveEndWithStart() {
    if (this.els.allDayEl.checked) {
      if (this.els.dateEl.value) this.els.endDateEl.value = addDaysKey(this.els.dateEl.value, this.spanDays);
    } else {
      const start = this._fieldsDate(this.els.dateEl, this.els.startEl);
      if (start) {
        const end = new Date(start.getTime() + this.durationMs);
        this.els.endDateEl.value = toKey(end);
        this.els.endEl.value = hhmm(end);
      }
    }
    this._renderHebDate();
  }

  /** The Hebrew date next to both the start and the end date. */
  _renderHebDate() {
    const heb = (key) => {
      const date = fromKey(key);
      if (!date) return '';
      const hd = new HDate(date);
      return `${heDayStr(hd.getDate())} ב${hebMonthName(hd)} ${gematriya(hd.getFullYear())}`;
    };
    this.els.hebDateEl.textContent = heb(this.els.dateEl.value);
    this.els.hebEndDateEl.textContent = heb(this.els.endDateEl.value);
  }

  /** @returns {string} a validation error for the start/end fields, or '' */
  _timingError(t) {
    if (!t.date || !t.endDate) return 'נא לבחור תאריך התחלה ותאריך סיום';
    if (t.allDay) {
      if (t.endDate < t.date) return 'תאריך הסיום חייב להיות באותו יום או אחרי תאריך ההתחלה';
      return '';
    }
    if (!t.startTime || !t.endTime) return 'נא להזין שעת התחלה ושעת סיום';
    if (`${t.endDate}T${t.endTime}` <= `${t.date}T${t.startTime}`) return 'מועד הסיום חייב להיות אחרי מועד ההתחלה';
    return '';
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
    this.els.deleteBtn.disabled = saving;
    this.els.saveBtn.textContent = saving ? 'שומר…' : 'שמירה';
  }

  /** Runs a save/update/delete action with the busy state and error display around it. */
  async _run(action) {
    this._setError('');
    this._setSaving(true);
    try {
      await action();
      this.els.dialogEl.close();
    } catch (err) {
      this._setError(err.message);
    } finally {
      this._setSaving(false);
      this._disarmDelete();
    }
  }

  // Deleting takes two clicks (instead of a confirm() popup) so the second click
  // is still a fresh user gesture if Google's permission popup has to open.
  _handleDelete() {
    if (!this.deleteArmed) {
      this.deleteArmed = true;
      this.els.deleteBtn.textContent = DELETE_CONFIRM_LABEL;
      return;
    }
    const ev = this.editing;
    const scope = this.els.scopeEl.hidden ? 'one' : this.els.scopeEl.value;
    this._run(() => this.onDelete(ev, scope));
  }

  _handleUpdate() {
    const ev = this.editing;
    const scope = this.els.scopeEl.hidden ? 'one' : this.els.scopeEl.value;
    const now = {
      date: this.els.dateEl.value,
      endDate: this.els.endDateEl.value,
      allDay: this.els.allDayEl.checked,
      startTime: this.els.startEl.value,
      endTime: this.els.endEl.value,
    };
    const title = this.els.titleEl.value.trim();
    if (!title) return this._setError('נא להזין כותרת לאירוע');
    const o = this.original;
    const timingChanged = now.date !== o.date || now.endDate !== o.endDate || now.allDay !== o.allDay
      || (!now.allDay && (now.startTime !== o.startTime || now.endTime !== o.endTime));
    let timing = null;
    if (timingChanged) {
      const err = this._timingError(now);
      if (err) return this._setError(err);
      timing = {
        allDay: now.allDay, startTime: now.startTime, endTime: now.endTime,
        spanDays: daysBetweenKeys(now.date, now.endDate),
      };
      if (scope === 'one') timing.date = now.date;
    }
    const changes = { title, description: this.els.descEl.value.trim(), timing };
    // onUpdate may open Google's permission popup, so no await before it.
    this._run(() => this.onUpdate(ev, scope, changes));
  }

  _handleSave() {
    if (this.editing) return this._handleUpdate();
    const input = {
      calendarId: this.els.calendarEl.value,
      title: this.els.titleEl.value.trim(),
      date: this.els.dateEl.value,
      endDate: this.els.endDateEl.value,
      allDay: this.els.allDayEl.checked,
      startTime: this.els.startEl.value,
      endTime: this.els.endEl.value,
      description: this.els.descEl.value.trim(),
      recurrence: this._readRecurrence(),
    };
    if (!input.title) return this._setError('נא להזין כותרת לאירוע');
    const timingErr = this._timingError(input);
    if (timingErr) return this._setError(timingErr);
    if (typeof input.recurrence === 'string') return this._setError(input.recurrence);

    // onSave may open Google's permission popup, so it must be called
    // synchronously here, inside the click handler (no await before it).
    this._run(async () => {
      await this.onSave(input);
      this.lastCalendarId = input.calendarId;
    });
  }
}
