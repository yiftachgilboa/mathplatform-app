# עריכת תוכן הקורס

כל מה שהילד רואה באתר הקורס — טקסטים, שיעורים, צבעים, סרטונים, משחקים ושאלות — נמצא בקובץ אחד:
`content/courses/kidodo-g1.json`. אין צורך לגעת בקוד.

אחרי כל שינוי: `npm run build` (בודק שהקובץ תקין), ואז commit + push.

## מה יש בקובץ

| חלק | מה זה |
|---|---|
| `ui` | כל הטקסטים של הממשק. `{name}`, `{key}`, `{n}`, `{total}` מוחלפים אוטומטית. |
| `mastery` | הספים למעבר שיעור. `practice.accuracy: 0.9` = 90% דיוק ב-`window` התשובות האחרונות, עם לפחות `minAnswers` תשובות. `test.passScore: 0.9` = 90% במבחן. |
| `avatars` | הדמויות לבחירה בכניסה הראשונה. `img` = נתיב בתיקייה `public/` (למשל `/course/avatars/char-01.webp`). |
| `lessons` | רשימת השיעורים **לפי הסדר**. כדי לשנות סדר — מזיזים אובייקט שלם. |

## שיעור

```json
{
  "id": "lesson-01",          // מזהה קבוע — לא לשנות אחרי שילדים התחילו (ההתקדמות נשמרת לפיו)
  "key": "פירוק",             // שם המפתח (בתפריט ובכותרת "מפתח ה...")
  "tagline": "...",           // המשפט מתחת לכותרת
  "tint": "#DFF3FF",          // צבע רקע השיעור
  "deep": "#176FBE",          // צבע האייקון
  "icon": "M3 8h6v8H3z ...",  // אייקון: מחרוזת d של path (viewBox 24)
  "stages": { ... }
}
```

## חמשת השלבים (`stages`)

שלב שחסר בקובץ מוצג כ"יעלה בקרוב".

- **`video`** — `src` (ו-`poster` אופציונלי): נתיב בתוך ה-bucket `kidodo-media` ב-Supabase Storage, למשל `lessons/01/explain.mp4`.
- **`interactive`** — `src` (סרטון) + `cues`: נקודות עצירה.
  `t` = שנייה בסרטון, `q` = שאלה, `answers` = 2–4 תשובות, `correct` = מספר התשובה הנכונה **מתחיל מ-0**, `hint` = רמז אחרי טעות.
  בלי `src` — השאלות מוצגות אחת אחרי השנייה בלי סרטון.
- **`practice`** / **`enrichment`** — `gameId` של משחק קיים ב-MathPlatform. אם המשחק יושב בכתובת אחרת, מוסיפים `href` (למשל `/games/math-drill?gameId=math-drill-001`).
- **`test`** — `questions`: אותו מבנה כמו בהתנסות (בלי `hint`). מוצגות בסדר אקראי, עד `mastery.test.questions` שאלות.

## פתיחת הקורס להורה

עד שיש סליקה: ב-Supabase, טבלת `parent_access`, מוסיפים שורה עם `parent_id` של ההורה ו-`access_key = course:kidodo-g1`.

## קורס נוסף

1. מעתיקים את הקובץ ל-`content/courses/<courseId>.json` ומשנים `courseId`.
2. מוסיפים שורה אחת ב-`lib/course/content.ts` (ברשימה `COURSES`).
3. ההרשאה: `access_key = course:<courseId>`.
