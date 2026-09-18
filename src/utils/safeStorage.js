// Centralizes the try/catch that every localStorage/sessionStorage access needs
// (private-browsing modes, disabled storage, quota errors, etc. can all throw).
// No other module should touch `storage.getItem`/`setItem` directly.

export function safeGet(storage, key) {
  try { return storage.getItem(key); }
  catch (e) { return null; }
}

export function safeSet(storage, key, value) {
  try { storage.setItem(key, value); return true; }
  catch (e) { return false; }
}
