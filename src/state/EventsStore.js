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

export function setEvents(newEvents) {
  events = newEvents;
  listeners.forEach(fn => fn(events));
}

export function onEventsChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
