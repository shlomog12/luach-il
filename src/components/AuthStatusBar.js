import * as AuthService from '../services/GoogleAuthService.js';

export class AuthStatusBar {
  constructor({ dotEl, textEl, btnEl }) {
    Object.assign(this, { dotEl, textEl, btnEl });
    this.btnEl.addEventListener('click', () => AuthService.requestConsent());
    AuthService.onAuthChange((status) => this.render(status));
  }

  /** @param {'unconfigured'|boolean} status */
  render(status) {
    if (status === 'unconfigured') {
      this.textEl.textContent = "יש להגדיר CLIENT_ID בקובץ src/config/constants.js (ראו README)";
      this.btnEl.disabled = true;
      return;
    }
    const connected = status === true;
    this.dotEl.classList.toggle('on', connected);
    this.textEl.textContent = connected ? "מחובר ל-Google Calendar" : "לא מחובר ל-Google Calendar";
    this.btnEl.textContent = connected ? "רענן" : "התחבר עם Google";
  }
}
