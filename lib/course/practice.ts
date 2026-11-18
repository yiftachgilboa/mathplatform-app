/**
 * התנסות (שלב 2) — טעינה מוקדמת וחימום הקול.
 */

/** הספריות שכל התנסות טוענת (practices/*.html). אם תבנית ההתנסות משתנה — מעדכנים גם כאן. */
export const PRACTICE_ASSETS = [
  'https://unpkg.com/react@18.2.0/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js',
  '/practices/kidodo-practice.js',
]

/** כתובת ההתנסות עם פרטי הילד (אותה כתובת בדיוק לטעינה המוקדמת ול-iframe, כדי שה-cache יתאים). */
export function practiceUrl(page: string, childId: string, courseId: string, lessonId: string) {
  const q = new URLSearchParams({ childId, courseId, lessonId })
  return `${page}${page.includes('?') ? '&' : '?'}${q}`
}

/** מוסיף <link rel="prefetch"> פעם אחת לכל כתובת. הדפדפן מוריד ברקע, בעדיפות נמוכה. */
export function prefetch(urls: string[]) {
  for (const href of urls) {
    if (document.head.querySelector(`link[rel="prefetch"][href="${CSS.escape(href)}"]`)) continue
    const l = document.createElement('link')
    l.rel = 'prefetch'
    l.href = href
    document.head.appendChild(l)
  }
}

/**
 * מחמם את מנוע ההקראה של הדפדפן (בעיקר הקול העברי של Chrome, שעובד דרך הרשת):
 * ההקראה הראשונה איטית, אז "אומרים" מילה בשקט עוד לפני שההתנסות מתחילה.
 * חייב לרוץ בתוך לחיצה של המשתמש (אחרת הדפדפן חוסם).
 */
let warmed = false
export function warmSpeech() {
  if (warmed) return
  try {
    const s = window.speechSynthesis
    if (!s) return
    const he = s.getVoices().find(v => /^(he|iw)/i.test(v.lang))
    const u = new SpeechSynthesisUtterance('שלום')
    u.lang = he?.lang ?? 'he-IL'
    if (he) u.voice = he
    u.volume = 0
    s.speak(u)
    warmed = true
  } catch {
    /* no speech in this browser – the practice falls back to captions */
  }
}
