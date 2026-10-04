// Stateless: fetches/creates events given a token, returns the results. Doesn't know how the
// token was obtained (GoogleAuthService) or where the results get stored
// (EventsStore) — those are wired together in main.js.

import { toKey, fromKey, addDaysKey, daysBetweenKeys } from '../utils/dateFormat.js';

const API = 'https://www.googleapis.com/calendar/v3';
const eventsUrl = (calendarId) => `${API}/calendars/${encodeURIComponent(calendarId)}/events`;

/**
 * All of the user's calendars. `writable` is true where the user may add events
 * (accessRole owner/writer — not read-only or free/busy-only shared calendars).
 * @param {string} accessToken
 * @returns {Promise<{id: string, summary: string, primary: boolean, writable: boolean}[]>}
 */
export async function fetchCalendarList(accessToken) {
  const res = await fetch(`${API}/users/me/calendarList`, {
    headers: { Authorization: 'Bearer ' + accessToken },
  });
  if (!res.ok) throw new Error('calendarList ' + res.status);
  const data = await res.json();
  return (data.items || []).map(cal => ({
    id: cal.id,
    summary: cal.summaryOverride || cal.summary,
    primary: !!cal.primary,
    writable: cal.accessRole === 'owner' || cal.accessRole === 'writer',
  }));
}

/**
 * @param {string} accessToken
 * @param {number} daysAhead
 * @param {{id: string, summary: string, writable: boolean}[]} calendars from fetchCalendarList
 * @returns {Promise<CalEvent[]>}
 */
export async function fetchUpcomingEvents(accessToken, daysAhead, calendars) {
  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + daysAhead * 86400000).toISOString();

  const all = [];
  await Promise.all(calendars.map(async cal => {
    const url = eventsUrl(cal.id)
      + `?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`
      + `&singleEvents=true&orderBy=startTime&maxResults=50`;
    try {
      const r = await fetch(url, { headers: { Authorization: 'Bearer ' + accessToken } });
      if (!r.ok) return;
      const data = await r.json();
      (data.items || []).forEach(ev => {
        if (ev.status === 'cancelled') return;
        all.push(toCalEvent(ev, cal));
      });
    } catch (e) {
      // skip this calendar on error — one bad calendar shouldn't hide the rest
    }
  }));

  return all.sort((a, b) => a.date - b.date);
}

/**
 * @typedef {object} CalEvent
 * @property {string} id               event id (for a recurring event: this instance's id)
 * @property {string} calendarId
 * @property {Date} date               start (local midnight for all-day events)
 * @property {Date} end                end (exclusive)
 * @property {string} title            display title ('(ללא כותרת)' if empty)
 * @property {string} summary          raw title, as stored in Google
 * @property {string} description
 * @property {boolean} allDay
 * @property {boolean} multiDay        spans more than one day
 * @property {string} calName
 * @property {boolean} editable        the user may change it (writable calendar, and organizer or guests-can-modify)
 * @property {string|null} recurringEventId  set on instances of a Google recurring event
 * @property {string|null} seriesId    set on events created as a Hebrew-date series (createEventSeries)
 */
function toCalEvent(ev, cal) {
  const allDay = !!ev.start.date;
  const date = allDay ? fromKey(ev.start.date) : new Date(ev.start.dateTime);
  const end = allDay ? fromKey(ev.end.date) : new Date(ev.end.dateTime);
  const multiDay = allDay
    ? (end - date) > 86400000 * 1.5 // DST-safe "more than one day"
    : toKey(date) !== toKey(new Date(end - 1));
  return {
    id: ev.id,
    calendarId: cal.id,
    date,
    end,
    title: ev.summary || '(ללא כותרת)',
    summary: ev.summary || '',
    description: ev.description || '',
    allDay,
    multiDay,
    calName: cal.summary,
    editable: !!cal.writable && (ev.organizer?.self !== false || !!ev.guestsCanModify),
    recurringEventId: ev.recurringEventId || null,
    seriesId: ev.extendedProperties?.private?.luachSeriesId || null,
  };
}

/**
 * Creates an event on the given calendar (default: primary). Dates/times are the
 * wall-clock values the user typed, interpreted in the browser's time zone.
 * @param {string} accessToken
 * @param {{calendarId?: string, title: string, date: string, endDate?: string, allDay: boolean, startTime?: string, endTime?: string, description?: string, recurrence?: GregRecurrence, seriesId?: string}} input
 *   date/endDate: 'YYYY-MM-DD', endDate inclusive (default: date); startTime/endTime: 'HH:MM' (required unless allDay);
 *   recurrence makes it a recurring Google event; seriesId tags one event of a
 *   createEventSeries() batch
 * @returns {Promise<object>} the created Google Calendar event resource
 */
export async function createEvent(accessToken, { calendarId = 'primary', title, date, endDate, allDay, startTime, endTime, description, recurrence, seriesId }) {
  const body = { summary: title };
  if (description) body.description = description;
  if (recurrence) body.recurrence = [toRRule(recurrence, allDay)];
  if (seriesId) body.extendedProperties = { private: { luachSeriesId: seriesId } };
  Object.assign(body, toStartEnd({ date, endDate, allDay, startTime, endTime }));

  const res = await fetch(eventsUrl(calendarId), {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('events.insert ' + res.status);
  return res.json();
}

/**
 * start/end for an event from `date` to `endDate` (inclusive; default: same day).
 * Both date and dateTime are always sent (one of them null) so a PATCH can
 * switch an event between all-day and timed.
 */
function toStartEnd({ date, endDate = date, allDay, startTime, endTime }) {
  if (allDay) {
    // All-day end dates are exclusive in the Calendar API — an event ends the day after its last day.
    return {
      start: { date, dateTime: null, timeZone: null },
      end: { date: addDaysKey(endDate, 1), dateTime: null, timeZone: null },
    };
  }
  // No offset in dateTime: the API interprets it in the explicit timeZone, which
  // gets DST right for the event's own date (not today's offset).
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    start: { date: null, dateTime: `${date}T${startTime}:00`, timeZone },
    end: { date: null, dateTime: `${endDate}T${endTime}:00`, timeZone },
  };
}

/** An event resource's own (local) start date, 'YYYY-MM-DD'. */
function ownDate(resource) {
  return resource.start.date || toKey(new Date(resource.start.dateTime));
}

/**
 * @typedef {{freq: 'daily'|'weekly'|'monthly'|'yearly', count?: number, until?: string}} GregRecurrence
 *   until: 'YYYY-MM-DD', inclusive. Neither count nor until = repeats forever.
 */

// Weekly/monthly/yearly repeat on the start date's weekday/day-of-month/date,
// which is the RRULE default, so no BYDAY/BYMONTHDAY is needed.
function toRRule({ freq, count, until }, allDay) {
  let rule = 'RRULE:FREQ=' + freq.toUpperCase();
  if (count) {
    rule += ';COUNT=' + count;
  } else if (until) {
    const [y, m, d] = until.split('-').map(Number);
    // UNTIL must match DTSTART's type: a plain date for all-day events, a UTC
    // date-time for timed ones (end of that local day, so it's inclusive).
    rule += ';UNTIL=' + (allDay
      ? until.replaceAll('-', '')
      : new Date(y, m - 1, d, 23, 59, 59).toISOString().replace(/[-:]|\.\d{3}/g, ''));
  }
  return rule;
}

/**
 * Creates one separate event per date (for recurrences Google's RRULE can't
 * express, like by Hebrew date), all tagged with a shared series id. A few
 * requests run in parallel to stay well under the API's rate limits.
 * @param {string} accessToken
 * @param {object} input same as createEvent's, minus recurrence; its date/endDate
 *   give each event's length, the dates below where each one starts
 * @param {string[]} dates 'YYYY-MM-DD' each
 * @returns {Promise<{created: number, failed: number}>}
 */
export async function createEventSeries(accessToken, input, dates) {
  const seriesId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const spanDays = input.endDate ? daysBetweenKeys(input.date, input.endDate) : 0;
  const { done, failed } = await runPool(dates, date =>
    createEvent(accessToken, { ...input, date, endDate: addDaysKey(date, spanDays), seriesId }));
  return { created: done, failed };
}

/** Runs task(item) for every item, a few at a time. */
async function runPool(items, task, concurrency = 4) {
  let done = 0, failed = 0, next = 0;
  async function worker() {
    while (next < items.length) {
      const item = items[next++];
      try {
        await task(item);
        done++;
      } catch (e) {
        failed++;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return { done, failed };
}

async function api(accessToken, url, { method = 'GET', body } = {}) {
  const res = await fetch(url, {
    method,
    headers: { Authorization: 'Bearer ' + accessToken, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  // 410 Gone on DELETE = already deleted, which is what we wanted anyway.
  if (method === 'DELETE' && res.status === 410) return null;
  if (!res.ok) throw new Error(`${method} ${res.status}`);
  return res.status === 204 ? null : res.json();
}

/** Every event of a Hebrew-date series (all dates, past and future). */
async function listSeries(accessToken, calendarId, seriesId) {
  const url = eventsUrl(calendarId) + '?maxResults=250&privateExtendedProperty='
    + encodeURIComponent('luachSeriesId=' + seriesId);
  const data = await api(accessToken, url);
  return (data.items || []).filter(ev => ev.status !== 'cancelled');
}

/**
 * @typedef {object} EventChanges
 * @property {string} title
 * @property {string} description
 * @property {null | {date?: string, spanDays: number, allDay: boolean, startTime?: string, endTime?: string}} timing
 *   null = keep date/times as they are. No `date` = keep each event's own date
 *   (used when changing a whole series). spanDays = days from the start date
 *   to the end date (0 = ends the same day).
 */

/** @param {string} eventDate the event's own date, used when timing has no date */
function patchBody(eventDate, { title, description, timing }) {
  const body = { summary: title, description };
  if (timing) {
    const date = timing.date || eventDate;
    Object.assign(body, toStartEnd({ ...timing, date, endDate: addDaysKey(date, timing.spanDays) }));
  }
  return body;
}

/**
 * Edits an event. scope 'one' = just this event (or this one instance of a
 * recurring event); 'all' = the whole series it belongs to — a Google recurring
 * event (edits its master) or a Hebrew-date series (edits each of its events).
 * @param {string} accessToken
 * @param {CalEvent} ev
 * @param {'one'|'all'} scope
 * @param {EventChanges} changes
 * @returns {Promise<{done: number, failed: number}>}
 */
export async function updateEvent(accessToken, ev, scope, changes) {
  const patch = (id, eventDate) => api(accessToken, `${eventsUrl(ev.calendarId)}/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: patchBody(eventDate, changes) });

  if (scope === 'all' && ev.recurringEventId) {
    // The master's own date is the series' first occurrence — keep it.
    const master = await api(accessToken, `${eventsUrl(ev.calendarId)}/${encodeURIComponent(ev.recurringEventId)}`);
    await patch(master.id, ownDate(master));
    return { done: 1, failed: 0 };
  }
  if (scope === 'all' && ev.seriesId) {
    const events = await listSeries(accessToken, ev.calendarId, ev.seriesId);
    return runPool(events, resource => patch(resource.id, ownDate(resource)));
  }
  await patch(ev.id, toKey(ev.date));
  return { done: 1, failed: 0 };
}

/**
 * Deletes an event; scope as in updateEvent. Deleting one instance of a Google
 * recurring event leaves the rest of the series in place.
 * @returns {Promise<{done: number, failed: number}>}
 */
export async function deleteEvent(accessToken, ev, scope) {
  const del = (id) => api(accessToken, `${eventsUrl(ev.calendarId)}/${encodeURIComponent(id)}`, { method: 'DELETE' });

  if (scope === 'all' && ev.recurringEventId) {
    await del(ev.recurringEventId);
    return { done: 1, failed: 0 };
  }
  if (scope === 'all' && ev.seriesId) {
    return runPool(await listSeries(accessToken, ev.calendarId, ev.seriesId), resource => del(resource.id));
  }
  await del(ev.id);
  return { done: 1, failed: 0 };
}
