# 📝 לקחים מזיהוי קולי — שגיאות ופתרונות

מסמך זה מסכם את מה שלמדנו בפיתוח המשחק אלף-בית עם זיהוי קולי.
חובה לקרוא לפני שמשתמשים שוב במשחק עם Web Speech API בעברית.

---

## ⚙️ הגדרות בסיסיות

```ts
rec.lang = 'he-IL'
rec.continuous = true       // חובה — מניעת נתק אחרי שתיקה קצרה
rec.interimResults = true   // חובה — לתפוס תשובות מיידיות
rec.maxAlternatives = 3     // שווה — מפעיל חלופות במקרה שזיהוי ראשון לא נכון
```

---

## 🔥 בעיית החימום — הסיבה לכישלון הראשון

### הבעיה
Web Speech API צריך ~1-2 שניות להיות מוכן אחרי `rec.start()`.
אם הילד אומר משהו מיד — הקלט נאכל.

### הפתרונות (כולם ביחד):

**1. utterance שקטה לחימום**
```ts
setTimeout(() => {
  const warmup = new SpeechSynthesisUtterance(' ')
  warmup.volume = 0
  warmup.lang = 'he-IL'
  window.speechSynthesis.speak(warmup)
}, 100)
```

**2. הפעל מיקרופון מוקדם** — timeout קצר ככל האפשר (50ms במקום 300ms)

**3. שתול "האות " בתחילת כל transcript**
```ts
const transcript = 'האות ' + result[0].transcript.trim()
```
גיבוי לזיהוי קצר + מכריח הקשר שמשפר זיהוי של אותיות קצרות.

### מה לא לעשות
❌ כיבוי/הדלקת מיקרופון בין שאלות — זמן חימום = חוזר לבעיה
✅ כבה רק ב-roundOver, בין שאלות השתק בלבד (`if phase !== 'playing' return`)

---

## 📋 סדר ב-onresult — הסדר חשוב מאוד!

```ts
rec.onresult = (e) => {
  if (phaseRef.current !== 'playing') return  // השתק בין שאלות
  
  // תמיד בדוק סופיות קודם, בסדר הזה:
  for (const result of results) {
    if (!result.isFinal) continue
    
    // 1. תשובה נכונה — return מיידי
    // 2. בדיקת אות אחרת — טעות מכוונת — return
    // 3. יותר מדי מילים (≥3) — סתם דיבור — נקה וחכה
  }
  
  // interim — לתפוס תשובות מיידיות
}
```

**⚠️ חשוב:** בדיקת "אות אחרת" חייבת לבוא לפני בדיקת wordCount.
דוגמה: "אלף אלף אלף" נחסם ב-wordCount לפני שבדקנו שזו אות שזוהתה.

---

## 🤖 נרמול קול — isCorrectAnswer

```ts
function isCorrectAnswer(input: string, name: string, letter: string): boolean {
  const normalize = (s: string) =>
    s.trim()
     .replace(/[\u05F3\u05F4'''`´"]/g, '')  // גרש עברי + apostrophe
     .replace(/\s+/g, ' ')
     .trim()

  const cleaned = normalize(input)
  const withoutPrefix = cleaned.replace(/^ה?אות\s*/, '').trim()

  // התאמה מדויקת
  if (withoutPrefix === name || cleaned === name) return true
  if (withoutPrefix === letter || cleaned === letter) return true
  
  // התאמה חלקית — ראשית שנשמעת כמו הצלצול
  if (withoutPrefix.length >= 2 && name.startsWith(withoutPrefix)) return true
  
  // חלופות פונטיות ומאגד/מוטציות
  const phonetic: Record<string, string[]> = {
    'אלף':   ['אל','אלפ','אף','לף'],
    'בית':   ['ב','בי','ביית'],
    'גימל':  ['גמ','גימ','גמל'],
    'תו':   ['ת','תב','תף','וף'],  // דוגמה למוטציות "תף"/"וף"
    // ... שאר האותיות
  }
  const variants = phonetic[name] || []
  return variants.some(v => withoutPrefix === v || cleaned === v)
}
```

**⚠️ גרש עברי** (U+05F3) שונה מ-apostrophe רגיל — שניהם צריכים טיפול!

---

## ✅ אלגוריתם זיהוי טעות מכוונת

### האלגוריתם
```
1. תשובה נכונה? → כן, סיום
2. בדוק אם זו תשובה נכונה — כן, סיים
3. סרוק את כל 22 האותיות — האם שמע תכולת אות כלשהי?
4. אם זיהה אות ספציפית:
   - האם זו אותה האות שנשאלת? → כן, עשה כלום  
   - האם האות קולצת פונטית? → כן, עשה כלום  
   - אמר → טעות מכוונת!
5. אם לא זיהה אף אות — סתם דיבור, נקה וחכה
```

### קבוצות פונטיות — אותיות שנשמעות זהה
```ts
const SOUND_GROUPS = [
  ['א','ה','ע'],   // נשמעות ריק בעברית מדוברת
  ['כ','ק'],       // כותב צליל
  ['ו','ב'],       // חלפות בדיבור
  ['ת','ט'],       // כותב צליל
  ['צ','ס','ז'],   // שונות קרובות
]
```

### על טעות מכוונת
- נגן 3 צלילים יורדים (G4, E4, C4)
- מציג אנימציה על המסך (רעד/פלאש)
- שומר ב-wrongLetters
- מאפס רצף (streak) של האות
- מפעיל מיקרופון מחדש אחרי 400ms

---

## 📊 מנגנון רצף והצלחות (Streaks)

### ההיגיון
אות לא "נלמדת" אחרי הצלחה אחת.
רק אחרי **3 הצלחות ברצף** — האות נחשבת mastered.

```ts
// אחרי הצלחה:
newStreaks[letter] = (newStreaks[letter] || 0) + 1
if (newStreaks[letter] >= 3) {
  // הוסף ל-mastered
}

// אחרי טעות:
newStreaks[letter] = 0  // אפס רצף
```

### localStorage keys
```
alephbet_mastered  — אותיות שנלמדו (רצף 3)
alephbet_wrong     — אותיות שטעו בהן
alephbet_streaks   — מספר הצלחות ברצף לכל אות
```

---

## 🎯 בניית סיבוב (Round)

**70/30 split:**
- 7 אותיות שנלמדו (mastered) — מגיעות בתדירות נמוכה
- 3 אותיות חדשות/קשות (wrong + חדשות לגמרי)

```ts
// סדר עדיפויות:
// 1. wrongLetters שעדיין לא mastered
// 2. אותיות חדשות שלא נראו
// 3. mastered בתדירות נמוכה
```

---

## 🛠️ בעיות נפוצות ופתרונות

| בעיה | סיבה | פתרון |
|------|------|--------|
| מילה קצרה לא מזוהה | API לא חימם | חימום + שתול "האות " |
| הקשבה לא חוזרת אחרי טעות | recognition לא מופעל מחדש | `setTimeout(() => startMic(), 400)` אחרי טעות |
| גרש לא מנורמל | U+05F3 ≠ apostrophe | normalize עם `\u05F3\u05F4` |
| המשחק קופא | shadowBlur על canvas | הסר shadowBlur, תחלף לרדיוס מוצק |
| הקשבה קופאת | useEffect תלוי ב-phase | הסר phase מה-dependency array של draw loop |

---

## 🎙 טיפ למשתמש

הצג על המסך: `🎙 אמור: "האות ___"`
אם הילד אומר את המשפט השלם יש יותר = זיהוי טוב יותר.

---

*מסמך זה מתבסס על פיתוח המשחק language-aleph-bet-001*
*עודכן לאחרונה: אפריל 2026*
