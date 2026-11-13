# פרומפט ל-Claude Code — בניית אתר הקורס

> להדביק ב-Claude Code, מתוך תיקיית `mathplatform-app` (אחרי `git pull`).

---

בנה את אתר הקורס kidodo בתוך הפרויקט הזה (`mathplatform-app`), בנתיב `/course`.

**קרא קודם, במלואם:**
1. `CLAUDE.md` — כללי הפרויקט (Server/Client Components, Supabase, SDK, משחקים).
2. `docs/course/course-spec.md` — האפיון: זרימה, הרשאות, 5 שלבים, שליטה ב-90%, טבלאות, מבנה קבצים, סדר בנייה.
3. `docs/course/course-design.md` — העיצוב: טוקנים, קומפוננטות, מצבים, תנועה, טלפון, אייקונים, CSS מוכן.
4. `docs/course/course-mockup-desktop.dc.html` ו-`course-mockup-phone.dc.html` — המוקאפים. הם מקור האמת הוויזואלי (כל ערך inline). הם בפורמט קנבס (`{{…}}`, `<sc-for>`, `<sc-if>`, `class Component extends DCLogic`) — **אל תעתיק אותם כקוד**; בנה מהם קומפוננטות React רגילות שנראות בדיוק אותו דבר. הלוגיקה ב-`renderVals()` מראה את המצבים (נבחר / הושלם / נוכחי / עתידי).

**כללים:**
- כל הטקסטים, שמות השיעורים, צבעים (`tint`, `deep`), אייקונים, סרטונים, מזהי משחקים וספים — ב-`content/courses/kidodo-g1.json`. שום טקסט בקוד.
- משתמשים במה שקיים: auth, `children`, `parent_access`, SDK, `/play/[gameId]`, `game-progress`. לא בונים מחדש.
- עיצוב: שטוח, בלי `box-shadow`, Heebo, RTL, מובייל פירסט, כפתורים ≥ 44px, `prefers-reduced-motion`.
- נכסים: הלוגו (רקע שקוף) והדודו כבר ב-`public/course/` (`kidodo-wordmark.png`, `kidodo-mascot.webp`).

**איך לעבוד:**
- לפני שאתה כותב קוד — הצג לי תכנית קצרה לפי "סדר בנייה" (סעיף 12 באפיון) וחכה לאישור.
- בנה שלב אחרי שלב. בסוף כל שלב: `npm run build` עובר, ובדיקה ב-375px וב-1440px.
- המיגרציה ל-Supabase — כתוב את קובץ ה-SQL והראה לי לפני שמריצים.
- בסוף: עדכן את `CLAUDE.md` (מבנה, טבלאות, יומן החלטות) ו-commit.
