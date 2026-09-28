// Owns the entire Google OAuth token lifecycle: creating the token client, the
// silent-refresh-on-every-visit flow, the manual consent fallback, and token
// storage. Publishes auth status changes via onAuthChange(); doesn't know what
// happens after connecting (that's GoogleCalendarService's job, wired in main.js).

import { STORAGE_KEYS } from '../config/constants.js';
import { safeGet, safeSet } from '../utils/safeStorage.js';

let accessToken = safeGet(sessionStorage, STORAGE_KEYS.GCAL_TOKEN) || null;
let tokenExpiry = parseInt(safeGet(sessionStorage, STORAGE_KEYS.GCAL_TOKEN_EXP) || '0', 10);
/** Space-separated scopes actually granted on the current token. */
let grantedScope = safeGet(sessionStorage, STORAGE_KEYS.GCAL_TOKEN_SCOPE) || '';
let tokenClient = null;
let baseScope = '';
/** Resolver for an in-flight requestScope() popup; null for the regular connect/refresh flow. */
let pendingScopeRequest = null;

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

/** Whether the current (unexpired) token was granted `scope`. */
export function hasScope(scope) {
  return !!getAccessToken() && grantedScope.split(' ').includes(scope);
}

export function initGoogleAuth(clientId, scope) {
  if (!clientId || clientId.startsWith('YOUR_CLIENT_ID')) {
    notify('unconfigured');
    return;
  }
  baseScope = scope;
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope,
    callback: (resp) => {
      const scopeRequest = pendingScopeRequest;
      pendingScopeRequest = null;
      if (resp.error) {
        if (scopeRequest) { scopeRequest.resolve(false); return; } // declined — stay connected read-only
        // Silent refresh failed (e.g. no active Google session in this browser) —
        // fall back to showing the manual connect button instead of erroring out.
        notify(false);
        return;
      }
      accessToken = resp.access_token;
      tokenExpiry = Date.now() + resp.expires_in * 1000;
      grantedScope = resp.scope || '';
      safeSet(sessionStorage, STORAGE_KEYS.GCAL_TOKEN, accessToken);
      safeSet(sessionStorage, STORAGE_KEYS.GCAL_TOKEN_EXP, String(tokenExpiry));
      safeSet(sessionStorage, STORAGE_KEYS.GCAL_TOKEN_SCOPE, grantedScope);
      if (scopeRequest) { scopeRequest.resolve(hasScope(scopeRequest.scope)); return; }
      notify(true);
    },
    // Popup closed or blocked before Google answered (the callback above never
    // fires in that case). A still-valid token means we're still connected.
    error_callback: () => {
      const scopeRequest = pendingScopeRequest;
      pendingScopeRequest = null;
      if (scopeRequest) scopeRequest.resolve(false);
      else if (!getAccessToken()) notify(false);
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

/**
 * Incremental authorization: asks for an extra scope on top of what's already
 * granted (GIS's include_granted_scopes defaults to true, so the new token
 * keeps read access too, and later silent refreshes keep the extra scope).
 * Must be called synchronously from a user gesture (click), or the browser
 * blocks the popup.
 * @returns {Promise<boolean>} whether the scope is now granted
 */
export function requestScope(scope) {
  if (hasScope(scope)) return Promise.resolve(true);
  if (!tokenClient) return Promise.resolve(false);
  if (pendingScopeRequest) pendingScopeRequest.resolve(false);
  return new Promise((resolve) => {
    pendingScopeRequest = { scope, resolve };
    // Ask for the base scope again too, so the new token never ends up narrower
    // than the one it replaces.
    tokenClient.requestAccessToken({ prompt: '', scope: `${baseScope} ${scope}` });
  });
}
