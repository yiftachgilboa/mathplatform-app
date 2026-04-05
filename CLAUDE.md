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
- רקע מסך משחק — כל משחק מגדיר `bg_image` ב-Supabase שמשמש כרקע למסך המלא בלבד. הכרטיסיות שקופות — אין תמונת thumb לכרטיסייה. fallback: `bg-default.jpg`.

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
| bg_image | text | רקע למסך המלא בלבד — לא לכרטיסייה |

תיקיית `/public/art/games/` — תמונות רקע למשחקים
`bg-default.jpg` — תמונת ברירת מחדל כשאין bg_image למשחק

### story_books
| עמודה | סוג | הערות |
|-------|-----|-------|
| id | text | PK |
| title | text | |
| topic | text | |
| grade | integer | DEFAULT 1 |
| difficulty | integer | 1-3 |
| cover_image | text | nullable |
| is_visible | boolean | DEFAULT true |

### story_pages
| עמודה | סוג | הערות |
|-------|-----|-------|
| id | uuid | PK |
| book_id | text | FK → story_books |
| page_number | integer | |
| text | text | |
| words | text[] | מילות יעד |
| image_url | text | nullable |
| emoji | text | placeholder כשאין תמונה |

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

## SDK — מפתחות localStorage

אלו המפתחות שה-SDK כותב ל-localStorage — חייבים להתאים בדיוק לדשבורד:

| מפתח | פורמט | דוגמה |
|------|--------|--------|
| completedToday | `completedToday_${childId}_YYYY-MM-DD` | `completedToday_309c34_2026-04-05` |
| weekProgress | `weekProgress_${childId}_YYYY-WXX` | `weekProgress_309c34_2026-W14` |

⚠️ אזהרה: אל תשנה פורמטים אלו ב-SDK בלי לעדכן גם את `ChildDashboardClient.tsx`.
אל תשתמש ב-`new Date().toDateString()` — הפורמט שלו משתנה לפי locale.
תמיד השתמש ב-`new Date().toISOString().split('T')[0]` לתאריך.

---

## SDK — סיכום אירועים
```js
MathPlatformSDK.emit('GAME_STARTED', { gameId })
MathPlatformSDK.emit('ANSWER', { correct, questionId, questionType, correctAnswer, childAnswer, attemptNumber })
MathPlatformSDK.emit('GAME_OVER', { score, maxScore, stars, correctAnswers, totalQuestions })
```
מטבעות: 3⭐=+10, 2⭐=+7, 1⭐=+3

---

## משחקים קיימים

| id | שם | כיתה | קושי |
|----|-----|------|------|
| math-addition-001 | חיבור בסיסי | 1 | 1 |
| math-addition-002 | חיבור עם נשיאה | 1 | 2 |
| math-addition-003 | חיבור מתקדם | 2 | 3 |
| math-writing-board-001 | לוח כתיבה | 1 | 1 |
| language-shva-001 | שווא נח — פנדל | 1 | 1 |
| language-reading-001 | ספרון — קמץ | 1 | 1 |

ראה גם `docs/GAMES_CATALOG.md`

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

## מסלול לימודי — התנהגות

- **בטעינה** — נבחר אוטומטית השיעור הראשון שאין לו 3 כוכבים ב-`progress`. אם הכל הושלם — האחרון ברשימה.
- **אחרי 3 כוכבים** — מעבר אוטומטי לשיעור הבא (אותה לוגיקת `firstIncomplete`).
- **ציון** — תמיד מוחלף בציון האחרון, גם אם נמוך יותר (אין `Math.max`).
- **Preload** — בכל שינוי `selectedIdx`, נטענות מראש תמונות הרקע של 2 השיעורים הבאים.
- **`completedToday`** — מפתח localStorage: `completedToday_${childId}_YYYY-MM-DD`. מתאפס אוטומטית כל יום. cap=3.
- **`weekProgress`** — מפתח localStorage: `weekProgress_${childId}_YYYY-WXX`. מערך ימים שהושלמו (0=ראשון). מתאפס כל שבוע.
- **`progress` prop** — נשלף ב-`page.tsx` עם service role ומועבר ל-`ChildDashboardClient`. מאתחל גם את `starsMap`.

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
| ✅ | מסלול לימודי — גלילה, בחירת שיעור, הדגשה, כוכבים על עיגולים |
| ✅ | בר יומי — מתאפס לפי תאריך (`todayKey`), 3 שלבים, כרטיס הפתעה |
| ✅ | וי ירוק שבועי על ימי השבוע (`weekProgress`) |
| ✅ | משחק ספרון (language-reading-001) — StorySelector + StoryReader + SDK + Web Speech API |
| 🛠 | debug shortcut קיים ב-ChildDashboardClient.tsx — פעיל רק ב-development. מפתחות: 1/2/3 = כוכבים, 4 = הפתעה |
| 🟠 | עיצוב מסך הכניסה המפוצל — לא תואם את הפלטה |
| 🟠 | children.theme DEFAULT — `ALTER TABLE children ALTER COLUMN theme SET DEFAULT 'default'` |
| 🟠 | באג: אחרי הוספת ילד — redirect שגוי לשיעורי הילד הראשון במקום /select-child |
| 🟠 | באג: בתהליך הוספת ילד אין כפתור חזרה |
| 🟠 | Google OAuth |
| 🔵 | AI ניתוח טעויות |
| 🟣 | עורות נוספים |
