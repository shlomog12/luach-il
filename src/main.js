// Composition root: the only module that knows about every other module. Wires
// DOM elements to components, and connects GoogleAuthService -> GoogleCalendarService
// -> EventsStore (kept separate per SRP — nothing else in the app should need to
// know both of those exist).

import { CLIENT_ID, CAL_SCOPE, CAL_WRITE_SCOPE, GCAL_DAYS_AHEAD } from './config/constants.js';
import * as AuthService from './services/GoogleAuthService.js';
import { fetchCalendarList, fetchUpcomingEvents, createEvent, createEventSeries, updateEvent, deleteEvent } from './services/GoogleCalendarService.js';
import { hebrewRecurrenceDates } from './services/HebrewCalendarService.js';
import { toKey, fromKey } from './utils/dateFormat.js';
import * as EventsStore from './state/EventsStore.js';

import { ModeToggle } from './components/ModeToggle.js';
import { NavControls } from './components/NavControls.js';
import { CalendarGrid } from './components/CalendarGrid.js';
import { DayDetailPanel } from './components/DayDetailPanel.js';
import { EventsListPanel } from './components/EventsListPanel.js';
import { LocationDialog } from './components/LocationDialog.js';
import { JumpToDatePanel } from './components/JumpToDatePanel.js';
import { AuthStatusBar } from './components/AuthStatusBar.js';
import { EventDialog } from './components/EventDialog.js';

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

  const eventsListPanel = new EventsListPanel(
    { boxEl: byId('eventsBox') },
    { onEventSelected: (ev) => eventDialog.openEdit(ev) }
  );

  async function refreshEvents() {
    eventsListPanel.showLoading();
    try {
      const token = AuthService.getAccessToken();
      const calendars = await fetchCalendarList(token);
      eventDialog.setCalendars(calendars.filter(cal => cal.writable));
      const events = await fetchUpcomingEvents(token, GCAL_DAYS_AHEAD, calendars);
      EventsStore.setEvents(events);
    } catch (err) {
      eventsListPanel.showError(err.message);
    }
  }

  /**
   * First time only: ask Google for write access. Must run synchronously from
   * the dialog's click (before any await), so the permission popup isn't blocked.
   * @returns {Promise<string>} a token with write access
   */
  async function getWriteToken() {
    const granted = await AuthService.requestScope(CAL_WRITE_SCOPE);
    if (!granted) throw new Error('לא ניתנה הרשאה לשינוי אירועים ביומן Google');
    const token = AuthService.getAccessToken();
    if (!token) throw new Error('החיבור ל-Google פג — התחברו מחדש ונסו שוב');
    return token;
  }

  /** After a series-wide update/delete: refetch, and report a partial failure. */
  async function finishSeriesOp({ done, failed }, verb) {
    if (!done) throw new Error(`שגיאה ב${verb}`);
    await refreshEvents();
    // Some went through, so the dialog closes (retrying would repeat those).
    if (failed) alert(`${verb}: ${done} הצליחו, ${failed} נכשלו.`);
  }

  // Add/edit/delete -> write access -> Google -> refetch, so changes show up
  // everywhere exactly as Google stored them.
  const eventDialog = new EventDialog({
    dialogEl: byId('eventDialog'),
    headingEl: byId('evHeading'),
    scopeEl: byId('evScope'),
    noteEl: byId('evNote'),
    deleteBtn: byId('evDeleteBtn'),
    titleEl: byId('evTitle'),
    calendarEl: byId('evCalendar'),
    dateEl: byId('evDate'),
    hebDateEl: byId('evHebDate'),
    allDayEl: byId('evAllDay'),
    timeRowEl: byId('evTimeRow'),
    startEl: byId('evStart'),
    endEl: byId('evEnd'),
    repeatEl: byId('evRepeat'),
    repeatEndRowEl: byId('evRepeatEndRow'),
    repeatEndEl: byId('evRepeatEnd'),
    repeatCountEl: byId('evRepeatCount'),
    repeatUntilEl: byId('evRepeatUntil'),
    repeatHintEl: byId('evRepeatHint'),
    descEl: byId('evDesc'),
    errEl: byId('evErr'),
    cancelBtn: byId('evCancelBtn'),
    saveBtn: byId('evSaveBtn'),
  }, {
    onSave: async (input) => {
      const token = await getWriteToken();
      const { recurrence, ...event } = input;
      if (recurrence && (recurrence.freq === 'hyearly' || recurrence.freq === 'hmonthly')) {
        // Google has no Hebrew-date RRULE, so each occurrence becomes its own event.
        const dates = hebrewRecurrenceDates(fromKey(input.date), recurrence.freq, {
          count: recurrence.count, until: recurrence.until && fromKey(recurrence.until),
        }).map(toKey);
        const { created, failed } = await createEventSeries(token, event, dates);
        if (!created) throw new Error('שגיאה בשמירת האירועים');
        await refreshEvents();
        // Some were created, so the dialog closes (saving again would duplicate them).
        if (failed) alert(`נוצרו ${created} מתוך ${dates.length} מופעים; ${failed} נכשלו.`);
        return;
      }
      try {
        await createEvent(token, { ...event, recurrence });
      } catch (err) {
        throw new Error(`שגיאה בשמירת האירוע (${err.message})`);
      }
      await refreshEvents();
    },
    onUpdate: async (ev, scope, changes) => {
      const token = await getWriteToken();
      let result;
      try {
        result = await updateEvent(token, ev, scope, changes);
      } catch (err) {
        throw new Error(`שגיאה בעדכון האירוע (${err.message})`);
      }
      await finishSeriesOp(result, 'עדכון האירועים');
    },
    onDelete: async (ev, scope) => {
      const token = await getWriteToken();
      let result;
      try {
        result = await deleteEvent(token, ev, scope);
      } catch (err) {
        throw new Error(`שגיאה במחיקת האירוע (${err.message})`);
      }
      await finishSeriesOp(result, 'מחיקת האירועים');
    },
  });

  new DayDetailPanel(
    { containerEl: byId('detailCard') },
    {
      onChangeLocationRequested: () => locationDialog.open(),
      onAddEventRequested: (date) => eventDialog.open(date),
      onEventSelected: (ev) => eventDialog.openEdit(ev),
    }
  );

  new AuthStatusBar({ dotEl: byId('authDot'), textEl: byId('authText'), btnEl: byId('authBtn') });

  // Google auth -> fetch events -> publish to EventsStore. This is the one place
  // that knows both GoogleAuthService and GoogleCalendarService exist.
  AuthService.onAuthChange((status) => {
    if (status === true) refreshEvents();
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
