// App-wide configuration values. Pure data — no logic, no DOM, no storage access.

export const CLIENT_ID = "964103737504-s8r1hp6o18plebl7nsh26u8okkb2hauo.apps.googleusercontent.com";
export const CAL_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
export const GCAL_DAYS_AHEAD = 60;

export const STORAGE_KEYS = {
  LOCATION: 'luach_loc',
  VIEW_MODE: 'luach_mode',
  ZMAN_OPEN: 'luach_zman_open',
  GCAL_TOKEN: 'gcal_token',
  GCAL_TOKEN_EXP: 'gcal_token_exp',
};

// Jump-to-date dropdown year window: not infinite, a reasonable span either side of today.
export const YEAR_SPAN_BACK = 5;
export const YEAR_SPAN_FWD = 15;

export const GREG_MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
export const GREG_MONTHS_SHORT = ["ינו","פבר","מרץ","אפר","מאי","יונ","יול","אוג","ספט","אוק","נוב","דצמ"];
export const WEEKDAY_HE = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];
