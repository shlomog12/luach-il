# קונבנציות קוד

## שמות

- **קבצים**: `PascalCase.js` לקומפוננטות ול-classes (`CalendarGrid.js`),
  `camelCase.js` לפונקציות עזר/utils (`dateFormat.js`).
- **פונקציות**: פועל בהתחלה (`renderGrid`, `fetchEvents`, `formatTime`).
  פונקציה שמחזירה בוליאן: `is`/`has`/`should` (`isShabbat`,
  `hasEventsToday`).
- **קבועים**: `UPPER_SNAKE_CASE` רק לערכים שבאמת קבועים גלובלית
  (`YEAR_SPAN_BACK`, `STORAGE_KEYS`); לא להשתמש בזה סתם בשביל `let`
  רגילים.
- **מפתחות storage**: מוגדרים **פעם אחת** ב-`config/constants.js`
  (למשל `STORAGE_KEYS.LOCATION = 'luach_loc'`), לא כ-string literal
  מפוזר בכמה קבצים.

## טיפוסים (types) בלי TypeScript מלא

מוצע להשתמש ב-**JSDoc** להערות טיפוס קלות, בלי להעביר את כל הפרויקט
ל-TypeScript (זה היה מוסיף שלב build, בניגוד לעיקרון ב-
[01](01-target-file-structure.md)). דוגמה:

```js
/**
 * @typedef {{name: string, lat: number, lon: number, elevation: number}} Location
 */

/**
 * @param {Date} date
 * @param {Location} location
 * @returns {{sunrise: Date, sunset: Date, ...}}
 */
export function getDailyZmanim(date, location) { ... }
```

אם רוצים בדיקת טיפוסים בזמן עריכה (VS Code) בלי build step אמיתי — אפשר
להוסיף `jsconfig.json` עם `"checkJs": true`. זה אופציונלי, לא חובה
להתחלה.

## טיפול בשגיאות

- כל גישה ל-`localStorage`/`sessionStorage` עוברת דרך
  `utils/safeStorage.js` — **אף קובץ אחר לא כותב `try{...}catch(e){}`
  סביב storage בעצמו**.
- קריאות `fetch` חיצוניות (Google APIs, Open-Meteo) **תמיד** נכשלות
  בחן (graceful degradation) — אף פעם לא זורקות שגיאה בלתי-מטופלת שמפילה
  את שאר האפליקציה. לדוגמה: כישלון בשליפת יומן גוגל בודד לא מונע הצגת
  שאר היומנים (כבר כך בקוד הקיים — יש לשמר את העיקרון).
- שגיאות שכן ראוי להציג למשתמש (למשל: קואורדינטות לא תקינות בדיאלוג
  מיקום) — מוצגות דרך UI, לא `alert()` גולמי (שיפור עתידי; היום יש שימוש
  ב-`alert()` במקום אחד, ראוי להחליף ברכיב הודעה בתוך הדיאלוג עצמו).

## בדיקות (testing)

השירותים הטהורים (`services/*`, `utils/*`) הם המועמדים הטבעיים
ל-**unit tests** — הם לא תלויים ב-DOM, וניתן לבדוק אותם ב-Node ישירות:

- `HebrewCalendarService`: לבדוק המרות תאריכים, חישוב חודשים בשנה
  מעוברת, זיהוי חגים — יש כאן היגיון עסקי אמיתי ששווה קיבוע (regression)
  לפני שינויים עתידיים.
- `ZmanimService`: לבדוק שערכי elevation שונים מזיזים את השקיעה בכיוון
  הנכון (בדיקה כזו כבר בוצעה ידנית ב-Node בזמן הפיתוח — ראוי שתהיה
  בדיקה קבועה, לא חד-פעמית).
- `dateFormat.js`: פונקציות טהורות לחלוטין — הכי קל וזול לבדוק.

כלי מוצע: **`node:test`** המובנה ב-Node (אין תלות פיתוח נוספת להתקין) —
עדיף על הוספת Jest/Vitest כל עוד לא מרגישים חוסר. דוגמה למבנה:

```
src/services/HebrewCalendarService.test.js
src/services/ZmanimService.test.js
src/utils/dateFormat.test.js
```

קומפוננטות (`components/*`) לרוב לא שוות unit-testing מלא (מעורבות DOM
כבדה) — עדיף בדיקה ידנית/exploratory בדפדפן בפועל (יש skill ייעודי
לפרויקט הזה לצורך זה), אלא אם מתגלה בג regressions חוזרים ומצדיקים
בדיקת אינטגרציה עם JSDOM.

## Linting/Formatting (אופציונלי)

לא חובה בשלב זה, אך אם רוצים לאכוף את הכללים האלה אוטומטית: ESLint עם
כללים בסיסיים (`no-unused-vars`, `eqeqeq`, `no-var`) + Prettier לעיצוב
אחיד. שני אלה **dev dependencies בלבד** — לא נכנסים ל-runtime, לא
משפיעים על שלב הפריסה (Netlify עדיין מגיש קבצים סטטיים כמו שהם).
