# מבנה קבצים מוצע

## החלטה מרכזית: ES Modules טבעיים, לא bundler

**לא** מוצע להכניס Webpack/Vite/esbuild או framework (React וכו').
הרציונל:

- הפריסה היום היא קבצים סטטיים גולמיים דרך Netlify, בלי שום build
  command — זו פשטות ששווה לשמר.
- דפדפנים מודרניים (Chrome, Safari — היעד המוצהר של האפליקציה) תומכים
  ב-`<script type="module">` וב-`import`/`export` יחסיים באופן טבעי,
  ללא כלי build.
- האפליקציה קטנה מספיק (לא עשרות אלפי שורות) שהיתרונות של bundler
  (tree-shaking, code-splitting) לא מצדיקים את מורכבות התחזוקה הנוספת
  (package.json עם dev dependencies, קובץ קונפיג build, שלב build ב-CI).

אם בעתיד האפליקציה תגדל משמעותית (עשרות קומפוננטות, טעינה איטית), אפשר
לשקול מחדש — אך זו **לא** ברירת המחדל הנכונה כרגע.

## מבנה תיקיות מוצע

```
/
├── index.html              # שלד בלבד: <head>, markup, <script type="module" src="src/main.js">
├── manifest.json
├── sw.js
├── icon.svg
├── src/
│   ├── main.js              # composition root — היחיד שמרכיב הכל יחד
│   │
│   ├── config/
│   │   ├── constants.js      # storage keys, טווחי שנים, גרסת CDN מוצמדת וכו'
│   │   └── locations.js      # מערך ה-LOCATIONS (20 המיקומים המוגדרים מראש)
│   │
│   ├── services/             # לוגיקה עסקית טהורה — לא נוגעים ב-DOM בכלל
│   │   ├── HebrewCalendarService.js   # עוטף HDate/HebrewCalendar
│   │   ├── ZmanimService.js           # עוטף Location/Zmanim
│   │   ├── ElevationService.js        # Open-Meteo lookup
│   │   ├── GoogleAuthService.js       # token client, רענון שקט
│   │   └── GoogleCalendarService.js   # שליפת אירועים
│   │
│   ├── state/                 # "stores" — state + פרסום שינויים (ראו 03)
│   │   ├── ViewModeStore.js
│   │   ├── LocationStore.js
│   │   ├── CalendarNavigationStore.js  # current/hebCursor/selected
│   │   └── ZmanimDisclosureStore.js
│   │
│   ├── components/            # רכיבי UI — כל אחד מרנדר משהו אחד (ראו 04)
│   │   ├── CalendarGrid.js
│   │   ├── DayDetailPanel.js
│   │   ├── EventsListPanel.js
│   │   ├── LocationDialog.js
│   │   ├── JumpToDatePanel.js
│   │   ├── ModeToggle.js
│   │   ├── NavControls.js
│   │   └── AuthStatusBar.js
│   │
│   └── utils/
│       ├── dateFormat.js      # toKey, fmtTime, gregRangeLabel, hebRangeLabel
│       └── safeStorage.js     # עטיפת try/catch אחידה ל-localStorage/sessionStorage
│
├── styles/
│   └── main.css               # מחולץ מה-<style> הנוכחי בתוך index.html
│
└── spec/                       # המסמכים האלה
    ├── functional/
    └── architecture/
```

## כללי מיפוי (מה עובר לאן)

| בקוד הקיים | עובר ל- |
|---|---|
| `HDate`, `hebMonthName`, `buildDayInfo`, `HOLIDAY_FLAGS` | `services/HebrewCalendarService.js` |
| `getZmanim`, `LOCATIONS`, קבועי זווית | `services/ZmanimService.js` + `config/locations.js` |
| קריאת `open-meteo` | `services/ElevationService.js` |
| `initGoogleAuth`, `setAuthUI`, ניהול טוקן | `services/GoogleAuthService.js` |
| `loadEvents`, פרסינג האירועים | `services/GoogleCalendarService.js` |
| `loadLocation`/`saveLocation` | `state/LocationStore.js` |
| `loadMode`/`saveMode`/`VIEW_MODE` | `state/ViewModeStore.js` |
| `current`, `hebCursor`, `selected` | `state/CalendarNavigationStore.js` |
| `loadZmanOpen`/`saveZmanOpen` | `state/ZmanimDisclosureStore.js` |
| `renderCalendarGrid`, `renderGregMonth`, `renderHebMonth`, `renderDayCell` | `components/CalendarGrid.js` |
| `showDetail` (חלק ה-DOM) | `components/DayDetailPanel.js` |
| `renderEvents` | `components/EventsListPanel.js` |
| דיאלוג המיקום | `components/LocationDialog.js` |
| בקרי הדילוג לתאריך | `components/JumpToDatePanel.js` |
| `toKey`, `fmtTime`, `gregRangeLabel`, `hebRangeLabel` | `utils/dateFormat.js` |

## איך `index.html` נראה אחרי הפירוק

`index.html` נשאר קובץ ה-shell: כל ה-`<head>`, ה-CSS (או `<link>` ל-
`styles/main.css`), וה-markup הסטטי (הכרטיסים, ה-dialog, וכו') — אבל
**בלי שום `<script>` עם לוגיקה בתוכו**. השורה היחידה הרלוונטית:

```html
<script type="module" src="./src/main.js"></script>
```

`main.js` הוא ה-**composition root**: הקובץ היחיד שמכיר את *כל* המודולים,
יוצר instances, מזריק תלויות (dependency injection ידני — לא צריך
framework DI), ומחבר components ל-stores. שום קובץ אחר לא אמור לייבא
ישירות את כל הפרויקט — רק את מה שהוא צריך.
