'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Course } from '@/lib/course/content'
import type { CourseState } from '@/lib/course/progress'
import { guideText, type GuideEvent } from '@/lib/course/guide'
import { canSpeak, speak } from '@/lib/course/speak'

const SETTLE = 600            // מחכים רגע אחרי מעבר, שהמסך יתייצב (וגם הכתובת בטעינה)
const CLOSE_AFTER = 30_000    // אחרי שההקראה נגמרה, הבועה נסגרת לבד
const EVENTS = ['pointerdown', 'pointermove', 'keydown'] as const
const REMIND_AFTER = 60_000   // בלי נגיעה, בלי משחק פתוח: תזכורת אחת לכל שלב

/**
 * בועת ההוראות של הדמות: מה כתוב בה, מתי היא נפתחת ומתי היא מדברת.
 * נפתחת בכניסה, במעבר שיעור או שלב, בסיום שלב, בחזרה מהחנות, בנגיעה בדמות, ופעם אחת כשהילד תקוע.
 * נסגרת ב-X, לבד 30 שניות אחרי ההקראה, בנגיעה בשלב, וכשמשחק או סרטון מתחילים (busy).
 */
export function useGuide({ enabled, course, state, lessonIdx, stage, name, covered, busy, pending }: {
  enabled: boolean; course: Course; state: CourseState; lessonIdx: number; stage: number; name: string; covered: boolean; busy: boolean
  /** רענון של מצב הילד מהשרת שעוד בדרך */
  pending: React.RefObject<Promise<void> | null>
}) {
  const [msg, setMsg] = useState<{ text: string; id: number } | null>(null)
  const [talking, setTalking] = useState(false)
  const live = useRef({ course, state, lessonIdx, stage, name })
  useEffect(() => { live.current = { course, state, lessonIdx, stage, name } })
  const stopRef = useRef<(() => void) | null>(null)
  const justDone = useRef<number | null>(null)
  const reminded = useRef('')
  const turn = useRef(0)
  const seen = useRef<{ lesson: number; stage: number } | null>(null)

  /** עוצר את ההקראה מיד, לפני שמשחק מתחיל לדבר (אחרת היינו קוטעים אותו) */
  const quiet = useCallback(() => { stopRef.current?.(); stopRef.current = null; setTalking(false) }, [])
  const close = useCallback(() => { turn.current++; quiet(); setMsg(null) }, [quiet])
  const show = useCallback(async (ev: GuideEvent) => {
    if (!enabled) return
    quiet()
    // קודם מצב מעודכן של הילד (עד 1.5 שניות), ורק אז מדברים
    const mine = ++turn.current
    if (pending.current) {
      await Promise.race([pending.current, new Promise(r => setTimeout(r, 1500))])
      await new Promise(r => setTimeout(r, 50))   // שהמצב החדש ייכנס לעמוד
      if (mine !== turn.current) return           // בינתיים נסגר או הוחלף
    }
    const l = live.current
    setMsg(m => ({ text: guideText(l.course, l.state, l.lessonIdx, l.stage, l.name, ev), id: (m?.id ?? 0) + 1 }))
  }, [enabled, quiet, pending])

  /** שלב הושלם: השבח נאמר במעבר לשלב הבא */
  const noteDone = useCallback((s: number) => { justDone.current = s }, [])

  const say = useCallback((text: string) => {
    const stop = speak(text, () => { stopRef.current = null; setTalking(false) }, live.current.name || undefined)   // שם הילד לא נשלח לקול בענן
    if (!stop) return false
    stopRef.current = stop
    setTalking(true)
    return true
  }, [])
  const toggleSay = useCallback(() => {
    if (stopRef.current) quiet()
    else if (msg) say(msg.text)
  }, [msg, quiet, say])

  // מה פותח בועה: כניסה, שיעור, שלב, או חזרה ממסך שכיסה את הקורס
  useEffect(() => {
    if (!enabled) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- מסך מעל הקורס סוגר את הבועה
    if (covered) { close(); return }
    const t = setTimeout(() => {
      const was = seen.current
      seen.current = { lesson: lessonIdx, stage }
      const just = justDone.current
      justDone.current = null
      if (!was) return show({ type: 'hello' })
      if (was.lesson !== lessonIdx) return show({ type: 'lesson' })
      if (was.stage === stage) return show({ type: 'remind' })
      show({ type: 'stage', done: just === was.stage ? just : undefined })
    }, SETTLE)
    return () => clearTimeout(t)
  }, [enabled, covered, lessonIdx, stage, close, show])

  // הקראה של בועה חדשה. לפני הנגיעה הראשונה בעמוד הדפדפן לא מרשה — אז היא נאמרת מיד אחריה, אם עדיין פתוחה
  useEffect(() => {
    if (!msg) return
    let timer: ReturnType<typeof setTimeout>, dead = false
    const off = () => {
      dead = true
      clearTimeout(timer)
      window.removeEventListener('pointerup', later)
      window.speechSynthesis?.removeEventListener?.('voiceschanged', later)
    }
    const go = () => { if (!dead && say(msg.text)) off() }
    const later = () => { clearTimeout(timer); timer = setTimeout(go, 300) }
    timer = setTimeout(go, 250)
    if (!canSpeak()) window.addEventListener('pointerup', later)
    if (!window.speechSynthesis?.getVoices().length) window.speechSynthesis?.addEventListener?.('voiceschanged', later)
    return off
  }, [msg, say])

  // עזבו את הדף או את הלשונית: שקט
  useEffect(() => {
    const onHide = () => { if (document.hidden) quiet() }
    document.addEventListener('visibilitychange', onHide)
    return () => { document.removeEventListener('visibilitychange', onHide); stopRef.current?.() }
  }, [quiet])

  // נשארה פתוחה: נסגרת לבד 30 שניות אחרי ההקראה
  useEffect(() => {
    if (!msg || talking) return
    const t = setTimeout(close, CLOSE_AFTER)
    return () => clearTimeout(t)
  }, [msg, talking, close])

  // תזכורת אחת כשלא קורה כלום
  const open = !!msg
  useEffect(() => {
    if (!enabled || covered || busy || open) return
    const here = `${lessonIdx}-${stage}`
    if (reminded.current === here) return
    let t: ReturnType<typeof setTimeout>
    const remind = () => {
      if (document.hidden) { arm(); return }
      reminded.current = here
      show({ type: 'remind' })
    }
    const arm = () => { clearTimeout(t); t = setTimeout(remind, REMIND_AFTER) }
    const off = () => { clearTimeout(t); EVENTS.forEach(e => window.removeEventListener(e, arm)) }
    EVENTS.forEach(e => window.addEventListener(e, arm, { passive: true }))
    arm()
    return off
  }, [enabled, covered, busy, open, lessonIdx, stage, show])

  return { text: msg?.text ?? null, id: msg?.id ?? 0, talking, show, close, noteDone, toggleSay }
}
