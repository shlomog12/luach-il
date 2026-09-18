import { DEFAULT_LOCATION } from '../config/locations.js';
import { STORAGE_KEYS } from '../config/constants.js';
import { safeGet, safeSet } from '../utils/safeStorage.js';

function load() {
  const raw = safeGet(localStorage, STORAGE_KEYS.LOCATION);
  if (raw) {
    try {
      const obj = JSON.parse(raw);
      if (obj && typeof obj.lat === 'number' && typeof obj.lon === 'number' && obj.name) return obj;
    } catch (e) {
      // malformed JSON — fall through to default
    }
  }
  return DEFAULT_LOCATION;
}

let value = load();
const listeners = new Set();

export function getLocation() {
  return value;
}

export function setLocation(loc) {
  value = loc;
  safeSet(localStorage, STORAGE_KEYS.LOCATION, JSON.stringify(loc));
  listeners.forEach(fn => fn(value));
}

export function onLocationChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
