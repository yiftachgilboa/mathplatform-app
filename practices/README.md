# התנסויות (שלב 2 בשיעור)

כל התנסות היא קובץ HTML אחד: React מ-CDN + JSX שמקומפל בדפדפן (Babel). אפשר לפתוח ולערוך אותו לבד.

## איך מעלים התנסות

1. שמים את קובץ המקור כאן: `practices/<name>.html`.
2. מריצים `npm run build-practices` — יוצר את `public/practices/<name>.html` (בלי Babel, מהיר בטלפון). **לא עורכים את הקובץ ב-public.**
3. בקובץ הקורס (`content/courses/kidodo-g1.json`), בשלב של השיעור:
   `"interactive": { "page": "/practices/<name>.html" }`
4. commit לשני הקבצים (מקור + public) ו-push.

## החיבור לקורס — `public/practices/kidodo-practice.js`

הקורס פותח את ההתנסות כעמוד מלא עם `?childId=&courseId=&lessonId=`. בקובץ ההתנסות:

```html
<script src="/practices/kidodo-practice.js"></script>
```

| קריאה | מה היא עושה |
|---|---|
| `KidodoPractice.answer(correct)` | שומר תשובה (שלב 2, לא נספר לשליטה) |
| `KidodoPractice.complete(extra)` | מסמן ✓ לשלב 2 (Promise, אף פעם לא נכשל, עד 2.5 שניות) |
| `KidodoPractice.next()` | חוזר לקורס, לשלב 3 |
| `KidodoPractice.exit()` | חוזר לקורס, לשלב 2 |
| `KidodoPractice.inCourse` | `false` כשפותחים את הקובץ לבד — אז לא נשמר כלום |

## מה כבר קבוע ב-`decomposition.html` (בסיס לתבנית)

- מסגרת: כותרת (שם + תיבת אוצר עם פס התקדמות + כפתורי חזרה/קול/יציאה), במה, דמות מדברת (קול עברי או כתוביות), מקלדת מספרים.
- 4 סבבים ← כל סבב ממלא את התיבה.
- מסך סיום: רק התיבה בגדול. כל לחיצה פותחת אותה ומעיפה מטבעות (בלי לשנות את הפרס). "המשך" ← `complete()` + `next()`.
- מובייל פירסט: נבדק ב-360px ו-375px, כפתורים ≥ 44px.
