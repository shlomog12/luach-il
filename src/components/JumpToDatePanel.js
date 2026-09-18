// The "📅 דילוג לתאריך" toggle + its two day/month/year dropdown rows (Gregorian
// and Hebrew — only the one matching the current view mode is shown).

import * as ViewModeStore from '../state/ViewModeStore.js';
import * as NavStore from '../state/CalendarNavigationStore.js';
import { HDate, hebMonthName, heDayStr, gematriya } from '../services/HebrewCalendarService.js';
import { GREG_MONTHS, YEAR_SPAN_BACK, YEAR_SPAN_FWD } from '../config/constants.js';

export class JumpToDatePanel {
  /**
   * @param {{toggleBtn, panelEl, rowGreg, rowHeb,
   *   gregDay, gregMonth, gregYear, gregBtn,
   *   hebDay, hebMonth, hebYear, hebBtn}} els
   */
  constructor(els) {
    this.els = els;
    this._buildGregOptions();
    this._buildHebOptions();

    this.els.toggleBtn.addEventListener('click', () => this.setOpen(this.els.panelEl.hidden));
    this.els.gregYear.addEventListener('change', () => this._populateGregDays());
    this.els.gregMonth.addEventListener('change', () => this._populateGregDays());
    this.els.gregBtn.addEventListener('click', () => this._handleGregJump());
    this.els.hebYear.addEventListener('change', () => this._populateHebMonths());
    this.els.hebMonth.addEventListener('change', () => this._populateHebDays());
    this.els.hebBtn.addEventListener('click', () => this._handleHebJump());

    ViewModeStore.onViewModeChange(() => { this._updateVisibleRow(); this._syncDefaults(); });
    NavStore.onChange(() => this._syncDefaults());

    this._updateVisibleRow();
    this._populateGregDays();
    this._populateHebMonths();
    this._syncDefaults();
  }

  setOpen(open) {
    this.els.panelEl.hidden = !open;
    this.els.toggleBtn.classList.toggle('active', open);
    this.els.toggleBtn.setAttribute('aria-expanded', String(open));
  }

  _updateVisibleRow() {
    const mode = ViewModeStore.getViewMode();
    this.els.rowGreg.hidden = mode !== 'greg';
    this.els.rowHeb.hidden = mode !== 'heb';
  }

  // ---- Gregorian side ----

  _buildGregOptions() {
    GREG_MONTHS.forEach((name, i) => {
      const opt = document.createElement('option');
      opt.value = String(i + 1);
      opt.textContent = name;
      this.els.gregMonth.appendChild(opt);
    });
    const todayYear = new Date().getFullYear();
    for (let y = todayYear - YEAR_SPAN_BACK; y <= todayYear + YEAR_SPAN_FWD; y++) {
      const opt = document.createElement('option');
      opt.value = String(y);
      opt.textContent = String(y);
      this.els.gregYear.appendChild(opt);
    }
  }

  _populateGregDays() {
    const year = parseInt(this.els.gregYear.value, 10) || NavStore.getCurrent().getFullYear();
    const month = parseInt(this.els.gregMonth.value, 10) || 1;
    const numDays = new Date(year, month, 0).getDate();
    const prevVal = this.els.gregDay.value;
    this.els.gregDay.innerHTML = '';
    for (let d = 1; d <= numDays; d++) {
      const opt = document.createElement('option');
      opt.value = String(d);
      opt.textContent = String(d);
      this.els.gregDay.appendChild(opt);
    }
    if (prevVal && Number(prevVal) <= numDays) this.els.gregDay.value = prevVal;
  }

  _handleGregJump() {
    const year = parseInt(this.els.gregYear.value, 10);
    const month = parseInt(this.els.gregMonth.value, 10);
    const day = parseInt(this.els.gregDay.value, 10);
    if (!year || !month || !day) return;
    this.setOpen(false); // collapse back after a successful jump
    NavStore.jumpToDate(new Date(year, month - 1, day));
  }

  // ---- Hebrew side ----

  _buildHebOptions() {
    const todayHebYear = new HDate(new Date()).getFullYear();
    for (let y = todayHebYear - YEAR_SPAN_BACK; y <= todayHebYear + YEAR_SPAN_FWD; y++) {
      const opt = document.createElement('option');
      opt.value = String(y);
      opt.textContent = gematriya(y % 1000);
      this.els.hebYear.appendChild(opt);
    }
  }

  _populateHebDays() {
    const year = parseInt(this.els.hebYear.value, 10) || NavStore.getHebCursor().year;
    const month = parseInt(this.els.hebMonth.value, 10) || 1;
    const numDays = new HDate(1, month, year).daysInMonth();
    const prevVal = this.els.hebDay.value;
    this.els.hebDay.innerHTML = '';
    for (let d = 1; d <= numDays; d++) {
      const opt = document.createElement('option');
      opt.value = String(d);
      opt.textContent = heDayStr(d);
      this.els.hebDay.appendChild(opt);
    }
    if (prevVal && Number(prevVal) <= numDays) this.els.hebDay.value = prevVal;
  }

  _populateHebMonths() {
    const year = parseInt(this.els.hebYear.value, 10) || NavStore.getHebCursor().year;
    const numMonths = HDate.monthsInYear(year);
    const prevVal = this.els.hebMonth.value;
    this.els.hebMonth.innerHTML = '';
    for (let mm = 1; mm <= numMonths; mm++) {
      const hd = new HDate(1, mm, year);
      const opt = document.createElement('option');
      opt.value = String(mm);
      opt.textContent = hebMonthName(hd);
      this.els.hebMonth.appendChild(opt);
    }
    if (prevVal && Number(prevVal) <= numMonths) this.els.hebMonth.value = prevVal;
    this._populateHebDays();
  }

  _handleHebJump() {
    const year = parseInt(this.els.hebYear.value, 10);
    const month = parseInt(this.els.hebMonth.value, 10);
    const day = parseInt(this.els.hebDay.value, 10);
    if (!year || !month || !day) return;
    this.setOpen(false);
    NavStore.jumpToDate(new HDate(day, month, year).greg());
  }

  // Keep both jump controls defaulted to whatever date is currently being viewed
  // (until the visitor picks something else in them).
  _syncDefaults() {
    const dateObj = NavStore.getDisplayDate();
    if (this.els.gregYear.querySelector(`option[value="${dateObj.getFullYear()}"]`)) {
      this.els.gregYear.value = String(dateObj.getFullYear());
      this.els.gregMonth.value = String(dateObj.getMonth() + 1);
      this._populateGregDays();
      this.els.gregDay.value = String(dateObj.getDate());
    }
    const hd = new HDate(dateObj);
    if (this.els.hebYear.querySelector(`option[value="${hd.getFullYear()}"]`)) {
      this.els.hebYear.value = String(hd.getFullYear());
      this._populateHebMonths();
      this.els.hebMonth.value = String(hd.getMonth());
      this._populateHebDays();
      this.els.hebDay.value = String(hd.getDate());
    }
  }
}
