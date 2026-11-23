'use client'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { warmSpeech } from '@/lib/course/practice'
import { PlayIcon } from './art'

/** גובה ה"מסך" שההתנסות רואה כשהיא מוקטנת בתוך השלב (היא מעוצבת למסך מלא). */
const VIRTUAL_H = 640

/** שליטה במשחק שב-iframe (אותו מקור): KidodoPause מגיע מ-public/practices/kidodo-practice.js */
type GameWindow = Window & { KidodoPause?: { pause: () => void; play: () => void; silence: () => void }; KidodoPractice?: { corner?: boolean } }

/**
 * שלב 2 — התנסות (public/practices) בתוך השלב, כמו סרטון:
 * נטענת מיד כשנכנסים לשלב ומוצגת בקטן, קפואה ושקטה, מאחורי כפתור Play. כפתור מגדיל למסך מלא.
 * רק Play מתחיל קול, זמן ותנועה. החנות / החגיגה (paused) והסתרת הדף עוצרות את המשחק, וחוזרים שוב ב-Play.
 * משחק SDK ישן (/games) לא יודע להיטען קפוא: הוא נטען רק ב-Play, ומקבל את אותו קובץ עצירה.
 * ההתנסות מדברת עם העמוד דרך postMessage (kidodo-practice.js): complete / next / exit.
 */
export default function PracticeStage({ src, enlargeLabel, shrinkLabel, startLabel, tint, paused = false, onRunning, onComplete, onNext }: {
  src: string; enlargeLabel: string; shrinkLabel?: string; startLabel: string; tint?: string; paused?: boolean; onComplete: () => void; onNext: () => void
  /** המשחק רץ / נעצר. נקרא לפני שהמשחק מתחיל לדבר */
  onRunning?: (running: boolean) => void
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [big, setBig] = useState(false)
  const [corner, setCorner] = useState(false)   // the game asked for our button in its top-left slot
  const [running, setRunning] = useState(false)  // the child tapped Play
  const [started, setStarted] = useState(false)  // ...at least once
  const ownsPause = src.startsWith('/practices/')
  const runningRef = useRef(false)

  // ---- עצירה והמשך ----
  const game = () => frameRef.current?.contentWindow as GameWindow | null | undefined
  const sync = useCallback(() => {
    try {
      const g = (frameRef.current?.contentWindow as GameWindow | null | undefined)?.KidodoPause
      if (runningRef.current) g?.play(); else g?.pause()
    } catch { /* not our page */ }
  }, [])

  const onRunningRef = useRef(onRunning)
  useEffect(() => { onRunningRef.current = onRunning })

  function play() {
    onRunningRef.current?.(true)
    warmSpeech()
    runningRef.current = true
    setRunning(true); setStarted(true)
    sync()               // בתוך הלחיצה עצמה: כך הדפדפן מרשה קול
    setTimeout(() => frameRef.current?.focus(), 50)
  }

  const stop = useCallback(() => {
    if (runningRef.current) onRunningRef.current?.(false)
    runningRef.current = false
    setRunning(false)
    sync()
  }, [sync])

  // מסך אחר עלה על הקורס (במסך מלא הוא לא מכסה את המשחק)
  const covered = paused && !big
  useEffect(() => { if (covered) stop() }, [covered, stop])   // eslint-disable-line react-hooks/set-state-in-effect

  useEffect(() => {
    const onHide = () => { if (document.hidden) stop() }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [stop])

  // יציאה מהשלב: הקראה שהתחילה לא ממשיכה אחרי שה-iframe נמחק
  useLayoutEffect(() => {
    const el = frameRef
    return () => {
      try { (el.current?.contentWindow as GameWindow | null | undefined)?.KidodoPause?.silence() } catch { /* not our page */ }
      try { window.speechSynthesis?.cancel() } catch { /* no speech */ }
    }
  }, [])

  // דף שנפתח ישר על המשחק: ההודעה corner נשלחה לפני שהקורס הקשיב
  useEffect(() => {
    try { if ((frameRef.current?.contentWindow as GameWindow | null | undefined)?.KidodoPractice?.corner) setCorner(true) } catch { /* not our page */ }   // eslint-disable-line react-hooks/set-state-in-effect
  }, [])

  function onLoad() {
    const doc = frameRef.current?.contentDocument
    if (ownsPause || !doc || game()?.KidodoPause) { sync(); return }
    const s = doc.createElement('script')
    s.src = '/practices/kidodo-practice.js'
    s.dataset.run = ''
    s.onload = sync
    doc.head.appendChild(s)
  }

  // גודל התיבה → קנה המידה של ההתנסות המוקטנת
  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const shrink = useCallback(() => {
    setBig(false)
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  }, [])

  function enlarge() {
    warmSpeech()
    setBig(true)
    // מסך מלא אמיתי איפה שאפשר (מחשב, אנדרואיד). באייפון — שכבה על כל המסך.
    const el = boxRef.current
    if (el?.requestFullscreen) el.requestFullscreen().catch(() => {})
    setTimeout(() => frameRef.current?.focus(), 50)
  }

  // יציאה ממסך מלא (Esc / כפתור חזרה) → חוזרים לקטן
  useEffect(() => {
    const onFs = () => { if (!document.fullscreenElement) setBig(false) }
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  // הודעות מההתנסות
  const onCompleteRef = useRef(onComplete)
  const onNextRef = useRef(onNext)
  useEffect(() => { onCompleteRef.current = onComplete; onNextRef.current = onNext })
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frameRef.current?.contentWindow) return
      const a = (e.data as { kidodo?: string } | null)?.kidodo
      if (a === 'complete') onCompleteRef.current()
      else if (a === 'next') { shrink(); onNextRef.current() }
      else if (a === 'exit') shrink()
      else if (a === 'corner') setCorner(true)
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [shrink])

  const scale = size ? Math.min(1, size.h / VIRTUAL_H) : 1
  const k = big ? 1 : Math.max(.7, scale)   // the corner button follows the game's own button size
  const frameStyle: React.CSSProperties = big || !size
    ? { position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }
    : {
        position: 'absolute', top: 0, left: 0, border: 0,
        width: size.w / scale, height: size.h / scale,
        transform: `scale(${scale})`, transformOrigin: '0 0',
      }

  return (
    <div ref={boxRef} className="box panel-in c-practice" data-big={big || undefined}
      style={big ? { position: 'fixed', inset: 0, zIndex: 60, minHeight: 0, maxHeight: 'none', aspectRatio: 'auto', background: '#fff' } : { background: '#fff', overflow: 'hidden' }}>
      {(ownsPause || started) && <iframe ref={frameRef} src={src} title={enlargeLabel} style={frameStyle} allow="fullscreen; autoplay" onLoad={onLoad} />}
      {!running && (
        <div className="c-gate" style={ownsPause || started ? undefined : { background: tint }} onClick={play}>
          <div className="c-start">
            {!started && <p>{startLabel}</p>}
            <button type="button" className="press c-play" aria-label={startLabel} style={{ background: '#fff' }}>
              <span className="breathe"><PlayIcon color="var(--primary)" /></span>
            </button>
          </div>
        </div>
      )}
      {corner ? (
        /* the game left its top-left slot free: our button sits exactly there (scaled with the game), light so it stands out —
           enlarge when small, shrink in full screen (the game has no ✕ inside the course) */
        <button type="button" className="press c-practice-corner" aria-label={big ? shrinkLabel || enlargeLabel : enlargeLabel} title={big ? shrinkLabel || enlargeLabel : enlargeLabel}
          onClick={big ? shrink : enlarge} style={{ left: 10 * k, top: 10 * k, width: 44 * k, height: 44 * k }}>
          {big ? <ShrinkIcon /> : <EnlargeIcon />}
        </button>
      ) : (
        /* במסך מלא אין כפתור משלנו: ה-✕ של ההתנסות (exit) ו-Esc מחזירים לקטן */
        !big && (
          <button type="button" className="press c-practice-btn" aria-label={enlargeLabel} title={enlargeLabel} onClick={enlarge}>
            <EnlargeIcon />
          </button>
        )
      )}
    </div>
  )
}

function ShrinkIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
    </svg>
  )
}

function EnlargeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  )
}
