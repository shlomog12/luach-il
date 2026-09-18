// Which calendar system is currently displayed: 'heb' or 'greg'. Persisted
// locally, default 'heb'. See CalendarNavigationStore.switchViewMode() for the
// coordinated mode-switch behavior (recomputing the nav cursor) — this store
// only holds the raw value.

import { STORAGE_KEYS } from '../config/constants.js';
import { safeGet, safeSet } from '../utils/safeStorage.js';

function load() {
  const m = safeGet(localStorage, STORAGE_KEYS.VIEW_MODE);
  return (m === 'heb' || m === 'greg') ? m : 'heb';
}

let value = load();
const listeners = new Set();

export function getViewMode() {
  return value;
}

export function setViewMode(mode) {
  if (mode === value) return;
  value = mode;
  safeSet(localStorage, STORAGE_KEYS.VIEW_MODE, mode);
  listeners.forEach(fn => fn(value));
}

export function onViewModeChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
