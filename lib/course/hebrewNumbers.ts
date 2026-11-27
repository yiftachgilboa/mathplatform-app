// מספרים במילים לקול: קול הדפדפן בעברית מדלג על ספרות (״88 אחוז״ נשמע ״אחוז״).
// הבועה מציגה ספרות; רק מה שנשלח להקראה עובר כאן. לפני ״אחוז״ — זכר (חמישה אחוז), אחרת שם המספר (שיעור שלוש, 8 מטבעות).
// עותק זהה ב-public/practices/kidodo-practice.js (spokenNumbers) — לשנות בשניהם.

const UNIT_M = ['', 'אחד', 'שניים', 'שלושה', 'ארבעה', 'חמישה', 'שישה', 'שבעה', 'שמונה', 'תשעה']
const UNIT_F = ['', 'אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה', 'תשע']
const TEEN_M = ['עשרה', 'אחד עשר', 'שנים עשר', 'שלושה עשר', 'ארבעה עשר', 'חמישה עשר', 'שישה עשר', 'שבעה עשר', 'שמונה עשר', 'תשעה עשר']
const TEEN_F = ['עשר', 'אחת עשרה', 'שתים עשרה', 'שלוש עשרה', 'ארבע עשרה', 'חמש עשרה', 'שש עשרה', 'שבע עשרה', 'שמונה עשרה', 'תשע עשרה']
const TENS = ['', '', 'עשרים', 'שלושים', 'ארבעים', 'חמישים', 'שישים', 'שבעים', 'שמונים', 'תשעים']

function below100(n: number, masc: boolean): string {
  const u = masc ? UNIT_M : UNIT_F
  if (n < 10) return u[n]
  if (n < 20) return (masc ? TEEN_M : TEEN_F)[n - 10]
  const t = TENS[Math.floor(n / 10)], r = n % 10
  return r ? `${t} ו${u[r]}` : t
}

export function hebrewNumber(n: number, masc = false): string {
  if (!Number.isInteger(n) || n < 0 || n > 999) return String(n)
  if (n === 0) return 'אפס'
  const h = Math.floor(n / 100), rest = n % 100
  const head = h === 0 ? '' : h === 1 ? 'מאה' : h === 2 ? 'מאתיים' : `${UNIT_F[h]} מאות`
  if (!rest) return head
  const tail = below100(rest, masc)
  if (!head) return tail
  return tail.includes(' ') ? `${head} ${tail}` : `${head} ו${tail}`
}

/** ״כבר סיימתם 88 אחוז! בואו נגיע ל־90״ ← ״כבר סיימתם שמונים ושמונה אחוז! בואו נגיע לתשעים״ */
export function spokenNumbers(text: string): string {
  return text
    .replace(/(\d+)\s*%/g, '$1 אחוז')
    .replace(/(^|[^\dא-ת])([בלמהוכש]?)[־-]?(\d{1,3})(?!\d)(\s*(?:אחוז))?/g, (_m, pre: string, letter: string, num: string, pct?: string) =>
      `${pre}${letter}${hebrewNumber(Number(num), !!pct)}${pct ?? ''}`)
}
