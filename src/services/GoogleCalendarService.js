// Stateless: fetches events given a token, returns them. Doesn't know how the
// token was obtained (GoogleAuthService) or where the results get stored
// (EventsStore) — those are wired together in main.js.

/**
 * @param {string} accessToken
 * @param {number} daysAhead
 * @returns {Promise<{date: Date, title: string, allDay: boolean, calName: string}[]>}
 */
export async function fetchUpcomingEvents(accessToken, daysAhead) {
  const calListRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { Authorization: 'Bearer ' + accessToken },
  });
  if (!calListRes.ok) throw new Error('calendarList ' + calListRes.status);
  const calList = await calListRes.json();
  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + daysAhead * 86400000).toISOString();

  const all = [];
  await Promise.all((calList.items || []).map(async cal => {
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
