// Daily halachic times via @hebcal/core's Zmanim class — same GR"A-based times
// yeshiva.org.il and similar sites use, computed locally with no network call.
// Doesn't know about "the currently selected location" — the caller (LocationStore
// consumer) passes location in explicitly, which keeps this testable in isolation.

/**
 * @param {Date} dateObj
 * @param {{lat: number, lon: number, elevation?: number, name?: string}} location
 */
export function getDailyZmanim(dateObj, location) {
  // useElevation:true -> "שקיעה נראית" (visible sunrise/sunset, adjusted for the
  // location's elevation), matching how yeshiva.org.il computes its times —
  // rather than the flat/sea-level ("מישורית") calculation. See spec/functional/03.
  const loc = new window.hebcal.Location(
    location.lat, location.lon, true, 'Asia/Jerusalem', location.name, 'IL',
    undefined, location.elevation || 0
  );
  const z = new window.hebcal.Zmanim(loc, dateObj, true);
  return {
    alotHaShachar: z.alotHaShachar(), sunrise: z.neitzHaChama(),
    sofZmanShma: z.sofZmanShma(), sofZmanTfilla: z.sofZmanTfilla(),
    chatzot: z.chatzot(), minchaGedola: z.minchaGedola(), minchaKetana: z.minchaKetana(),
    plagHaMincha: z.plagHaMincha(), sunset: z.shkiah(), tzeitHakochavim: z.tzeit(8.5),
    candleLighting: z.sunsetOffset(-30, true),
  };
}
