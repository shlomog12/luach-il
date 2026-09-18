# Spec — לוח שנה עברי · לועזי (luach)

תיעוד מלא של האפליקציה: **מה** היא עושה (functional spec) ו-**איך** הקוד שלה
אמור להיות בנוי בצורה נקייה (architecture spec). המסמכים האלה מתעדים את
המצב הקיים (כולל כל מה שסוכם/שונה במהלך הפיתוח עד כה) ואת ארכיטקטורת היעד
המומלצת — **הם אינם דורשים שינוי קוד מיידי**. השימוש בהם: כבסיס לרפקטורינג
עתידי, ולכל מי שממשיך לפתח את האפליקציה (כולל את עצמי בעוד כמה חודשים).

## מבנה

### [`functional/`](functional/) — מה האפליקציה עושה
מפרט התנהגות מלא, ללא קשר למימוש בפועל. כל קובץ מתאר תחום פיצ'רים אחד.

| קובץ | תוכן |
|---|---|
| [00-overview.md](functional/00-overview.md) | מטרת האפליקציה, אילוצים, פריסה |
| [01-hebrew-calendar.md](functional/01-hebrew-calendar.md) | תאריך עברי, חגים, פרשת שבוע |
| [02-calendar-views-and-navigation.md](functional/02-calendar-views-and-navigation.md) | תצוגות, ניווט בין חודשים, דילוג לתאריך |
| [03-zmanim.md](functional/03-zmanim.md) | מיקום, זמני היום, הדלקת נרות/הבדלה |
| [04-google-calendar-integration.md](functional/04-google-calendar-integration.md) | OAuth, שליפת אירועים, הצגתם |
| [05-ui-and-accessibility.md](functional/05-ui-and-accessibility.md) | RTL/bidi, ערכת נושא, disclosures, PWA |
| [06-persistence-and-storage.md](functional/06-persistence-and-storage.md) | כל מפתחות ה-localStorage/sessionStorage |
| [07-external-dependencies.md](functional/07-external-dependencies.md) | כל שירות/CDN חיצוני ולמה |

### [`architecture/`](architecture/) — איך הקוד בנוי
מפרט ארכיטקטורת היעד לפי עקרונות clean code ו-SOLID — **מומש במלואו** בקוד
בפועל (`src/`), לא רק תכנון. ה-`index.html` הפך משלד + `<script>` מונוליטי
אחד למבנה מודולרי (config/services/state/components/utils) לפי המפרט הזה
בדיוק. שימו לב: המימוש בוצע כמכה אחת (עם בדיקות אוטומטיות מקיפות +
screenshots ויזואליים לפני push), **לא** לפי שלבי ה-strangler-fig ההדרגתיים
שתוארו במקור ב-[06-migration-plan.md](architecture/06-migration-plan.md) —
זה תועד שם.

| קובץ | תוכן |
|---|---|
| [00-principles.md](architecture/00-principles.md) | עקרונות SOLID/clean code כפי שחלים על האפליקציה הזו, עם דוגמאות מהקוד הקיים |
| [01-target-file-structure.md](architecture/01-target-file-structure.md) | מבנה תיקיות/קבצים מוצע (ES modules, ללא build step) |
| [02-module-responsibilities.md](architecture/02-module-responsibilities.md) | אחריות כל מודול, API ציבורי, תלויות |
| [03-state-management-pattern.md](architecture/03-state-management-pattern.md) | תבנית Store/pub-sub להחלפת משתנים גלובליים |
| [04-component-design.md](architecture/04-component-design.md) | פירוק לרכיבי UI, חוזה render לכל רכיב |
| [05-coding-standards.md](architecture/05-coding-standards.md) | קונבנציות שמות, טיפוסים, טיפול בשגיאות, בדיקות |
| [06-migration-plan.md](architecture/06-migration-plan.md) | תוכנית מעבר הדרגתית מהקובץ היחיד למבנה החדש, בלי לשבור את האתר החי |

## איך לקרוא את זה

- ה-functional spec הוא **מקור האמת** להתנהגות — אם הקוד והמסמך הזה סותרים
  אחד את השני, יש לעדכן את אחד מהם (בירור איזה מהם נכון).
- ה-architecture spec הוא **הצעה**, לא תורה מסיני — כל פרק כולל את הרציונל
  מאחורי ההחלטה כדי שאפשר יהיה לערער עליה במודעות.
- שני המסמכים כתובים בעברית (פרוזה) עם מונחים/שמות טכניים באנגלית, בדיוק
  כמו שהקוד עצמו כתוב.
