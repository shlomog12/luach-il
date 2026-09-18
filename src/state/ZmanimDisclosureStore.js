// Whether the "זמני היום" <details> was left open or closed — read/written at
// specific moments (DayDetailPanel render + toggle event), not something other
// components reactively display differently, so no pub/sub needed here.

import { STORAGE_KEYS } from '../config/constants.js';
import { safeGet, safeSet } from '../utils/safeStorage.js';

export function isZmanOpen() {
  return safeGet(localStorage, STORAGE_KEYS.ZMAN_OPEN) === '1';
}

export function setZmanOpen(isOpen) {
  safeSet(localStorage, STORAGE_KEYS.ZMAN_OPEN, isOpen ? '1' : '0');
}
