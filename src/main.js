// Composition root: the only module that knows about every other module. Wires
// DOM elements to components, and connects GoogleAuthService -> GoogleCalendarService
// -> EventsStore (kept separate per SRP — nothing else in the app should need to
// know both of those exist).

import { CLIENT_ID, CAL_SCOPE, GCAL_DAYS_AHEAD } from './config/constants.js';
import * as AuthService from './services/GoogleAuthService.js';
import { fetchUpcomingEvents } from './services/GoogleCalendarService.js';
import * as EventsStore from './state/EventsStore.js';

import { ModeToggle } from './components/ModeToggle.js';
import { NavControls } from './components/NavControls.js';
import { CalendarGrid } from './components/CalendarGrid.js';
import { DayDetailPanel } from './components/DayDetailPanel.js';
import { EventsListPanel } from './components/EventsListPanel.js';
import { LocationDialog } from './components/LocationDialog.js';
import { JumpToDatePanel } from './components/JumpToDatePanel.js';
import { AuthStatusBar } from './components/AuthStatusBar.js';

function byId(id) { return document.getElementById(id); }

function boot() {
  const locationDialog = new LocationDialog({
    dialogEl: byId('locDialog'),
    selectEl: byId('locSelect'),
    customRowEl: byId('customLocRow'),
    nameEl: byId('customName'),
    latEl: byId('customLat'),
    lonEl: byId('customLon'),
    cancelBtn: byId('locCancelBtn'),
    saveBtn: byId('locSaveBtn'),
  });

  new ModeToggle({ hebBtn: byId('modeHebBtn'), gregBtn: byId('modeGregBtn') });

  new NavControls({
    prevBtn: byId('prevBtn'),
    nextBtn: byId('nextBtn'),
    titlePrimaryEl: byId('titlePrimary'),
    titleSecondaryEl: byId('titleSecondary'),
  });

  new JumpToDatePanel({
    toggleBtn: byId('jumpToggleBtn'),
    panelEl: byId('jumpPanel'),
    rowGreg: byId('jumpRowGreg'),
    rowHeb: byId('jumpRowHeb'),
    gregDay: byId('gregJumpDay'), gregMonth: byId('gregJumpMonth'), gregYear: byId('gregJumpYear'), gregBtn: byId('gregJumpBtn'),
    hebDay: byId('hebJumpDay'), hebMonth: byId('hebJumpMonth'), hebYear: byId('hebJumpYear'), hebBtn: byId('hebJumpBtn'),
  });

  new CalendarGrid({ gridEl: byId('grid') });

  new DayDetailPanel(
    { containerEl: byId('detailCard') },
    { onChangeLocationRequested: () => locationDialog.open() }
  );

  const eventsListPanel = new EventsListPanel({ boxEl: byId('eventsBox') });

  new AuthStatusBar({ dotEl: byId('authDot'), textEl: byId('authText'), btnEl: byId('authBtn') });

  // Google auth -> fetch events -> publish to EventsStore. This is the one place
  // that knows both GoogleAuthService and GoogleCalendarService exist.
  AuthService.onAuthChange(async (status) => {
    if (status !== true) return;
    eventsListPanel.showLoading();
    try {
      const token = AuthService.getAccessToken();
      const events = await fetchUpcomingEvents(token, GCAL_DAYS_AHEAD);
      EventsStore.setEvents(events);
    } catch (err) {
      eventsListPanel.showError(err.message);
    }
  });

  window.addEventListener('load', () => {
    if (window.google && window.google.accounts) AuthService.initGoogleAuth(CLIENT_ID, CAL_SCOPE);
    else setTimeout(() => { if (window.google && window.google.accounts) AuthService.initGoogleAuth(CLIENT_ID, CAL_SCOPE); }, 800);
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
}

boot();
