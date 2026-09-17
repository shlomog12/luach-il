# תבנית ניהול State: Store + Pub/Sub

## הבעיה בקוד הקיים

מצבים כמו `VIEW_MODE`, `LOCATION`, `current`, `hebCursor` הם משתנים
גלובליים (`let`) שכל פונקציה יכולה לשנות ישירות. כל מקום שמשנה אותם
צריך **לזכור בעצמו** לקרוא ל-`renderCalendarGrid()` (או פונקציה דומה)
אחרי השינוי — אין שום מנגנון שאוכף את זה. זו הסיבה, למשל, שבאגים כמו
"שכחתי לרענן X אחרי ששיניתי Y" קלים לקרות ככל שהאפליקציה גדלה.

## הפתרון: Store קטן עם `subscribe`

בלי framework (Redux/MobX/Zustand) — תבנית מינימלית, טבעית ל-vanilla
JS, שכל store מיישם בעצמו (~15 שורות קוד):

```js
// דוגמה קונספטואלית — לא קוד סופי
export function createStore(initialValue, { persist } = {}) {
  let value = persist?.load() ?? initialValue;
  const listeners = new Set();

  return {
    get: () => value,
    set(newValue) {
      value = newValue;
      persist?.save(newValue);
      listeners.forEach(fn => fn(value));
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn); // unsubscribe
    },
  };
}
```

כל `state/*Store.js` (ראו [02](02-module-responsibilities.md)) הוא
עטיפה דקה סביב `createStore`, עם לוגיקת ה-persist הספציפית שלו (אם יש)
ולפעמים API נוסף ספציפי לתחום (למשל `CalendarNavigationStore` צריך גם
`navigateMonth(direction)`, לא רק `set`).

## זרימת מידע: חד-כיוונית

```
פעולת משתמש (קליק על חץ/תא/כפתור)
        │
        ▼
  Component קורא ל-Store.set(...) או ל-Service
        │
        ▼
  Store מעדכן ערך פנימי + (אם persist) שומר ל-localStorage
        │
        ▼
  Store קורא לכל ה-listeners הרשומים (subscribe)
        │
        ▼
  כל Component שרשום מתעדכן/מרנדר את עצמו מחדש
```

**component לעולם לא קורא ישירות לפונקציית render של component אחר.**
התקשורת היחידה בין קומפוננטות היא **דרך שינוי state משותף** (store)
שהן שתיהן רשומות עליו, או דרך callback מפורש שהוזרק (ראו
[04-component-design.md](04-component-design.md)).

## דוגמה: איך זה פותר את הבאג הפוטנציאלי

היום: `setViewMode('heb')` צריך "לזכור" לקרוא ל-`updateModeButtons()`
**וגם** ל-`renderCalendarGrid()` **וגם** (מאז שהוספנו syncJumpDefaults)
לעדכן את בקרי הדילוג. שלוש קריאות ידניות, בסדר מסוים, שקל לשכוח אחת מהן
כשמוסיפים פיצ'ר רביעי.

במבנה המוצע: `ModeToggle` קורא ל-`ViewModeStore.set('heb')` בלבד.
`CalendarGrid`, `NavControls`, ו-`JumpToDatePanel` **כל אחד subscribe
בעצמו** ל-`ViewModeStore` בזמן האתחול (ב-`main.js`), ומרענן את עצמו
כשהערך משתנה — בלי ש-`ModeToggle` בכלל צריך לדעת שהם קיימים. הוספת
קומפוננטה רביעית שתלויה במצב התצוגה = `subscribe` נוסף במקום שלה, אפס
שינוי בקוד הקיים (זה בדיוק OCP, ראו [00](00-principles.md)).

## מתי **לא** להשתמש ב-store

state שהוא "מקומי לחלוטין" לקומפוננטה אחת ולא משפיע על שום קומפוננטה
אחרת (למשל: איזו אופציה נבחרת כרגע ב-`<select>` בתוך דיאלוג המיקום, לפני
שנלחץ "שמירה") — נשאר משתנה רגיל בתוך הקומפוננטה עצמה, **לא** צריך store
ייעודי. Store מיועד רק ל-state ש**משותף** בין כמה חלקים של האפליקציה.
