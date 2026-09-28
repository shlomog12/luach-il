// Stateless: fetches/creates events given a token, returns the results. Doesn't know how the
// token was obtained (GoogleAuthService) or where the results get stored
// (EventsStore) — those are wired together in main.js.

import { toKey } from '../utils/dateFormat.js';

/**
 * All of the user's calendars. `writable` is true where the user may add events
 * (accessRole owner/writer — not read-only or free/busy-only shared calendars).
 * @param {string} accessToken
 * @returns {Promise<{id: string, summary: string, primary: boolean, writable: boolean}[]>}
 */
export async function fetchCalendarList(accessToken) {
  const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
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
 * @param {{id: string, summary: string}[]} calendars from fetchCalendarList
 * @returns {Promise<{date: Date, title: string, allDay: boolean, calName: string}[]>}
 */
export async function fetchUpcomingEvents(accessToken, daysAhead, calendars) {
  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + daysAhead * 86400000).toISOString();

  const all = [];
  await Promise.all(calendars.map(async cal => {
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events`
      + `?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`
      + `&singleEvents=true&orderBy=startTime&maxResults=50`;
    try {
      const r = await fetch(url, { headers: { Authorization: 'Bearer ' + accessToken } });
      if (!r.ok) return;
      const data = await r.json();
      (data.items || []).forEach(ev => {
        if (ev.status === 'cancelled') return;
        const allDay = !!ev.start.date;
        const dateStr = ev.start.dateTime || ev.start.date;
        all.push({ date: new Date(dateStr), title: ev.summary || '(ללא כותרת)', allDay, calName: cal.summary });
      });
    } catch (e) {
      // skip this calendar on error — one bad calendar shouldn't hide the rest
    }
  }));

  return all.sort((a, b) => a.date - b.date);
}

/**
 * Creates an event on the given calendar (default: primary). Dates/times are the
 * wall-clock values the user typed, interpreted in the browser's time zone.
 * @param {string} accessToken
 * @param {{calendarId?: string, title: string, date: string, allDay: boolean, startTime?: string, endTime?: string, description?: string, recurrence?: GregRecurrence, seriesId?: string}} input
 *   date: 'YYYY-MM-DD'; startTime/endTime: 'HH:MM' (required unless allDay);
 *   recurrence makes it a recurring Google event; seriesId tags one event of a
 *   createEventSeries() batch
 * @returns {Promise<object>} the created Google Calendar event resource
 */
export async function createEvent(accessToken, { calendarId = 'primary', title, date, allDay, startTime, endTime, description, recurrence, seriesId }) {
  const body = { summary: title };
  if (description) body.description = description;
  if (recurrence) body.recurrence = [toRRule(recurrence, allDay)];
  if (seriesId) body.extendedProperties = { private: { luachSeriesId: seriesId } };
  if (allDay) {
    // All-day end dates are exclusive in the Calendar API — a one-day event ends the next day.
    const [y, m, d] = date.split('-').map(Number);
    body.start = { date };
    body.end = { date: toKey(new Date(y, m - 1, d + 1)) };
  } else {
    // No offset in dateTime: the API interprets it in the explicit timeZone, which
    // gets DST right for the event's own date (not today's offset).
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    body.start = { dateTime: `${date}T${startTime}:00`, timeZone };
    body.end = { dateTime: `${date}T${endTime}:00`, timeZone };
  }

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('events.insert ' + res.status);
  return res.json();
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
 * @param {object} input same as createEvent's, minus date/recurrence
 * @param {string[]} dates 'YYYY-MM-DD' each
 * @returns {Promise<{created: number, failed: number}>}
 */
export async function createEventSeries(accessToken, input, dates) {
  const seriesId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  let created = 0, failed = 0, next = 0;
  async function worker() {
    while (next < dates.length) {
      const date = dates[next++];
      try {
        await createEvent(accessToken, { ...input, date, seriesId });
        created++;
      } catch (e) {
        failed++;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, dates.length) }, worker));
  return { created, failed };
}
