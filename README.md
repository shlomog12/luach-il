# לוח שנה עברי · מעלה לבונה — הקמה (10-15 דקות)

אפליקציית web (PWA) שרצה בכרום, מתחברת ליומן ה-Google שלכם ישירות מהדפדפן
(בלי שרת), ומציגה תאריך עברי, פרשת השבוע, זמני היום למעלה לבונה, והאירועים
שלכם מכל היומנים ב-Google Calendar.

---

## שלב 1: יצירת OAuth Client ID בגוגל (פעם אחת)

1. גשו ל-[console.cloud.google.com](https://console.cloud.google.com/) והתחברו
   עם חשבון ה-Gmail שלכם.
2. למעלה, ליד הלוגו של Google Cloud, לחצו על תפריט הפרויקטים ← **New Project**.
   תנו שם (למשל `luach-personal`) ← **Create**. חכו כמה שניות שהפרויקט ייווצר,
   ואז ודאו שהוא נבחר למעלה.
3. בתפריט הצד (☰) ← **APIs & Services** ← **Library**. חפשו
   **Google Calendar API** ולחצו **Enable**.
4. בתפריט הצד ← **APIs & Services** ← **OAuth consent screen**.
   - User Type: **External** ← Create.
   - מלאו App name (למשל "הלוח שלי"), Support email (כתובת הג'ימייל שלכם),
     Developer contact (אותה כתובת) ← Save and Continue עד הסוף.
   - במסך **Test users** לחצו **Add Users** והוסיפו את כתובת הג'ימייל שלכם.
     זה חשוב — בלי זה גוגל לא ייתן לכם להתחבר לאפליקציה של עצמכם.
5. בתפריט הצד ← **APIs & Services** ← **Credentials** ← **Create Credentials**
   ← **OAuth client ID**.
   - Application type: **Web application**.
   - Name: כל שם.
   - תחת **Authorized JavaScript origins** לחצו **Add URI** והוסיפו את הכתובת
     שבה תארחו את האתר (ראו שלב 2 — זו תהיה `https://<שם-המשתמש-שלכם>.github.io`).
     אם עדיין אין לכם את הכתובת, אפשר לחזור לכאן ולהוסיף אותה אחר כך.
   - **Create**. תקבלו **Client ID** שנראה כך:
     `123456789-abc...xyz.apps.googleusercontent.com` — העתיקו אותו.

## שלב 2: העלאת הקבצים ל-GitHub Pages (חינם)

1. ב-[github.com](https://github.com) צרו חשבון אם אין לכם, ואז צרו **New
   repository** (למשל בשם `luach`), Public, בלי README.
2. בעמוד הריפו החדש לחצו **uploading an existing file**, וגררו לתוכו את
   ארבעת הקבצים: `index.html`, `manifest.json`, `sw.js`, `icon.svg`
   ← **Commit changes**.
3. **Settings** (בריפו) ← **Pages** בתפריט הצד ← תחת Source בחרו
   **Deploy from a branch**, Branch: `main`, תיקייה `/ (root)` ← **Save**.
4. חכו דקה, ואז תראו למעלה כתובת כמו:
   `https://<שם-המשתמש-שלכם>.github.io/luach/`
   זו הכתובת של האפליקציה שלכם!

## שלב 3: חיבור ה-Client ID

1. אם עוד לא הוספתם את הכתובת מ-GitHub Pages ל-**Authorized JavaScript
   origins** בשלב 1 — חזרו ל-Google Cloud Console ← Credentials ← לחצו על
   ה-Client שיצרתם ← הוסיפו שם את הכתובת **בלי** הנתיב שאחרי הדומיין
   (כלומר `https://<שם-המשתמש-שלכם>.github.io`, לא `.../luach/`) ← Save.
2. ב-GitHub, פתחו את `index.html` (העיפרון הכחול לעריכה), מצאו את השורה:
   ```
   const CLIENT_ID = "YOUR_CLIENT_ID_HERE.apps.googleusercontent.com";
   ```
   והחליפו ב-Client ID שהעתקתם ← **Commit changes**.

## שלב 4: התקנה על הטלפון

1. פתחו את הכתובת `https://<שם-המשתמש-שלכם>.github.io/luach/` בכרום באנדרואיד.
2. תפריט (⋮) ← **הוסף למסך הבית / Add to Home screen**. עכשיו יש לכם אייקון
   שנפתח כמו אפליקציה רגילה.
3. לחצו **"התחבר עם Google"**. גוגל יראו אזהרה "This app isn't verified" —
   זה תקין (האפליקציה היא שלכם, לא עברה תהליך אימות פומבי). לחצו
   **Advanced** ← **Go to (שם האפליקציה) (unsafe)** ← אשרו גישת קריאה ליומן.
4. האירועים והלוח אמורים להופיע. הטוקן תקף לכשעה — אם חלף זמן ואתם פותחים
   שוב, פשוט לחצו "רענן" (אותו כפתור).

---

### שאלות נפוצות

**"למה אני צריך לאשר מחדש כל שעה?"**
כי האפליקציה סטטית (בלי שרת), אז אין דרך בטוחה לשמור הרשאה לטווח ארוך בלי
לחשוף סוד. לשימוש אישי זה לרוב סביר — אתם פותחים, מאשרים ברגע, וזהו.

**"אפשר גם ב-iPhone?"** כן, אותו תהליך עובד בספארי/כרום באייפון, כולל
"הוסף למסך הבית".

**"רוצה להוסיף אירוע חדש, לא רק לצפות."** הגרסה הזו קריאה-בלבד (readonly)
בכוונה, כדי לשמור את זה פשוט ובטוח. אם תרצו גם כתיבה, אפשר להרחיב את ה-scope
ל-`https://www.googleapis.com/auth/calendar` ולהוסיף טופס להוספת אירוע —
תגידו לי ואני אוסיף את זה.
