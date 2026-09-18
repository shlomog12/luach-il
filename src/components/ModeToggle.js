import * as ViewModeStore from '../state/ViewModeStore.js';
import * as NavStore from '../state/CalendarNavigationStore.js';

export class ModeToggle {
  constructor({ hebBtn, gregBtn }) {
    this.hebBtn = hebBtn;
    this.gregBtn = gregBtn;
    this.hebBtn.addEventListener('click', () => NavStore.switchViewMode('heb'));
    this.gregBtn.addEventListener('click', () => NavStore.switchViewMode('greg'));
    ViewModeStore.onViewModeChange(() => this.render());
    this.render();
  }

  render() {
    const mode = ViewModeStore.getViewMode();
    this.hebBtn.classList.toggle('active', mode === 'heb');
    this.gregBtn.classList.toggle('active', mode === 'greg');
  }
}
