'use client'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { warmSpeech } from '@/lib/course/practice'

/** גובה ה"מסך" שההתנסות רואה כשהיא מוקטנת בתוך השלב (היא מעוצבת למסך מלא). */
const VIRTUAL_H = 640

/**
 * שלב 2 — התנסות (public/practices) בתוך השלב, כמו סרטון:
 * נטענת מיד כשנכנסים לשלב, מוצגת בקטן (אפשר כבר ללחוץ בה), וכפתור מגדיל למסך מלא.
 * ההתנסות מדברת עם העמוד דרך postMessage (kidodo-practice.js): complete / next / exit.
 */
export default function PracticeStage({ src, enlargeLabel, onComplete, onNext }: {
  src: string; enlargeLabel: string; onComplete: () => void; onNext: () => void
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [big, setBig] = useState(false)

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
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [shrink])

  const scale = size ? Math.min(1, size.h / VIRTUAL_H) : 1
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
      <iframe ref={frameRef} src={src} title={enlargeLabel} style={frameStyle} allow="fullscreen; autoplay" />
      {/* במסך מלא אין כפתור משלנו: ה-✕ של ההתנסות (exit) ו-Esc מחזירים לקטן */}
      {!big && (
        <button type="button" className="press c-practice-btn" aria-label={enlargeLabel} title={enlargeLabel} onClick={enlarge}>
          <EnlargeIcon />
        </button>
      )}
    </div>
  )
}

function EnlargeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  )
}
