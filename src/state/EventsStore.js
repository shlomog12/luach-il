// Holds the currently-fetched Google Calendar events, shared by CalendarGrid
// (chips), DayDetailPanel (this day's events), and EventsListPanel (the full
// 60-day list). Not persisted — refetched fresh on every page load via
// GoogleAuthService + GoogleCalendarService, wired together in main.js.
//
// This store isn't in the original architecture spec's 4-store list — it's a
// small, deliberate addition: GoogleCalendarService is a stateless fetch
// function per the spec (SRP), so something has to hold the result as shared
// state for multiple components to read.

let events = [];
const listeners = new Set();

export function getEvents() {
  return events;
}

/**
 * Events that overlap the given local day — not just ones starting on it, so a
 * multi-day event shows on every day it spans. `end` is exclusive, so an event
 * ending exactly at midnight doesn't spill into the next day.
 * @param {Date} day any time on the day
 */
export function getEventsOn(day) {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
  return events.filter(ev => ev.date < dayEnd && (ev.end > dayStart || +ev.date === +dayStart));
}

export function setEvents(newEvents) {
  events = newEvents;
  listeners.forEach(fn => fn(events));
}

export function onEventsChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
