// The "הוספת אירוע" dialog: a small form (title, date, all-day or start/end
// time, description) that hands the result to onSave. Doesn't know about Google
// at all — main.js wires onSave to GoogleAuthService + GoogleCalendarService.

import { HDate, hebMonthName, heDayStr, gematriya } from '../services/HebrewCalendarService.js';
import { toKey } from '../utils/dateFormat.js';

export class AddEventDialog {
  /**
   * @param {{dialogEl, titleEl, dateEl, hebDateEl, allDayEl, timeRowEl, startEl, endEl, descEl, errEl, cancelBtn, saveBtn}} els
   * @param {{onSave: (input: {title: string, date: string, allDay: boolean, startTime: string, endTime: string, description: string}) => Promise<void>}} deps
   */
  constructor(els, { onSave }) {
    this.els = els;
    this.onSave = onSave;

    this.els.allDayEl.addEventListener('change', () => this._syncTimeRow());
    this.els.dateEl.addEventListener('input', () => this._renderHebDate());
    // Keep the event one hour long by default as the start time moves.
    this.els.startEl.addEventListener('change', () => {
      const [h, m] = this.els.startEl.value.split(':').map(Number);
      if (!isNaN(h)) this.els.endEl.value = String(Math.min(h + 1, 23)).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    });
    this.els.cancelBtn.addEventListener('click', () => this.els.dialogEl.close());
    this.els.saveBtn.addEventListener('click', () => this._handleSave());
  }

  /** @param {Date} dateObj the day to pre-fill */
  open(dateObj) {
    this.els.titleEl.value = '';
    this.els.dateEl.value = toKey(dateObj);
    this.els.allDayEl.checked = false;
    this.els.startEl.value = '09:00';
    this.els.endEl.value = '10:00';
    this.els.descEl.value = '';
    this._setError('');
    this._setSaving(false);
    this._syncTimeRow();
    this._renderHebDate();
    this.els.dialogEl.showModal();
    this.els.titleEl.focus();
  }

  _syncTimeRow() {
    this.els.timeRowEl.hidden = this.els.allDayEl.checked;
  }

  _renderHebDate() {
    const [y, m, d] = this.els.dateEl.value.split('-').map(Number);
    if (!y || !m || !d) { this.els.hebDateEl.textContent = ''; return; }
    const hd = new HDate(new Date(y, m - 1, d));
    this.els.hebDateEl.textContent = `${heDayStr(hd.getDate())} ב${hebMonthName(hd)} ${gematriya(hd.getFullYear())}`;
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
      title: this.els.titleEl.value.trim(),
      date: this.els.dateEl.value,
      allDay: this.els.allDayEl.checked,
      startTime: this.els.startEl.value,
      endTime: this.els.endEl.value,
      description: this.els.descEl.value.trim(),
    };
    if (!input.title) return this._setError('נא להזין כותרת לאירוע');
    if (!input.date) return this._setError('נא לבחור תאריך');
    if (!input.allDay) {
      if (!input.startTime || !input.endTime) return this._setError('נא להזין שעת התחלה ושעת סיום');
      if (input.endTime <= input.startTime) return this._setError('שעת הסיום חייבת להיות אחרי שעת ההתחלה');
    }

    this._setError('');
    this._setSaving(true);
    try {
      // onSave may open Google's permission popup, so it must be called
      // synchronously here, inside the click handler (no await before it).
      await this.onSave(input);
      this.els.dialogEl.close();
    } catch (err) {
      this._setError(err.message);
    } finally {
      this._setSaving(false);
    }
  }
}
