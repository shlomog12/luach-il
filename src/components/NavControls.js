// Month navigation arrows + the title (primary/secondary lines, reused for either
// mode: primary = the calendar currently being browsed by, secondary = the other
// one — see styles.css for the direction:rtl note on .nav .title).

import * as ViewModeStore from '../state/ViewModeStore.js';
import * as NavStore from '../state/CalendarNavigationStore.js';
import { HDate, hebMonthName, gematriya } from '../services/HebrewCalendarService.js';
import { GREG_MONTHS } from '../config/constants.js';
import { gregRangeLabel, hebRangeLabel } from '../utils/dateFormat.js';

export class NavControls {
  constructor({ prevBtn, nextBtn, titlePrimaryEl, titleSecondaryEl }) {
    Object.assign(this, { prevBtn, nextBtn, titlePrimaryEl, titleSecondaryEl });
    // Hebrew reading direction: the left-positioned arrow (prevBtn) advances to
    // the NEXT month, the right-positioned arrow (nextBtn) goes to the PREVIOUS
    // one — see styles.css, .nav is direction:ltr so DOM order = visual order.
    this.prevBtn.addEventListener('click', () => NavStore.navigateMonth(1));
    this.nextBtn.addEventListener('click', () => NavStore.navigateMonth(-1));
    NavStore.onChange(() => this.render());
    ViewModeStore.onViewModeChange(() => this.render());
    this.render();
  }

  render() {
    if (ViewModeStore.getViewMode() === 'heb') {
      const { year, firstHD, firstGreg, lastGreg } = NavStore.getHebMonthInfo();
      this.titlePrimaryEl.textContent = `${hebMonthName(firstHD)} ${gematriya(year)}`;
      this.titleSecondaryEl.textContent = gregRangeLabel(firstGreg, lastGreg);
    } else {
      const { year, month, firstDay, lastDay } = NavStore.getGregMonthInfo();
      this.titlePrimaryEl.textContent = `${GREG_MONTHS[month]} ${year}`;
      // Pure Hebrew-letter text — normal RTL rendering, no digit/text bidi mixing.
      this.titleSecondaryEl.textContent = hebRangeLabel(new HDate(firstDay), new HDate(lastDay));
    }
  }
}
