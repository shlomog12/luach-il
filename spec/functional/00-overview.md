# סקירה כללית

## מטרה

אפליקציית web (PWA) המציגה לוח שנה עברי/לועזי, זמני היום ההלכתיים, חגים
ופרשת השבוע, ומסונכרנת עם Google Calendar של המשתמש (קריאה בלבד) — כדי
שאירוע שנוסף ביומן גוגל יופיע גם בלוח האתר.

מיועדת לשימוש אישי, לא להפצה המונית (אם כי אין מניעה טכנית לכך).

## אילוצי יסוד (deliberate constraints)

| אילוץ | סיבה |
|---|---|
| **ללא שרת/backend** | פשטות, עלות אפס, אין נתונים רגישים לאבטח בצד שרת |
| **קובץ HTML יחיד (בפועל היום)** | קל לארח בכל שירות סטטי, אין build step |
| **קריאה בלבד מ-Google Calendar** (`calendar.readonly`) | scope מינימלי; אם ירצו כתיבה, יש להרחיב במודע (ראו [04](04-google-calendar-integration.md)) |
| **חישובים אסטרונומיים/הלכתיים בצד לקוח** | עובד אופליין (מלבד אירועי גוגל), אין תלות ברשת לזמינות הבסיסית |
| **חגים/פרשה לפי לוח ישראל בלבד** | `il:true` — יום טוב יחיד, לא שני ימים כמו בתפוצות |

## סביבת ריצה

- דפדפן: Chrome (עיקרי), Safari/iOS נתמך גם כן.
- מותקן כ-PWA ("הוסף למסך הבית") — מנג'סט + service worker.
- RTL, עברית כשפת ממשק ראשית.

## פריסה (deployment)

- קוד מקור: ריפו GitHub פרטי (`shlomog12/calanderApp`).
- אחסון: Netlify (`https://luach-il.netlify.app`), דיפלוי ידני/דרך MCP —
  אין git-integration רציף מוגדר (כל שינוי דורש דיפלוי מפורש).
- Google OAuth Client ID מוגדר עם ה-origin הנ"ל תחת Authorized JavaScript
  origins; ה-consent screen במצב Testing עם בעל האפליקציה כ-test user.

## רשימת יכולות (feature index)

1. תאריך עברי, חגים, פרשת שבוע — [01](01-hebrew-calendar.md)
2. תצוגה עברית/לועזית + ניווט + דילוג לתאריך — [02](02-calendar-views-and-navigation.md)
3. מיקום וזמני היום — [03](03-zmanim.md)
4. סנכרון עם Google Calendar — [04](04-google-calendar-integration.md)
5. עיצוב, RTL, disclosures, PWA — [05](05-ui-and-accessibility.md)
6. שמירה מקומית (persistence) — [06](06-persistence-and-storage.md)
7. שירותים/ספריות חיצוניים — [07](07-external-dependencies.md)
