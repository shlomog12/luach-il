// Preset locations for the zmanim location picker. `elevation` (meters above sea
// level) drives the "visible sunrise/sunset" calculation — see ZmanimService.
// Sourced from the Open-Meteo public elevation API; see spec/functional/07.

export const PRESET_LOCATIONS = [
  {name:"ירושלים", lat:31.7683, lon:35.2137, elevation:783},
  {name:"תל אביב", lat:32.0853, lon:34.7818, elevation:17},
  {name:"חיפה", lat:32.7940, lon:34.9896, elevation:256},
  {name:"באר שבע", lat:31.2530, lon:34.7915, elevation:287},
  {name:"אילת", lat:29.5581, lon:34.9482, elevation:63},
  {name:"מעלה לבונה", lat:32.05444, lon:35.24083, elevation:771},
  {name:"בני ברק", lat:32.0807, lon:34.8338, elevation:47},
  {name:"פתח תקווה", lat:32.0878, lon:34.8878, elevation:44},
  {name:"נתניה", lat:32.3215, lon:34.8532, elevation:30},
  {name:"אשדוד", lat:31.8014, lon:34.6435, elevation:37},
  {name:"אשקלון", lat:31.6688, lon:34.5715, elevation:47},
  {name:"ראשון לציון", lat:31.9730, lon:34.7925, elevation:42},
  {name:"רחובות", lat:31.8928, lon:34.8113, elevation:43},
  {name:"מודיעין", lat:31.8969, lon:35.0095, elevation:238},
  {name:"צפת", lat:32.9646, lon:35.4960, elevation:782},
  {name:"טבריה", lat:32.7922, lon:35.5312, elevation:-138},
  {name:"בית שמש", lat:31.7476, lon:34.9887, elevation:287},
  {name:"אריאל", lat:32.1058, lon:35.1735, elevation:572},
  {name:"קריית ארבע", lat:31.5300, lon:35.1177, elevation:951},
  {name:"עפולה", lat:32.6077, lon:35.2897, elevation:61},
];

export const DEFAULT_LOCATION = PRESET_LOCATIONS[0]; // ירושלים
