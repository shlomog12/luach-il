# לוח שנה עברי · לועזי (luach-il)

אפליקציית web (PWA) שרצה בדפדפן בלבד — בלי שרת — ומציגה לוח שנה עברי
ולועזי, חגים, פרשת שבוע, זמני היום ההלכתיים (לפי מיקום שבוחרים), ומסונכרנת
עם Google Calendar שלכם (קריאה בלבד): אירוע שמוסיפים ביומן גוגל מופיע גם
בלוח כאן.

🔗 **אתר חי**: https://luach-il.netlify.app

## מה יש כאן

- לוח עברי/לועזי עם החלפת תצוגה, ניווט לפי חודשים (עברי או לועזי, בהתאם
  לתצוגה), ודילוג ישיר לתאריך ספציפי.
- חגים, ראש חודש, חול המועד ופרשת השבוע (לוח ישראל), מחושבים ללא הגבלת
  טווח תאריכים.
- זמני היום (עלות השחר ועד צאת הכוכבים, כולל הדלקת נרות/הבדלה) לפי מיקום
  נבחר — כולל התאמת גובה ("שקיעה נראית", לא מישורית).
- סנכרון קריאה-בלבד עם Google Calendar, כולל התחברות שקטה אוטומטית בכל
  ביקור (בלי לאשר מחדש כל שעה).
- PWA מלא: אפשר להוסיף למסך הבית (אנדרואיד/iPhone) ולהשתמש כמו אפליקציה.

מפרט התנהגות מלא ומדויק נמצא ב-[`spec/functional/`](spec/functional/).

## סטאק טכני

- **`index.html` (שלד) + `src/` (ES modules טבעיים) + `styles/main.css`** —
  בלי build step, בלי bundler, בלי framework. מבנה מלא ב-
  [`spec/architecture/01-target-file-structure.md`](spec/architecture/01-target-file-structure.md).
- [`@hebcal/core`](https://github.com/hebcal/hebcal-es6) (טעון מ-CDN,
  גרסה מוצמדת) ללוח עברי, חגים, פרשה, וזמני היום.
- Google Identity Services (token client, ללא `client_secret`) לחיבור
  ליומן גוגל.
- Netlify לאחסון/פריסה, GitHub לניהול קוד.

הרציונל האדריכלי המלא, כולל תוכנית לפירוק עתידי לקבצים/מודולים לפי
עקרונות clean code, נמצא ב-[`spec/architecture/`](spec/architecture/).

## פיתוח מקומי

אין build step — אבל **חובה** שרת HTTP מקומי (למשל `python3 -m http.server`
או `npx serve .`) ולא פתיחת `index.html` ישירות מהדיסק (`file://`):
דפדפנים חוסמים טעינת ES modules (`<script type="module">`) תחת `file://`
מטעמי CORS, וגם ה-service worker דורש הגשה דרך HTTP/HTTPS כדי לעבוד.

## פריסה

**כל `git push` ל-`master` פורס אוטומטית** ל-Netlify (continuous
deployment מחובר ישירות ל-GitHub). אין צורך בפקודת דיפלוי ידנית.

## Google OAuth Client ID

האתר כבר מוגדר עם Client ID פעיל (ב-`src/config/constants.js`, קבוע `CLIENT_ID`),
עם `https://luach-il.netlify.app` כ-Authorized JavaScript origin
ב-Google Cloud Console. אם מעתיקים את הפרויקט לדומיין אחר, יש להוסיף את
הדומיין החדש שם וליצור/לעדכן Client ID בהתאם.

## שאלות נפוצות

**"למה אני לא צריך לאשר מחדש כל שעה?"**
בכל טעינת דף האפליקציה מנסה אוטומטית ובשקט (בלי פופאפ) לקבל טוקן טרי,
כל עוד אתם עדיין מחוברים לגוגל באותו דפדפן. רק אם אין session פעיל של
גוגל בדפדפן (או שההרשאה בוטלה) יופיע כפתור "התחבר עם Google" לאישור
ידני חד-פעמי.

**"רוצה להוסיף אירוע חדש, לא רק לצפות."**
האפליקציה קריאה-בלבד (readonly) בכוונה, כדי לשמור על scope מינימלי.
להרחבה: יש להחליף את ה-scope ל-`https://www.googleapis.com/auth/calendar`
ולהוסיף טופס יצירת אירוע — לא ממומש כרגע.

**"למה אין backend?"** האפליקציה מתוכננת מכוונה בלי שרת — כל החישובים
(לוח עברי, זמנים) רצים בדפדפן, ואירועי גוגל נשלפים ישירות מהדפדפן עם
טוקן OAuth של המשתמש. פרטים ב-[`spec/functional/00-overview.md`](spec/functional/00-overview.md).

## יצירת קשר

`shlomog12@gmail.com`
