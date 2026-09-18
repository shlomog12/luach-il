// Owns the entire Google OAuth token lifecycle: creating the token client, the
// silent-refresh-on-every-visit flow, the manual consent fallback, and token
// storage. Publishes auth status changes via onAuthChange(); doesn't know what
// happens after connecting (that's GoogleCalendarService's job, wired in main.js).

import { STORAGE_KEYS } from '../config/constants.js';
import { safeGet, safeSet } from '../utils/safeStorage.js';

let accessToken = safeGet(sessionStorage, STORAGE_KEYS.GCAL_TOKEN) || null;
let tokenExpiry = parseInt(safeGet(sessionStorage, STORAGE_KEYS.GCAL_TOKEN_EXP) || '0', 10);
let tokenClient = null;

const listeners = new Set();
/** status: 'unconfigured' | true (connected) | false (not connected) */
function notify(status) {
  listeners.forEach(fn => fn(status));
}

/** @param {(status: 'unconfigured'|boolean) => void} fn */
export function onAuthChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getAccessToken() {
  return (accessToken && Date.now() < tokenExpiry) ? accessToken : null;
}

export function initGoogleAuth(clientId, scope) {
  if (!clientId || clientId.startsWith('YOUR_CLIENT_ID')) {
    notify('unconfigured');
    return;
  }
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope,
    callback: (resp) => {
      if (resp.error) {
        // Silent refresh failed (e.g. no active Google session in this browser) —
        // fall back to showing the manual connect button instead of erroring out.
        notify(false);
        return;
      }
      accessToken = resp.access_token;
      tokenExpiry = Date.now() + resp.expires_in * 1000;
      safeSet(sessionStorage, STORAGE_KEYS.GCAL_TOKEN, accessToken);
      safeSet(sessionStorage, STORAGE_KEYS.GCAL_TOKEN_EXP, String(tokenExpiry));
      notify(true);
    },
  });
  if (accessToken && Date.now() < tokenExpiry) {
    notify(true);
  } else {
    // Every fresh visit: try to get a token in the background, with no popup.
    // Works as long as you're still signed into Google in this browser and
    // already granted access once — so a weekly visit just loads current
    // events automatically, with no click needed.
    tokenClient.requestAccessToken({ prompt: '' });
  }
}

export function requestConsent() {
  tokenClient?.requestAccessToken({ prompt: 'consent' });
}
