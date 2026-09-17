# פירוק לרכיבי UI (Components)

## מה נחשב "קומפוננטה" כאן

בלי framework — קומפוננטה היא class/factory function שמקבל **container
DOM אחד** ואחראי על כל מה שקורה בתוכו: רינדור, עדכון, ורישום event
listeners **רק על אלמנטים בתוך הקונטיינר שלו**. שום קומפוננטה לא נוגעת
ב-DOM מחוץ לקונטיינר שהוקצה לה.

## חוזה אחיד (contract) לכל קומפוננטה

```
constructor(container, dependencies)  // dependencies = stores/services שהיא צריכה
render()                               // מצייר/מעדכן את ה-DOM הפנימי שלה
destroy()                              // (אופציונלי) מבטל subscriptions, מנקה listeners
```

קומפוננטה **לא** קוראת ל-`document.getElementById` בעצמה כדי למצוא את
ה-container שלה — הוא מוזרק דרך הבנאי מ-`main.js`. זה מה שהופך אותה
לניתנת-לבדיקה: אפשר ליצור אותה בבדיקה עם container מלאכותי (JSDOM) בלי
לטעון את כל העמוד.

## רשימת הקומפוננטות ואחריותן

### `CalendarGrid`
מרנדר את לוח החודש (weekday header + תאי הימים). תלוי ב-
`CalendarNavigationStore`, `ViewModeStore`, `HebrewCalendarService`,
ובמערך האירועים הנוכחי (מוזרק/נקרא מ-`GoogleCalendarService` cache).
כשלוחצים על תא — **לא** קורא ישירות ל-`DayDetailPanel.render()`; במקום
זאת קורא `CalendarNavigationStore.setSelected(date)`, ו-`DayDetailPanel`
עצמו רשום (subscribe) לשינוי הזה.

### `DayDetailPanel`
מרנדר את כרטיס "פירוט היום": בלוק אירועים/חגים תמיד-גלוי + `<details>`
זמני היום. תלוי ב-`CalendarNavigationStore` (מה היום הנבחר),
`HebrewCalendarService`, `ZmanimService`, `LocationStore`,
`ZmanimDisclosureStore` (לזכור אם ה-details פתוח), ומערך אירועי גוגל.
**לא** יודע איך משיגים אירועי גוגל — רק קורא מה-cache שהוזרק אליו.

### `EventsListPanel`
מרנדר את כרטיס "אירועים ביומן Google" (הרשימה של 60 הימים). תלוי ב-
`GoogleCalendarService` (או ב-cache משותף שהיא ממלאת). **בעל אחריות
בלעדית** על ה-`<details>` שלו — אין קומפוננטה אחרת שנוגעת בו.

### `LocationDialog`
מרנדר את דיאלוג בחירת/עריכת מיקום. תלוי ב-`LocationStore` (לקרוא/לכתוב)
ו-`ElevationService` (לשליפת גובה למיקום מותאם-אישית). קורא
`LocationStore.set(...)` בסיום — **לא** קורא ישירות ל-`CalendarGrid`
או ל-`DayDetailPanel` כדי "לרענן זמנים"; הם מתעדכנים בעצמם דרך ה-
subscribe שלהם ל-`LocationStore`.

### `JumpToDatePanel`
מרנדר את שני בקרי הדילוג (עברי/לועזי) בתוך `<details>` משותף. תלוי ב-
`ViewModeStore` (איזה בקר להציג), `CalendarNavigationStore` (לקרוא את
היום הנבחר לצורך ברירות מחדל, ולכתוב אליו בלחיצת "עבור"),
`HebrewCalendarService` (לבניית רשימות היום/חודש/שנה). subscribe הן
ל-`ViewModeStore` והן ל-`CalendarNavigationStore` — כשאחד מהם משתנה,
מסנכרן מחדש את ברירות המחדל של ה-dropdowns.

### `ModeToggle`
שני הכפתורים "עברי"/"לועזי". תלוי רק ב-`ViewModeStore`. הרכיב הכי פשוט —
דוגמה טובה למינימום ההכרחי של קומפוננטה.

### `NavControls`
חצי הניווט בין חודשים + הכותרת (ראשי/משני). תלוי ב-`CalendarNavigationStore`,
`ViewModeStore`, `HebrewCalendarService` (לבניית טווחי התאריכים לכותרת).
אחראי גם על ההחלטה איזה כיוון (`ltr`/ברירת מחדל) נדרש לשדה המשני —
ראו [00-principles.md](00-principles.md) וההערה על bidi
ב-[../functional/05-ui-and-accessibility.md](../functional/05-ui-and-accessibility.md).

### `AuthStatusBar`
שורת החיבור לגוגל בתחתית העמוד. תלוי ב-`GoogleAuthService` בלבד
(subscribe ל-`onAuthChange`). **לא** יודע כלום על אירועים/לוח — תפקידו
מוגבל לסטטוס + כפתור.

## עקרון: קומפוננטות לא מדברות ישירות אחת עם השנייה

הכלל החשוב ביותר בפרק הזה: **התקשורת בין קומפוננטות עוברת תמיד דרך
state משותף (stores) או events, לא דרך קריאות ישירות**. אם קומפוננטה A
"צריכה שקומפוננטה B תתעדכן" — הפתרון הנכון הוא ששתיהן ירשמו את עצמן
לאותו store, לא ש-A תחזיק reference ל-B ותקרא ל-`B.render()` ישירות. זה
מה שמאפשר להוסיף/להסיר קומפוננטות בלי לשנות קוד קיים (OCP), ומה שהופך כל
קומפוננטה לבדיקה (testable) בבידוד עם mock stores.
