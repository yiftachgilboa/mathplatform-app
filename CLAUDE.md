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
    ├── art/backgrounds/               ⚠️ לא בשימוש — קיים כגיבוי בלבד
    └── art/games/                     ✅ כל תמונות הרקע
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
- כל תמונות הרקע (דשבורד ומשחקים) — שמור ב-`public/art/games/`.
- רקע מסך דשבורד — נקבע לפי `bg_image` של השיעור הנבחר (`/art/games/[bg_image]`). fallback: `/art/games/bg-magical-forest.jpg`. מעבר: fade 1.2s עם שתי שכבות מונחות. כרטיסיות וכרטיס הפתעה — glassmorphism שקוף.

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

## הערות טכניות — Supabase

### Google OAuth
- Redirect URLs מוגדרים ב-Supabase Dashboard → Authentication → URL Configuration:
  - `http://localhost:3000/auth/callback`
  - `https://mathplatform-app.vercel.app/auth/callback`
- `app/auth/callback/route.ts` — מחליף code לסשן ומפנה ל-`/select-child`

### Triggers על auth.users
שני triggers רצים אחרי כל INSERT ל-`auth.users`:
1. `on_auth_user_created` → `handle_new_user()` — יוצר רשומה ב-`public.profiles` עם `access_code` ייחודי
2. `on_parent_created` → `grant_free_access()` — יוצר רשומה ב-`public.parent_access` עם `access_key = 'tier:free'`

שתי הפונקציות מוגדרות עם `security definer set search_path = public` — חובה כדי שיעבדו בהקשר OAuth.
`supabase_auth_admin` חייב להיות עם הרשאות EXECUTE על שתיהן + ALL על `profiles` ו-`parent_access`.

### handle_new_user — לולאה למניעת unique conflict
הפונקציה מייצרת `access_code` בלולאה עד שמוצאת ערך שלא קיים ב-`profiles`:
```sql
loop
  new_code := lpad(floor(random()*1000)::text, 3, '0');
  exit when not exists (select 1 from public.profiles where access_code = new_code);
end loop;
```

### children.parent_id FK
`children.parent_id` מצביע על `auth.users(id) ON DELETE CASCADE` — **לא** על טבלת `parents` (ישנה).
טבלת `parents` עדיין קיימת ב-DB אך אינה בשימוש.

---

## משחקי ספרון — ארכיטקטורה

כל משחק ספרון טוען סיפורים מ-Supabase לפי `topic` (פרמטר ב-`GameClient.tsx`).
אותו קוד משרת נושאים שונים — רק `TOPIC` משתנה.

### הוספת סיפור חדש
1. צור תיקייה: `content/stories/[story-id]/`
2. הוסף `story.json` + תמונות `1.jpg`, `2.jpg`...
3. הרץ: `npm run sync-stories`

### טבלאות Supabase
- `story_books` — מטא-דאטה של סיפור
- `story_pages` — עמודים (text, words[], image_url, emoji)
- Storage bucket: `stories` (public) — תמונות בנתיב `[book-id]/1.jpg`

### Web Speech API
- TTS: `speakWord()` — הקראת מילה בעברית (השהייה ראשונה צפויה)
- STT: `startMic()` — זיהוי קול רציף, מסמן מילים ירוק אוטומטית
- ⚠️ מפתח localStorage: `completedToday_${childId}_YYYY-MM-DD` — חייב להתאים ל-SDK

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
| math-writing-board-001 | לוח כתיבה | 1 | 1 |
| language-shva-001 | שווא נח — פנדל | 1 | 1 |
| language-reading-001 | ספרון — קמץ | 1 | 1 |
| language-aleph-bet-001 | האלף-בית — קרן הקסם 🦄 | 1 | 1 |
| math-fractions-002 | מחילוק לשברים | 4 | 2 |

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
- **כוכבי תצוגה** — יומיים בלבד. מפתח: `dailyStars_${childId}_${gameId}_YYYY-MM-DD`. מתאפסים אוטומטית למחרת.
- **וי יומי** — מוצג כשהילד קיבל לפחות כוכב אחד היום (לא תלוי בכוכבים הצבורים ב-Supabase).
- **מעבר אוטומטי** — אחרי כל סיום משחק (כל ניקוד), עובר למשימה הבאה.
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
| ✅ | Google OAuth — כניסה עם Google עובדת |
| ✅ | language-aleph-bet-001 — משחק אלף-בית עם חד-קרן, זומבים, זיהוי קולי |
| ✅ | באג: אחרי הוספת ילד — redirect תוקן ל-`/select-child` |
| ✅ | SPEECH_RECOGNITION_LESSONS.md — תיעוד ניסיון זיהוי דיבור עברי בילדים |
| 🛠 | debug shortcut קיים ב-ChildDashboardClient.tsx — פעיל רק ב-development. מפתחות: 1/2/3 = כוכבים, 4 = הפתעה |
| 🟠 | עיצוב מסך הכניסה המפוצל — לא תואם את הפלטה |
| 🟠 | באג: בתהליך הוספת ילד אין כפתור חזרה |
| 🔵 | AI ניתוח טעויות |
| 🟣 | עורות נוספים |

---

## זיהוי דיבור — Web Speech API

לפני בניית כל משחק עם קלט קולי — קרא:
`docs/SPEECH_RECOGNITION_LESSONS.md`

המסמך מכיל:
- הגדרות בסיסיות נכונות ל-he-IL
- פתרון בעיית החימום
- סדר בדיקות נכון ב-onresult
- נרמול גרש עברי
- זיהוי טעות מכוונת vs סתם דיבור
- מנגנון streaks להצלחות
