// Public, keyless elevation lookup (Open-Meteo) — used only when a visitor saves a
// custom lat/lon location, so its zmanim can also use "visible sunrise/sunset".

/**
 * @returns {Promise<number|null>} elevation in meters, or null if the lookup failed
 *   (offline, blocked, malformed response). The caller decides the fallback
 *   (sea level) — this function only reports what it found.
 */
export async function lookupElevation(lat, lon) {
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`);
    const data = await r.json();
    if (data && Array.isArray(data.elevation) && isFinite(data.elevation[0])) {
      return data.elevation[0];
    }
  } catch (e) {
    // offline or blocked — fall back to sea level, handled by the caller
  }
  return null;
}
