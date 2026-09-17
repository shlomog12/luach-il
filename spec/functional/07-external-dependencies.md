# שירותים חיצוניים ותלויות

כל תלות חיצונית נטענת ישירות בדפדפן (אין build step/bundler) — או דרך
`<script src>` רגיל, או דרך `fetch` ל-API ציבורי.

## Google Identity Services

- `https://accounts.google.com/gsi/client` (נטען `async defer`).
- אחראי על זרימת ה-OAuth (token client). ראו
  [04-google-calendar-integration.md](04-google-calendar-integration.md).

## Google Calendar API v3

- `https://www.googleapis.com/calendar/v3/...` — `calendarList` +
  `events` per calendar. נקרא ישירות מהדפדפן עם ה-access token
  (Authorization header), אין proxy.

## `@hebcal/core`

- טעינה: `<script src="https://cdn.jsdelivr.net/npm/@hebcal/core@6.9.2/dist/bundle.min.js">`
  — **גרסה מוצמדת (pinned)**, לא `latest`, כדי שעדכון בספרייה לא ישבור
  את האתר בלי שינוי מכוון.
- חושף global בשם `hebcal` (UMD bundle) — נצרך ישירות, אין `import`
  מודולרי בקוד הנוכחי.
- שימושים: `HDate` (המרת תאריכים), `HebrewCalendar.calendar()` (חגים +
  פרשה), `Location`/`Zmanim` (זמני היום), `Locale`/`gematriya`
  (תרגום/פירמוט עברי).
- **למה ספרייה ולא נוסחה עצמאית**: חישוב לוח עברי מדויק (מולד, שנים
  מעוברות, פרשות כפולות/יחידות תלוית שנה) הוא מורכב מספיק שכדאי להסתמך
  על ספרייה בשימוש נרחב ומתוחזקת, במקום לממש/לתחזק לוגיקה כזו לבד.

## Google Fonts

- `Frank Ruhl Libre` + `Heebo` דרך `fonts.googleapis.com` /
  `fonts.gstatic.com`.

## Open-Meteo Elevation API

- `https://api.open-meteo.com/v1/elevation?latitude=...&longitude=...`
- שירות ציבורי, ללא מפתח API, ללא הגבלת CORS. נקרא **רק** כשמשתמש שומר
  מיקום מותאם-אישית (לא בכל טעינת עמוד), כדי לדעת את הגובה מעל פני הים
  לחישוב זמנים ("שקיעה נראית" — ראו [03](03-zmanim.md)).
- כישלון בקריאה (אופליין וכו') לא חוסם שמירת המיקום — נופל לגובה 0.

## הערה בנוגע ל-yeshiva.org.il

**האתר לא ניגש בשום שלב לאתר yeshiva.org.il או ל-backend שלו.** נבדק
במפורש (ראו החלטת עיצוב) והתברר ש:

1. האתר מוגן ב-Cloudflare עם אתגר JS ("Just a moment...") שחוסם גישה
   אוטומטית/תכנותית.
2. גם אם היה ניתן לזהות את ה-API הפנימי שלהם, קריאה אליו מדומיין אחר
   הייתה נחסמת ע"י CORS (לא מיועד לצריכה חיצונית).
3. עקיפת הגנת בוט מכוונת כדי "לשאוב" נתונים משרת של אתר אחר אינה פרקטיקה
   ראויה, גם אם הייתה טכנית אפשרית.

**הפתרון שנבחר במקום זה**: שימוש בשיטת החישוב שלהם (זמנים לפי גובה,
"שקיעה נראית") **דרך ספריית `@hebcal/core` המקומית**, שמחשבת תוצאות
דומות ללא כל תלות ברשת/באתר השלישי — ראו [03-zmanim.md](03-zmanim.md).
