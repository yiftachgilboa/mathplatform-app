# MathPlatform — CLAUDE.md

מסמך עבודה לקלוד קוד. מתעדכן בסוף כל סשן.

---

## הפרויקטים

| פרויקט | תיקייה | URL |
|--------|---------|-----|
| אפליקציה ראשית | `mathplatform-app` | https://mathplatform-app.vercel.app |
| אדמין | `mathplatform-admin` | https://mathplatform-admin.vercel.app |

---

## מחסנית טכנולוגית

- **Framework**: Next.js 16 (App Router, TypeScript)
- **DB + Auth**: Supabase
- **Deploy**: Vercel (auto-deploy מ-GitHub על push ל-master)
- **פונט**: Secular One — מיובא ב-layout כ-`--font-secular`
- **Cache**: `staleTimes: { dynamic: 0 }` ב-`next.config.ts`

---

## מבנה תיקיות — mathplatform-app
```
mathplatform-app/
├── app/
│   ├── login/
│   │   └── page.tsx                      ✅ מסך כניסה מפוצל — הורה ימין, ילד שמאל
│   ├── onboarding/
│   ├── select-child/
│   │   ├── page.tsx                      ✅ Client Component
│   │   └── StarsBackground.tsx           ✅ כוכבים אנימציה (נפרד למניעת hydration error)
│   ├── child/
│   │   └── [id]/
│   │       ├── page.tsx                  ✅ Server Component — data fetching + redirects
│   │       └── ChildDashboardClient.tsx  ✅ Client Component — UI, state, theme
│   ├── parent/
│   │   └── dashboard/
│   │       ├── page.tsx
│   │       ├── ParentDashboardClient.tsx
│   │       └── SignOutButton.tsx
│   ├── games/
│   │   ├── math-addition-001/
│   │   ├── math-addition-002/
│   │   ├── math-addition-003/
│   │   └── math-writing-board-001/       ✅ לוח כתיבה
│   └── api/
│       ├── sdk/event/route.ts
│       ├── child/session/route.ts
│       ├── child-login/route.ts          ✅ כניסת ילד — שם + קוד → session הורה
│       ├── children/[id]/route.ts        ✅ DELETE — מחיקת ילד + רשומות תלויות
│       ├── children/[id]/lessons/route.ts
│       └── children/[id]/theme/route.ts
└── public/
    ├── mascot-croc.png
    ├── mascot-default.png
    ├── sdk/mathplatform-sdk-v1.js
    └── art/backgrounds/
        ├── bg-magical-forest.jpg
        └── bg_monsters.jpg
```

---

## כללים חשובים — ארכיטקטורה

- `page.tsx` = **Server Component בלבד** — רק data fetching + redirects
- Supabase בצד שרת: `createServerClient` מ-`@supabase/ssr`
- משתנה סביבה לשירות: `SUPABASE_SECRET_KEY` (לא `SUPABASE_SERVICE_ROLE_KEY`)
- בדיקת session → redirect ל-`/login` אם אין
- בדיקת ownership (parent_id) → redirect ל-`/select-child` אם לא תואם
- `Math.random()` ב-Server Components גורם ל-hydration error — להעביר ל-`useEffect`
- Next.js 16: פרמטרי route הם `Promise` — `{ params }: { params: Promise<{ id: string }> }` + `await params`
- ארט פנימי של משחק (דמויות, אובייקטים) — שמור ב-`app/games/[game-id]/assets/` ומיובא עם `import`.
  תמונות רקע של משחקים — שמור ב-`public/art/games/` (לא ב-`public/art/backgrounds/` שמיועד למסכי משתמש).
- תמונת כרטיסייה של משחק — `thumb-[id].jpg` ב-`public/art/games/`, ערך ב-`bg_image` ב-Supabase. fallback: `bg-default.jpg` דרך `onError` על תגית `<img>`.

---

## הוספת משחק חדש

**קרא את `docs/GAME_INTEGRATION.md` לפני כל הוספת משחק.**

צ'קליסט מהיר:
```
□ GAME_ID מוגדר ותואם ל-id ב-Supabase
□ 'use client' בשורה ראשונה של GameClient.tsx
□ SDK נטען ב-useEffect עם onload → GAME_STARTED
□ ANSWER נשלח על כל תשובה (כולל correctAnswer ו-childAnswer)
□ GAME_OVER נשלח עם stars מחושב נכון (מטבעות: 3⭐=+10, 2⭐=+7, 1⭐=+3)
□ GameBackButton מוטמע
□ כפתור "המשך" עם router.back() במסך סיום
□ רשומה ב-Supabase games עם is_visible = true
□ שורה נוספה ל-docs/GAMES_CATALOG.md
```

---

## כניסת ילד

### זרימה
1. ילד מכניס שם + קוד 3 ספרות במסך הכניסה (פאנל שמאל)
2. `POST /api/child-login` — מאמת: קוד → `profiles.access_code` → `parent_id` → מוצא ילד לפי שם
3. `admin.auth.generateLink({ type: 'magiclink', email })` — יוצר token עבור ההורה
4. `supabase.auth.verifyOtp({ token_hash })` בצד הלקוח — יוצר session אמיתי של ההורה
5. redirect ל-`/select-child` — הילד רואה את הכרטיסים ולוחץ על עצמו

### קבצים רלוונטיים
- `app/api/child-login/route.ts` — לוגיקת אימות + יצירת magic link
- `app/login/page.tsx` — UI מפוצל + `handleChildSubmit`
- `app/select-child/page.tsx` — ללא קפיצה אוטומטית, הילד בוחר בעצמו

### נתוני בדיקה
- משפחה: `access_code = "520"`, `parent_id = bda25951-...`
- ילדים: יפתח, אנדי, בדיקה א, נועה

---

## מערכת העורות (Themes)

- `children.theme`: `'default'` / `'magical-forest'` / `'monsters'`
- `getBgForTheme(theme)` ב-`ChildDashboardClient.tsx` ממפה theme → נתיב תמונה
- glassmorphism: `rgba(0,0,0,0.35)` + `backdrop-filter: blur(0px)`
- preload כל הרקעים ב-`useEffect` — אין מסך לבן במעבר

### הוספת עור חדש
1. תמונה ב-`public/art/backgrounds/bg-[name].jpg`
2. `case '[name]'` ב-`getBgForTheme`
3. הוסף לmassive preload ב-`useEffect`
4. הוסף אפשרות ב-`ParentDashboardClient.tsx` (כולל `THEME_LABELS`)

---

## טבלאות Supabase

### profiles
| עמודה | סוג | הערות |
|-------|-----|-------|
| id | uuid | PK = auth.uid() |
| access_code | text | קוד 3 ספרות למשפחה — לכניסת ילד |

### children
| עמודה | סוג | הערות |
|-------|-----|-------|
| id | uuid | PK |
| name | text | |
| grade | integer | |
| parent_id | uuid | FK → auth.users |
| theme | text | DEFAULT 'default' |
| coins | integer | DEFAULT 0 |

### progress
| עמודה | סוג | הערות |
|-------|-----|-------|
| child_id | uuid | FK → children |
| game_id | text | FK → games |
| stars | integer | 1-3 |
| score | integer | |

### child_lessons
| עמודה | סוג | הערות |
|-------|-----|-------|
| id | uuid | PK |
| child_id | uuid | FK → children |
| game_id | text | FK → games(id) |
| position | integer | סדר במסלול |

### sessions
| עמודה | סוג | הערות |
|-------|-----|-------|
| id | uuid | PK |
| child_id | uuid | FK → children |
| started_at | timestamptz | DEFAULT now() |
| ended_at | timestamptz | |
| game_id | text | |

### games
עמודות עיקריות: `id, title, subject, topic, grade, difficulty, type, duration_minutes, platforms, language, tier, thumbnail, orientation, is_visible`

| עמודה | סוג | הערות |
|-------|-----|-------|
| bg_image | text | שם קובץ תמונת רקע — מתיקיית /public/art/games/ |

תיקיית `/public/art/games/` — תמונות רקע למשחקים
`bg-default.jpg` — תמונת ברירת מחדל כשאין bg_image למשחק

### wrong_answers — קיימת, ריקה

---

## סטטוס RLS

| טבלה | RLS |
|------|-----|
| games | ✅ SELECT לכל מחובר |
| children | ✅ CRUD — רק parent_id = auth.uid() |
| progress | ✅ SELECT להורה דרך join — מחיקה רק דרך service role |
| child_lessons | ✅ הורה מנהל רק ילדים שלו |
| wrong_answers | ✅ |
| sessions | ✅ |

---

## SDK — סיכום אירועים
```js
MathPlatformSDK.emit('GAME_STARTED', { gameId })
MathPlatformSDK.emit('ANSWER', { correct, questionId, questionType, correctAnswer, childAnswer, attemptNumber })
MathPlatformSDK.emit('GAME_OVER', { score, maxScore, stars, correctAnswers, totalQuestions })
```
מטבעות: 3⭐=+10, 2⭐=+7, 1⭐=+3

---

## משחקים — ראה `docs/GAMES_CATALOG.md`

---

## פקודות שימושיות
```bash
cd mathplatform-app
npm run dev
npm run sync-games
git commit --allow-empty -m "force redeploy" && git push

# בדיקת DB
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
s.from('TABLE_NAME').select('*').limit(3).then(r => console.log(JSON.stringify(r)));
"
```

---

## מפת דרכים

| סטטוס | מה |
|--------|-----|
| ✅ | תשתית בסיסית + SDK + משחקים |
| ✅ | דשבורד ילד — UI מלא מחובר ל-DB |
| ✅ | דשבורד הורה — מסלול שיעורים + בחירת theme |
| ✅ | RLS — אבטחת כל הטבלאות |
| ✅ | מערכת עורות (themes) |
| ✅ | מסך בחירת ילד — התנתקות + מחיקת ילד |
| ✅ | כניסת ילד עם שם + קוד משפחה |
| ✅ | טבלת sessions נוצרה ב-Supabase |
| ✅ | משחק "לוח כתיבה" — מעגל שלם כניסה→משחק→כוכבים→מטבעות |
| ✅ | language-shva-001 — משחק שווא נח עם פנדל |
| ✅ | הצגת מייל + קוד משפחתי במסך בחירת ילד |
| ✅ | חסימת שמות כפולים ביצירת ילד |
| ✅ | תיקון מחיקת ילד (sessions FK + SUPABASE_SECRET_KEY) |
| 🟠 | עיצוב מסך הכניסה המפוצל — לא תואם את הפלטה |
| 🟠 | children.theme DEFAULT — `ALTER TABLE children ALTER COLUMN theme SET DEFAULT 'default'` |
| 🟠 | באג: אחרי הוספת ילד — redirect שגוי לשיעורי הילד הראשון במקום /select-child |
| 🟠 | באג: בתהליך הוספת ילד אין כפתור חזרה |
| 🟠 | Google OAuth |
| 🔵 | AI ניתוח טעויות |
| 🟣 | עורות נוספים |
