# אחריות כל מודול

לכל מודול: **מטרה** (מדוע קיים), **API ציבורי** (ברמת קונספט, לא חתימה
מדויקת), **תלויות מותרות**, ו**מה אסור לו לעשות** (גבולות SRP).

---

## `config/constants.js`

**מטרה**: קבועים גלובליים שאינם "נתונים" (locations) אלא הגדרות התנהגות.

**מייצא**: מפתחות `localStorage`/`sessionStorage` (כמחרוזות קבועות
יחידות — לא לשכפל string literal בכמה קבצים), `YEAR_SPAN_BACK/FWD`,
גרסת ה-CDN המוצמדת של `@hebcal/core`, מספר הימים לשליפת אירועי גוגל (60).

**תלויות מותרות**: אין (קובץ ערכים טהור).

**אסור**: שום לוגיקה, שום import של DOM.

---

## `config/locations.js`

**מטרה**: מקור האמת ל-20 המיקומים המוגדרים מראש.

**מייצא**: מערך `PRESET_LOCATIONS` (קבוע, immutable).

**תלויות מותרות**: אין.

**אסור**: לוגיקת חישוב, גישה ל-storage.

---

## `services/HebrewCalendarService.js`

**מטרה**: היחיד שמכיר את `@hebcal/core` לצורך לוח עברי/חגים/פרשה. כל
שאר הקוד "לא יודע" ש-`@hebcal/core` קיים — פונה רק ל-interface הזה.

**API ציבורי (רעיוני)**:
- `toHebrewDate(gregorianDate) -> {day, monthName, year}`
- `fromHebrewDate(day, month, year) -> gregorianDate`
- `getMonthsInHebrewYear(year) -> number`
- `getDaysInHebrewMonth(month, year) -> number`
- `addHebrewMonths(month, year, delta) -> {month, year}`
- `getDayInfoRange(startDate, endDate) -> Map<dateKey, {holidays: string[], parsha: string|null}>`
- `formatHebrewNumber(n) -> string` (גימטריה)
- `formatHebrewYear(year) -> string`

**תלויות מותרות**: `hebcal` (global מה-CDN) בלבד.

**אסור**: לגעת ב-DOM, לדעת על `localStorage`, לדעת על Google Calendar.

---

## `services/ZmanimService.js`

**מטרה**: חישוב זמני היום להלכה, כולל התאמת גובה ("שקיעה נראית").

**API ציבורי**:
- `getDailyZmanim(date, location) -> {alotHaShachar, sunrise, sofZmanShma, ..., tzeit, candleLighting}`
  כאשר `location` הוא `{lat, lon, elevation}` (לא תלוי ב-`LocationStore` —
  מקבל את הנתונים כפרמטר, לא שולף בעצמו).

**תלויות מותרות**: `hebcal` (`Location`, `Zmanim`) בלבד.

**אסור**: לדעת מהו "המיקום הנבחר כרגע" (זו אחריות `LocationStore`) — כל
קריאה מקבלת מיקום מפורש כפרמטר. זה מה שהופך את השירות לניתן-לבדיקה
(testable) בבידוד.

---

## `services/ElevationService.js`

**מטרה**: שליפת גובה מעל פני הים לקואורדינטות נתונות, דרך Open-Meteo.

**API ציבורי**:
- `async lookupElevation(lat, lon) -> number` (זורק/מחזיר `null` בכישלון
  — ה-caller מחליט על ברירת מחדל, לא השירות עצמו)

**תלויות מותרות**: `fetch` גלובלי בלבד.

**אסור**: לטפל בברירת מחדל (0 מ') — זו אחריות ה-caller
(`LocationStore`/`LocationDialog`), לא של השירות.

---

## `services/GoogleAuthService.js`

**מטרה**: כל מחזור החיים של האימות מול Google — יצירת token client,
רענון שקט, גיבוי ידני, שמירת טוקן.

**API ציבורי**:
- `initialize(clientId, scope) -> void`
- `getValidAccessToken() -> Promise<string | null>` (מנסה session-cache →
  רענון שקט → מחזיר `null` אם צריך אישור ידני)
- `requestConsent() -> void` (מפעיל פופאפ הסכמה)
- `onAuthChange(callback)` — pub/sub להודעה על שינוי סטטוס חיבור (לצורך
  `AuthStatusBar`, ראו [03](03-state-management-pattern.md))

**תלויות מותרות**: `google.accounts.oauth2` (global), `sessionStorage`
דרך `utils/safeStorage.js` בלבד (לא ישירות).

**אסור**: לדעת מה עושים עם הטוקן אחרי שהוא מתקבל (שליפת אירועים היא
אחריות `GoogleCalendarService`).

---

## `services/GoogleCalendarService.js`

**מטרה**: שליפת אירועים מ-Google Calendar API, נתון טוקן תקף.

**API ציבורי**:
- `async fetchUpcomingEvents(accessToken, daysAhead) -> Event[]`
  כאשר `Event = {date, title, allDay, calendarName}`

**תלויות מותרות**: `fetch` גלובלי, `config/constants.js` (למספר הימים).

**אסור**: לדעת איך משיגים טוקן (מקבל אותו כפרמטר) — decoupled מ-
`GoogleAuthService` לגמרי. שני השירותים מחוברים רק דרך `main.js`.

---

## `state/*Store.js` (ארבעת ה-stores)

ראו פירוט מלא של תבנית ה-Store ב-
[03-state-management-pattern.md](03-state-management-pattern.md). בקצרה,
לכל store: `get()`, `set(value)` (כולל כתיבה ל-storage אם רלוונטי),
`subscribe(callback)`.

| Store | מחזיק | persist? |
|---|---|---|
| `ViewModeStore` | `'heb' \| 'greg'` | כן (`localStorage`) |
| `LocationStore` | `{name, lat, lon, elevation}` | כן (`localStorage`) |
| `CalendarNavigationStore` | `current`, `hebCursor`, `selected` | לא |
| `ZmanimDisclosureStore` | `boolean` (פתוח/סגור) | כן (`localStorage`) |

**תלויות מותרות**: `utils/safeStorage.js` בלבד (לאלה שעושים persist).

**אסור**: שום store לא מכיר `services/*` או `components/*` — זרימת מידע
היא **חד-כיוונית**: components → stores/services → components (דרך
subscribe), לא stores שקוראים ל-components.

---

## `components/*.js`

ראו פירוט מלא ב-[04-component-design.md](04-component-design.md). כלל
אצבע: קומפוננטה מקבלת container DOM + stores/services רלוונטיים
(**מוזרקים דרך הבנאי/פונקציית היצירה**, לא global lookup), יודעת לרנדר
את עצמה, ומפרסמת אירועים (callbacks) במקום לקרוא ישירות לקומפוננטות
אחרות.

---

## `utils/dateFormat.js`

**מטרה**: פונקציות טהורות (pure functions) לפירמוט תאריכים/טווחים —
`toKey`, `fmtTime`, `gregRangeLabel`, `hebRangeLabel`. ללא state, ללא
side effects.

**תלויות מותרות**: אין (או `services/HebrewCalendarService` בלבד עבור
`hebRangeLabel`, שצריך `formatHebrewYear`/`heDayStr`).

---

## `utils/safeStorage.js`

**מטרה**: לרכז את כל דפוס ה-`try{...}catch(e){}` סביב
`localStorage`/`sessionStorage` **במקום אחד**, במקום לשכפל אותו בכל store.

**API ציבורי**:
- `safeGet(storage, key) -> string | null`
- `safeSet(storage, key, value) -> boolean` (מחזיר האם הצליח)

**תלויות מותרות**: אין.

**אסור**: לדעת *מה* המפתחות אומרים (זו אחריות ה-stores שמשתמשים בזה).
