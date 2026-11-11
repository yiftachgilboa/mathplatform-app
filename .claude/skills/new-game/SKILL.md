---
name: new-game
description: יצירת משחקון חדש בפלטפורמה (כל מקצוע/כיתה) מתוך השלד הקבוע — קוד, תמונות ממלא-מקום, שורה ב-Supabase וקטלוג. השתמש כשהמשתמש מבקש משחק/משחקון/נושא חדש.
---

# משחק חדש

המטרה: לכתוב **רק את מכניקת המשחק**. כל השאר כבר מוכן בשלד ובסקריפט — אל תקרא משחקים קיימים אלא אם המשתמש ביקש לבסס על אחד מהם.

## 1. לאסוף פרטים (לשאול רק מה שחסר, בהודעה אחת)
- **id** — `<subject>-<topic>-NNN`, אותיות קטנות באנגלית (למשל `math-decimals-001`). בדוק ש-`app/games/<id>` לא קיים.
- **title** בעברית, **grade** (1–6), **topic** (מילה באנגלית), **emoji** לכרטיס, **difficulty** (1–3, ברירת מחדל 2)
- **המכניקה**: מה מוצג, איך הילד עונה (בחירה / הקלדה / גרירה / ציור), כמה שאלות, טווח מספרים, מה קורה בטעות.

## 2. ליצור את השלד
```bash
node scripts/new-game.mjs create --id <id> --title "<כותרת>" --grade <n> --topic <topic> --emoji <emoji> [--difficulty n]
```
הסקריפט יוצר:
- `app/games/<id>/page.tsx` + `GameClient.tsx` — מחובר ל-SDK, כפתור יציאה, כוכבים, מסך סיום
- `app/games/<id>/assets/` — לארט פנימי (דמויות, אובייקטים), מיובא עם `import`
- `public/art/games/<id>-game-bg.jpg` — **ממלא מקום** לרקע בתוך המשחק
- `public/art/games/<id>-dashboard.jpg` — **ממלא מקום** לתמונה במסך הראשי כשהילד בוחר את המשחק (`games.bg_image`)
- שורה בטבלת `games` עם `is_visible = false` (ילדים עוד לא רואים) + שורה ב-`docs/GAMES_CATALOG.md`

## 3. לכתוב את המכניקה ב-`GameClient.tsx`
לשנות רק:
- `generateQuestion()` — יצירת שאלה (`type` = שם קצר לסוג השאלה, לניתוח שגיאות)
- הבלוק המסומן `מכניקת המשחק: תצוגה`
- `TOTAL_QUESTIONS` אם צריך

**לא לשבור** (זה מה שמחבר לפלטפורמה):
- `'use client'` בשורה הראשונה, `GAME_ID` תואם ל-id
- `ANSWER` על כל תשובה, כולל `correctAnswer`, `childAnswer`, `attemptNumber`
- `GAME_OVER` פעם אחת בסוף עם `stars` (1–3) — מטבעות: 3⭐=+10, 2⭐=+7, 1⭐=+3
- `<GameBackButton />` וכפתור "המשך" עם `router.back()`
- `Math.random()` רק בתוך `useEffect`/handlers (hydration)
- טקסט בעברית, `direction: rtl`, עובד בטאבלט ובמחשב

## 4. בדיקה
- `npx tsc --noEmit` — בלי שגיאות בקבצי המשחק
- לפתוח `http://localhost:3000/games/<id>?childId=test` (dev server) ולשחק עד מסך הסיום; בקונסול צריך לראות `[MathPlatformSDK] GAME_OVER`

## 5. מסירה למשתמש
לומר לו:
- אילו שני קבצי תמונה להחליף (שם זהה, 1920×1080, jpg) — `public/art/games/<id>-game-bg.jpg`, `public/art/games/<id>-dashboard.jpg`
- שהמשחק מוסתר עד publish:
```bash
node scripts/new-game.mjs publish <id>
```
- להריץ publish ולעשות commit + push רק כשהמשתמש אישר.
