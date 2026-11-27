/**
 * הקראה בעברית של הדמות בעמוד הקורס (המשחקים מקריאים דרך public/practices/kidodo-practice.js).
 * קודם קול הענן (/api/tts, Azure — אותו קול בכל מכשיר), ואם אין — קול הדפדפן. בלי שניהם הבועה נשארת טקסט בלבד.
 * מספרים נאמרים במילים (spokenNumbers) — קול הדפדפן מדלג על ספרות.
 */
import { spokenNumbers } from './hebrewNumbers'

function hebrewVoice(): SpeechSynthesisVoice | undefined {
  const he = window.speechSynthesis?.getVoices().filter(v => /^(he|iw)/i.test(v.lang)) ?? []
  return he.find(v => /hila|carmit|female|woman/i.test(v.name)) ?? he.find(v => !/avri|asaf|male/i.test(v.name)) ?? he[0]
}

/* האם יש קול בענן: נשאל פעם אחת */
let cloud: boolean | null = null
let ready: Promise<void> | null = null
function check() {
  ready ??= fetch('/api/tts').then(r => (r.ok ? r.json() : { on: false }))
    .then(j => { cloud = !!j?.on }, () => { cloud = false })
  return ready
}

let player: HTMLAudioElement | null = null
const audio = () => (player ??= new Audio())
// בטלפון צליל מתחיל רק מנגיעה: צליל שקט בנגיעה הראשונה פותח את הנגן לתמיד
const SILENT = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAgICA'
if (typeof window !== 'undefined') {
  check()
  const open = () => { const a = audio(); if (!a.src || a.paused) { a.src = SILENT; a.play().catch(() => {}) } }
  for (const t of ['pointerdown', 'touchend', 'keydown']) window.addEventListener(t, open, { capture: true, once: true })
}

/** הדפדפן מרשה קול רק אחרי נגיעה ראשונה בעמוד */
export function canSpeak() {
  return !navigator.userActivation || navigator.userActivation.hasBeenActive
}

/**
 * מקריא. onEnd נקרא פעם אחת בסוף (לא אם הושתק). מחזיר פונקציית עצירה, או null אם אי אפשר להקריא.
 * hide: מה שלא נשלח לענן (שם הילד) — נמחק מהמשפט שבענן, וקול הדפדפן אומר אותו.
 */
export function speak(text: string, onEnd: () => void, hide?: string): (() => void) | null {
  text = spokenNumbers(text)
  try {
    if (!canSpeak()) return null
    const voice = hebrewVoice()
    if (cloud === false && !voice) return null
    let over = false, stopNow = () => {}
    const end = () => { if (!over) { over = true; clearTimeout(timer); onEnd() } }
    let timer = setTimeout(end, text.length * 130 + 6000)   // יש דפדפנים שלא מודיעים על הסוף

    const device = () => {
      const s = window.speechSynthesis
      if (!voice || !s || over) return end()
      s.cancel()
      const u = new SpeechSynthesisUtterance(text.replace(/[״"׳]/g, ''))
      u.voice = voice
      u.lang = voice.lang
      u.rate = .95
      u.onend = u.onerror = end
      s.speak(u)
      stopNow = () => s.cancel()
    }
    const fromCloud = () => {
      if (over) return
      if (!cloud) return device()
      const said = hide ? text.split(hide).join('') : text
      const a = audio()
      a.onended = end
      a.onerror = device
      a.src = `/api/tts?v=hila&r=-5&p=0&t=${encodeURIComponent(said.trim())}`
      a.play().catch(device)
      stopNow = () => { a.onended = a.onerror = null; a.pause() }
      clearTimeout(timer)
      timer = setTimeout(end, said.length * 130 + 6000)
    }
    if (cloud === null) check().then(fromCloud)
    else fromCloud()
    return () => { if (!over) { over = true; clearTimeout(timer); stopNow() } }
  } catch {
    return null
  }
}
